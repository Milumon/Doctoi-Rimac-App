
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const HeroSection: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="hidden lg:flex col-span-12 lg:col-span-8 h-full flex-col items-center justify-center relative animate-fade-enter z-10">
      
      <div className="relative z-10 text-center max-w-3xl px-6 md:px-10 flex flex-col items-center">
        
        {/* SAFE BRANDING VISUAL */}
        <div className="flex items-center gap-5 mb-8 animate-fade-enter">
            <div className="w-28 h-28 relative drop-shadow-2xl hover:scale-105 transition-transform duration-500 ease-out">
                <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="hero-pulse-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#3B82F6"/> 
                            <stop offset="1" stopColor="#10B981"/> 
                        </linearGradient>
                        <filter id="hero-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Abstract Base Circle (The AI Core) */}
                    <circle cx="256" cy="256" r="200" fill="url(#hero-pulse-grad)" fillOpacity="0.05" />
                    <circle cx="256" cy="256" r="160" stroke="url(#hero-pulse-grad)" strokeWidth="2" strokeDasharray="10 10" opacity="0.3" className="animate-[spin_10s_linear_infinite]" />
                    
                    {/* The Location Pin (Grounding) */}
                    <path d="M256 120 C 190 120 146 170 146 230 C 146 300 256 420 256 420 C 256 420 366 300 366 230 C 366 170 322 120 256 120 Z" 
                          fill="white" 
                          filter="url(#hero-glow)"
                          className="drop-shadow-lg"
                    />

                    {/* The Health Symbol (Cross/Spark) - Abstracted */}
                    <path d="M256 190 V 270 M 216 230 H 296" 
                          stroke="url(#hero-pulse-grad)" 
                          strokeWidth="24" 
                          strokeLinecap="round"/>
                    
                    {/* Floating Chat Bubble (Communication) */}
                    <circle cx="360" cy="140" r="30" fill="#3B82F6" opacity="0.9" />
                    <path d="M350 140 H 370" stroke="white" strokeWidth="6" strokeLinecap="round" />
                    <path d="M350 140 H 370" stroke="white" strokeWidth="6" strokeLinecap="round" />
                </svg>
            </div>
            
            <div className="flex flex-col items-start text-left">
                <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-6xl font-bold text-slate-800 tracking-tighter leading-none">{t.welcome.title}</h1>
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">{t.common.beta}</span>
                </div>
                <span className="text-sm font-medium text-slate-500 tracking-widest uppercase ml-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    {t.welcome.subtitle}
                </span>
            </div>
        </div>

        {/* COPYWRITING - LEGAL SAFE & ACTION ORIENTED */}
        <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 tracking-tight leading-tight md:leading-[1.15]">
            {t.welcome.heroTitle} <br className="hidden xl:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">{t.welcome.heroSubtitle}</span>
        </h2>
        
        <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto mb-8">
          {t.welcome.description}
        </p>

        {/* DISCLAIMER BADGE */}
        <div className="flex items-center justify-center gap-2 bg-slate-100/80 px-4 py-2 rounded-full border border-slate-200/50 backdrop-blur-sm">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="text-xs text-slate-500 font-medium">{t.welcome.disclaimer}</span>
        </div>

      </div>
    </section>
  );
};
