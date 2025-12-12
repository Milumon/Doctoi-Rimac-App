
import React, { useEffect, useState } from 'react';

export type ToastType = 'triage' | 'medication' | 'places' | null;

interface MobileToastProps {
  type: ToastType;
  visible: boolean;
  onClose: () => void;
  onNavigate: () => void;
}

export const MobileToast: React.FC<MobileToastProps> = ({ type, visible, onClose, onNavigate }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsExiting(false);
      const timer = setTimeout(() => {
        handleClose();
      }, 6000); // Show for 6 seconds
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleClose = () => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Wait for animation
  };

  if (!visible && !isExiting) return null;
  if (!type) return null;

  // Configuration based on type
  const config = {
      triage: {
          color: 'bg-emerald-900/95',
          border: 'border-emerald-500/50',
          iconBg: 'bg-emerald-500',
          title: 'Análisis Clínico Listo',
          text: 'Ver diagnóstico y recomendaciones',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          )
      },
      medication: {
          color: 'bg-blue-900/95',
          border: 'border-blue-500/50',
          iconBg: 'bg-blue-500',
          title: 'Info de Medicamento',
          text: 'Ver detalles, dosis y advertencias',
          icon: (
            <span className="text-lg">💊</span>
          )
      },
      places: {
          color: 'bg-indigo-900/95',
          border: 'border-indigo-500/50',
          iconBg: 'bg-indigo-500',
          title: 'Lugares Encontrados',
          text: 'Ver opciones cercanas en el mapa',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          )
      }
  };

  const current = config[type];

  return (
    <div 
        className={`fixed top-20 right-4 z-[100] w-auto max-w-[90vw] md:max-w-sm transition-all duration-300 transform lg:hidden ${isExiting ? 'translate-x-[120%] opacity-0' : 'translate-x-0 opacity-100'}`}
    >
      <div 
        onClick={() => { onNavigate(); handleClose(); }}
        className={`relative flex items-center gap-3 p-3 pr-5 rounded-2xl shadow-xl border backdrop-blur-md cursor-pointer active:scale-95 transition-transform ${current.color} ${current.border}`}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${current.iconBg}`}>
            {current.icon}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-sm leading-tight truncate">{current.title}</h4>
            <p className="text-xs text-white/80 leading-tight mt-0.5">{current.text}</p>
        </div>
        
        {/* Close Button */}
        <button 
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            className="absolute -top-2 -left-2 bg-white text-slate-800 rounded-full p-1 shadow-md hover:bg-slate-100 w-6 h-6 flex items-center justify-center"
        >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>
  );
};
