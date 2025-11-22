
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TriageAnalysis, UrgencyLevel, TriageAnalysisWithCenters } from '../types';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CONFIGURACIÓN VERTEX AI SEARCH (RAG) ---
const VERTEX_PROJECT_ID = "milumon-portfolio"; 
const VERTEX_LOCATION = "global"; 
const VERTEX_DATA_STORE_ID = "doctoi-datastore"; 

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

// Legacy simple analysis (kept for fallback or simple flows)
export const analyzeSymptoms = async (symptoms: string): Promise<TriageAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Act as a medical triage AI. Analyze the following symptoms provided by a patient in Peru. 
      Provide a structured analysis including the recommended specialty, urgency level, and immediate advice.
      Symptoms: "${symptoms}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: triageSchema,
        systemInstruction: "You are an expert medical triage assistant. Be conservative with urgency. If symptoms suggest life-threatening conditions (severe chest pain, difficulty breathing, severe bleeding), mark as Emergency. Otherwise, grade appropriately."
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as TriageAnalysis;
    }
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      specialty: "Medicina General",
      specialtyDescription: "Análisis automático no disponible. Se recomienda evaluación general.",
      urgency: UrgencyLevel.MODERATE,
      urgencyExplanation: "Por precaución ante fallo de conexión.",
      detectedSymptoms: ["Sin diagnóstico"],
      advice: ["Acudir al centro más cercano"],
      confidence: 0
    };
  }
};

// --- NUEVA FUNCIÓN RAG (Conectada a Vertex AI Search) ---
export const analyzeSymptomsWithRAG = async (
  symptoms: string,
  userContext: { district: string; insurance: string }
): Promise<TriageAnalysisWithCenters> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Eres un asistente de triaje médico en Perú.

CONTEXTO DEL PACIENTE:
- Síntomas: "${symptoms}"
- Ubicación: ${userContext.district}
- Seguro: ${userContext.insurance}

INSTRUCCIONES:
1. Analiza los síntomas y determina la especialidad médica necesaria
2. Evalúa el nivel de urgencia (low, moderate, high, emergency)
3. Busca en los documentos los centros de salud que:
   - Tengan la especialidad necesaria
   - Acepten el seguro "${userContext.insurance}"
   - Estén cerca de "${userContext.district}" o atiendan esa zona
4. Si el seguro es EsSalud o SIS, prioriza centros públicos
5. Si es seguro privado, busca clínicas con convenio

IMPORTANTE:
- Solo recomienda centros que EXISTAN en los documentos
- Incluye teléfono, dirección y horarios SI están en los documentos
- Si no encuentras información, dilo honestamente
- Si es EMERGENCIA, indica el número 106 (SAMU)

Responde en JSON estrictamente con este formato:
{
  "specialty": "nombre de la especialidad",
  "specialtyDescription": "por qué se necesita esta especialidad",
  "urgency": "Baja|Moderada|Alta|Emergencia",
  "urgencyExplanation": "explicación del nivel de urgencia",
  "detectedSymptoms": ["síntoma1", "síntoma2"],
  "recommendedCenters": [
    {
      "name": "nombre del centro (de los documentos)",
      "type": "Clínica|Hospital|Centro de Salud",
      "address": "dirección (de los documentos)",
      "district": "distrito",
      "phone": "teléfono (si está disponible)",
      "acceptsInsurance": true,
      "hasSpecialty": true,
      "operatingHours": "horario (si está disponible)",
      "reason": "por qué se recomienda este centro"
    }
  ],
  "insuranceCoverage": {
    "covers": true|false,
    "details": "qué cubre el seguro para este caso (de los documentos)",
    "copayEstimate": "estimación de copago si está disponible",
    "requirements": ["DNI", "Carnet de seguro", etc.]
  },
  "advice": ["consejo1", "consejo2"],
  "emergencyAction": null,
  "confidence": 85,
  "sourcesUsed": ["nombre del documento 1"]
}`,
      config: {
        responseMimeType: "application/json",
        tools: [{
          retrieval: {
            vertexAiSearch: {
              datastore: `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/collections/default_collection/dataStores/${VERTEX_DATA_STORE_ID}`
            }
          }
        }],
        systemInstruction: `Eres un asistente médico experto en el sistema de salud peruano.
        
REGLAS ESTRICTAS:
- SOLO recomienda centros que encuentres en los documentos proporcionados (Grounding).
- NUNCA inventes nombres de clínicas, direcciones o teléfonos.
- Si no encuentras información específica en los documentos, indica que no se encontró.
- Prioriza la seguridad del paciente.
- Para síntomas graves (dolor de pecho, dificultad respiratoria, sangrado severo), SIEMPRE marca como EMERGENCY`
      }
    });

    if (response.text) {
      // Remove potential markdown blocks if raw text is returned with ```json
      const cleanText = response.text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanText) as TriageAnalysisWithCenters;
    }
    throw new Error("No response from Gemini RAG");

  } catch (error) {
    console.error("Triage with RAG failed:", error);
    // Fallback honesto
    return {
      specialty: "Medicina General",
      specialtyDescription: "Se recomienda evaluación inicial",
      urgency: UrgencyLevel.MODERATE,
      urgencyExplanation: "No se pudo analizar completamente con los documentos. Se recomienda consulta presencial.",
      detectedSymptoms: [symptoms],
      recommendedCenters: [], // Empty indicates we fall back to standard directory
      insuranceCoverage: {
        covers: null,
        details: "No se pudo verificar cobertura en los documentos. Contacte a su aseguradora.",
        requirements: ["DNI", "Carnet de seguro"]
      },
      advice: ["Acudir al centro de salud más cercano"],
      confidence: 0,
      sourcesUsed: []
    };
  }
};

export const generateFollowUp = async (history: {role: string, parts: {text: string}[]}[]): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: history.map(h => ({ role: h.role, parts: h.parts })),
            config: {
                 systemInstruction: "You are a helpful medical assistant. Keep responses short, empathetic, and focused on gathering more info or reassuring the patient."
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
            contents: `Answer the user's question about medical insurance coverage or clinic details based strictly on the provided context/documents.
            User Query: "${query}"`,
            config: {
                tools: [{
                    retrieval: {
                        vertexAiSearch: {
                            datastore: `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/collections/default_collection/dataStores/${VERTEX_DATA_STORE_ID}`
                        }
                    }
                }]
            }
        });

        return response.text || "No encontré esa información específica en los documentos de las aseguradoras.";
    } catch (e) {
        console.error("Error consultando documentos (RAG):", e);
        return "Lo siento, en este momento no puedo acceder a los detalles específicos de las pólizas.";
    }
}

export const classifyUserIntent = async (text: string): Promise<'triage' | 'pharmacy' | 'directory'> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Classify this user input into one of three categories:
            1. 'triage': User is describing a pain, symptom, sickness, or feeling unwell. (e.g. "I have a headache", "my stomach hurts", "fever").
            2. 'pharmacy': User is looking for a specific medication, pill, or pharmacy product. (e.g. "I need paracetamol", "where to buy amoxicillin", "price of aspirin").
            3. 'directory': User is looking for a specific clinic, hospital, phone number, or medical center by name or location, NOT describing a symptom. (e.g. "Clinica San Pablo", "Hospital Rebagliati", "Telephone of Clinica Ricardo Palma", "San Borja clinics").
            
            Input: "${text}"`,
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
        console.error(e);
        return 'triage'; // Fallback
    }
}
