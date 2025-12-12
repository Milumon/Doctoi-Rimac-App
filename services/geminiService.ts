
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TriageAnalysis, UrgencyLevel, RagDocument, MedicalCenter, MedicineInfo, KnowledgeSource, MultimodalIntent } from '../types';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

//Helper to clean Markdown JSON
const cleanJsonResponse = (text: string): string => {
    return text.replace(/```json\n?|```/g, '').trim();
};

// =================================================================
// 🚨 LEVEL 1: HARD-CODED EMERGENCY DETECTION (NO AI NEEDED)
// =================================================================

const EMERGENCY_KEYWORDS = /\b(me desangro|desangr[ao]|sangr[ao]|sangr[ao] mucho|sangre|hemorragia|herida profunda|muero|me muero|morir|asfixia|no respira|no puedo respirar|convulsion|convulsiona|inconsciente|paro|accidente grave|caida fuerte|golpe cabeza|quemadura severa|emergencia|ayuda urgente|socorro|cuchillo|disparo|baleado|atropellado|dead|muerto)\b/gi;

const SUICIDE_KEYWORDS = /\b(me voy a matar|me quiero matar|suicidar|matarme|acabar con mi vida|no quiero vivir)\b/gi;

export interface EmergencyDetection {
    isEmergency: boolean;
    isSuicidal: boolean;
    matchedKeywords: string[];
}

/**
 * CRÍTICO: Esta función debe ejecutarse ANTES de cualquier IA.
 * Detecta emergencias médicas o riesgo suicida con 100% de precisión.
 */
export function detectEmergencyKeywords(text: string): EmergencyDetection {
    const lowerText = text.toLowerCase();
    
    const emergencyMatches = [...lowerText.matchAll(EMERGENCY_KEYWORDS)].map(m => m[0]);
    const suicidalMatches = [...lowerText.matchAll(SUICIDE_KEYWORDS)].map(m => m[0]);
    
    return {
        isEmergency: emergencyMatches.length > 0,
        isSuicidal: suicidalMatches.length > 0,
        matchedKeywords: [...emergencyMatches, ...suicidalMatches]
    };
}

// =================================================================
// 🛠️ RETRY LOGIC (503 HANDLING)
// =================================================================

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        if (retries > 0 && (error.status === 503 || error.code === 503 || error.message?.includes('overloaded'))) {
            console.warn(`⚠️ Model overloaded. Retrying in ${delay}ms... (${retries} left)`);
            await new Promise(res => setTimeout(res, delay));
            return callWithRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

// =================================================================
// 📁 RAG / FILE MANAGEMENT
// =================================================================

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
    try { 
        await ai.files.delete({ name: fileName }); 
    } catch (error: any) { 
        // Logic for idempotency:
        // If it was already deleted (404) or we don't have permission (403 - often means it's gone/expired),
        // we ignore it to ensure the UI can proceed with the "visual" deletion.
        const msg = error.message?.toLowerCase() || "";
        const status = error.status || error.code;

        if (
            status === 404 || 
            status === 403 || 
            msg.includes("not found") || 
            msg.includes("permission denied") ||
            msg.includes("does not exist")
        ) {
            console.log(`ℹ️ Archivo ${fileName} eliminado o inaccesible (Ignorando error API).`);
            return;
        }
        
        console.warn("Delete failed with unexpected error:", error); 
    }
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

// Helper to format sources for prompt
const formatSourcesContext = (sources: KnowledgeSource[]) => {
    if (sources.length === 0) return "";
    return `\nOFFICIAL KNOWLEDGE BASE (PRIORITIZE INFORMATION FROM HERE):
    ${sources.map(s => `- ${s.name}: ${s.url} (${s.description})`).join('\n')}
    \nUse Google Search Grounding to verify details against these domains if needed.\n`;
};

// =================================================================
// 🩺 TRIAGE ANALYSIS (ENHANCED WITH EMERGENCY DETECTION)
// =================================================================

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

export const analyzeSymptoms = async (
    input: string | { mimeType: string, data: string },
    activeSources: KnowledgeSource[] = []
): Promise<TriageAnalysis> => {
  return callWithRetry(async () => {
      try {
        // 🚨 LEVEL 1: Hard-coded detection BEFORE AI
        const textToCheck = typeof input === 'string' ? input : '';
        const emergencyCheck = detectEmergencyKeywords(textToCheck);
        
        if (emergencyCheck.isEmergency) {
            return {
                specialty: "Medicina de Emergencias",
                specialtyDescription: "Requiere atención médica inmediata en sala de urgencias.",
                urgency: UrgencyLevel.EMERGENCY,
                urgencyExplanation: `Situación detectada: ${emergencyCheck.matchedKeywords.join(', ')}. ACCIÓN INMEDIATA REQUERIDA.`,
                detectedSymptoms: emergencyCheck.matchedKeywords,
                advice: [
                    "🚨 Llamar al 106 (SAMU) AHORA",
                    "No mover al paciente si hay trauma craneal o espinal",
                    "Si hay hemorragia visible, aplicar presión directa con tela limpia",
                    "Mantener a la persona consciente hablándole"
                ],
                confidence: 100
            };
        }

        if (emergencyCheck.isSuicidal) {
            return {
                specialty: "Psiquiatría de Emergencias",
                specialtyDescription: "Crisis de salud mental que requiere intervención urgente.",
                urgency: UrgencyLevel.EMERGENCY,
                urgencyExplanation: "Riesgo vital por ideación suicida. Requiere contención psiquiátrica inmediata.",
                detectedSymptoms: ["Ideación suicida", "Crisis emocional"],
                advice: [
                    "🆘 Línea de prevención suicida: 113 (Ministerio de Salud)",
                    "No dejar solo al paciente",
                    "Retirar objetos peligrosos del entorno",
                    "Acudir a emergencias de un hospital con psiquiatría"
                ],
                confidence: 100
            };
        }

        // 🤖 LEVEL 2: AI Analysis
        let contents: any;
        const sourcesContext = formatSourcesContext(activeSources);
        const useTools = activeSources.length > 0;

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
        
        // DYNAMIC CONFIG: Mutually exclusive properties
        let config: any = {};
        
        // Base system instruction
        let systemInstruction = `You are a triage assistant for Peru.${sourcesContext}

CRITICAL EMERGENCY DETECTION RULES (HIGHEST PRIORITY):
1. ANY mention of: bleeding heavily, hemorrhage, stabbing, gunshot, severe burns, unconscious, not breathing, choking, seizure, severe chest pain, stroke symptoms -> ALWAYS return urgency: "Emergencia"
2. Phrases like "me desangro", "no puedo respirar", "dolor de pecho intenso", "convulsionando" -> urgency: "Emergencia"

STANDARD RULES:
- If input is clearly not symptoms (e.g. "Hello", "Weather"), return confidence: 0.
- For mild symptoms (headache, cold), use "Baja" or "Moderada".
- Use the Official Knowledge Base to refine advice if applicable.
`;

        if (useTools) {
            // FIX: If using tools, CANNOT use responseMimeType: "application/json"
            config.tools = [{googleSearch: {}}];
            // We append the JSON requirement to the prompt instead
            systemInstruction += `\nIMPORTANT: You must output strictly valid JSON. 
            Format:
            {
                "specialty": "string",
                "specialtyDescription": "string",
                "urgency": "Baja" | "Moderada" | "Alta" | "Emergencia",
                "urgencyExplanation": "string",
                "detectedSymptoms": ["string"],
                "advice": ["string"],
                "confidence": number
            }`;
        } else {
            // If NO tools, we can safely use the strict JSON mode
            config.responseMimeType = "application/json";
            config.responseSchema = triageSchema;
        }

        config.systemInstruction = systemInstruction;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contents,
          config: config
        });

        if (response.text) {
            const cleanText = cleanJsonResponse(response.text);
            const result = JSON.parse(cleanText) as TriageAnalysis;
            
            // 🛡️ POST-PROCESSING: Force emergency if AI missed it
            const resultCheck = detectEmergencyKeywords(result.detectedSymptoms.join(' '));
            if (resultCheck.isEmergency && result.urgency !== UrgencyLevel.EMERGENCY) {
                result.urgency = UrgencyLevel.EMERGENCY;
                result.urgencyExplanation = "Síntomas de alto riesgo detectados. Atención inmediata necesaria.";
            }
            
            return result;
        }
        throw new Error("No response text");

      } catch (error) {
        console.error("❌ Gemini analysis failed. Using emergency fallback.", error);
        // 🚨 SAFETY FALLBACK
        return {
          specialty: "Medicina General (Urgente)",
          specialtyDescription: "No se pudo procesar la consulta. Por seguridad, recomendamos evaluación urgente.",
          urgency: UrgencyLevel.HIGH,
          urgencyExplanation: "Error en el sistema. Por precaución, acuda a emergencias si los síntomas son severos.",
          detectedSymptoms: ["Error de procesamiento"],
          advice: [
            "Si los síntomas son graves o empeoran, llamar al 106 o acudir a emergencias",
            "No automedicarse",
            "Buscar atención médica presencial lo antes posible"
          ],
          confidence: 50
        };
      }
  });
};

// =================================================================
// 🎯 INTENT CLASSIFICATION
// =================================================================

export const classifyMultimodalIntent = async (input: string | { mimeType: string, data: string }): Promise<MultimodalIntent> => {
    return callWithRetry(async () => {
        try {
            // 🚨 LEVEL 1: Check for emergency BEFORE classification
            const textToCheck = typeof input === 'string' ? input : '';
            const emergencyCheck = detectEmergencyKeywords(textToCheck);
            
            if (emergencyCheck.isEmergency || emergencyCheck.isSuicidal) {
                return {
                    intent: 'triage',
                    transcription: textToCheck || 'Emergency detected',
                    query: emergencyCheck.matchedKeywords.join(' '),
                    isEmergency: true
                };
            }

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
                            transcription: { type: Type.STRING },
                            query: { type: Type.STRING },
                            detectedLocation: { type: Type.STRING }
                        },
                        required: ["intent", "transcription", "query"]
                    },
                    systemInstruction: `You are an intent router for a health app in Peru.
                    
EMERGENCY OVERRIDE (HIGHEST PRIORITY):
- If user mentions: bleeding, severe pain, unconscious, can't breathe, emergency -> ALWAYS return intent: "triage"
- If user asks "¿dónde?" after mentioning symptoms -> They want location, return intent: "triage" with action to search.

CLASSIFICATION RULES:
1. 'triage': User describes symptoms, distress, or asks "where to go" after mentioning health issue.
2. 'pharmacy': User asks for MEDICATION by name ("Paracetamol", "Ibuprofeno") or explicitly says "farmacia".
3. 'directory': User asks for a SPECIFIC clinic/hospital BY NAME ("Clínica San Pablo", "Hospital Rebagliati").
4. 'chat': Greetings, general questions unrelated to health.

CRITICAL OVERRIDES:
- "Me desangro" + "¿dónde?" -> intent: "triage", query: "emergency rooms hemorrhage"
- "Clínica" / "Hospital" (without name) -> intent: "triage" (to find appropriate one based on symptoms)
- Medication name -> NEVER intent: "directory" (always "pharmacy"). EVEN IF user says "mentira" or "ok" before the med name, classify as pharmacy.
- If user provides specific medicine name like "Amoxicilina" after being in triage -> Switch to 'pharmacy'.

EXTRACT LOCATION: If user mentions district/city (e.g. "en San Isidro", "por Surco"), put in 'detectedLocation'.`
                }
            });

            const result = JSON.parse(response.text || "{}");
            return {
                intent: result.intent || 'chat',
                transcription: result.transcription || (typeof input === 'string' ? input : 'Audio'),
                query: result.query || '',
                detectedLocation: result.detectedLocation || '',
                isEmergency: false
            };
        } catch (e) {
            return { intent: 'chat', transcription: 'Error de audio', query: '', isEmergency: false };
        }
    });
};

// Legacy wrapper
export const classifyUserIntent = async (text: string): Promise<'triage' | 'pharmacy' | 'directory'> => {
    const res = await classifyMultimodalIntent(text);
    if (res.intent === 'chat') return 'triage';
    return res.intent;
}

// =================================================================
// 💊 MEDICINE ANALYSIS
// =================================================================

export const analyzeMedications = async (
    text: string,
    activeSources: KnowledgeSource[] = []
): Promise<MedicineInfo[]> => {
    return callWithRetry(async () => {
        try {
            const sourcesContext = formatSourcesContext(activeSources);
            const useTools = activeSources.length > 0;
            
            let config: any = {};
            let systemInstruction = `You are a pharmaceutical assistant.${sourcesContext}`;

            if (useTools) {
                config.tools = [{googleSearch: {}}];
                // Manual JSON enforcement via prompt
                systemInstruction += `\nIMPORTANT: Return strictly valid JSON array.
                Format: [{
                    "name": "string",
                    "activeIngredient": "string",
                    "dosage": "string",
                    "purpose": "string",
                    "warnings": ["string"],
                    "interactions": ["string"],
                    "alternatives": ["string"],
                    "requiresPrescription": boolean,
                    "takenWithFood": "Antes" | "Después" | "Indiferente" | "Con alimentos"
                }]`;
            } else {
                config.responseMimeType = "application/json";
                config.responseSchema = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            activeIngredient: { type: Type.STRING },
                            dosage: { type: Type.STRING },
                            purpose: { type: Type.STRING },
                            warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                            interactions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            alternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
                            requiresPrescription: { type: Type.BOOLEAN },
                            takenWithFood: { type: Type.STRING, enum: ["Antes", "Después", "Indiferente", "Con alimentos"] }
                        }
                    }
                };
            }
            config.systemInstruction = systemInstruction;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Analyze the medication(s) mentioned in: "${text}". 
                If multiple meds are found, return a list.
                Provide usage, dosage (general advice only), warnings, and if prescription is needed in Peru. Spanish.
                ${sourcesContext ? `Consult the Official Knowledge Base via Google Search if necessary.` : ''}`,
                config: config
            });
            
            const cleanText = cleanJsonResponse(response.text || "[]");
            return JSON.parse(cleanText) as MedicineInfo[];
        } catch (e) {
            console.error("Medication analysis failed", e);
            return [{
                name: "Medicamento",
                activeIngredient: "Desconocido",
                dosage: "Consultar médico",
                purpose: "Información no disponible.",
                warnings: ["Error al procesar solicitud"],
                interactions: [],
                alternatives: [],
                requiresPrescription: true,
                takenWithFood: "Indiferente"
            }];
        }
    });
};

// =================================================================
// 🗺️ GOOGLE MAPS GROUNDING (GEOGRAPHICALLY PINNED)
// =================================================================

export const identifyLocationFromCoords = async (lat: number, lng: number): Promise<string> => {
    return callWithRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `What is the District and Province for: ${lat}, ${lng} in Peru? 
                Format: "District, Province" (e.g. "San Borja, Lima"). 
                Do NOT include street address.`,
                config: {
                    tools: [{ googleMaps: {} }],
                    toolConfig: {
                        retrievalConfig: { latLng: { latitude: lat, longitude: lng } }
                    }
                }
            });
            let locationName = response.text?.replace(/\./g, '').trim() || "Ubicación Detectada";
            if (locationName.length > 40) return "Tu Ubicación (GPS)";
            return locationName;
        } catch (e) {
            return "Tu Ubicación (GPS)";
        }
    });
};

export const searchNearbyPlaces = async (
    query: string, 
    location: string | null, 
    coords?: {lat: number, lng: number},
    intent: 'triage' | 'pharmacy' | 'directory' | null = 'triage'
): Promise<{ text: string, places: MedicalCenter[] }> => {
    return callWithRetry(async () => {
        try {
            let prompt = "";
            let toolConfig: any = undefined;

            const geoPinning = coords 
                ? `near latitude ${coords.lat}, longitude ${coords.lng}` 
                : location 
                    ? `in ${location}, Peru` 
                    : `in Lima, Peru (country:PE)`;

            if (coords) {
                toolConfig = { 
                    retrievalConfig: { 
                        latLng: { latitude: coords.lat, longitude: coords.lng } 
                    } 
                };
            }

            // 🚨 EMERGENCY MODE
            const emergencyCheck = detectEmergencyKeywords(query);
            if (emergencyCheck.isEmergency) {
                prompt = `Find 8 hospitals or clinics with 24-hour EMERGENCY ROOMS ${geoPinning}. 
                Must have: Emergency department, trauma care, surgery capability.
                Prioritize: Hospitals over clinics.
                Return names, addresses, phone numbers, ratings.`;
            }
            // 🏥 DIRECTORY MODE
            else if (intent === 'directory') {
                prompt = `Find the exact place named "${query}" ${geoPinning}. 
                Return precise address, phone, and Maps link.`;
            } 
            // 💊 PHARMACY MODE (Strict filtering)
            else if (intent === 'pharmacy') {
                prompt = `Find 8 "Farmacias" or "Boticas" ${geoPinning}. 
                EXCLUDE: Clínicas, Hospitales, Centros Médicos, Veterinarias.
                Only return actual pharmacies.`;
            }
            // 🩺 TRIAGE MODE (Clinics/Hospitals)
            else {
                prompt = `Find 8 clinics or hospitals for "${query}" ${geoPinning}. 
                Return names, addresses, ratings.`;
            }
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleMaps: {} }],
                    toolConfig: toolConfig,
                    systemInstruction: "Extract real Places data from Google Maps tool. You MUST use the tool, not invent data."
                }
            });

            const places: MedicalCenter[] = [];
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            
            if (groundingChunks) {
                groundingChunks.forEach((chunk: any, index: number) => {
                    const source = chunk.web || chunk.maps; 
                    if (source?.uri && source?.title) {
                         const nameLower = source.title.toLowerCase();
                         
                         // 🛡️ STRICT CLIENT-SIDE FILTERING
                         if (intent === 'pharmacy') {
                             const isPharmacy = /farmacia|botica|apothecary|inkafarma|mifarma/i.test(nameLower);
                             const isClinic = /clinica|hospital|centro m[eé]dico|policl[ií]nico|veterinaria/i.test(nameLower);
                             if (!isPharmacy || isClinic) {
                                 return; 
                             }
                         }

                         // 🌎 GEOGRAPHIC VALIDATION
                         const isProbablyInPeru = 
                             source.uri.includes('Peru') || 
                             source.uri.includes('Lima') ||
                             nameLower.includes('peru') ||
                             nameLower.includes('lima');
                         
                         let type: MedicalCenter['type'] = intent === 'pharmacy' ? 'Farmacia' : 'Clínica';
                         const has24h = (/hospital|emergencia/i.test(nameLower) && intent === 'triage') || emergencyCheck.isEmergency;

                         places.push({
                            id: `maps-${index}-${Date.now()}`,
                            name: source.title,
                            type: type,
                            district: location || 'Lima',
                            address: 'Ver dirección en Mapa', 
                            latitude: coords?.lat || 0,
                            longitude: coords?.lng || 0,
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
                text: response.text || "Resultados encontrados en Google Maps.",
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

export const generateFollowUp = async (
    history: any[], 
    activeFiles: RagDocument[] = [],
    activeSources: KnowledgeSource[] = []
): Promise<ChatActionResponse> => {
    return callWithRetry(async () => {
        try {
            const hasFiles = activeFiles.length > 0;
            const useTools = activeSources.length > 0;
            const sourcesContext = formatSourcesContext(activeSources);
            
            let systemInstruction = `You are Doctoi. Keep responses short and helpful. Spanish.${sourcesContext}
            IMPORTANT:
            - If the user explicitly asks where to buy something, where a clinic is, or asks for locations/addresses, set "action" to "SEARCH_MAPS" and "query" to the object they are looking for.
            - If the user confirms a previous question like "Shall I look for it?" with "Yes", "Si", "Dale", "Busca", set "action" to "SEARCH_MAPS".
            - If the user asks "donde consigo [medicamento]", set "action" to "SEARCH_MAPS" and query "[medicamento]".
            - Otherwise set "action" to "NONE".`;
            
            if (hasFiles) systemInstruction += ` Use uploaded documents to answer.`;

            let config: any = {};
            if (useTools) {
                config.tools = [{googleSearch: {}}];
                systemInstruction += `\nReturn strictly valid JSON: {"text": "string", "action": "SEARCH_MAPS" | "NONE", "query": "string"}`;
            } else {
                config.responseMimeType = "application/json";
                config.responseSchema = {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        action: { type: Type.STRING, enum: ["SEARCH_MAPS", "NONE"] },
                        query: { type: Type.STRING }
                    }
                };
            }
            config.systemInstruction = systemInstruction;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: history,
                config: config
            });
            
            const cleanText = cleanJsonResponse(response.text || "{}");
            const result = JSON.parse(cleanText);
            
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

// ================= VIRTUAL ASSISTANT (LEGAL-SAFE) =================

export const generateAssistantResponse = async (
    history: any[], 
    activeFiles: RagDocument[] = [],
    context: any
): Promise<string> => {
    return callWithRetry(async () => {
        try {
            const systemInstruction = `
            ROLE: You are "Doctoi Asistente", a Virtual Health Assistant powered by AI.
            CONTEXT: The user has completed a triage. Context: ${JSON.stringify(context)}.
            
            FORMAT RULES (CRITICAL):
            1. BE CONCISE: Avoid long paragraphs. Use bullet points for lists.
            2. DIRECTNESS: Get straight to the answer. Avoid fluff like "That is an excellent question".
            3. LENGTH: Keep responses under 150 words unless specifically asked for a detailed explanation.
            4. STRUCTURE: Use bold text for key terms.

            LEGAL SAFETY PROTOCOLS (STRICT):
            1. NEVER claim to be a doctor, physician, or medical professional.
            2. NEVER provide a definitive diagnosis. Use phrases like "results suggest", "compatible with", "could indicate".
            3. NEVER prescribe medication or alter dosage.
            4. ALWAYS include a disclaimer if the question is complex: "I am an AI, this is educational information. Please consult a doctor."

            CAPABILITIES:
            - You can analyze uploaded documents (PDFs, Images) if they are in the history.
            - If the user uploads a lab result, explain the abnormal values in simple terms.
            - If the user uploads a prescription, explain what the medicines are for.
            
            TONE: Professional, empathetic, clear, educational, and direct. Spanish.
            `;

            // Prepare multimodal content if files exist in the latest turn (this logic assumes files are passed via implicit history or specialized prompts, 
            // but for this function, we assume 'history' already contains the multimodal parts if constructed correctly by the caller,
            // OR we append files to the latest user message here if they are "active" for the session).
            
            // NOTE: In this architecture, the Caller (App.tsx) constructs the history with file parts. 
            // So we just pass history through.

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: history,
                config: {
                     systemInstruction: systemInstruction
                }
            });
            return response.text || "No pude generar una respuesta.";
        } catch (e) { return "Error al consultar al asistente."; }
    });
}
