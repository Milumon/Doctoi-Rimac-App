

export const TRANSLATIONS = {
  es: {
    common: {
      loading: "Cargando...",
      error: "Error",
      online: "En Línea",
      beta: "Beta IA",
      location: "Lima",
      understood: "Entendido",
      cancel: "Cancelar",
      exit: "Salir",
      save: "Guardar",
      delete: "Eliminar"
    },
    welcome: {
      title: 'Doctoi',
      subtitle: 'Orientación & Búsqueda',
      heroTitle: 'Tu brújula de salud',
      heroSubtitle: 'en la ciudad de Lima.',
      description: 'Utiliza nuestra IA para pre-analizar tus síntomas y encontrar rápidamente farmacias, clínicas y especialistas reales cerca de ti.',
      disclaimer: 'Herramienta informativa. No reemplaza la consulta médica profesional.',
      startButton: 'Comenzar',
      installButton: 'Instalar App',
      poweredBy: 'Powered by Gemini • Google Maps'
    },
    chat: {
      placeholderDefault: 'Describe tu síntoma, busca medicina o clínica...',
      placeholderTriage: 'Describe tus síntomas detalladamente...',
      placeholderPharmacy: 'Escribe el nombre del medicamento...',
      placeholderDirectory: 'Nombre de la clínica o distrito...',
      placeholderLocation: 'Escribe tu ubicación exacta...',
      recording: 'Escuchando... (Toca para detener)',
      consultationActive: 'Consulta con especialista en curso...',
      welcomeMessage: 'Hola. Soy Doctoi. ¿En qué puedo ayudarte hoy?',
      intentPrompt: 'Selecciona una opción o escribe abajo:',
      reset: 'Reiniciar',
      menu: {
        myFiles: '📂 Mis Datos (RAG)',
        about: 'Acerca de'
      },
      chips: {
        fever: '🤒 Fiebre alta',
        stomach: '🤢 Dolor estómago',
        paracetamol: '💊 Paracetamol',
        amoxicillin: '💊 Amoxicilina',
        clinic1: '🏥 Clínica San Pablo',
        hospital1: '🏥 Rebagliati'
      }
    },
    intents: {
      triage: { title: 'Dolencia', desc: 'Triaje IA.' },
      pharmacy: { title: 'Farmacia', desc: 'Medicinas.' },
      directory: { title: 'Directorio', desc: 'Clínicas.' }
    },
    location: {
      gettingGPS: 'Obteniendo GPS...',
      analyzingMap: 'Analizando mapa...',
      autoLocation: 'Ubicación Automática',
      detectingZone: 'Estamos detectando tu zona...',
      detectAuto: 'Detectar mi distrito automáticamente',
      activate: 'Activar',
      manualSelect: 'o selecciona manualmente',
      selectDistrict: 'Selecciona tu Distrito (Lima)...',
      gpsError: '⚠️ No pude obtener tu ubicación GPS. Por favor selecciónala manualmente.',
      browserError: 'Tu navegador no soporta geolocalización.',
      detected: '📍 Ubicación detectada:'
    },
    analysis: {
      title: 'Análisis Clínico',
      aiGenerated: 'Generado por IA',
      urgencyLevel: 'Nivel de Urgencia',
      detectedSymptoms: 'Síntomas Detectados',
      recommendations: 'Recomendaciones',
      secondOpinion: 'Segunda Opinión',
      aiAssistant: 'Asistente IA / Exámenes',
      waiting: 'El análisis aparecerá aquí'
    },
    pharmacy: {
      title: 'Información del Medicamento',
      detectedCount: 'detectados',
      prescriptionRequired: 'Requiere Receta Médica',
      purpose: '🎯 Para qué sirve',
      dosage: 'Dosis Recomendada',
      takenWith: 'Toma / Comida',
      warnings: '⚠️ Advertencias',
      interactions: '🔄 Interacciones conocidas',
      alternatives: 'Alternativas Genéricas',
      disclaimer: 'Información referencial. Consulte siempre a su médico.'
    },
    results: {
      nearbyPharmacies: 'Farmacias y Boticas',
      nearbyClinicas: 'Clínicas Cercanas',
      emergencyNearby: 'Emergencias Cercanas',
      directory: 'Directorio Médico',
      searchLocation: 'Ubicación de Búsqueda',
      globalSearch: 'Búsqueda Global',
      filterPharmacies: 'Solo Farmacias',
      filterEmergency: '🚨 Emergencia 24h',
      searchingAround: 'Buscando alrededor de:',
      searchingMaps: 'Buscando en Google Maps...',
      noResults: 'Sin resultados en Maps',
      tryAgain: 'Intenta otra ubicación o término de búsqueda.',
      viewOnMap: 'Ver en Mapa',
      call: 'Llamar',
      callNow: 'Llamar Ahora',
      open: 'Abierto',
      closed: 'Cerrado',
      requirements: 'Requisitos para atención',
      specialties: 'Especialidades Principales',
      insurances: 'Seguros Aceptados',
      mainResult: 'Resultado Principal',
      alternatives: 'Alternativas Cercanas',
      manualMode: 'Selección Manual (Lima)',
      cancelManual: 'Cancelar',
      useGPS: 'Usar GPS (Preciso)',
      whereToSearch: '¿Dónde buscamos?',
      mapsDescription: 'Usaremos Google Maps para encontrar centros reales cerca de ti en Lima.'
    },
    emergency: {
      detected: "🚨 EMERGENCIA DETECTADA. Mostrando protocolos de seguridad.",
      call: '🚨 Llamar al 106 (SAMU) AHORA',
      suicideLine: '🆘 Línea de prevención suicida: 113 (Ministerio de Salud)'
    },
    assistant: {
      title: 'Doctoi Asistente',
      subtitle: 'Lectura de Exámenes & Orientación',
      disclaimerTitle: 'Aviso Importante',
      disclaimerText: 'Esta herramienta utiliza IA. No es un médico real. La información es solo educativa.',
      understood: 'Entendido, continuar',
      exitConfirmTitle: '¿Finalizar Asistencia?',
      exitConfirmText: 'Se cerrará la sesión actual del asistente.',
      inputPlaceholder: 'Escribe tu consulta...',
      uploadFile: 'Subir examen o foto',
      uploading: 'Subiendo a Gemini...',
      dragDrop: 'Haz clic o arrastra un archivo'
    },
    files: {
      myFiles: 'Archivos Personales',
      uploadResults: 'Sube tus resultados de laboratorio o recetas.',
      processing: 'Procesando',
      ready: 'Listo',
      error: 'Error'
    },
    about: {
      title: 'Doctoi',
      subtitle: 'Orientación de Salud',
      desc: 'Una iniciativa tecnológica para facilitar el acceso a información de salud en Lima. Conectamos síntomas con especialistas y farmacias usando Inteligencia Artificial.',
      disclaimerTitle: 'Descargo de Responsabilidad',
      disclaimerText: 'Los resultados son informativos y no constituyen diagnóstico médico. En caso de emergencia, llama al 106.'
    }
  },
  
  en: {
    common: {
      loading: "Loading...",
      error: "Error",
      online: "Online",
      beta: "AI Beta",
      location: "Lima",
      understood: "Understood",
      cancel: "Cancel",
      exit: "Exit",
      save: "Save",
      delete: "Delete"
    },
    welcome: {
      title: 'Doctoi',
      subtitle: 'Guidance & Search',
      heroTitle: 'Your health compass',
      heroSubtitle: 'in Lima city.',
      description: 'Use our AI to pre-analyze symptoms and quickly find real pharmacies, clinics, and specialists near you.',
      disclaimer: 'Informational tool. Does not replace professional medical consultation.',
      startButton: 'Get Started',
      installButton: 'Install App',
      poweredBy: 'Powered by Gemini • Google Maps'
    },
    chat: {
      placeholderDefault: 'Describe symptom, search medicine or clinic...',
      placeholderTriage: 'Describe your symptoms in detail...',
      placeholderPharmacy: 'Enter medication name...',
      placeholderDirectory: 'Clinic name or district...',
      placeholderLocation: 'Enter your exact location...',
      recording: 'Listening... (Tap to stop)',
      consultationActive: 'Consultation in progress...',
      welcomeMessage: 'Hi. I am Doctoi. How can I help you today?',
      intentPrompt: 'Select an option or type below:',
      reset: 'Reset',
      menu: {
        myFiles: '📂 My Data (RAG)',
        about: 'About'
      },
      chips: {
        fever: '🤒 High fever',
        stomach: '🤢 Stomach pain',
        paracetamol: '💊 Paracetamol',
        amoxicillin: '💊 Amoxicillin',
        clinic1: '🏥 San Pablo Clinic',
        hospital1: '🏥 Rebagliati'
      }
    },
    intents: {
      triage: { title: 'Ailment', desc: 'AI Triage.' },
      pharmacy: { title: 'Pharmacy', desc: 'Meds.' },
      directory: { title: 'Directory', desc: 'Clinics.' }
    },
    location: {
      gettingGPS: 'Getting GPS...',
      analyzingMap: 'Analyzing map...',
      autoLocation: 'Auto Location',
      detectingZone: 'Detecting your zone...',
      detectAuto: 'Detect my district automatically',
      activate: 'Activate',
      manualSelect: 'or select manually',
      selectDistrict: 'Select your District (Lima)...',
      gpsError: '⚠️ Could not get GPS location. Please select manually.',
      browserError: 'Your browser does not support geolocation.',
      detected: '📍 Location detected:'
    },
    analysis: {
      title: 'Clinical Analysis',
      aiGenerated: 'AI Generated',
      urgencyLevel: 'Urgency Level',
      detectedSymptoms: 'Detected Symptoms',
      recommendations: 'Recommendations',
      secondOpinion: 'Second Opinion',
      aiAssistant: 'AI Assistant / Lab Tests',
      waiting: 'Analysis will appear here'
    },
    pharmacy: {
      title: 'Medication Information',
      detectedCount: 'detected',
      prescriptionRequired: 'Prescription Required',
      purpose: '🎯 What is it for',
      dosage: 'Recommended Dosage',
      takenWith: 'Taken / Food',
      warnings: '⚠️ Warnings',
      interactions: '🔄 Known Interactions',
      alternatives: 'Generic Alternatives',
      disclaimer: 'Reference information. Always consult your doctor.'
    },
    results: {
      nearbyPharmacies: 'Pharmacies & Drugstores',
      nearbyClinicas: 'Nearby Clinics',
      emergencyNearby: 'Nearby Emergencies',
      directory: 'Medical Directory',
      searchLocation: 'Search Location',
      globalSearch: 'Global Search',
      filterPharmacies: 'Pharmacies Only',
      filterEmergency: '🚨 Emergency 24h',
      searchingAround: 'Searching around:',
      searchingMaps: 'Searching on Google Maps...',
      noResults: 'No results on Maps',
      tryAgain: 'Try another location or search term.',
      viewOnMap: 'View on Map',
      call: 'Call',
      callNow: 'Call Now',
      open: 'Open',
      closed: 'Closed',
      requirements: 'Requirements',
      specialties: 'Main Specialties',
      insurances: 'Accepted Insurance',
      mainResult: 'Top Result',
      alternatives: 'Nearby Alternatives',
      manualMode: 'Manual Selection (Lima)',
      cancelManual: 'Cancel',
      useGPS: 'Use GPS (Precise)',
      whereToSearch: 'Where to search?',
      mapsDescription: 'We will use Google Maps to find real centers near you in Lima.'
    },
    emergency: {
      detected: "🚨 EMERGENCY DETECTED. Showing safety protocols.",
      call: '🚨 Call 106 (SAMU) NOW',
      suicideLine: '🆘 Suicide prevention line: 113 (Ministry of Health)'
    },
    assistant: {
      title: 'Doctoi Assistant',
      subtitle: 'Lab Tests & Guidance',
      disclaimerTitle: 'Important Notice',
      disclaimerText: 'This tool uses AI. It is not a real doctor. Information is educational only.',
      understood: 'Understood, continue',
      exitConfirmTitle: 'End Assistance?',
      exitConfirmText: 'The current assistant session will close.',
      inputPlaceholder: 'Type your question...',
      uploadFile: 'Upload test or photo',
      uploading: 'Uploading to Gemini...',
      dragDrop: 'Click or drag a file'
    },
    files: {
      myFiles: 'Personal Files',
      uploadResults: 'Upload your lab results or prescriptions.',
      processing: 'Processing',
      ready: 'Ready',
      error: 'Error'
    },
    about: {
      title: 'Doctoi',
      subtitle: 'Health Guidance',
      desc: 'A tech initiative to facilitate access to health information in Lima. Connecting symptoms with specialists and pharmacies using Artificial Intelligence.',
      disclaimerTitle: 'Disclaimer',
      disclaimerText: 'Results are informational and do not constitute a medical diagnosis. In case of emergency, call 106.'
    }
  }
} as const;

type Widen<T> = {
  [K in keyof T]: T[K] extends object ? Widen<T[K]> : string;
};

export type TranslationKeys = Widen<typeof TRANSLATIONS['es']>;
