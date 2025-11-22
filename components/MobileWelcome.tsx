
import React from 'react';

interface MobileWelcomeProps {
  onStart: () => void;
  onInstall: () => void;
  canInstall: boolean;
  isVisible: boolean;
}

export const MobileWelcome: React.FC<MobileWelcomeProps> = ({ onStart, onInstall, canInstall, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col items-center justify-between p-6 animate-fade-enter lg:hidden overflow-hidden">
      
      {/* Background Blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-blue-200/40 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[350px] h-[350px] bg-emerald-200/40 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md relative z-10">
        
        {/* Logo Section */}
        <div className="w-40 h-40 mb-8 relative drop-shadow-xl">
            <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-fade-enter">
                <defs>
                    <linearGradient id="mob-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#F8FAFC"/> 
                        <stop offset="1" stopColor="#F0FDFA"/> 
                    </linearGradient>
                    <linearGradient id="mob-stetho" x1="100" y1="100" x2="400" y2="400" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#2DD4BF"/> 
                        <stop offset="1" stopColor="#0EA5E9"/> 
                    </linearGradient>
                    <filter id="mob-shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="10" stdDeviation="15" floodColor="#0F766E" floodOpacity="0.15"/>
                    </filter>
                </defs>
                {/* Base Shape - Added Transparency */}
                <rect width="512" height="512" rx="120" fill="url(#mob-bg)" fillOpacity="0.85"/>
                
                <rect x="146" y="116" width="220" height="280" rx="20" fill="#FFFFFF" filter="url(#mob-shadow)"/>
                <rect x="176" y="160" width="80" height="8" rx="4" fill="#E2E8F0"/>
                <rect x="176" y="190" width="160" height="8" rx="4" fill="#F1F5F9"/>
                <rect x="176" y="210" width="140" height="8" rx="4" fill="#F1F5F9"/>
                <path d="M256 80 V 120 C 256 150 320 120 320 180 V 260 C 320 310 280 340 256 340" stroke="url(#mob-stetho)" strokeWidth="18" strokeLinecap="round"/>
                <path d="M230 80 C 230 100 282 100 282 80" stroke="url(#mob-stetho)" strokeWidth="18" strokeLinecap="round"/>
                <circle cx="256" cy="340" r="32" fill="url(#mob-stetho)"/>
                <circle cx="256" cy="340" r="24" fill="#FFFFFF" opacity="0.2"/> 
                <circle cx="256" cy="340" r="12" fill="#FFFFFF"/> 
                
                {/* Spark - Added Transparency */}
                <path d="M360 130 L 365 140 L 375 145 L 365 150 L 360 160 L 355 150 L 345 145 L 355 140 Z" fill="#2DD4BF" fillOpacity="0.6"/>
            </svg>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Doctoi</h1>
            <p className="text-lg font-medium text-slate-500">Inteligencia Clínica a tu alcance</p>
            <p className="text-sm text-slate-400 max-w-[250px] mx-auto leading-relaxed">
                Diagnósticos rápidos, farmacias cercanas y directorio médico en una sola App.
            </p>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3 relative z-10 mb-8">
        <button 
            onClick={onStart}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
        >
            Comenzar Ahora
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
        </button>

        {canInstall && (
            <button 
                onClick={onInstall}
                className="w-full py-3 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Instalar App
            </button>
        )}
        
        <p className="text-[10px] text-center text-slate-400 mt-4">
            Desarrollado con Gemini AI & Google Cloud
        </p>
      </div>
    </div>
  );
};
