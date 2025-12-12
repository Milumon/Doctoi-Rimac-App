
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from './LanguageToggle';

interface MobileWelcomeProps {
  onStart: () => void;
  onInstall: () => void;
  canInstall: boolean;
  isVisible: boolean;
}

export const MobileWelcome: React.FC<MobileWelcomeProps> = ({ onStart, onInstall, canInstall, isVisible }) => {
  const { t } = useLanguage();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col items-center justify-between p-6 animate-fade-enter lg:hidden overflow-hidden">
      
      {/* Background Blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-blue-200/40 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[350px] h-[350px] bg-emerald-200/40 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

      {/* Language Toggle */}
      <div className="absolute top-6 right-6 z-20">
         <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md relative z-10 text-center">
        
        {/* Logo Section */}
        <div className="w-48 h-48 mb-6 relative drop-shadow-2xl">
            <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-fade-enter">
                <defs>
                    <linearGradient id="mob-pulse-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3B82F6"/> 
                        <stop offset="1" stopColor="#10B981"/> 
                    </linearGradient>
                    <filter id="mob-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="15" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                <circle cx="256" cy="256" r="200" fill="url(#mob-pulse-grad)" fillOpacity="0.05" />
                <circle cx="256" cy="256" r="160" stroke="url(#mob-pulse-grad)" strokeWidth="2" strokeDasharray="10 10" opacity="0.3" className="animate-[spin_10s_linear_infinite]" />
                <path d="M256 120 C 190 120 146 170 146 230 C 146 300 256 420 256 420 C 256 420 366 300 366 230 C 366 170 322 120 256 120 Z" 
                      fill="white" 
                      filter="url(#mob-glow)"
                />
                <path d="M256 190 V 270 M 216 230 H 296" 
                      stroke="url(#mob-pulse-grad)" 
                      strokeWidth="24" 
                      strokeLinecap="round"/>
                <circle cx="360" cy="140" r="30" fill="#3B82F6" opacity="0.9" />
                <path d="M350 140 H 370" stroke="white" strokeWidth="6" strokeLinecap="round" />
                <path d="M350 140 H 370" stroke="white" strokeWidth="6" strokeLinecap="round" />
            </svg>
        </div>

        {/* Text Content */}
        <div className="space-y-3 px-2">
            <div className="flex items-center justify-center gap-2 mb-2">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">{t.common.beta}</span>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wide">{t.common.location}</span>
            </div>
            
            <h1 className="text-5xl font-bold text-slate-800 tracking-tighter leading-none">{t.welcome.title}</h1>
            
            <h2 className="text-xl font-medium text-slate-600">
                {t.welcome.heroTitle} <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500 font-bold">{t.welcome.subtitle}</span>
            </h2>
            
            <p className="text-sm text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                {t.welcome.description}
            </p>
        </div>

      </div>

      {/* Action Buttons & Disclaimer */}
      <div className="w-full max-w-md space-y-4 relative z-10 mb-6">
        
        <div className="bg-slate-100/80 px-3 py-2 rounded-xl border border-slate-200/50 backdrop-blur-sm flex gap-2 items-start text-left">
            <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p className="text-[10px] text-slate-500 leading-tight">
                {t.welcome.disclaimer}
            </p>
        </div>

        <button 
            onClick={onStart}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
        >
            {t.welcome.startButton}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
        </button>

        {canInstall && (
            <button 
                onClick={onInstall}
                className="w-full py-3 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                {t.welcome.installButton}
            </button>
        )}
        
        <div className="flex justify-center gap-4 text-[10px] text-slate-300 font-medium">
            <span>{t.welcome.poweredBy}</span>
        </div>
      </div>
    </div>
  );
};
