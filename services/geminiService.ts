
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TriageAnalysis, UrgencyLevel, TriageAnalysisWithCenters } from '../types';
import { INSURANCE_POLICIES, CLINICAL_GUIDELINES } from '../data/knowledgeBase';

// Initialize Gemini AI
// NOTE: In a real AWS Lambda architecture, this initialization happens inside the handler
// to keep the container warm and secure the API KEY server-side.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- SECURITY LAYER (Simulated Backend Logic) ---
const sanitizeInput = (text: string): string => {
    // A real backend would use DLP (Data Loss Prevention) here.
    // Simple regex to remove potential DNI/Phone numbers from prompt context if needed for privacy
    return text.replace(/\b\d{8}\b/g, "[DNI_REDACTED]");
};

const triageSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    specialty: { type: Type.STRING, description: "Recommended medical specialty" },
    specialtyDescription: { type: Type.STRING, description: "Short explanation of why this specialty is needed" },
    urgency: { 
      type: Type.STRING, 
      enum: [UrgencyLevel.LOW, UrgencyLevel.MODERATE, UrgencyLevel.HIGH, UrgencyLevel.EMERGENCY],
      description: "Urgency level of the condition"
    },
    urgencyExplanation: { type: Type.STRING, description: "Why this urgency level was assigned" },
    detectedSymptoms: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of symptoms extracted from user text"
    },
    advice: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Immediate advice or things to avoid before seeing a doctor"
    },
    confidence: { type: Type.NUMBER, description: "Confidence score 0-100" }
  },
  required: ["specialty", "specialtyDescription", "urgency", "urgencyExplanation", "detectedSymptoms", "advice", "confidence"]
};

// --- RAG HÍBRIDO (Serverless-Ready Architecture) ---
export const analyzeSymptomsWithRAG = async (
  symptoms: string,
  userContext: { district: string; insurance: string }
): Promise<TriageAnalysisWithCenters> => {
  try {
    const cleanSymptoms = sanitizeInput(symptoms);

    // We inject the "Database" content into the System Instruction.
    // This creates a strong boundary that the model follows strictly.
    const SYSTEM_PROMPT = `
ROL: Eres el motor de inteligencia artificial de Doctoi (Perú). Actúas como un Auditor Médico estricto.

BASE DE CONOCIMIENTO OBLIGATORIA (Tus "Documentos"):
${INSURANCE_POLICIES}
${CLINICAL_GUIDELINES}

INSTRUCCIONES DE PROCESAMIENTO:
1. ANÁLISIS DE SÍNTOMAS: Compara los síntomas del usuario contra las "GUÍAS DE PRÁCTICA CLÍNICA MINSA" provistas.
2. VERIFICACIÓN DE SEGURO: Busca textualmente el seguro "${userContext.insurance}" en las "PÓLIZAS VIGENTES". Si existe, extrae la cobertura exacta.
3. REGLAS DE NEGOCIO:
   - Si es EMERGENCIA según guías -> Prioriza Hospitales cercanos y recomienda llamar al 106/116.
   - Si es SIS -> Solo derivar a Hospitales del Estado (Minsa).
   - Si es EPS/Privado -> Derivar a Clínicas.

FORMATO DE SALIDA: JSON Estricto.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `SOLICITUD DE TRIAJE:
      - Paciente: Refiere "${cleanSymptoms}"
      - Ubicación: ${userContext.district}
      - Seguro Declarado: ${userContext.insurance}
      
      TAREA:
      1. Determina urgencia y especialidad usando las GUÍAS.
      2. Explica la cobertura usando las PÓLIZAS.
      3. Usa Google Search para encontrar centros médicos REALES en ${userContext.district} que coincidan con la red del seguro.
      
      Responde SOLO con el JSON definido.`,
      config: {
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json", // Enforced JSON for backend-like reliability
        systemInstruction: SYSTEM_PROMPT
      }
    });

    if (response.text) {
      const cleanText = response.text.trim();
      // Robust parsing ensuring we get a valid object
      let parsed: any = {};
      try {
          parsed = JSON.parse(cleanText);
      } catch (e) {
          // Fallback for markdown code blocks common in LLMs
          const match = cleanText.match(/```json([\s\S]*?)```/);
          if (match) parsed = JSON.parse(match[1]);
          else throw e;
      }

      // Map the raw JSON to our Typescript Interface
      const result: TriageAnalysisWithCenters = {
          specialty: parsed.specialty || "Medicina General",
          specialtyDescription: parsed.specialtyDescription || "Evaluación general",
          urgency: parsed.urgency || UrgencyLevel.MODERATE,
          urgencyExplanation: parsed.urgencyExplanation || "Evaluación estándar",
          detectedSymptoms: parsed.detectedSymptoms || [],
          advice: parsed.advice || [],
          confidence: parsed.confidence || 85,
          recommendedCenters: parsed.recommendedCenters || [],
          insuranceCoverage: parsed.insuranceCoverage || { covers: null, details: "Consultar aseguradora", requirements: [] },
          sourcesUsed: ["Guías Minsa (Interno)", "Pólizas 2025 (Interno)"]
      };
      
      // Add Google Search sources if available
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        const webSources = chunks
            .filter((c: any) => c.web?.title)
            .map((c: any) => c.web.title);
        if (webSources.length > 0) {
            result.sourcesUsed.push("Google Maps/Search");
        }
      }
      
      return result;
    }
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Backend Simulation Error:", error);
    return {
      specialty: "Medicina General",
      specialtyDescription: "Error de conexión. Acuda a triaje presencial.",
      urgency: UrgencyLevel.MODERATE,
      urgencyExplanation: "Fallo en el análisis automático.",
      detectedSymptoms: [symptoms],
      recommendedCenters: [], 
      insuranceCoverage: {
        covers: null,
        details: "No disponible.",
        requirements: []
      },
      advice: ["Acudir al centro de salud más cercano"],
      confidence: 0,
      sourcesUsed: []
    };
  }
};

// Simple text generation with internal context
export const generateFollowUp = async (history: {role: string, parts: {text: string}[]}[]): Promise<string> => {
    try {
        const systemContext = `
        CONTEXTO DE SEGURIDAD: Estás operando bajo protocolos estrictos.
        DOCUMENTOS INTERNOS DISPONIBLES:
        ${INSURANCE_POLICIES}
        ${CLINICAL_GUIDELINES}
        
        Usa esta información si el usuario pregunta sobre "qué cubre mi seguro" o "qué hago si tengo fiebre".
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: history.map(h => ({ role: h.role, parts: h.parts })),
            config: {
                 systemInstruction: `Eres Doctoi. ${systemContext}`
            }
        });
        return response.text || "Lo siento, no pude procesar eso.";
    } catch (e) {
        return "Hubo un error de conexión. Intenta de nuevo.";
    }
}

export const consultMedicalDocuments = async (query: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: `PREGUNTA DE USUARIO: "${query}"
            
            INSTRUCCIONES:
            Busca la respuesta EXCLUSIVAMENTE en los siguientes documentos internos.
            Si la respuesta no está ahí, usa Google Search para complementar (ej. direcciones).
            
            DOCUMENTOS:
            ${INSURANCE_POLICIES}
            ${CLINICAL_GUIDELINES}`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        return response.text || "No encontré esa información específica.";
    } catch (e) {
        console.error("Error consultando documentos:", e);
        return "Lo siento, en este momento no puedo buscar esa información.";
    }
}

export const classifyUserIntent = async (text: string): Promise<'triage' | 'pharmacy' | 'directory'> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Classify intent: "${text}" -> 'triage' (symptoms), 'pharmacy' (meds), 'directory' (clinics). JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        intent: { type: Type.STRING, enum: ["triage", "pharmacy", "directory"] }
                    }
                }
            }
        });
        
        const result = JSON.parse(response.text || "{}");
        return result.intent || 'triage';
    } catch (e) {
        return 'triage';
    }
}
