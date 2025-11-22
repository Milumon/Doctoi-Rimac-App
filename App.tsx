
import React, { useState, useRef, useEffect } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { HeroSection } from './components/HeroSection';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { DetailModal } from './components/DetailModal';
import { MobileNavBar } from './components/MobileNavBar';
import { MobileWelcome } from './components/MobileWelcome';
import { Message, TriageAnalysisWithCenters, MedicalCenter } from './types';
import { medicalCenters } from './data/centers';
import { DEPARTMENTS, PROVINCES, DISTRICTS } from './data/ubigeo';
import { analyzeSymptomsWithRAG, generateFollowUp, classifyUserIntent, consultMedicalDocuments } from './services/geminiService';

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
  
  const [analysis, setAnalysis] = useState<TriageAnalysisWithCenters | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<MedicalCenter | null>(null);

  // PWA Install Prompt Listener
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
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  const addMessage = (text: string, sender: 'user' | 'ai', type: Message['type'] = 'text') => {
    const safeText = typeof text === 'string' ? text : JSON.stringify(text);
    setMessages(prev => [...prev, { id: (Date.now() + Math.random()).toString(), text: safeText, sender, type }]);
  };

  const handleSelectIntent = (selectedFlow: 'triage' | 'pharmacy' | 'directory') => {
      const currentSession = sessionRef.current;
      setFlow(selectedFlow);
      setMobileTab('chat'); 
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

    // STEP 0: INTELLIGENT CLASSIFICATION
    if (step === 0) {
        const detectedIntent = await classifyUserIntent(text);
        if (sessionRef.current !== currentSession) return;

        setFlow(detectedIntent);
        setSymptomsOrMed(text); 
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

    // Step 1: User inputs symptoms/medicine/query manually
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
                setMobileTab('results'); 
            } else if (flow === 'directory') {
                addMessage(`Buscando en ${text}...`, 'ai');
                setStep(3);
                setMobileTab('results'); 
            } else {
                addMessage(`Perfecto, buscaré en ${text}. Por último, ¿qué seguro tienes?`, 'ai');
                addMessage('', 'ai', 'insurance_selector');
                setStep(2);
            }
        }, 600);
    }
    // Step 3: Follow up chat AND Intent Switching
    else if (step === 3) {
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
        if (error.code === 1) {
            errorMessage = "⚠️ Permiso de ubicación denegado. Selecciona tu ubicación manualmente.";
        } else if (error.code === 3) {
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
          // 🔥 USE NEW RAG SERVICE
          const result = await analyzeSymptomsWithRAG(symptomsOrMed, {
            district: district,
            insurance: ins
          });

          if (sessionRef.current !== currentSession) return;

          setAnalysis(result);
          
          setTimeout(() => {
            if (sessionRef.current !== currentSession) return;
            setIsTyping(false);
            
            const hasRAGResults = result.recommendedCenters && result.recommendedCenters.length > 0;
            if (hasRAGResults) {
                addMessage(`He analizado tus síntomas con base en las Guías MINSA. Encontré ${result.recommendedCenters.length} opciones verificadas que aceptan ${ins}. Revisa la pestaña de Resultados.`, 'ai');
            } else {
                addMessage("He analizado tus síntomas. No encontré centros específicos en mis documentos oficiales para esa zona, pero te muestro opciones generales del directorio.", 'ai');
            }

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
  };

  const hasAnalysis = !!analysis;
  const hasResults = step === 3;

  return (
    <div className="h-full w-full overflow-hidden flex flex-col md:items-center md:justify-center md:p-8 relative">
       
       {/* GLOBAL BACKGROUND */}
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

       <main className="w-full h-full md:max-w-7xl md:h-[75vh] relative z-10 flex flex-col md:block">
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
                             analysis={analysis}
                         />
                     </div>
                 </>
             )}
          </div>

          {/* MOBILE LAYOUT */}
          <div className="lg:hidden flex-1 w-full flex flex-col relative overflow-hidden">
              <div className="flex-1 relative w-full">
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
                            isTyping={isTyping}
                            isRequestingLocation={isRequestingLocation}
                            currentStep={step}
                            selectedDepartmentId={selectedDepartmentId}
                            selectedProvinceId={selectedProvinceId}
                            flow={flow}
                        />
                  </div>

                  {hasAnalysis && (
                      <div className={`absolute inset-0 transition-opacity duration-300 px-4 pt-4 ${mobileTab === 'analysis' ? 'opacity-100 z-20' : 'opacity-0 -z-10 pointer-events-none'}`}>
                          {analysis && <AnalysisPanel analysis={analysis} />}
                      </div>
                  )}

                  {hasResults && (
                       <div className={`absolute inset-0 transition-opacity duration-300 px-4 pt-4 ${mobileTab === 'results' ? 'opacity-100 z-20' : 'opacity-0 -z-10 pointer-events-none'}`}>
                           <ResultsPanel 
                                centers={medicalCenters} 
                                onSelectCenter={setSelectedCenter} 
                                userDistrict={district}
                                userInsurance={insurance}
                                flow={flow}
                                query={symptomsOrMed}
                                analysis={analysis}
                            />
                       </div>
                  )}
              </div>
          </div>
          
           {/* MOBILE NAVBAR */}
           <div className="lg:hidden relative z-50">
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

       {/* DISCLAIMER BANNER - ADDRESSING ETHICAL FEEDBACK */}
       <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md text-slate-300 px-4 py-2 z-[70] flex items-center justify-center gap-2 border-t border-slate-700 lg:rounded-t-2xl lg:mx-auto lg:max-w-2xl lg:bottom-4 lg:shadow-2xl">
           <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
           <p className="text-[10px] md:text-xs font-medium text-center leading-tight">
               <span className="font-bold text-white">PROTOTIPO:</span> Esta IA puede cometer errores. No reemplaza consejo médico profesional. En emergencias llama al <span className="text-white font-bold underline">116</span> (Bomberos) o <span className="text-white font-bold underline">106</span> (SAMU).
           </p>
       </div>
    </div>
  );
}
