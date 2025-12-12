
import React, { useState, useEffect, useRef } from 'react';
import { Message, Doctor } from '../types';

interface DoctorChatPanelProps {
  doctor: Doctor;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
  isTyping: boolean;
}

// === MARKDOWN HELPER COMPONENTS ===
const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n');
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                const trimmed = line.trim();
                // Bullet points
                if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                    return (
                        <div key={i} className="flex items-start gap-2 ml-1">
                            <span className="text-[10px] mt-1.5 opacity-70">●</span>
                            <span>{parseBold(trimmed.substring(2))}</span>
                        </div>
                    );
                }
                // Numbered lists
                if (/^\d+\.\s/.test(trimmed)) {
                     const content = trimmed.replace(/^\d+\.\s/, '');
                     const number = trimmed.match(/^\d+/)?.[0];
                     return (
                        <div key={i} className="flex items-start gap-2 ml-1">
                            <span className="font-bold text-xs mt-0.5 opacity-80">{number}.</span>
                            <span>{parseBold(content)}</span>
                        </div>
                     );
                }
                // Empty lines
                if (!trimmed) return <div key={i} className="h-1"></div>;
                // Standard text
                return <p key={i} className="min-h-[1.2em]">{parseBold(line)}</p>;
            })}
        </div>
    );
};

export const DoctorChatPanel: React.FC<DoctorChatPanelProps> = ({ 
  doctor, 
  messages, 
  onSendMessage, 
  onClose,
  isTyping 
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
    <section className="col-span-12 lg:col-span-4 h-full bg-white/90 backdrop-blur-xl rounded-3xl lg:rounded-[2.5rem] shadow-xl border border-indigo-100 flex flex-col overflow-hidden relative z-20 animate-fade-enter ring-4 ring-indigo-50 min-h-0">
      
      {/* Doctor Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 shrink-0 flex flex-col gap-3 shadow-md relative">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-indigo-100 hover:text-white transition p-1 bg-white/10 rounded-lg"
            title="Volver a resultados"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="flex items-center gap-4">
            <div className="relative">
                <div className="w-14 h-14 rounded-full bg-white p-0.5 shadow-lg">
                    <img 
                        src={`data:image/jpeg;base64,${doctor.foto_base64}`} 
                        alt="Doctor" 
                        className="w-full h-full rounded-full object-cover bg-slate-200"
                        onError={(e) => {e.currentTarget.src = `https://ui-avatars.com/api/?name=Dr+${doctor.apellido_paterno}&background=random&color=fff`}}
                    />
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-indigo-600 rounded-full"></div>
            </div>
            <div className="flex-1 text-white">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base leading-none truncate">Dr. {doctor.apellido_paterno}</h3>
                </div>
                <p className="text-indigo-100 text-xs mt-1 truncate font-medium">{doctor.especialidad_principal}</p>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] bg-black/20 px-2 py-0.5 rounded-full font-mono tracking-wide text-white/90">
                        CMP: {doctor.cmp}
                    </span>
                    <span className="text-[9px] text-emerald-200 flex items-center gap-0.5 font-bold uppercase tracking-wider">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                        En Línea
                    </span>
                </div>
            </div>
        </div>
        <div className="bg-indigo-800/30 rounded-lg p-2 text-[10px] text-indigo-100 border border-indigo-500/30">
            <span className="font-bold">Nota:</span> Esta es una tele-orientación inicial. No reemplaza una consulta presencial ni constituye una receta médica formal.
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-indigo-50/30 no-scrollbar min-h-0">
        <div className="flex justify-center">
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                Consulta iniciada {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} gap-1 animate-fade-enter`}>
            <div 
                className={`py-3 px-4 rounded-2xl max-w-[85%] text-sm shadow-sm leading-relaxed whitespace-pre-line relative
                ${msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 rounded-tl-none border border-indigo-100'
                }`}
            >
                {msg.sender === 'user' ? msg.text : <FormattedMessage text={msg.text} />}
            </div>
            <span className="text-[10px] text-slate-400 px-1">
                {msg.sender === 'user' ? 'Tú' : 'Especialista'}
            </span>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-2 ml-2">
             <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-[10px]">👨‍⚕️</span>
             </div>
             <div className="bg-white border border-indigo-50 px-3 py-2 rounded-xl rounded-tl-none shadow-sm">
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full typing-dot"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full typing-dot"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full typing-dot"></div>
                </div>
             </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-indigo-50">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe al especialista..."
            className="w-full h-11 pl-4 pr-12 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
            onKeyDown={handleKeyPress}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white hover:bg-indigo-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>
    </section>
  );
};
