
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'doctor';
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

export interface MedicineInfo {
  name: string;
  activeIngredient: string;
  dosage: string; // General dosage advice
  purpose: string; // What is it for
  warnings: string[];
  interactions: string[]; // Food or drug interactions
  alternatives: string[]; // Generic names
  requiresPrescription: boolean;
  takenWithFood: 'Antes' | 'Después' | 'Indiferente' | 'Con alimentos';
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
  googleMapsUri?: string;
  has24hER?: boolean; // New field for Emergency logic
}

export interface DoctorMencion {
  registro: string;
  tipo: string;
  codigo: string;
  fecha: string;
}

export interface Doctor {
  cmp: string;
  nombre_completo: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombres: string;
  estado: string;
  consejo_regional: string;
  email: string | null;
  foto_base64: string;
  detalle_url: string;
  menciones: DoctorMencion[];
  scraped_contexts: string[];
  tipos_registro: string[];
  especialidades_registro: string[];
  tipo_principal: string;
  especialidad_principal: string;
}

export interface RagDocument {
  id: string;          // Google File Name (files/abc-123)
  displayName: string; // Original filename
  uri: string;         // Google URI (https://generativelanguage.googleapis.com/...)
  mimeType: string;
  state: 'PROCESSING' | 'ACTIVE' | 'FAILED';
  sizeBytes: string;
}

// NEW: Interface for fixed URLs
export interface KnowledgeSource {
  id: string;
  name: string;
  category: 'Protocolos' | 'Farmacia' | 'Seguros' | 'Directorio';
  url: string;
  description: string;
  isActive: boolean;
  icon?: string;
}

export const INSURANCES = [
  "SIS",
  "EsSalud",
  "Particular",
  "Pacífico",
  "Rímac",
  "Mapfre",
  "La Positiva",
  "Sanitas",
  "Sin Seguro"
];
