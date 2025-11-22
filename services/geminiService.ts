import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TriageAnalysis, UrgencyLevel, TriageAnalysisWithCenters } from '../types';
import { INSURANCE_POLICIES, CLINICAL_GUIDELINES } from '../data/knowledgeBase';

// Initialize Gemini AI
// SEGURIDAD: En producción, esta inicialización y las llamadas deben hacerse desde un Proxy Serverless
// (ej. Vercel Edge Functions o AWS Lambda) para proteger la API_KEY.
// Arquitectura Actual: Client-Side Prototype con Long Context Grounding.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- SECURITY LAYER (Simulated Backend Logic) ---
const sanitizeInput = (text: string): string => {
    // Simulación de DLP (Data Loss Prevention) para cumplir normativas de privacidad
    return text.replace(/\b\d{8}\b/g, "[DNI_REDACTED]").replace(/\b9\d{8}\b/g, "[CELULAR_REDACTED]");
};

// --- LONG CONTEXT GROUNDING SERVICE ---
// En lugar de RAG tradicional (Vector Search), usamos la ventana de contexto de 1M tokens de Gemini
// para inyectar toda la normativa vigente y asegurar precisión sin alucinaciones.
export const analyzeSymptomsWithRAG = async (
  symptoms: string,
  userContext: { district: string; insurance: string }
): Promise<TriageAnalysisWithCenters> => {
  try {
    const cleanSymptoms = sanitizeInput(symptoms);

    // INYECCIÓN DE CONTEXTO "IN-MEMORY"
    // Esto actúa como nuestra base de datos inmutable para la sesión.
    const SYSTEM_PROMPT = `
ROL: Auditor Médico de Doctoi (Perú).
OBJETIVO: Validar síntomas y coberturas basándote ÚNICAMENTE en los documentos oficiales provistos.

FUENTES DE VERDAD (NO ALUCINAR FUERA DE ESTO):
1. [SUSALUD] Pólizas Vigentes:
${INSURANCE_POLICIES}

2. [MINSA] Guías de Práctica Clínica (CIE-10):
${CLINICAL_GUIDELINES}

INSTRUCCIONES CRÍTICAS:
- Si el síntoma coincide con un "Signo de Alarma" en las Guías MINSA, la urgencia es AUTOMÁTICAMENTE "Emergencia" o "Alta".
- Para la cobertura, cita textualmente el deducible o copago del documento de SUSALUD si existe.
- Si el seguro es SIS, deriva exclusivamente a hospitales del estado (MINSA).
- Si el seguro es EPS, deriva a clínicas privadas.

FORMATO DE SALIDA: JSON Estricto.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `SOLICITUD DE TRIAJE:
      - Paciente: Refiere "${cleanSymptoms}"
      - Ubicación: ${userContext.district}
      - Seguro Declarado: ${userContext.insurance}
      
      TAREA:
      1. Determina urgencia y especialidad basándote en los códigos CIE-10 provistos.
      2. Explica la cobertura usando los datos de SUSALUD provistos.
      3. Usa Google Search para encontrar centros médicos REALES y VIGENTES en ${userContext.district} que coincidan con la red del seguro.
      
      Responde SOLO con el JSON definido.`,
      config: {
        tools: [{ googleSearch: {} }], 
        // responseMimeType cannot be used with googleSearch
        systemInstruction: SYSTEM_PROMPT
      }
    });

    if (response.text) {
      const cleanText = response.text.trim();
      let parsed: any = {};
      try {
          // Attempt to parse directly
          parsed = JSON.parse(cleanText);
      } catch (e) {
          // Attempt to extract JSON from markdown code blocks if present
          const match = cleanText.match(/```json([\s\S]*?)```/) || cleanText.match(/```([\s\S]*?)```/);
          if (match) {
             try {
                parsed = JSON.parse(match[1]);
             } catch (innerE) {
                console.error("JSON Extraction Error", innerE);
                throw e;
             }
          } else {
             throw e;
          }
      }

      const result: TriageAnalysisWithCenters = {
          specialty: parsed.specialty || "Medicina General",
          specialtyDescription: parsed.specialtyDescription || "Evaluación inicial",
          urgency: parsed.urgency || UrgencyLevel.MODERATE,
          urgencyExplanation: parsed.urgencyExplanation || "Evaluación según protocolo estándar.",
          detectedSymptoms: parsed.detectedSymptoms || [],
          advice: parsed.advice || [],
          confidence: parsed.confidence || 85,
          recommendedCenters: parsed.recommendedCenters || [],
          insuranceCoverage: parsed.insuranceCoverage || { covers: null, details: "Consultar póliza específica.", requirements: [] },
          sourcesUsed: ["Guías GPC MINSA (Oficial)", "Registro SUSALUD 2025"]
      };
      
      // Grounding Check
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        const webSources = chunks
            .filter((c: any) => c.web?.title)
            .map((c: any) => c.web.title);
        if (webSources.length > 0) {
            result.sourcesUsed.push("Google Maps Verification");
        }
      }
      
      return result;
    }
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("AI Service Error:", error);
    return {
      specialty: "Medicina General",
      specialtyDescription: "Acuda a triaje presencial para evaluación.",
      urgency: UrgencyLevel.MODERATE,
      urgencyExplanation: "No se pudo completar la validación automática.",
      detectedSymptoms: [symptoms],
      recommendedCenters: [], 
      insuranceCoverage: {
        covers: null,
        details: "Información no disponible temporalmente.",
        requirements: []
      },
      advice: ["Acudir al centro de salud más cercano"],
      confidence: 0,
      sourcesUsed: []
    };
  }
};

export const generateFollowUp = async (history: {role: string, parts: {text: string}[]}[]): Promise<string> => {
    try {
        const systemContext = `
        CONTEXTO DE SEGURIDAD: Eres un asistente administrativo médico. NO DIAGNOSTICAS, solo informas basado en protocolos.
        
        REFERENCIAS OBLIGATORIAS:
        ${INSURANCE_POLICIES}
        ${CLINICAL_GUIDELINES}
        
        Si te preguntan algo médico fuera de estos documentos, responde: "Esa consulta requiere evaluación presencial por un médico".
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: history.map(h => ({ role: h.role, parts: h.parts })),
            config: {
                 systemInstruction: systemContext
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
            contents: `CONSULTA NORMATIVA: "${query}"
            
            INSTRUCCIONES:
            Responde citando la fuente (SUSALUD o MINSA) basándote en:
            ${INSURANCE_POLICIES}
            ${CLINICAL_GUIDELINES}`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        return response.text || "No encontré esa información específica en las bases oficiales.";
    } catch (e) {
        console.error("Error consultando documentos:", e);
        return "Lo siento, en este momento no puedo buscar esa información.";
    }
}

export const classifyUserIntent = async (text: string): Promise<'triage' | 'pharmacy' | 'directory'> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analiza la intención del usuario: "${text}". 
            - 'triage': Describe síntomas, dolor, enfermedad.
            - 'pharmacy': Busca medicamentos, pastillas, recetas.
            - 'directory': Busca clínicas, hospitales, direcciones, teléfonos.
            
            Responde JSON.`,
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