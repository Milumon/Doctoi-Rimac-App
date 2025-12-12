import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TriageAnalysis, UrgencyLevel, Doctor, RagDocument, MedicalCenter, MedicineInfo } from '../types';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- HELPER: RETRY LOGIC FOR 503 OVERLOADED ---
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        if (retries > 0 && (error.status === 503 || error.code === 503 || error.message?.includes('overloaded'))) {
            console.warn(`⚠️ Model overloaded. Retrying in ${delay}ms... (${retries} left)`);
            await new Promise(res => setTimeout(res, delay));
            return callWithRetry(fn, retries - 1, delay * 2); // Exponential backoff
        }
        throw error;
    }
}

// ================= RAG / FILE MANAGEMENT =================

export const uploadFileToGemini = async (file: File): Promise<RagDocument> => {
    return callWithRetry(async () => {
        try {
            const response = await ai.files.upload({
                file: file,
                config: { displayName: file.name, mimeType: file.type }
            });
            return {
                id: response.name, 
                displayName: response.displayName || file.name,
                uri: response.uri,
                mimeType: response.mimeType,
                state: response.state as 'PROCESSING' | 'ACTIVE' | 'FAILED',
                sizeBytes: response.sizeBytes || '0'
            };
        } catch (error: any) {
            if (error.status === 403 || error.message?.includes('PERMISSION_DENIED')) {
                throw new Error("Tu API Key no tiene permisos para subir archivos.");
            }
            throw error;
        }
    });
};

export const deleteFileFromGemini = async (fileName: string): Promise<void> => {
    try { await ai.files.delete({ name: fileName }); } catch (error) { console.warn("Delete failed", error); }
};

export const getActiveFilesFromGemini = async (): Promise<RagDocument[]> => {
    try {
        const response = await ai.files.list();
        const files: RagDocument[] = [];
        if (response && typeof response[Symbol.asyncIterator] === 'function') {
             for await (const f of response) {
                files.push({
                    id: f.name,
                    displayName: f.displayName || 'Documento sin nombre',
                    uri: f.uri,
                    mimeType: f.mimeType,
                    state: f.state as 'PROCESSING' | 'ACTIVE' | 'FAILED',
                    sizeBytes: f.sizeBytes || '0'
                });
            }
        }
        return files;
    } catch (error: any) {
        if (error.status === 403 || error.toString().includes('PERMISSION_DENIED')) return [];
        return [];
    }
};

// ================= CHAT & TRIAJE =================

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
    confidence: { type: Type.NUMBER, description: "Confidence score 0-100. Set to 0 if input is greetings, noise or lacks symptoms." }
  },
  required: ["specialty", "specialtyDescription", "urgency", "urgencyExplanation", "detectedSymptoms", "advice", "confidence"]
};

export const analyzeSymptoms = async (input: string | { mimeType: string, data: string }): Promise<TriageAnalysis> => {
  return callWithRetry(async () => {
      try {
        let contents: any;
        if (typeof input === 'string') {
            contents = `Analyze the following symptoms for INFORMATIONAL PURPOSES ONLY. Not a medical diagnosis. 
            Symptoms: "${input}"`;
        } else {
            contents = {
                parts: [
                    { inlineData: { mimeType: input.mimeType, data: input.data } },
                    { text: `Analyze the audio symptoms for INFORMATIONAL PURPOSES ONLY.` }
                ]
            };
        }

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: triageSchema,
            systemInstruction: `You are a triage assistant. 
            RULES:
            1. Return JSON.
            2. If input is clearly not symptoms (e.g. "Hello", "Weather"), return confidence: 0.
            3. Otherwise, provide a best-effort analysis.`
          }
        });

        if (response.text) return JSON.parse(response.text) as TriageAnalysis;
        throw new Error("No response text");

      } catch (error) {
        console.warn("Gemini analysis failed or blocked. Using fallback.", error);
        return {
          specialty: "Medicina General",
          specialtyDescription: "Evaluación general requerida.",
          urgency: UrgencyLevel.MODERATE,
          urgencyExplanation: "Síntomas presentes que requieren valoración médica presencial.",
          detectedSymptoms: ["Malestar general"],
          advice: ["Acudir a consulta médica para evaluación presencial"],
          confidence: 85
        };
      }
  });
};

// ================= ROUTING & CLASSIFICATION =================

export interface MultimodalIntent {
    intent: 'triage' | 'pharmacy' | 'directory' | 'chat';
    transcription: string; // What the user said
    query: string; // Cleaned query for search
    detectedLocation?: string; // New: Location extracted from text
}

export const classifyMultimodalIntent = async (input: string | { mimeType: string, data: string }): Promise<MultimodalIntent> => {
    return callWithRetry(async () => {
        try {
            let contents: any;
            if (typeof input === 'string') {
                contents = `Classify this text: "${input}"`;
            } else {
                contents = {
                    parts: [
                        { inlineData: { mimeType: input.mimeType, data: input.data } },
                        { text: `Listen to the audio. Transcribe it and classify the intent.` }
                    ]
                };
            }

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: contents,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            intent: { type: Type.STRING, enum: ["triage", "pharmacy", "directory", "chat"] },
                            transcription: { type: Type.STRING, description: "Verbatim transcription of audio or copy of text" },
                            query: { type: Type.STRING, description: "Extracted search query (e.g. 'Clinica San Pablo', 'Paracetamol', 'Fiebre')" },
                            detectedLocation: { type: Type.STRING, description: "Any explicit location mentioned (e.g. 'in San Borja', 'near Miraflores'). Empty if none." }
                        },
                        required: ["intent", "transcription", "query"]
                    },
                    systemInstruction: `You are an intent router for a health app.
                    - 'triage': User describes symptoms ("Me duele la cabeza", "Tengo fiebre").
                    - 'pharmacy': User asks for medication price, stock, or location ("Donde compro Panadol", "Precio de Amoxicilina", "Farmacias cerca").
                    - 'directory': User asks for a SPECIFIC clinic/hospital location ("Donde esta la Clinica Delgado", "Busco el Hospital Rebagliati").
                    - 'chat': Greetings, noise, or general questions not related to finding health services.
                    
                    EXTRACT LOCATION: If the user mentions a district or city (e.g. "en San Isidro", "por Surco"), put it in 'detectedLocation'.`
                }
            });

            const result = JSON.parse(response.text || "{}");
            return {
                intent: result.intent || 'chat',
                transcription: result.transcription || (typeof input === 'string' ? input : 'Audio'),
                query: result.query || '',
                detectedLocation: result.detectedLocation || ''
            };
        } catch (e) {
            return { intent: 'chat', transcription: 'Error de audio', query: '' };
        }
    });
};

export const classifyUserIntent = async (text: string): Promise<'triage' | 'pharmacy' | 'directory'> => {
    // Legacy wrapper for backward compatibility
    const res = await classifyMultimodalIntent(text);
    if (res.intent === 'chat') return 'triage';
    return res.intent;
}

// ================= MEDICINE ANALYSIS (Vademecum) =================

export const analyzeMedications = async (text: string): Promise<MedicineInfo[]> => {
    return callWithRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Analyze the medication(s) mentioned in: "${text}". 
                If multiple meds are found, return a list.
                Provide usage, dosage (general advice only), warnings, and if prescription is needed in Peru. Spanish.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                activeIngredient: { type: Type.STRING },
                                dosage: { type: Type.STRING, description: "Common dosage advice." },
                                purpose: { type: Type.STRING, description: "What is it for?" },
                                warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                                interactions: { type: Type.ARRAY, items: { type: Type.STRING } },
                                alternatives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Generic alternatives" },
                                requiresPrescription: { type: Type.BOOLEAN },
                                takenWithFood: { type: Type.STRING, enum: ["Antes", "Después", "Indiferente", "Con alimentos"] }
                            }
                        }
                    }
                }
            });
            return JSON.parse(response.text || "[]") as MedicineInfo[];
        } catch (e) {
            console.error(e);
            return [{
                name: "Medicamento",
                activeIngredient: "Desconocido",
                dosage: "Consultar médico",
                purpose: "Información no disponible temporalmente.",
                warnings: ["Error al procesar solicitud"],
                interactions: [],
                alternatives: [],
                requiresPrescription: true,
                takenWithFood: "Indiferente"
            }];
        }
    });
};

// ================= MAPS GROUNDING (ROBUST FILTERING) =================

export const identifyLocationFromCoords = async (lat: number, lng: number): Promise<string> => {
    return callWithRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `What is the specific District and Province for these coordinates: ${lat}, ${lng} in Peru? 
                Return strictly ONLY the string in this format: "District, Province". Example: "San Borja, Lima". 
                Do not include specific street address.`,
                config: {
                    tools: [{ googleMaps: {} }],
                    toolConfig: {
                        retrievalConfig: { latLng: { latitude: lat, longitude: lng } }
                    }
                }
            });
            let locationName = response.text || "Ubicación Detectada";
            locationName = locationName.replace(/\./g, '').trim();
            if (locationName.length > 40) return "Tu Ubicación (GPS)";
            return locationName;
        } catch (e) {
            return "Tu Ubicación (GPS)";
        }
    });
};

export const searchNearbyPlaces = async (
    query: string, 
    location: string, 
    coords?: {lat: number, lng: number},
    intent: 'triage' | 'pharmacy' | 'directory' | null = 'triage'
): Promise<{ text: string, places: MedicalCenter[] }> => {
    return callWithRetry(async () => {
        try {
            let prompt = "";
            let toolConfig: any = undefined;
            let systemInstruction = "You are a helpful assistant using Google Maps. You MUST extract real data from the tool.";

            // --- STRATEGY 1: DIRECTORY (Specific Entity) ---
            if (intent === 'directory') {
                prompt = `Find the place named "${query}" in ${location || 'Lima, Peru'}. Return JSON with exact address and phone.`;
            } 
            // --- STRATEGY 2: PHARMACY (Strict Filtering) ---
            else if (intent === 'pharmacy') {
                 prompt = `Find 8 open "Farmacias" or "Boticas" in ${location || 'Lima, Peru'}. 
                 Strictly exclude "Clinica", "Hospital", "Centro Medico", "Veterinaria". 
                 Return names, exact addresses, ratings.`;
                 
                 if (coords) {
                     prompt = `Find 8 open "Farmacias" or "Boticas" near (Lat: ${coords.lat}, Lng: ${coords.lng}). 
                     Strictly exclude "Clinica", "Hospital", "Centro Medico".`;
                     toolConfig = { retrievalConfig: { latLng: { latitude: coords.lat, longitude: coords.lng } } };
                }
            }
            // --- STRATEGY 3: TRIAGE (Clinics/Hospitals) ---
            else {
                prompt = `Find 8 clinics or hospitals matching "${query}" in ${location || 'Lima, Peru'}. Return names, addresses, ratings.`;
                if (coords) {
                     prompt = `Find 8 clinics or hospitals matching "${query}" near (Lat: ${coords.lat}, Lng: ${coords.lng}).`;
                     toolConfig = { retrievalConfig: { latLng: { latitude: coords.lat, longitude: coords.lng } } };
                }
            }
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleMaps: {} }],
                    toolConfig: toolConfig,
                    systemInstruction
                }
            });

            const places: MedicalCenter[] = [];
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            
            if (groundingChunks) {
                groundingChunks.forEach((chunk: any, index: number) => {
                    const source = chunk.web || chunk.maps; 
                    if (source?.uri && source?.title) {
                         const nameLower = source.title.toLowerCase();
                         
                         // --- CLIENT-SIDE STRICT FILTERING ---
                         if (intent === 'pharmacy') {
                             const isPharmacy = /farmacia|botica|apothecary|inkafarma|mifarma/i.test(nameLower);
                             const isClinic = /clinica|hospital|centro m[eé]dico|policl[ií]nico|veterinaria/i.test(nameLower);
                             if (!isPharmacy || isClinic) return; 
                         }

                         let type: MedicalCenter['type'] = intent === 'pharmacy' ? 'Farmacia' : 'Clínica';
                         const has24h = /hospital|clinica|emergencia/i.test(nameLower) && intent === 'triage';

                         places.push({
                            id: `maps-${index}-${Date.now()}`,
                            name: source.title,
                            type: type,
                            district: location || 'Lima',
                            address: 'Ver dirección en Mapa', 
                            latitude: 0,
                            longitude: 0,
                            insurances: [],
                            specialties: [query],
                            googleMapsUri: source.uri,
                            rating: 4.5,
                            isOpen: true,
                            phone: 'Ver en Mapa',
                            has24hER: has24h
                        });
                    }
                });
            }

            const uniquePlaces = places.filter((v,i,a)=>a.findIndex(v2=>(v2.name === v.name))===i);

            return {
                text: response.text || "Resultados encontrados.",
                places: uniquePlaces
            };
        } catch (e) {
            return { text: "No pude conectar con Google Maps.", places: [] };
        }
    });
}

// ================= ACTION-DRIVEN CHAT =================

export interface ChatActionResponse {
    text: string;
    action: 'SEARCH_MAPS' | 'NONE';
    query: string;
}

export const generateFollowUp = async (history: any[], activeFiles: RagDocument[] = []): Promise<ChatActionResponse> => {
    return callWithRetry(async () => {
        try {
            const hasFiles = activeFiles.length > 0;
            let systemInstruction = `You are Doctoi. Keep responses short and helpful. Spanish.
            IMPORTANT:
            - If the user explicitly asks where to buy something, where a clinic is, or asks for locations/addresses, set "action" to "SEARCH_MAPS" and "query" to the object they are looking for.
            - Otherwise set "action" to "NONE".`;
            
            if (hasFiles) systemInstruction += ` Use uploaded documents to answer.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: history,
                config: { 
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            action: { type: Type.STRING, enum: ["SEARCH_MAPS", "NONE"] },
                            query: { type: Type.STRING }
                        }
                    }
                }
            });
            
            const result = JSON.parse(response.text || "{}");
            return {
                text: result.text || "No pude procesar eso.",
                action: result.action || "NONE",
                query: result.query || ""
            };
        } catch (e) { 
            return { text: "Error de conexión.", action: "NONE", query: "" }; 
        }
    });
}

export const generateDoctorResponse = async (history: any[], doctor: Doctor, triageContext: any): Promise<string> => {
    return callWithRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: history,
                config: {
                     systemInstruction: `You are Dr. ${doctor.apellido_paterno}, specialist in ${doctor.especialidad_principal}. Context: ${JSON.stringify(triageContext)}.`
                }
            });
            return response.text || "Error de conexión.";
        } catch (e) { return "Error de conexión."; }
    });
}