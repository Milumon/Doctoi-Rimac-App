
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { HeroSection } from './components/HeroSection';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { DoctorChatPanel } from './components/DoctorChatPanel';
import { DataPanel } from './components/DataPanel';
import { DetailModal } from './components/DetailModal';
import { MobileNavBar } from './components/MobileNavBar';
import { MobileWelcome } from './components/MobileWelcome'; 
import { MobileToast, ToastType } from './components/MobileToast';
import { Message, TriageAnalysis, MedicineInfo, MedicalCenter, Doctor, RagDocument, UrgencyLevel } from './types';
import { doctors } from './data/doctors';
import { DEPARTMENTS, PROVINCES, DISTRICTS } from './data/ubigeo';
import { analyzeSymptoms, analyzeMedications, generateFollowUp, classifyMultimodalIntent, generateDoctorResponse, uploadFileToGemini, deleteFileFromGemini, getActiveFilesFromGemini, searchNearbyPlaces, identifyLocationFromCoords } from './services/geminiService';

// Steps: 
// 0 = Intent Selection (Or free text input)
// 1 = Input (Symptoms OR Medication OR Search Query)
// 3 = Results / Analysis (Location selection happens here now for Triage)
type Step = 0 | 1 | 1.1 | 1.2 | 1.3 | 1.5 | 2 | 3;
type Flow = 'triage' | 'pharmacy' | 'directory' | null;
type MobileTab = 'chat' | 'analysis' | 'results' | 'doctor' | 'data';

// FSM for Location
export type LocationStatus = 'idle' | 'requesting' | 'searching' | 'success' | 'error';
export interface LocationState {
  status: LocationStatus;
  coordinates: { lat: number; lng: number } | null;
  district: string;
  error?: string;
}

export default function App() {
  const [step, setStep] = useState<Step>(0);
  const [flow, setFlow] = useState<Flow>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola. Soy Doctoi. ¿En qué puedo ayudarte hoy?', sender: 'ai', type: 'text' },
    { id: '2', text: '', sender: 'ai', type: 'intent_selector' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  
  // NEW: Unified Location State
  const [locationState, setLocationState] = useState<LocationState>({
      status: 'idle',
      coordinates: null,
      district: ''
  });
  
  // DOCTOR CHAT STATE
  const [doctorMessages, setDoctorMessages] = useState<Message[]>([]);
  const [isDoctorTyping, setIsDoctorTyping] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<'results' | 'doctor' | 'data'>('results');
  
  // RAG / DATA STATE
  const [uploadedFiles, setUploadedFiles] = useState<RagDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // MAPS GROUNDING STATE
  const [dynamicCenters, setDynamicCenters] = useState<MedicalCenter[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // MOBILE STATE
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [unreadAnalysis, setUnreadAnalysis] = useState(false);
  const [unreadResults, setUnreadResults] = useState(false);
  const [showMobileWelcome, setShowMobileWelcome] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // TOAST STATE
  const [toastType, setToastType] = useState<ToastType>(null);
  const [showToast, setShowToast] = useState(false);

  // MODAL STATES
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false); 

  // Session control
  const sessionRef = useRef(0);

  const [symptomsOrMed, setSymptomsOrMed] = useState(''); 
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  
  const [insurance, setInsurance] = useState('Sin Seguro');
  
  const [analysis, setAnalysis] = useState<TriageAnalysis | null>(null);
  const [pharmacyAnalysis, setPharmacyAnalysis] = useState<MedicineInfo[] | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<MedicalCenter | null>(null);

  // Initial Data Load
  useEffect(() => {
    const syncFiles = async () => {
        const files = await getActiveFilesFromGemini();
        setUploadedFiles(files);
    };
    syncFiles();
  }, []);

  useEffect(() => {
      if (uploadedFiles.some(f => f.state === 'PROCESSING')) {
          const interval = setInterval(async () => {
              const files = await getActiveFilesFromGemini();
              setUploadedFiles(files);
          }, 4000); 
          return () => clearInterval(interval);
      }
  }, [uploadedFiles]);

  // Clear unread flags when switching tabs
  useEffect(() => {
      if (mobileTab === 'analysis') { setUnreadAnalysis(false); setShowToast(false); }
      if (mobileTab === 'results') { setUnreadResults(false); setShowToast(false); }
  }, [mobileTab]);

  const triggerToast = (type: ToastType) => {
      setToastType(type);
      setShowToast(true);
  };

  const handleToastNavigate = () => {
      if (toastType === 'triage' || toastType === 'medication') setMobileTab('analysis');
      if (toastType === 'places') setMobileTab('results');
  }

  // ===================== CORE LOGIC: TRIGGER MAPS SEARCH =====================
  useEffect(() => {
    const performDynamicSearch = async () => {
        const isDirectoryMode = flow === 'directory';
        
        if (locationState.status === 'requesting' || locationState.status === 'searching') return;

        const currentDistrict = locationState.district; 
        const currentCoords = locationState.coordinates || undefined;
        const hasLocation = !!currentDistrict || !!currentCoords;
        const hasQuery = !!symptomsOrMed || !!analysis || (flow === 'pharmacy' && !!pharmacyAnalysis);

        if (step === 3 && flow && hasQuery && (hasLocation || isDirectoryMode)) {
            
            let query = '';
            if (flow === 'pharmacy') {
                query = 'Farmacias y Boticas';
            }
            else if (flow === 'triage') query = analysis?.specialty ? `clínicas para ${analysis.specialty}` : 'centros de salud';
            else query = symptomsOrMed || 'clínicas'; 

            setIsLoadingResults(true);
            setIsTyping(true); // Show typing while searching maps
            setDynamicCenters([]); 

            const searchLocation = currentDistrict || (isDirectoryMode ? 'Lima, Peru' : '');
            const result = await searchNearbyPlaces(query, searchLocation, currentCoords, flow);
            
            if (sessionRef.current === currentSessionId) {
                setDynamicCenters(result.places);
                setIsLoadingResults(false);
                setIsTyping(false); // Stop typing when results arrive
                
                // Trigger notification if user is not on results tab
                if (result.places.length > 0 && mobileTab !== 'results') {
                    setUnreadResults(true);
                    triggerToast('places');
                }
            } else {
                setIsTyping(false);
            }
        }
    };
    
    const currentSessionId = sessionRef.current;
    performDynamicSearch();
  }, [step, locationState.district, locationState.coordinates, flow, symptomsOrMed, analysis, pharmacyAnalysis, locationState.status]); 

  // PWA Install
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const addMessage = (text: string, sender: 'user' | 'ai', type: Message['type'] = 'text') => {
    const safeText = typeof text === 'string' ? text : JSON.stringify(text);
    setMessages(prev => [...prev, { id: (Date.now() + Math.random()).toString(), text: safeText, sender, type }]);
  };

  const addDoctorMessage = (text: string, sender: 'user' | 'doctor') => {
    setDoctorMessages(prev => [...prev, { id: (Date.now() + Math.random()).toString(), text, sender }]);
  };

  const handleSelectIntent = (selectedFlow: 'triage' | 'pharmacy' | 'directory') => {
      const currentSession = sessionRef.current;
      
      setFlow(selectedFlow);
      setDynamicCenters([]);     
      setAnalysis(null);
      setPharmacyAnalysis(null);         
      setSymptomsOrMed('');      
      setStep(0);                
      setMobileTab('chat');
      setUnreadAnalysis(false);
      setUnreadResults(false);
      setShowToast(false);
      
      let intentText = '';
      if (selectedFlow === 'pharmacy') intentText = 'Busco medicamentos';
      else if (selectedFlow === 'directory') intentText = 'Busco una clínica específica';
      else intentText = 'Tengo un malestar';
      
      addMessage(intentText, 'user');
      setIsTyping(true);

      setTimeout(() => {
          if (sessionRef.current !== currentSession) return;
          setIsTyping(false);
          if (selectedFlow === 'pharmacy') {
              addMessage("Entendido. ¿Qué medicamento(s) buscas?", 'ai');
          } else if (selectedFlow === 'directory') {
              addMessage("¿Qué clínica, hospital o centro médico buscas?", 'ai');
          } else {
              addMessage("Entendido. Cuéntame qué sientes (puedes usar el micrófono).", 'ai');
          }
          setStep(1);
      }, 600);
  };

  const handleUploadFile = async (file: File) => {
      setIsUploading(true);
      try {
          const newDoc = await uploadFileToGemini(file);
          setUploadedFiles(prev => [...prev, newDoc]);
          if (mobileTab === 'chat' || rightPanelMode !== 'data') {
              addMessage(`📂 He recibido el archivo "${file.name}". Lo usaré para responder tus preguntas.`, 'ai');
          }
      } catch (error) {
          addMessage("⚠️ Error al subir el archivo. Inténtalo de nuevo.", 'ai');
      } finally {
          setIsUploading(false);
      }
  };

  const handleDeleteFile = async (fileId: string) => {
      try {
          await deleteFileFromGemini(fileId);
          setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      } catch (error) {
          console.error("Delete error", error);
      }
  };

  const handleShowData = () => {
      setRightPanelMode('data');
      setMobileTab('data');
  }

  // ===================== REFACTORED: ROBUST MULTIMODAL ROUTER =====================
  const handleSendMessage = async (text: string, audio?: { mimeType: string, data: string }) => {
    const currentSession = sessionRef.current;
    
    // 1. UI FEEDBACK
    if (audio) {
        setIsTyping(true);
    } else {
        addMessage(text, 'user');
        setIsTyping(true);
    }

    const input = audio ? audio : text;

    // 2. ALWAYS CLASSIFY INTENT (Even in Step 3)
    // This allows us to break out of context loops (e.g. Suicide -> Pharmacy)
    const result = await classifyMultimodalIntent(input);

    if (sessionRef.current !== currentSession) return;

    if (audio) addMessage(`🎤 "${result.transcription}"`, 'user');

    // 3. DETERMINE IF WE SWITCH FLOW OR CONTINUE CHAT
    // A flow switch happens if:
    // A. The identified intent is NOT chat (meaning it's a specific health/med command).
    // B. We are in step 0/1 (initial setup).
    // C. An EMERGENCY is detected.
    const isFlowChange = (result.intent !== 'chat') || step < 3 || result.isEmergency;
    
    // Special check: If user was in Emergency Triage, and asks for generic medicine, FORCE switch
    const forceSwitch = analysis?.urgency === UrgencyLevel.EMERGENCY && result.intent === 'pharmacy';

    if (isFlowChange || forceSwitch) {
        // === FLOW SWITCHING / RE-EXECUTION LOGIC ===
        const newFlow = result.intent as Flow;
        
        // Accumulate symptoms if we are continuing in Triage mode (e.g. "I have fever" -> "And bleeding")
        let effectiveQuery = result.query || result.transcription;
        if (newFlow === 'triage' && flow === 'triage' && !result.isEmergency && analysis) {
             effectiveQuery = `${symptomsOrMed}. ${effectiveQuery}`;
        }
        
        setFlow(newFlow);
        setSymptomsOrMed(effectiveQuery);
        
        // RESET STATE FOR NEW FLOW IF IT CHANGED
        if (newFlow !== flow) {
            setDynamicCenters([]);
            setMobileTab('chat');
            // Only clear the analysis relevant to the *other* flow
            if (newFlow !== 'triage') setAnalysis(null);
            if (newFlow !== 'pharmacy') setPharmacyAnalysis(null);
        }

        if (result.detectedLocation) {
             setLocationState({ status: 'success', district: result.detectedLocation, coordinates: null });
             addMessage(`📍 Ubicación detectada en mensaje: ${result.detectedLocation}`, 'ai');
        }

        const hasValidLocation = !!locationState.district || !!result.detectedLocation || !!locationState.coordinates;

        // EXECUTE FLOW LOGIC
        if (newFlow === 'triage') {
             try {
                 const triageResult = await analyzeSymptoms(effectiveQuery);
                 if (sessionRef.current !== currentSession) return;
                 setAnalysis(triageResult);
                 setIsTyping(false);
                 setUnreadAnalysis(true);
                 triggerToast('triage');
                 
                 const isEmergency = triageResult.urgency === UrgencyLevel.EMERGENCY;

                 // 🚨 EMERGENCY BYPASS
                 if (hasValidLocation || isEmergency) {
                     if (isEmergency) {
                        addMessage("🚨 EMERGENCIA DETECTADA. Mostrando protocolos de seguridad.", 'ai');
                        // Force view on mobile
                        setMobileTab('analysis'); 
                        // Force right panel on desktop
                        setRightPanelMode('results'); 
                     } else {
                        addMessage("He actualizado el análisis de síntomas. Buscando centros...", 'ai');
                     }
                     setStep(3); 
                 } else {
                     addMessage("He analizado tus síntomas. Por favor, selecciona tu Departamento para ubicarte:", 'ai');
                     addMessage('', 'ai', 'department_selector');
                     setStep(1.1);
                 }
                 return;
             } catch(e) {}
        } 
        else if (newFlow === 'pharmacy') {
             try {
                const meds = await analyzeMedications(effectiveQuery);
                if (sessionRef.current !== currentSession) return;
                setPharmacyAnalysis(meds);
                setIsTyping(false);
                setUnreadAnalysis(true);
                triggerToast('medication');

                if (hasValidLocation) {
                     addMessage("Información encontrada. Buscando farmacias cercanas...", 'ai');
                     setStep(3);
                } else {
                    addMessage("Información encontrada. Para buscar farmacias cercanas, selecciona tu Departamento:", 'ai');
                    addMessage('', 'ai', 'department_selector');
                    setStep(1.1);
                }
                return;
             } catch(e) {}
        }
        else if (newFlow === 'directory') {
             setIsTyping(false); 
             setSymptomsOrMed(result.query); 
             addMessage(`Buscando detalles de "${result.query}"...`, 'ai');
             setStep(3);
             return;
        }
        else {
            // Fallback to chat if intent classification failed slightly but we are in step 0
             setIsTyping(false);
             if (step === 0) {
                 addMessage("Hola. Puedo ayudarte con triaje, farmacias o directorio. ¿Qué necesitas?", 'ai');
             } else {
                 const response = await generateFollowUp([{role: 'user', parts: [{text: result.transcription}]}], uploadedFiles);
                 addMessage(response.text, 'ai');
             }
             return;
        }

    } else {
        // === CONTEXTUAL CHAT LOGIC (ONLY FOR 'CHAT' INTENT) ===
        
        const history = [
             ...messages.map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
             })),
             { role: 'user', parts: [{ text: text }] }
        ].filter(m => m.parts[0].text && !m.parts[0].text.includes('selecciona') && !m.parts[0].text.includes('Usar mi ubicación'));

        try {
             const response = await generateFollowUp(history, uploadedFiles);
             if (sessionRef.current !== currentSession) return;
             
             setIsTyping(false);
             addMessage(response.text, 'ai');

             if (response.action === 'SEARCH_MAPS') {
                 if (response.query) setSymptomsOrMed(response.query);
                 setStep(3); // Trigger map search effect
                 
                 if (!locationState.district && !locationState.coordinates) {
                     addMessage("Para mostrarte el mapa, necesito tu ubicación.", 'ai', 'department_selector');
                 }
             }
        } catch(e) { setIsTyping(false); }
    }
  };

  const handleDoctorSendMessage = async (text: string) => {
      if (!currentDoctor) return;
      const currentSession = sessionRef.current;
      addDoctorMessage(text, 'user');
      setIsDoctorTyping(true);
      try {
          const history = [
              ...doctorMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
              { role: 'user', parts: [{ text: text }] }
          ];
          const response = await generateDoctorResponse(history, currentDoctor, analysis);
          if (sessionRef.current !== currentSession) return;
          setIsDoctorTyping(false);
          addDoctorMessage(response, 'doctor');
      } catch (e) { setIsDoctorTyping(false); }
  };

  const handleRequestLocation = async () => {
    const currentSession = sessionRef.current;
    
    if (!navigator.geolocation) {
      addMessage("Tu navegador no soporta geolocalización.", 'ai');
      return;
    }

    try {
        setLocationState(prev => ({ ...prev, status: 'requesting', error: undefined }));
        
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
                timeout: 10000, 
                enableHighAccuracy: true 
            });
        });

        if (sessionRef.current !== currentSession) return;
        
        const { latitude, longitude } = position.coords;

        setLocationState(prev => ({ 
            ...prev, 
            status: 'searching', 
            coordinates: { lat: latitude, lng: longitude } 
        }));

        setStep(3);
        
        // NO REDIRECT
        
        const realLocationName = await identifyLocationFromCoords(latitude, longitude);
        
        if (sessionRef.current !== currentSession) return;

        setIsLoadingResults(true); 
        
        let query = '';
        if (flow === 'pharmacy') query = 'Farmacias y Boticas';
        else if (flow === 'triage') query = analysis?.specialty ? `clínicas para ${analysis.specialty}` : 'centros de salud';
        else query = symptomsOrMed || 'clínicas'; 

        const result = await searchNearbyPlaces(query, realLocationName, { lat: latitude, lng: longitude }, flow);

        if (sessionRef.current !== currentSession) return;

        setLocationState({
            status: 'success',
            coordinates: { lat: latitude, lng: longitude },
            district: realLocationName
        });
        
        setDynamicCenters(result.places);
        setIsLoadingResults(false);
        addMessage(`📍 Ubicación detectada: ${realLocationName}`, 'user');
        
    } catch (error: any) {
        if (sessionRef.current !== currentSession) return;
        console.error("GPS Error", error);
        
        setLocationState(prev => ({
            ...prev,
            status: 'error',
            error: error.code === 1 
                ? 'Permiso de ubicación denegado.'
                : 'No pudimos obtener tu ubicación.'
        }));
        
        addMessage("⚠️ No pude obtener tu ubicación GPS. Por favor selecciónala manualmente.", 'ai');
    }
  };

  const handleSelectDepartment = (deptId: string) => {
      const deptName = DEPARTMENTS.find(d => d.id === deptId)?.name || '';
      setSelectedDepartmentId(deptId);
      addMessage(deptName, 'user');
      setIsTyping(true);
      setTimeout(() => {
          setIsTyping(false);
          addMessage(`¿En qué provincia de ${deptName} te encuentras?`, 'ai');
          addMessage('', 'ai', 'province_selector');
          setStep(1.2);
      }, 500);
  };

  const handleSelectProvince = (provId: string) => {
      const provName = PROVINCES.find(p => p.id === provId)?.name || '';
      setSelectedProvinceId(provId);
      addMessage(provName, 'user');
      setIsTyping(true);
      setTimeout(() => {
          setIsTyping(false);
          addMessage(`¿Y en qué distrito?`, 'ai');
          addMessage('', 'ai', 'district_selector');
          setStep(1.3);
      }, 500);
  };

  const handleSelectDistrict = (distId: string) => {
      const dist = DISTRICTS.find(d => d.id === distId);
      const dept = DEPARTMENTS.find(d => d.id === selectedDepartmentId);
      const prov = PROVINCES.find(p => p.id === selectedProvinceId);
      const fullLocation = `${dist?.name}, ${prov?.name}, ${dept?.name}`;
      
      setLocationState({
          status: 'success',
          district: fullLocation,
          coordinates: null
      });

      addMessage(dist?.name || '', 'user');
      setIsTyping(true);
      
      setTimeout(() => {
          setIsTyping(false);
          addMessage(`Buscando en ${fullLocation}...`, 'ai');
          setStep(3);
          // NO REDIRECT
      }, 600);
  };

  const handleSelectInsurance = (ins: string) => { setInsurance(ins); };
  const handleContactDoctor = () => {
      if (!analysis) return;
      const bestMatch = doctors.find(d => d.especialidad_principal.toLowerCase().includes(analysis.specialty.toLowerCase())) || doctors[0];
      setCurrentDoctor(bestMatch);
      setMobileTab('doctor');
      setRightPanelMode('doctor');
      setIsDoctorTyping(true);
      setDoctorMessages([]);
      setTimeout(() => {
          setIsDoctorTyping(false);
          const doctorGreeting = `Hola, soy el Dr. ${bestMatch.apellido_paterno}. He revisado tu pre-diagnóstico de ${analysis.specialty}. Para brindarte una mejor orientación, ¿podrías decirme desde cuándo presentas estos síntomas?`;
          addDoctorMessage(doctorGreeting, 'doctor');
      }, 1500);
  }

  const handleReset = () => { if (currentDoctor) setShowEndSessionConfirm(true); else performReset(); };

  const performReset = () => {
      sessionRef.current += 1; 
      setStep(0);
      setFlow(null);
      setMessages([
          { id: `welcome-1-${Date.now()}`, text: 'Hola. Soy Doctoi. ¿En qué puedo ayudarte hoy?', sender: 'ai', type: 'text' },
          { id: `welcome-2-${Date.now()}`, text: '', sender: 'ai', type: 'intent_selector' }
      ]);
      setSymptomsOrMed('');
      setSelectedDepartmentId('');
      setSelectedProvinceId('');
      
      setLocationState({ status: 'idle', coordinates: null, district: '' });
      
      setInsurance('Sin Seguro');
      setAnalysis(null);
      setPharmacyAnalysis(null);
      setSelectedCenter(null);
      setMobileTab('chat');
      setUnreadAnalysis(false);
      setUnreadResults(false);
      setIsTyping(false);
      setCurrentDoctor(null);
      setDoctorMessages([]);
      setRightPanelMode('results');
      setShowEndSessionConfirm(false);
      setUploadedFiles([]); 
      getActiveFilesFromGemini().then(setUploadedFiles);
      setDynamicCenters([]);
      setToastType(null);
      setShowToast(false);
  };

  const hasAnalysis = !!analysis || !!pharmacyAnalysis;
  const hasResults = step === 3;
  const hasDoctor = !!currentDoctor;
  const hasData = uploadedFiles.length > 0 || rightPanelMode === 'data';

  const showAnalysisPanel = rightPanelMode !== 'data' && flow !== 'directory';

  return (
    <div className="h-full w-full overflow-hidden flex flex-col md:items-center md:justify-center md:p-8 relative">
       <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-slate-50">
          <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] md:w-[500px] md:h-[500px] bg-blue-200/40 md:bg-blue-100/50 rounded-full blur-[80px] md:blur-3xl animate-blob"></div>
          <div className="absolute bottom-[-50px] right-[-50px] md:bottom-[-80px] md:right-[-80px] opacity-10 md:opacity-20 transform rotate-[-15deg] scale-150">
             <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="bg-grad-main" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#F8FAFC"/> 
                        <stop offset="1" stopColor="#F0FDFA"/> 
                    </linearGradient>
                    <linearGradient id="bg-grad-stetho" x1="100" y1="100" x2="400" y2="400" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#2DD4BF"/> 
                        <stop offset="1" stopColor="#0EA5E9"/> 
                    </linearGradient>
                </defs>
                <rect width="512" height="512" rx="120" fill="url(#bg-grad-main)" fillOpacity="0.5"/>
                <path d="M256 80 V 120 C 256 150 320 120 320 180 V 260 C 320 310 280 340 256 340" stroke="url(#bg-grad-stetho)" strokeWidth="18" strokeLinecap="round" opacity="0.6"/>
                <circle cx="256" cy="340" r="32" fill="url(#bg-grad-stetho)" opacity="0.6"/>
            </svg>
          </div>
       </div>

       <MobileWelcome 
            isVisible={showMobileWelcome} 
            onStart={() => setShowMobileWelcome(false)} 
            onInstall={handleInstallApp}
            canInstall={!!deferredPrompt}
       />
       
       {/* NEW MOBILE TOAST */}
       <MobileToast 
            visible={showToast} 
            type={toastType} 
            onClose={() => setShowToast(false)} 
            onNavigate={handleToastNavigate}
       />

       <main className="w-full h-full md:max-w-7xl md:h-[75vh] relative z-10">
          <div className="hidden lg:grid grid-cols-12 gap-6 h-full min-h-0">
             <ChatPanel 
                 messages={messages} 
                 onSendMessage={handleSendMessage}
                 onSelectIntent={handleSelectIntent}
                 onSelectDepartment={handleSelectDepartment}
                 onSelectProvince={handleSelectProvince}
                 onSelectDistrict={handleSelectDistrict}
                 onSelectInsurance={handleSelectInsurance}
                 onReset={handleReset}
                 onRequestLocation={handleRequestLocation}
                 onShowData={handleShowData}
                 onNavigate={setMobileTab}
                 isTyping={isTyping}
                 
                 locationState={locationState}
                 
                 currentStep={step}
                 selectedDepartmentId={selectedDepartmentId}
                 selectedProvinceId={selectedProvinceId}
                 flow={flow}
                 isConsultationActive={!!currentDoctor}
             />
             
             {step < 3 && rightPanelMode !== 'data' ? (
                 <HeroSection />
             ) : (
                 <>
                     {showAnalysisPanel && (
                        <AnalysisPanel 
                            analysis={analysis} 
                            pharmacyData={pharmacyAnalysis}
                            flow={flow}
                            onContactDoctor={handleContactDoctor} 
                            userInsurance={insurance} 
                        />
                     )}
                     
                     <div className={`${!showAnalysisPanel ? 'col-span-8' : 'col-span-4'} h-full relative flex flex-col min-h-0`}>
                         {rightPanelMode === 'results' && (
                             <ResultsPanel 
                                onSelectCenter={setSelectedCenter} 
                                userDistrict={locationState.district}
                                userInsurance={insurance}
                                flow={flow}
                                query={symptomsOrMed}
                                onRequestLocation={handleRequestLocation}
                                
                                locationState={locationState}
                                
                                onSetLocation={(dist) => setLocationState(prev => ({ ...prev, district: dist, status: 'success' }))}
                                onSetInsurance={setInsurance}
                                dynamicResults={dynamicCenters}
                                isLoading={isLoadingResults}
                                triageUrgency={analysis?.urgency} 
                            />
                         )}
                         {rightPanelMode === 'doctor' && currentDoctor && (
                             <DoctorChatPanel 
                                doctor={currentDoctor}
                                messages={doctorMessages}
                                onSendMessage={handleDoctorSendMessage}
                                onClose={() => setRightPanelMode('results')}
                                isTyping={isDoctorTyping}
                             />
                         )}
                         {rightPanelMode === 'data' && (
                             <DataPanel 
                                files={uploadedFiles}
                                onUpload={handleUploadFile}
                                onDelete={handleDeleteFile}
                                isUploading={isUploading}
                             />
                         )}
                     </div>
                 </>
             )}
          </div>

          <div className="lg:hidden h-full w-full flex flex-col min-h-0">
              <div className="flex-1 relative overflow-hidden w-full">
                  <div className={`absolute inset-0 transition-opacity duration-300 bg-slate-50/50 ${mobileTab === 'chat' ? 'opacity-100 z-20' : 'opacity-0 -z-10 pointer-events-none'}`}>
                       <ChatPanel 
                            messages={messages} 
                            onSendMessage={handleSendMessage}
                            onSelectIntent={handleSelectIntent}
                            onSelectDepartment={handleSelectDepartment}
                            onSelectProvince={handleSelectProvince}
                            onSelectDistrict={handleSelectDistrict}
                            onSelectInsurance={handleSelectInsurance}
                            onReset={handleReset}
                            onRequestLocation={handleRequestLocation}
                            onShowData={handleShowData}
                            onNavigate={setMobileTab}
                            isTyping={isTyping}
                            
                            locationState={locationState}
                            
                            currentStep={step}
                            selectedDepartmentId={selectedDepartmentId}
                            selectedProvinceId={selectedProvinceId}
                            flow={flow}
                            isConsultationActive={!!currentDoctor}
                        />
                  </div>
                  
                  {hasAnalysis && (
                      <div className={`absolute inset-0 transition-opacity duration-300 px-4 pt-4 ${mobileTab === 'analysis' ? 'opacity-100 z-20' : 'opacity-0 -z-10 pointer-events-none'}`}>
                          <AnalysisPanel 
                                analysis={analysis} 
                                pharmacyData={pharmacyAnalysis}
                                flow={flow}
                                onContactDoctor={handleContactDoctor} 
                                userInsurance={insurance} 
                            />
                      </div>
                  )}

                  {hasResults && (
                       <div className={`absolute inset-0 transition-opacity duration-300 px-4 pt-4 ${mobileTab === 'results' ? 'opacity-100 z-20' : 'opacity-0 -z-10 pointer-events-none'}`}>
                           <ResultsPanel 
                                onSelectCenter={setSelectedCenter} 
                                userDistrict={locationState.district}
                                userInsurance={insurance}
                                flow={flow}
                                query={symptomsOrMed}
                                onRequestLocation={handleRequestLocation}
                                
                                locationState={locationState}
                                
                                onSetLocation={(dist) => setLocationState(prev => ({ ...prev, district: dist, status: 'success' }))}
                                onSetInsurance={setInsurance}
                                dynamicResults={dynamicCenters}
                                isLoading={isLoadingResults}
                                triageUrgency={analysis?.urgency}
                            />
                       </div>
                  )}

                  {hasDoctor && currentDoctor && (
                        <div className={`absolute inset-0 transition-opacity duration-300 px-4 pt-4 ${mobileTab === 'doctor' ? 'opacity-100 z-20' : 'opacity-0 -z-10 pointer-events-none'}`}>
                            <DoctorChatPanel 
                                doctor={currentDoctor}
                                messages={doctorMessages}
                                onSendMessage={handleDoctorSendMessage}
                                onClose={() => setMobileTab('results')}
                                isTyping={isDoctorTyping}
                            />
                        </div>
                  )}

                  <div className={`absolute inset-0 transition-opacity duration-300 px-4 pt-4 ${mobileTab === 'data' ? 'opacity-100 z-20' : 'opacity-0 -z-10 pointer-events-none'}`}>
                        <DataPanel 
                            files={uploadedFiles}
                            onUpload={handleUploadFile}
                            onDelete={handleDeleteFile}
                            isUploading={isUploading}
                        />
                  </div>
              </div>

              <MobileNavBar 
                activeTab={mobileTab} 
                setActiveTab={setMobileTab} 
                hasAnalysis={!!analysis || !!pharmacyAnalysis}
                hasResults={step === 3}
                hasDoctor={hasDoctor}
                hasData={uploadedFiles.length > 0 || mobileTab === 'data'}
                unreadAnalysis={unreadAnalysis}
                unreadResults={unreadResults}
              />
          </div>

          <DetailModal 
              center={selectedCenter} 
              onClose={() => setSelectedCenter(null)} 
          />
          
          {showEndSessionConfirm && (
             <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-enter">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100">
                    <div className="flex flex-col items-center text-center">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">¿Finalizar Consulta?</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">Se cerrará el chat actual.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowEndSessionConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Cancelar</button>
                            <button onClick={performReset} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-200">Finalizar</button>
                        </div>
                    </div>
                </div>
             </div>
          )}

       </main>
    </div>
  );
}
