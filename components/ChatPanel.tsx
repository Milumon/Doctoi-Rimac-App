
import React, { useState, useEffect, useRef } from 'react';
import { Message, MedicalCenter, TriageAnalysis, UrgencyLevel } from '../types';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
  onSelectCenter: (center: MedicalCenter) => void;
}

// --- Inline Component: Analysis Card ---
const InlineAnalysis: React.FC<{ analysis: TriageAnalysis }> = ({ analysis }) => {
    const getUrgencyColor = (level: UrgencyLevel) => {
        switch(level) {
            case UrgencyLevel.LOW: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case UrgencyLevel.MODERATE: return 'bg-amber-100 text-amber-700 border-amber-200';
            case UrgencyLevel.HIGH: return 'bg-orange-100 text-orange-700 border-orange-200';
            case UrgencyLevel.EMERGENCY: return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden my-2">
            <div className="bg-blue-50/50 p-3 border-b border-blue-100 flex justify-between items-center">
                <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                   🩺 Análisis IA
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getUrgencyColor(analysis.urgency)}`}>
                    {analysis.urgency}
                </span>
            </div>
            <div className="p-4">
                <h3 className="font-bold text-slate-800 text-base">{analysis.specialty}</h3>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{analysis.specialtyDescription}</p>
                
                <div className="space-y-2">
                    <div className="bg-slate-50 p-2 rounded-lg">
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recomendación</p>
                         <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                            {analysis.advice.map((a, i) => <li key={i}>{a}</li>)}
                         </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Inline Component: Results List ---
const InlineResults: React.FC<{ centers: MedicalCenter[], onSelect: (c: MedicalCenter) => void }> = ({ centers, onSelect }) => {
    if (!centers || centers.length === 0) return <div className="text-xs text-slate-400 italic p-2">No se encontraron resultados exactos en esta zona.</div>;

    return (
        <div className="flex flex-col gap-2 my-2 w-full">
             {centers.map(center => (
                 <div key={center.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex justify-between items-center gap-3">
                     <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{center.type}</span>
                            <h4 className="text-sm font-bold text-slate-800 truncate">{center.name}</h4>
                         </div>
                         <p className="text-xs text-slate-500 truncate">📍 {center.district} • {center.insurances.length > 2 ? 'Múltiples seguros' : center.insurances.join(', ')}</p>
                     </div>
                     <button 
                        onClick={() => onSelect(center)}
                        className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition shrink-0"
                     >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                     </button>
                 </div>
             ))}
        </div>
    );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  isTyping,
  onSelectCenter
}) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <section className="col-span-12 h-full bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col overflow-hidden z-20 relative">
      
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-white/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-blue-400 to-emerald-400 shadow-md"></div>
          <span className="text-base font-bold text-slate-700 tracking-tight">Doctoi AI</span>
        </div>
      </div>

      {/* Chat Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} gap-1 animate-fade-enter max-w-full`}>
            
            {/* Text Messages */}
            {msg.type === 'text' && (
              <div className={`${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'} py-3 px-5 rounded-2xl max-w-[90%] md:max-w-[75%] text-sm shadow-sm leading-relaxed whitespace-pre-line`}>
                {msg.text}
              </div>
            )}

            {/* Triage Analysis Bubble */}
            {msg.type === 'analysis' && msg.analysisData && (
                <InlineAnalysis analysis={msg.analysisData} />
            )}

            {/* Medical Centers List Bubble */}
            {msg.type === 'medical_centers' && msg.medicalCentersData && (
                <div className="w-full max-w-md bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                    <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Resultados encontrados</div>
                    <InlineResults centers={msg.medicalCentersData} onSelect={onSelectCenter} />
                </div>
            )}

          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-1 ml-4">
            <div className="w-2 h-2 bg-slate-300 rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-slate-300 rounded-full typing-dot"></div>
            <div className="w-2 h-2 bg-slate-300 rounded-full typing-dot"></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white border-t border-slate-50">
        <div className="relative group max-w-3xl mx-auto">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe cómo te sientes, tu ubicación o qué buscas..."
            className="w-full h-14 pl-6 pr-14 rounded-full border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 shadow-sm focus:shadow-xl focus:shadow-blue-100/50 focus:border-blue-400 focus:ring-0 outline-none transition-all text-sm font-medium"
            onKeyDown={handleKeyPress}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition shadow-md disabled:bg-slate-200 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>
    </section>
  );
}
