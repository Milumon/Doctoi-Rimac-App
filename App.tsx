
import React, { useState, useRef, useEffect } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { HeroSection } from './components/HeroSection';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { DetailModal } from './components/DetailModal';
import { MobileNavBar } from './components/MobileNavBar';
import { MobileWelcome } from './components/MobileWelcome'; // Import new component
import { Message, TriageAnalysis, MedicalCenter } from './types';
import { medicalCenters } from './data/centers';
import { DEPARTMENTS, PROVINCES, DISTRICTS } from './data/ubigeo';
import { analyzeSymptoms, generateFollowUp, classifyUserIntent, consultMedicalDocuments } from './services/geminiService';

// Steps: 
// 0 = Intent Selection (Or free text input)
// 1 = Input (Symptoms OR Medication OR Search Query)
// 1.1 = Department Selection
// 1.2 = Province Selection
// 1.3 = District Selection
// 1.5 = Manual Location (Fallback)
// 2 = Insurance (Only for Triage)
// 3 = Results
type Step = 0 | 1 | 1.1 | 1.2 | 1.3 | 1.5 | 2 | 3;
type Flow = 'triage' | 'pharmacy' | 'directory' | null;
type MobileTab = 'chat' | 'analysis' | 'results';

export default function App() {
  const [step, setStep] = useState<Step>(0);
  const [flow, setFlow] = useState<Flow>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola. Soy Doctoi. ¿En qué puedo ayudarte hoy?', sender: 'ai', type: 'text' },
    { id: '2', text: '', sender: 'ai', type: 'intent_selector' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  
  // Session control to cancel pending async operations on reset
  const sessionRef = useRef(0);
  
  // Mobile PWA State
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [showMobileWelcome, setShowMobileWelcome] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [symptomsOrMed, setSymptomsOrMed] = useState(''); 
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [district, setDistrict] = useState('');
  const [insurance, setInsurance] = useState('');
  
  const [analysis, setAnalysis] = useState<TriageAnalysis | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<MedicalCenter | null>(null);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const addMessage = (text: string, sender: 'user' | 'ai', type: Message['type'] = 'text') => {
    const safeText = typeof text === 'string' ? text : JSON.stringify(text);
    setMessages(prev => [...prev, { id: (Date.now() + Math.random()).toString(), text: safeText, sender, type }]);
  };

  const handleSelectIntent = (selectedFlow: 'triage' | 'pharmacy' | 'directory') => {
      const currentSession = sessionRef.current;
      setFlow(selectedFlow);
      setMobileTab('chat'); // Ensure we are on chat tab
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
              addMessage("Entendido. ¿Cuál es el nombre del medicamento?", 'ai');
          } else if (selectedFlow === 'directory') {
              addMessage("¿Qué clínica, hospital o centro médico buscas?", 'ai');
          } else {
              addMessage("Entendido. Cuéntame qué sientes detalladamente.", 'ai');
          }
          setStep(1);
      }, 600);
  };

  const handleSendMessage = async (text: string) => {
    const currentSession = sessionRef.current;
    addMessage(text, 'user');
    setIsTyping(true);

    // STEP 0: INTELLIGENT CLASSIFICATION (User typed directly)
    if (step === 0) {
        const detectedIntent = await classifyUserIntent(text);
        if (sessionRef.current !== currentSession) return;

        setFlow(detectedIntent);
        setSymptomsOrMed(text); // Save what they typed
        setMobileTab('chat');
        
        setTimeout(() => {
            if (sessionRef.current !== currentSession) return;
            setIsTyping(false);
            let reply = "";
            if (detectedIntent === 'pharmacy') reply = `Entendido, buscaré farmacias para "${text}".`;
            else if (detectedIntent === 'directory') reply = `Buscando "${text}" en el directorio.`;
            else reply = "Entendido, analizaré tus síntomas.";

            addMessage(reply, 'ai');
            
            if (detectedIntent === 'directory') {
                 addMessage("Para mostrarte resultados cercanos, selecciona tu Departamento:", 'ai');
                 addMessage('', 'ai', 'department_selector');
                 setStep(1.1);
            } else {
                 addMessage("Para continuar, selecciona tu Departamento:", 'ai');
                 addMessage('', 'ai', 'department_selector');
                 setStep(1.1);
            }
        }, 1000);
        return;
    }

    // Step 1: User inputs symptoms/medicine/query manually AFTER clicking a card
    if (step === 1) {
        setSymptomsOrMed(text);
        setTimeout(() => {
            if (sessionRef.current !== currentSession) return;
            setIsTyping(false);
            addMessage("Perfecto. Para ubicar opciones, selecciona tu Departamento:", 'ai');
            addMessage('', 'ai', 'department_selector');
            setStep(1.1);
        }, 800);
    } 
    // Step 1.5: Manual Location Fallback
    else if (step === 1.5) {
        setDistrict(text);
        setTimeout(() => {
            if (sessionRef.current !== currentSession) return;
            setIsTyping(false);
            
            if (flow === 'pharmacy') {
                addMessage(`Buscaré farmacias en ${text}.`, 'ai');
                setStep(3);
                setMobileTab('results'); // Auto switch to results on mobile
            } else if (flow === 'directory') {
                addMessage(`Buscando en ${text}...`, 'ai');
                setStep(3);
                setMobileTab('results'); // Auto switch to results on mobile
            } else {
                // Go to insurance for Triage
                addMessage(`Perfecto, buscaré en ${text}. Por último, ¿qué seguro tienes?`, 'ai');
                addMessage('', 'ai', 'insurance_selector');
                setStep(2);
            }
        }, 600);
    }
    // Step 3: Follow up chat AND Intent Switching
    else if (step === 3) {
        // 0. SPECIAL CHECK: RAG / DOCUMENT QUERY
        const insuranceKeywords = /cobertura|seguro|cubre|deducible|pago|costo|plan|rimac|pacifico|mapfre/i;
        if (insuranceKeywords.test(text)) {
             try {
                 const docResponse = await consultMedicalDocuments(text);
                 if (sessionRef.current !== currentSession) return;
                 setIsTyping(false);
                 addMessage(docResponse, 'ai');
                 return; 
             } catch(e) {
                 console.error("RAG error", e);
             }
        }

        // 1. Check for intent change
        const detectedIntent = await classifyUserIntent(text);
        if (sessionRef.current !== currentSession) return;

        const isDifferentFlow = detectedIntent !== flow;
        
        if (isDifferentFlow) {
             setFlow(detectedIntent);
             setSymptomsOrMed(text); 
             setMobileTab('chat'); 
             setIsTyping(false);

             if (detectedIntent === 'triage') {
                 addMessage(`Entendido. Parece que ahora tienes un malestar (${text}). Para darte un diagnóstico, necesito saber tu seguro.`, 'ai');
                 addMessage('', 'ai', 'insurance_selector');
                 setStep(2); 
                 return;
             } 
             
             if (detectedIntent === 'pharmacy') {
                 addMessage(`Cambiando a Farmacia. Buscando "${text}" en ${district}.`, 'ai');
                 setStep(3);
                 setMobileTab('results');
                 return;
             }

             if (detectedIntent === 'directory') {
                 addMessage(`Cambiando a Directorio. Buscando "${text}" en ${district}.`, 'ai');
                 setStep(3);
                 setMobileTab('results');
                 return;
             }
        }

        // 2. Standard Follow-up
        try {
             const history = [
                 ...messages.map(m => ({
                    role: m.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                 })),
                 { role: 'user', parts: [{ text: text }] }
             ].filter(m => m.parts[0].text && !m.parts[0].text.includes('selecciona') && !m.parts[0].text.includes('Usar mi ubicación'));

             const response = await generateFollowUp(history);
             if (sessionRef.current !== currentSession) return;
             
             setIsTyping(false);
             addMessage(response, 'ai');
        } catch (e) {
            if (sessionRef.current !== currentSession) return;
            setIsTyping(false);
            addMessage("Lo siento, tuve un problema de conexión. Intenta de nuevo.", 'ai');
        }
    }
  };

  const handleRequestLocation = () => {
    const currentSession = sessionRef.current;

    if (!navigator.geolocation) {
      addMessage("Tu navegador no soporta geolocalización.", 'ai');
      return;
    }

    setIsRequestingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (sessionRef.current !== currentSession) return;

        const { latitude, longitude } = position.coords;
        let closestDist = '';
        let minDistance = Infinity;

        medicalCenters.forEach(center => {
           const d = Math.sqrt(Math.pow(center.latitude - latitude, 2) + Math.pow(center.longitude - longitude, 2));
           if (d < minDistance) {
               minDistance = d;
               closestDist = center.district;
           }
        });

        setIsRequestingLocation(false);

        if (closestDist) {
            setDistrict(closestDist);
            addMessage(`📍 Ubicación detectada: ${closestDist}`, 'user');
            
            setTimeout(() => {
                 if (sessionRef.current !== currentSession) return;

                 if (flow === 'pharmacy') {
                     addMessage(`Buscaré farmacias cercanas en ${closestDist}.`, 'ai');
                     setStep(3);
                     setMobileTab('results');
                 } else if (flow === 'directory') {
                     addMessage(`Mostrando resultados en ${closestDist}.`, 'ai');
                     setStep(3);
                     setMobileTab('results');
                 } else {
                     addMessage(`Detecté tu ubicación cerca de ${closestDist}. ¿Qué seguro de salud tienes?`, 'ai');
                     addMessage('', 'ai', 'insurance_selector');
                     setStep(2);
                 }
            }, 500);
        } else {
            addMessage("No pude determinar tu distrito exacto. Por favor escríbelo manualmente.", 'ai');
            setStep(1.5);
        }
      },
      (error) => {
        if (sessionRef.current !== currentSession) return;
        setIsRequestingLocation(false);
        let errorMessage = "No pude obtener tu ubicación. Por favor selecciona manualmente.";
        // error.code 1 is PERMISSION_DENIED
        if (error.code === 1) {
            errorMessage = "⚠️ Permiso de ubicación denegado. Selecciona tu ubicación manualmente.";
        } else if (error.code === 3) { // TIMEOUT
            errorMessage = "⌛ Se agotó el tiempo de espera. Intenta de nuevo o selecciona manualmente.";
        }
        addMessage(errorMessage, 'ai');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleSelectDepartment = (deptId: string) => {
      const currentSession = sessionRef.current;
      const deptName = DEPARTMENTS.find(d => d.id === deptId)?.name || '';
      setSelectedDepartmentId(deptId);
      addMessage(deptName, 'user');
      setIsTyping(true);

      setTimeout(() => {
          if (sessionRef.current !== currentSession) return;
          setIsTyping(false);
          addMessage(`¿En qué provincia de ${deptName} te encuentras?`, 'ai');
          addMessage('', 'ai', 'province_selector');
          setStep(1.2);
      }, 500);
  };

  const handleSelectProvince = (provId: string) => {
      const currentSession = sessionRef.current;
      const provName = PROVINCES.find(p => p.id === provId)?.name || '';
      setSelectedProvinceId(provId);
      addMessage(provName, 'user');
      setIsTyping(true);

      setTimeout(() => {
          if (sessionRef.current !== currentSession) return;
          setIsTyping(false);
          addMessage(`¿Y en qué distrito?`, 'ai');
          addMessage('', 'ai', 'district_selector');
          setStep(1.3);
      }, 500);
  };

  const handleSelectDistrict = (distId: string) => {
      const currentSession = sessionRef.current;
      const distName = DISTRICTS.find(d => d.id === distId)?.name || '';
      setDistrict(distName);
      addMessage(distName, 'user');
      setIsTyping(true);
      
      setTimeout(() => {
          if (sessionRef.current !== currentSession) return;
          setIsTyping(false);
          if (flow === 'pharmacy') {
              addMessage(`Buscando farmacias en ${distName}...`, 'ai');
              setStep(3);
              setMobileTab('results');
          } else if (flow === 'directory') {
              addMessage(`Buscando en ${distName}...`, 'ai');
              setStep(3);
              setMobileTab('results');
          } else {
              addMessage(`Buscando centros en ${distName}. Por último, ¿qué seguro tienes?`, 'ai');
              addMessage('', 'ai', 'insurance_selector');
              setStep(2);
          }
      }, 600);
  };

  const handleSelectInsurance = async (ins: string) => {
      const currentSession = sessionRef.current;
      setInsurance(ins);
      addMessage(ins, 'user');
      setIsTyping(true);

      try {
          const result = await analyzeSymptoms(symptomsOrMed);
          if (sessionRef.current !== currentSession) return;

          setAnalysis(result);
          
          setTimeout(() => {
            if (sessionRef.current !== currentSession) return;
            setIsTyping(false);
            addMessage("He analizado tus síntomas. Revisa la pestaña de Análisis y Resultados.", 'ai');
            setStep(3);
            setMobileTab('results'); 
          }, 1000);
      } catch (e) {
          if (sessionRef.current !== currentSession) return;
          setIsTyping(false);
          addMessage("Tuve un problema analizando los datos. Por favor intenta de nuevo.", 'ai');
      }
  };

  const handleReset = () => {
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
      setDistrict('');
      setInsurance('');
      setAnalysis(null);
      setIsRequestingLocation(false);
      setSelectedCenter(null);
      setMobileTab('chat');
      setIsTyping(false); 
      // Optional: Don't show welcome screen again on reset for better UX
  };

  const hasAnalysis = !!analysis;
  const hasResults = step === 3;

  return (
    <div className="h-full w-full overflow-hidden flex flex-col md:items-center md:justify-center md:p-8 relative">
       
       {/* Background Decoration */}
       <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-3xl"></div>
       </div>

       {/* Mobile Welcome Overlay */}
       <MobileWelcome 
            isVisible={showMobileWelcome} 
            onStart={() => setShowMobileWelcome(false)} 
            onInstall={handleInstallApp}
            canInstall={!!deferredPrompt}
       />

       {/* MAIN CONTAINER */}
       <main className="w-full h-full md:max-w-7xl md:h-[75vh] relative z-10">
          
          {/* DESKTOP LAYOUT */}
          <div className="hidden lg:grid grid-cols-12 gap-6 h-full">
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
                 isTyping={isTyping}
                 isRequestingLocation={isRequestingLocation}
                 currentStep={step}
                 selectedDepartmentId={selectedDepartmentId}
                 selectedProvinceId={selectedProvinceId}
                 flow={flow}
             />
             
             {step < 3 ? (
                 <HeroSection />
             ) : (
                 <>
                     {flow === 'triage' && analysis && <AnalysisPanel analysis={analysis} />}
                     <div className={`${(flow === 'pharmacy' || flow === 'directory') ? 'col-span-8' : 'col-span-4'} h-full overflow-hidden`}>
                         <ResultsPanel 
                             centers={medicalCenters} 
                             onSelectCenter={setSelectedCenter} 
                             userDistrict={district}
                             userInsurance={insurance}
                             flow={flow}
                             query={symptomsOrMed}
                         />
                     </div>
                 </>
             )}
          </div>

          {/* MOBILE LAYOUT */}
          <div className="lg:hidden h-full w-full relative">
              
              <div className={`absolute inset-x-0 top-0 bottom-28 transition-opacity duration-300 px-4 pt-4 ${mobileTab === 'chat' ? 'opacity-100 z-20' : 'opacity-0 -z-10 pointer-events-none'}`}>
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
                        isTyping={isTyping}
                        isRequestingLocation={isRequestingLocation}
                        currentStep={step}
                        selectedDepartmentId={selectedDepartmentId}
                        selectedProvinceId={selectedProvinceId}
                        flow={flow}
                    />
              </div>

              {hasAnalysis && (
                  <div className={`absolute inset-x-0 top-0 bottom-28 transition-opacity duration-300 px-4 pt-4 ${mobileTab === 'analysis' ? 'opacity-100 z-20' : 'opacity-0 -z-10 pointer-events-none'}`}>
                      {analysis && <AnalysisPanel analysis={analysis} />}
                  </div>
              )}

              {hasResults && (
                   <div className={`absolute inset-x-0 top-0 bottom-28 transition-opacity duration-300 px-4 pt-4 ${mobileTab === 'results' ? 'opacity-100 z-20' : 'opacity-0 -z-10 pointer-events-none'}`}>
                       <ResultsPanel 
                            centers={medicalCenters} 
                            onSelectCenter={setSelectedCenter} 
                            userDistrict={district}
                            userInsurance={insurance}
                            flow={flow}
                            query={symptomsOrMed}
                        />
                   </div>
              )}
              
              <MobileNavBar 
                activeTab={mobileTab} 
                setActiveTab={setMobileTab} 
                hasAnalysis={!!analysis && flow === 'triage'}
                hasResults={step === 3}
              />
          </div>

          <DetailModal 
              center={selectedCenter} 
              onClose={() => setSelectedCenter(null)} 
          />

       </main>
    </div>
  );
}
