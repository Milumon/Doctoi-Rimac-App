
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

const EMERGENCY_KEYWORDS = {
  es: /\b(me desangro|desangr[ao]|sangr[ao]|sangr[ao] mucho|sangre|hemorragia|herida profunda|muero|me muero|morir|asfixia|no respira|no puedo respirar|convulsion|convulsiona|inconsciente|paro|accidente grave|caida fuerte|golpe cabeza|quemadura severa|emergencia|ayuda urgente|socorro|cuchillo|disparo|baleado|atropellado|dead|muerto)\b/gi,
  en: /\b(bleeding|hemorrhage|can't breathe|choking|unconscious|seizure|convulsion|heart attack|chest pain|stroke|severe burn|emergency|help|stabbed|gunshot|shot|dying|severe pain|head injury)\b/gi
};

const SUICIDE_KEYWORDS = {
  es: /\b(me voy a matar|me quiero matar|suicidar|matarme|acabar con mi vida|no quiero vivir)\b/gi,
  en: /\b(kill myself|suicide|end my life|don't want to live|want to die)\b/gi
};

export interface EmergencyDetection {
    isEmergency: boolean;
    isSuicidal: boolean;
    matchedKeywords: string[];
}

/**
 * CRÍTICO: Esta función debe ejecutarse ANTES de cualquier IA.
 * Detecta emergencias médicas o riesgo suicida con 100% de precisión.
 */
export function detectEmergencyKeywords(text: string, language: 'es' | 'en' = 'es'): EmergencyDetection {
    const lowerText = text.toLowerCase();
    
    // Combine both languages to be safe, or stick to selected language.
    // Safety first: Check BOTH languages regardless of selection to catch "Help me" in ES mode.
    const emergencyMatchesES = [...lowerText.matchAll(EMERGENCY_KEYWORDS.es)].map(m => m[0]);
    const emergencyMatchesEN = [...lowerText.matchAll(EMERGENCY_KEYWORDS.en)].map(m => m[0]);
    
    const suicidalMatchesES = [...lowerText.matchAll(SUICIDE_KEYWORDS.es)].map(m => m[0]);
    const suicidalMatchesEN = [...lowerText.matchAll(SUICIDE_KEYWORDS.en)].map(m => m[0]);

    return {
        isEmergency: emergencyMatchesES.length > 0 || emergencyMatchesEN.length > 0,
        isSuicidal: suicidalMatchesES.length > 0 || suicidalMatchesEN.length > 0,
        matchedKeywords: [...emergencyMatchesES, ...emergencyMatchesEN, ...suicidalMatchesES, ...suicidalMatchesEN]
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
// 📁 RAG / FILE MANAGEMENT (CLIENT-SIDE BASE64)
// =================================================================

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the Data URL prefix (e.g., "data:image/png;base64,")
            const base64Data = result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = error => reject(error);
    });
};

export const uploadFileToGemini = async (file: File): Promise<RagDocument> => {
    // SWITCH TO LOCAL PROCESSING: Avoids CORS/Server issues by keeping data client-side.
    try {
        const base64Data = await fileToBase64(file);
        
        return {
            id: `local-${Date.now()}`, 
            displayName: file.name,
            uri: URL.createObjectURL(file), // Local blob URI for preview if needed
            mimeType: file.type,
            state: 'ACTIVE', // Ready immediately
            sizeBytes: file.size.toString(),
            base64Data: base64Data // Store base64 for the API call
        };
    } catch (error: any) {
        throw new Error("Error processing file locally.");
    }
};

export const deleteFileFromGemini = async (fileName: string): Promise<void> => {
    // No-op for local files, state is managed in App.tsx
    return;
};

export const getActiveFilesFromGemini = async (): Promise<RagDocument[]> => {
    // For local session files, we don't fetch from server. 
    // Return empty array to rely on App.tsx state.
    return [];
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
    specialtyDescription: { type: Type.STRING, description: "Very short explanation (max 10 words)" },
    urgency: { 
      type: Type.STRING, 
      enum: [UrgencyLevel.LOW, UrgencyLevel.MODERATE, UrgencyLevel.HIGH, UrgencyLevel.EMERGENCY],
      description: "Urgency level of the condition"
    },
    urgencyExplanation: { type: Type.STRING, description: "Very short reason (max 10 words)" },
    detectedSymptoms: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of symptoms extracted from user text"
    },
    advice: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Short, actionable advice items (max 8 words each)"
    },
    confidence: { type: Type.NUMBER, description: "Confidence score 0-100. Set to 0 if input is greetings, noise or lacks symptoms." }
  },
  required: ["specialty", "specialtyDescription", "urgency", "urgencyExplanation", "detectedSymptoms", "advice", "confidence"]
};

export const analyzeSymptoms = async (
    input: string | { mimeType: string, data: string },
    activeSources: KnowledgeSource[] = [],
    language: 'es' | 'en' = 'es'
): Promise<TriageAnalysis> => {
  return callWithRetry(async () => {
      try {
        // 🚨 LEVEL 1: Hard-coded detection BEFORE AI
        const textToCheck = typeof input === 'string' ? input : '';
        const emergencyCheck = detectEmergencyKeywords(textToCheck, language);
        
        // Define emergency texts based on language
        const isEn = language === 'en';

        if (emergencyCheck.isEmergency) {
            return {
                specialty: isEn ? "Emergency Medicine" : "Medicina de Emergencias",
                specialtyDescription: isEn ? "Requires immediate attention." : "Requiere atención inmediata.",
                urgency: UrgencyLevel.EMERGENCY,
                urgencyExplanation: isEn 
                    ? `Situation detected: ${emergencyCheck.matchedKeywords.join(', ')}.`
                    : `Detectado: ${emergencyCheck.matchedKeywords.join(', ')}.`,
                detectedSymptoms: emergencyCheck.matchedKeywords,
                advice: isEn ? [
                    "🚨 Call 106 (SAMU) NOW",
                    "Do not move the patient",
                    "Keep patient conscious"
                ] : [
                    "🚨 Llamar al 106 (SAMU) AHORA",
                    "No mover al paciente",
                    "Mantener a la persona consciente"
                ],
                confidence: 100
            };
        }

        if (emergencyCheck.isSuicidal) {
             return {
                specialty: isEn ? "Psychiatric Emergency" : "Psiquiatría de Emergencias",
                specialtyDescription: isEn ? "Mental health crisis." : "Crisis de salud mental.",
                urgency: UrgencyLevel.EMERGENCY,
                urgencyExplanation: isEn ? "Suicidal ideation." : "Ideación suicida.",
                detectedSymptoms: isEn ? ["Suicidal ideation"] : ["Ideación suicida"],
                advice: isEn ? [
                    "🆘 Call 113",
                    "Do not leave alone",
                    "Go to ER"
                ] : [
                    "🆘 Llamar al 113 (Minsa)",
                    "No dejar solo",
                    "Acudir a emergencias"
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
        
        let config: any = {};
        
        const outputLang = isEn ? "English" : "Spanish";

        // Base system instruction
        let systemInstruction = `You are a triage assistant for Peru.${sourcesContext}

CRITICAL: Respond in ${outputLang}.

CRITICAL EMERGENCY DETECTION RULES (HIGHEST PRIORITY):
1. ANY mention of: bleeding heavily, hemorrhage, stabbing, gunshot, severe burns, unconscious, not breathing, choking, seizure, severe chest pain, stroke symptoms -> ALWAYS return urgency: "Emergencia"
2. Phrases like "me desangro", "no puedo respirar", "dolor de pecho intenso" -> urgency: "Emergencia"

STANDARD RULES:
- BE EXTREMELY CONCISE. Short sentences only.
- 'specialtyDescription': Max 10 words.
- 'urgencyExplanation': Max 10 words.
- 'advice': Max 3 items, max 8 words each.
- If input is clearly not symptoms (e.g. "Hello", "Weather"), return confidence: 0.
`;

        if (useTools) {
            config.tools = [{googleSearch: {}}];
            systemInstruction += `\nIMPORTANT: You must output strictly valid JSON. 
            Format:
            {
                "specialty": "string",
                "specialtyDescription": "string (very short)",
                "urgency": "Baja" | "Moderada" | "Alta" | "Emergencia",
                "urgencyExplanation": "string (very short)",
                "detectedSymptoms": ["string"],
                "advice": ["string (very short)"],
                "confidence": number
            }`;
        } else {
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
            const resultCheck = detectEmergencyKeywords(result.detectedSymptoms.join(' '), language);
            if (resultCheck.isEmergency && result.urgency !== UrgencyLevel.EMERGENCY) {
                result.urgency = UrgencyLevel.EMERGENCY;
                result.urgencyExplanation = isEn ? "High risk symptoms." : "Síntomas de alto riesgo.";
            }
            
            return result;
        }
        throw new Error("No response text");

      } catch (error) {
        console.error("❌ Gemini analysis failed. Using emergency fallback.", error);
        return {
          specialty: "Medicina General",
          specialtyDescription: "Error.",
          urgency: UrgencyLevel.HIGH,
          urgencyExplanation: "Error processing.",
          detectedSymptoms: ["Error"],
          advice: ["Seek medical help"],
          confidence: 50
        };
      }
  });
};

// =================================================================
// 🎯 INTENT CLASSIFICATION
// =================================================================

export const classifyMultimodalIntent = async (
    input: string | { mimeType: string, data: string },
    language: 'es' | 'en' = 'es'
): Promise<MultimodalIntent> => {
    return callWithRetry(async () => {
        try {
            // 🚨 LEVEL 1: Check for emergency BEFORE classification
            const textToCheck = typeof input === 'string' ? input : '';
            const emergencyCheck = detectEmergencyKeywords(textToCheck, language);
            
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
                    
CLASSIFICATION RULES:
1. 'triage': User describes symptoms, distress, or asks "where to go" after mentioning health issue.
2. 'pharmacy': User asks for MEDICATION by name ("Paracetamol") or explicitly says "pharmacy/farmacia".
3. 'directory': User asks for a SPECIFIC clinic/hospital BY NAME ("Clínica San Pablo").
4. 'chat': Greetings, general questions unrelated to health.

EXTRACT LOCATION: If user mentions district/city (e.g. "en San Isidro", "in Lima"), put in 'detectedLocation'.
TRANSCRIBE: If audio, transcribe to the language spoken.`
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

// =================================================================
// 💊 MEDICINE ANALYSIS
// =================================================================

export const analyzeMedications = async (
    text: string,
    activeSources: KnowledgeSource[] = [],
    language: 'es' | 'en' = 'es'
): Promise<MedicineInfo[]> => {
    return callWithRetry(async () => {
        try {
            const sourcesContext = formatSourcesContext(activeSources);
            const useTools = activeSources.length > 0;
            const outputLang = language === 'en' ? "English" : "Spanish";
            
            let config: any = {};
            let systemInstruction = `You are a pharmaceutical assistant.${sourcesContext}
            Respond in ${outputLang}.
            CRITICAL: Keep 'purpose', 'dosage', 'warnings' VERY CONCISE (max 10-15 words each). Use short bullet-point style sentences.`;

            if (useTools) {
                config.tools = [{googleSearch: {}}];
                // Manual JSON enforcement via prompt
                systemInstruction += `\nIMPORTANT: Return strictly valid JSON array.
                Format: [{
                    "name": "string",
                    "activeIngredient": "string",
                    "dosage": "string (very concise)",
                    "purpose": "string (very concise)",
                    "warnings": ["string (short)"],
                    "interactions": ["string (short)"],
                    "alternatives": ["string"],
                    "requiresPrescription": boolean,
                    "takenWithFood": "Antes" | "Después" | "Indiferente" | "Con alimentos" | "Before" | "After" | "Indifferent" | "With food"
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
                            takenWithFood: { type: Type.STRING }
                        }
                    }
                };
            }
            config.systemInstruction = systemInstruction;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Analyze the medication(s) mentioned in: "${text}". 
                If multiple meds are found, return a list.
                Provide usage, dosage (general advice only), warnings, and if prescription is needed in Peru.`,
                config: config
            });
            
            const cleanText = cleanJsonResponse(response.text || "[]");
            return JSON.parse(cleanText) as MedicineInfo[];
        } catch (e) {
            console.error("Medication analysis failed", e);
            return [];
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
                Format: "District, Province" (e.g. "San Borja, Lima").`,
                config: {
                    tools: [{ googleMaps: {} }],
                    toolConfig: {
                        retrievalConfig: { latLng: { latitude: lat, longitude: lng } }
                    }
                }
            });
            let locationName = response.text?.replace(/\./g, '').trim() || "Ubicación Detectada";
            if (locationName.length > 40) return "GPS Location";
            return locationName;
        } catch (e) {
            return "GPS Location";
        }
    });
};

export const searchNearbyPlaces = async (
    query: string, 
    location: string | null, 
    coords?: {lat: number, lng: number},
    intent: 'triage' | 'pharmacy' | 'directory' | null = 'triage',
    language: 'es' | 'en' = 'es'
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
            const emergencyCheck = detectEmergencyKeywords(query, language);
            if (emergencyCheck.isEmergency) {
                prompt = `Find 8 hospitals or clinics with 24-hour EMERGENCY ROOMS ${geoPinning}. 
                Must have: Emergency department, trauma care.`;
            }
            // 💊 PHARMACY MODE
            else if (intent === 'pharmacy') {
                prompt = `Find 8 "Farmacias" or "Boticas" ${geoPinning}. 
                EXCLUDE: Clinics. Only return pharmacies.`;
            }
            // 🩺 TRIAGE MODE
            else {
                prompt = `Find 8 clinics or hospitals for "${query}" ${geoPinning}.`;
            }
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleMaps: {} }],
                    toolConfig: toolConfig
                }
            });

            const places: MedicalCenter[] = [];
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            
            if (groundingChunks) {
                groundingChunks.forEach((chunk: any, index: number) => {
                    const source = chunk.web || chunk.maps; 
                    if (source?.uri && source?.title) {
                         const nameLower = source.title.toLowerCase();
                         
                         if (intent === 'pharmacy') {
                             const isPharmacy = /farmacia|botica|apothecary|inkafarma|mifarma/i.test(nameLower);
                             const isClinic = /clinica|hospital|centro m[eé]dico|policl[ií]nico|veterinaria/i.test(nameLower);
                             if (!isPharmacy || isClinic) return;
                         }

                         let type: MedicalCenter['type'] = intent === 'pharmacy' ? 'Farmacia' : 'Clínica';
                         const has24h = (/hospital|emergencia/i.test(nameLower) && intent === 'triage') || emergencyCheck.isEmergency;

                         places.push({
                            id: `maps-${index}-${Date.now()}`,
                            name: source.title,
                            type: type,
                            district: location || 'Lima',
                            address: 'Maps', 
                            latitude: coords?.lat || 0,
                            longitude: coords?.lng || 0,
                            insurances: [],
                            specialties: [query],
                            googleMapsUri: source.uri,
                            rating: 4.5,
                            isOpen: true,
                            phone: 'Maps',
                            has24hER: has24h
                        });
                    }
                });
            }

            const uniquePlaces = places.filter((v,i,a)=>a.findIndex(v2=>(v2.name === v.name))===i);

            return {
                text: response.text || "Maps results.",
                places: uniquePlaces
            };
        } catch (e) {
            return { text: "Maps error.", places: [] };
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
    activeSources: KnowledgeSource[] = [],
    language: 'es' | 'en' = 'es'
): Promise<ChatActionResponse> => {
    return callWithRetry(async () => {
        try {
            const hasFiles = activeFiles.length > 0;
            const useTools = activeSources.length > 0;
            const sourcesContext = formatSourcesContext(activeSources);
            const outputLang = language === 'en' ? "English" : "Spanish";
            
            // PREPARE FILE PARTS FOR INLINE DATA
            const fileParts = activeFiles
                .filter(f => f.base64Data)
                .map(f => ({
                    inlineData: {
                        mimeType: f.mimeType,
                        data: f.base64Data as string
                    }
                }));

            // If we have files, inject them into the LAST user message or as a new context block
            let contents = [...history];
            
            // If there are files, add them to the latest user part if possible, or append context
            if (fileParts.length > 0) {
                 // Simple strategy: Add a "User" message at the end with the images if they aren't already there
                 // But better: construct the payload properly
                 const lastMsg = contents[contents.length - 1];
                 if (lastMsg.role === 'user') {
                     lastMsg.parts = [...fileParts, ...lastMsg.parts];
                 } else {
                     contents.push({ role: 'user', parts: fileParts });
                 }
            }

            let systemInstruction = `You are Doctoi. Keep responses short and helpful. Respond in ${outputLang}.${sourcesContext}
            IMPORTANT:
            - If user wants to find a place/address, set action="SEARCH_MAPS".
            `;
            
            if (hasFiles) systemInstruction += ` Use attached images/documents to answer.`;

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
                contents: contents,
                config: config
            });
            
            const cleanText = cleanJsonResponse(response.text || "{}");
            const result = JSON.parse(cleanText);
            
            return {
                text: result.text || "Error.",
                action: result.action || "NONE",
                query: result.query || ""
            };
        } catch (e) { 
            console.error(e);
            return { text: "Error.", action: "NONE", query: "" }; 
        }
    });
}

// ================= VIRTUAL ASSISTANT (LEGAL-SAFE) =================

export const generateAssistantResponse = async (
    history: any[], 
    activeFiles: RagDocument[] = [],
    context: any,
    language: 'es' | 'en' = 'es'
): Promise<string> => {
    return callWithRetry(async () => {
        try {
            const outputLang = language === 'en' ? "English" : "Spanish";
            const systemInstruction = `
            ROLE: You are "Doctoi Assistant".
            CONTEXT: Context: ${JSON.stringify(context)}.
            
            LEGAL SAFETY PROTOCOLS (STRICT):
            1. NEVER claim to be a doctor.
            2. NEVER prescribe medication.
            3. ALWAYS include a disclaimer: "I am an AI, this is educational information."

            TONE: Professional, empathetic, clear, educational. Respond in ${outputLang}.
            `;

            // PREPARE PAYLOAD WITH INLINE DATA FOR FILES
            // This replaces the old "text-only" reference to files.
            
            let contents = [...history];

            // Filter files that have base64 data available
            const validFiles = activeFiles.filter(f => f.base64Data);

            if (validFiles.length > 0) {
                 // We attach files to the *last* user message to ensure they are part of the immediate context
                 let lastMsgIndex = -1;
                 for (let i = contents.length - 1; i >= 0; i--) {
                     if (contents[i].role === 'user') {
                         lastMsgIndex = i;
                         break;
                     }
                 }
                 
                 const fileParts = validFiles.map(f => ({
                    inlineData: {
                        mimeType: f.mimeType,
                        data: f.base64Data as string
                    }
                 }));

                 if (lastMsgIndex !== -1) {
                     // Add files to existing last message
                     contents[lastMsgIndex].parts = [...fileParts, ...contents[lastMsgIndex].parts];
                 } else {
                     // Or prepend if no user msg found (rare)
                     contents.push({ role: 'user', parts: fileParts });
                 }
            }

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: contents,
                config: {
                     systemInstruction: systemInstruction
                }
            });
            return response.text || "Error.";
        } catch (e) { 
            console.error("Assistant Error:", e);
            return "Error."; 
        }
    });
}
