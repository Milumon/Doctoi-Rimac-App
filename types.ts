
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  type?: 'text' | 'department_selector' | 'province_selector' | 'district_selector' | 'insurance_selector' | 'intent_selector';
}

export enum UrgencyLevel {
  LOW = 'Baja',
  MODERATE = 'Moderada',
  HIGH = 'Alta',
  EMERGENCY = 'Emergencia'
}

export interface TriageAnalysis {
  specialty: string;
  specialtyDescription: string;
  urgency: UrgencyLevel;
  urgencyExplanation: string;
  detectedSymptoms: string[];
  advice: string[];
  confidence: number; // 0-100
}

export interface MedicalCenter {
  id: string;
  name: string;
  type: 'Clínica' | 'Hospital' | 'Centro Médico' | 'Posta' | 'Farmacia';
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  insurances: string[];
  specialties: string[]; // For pharmacies, this can list product categories
  isOpen: boolean;
  closingTime?: string;
  phone: string;
  rating: number;
  description?: string;
  operatingHours?: string;
  requirements?: string[];
  website?: string;
}

// --- RAG TYPES (New) ---

export interface RecommendedCenter {
  name: string;
  type: string;
  address?: string;
  district?: string;
  phone?: string;
  acceptsInsurance: boolean;
  hasSpecialty: boolean;
  operatingHours?: string;
  reason: string;
}

export interface InsuranceCoverage {
  covers: boolean | null;
  details: string;
  copayEstimate?: string;
  requirements: string[];
}

export interface TriageAnalysisWithCenters extends TriageAnalysis {
  recommendedCenters: RecommendedCenter[];
  insuranceCoverage: InsuranceCoverage;
  emergencyAction?: {
    isEmergency: boolean;
    callNumber: string;
    instruction: string;
  };
  sourcesUsed: string[];
}

export const INSURANCES = [
  "Rímac EPS",
  "Pacífico",
  "Mapfre",
  "EsSalud",
  "SIS",
  "Particular",
  "Sin Seguro"
];
