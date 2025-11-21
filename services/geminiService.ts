
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TriageAnalysis, UrgencyLevel } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- VERTEX AI CONFIGURATION ---
const PROJECT_ID = 'milumon-portfolio';
const LOCATION = 'global'; // or us-central1
const DATA_STORE_ID = 'doctoi-vertexia_1763755754713';

// Define the structure of the Agent's response
const agentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    response_text: { 
      type: Type.STRING, 
      description: "Natural language response to the user. If using grounded information, summarize it here. Ask for location or insurance if missing." 
    },
    action: {
      type: Type.STRING,
      enum: ["continue_conversation", "perform_triage", "search_directory", "search_pharmacy"],
      description: "The action the frontend should take."
    },
    extracted_context: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: "The extracted district, province or department (e.g., 'San Borja', 'Arequipa'). Normalize to Title Case." },
        insurance: { type: Type.STRING, description: "The extracted insurance (e.g., 'Rimac', 'EsSalud')." },
        symptoms_or_query: { type: Type.STRING, description: "The user's symptoms or the item they are looking for." }
      }
    },
    triage_analysis: {
      type: Type.OBJECT,
      description: "Only populate if action is 'perform_triage' and you have enough info.",
      properties: {
        specialty: { type: Type.STRING },
        specialtyDescription: { type: Type.STRING },
        urgency: { type: Type.STRING, enum: [UrgencyLevel.LOW, UrgencyLevel.MODERATE, UrgencyLevel.HIGH, UrgencyLevel.EMERGENCY] },
        urgencyExplanation: { type: Type.STRING },
        detectedSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
        advice: { type: Type.ARRAY, items: { type: Type.STRING } },
        confidence: { type: Type.NUMBER }
      },
      required: ["specialty", "specialtyDescription", "urgency", "urgencyExplanation", "detectedSymptoms", "advice", "confidence"]
    }
  },
  required: ["response_text", "action", "extracted_context"]
};

export interface AgentResponse {
  response_text: string;
  action: "continue_conversation" | "perform_triage" | "search_directory" | "search_pharmacy";
  extracted_context: {
    location?: string;
    insurance?: string;
    symptoms_or_query?: string;
  };
  triage_analysis?: TriageAnalysis;
}

export const chatWithDoctoi = async (
  history: {role: string, parts: {text: string}[]}[], 
  userMessage: string,
  currentContext: { location?: string, insurance?: string }
): Promise<AgentResponse> => {
  
  try {
    const systemInstruction = `
      You are Doctoi, an intelligent medical assistant for Peru.
      Your goal is to help users find medical care (Triage), specific clinics (Directory), or medicines (Pharmacy).
      
      You have access to a Knowledge Base (Vertex AI Search) containing official documents about insurance coverage (RIMAC, PACIFICO, ETC) and partner clinics.
      ALWAYS use this grounded information when the user asks about "cobertura", "seguros", "convenios" or specific clinic rules.

      RULES:
      1. **Conversational Context**: Always analyze the chat history.
      2. **Missing Info**: 
         - If the user implies a medical problem, you MUST know their **Location** (District/City) and **Insurance** before performing a full triage.
         - If the user is looking for a pharmacy or clinic, you MUST know their **Location**.
         - If these are missing, ask for them naturally in 'response_text' and set action to 'continue_conversation'.
         - Example: "Entiendo que te sientes mal. ¿En qué distrito te encuentras para buscar ayuda cercana?"
      3. **Extraction**: Extract locations (e.g., "Soy de Miraflores", "Vivo en Cusco") and update 'extracted_context'.
      4. **Actions**:
         - 'perform_triage': Only when you have symptoms + location + insurance (or if user says 'no insurance'). Fill 'triage_analysis' object.
         - 'search_directory': When user asks for a clinic/hospital by name or generally (e.g., "Clínica San Pablo", "Hospitales en Lima").
         - 'search_pharmacy': When user asks for medicine/drugstores.
      5. **Grounding**: If the user asks about insurance details (e.g., "Does Rimac cover pregnancy?"), use the provided tools/retrieval context to answer in 'response_text'.
      6. **Tone**: Empathetic, professional, and concise. 
      7. **Language**: Spanish.
      
      Current Known Context: 
      Location: ${currentContext.location || "Unknown"}
      Insurance: ${currentContext.insurance || "Unknown"}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...history,
        { role: "user", parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: agentSchema,
        // Configuration for Vertex AI Search Grounding
        tools: [{
            googleSearchRetrieval: {
                dynamicRetrievalConfig: {
                    mode: "MODE_DYNAMIC",
                    dynamicThreshold: 0.7,
                }
            }
        }]
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AgentResponse;
    }
    throw new Error("Empty response from Gemini");

  } catch (error) {
    console.error("Gemini Agent Error:", error);
    return {
      response_text: "Lo siento, tuve un problema de conexión. ¿Podrías repetirlo?",
      action: "continue_conversation",
      extracted_context: {}
    };
  }
};
