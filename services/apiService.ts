import { TriageAnalysisWithCenters, UrgencyLevel, TriageAnalysis } from '../types';

// Configura esta URL en tus variables de entorno o cámbiala aquí directamente
// Ej: https://api.doctoi.com/v1
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * Helper para manejar errores de red de forma uniforme
 */
const handleApiError = (error: any, fallbackMessage: string) => {
    console.error(`API Error (${fallbackMessage}):`, error);
    // Podrías reportar a Sentry/Datadog aquí
};

export const classifyUserIntent = async (text: string): Promise<'triage' | 'pharmacy' | 'directory'> => {
    try {
        const response = await fetch(`${API_BASE_URL}/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        return data.intent || 'triage';
    } catch (e) {
        handleApiError(e, 'classifyUserIntent');
        // Fallback seguro si la API falla
        return 'triage';
    }
};

export const analyzeSymptomsWithRAG = async (
  symptoms: string,
  userContext: { district: string; insurance: string }
): Promise<TriageAnalysisWithCenters> => {
  try {
    const response = await fetch(`${API_BASE_URL}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms, userContext })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data: TriageAnalysisWithCenters = await response.json();
    return data;

  } catch (error) {
    handleApiError(error, 'analyzeSymptomsWithRAG');
    
    // Retornamos una estructura válida para que la UI no se rompa
    return {
      specialty: "Error de Conexión",
      specialtyDescription: "No pudimos conectar con el servidor de IA.",
      urgency: UrgencyLevel.MODERATE,
      urgencyExplanation: "Por favor verifica tu conexión a internet o intenta más tarde.",
      detectedSymptoms: [symptoms],
      recommendedCenters: [], 
      insuranceCoverage: {
        covers: null,
        details: "Información no disponible.",
        requirements: []
      },
      advice: ["Intenta recargar la página", "Consulta a un médico presencialmente"],
      confidence: 0,
      sourcesUsed: []
    };
  }
};

export const generateFollowUp = async (history: {role: string, parts: {text: string}[]}[]): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        return data.text || "Lo siento, hubo un problema procesando tu respuesta.";
    } catch (e) {
        handleApiError(e, 'generateFollowUp');
        return "Lo siento, no puedo conectar con el servicio en este momento. Por favor intenta luego.";
    }
}

export const consultMedicalDocuments = async (query: string): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE_URL}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        return data.text || "No se encontró información.";
    } catch (e) {
        handleApiError(e, 'consultMedicalDocuments');
        return "Lo siento, el servicio de consulta documental no está disponible temporalmente.";
    }
}