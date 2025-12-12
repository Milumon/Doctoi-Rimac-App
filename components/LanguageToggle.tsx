
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  
  return (
    <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200">
      <button 
        onClick={() => setLanguage('es')}
        className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
          language === 'es' 
            ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        ES
      </button>
      <button 
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
          language === 'en' 
            ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        EN
      </button>
    </div>
  );
};
