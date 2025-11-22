/*
 * ⚠️ DEPRECATED ⚠️
 * Este archivo contiene la lógica "Legacy" que se ejecutaba en el cliente.
 * Ha sido reemplazado por `apiService.ts` que consume tu Backend REST.
 * 
 * Úsalo solo como referencia para copiar la lógica (Prompts, Tools, Contexto)
 * hacia tu backend en Node.js, Python (FastAPI/Flask) o AWS Lambda.
 */

/*
import { GoogleGenAI, Type } from "@google/genai";
import { TriageAnalysis, UrgencyLevel, TriageAnalysisWithCenters } from '../types';
import { INSURANCE_POLICIES, CLINICAL_GUIDELINES } from '../data/knowledgeBase';

// --- LOGICA QUE DEBES MOVER AL BACKEND ---

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const sanitizeInput = (text: string): string => {
    return text.replace(/\b\d{8}\b/g, "[DNI_REDACTED]").replace(/\b9\d{8}\b/g, "[CELULAR_REDACTED]");
};

export const analyzeSymptomsWithRAG = async (
  symptoms: string,
  userContext: { district: string; insurance: string }
): Promise<TriageAnalysisWithCenters> => {
  // ... Copia la lógica de generateContent y systemInstruction a tu endpoint /triage
  return {} as any;
};

export const generateFollowUp = async (history: {role: string, parts: {text: string}[]}[]): Promise<string> => {
    // ... Copia a tu endpoint /chat
    return "";
}

export const consultMedicalDocuments = async (query: string): Promise<string> => {
    // ... Copia a tu endpoint /documents
    return "";
}

export const classifyUserIntent = async (text: string): Promise<'triage' | 'pharmacy' | 'directory'> => {
    // ... Copia a tu endpoint /classify
    return 'triage';
}
*/
export {}; // Module stub
