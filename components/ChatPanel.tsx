
import React, { useState, useEffect, useRef } from 'react';
import { Message, INSURANCES } from '../types';
import { DEPARTMENTS, PROVINCES, DISTRICTS } from '../data/ubigeo';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onSelectIntent: (intent: 'triage' | 'pharmacy' | 'directory') => void;
  onSelectDepartment: (id: string) => void;
  onSelectProvince: (id: string) => void;
  onSelectDistrict: (id: string) => void;
  onSelectInsurance: (insurance: string) => void;
  onReset: () => void;
  onRequestLocation: () => void;
  isTyping: boolean;
  isRequestingLocation: boolean;
  currentStep: number;
  selectedDepartmentId: string;
  selectedProvinceId: string;
  flow: 'triage' | 'pharmacy' | 'directory' | null;
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
  isTyping,
  isRequestingLocation,
  currentStep,
  selectedDepartmentId,
  selectedProvinceId,
  flow
}) => {
  const [input, setInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isRequestingLocation]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  // Allow input at Step 0 (Intent Selection) for AI inference
  const isInputDisabled = currentStep === 1.1 || currentStep === 1.2 || currentStep === 2 || isRequestingLocation;
  
  // Filters
  const availableProvinces = PROVINCES.filter(p => p.department_id === selectedDepartmentId);
  const availableDistricts = DISTRICTS.filter(d => d.province_id === selectedProvinceId);

  const getPlaceholder = () => {
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
    <section className="col-span-12 lg:col-span-4 h-full bg-white lg:bg-white/90 backdrop-blur-xl lg:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-b lg:border border-white flex flex-col overflow-hidden z-20 relative transition-all duration-500">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white lg:bg-white/50 relative z-30 flex-shrink-0">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10B981]"></div>
                <span className="text-sm font-bold text-slate-700 tracking-tight">Doctoi AI</span>
            </div>
            {/* Backend Simulation Indicator */}
            <div className="flex items-center gap-1 mt-0.5">
                <svg className="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                <span className="text-[9px] font-medium text-slate-400">Conexión Segura</span>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button onClick={onReset} className="text-slate-400 hover:text-blue-600 transition" title="Reiniciar">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            </button>
            
            <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)} 
                    className="text-slate-400 hover:text-blue-600 transition p-1 rounded-md hover:bg-slate-100"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-fade-enter origin-top-right overflow-hidden z-50">
                        <button className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Acerca de
                        </button>
                        <button className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Términos de servicio
                        </button>
                        <button className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition flex items-center gap-2">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>
                            Aviso legal
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Chat Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} gap-1 animate-fade-enter`}>
            {msg.type === 'text' && (
              <div className={`${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : (msg.text.includes('⚠️') ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-700')} py-3 px-4 rounded-2xl max-w-[90%] text-sm shadow-sm leading-relaxed whitespace-pre-line`}>
                {msg.text}
              </div>
            )}

            {/* INTENT SELECTOR - Updated Layout */}
            {msg.type === 'intent_selector' && (
                <div className="w-full flex flex-col gap-2 mt-2">
                    <div className="text-xs text-slate-400 ml-1 mb-1">Selecciona una opción o escribe abajo:</div>
                    <div className="flex flex-wrap gap-2 w-full">
                        <button 
                            onClick={() => onSelectIntent('triage')}
                            className="flex-1 min-w-[90px] bg-white border border-emerald-100 p-3 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-400 transition-all group text-left flex flex-col"
                        >
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-lg mb-2 group-hover:bg-emerald-100 transition-colors">🩺</div>
                            <h4 className="font-bold text-slate-800 text-xs">Dolencia</h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">Triaje IA.</p>
                        </button>

                        <button 
                            onClick={() => onSelectIntent('pharmacy')}
                            className="flex-1 min-w-[90px] bg-white border border-blue-100 p-3 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-400 transition-all group text-left flex flex-col"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-lg mb-2 group-hover:bg-blue-100 transition-colors">💊</div>
                            <h4 className="font-bold text-slate-800 text-xs">Farmacia</h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">Medicinas.</p>
                        </button>
                        
                        <button 
                            onClick={() => onSelectIntent('directory')}
                            className="flex-1 min-w-[90px] bg-white border border-indigo-100 p-3 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-400 transition-all group text-left flex flex-col"
                        >
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-lg mb-2 group-hover:bg-indigo-100 transition-colors">🏥</div>
                            <h4 className="font-bold text-slate-800 text-xs">Directorio</h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">Clínicas.</p>
                        </button>
                    </div>
                </div>
            )}

            {/* Department Selector */}
            {msg.type === 'department_selector' && (
              <div className="w-[90%] mt-2 flex flex-col gap-4">
                 {/* Location Request Card */}
                 <div className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 ${isRequestingLocation ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-md'}`}>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isRequestingLocation ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                            {isRequestingLocation ? (
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className={`text-sm font-bold ${isRequestingLocation ? 'text-blue-800' : 'text-slate-700'}`}>
                                {isRequestingLocation ? 'Detectando ubicación...' : 'Ubicación Automática'}
                            </h4>
                            <p className="text-xs text-slate-500 leading-tight mt-0.5">
                                {isRequestingLocation ? 'Espera un momento por favor' : 'Detectar mi distrito automáticamente'}
                            </p>
                        </div>
                        <button 
                            onClick={onRequestLocation}
                            disabled={isRequestingLocation}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isRequestingLocation ? 'bg-white text-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                            {isRequestingLocation ? '...' : 'Activar'}
                        </button>
                    </div>
                    {isRequestingLocation && (
                         <div className="absolute bottom-0 left-0 h-1 bg-blue-400/30 w-full animate-pulse"></div>
                    )}
                 </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                    <div className="h-[1px] bg-slate-200 flex-1"></div>
                    o selecciona manualmente
                    <div className="h-[1px] bg-slate-200 flex-1"></div>
                </div>
                <select 
                    onChange={(e) => onSelectDepartment(e.target.value)} 
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm cursor-pointer appearance-none"
                    defaultValue=""
                >
                    <option value="" disabled>Selecciona un Departamento...</option>
                    {DEPARTMENTS.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>
            )}

            {/* Province Selector */}
            {msg.type === 'province_selector' && (
              <div className="w-[90%] mt-2 flex flex-col gap-3">
                <select 
                    onChange={(e) => onSelectProvince(e.target.value)} 
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm cursor-pointer appearance-none"
                    defaultValue=""
                >
                    <option value="" disabled>Selecciona una Provincia...</option>
                    {availableProvinces.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>
            )}

            {/* District Selector */}
            {msg.type === 'district_selector' && (
              <div className="w-[90%] mt-2 flex flex-col gap-3">
                <select 
                    onChange={(e) => onSelectDistrict(e.target.value)} 
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm cursor-pointer appearance-none"
                    defaultValue=""
                >
                    <option value="" disabled>Selecciona un Distrito...</option>
                    {availableDistricts.map(d => (
                        <option key={d.id} value={d.id}>📍 {d.name}</option>
                    ))}
                </select>
              </div>
            )}

            {msg.type === 'insurance_selector' && (
                <div className="flex flex-wrap gap-2 mt-2 max-w-[95%]">
                    {INSURANCES.map(ins => (
                        <button 
                            key={ins} 
                            onClick={() => onSelectInsurance(ins)}
                            className="px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition shadow-sm"
                        >
                            {ins}
                        </button>
                    ))}
                </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-2 ml-4 mb-2 mt-2">
            <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
            </div>
            <span className="text-[10px] text-slate-400 animate-pulse">Analizando...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area - Removed pb-28 padding */}
      <div className="p-4 pb-4 bg-white border-t border-slate-50 relative flex-shrink-0 z-20 transition-all">
        {currentStep === 1 && flow === 'triage' && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
            <button onClick={() => setInput('Tengo fiebre alta y me duele la cabeza')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">🤒 Fiebre alta</button>
            <button onClick={() => setInput('Me duele mucho el estómago y tengo náuseas')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">🤢 Dolor estómago</button>
            </div>
        )}

        {currentStep === 1 && flow === 'pharmacy' && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => setInput('Paracetamol 500mg')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">💊 Paracetamol</button>
                <button onClick={() => setInput('Amoxicilina')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">💊 Amoxicilina</button>
            </div>
        )}
        
        {currentStep === 1 && flow === 'directory' && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => setInput('Clínica San Pablo')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">🏥 Clínica San Pablo</button>
                <button onClick={() => setInput('Hospital Rebagliati')} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition">🏥 Rebagliati</button>
            </div>
        )}

        <div className="relative group">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full h-12 pl-5 pr-12 rounded-full border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-700 shadow-inner focus:shadow-lg focus:shadow-blue-100/50 focus:border-blue-400 focus:ring-0 outline-none transition-all text-sm"
            onKeyDown={handleKeyPress}
            disabled={isInputDisabled} 
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isInputDisabled}
            className="absolute right-1.5 top-1.5 bottom-1.5 w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>
    </section>
  );
}
