
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TriageAnalysis, UrgencyLevel, Doctor } from '../types';
import { medicalCenters } from '../data/centers';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CONFIGURACIÓN VERTEX AI SEARCH (RAG) ---
const VERTEX_PROJECT_ID = "milumon-portfolio"; 
const VERTEX_LOCATION = "global"; 
const VERTEX_DATA_STORE_ID = "doctoi-datastore"; 

// Construct a summary of available locations for the AI context
const availableLocations = Array.from(new Set(medicalCenters.map(c => `${c.district}`))).join(', ');
const countCenters = medicalCenters.length;

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
    // Fallback in case of API failure (should not happen in happy path)
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

export const generateFollowUp = async (history: {role: string, parts: {text: string}[]}[]): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: history.map(h => ({ role: h.role, parts: h.parts })),
            config: {
                 systemInstruction: `You are a helpful medical assistant for Doctoi, an app in Peru. 
                 Keep responses short, empathetic, and focused on gathering more info or reassuring the patient.
                 
                 CONTEXT OF AVAILABLE CENTERS: We have verified information for ${countCenters} medical centers/pharmacies in the following districts: 
                 ${availableLocations}. We have extensive coverage in Lima Cercado, San Borja, Surco, Miraflores, Lince, and Jesús María.
                 
                 If the user asks about a location not listed here, suggest they select the nearest major district.`
            }
        });
        return response.text || "Lo siento, no pude procesar eso.";
    } catch (e) {
        return "Hubo un error de conexión. Intenta de nuevo.";
    }
}

export const generateDoctorResponse = async (
    history: {role: string, parts: {text: string}[]}[], 
    doctor: Doctor, 
    triageContext: TriageAnalysis | null
): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: history.map(h => ({ role: h.role, parts: h.parts })),
            config: {
                 systemInstruction: `You are Dr. ${doctor.apellido_paterno} ${doctor.apellido_materno}, a real specialist in ${doctor.especialidad_principal} in Peru with CMP code ${doctor.cmp}.
                 
                 CONTEXT:
                 You are now chatting directly with a patient who has completed a digital triage.
                 Triage Summary: ${JSON.stringify(triageContext)}
                 
                 INSTRUCTIONS:
                 1. Speak professionally but warmly, as a Peruvian doctor would.
                 2. Be concise.
                 3. Ask clarifying clinical questions related to your specialty.
                 4. Do NOT prescribe specific medication dosages (legal restriction), but you can suggest general types of treatment or home care.
                 5. Emphasize that this is a tele-orientation.
                 6. Sign your first message with "Dr. ${doctor.apellido_paterno}".
                 `
            }
        });
        return response.text || "Disculpa, tengo problemas de conexión en el consultorio.";
    } catch (e) {
        return "Error de conexión con el especialista.";
    }
}

// Función RAG para consultar PDFs de seguros
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
        return "Lo siento, en este momento no puedo acceder a los detalles específicos de las pólizas. Por favor contacta a la clínica directamente.";
    }
}

export const classifyUserIntent = async (text: string): Promise<'triage' | 'pharmacy' | 'directory'> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Classify this user input into one of three categories:
            1. 'triage': User is describing a pain, symptom, sickness, or feeling unwell.
            2. 'pharmacy': User is looking for a specific medication, pill, or pharmacy product.
            3. 'directory': User is looking for a specific clinic, hospital, phone number, or medical center by name or location.
            
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
        return 'triage'; 
    }
}
