
import React, { useState, useEffect, useRef } from 'react';
import { Message, RagDocument } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AIConsultPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
  isTyping: boolean;
  
  // File Upload Props
  uploadedFiles: RagDocument[];
  onUploadFile: (file: File) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
  isUploading: boolean;
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

export const AIConsultPanel: React.FC<AIConsultPanelProps> = ({ 
  messages, 
  onSendMessage, 
  onClose,
  isTyping,
  uploadedFiles,
  onUploadFile,
  onDeleteFile,
  isUploading
}) => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, uploadedFiles]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          onUploadFile(e.target.files[0]);
      }
  };

  // DISCLAIMER GATE
  if (!acceptedTerms) {
      return (
        <section className="col-span-12 lg:col-span-4 h-full bg-white/90 backdrop-blur-xl rounded-3xl lg:rounded-[2.5rem] shadow-xl border border-indigo-100 flex flex-col items-center justify-center p-8 relative z-20 animate-fade-enter ring-4 ring-indigo-50 min-h-0 text-center">
            <button onClick={() => setShowExitConfirm(true)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-4xl">🤖</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">{t.assistant.title}</h2>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-left mb-6">
                <h3 className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2">
                    ⚠️ {t.assistant.disclaimerTitle}
                </h3>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                    {t.assistant.disclaimerText}
                </p>
            </div>
            <button 
                onClick={() => setAcceptedTerms(true)}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
                {t.assistant.understood}
            </button>

            {showExitConfirm && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 flex items-center justify-center p-4 rounded-[2.5rem]">
                    <div className="bg-white border border-slate-100 shadow-xl p-6 rounded-2xl text-center">
                         <h4 className="font-bold text-slate-800 mb-2">{t.assistant.exitConfirmTitle}</h4>
                         <p className="text-xs text-slate-500 mb-4">{t.assistant.exitConfirmText}</p>
                         <div className="flex gap-2">
                             <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg">{t.common.cancel}</button>
                             <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">{t.common.exit}</button>
                         </div>
                    </div>
                </div>
            )}
        </section>
      );
  }

  return (
    <section className="col-span-12 lg:col-span-4 h-full bg-white/90 backdrop-blur-xl rounded-3xl lg:rounded-[2.5rem] shadow-xl border border-indigo-100 flex flex-col overflow-hidden relative z-20 animate-fade-enter ring-4 ring-indigo-50 min-h-0">
      
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 shrink-0 flex flex-col gap-3 shadow-md relative">
        <button 
            onClick={() => setShowExitConfirm(true)} 
            className="absolute top-4 right-4 text-indigo-100 hover:text-white transition p-1 bg-white/10 rounded-lg"
            title={t.common.exit}
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="flex items-center gap-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-2xl border border-white/20 shadow-inner">
                    ✨
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-indigo-600 rounded-full"></div>
            </div>
            <div className="flex-1 text-white">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base leading-none">{t.assistant.title}</h3>
                    <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white font-bold">{t.common.beta}</span>
                </div>
                <p className="text-indigo-100 text-xs mt-1 font-medium">{t.assistant.subtitle}</p>
            </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 no-scrollbar min-h-0 relative">
        <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                {t.assistant.experimental}
            </span>
            
            {/* Intro / Capabilities Block - Shows when chat is empty or just starting */}
            {messages.length <= 1 && (
                <div className="bg-white border border-indigo-100 rounded-xl p-4 mt-2 mb-4 w-full shadow-sm animate-fade-enter">
                    <h4 className="text-xs font-bold text-indigo-800 mb-3 uppercase tracking-wider text-center">{t.assistant.capabilitiesTitle}</h4>
                    <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-indigo-50/50 border border-indigo-50">
                            <span className="text-lg bg-white shadow-sm p-1.5 rounded-lg border border-indigo-100">📄</span>
                            <span className="text-xs text-indigo-900 font-medium leading-tight">{t.assistant.capability1}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-indigo-50/50 border border-indigo-50">
                            <span className="text-lg bg-white shadow-sm p-1.5 rounded-lg border border-indigo-100">💊</span>
                            <span className="text-xs text-indigo-900 font-medium leading-tight">{t.assistant.capability2}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-indigo-50/50 border border-indigo-50">
                            <span className="text-lg bg-white shadow-sm p-1.5 rounded-lg border border-indigo-100">🩺</span>
                            <span className="text-xs text-indigo-900 font-medium leading-tight">{t.assistant.capability3}</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-indigo-50 text-center">
                         <div className="inline-flex items-center gap-1.5 text-[10px] text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg">
                             <span className="text-xs">💡</span>
                             {t.assistant.filesHint}
                         </div>
                    </div>
                </div>
            )}
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} gap-1 animate-fade-enter`}>
            <div 
                className={`py-3 px-4 rounded-2xl max-w-[85%] text-sm shadow-sm leading-relaxed whitespace-pre-line relative
                ${msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                }`}
            >
                {msg.sender === 'user' ? msg.text : <FormattedMessage text={msg.text} />}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-2 ml-2">
             <div className="bg-white border border-slate-100 px-3 py-2 rounded-xl rounded-tl-none shadow-sm">
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full typing-dot"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full typing-dot"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full typing-dot"></div>
                </div>
             </div>
          </div>
        )}
        <div ref={endRef} />

        {/* EXIT CONFIRMATION OVERLAY */}
        {showExitConfirm && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white border border-slate-100 shadow-2xl p-6 rounded-2xl text-center animate-fade-enter max-w-xs w-full">
                     <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3 text-red-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                     </div>
                     <h4 className="font-bold text-slate-800 mb-2">{t.assistant.exitConfirmTitle}</h4>
                     <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                        {t.assistant.exitConfirmText}
                     </p>
                     <div className="flex gap-3">
                         <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition">{t.common.cancel}</button>
                         <button onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-lg shadow-indigo-200">{t.common.exit}</button>
                     </div>
                </div>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100">
        
        {/* Uploaded Files Chips */}
        {uploadedFiles.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
                {uploadedFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-2 bg-violet-50 border border-violet-100 text-violet-700 px-2 py-1 rounded-lg text-xs max-w-[150px] group">
                        <span className="truncate">{f.displayName}</span>
                        {f.state === 'PROCESSING' ? (
                            <div className="w-2 h-2 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
                        ) : (
                            <button 
                                onClick={() => onDeleteFile(f.id)} 
                                className="w-4 h-4 flex items-center justify-center rounded-full bg-violet-200 hover:bg-red-500 hover:text-white transition text-[10px]"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}

        <div className="relative flex gap-2 items-center">
          <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept="image/*,.pdf"
             onChange={handleFileChange}
          />
          <button 
             onClick={() => fileInputRef.current?.click()}
             disabled={isUploading}
             className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center shrink-0 transition"
             title={t.assistant.uploadFile}
          >
             {isUploading ? (
                 <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div>
             ) : (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
             )}
          </button>

          <div className="relative flex-1">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.assistant.inputPlaceholder}
                className="w-full h-10 pl-4 pr-10 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                onKeyDown={handleKeyPress}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className="absolute right-1 top-1 bottom-1 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white hover:bg-indigo-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
          </div>
        </div>
      </div>
    </section>
  );
};
