
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Message, INSURANCES } from '../types';
import { DEPARTMENTS, PROVINCES, DISTRICTS } from '../data/ubigeo';

interface LocationState {
    status: 'idle' | 'requesting' | 'searching' | 'success' | 'error';
    coordinates: { lat: number; lng: number } | null;
    district: string;
    error?: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string, audio?: { mimeType: string, data: string }) => void;
  onSelectIntent: (intent: 'triage' | 'pharmacy' | 'directory') => void;
  onSelectDepartment: (id: string) => void;
  onSelectProvince: (id: string) => void;
  onSelectDistrict: (id: string) => void;
  onSelectInsurance: (insurance: string) => void;
  onReset: () => void;
  onRequestLocation: () => void;
  onShowData: () => void;
  onNavigate: (tab: 'analysis' | 'results') => void; // New prop
  isTyping: boolean;
  
  locationState?: LocationState;
  isRequestingLocation?: boolean;

  currentStep: number;
  selectedDepartmentId: string;
  selectedProvinceId: string;
  flow: 'triage' | 'pharmacy' | 'directory' | null;
  isConsultationActive?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  onSelectIntent,
  onSelectDepartment,
  onSelectProvince,
  onSelectDistrict, 
  onSelectInsurance,
  onReset,
  onRequestLocation,
  onShowData,
  onNavigate,
  isTyping,
  locationState, 
  isRequestingLocation, 
  currentStep,
  selectedDepartmentId,
  selectedProvinceId,
  flow,
  isConsultationActive = false
}) => {
  const [input, setInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const endRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLocationBusy = locationState 
      ? (locationState.status === 'requesting' || locationState.status === 'searching')
      : isRequestingLocation;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isLocationBusy]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { activeDepartments, activeProvinces, activeDistricts } = useMemo(() => {
    return {
        activeDepartments: DEPARTMENTS,
        activeProvinces: PROVINCES,
        activeDistricts: DISTRICTS
    };
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            onSendMessage('', { mimeType: 'audio/webm', data: base64String });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono. Por favor verifica los permisos.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const isInputDisabled = currentStep === 1.1 || currentStep === 1.2 || currentStep === 2 || isLocationBusy || isConsultationActive;
  const displayProvinces = activeProvinces.filter(p => p.department_id === selectedDepartmentId);
  const displayDistricts = activeDistricts.filter(d => d.province_id === selectedProvinceId);

  const getPlaceholder = () => {
      if (isRecording) return "Escuchando... (Toca para detener)";
      if (isConsultationActive) return "Consulta con especialista en curso...";
      if (currentStep === 0) return "Describe tu síntoma, busca medicina o clínica...";
      if (currentStep === 1) {
          if (flow === 'pharmacy') return "Escribe el nombre del medicamento...";
          if (flow === 'directory') return "Nombre de la clínica o distrito...";
          return "Describe tus síntomas detalladamente...";
      }
      if (currentStep === 1.5) return "Escribe tu ubicación exacta...";
      return "Escribe un mensaje...";
  }

  return (
    <section className="col-span-12 lg:col-span-4 h-full bg-white lg:bg-white/90 backdrop-blur-xl lg:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-b lg:border border-white flex flex-col overflow-hidden z-20 relative transition-all duration-500 min-h-0">
      
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white lg:bg-white/50 relative z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_#10B981] ${isConsultationActive ? 'bg-slate-300 shadow-none' : 'bg-emerald-500'}`}></div>
            <span className={`text-sm font-bold tracking-tight ${isConsultationActive ? 'text-slate-400' : 'text-slate-700'}`}>Doctoi AI</span>
        </div>
        
        <div className="flex items-center gap-3">
            <button onClick={onReset} className="text-slate-400 hover:text-blue-600 transition" title="Reiniciar">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            </button>
            <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-400 hover:text-blue-600 transition p-1 rounded-md hover:bg-slate-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-fade-enter origin-top-right overflow-hidden z-50">
                        <button onClick={() => { setIsMenuOpen(false); onShowData(); }} className="w-full text-left px-4 py-3 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            📂 Mis Datos (RAG)
                        </button>
                        <div className="h-px bg-slate-100 mx-4 my-1"></div>
                        <button onClick={() => { setIsMenuOpen(false); setShowAbout(true); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">Acerca de</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} gap-1 animate-fade-enter`}>
            {msg.type === 'text' && (
              <div className={`${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : (msg.text.includes('⚠️') ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-700 rounded-tl-none')} py-3 px-4 rounded-2xl max-w-[90%] text-sm shadow-sm leading-relaxed whitespace-pre-line relative ${isConsultationActive ? 'opacity-50' : ''}`}>
                {msg.text}
              </div>
            )}

            {/* INTENT SELECTOR */}
            {msg.type === 'intent_selector' && !isConsultationActive && (
                <div className="w-full flex flex-col gap-2 mt-2">
                    <div className="text-xs text-slate-400 ml-1 mb-1">Selecciona una opción o escribe abajo:</div>
                    <div className="flex flex-wrap gap-2 w-full">
                        <button onClick={() => onSelectIntent('triage')} className="flex-1 min-w-[90px] bg-white border border-emerald-100 p-3 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-400 transition-all group text-left flex flex-col">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-lg mb-2 group-hover:bg-emerald-100 transition-colors">🩺</div>
                            <h4 className="font-bold text-slate-800 text-xs">Dolencia</h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">Triaje IA.</p>
                        </button>
                        <button onClick={() => onSelectIntent('pharmacy')} className="flex-1 min-w-[90px] bg-white border border-blue-100 p-3 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-400 transition-all group text-left flex flex-col">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-lg mb-2 group-hover:bg-blue-100 transition-colors">💊</div>
                            <h4 className="font-bold text-slate-800 text-xs">Farmacia</h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">Medicinas.</p>
                        </button>
                        <button onClick={() => onSelectIntent('directory')} className="flex-1 min-w-[90px] bg-white border border-indigo-100 p-3 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-400 transition-all group text-left flex flex-col">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-lg mb-2 group-hover:bg-indigo-100 transition-colors">🏥</div>
                            <h4 className="font-bold text-slate-800 text-xs">Directorio</h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">Clínicas.</p>
                        </button>
                    </div>
                </div>
            )}

            {/* SELECTORS (Dept/Prov/Dist/Insurance) - Omitted for brevity (same as previous) */}
            {msg.type === 'department_selector' && !isConsultationActive && (
              <div className="w-[90%] mt-2 flex flex-col gap-4">
                 <div className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 ${isLocationBusy ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-md'}`}>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isLocationBusy ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                            {isLocationBusy ? (
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className={`text-sm font-bold ${isLocationBusy ? 'text-blue-800' : 'text-slate-700'}`}>
                                {locationState?.status === 'requesting' ? 'Obteniendo GPS...' : 
                                 locationState?.status === 'searching' ? 'Analizando mapa...' : 
                                 'Ubicación Automática'}
                            </h4>
                            <p className="text-xs text-slate-500 leading-tight mt-0.5">
                                {isLocationBusy ? 'Estamos detectando tu zona...' : 'Detectar mi distrito automáticamente'}
                            </p>
                        </div>
                        <button onClick={onRequestLocation} disabled={isLocationBusy} className={`px-4 py-2 text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isLocationBusy ? 'bg-white text-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                            {isLocationBusy ? '...' : 'Activar'}
                        </button>
                    </div>
                    {isLocationBusy && <div className="absolute bottom-0 left-0 h-1 bg-blue-400/30 w-full animate-pulse"></div>}
                 </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                    <div className="h-[1px] bg-slate-200 flex-1"></div>
                    o selecciona manualmente
                    <div className="h-[1px] bg-slate-200 flex-1"></div>
                </div>
                <select onChange={(e) => onSelectDepartment(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm cursor-pointer appearance-none" defaultValue="">
                    <option value="" disabled>Selecciona un Departamento...</option>
                    {activeDepartments.map(d => <option key={d.id} value={d.id}>{d.name.trim()}</option>)}
                </select>
              </div>
            )}
            {msg.type === 'province_selector' && !isConsultationActive && (
              <div className="w-[90%] mt-2 flex flex-col gap-3">
                <select onChange={(e) => onSelectProvince(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm cursor-pointer appearance-none" defaultValue="">
                    <option value="" disabled>Selecciona una Provincia...</option>
                    {displayProvinces.map(p => <option key={p.id} value={p.id}>{p.name.trim()}</option>)}
                </select>
              </div>
            )}
            {msg.type === 'district_selector' && !isConsultationActive && (
              <div className="w-[90%] mt-2 flex flex-col gap-3">
                <select onChange={(e) => onSelectDistrict(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm cursor-pointer appearance-none" defaultValue="">
                    <option value="" disabled>Selecciona un Distrito...</option>
                    {displayDistricts.map(d => <option key={d.id} value={d.id}>📍 {d.name.trim()}</option>)}
                </select>
              </div>
            )}
            {msg.type === 'insurance_selector' && !isConsultationActive && (
                <div className="flex flex-wrap gap-2 mt-2 max-w-[95%]">
                    {INSURANCES.map(ins => (
                        <button key={ins} onClick={() => onSelectInsurance(ins)} className="px-4 py-2 rounded-full border text-xs font-bold transition shadow-sm border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50">{ins}</button>
                    ))}
                </div>
            )}

          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-1 ml-4 mb-2 mt-2">
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 pb-4 bg-white border-t border-slate-50 relative flex-shrink-0 z-20 transition-all">
        {/* Chips for quick select */}
        {currentStep === 1 && flow === 'triage' && !isConsultationActive && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
            <button onClick={() => setInput('Tengo fiebre alta y me duele la cabeza')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">🤒 Fiebre alta</button>
            <button onClick={() => setInput('Me duele mucho el estómago y tengo náuseas')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">🤢 Dolor estómago</button>
            </div>
        )}
        {currentStep === 1 && flow === 'pharmacy' && !isConsultationActive && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => setInput('Paracetamol 500mg')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">💊 Paracetamol</button>
                <button onClick={() => setInput('Amoxicilina')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">💊 Amoxicilina</button>
            </div>
        )}
        {currentStep === 1 && flow === 'directory' && !isConsultationActive && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => setInput('Clínica San Pablo')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">🏥 Clínica San Pablo</button>
                <button onClick={() => setInput('Hospital Rebagliati')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">🏥 Rebagliati</button>
            </div>
        )}

        <div className="relative group flex gap-2">
            {!isConsultationActive && (
                <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isInputDisabled}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    {isRecording ? <div className="w-4 h-4 bg-white rounded-sm"></div> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>}
                </button>
            )}

            <div className="relative flex-1">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={getPlaceholder()}
                    className={`w-full h-12 pl-5 pr-12 rounded-full border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-700 shadow-inner outline-none transition-all text-sm ${isInputDisabled ? 'cursor-not-allowed opacity-60' : 'focus:shadow-lg focus:shadow-blue-100/50 focus:border-blue-400 focus:ring-0'}`}
                    onKeyDown={handleKeyPress}
                    disabled={isInputDisabled || isRecording} 
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isInputDisabled || isRecording}
                    className="absolute right-1.5 top-1.5 bottom-1.5 w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                    <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
            </div>
        </div>
      </div>

      {/* Modals remain unchanged */}
      {showAbout && (
          <div className="absolute inset-0 z-[50] flex items-center justify-center p-6 bg-slate-900/20 backdrop-blur-sm animate-fade-enter">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-[90%] h-auto max-h-[90%] overflow-hidden relative flex flex-col">
                  <div className="p-6 overflow-y-auto no-scrollbar">
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Acerca de Doctoi</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        Doctoi es una demo de IA para triaje y ubicación de servicios de salud en Perú.
                        Utiliza la tecnología de Google Gemini para analizar síntomas y Google Maps para encontrar lugares.
                      </p>
                      <button onClick={() => setShowAbout(false)} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition">Entendido</button>
                  </div>
              </div>
          </div>
      )}
    </section>
  );
}
