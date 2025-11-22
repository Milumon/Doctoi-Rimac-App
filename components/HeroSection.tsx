
import React from 'react';

export const HeroSection: React.FC = () => {
  return (
    // Removed specific background colors, borders, and internal blobs. 
    // Now acts as a transparent container for the text/logo content.
    <section className="hidden lg:flex col-span-12 lg:col-span-8 h-full flex-col items-center justify-center relative animate-fade-enter z-10">
      
      <div className="relative z-10 text-center max-w-3xl px-6 md:px-10 flex flex-col items-center">
        
        {/* MAIN BRANDING HEADER */}
        <div className="flex items-center gap-5 mb-10 animate-fade-enter">
            <div className="w-24 h-24 relative drop-shadow-2xl hover:scale-105 transition-transform duration-500 ease-out">
                <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {/* Unique IDs to prevent gradient conflicts with other SVGs on the page */}
                        <linearGradient id="hero-main-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#F8FAFC"/> 
                            <stop offset="1" stopColor="#F0FDFA"/> 
                        </linearGradient>

                        <linearGradient id="hero-stetho-grad" x1="100" y1="100" x2="400" y2="400" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#2DD4BF"/> 
                            <stop offset="1" stopColor="#0EA5E9"/> 
                        </linearGradient>

                        <filter id="hero-dev-shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="10" stdDeviation="15" floodColor="#0F766E" floodOpacity="0.15"/>
                        </filter>
                    </defs>

                    {/* Base Shape - Added transparency */}
                    <rect width="512" height="512" rx="120" fill="url(#hero-main-bg)" fillOpacity="0.85"/>

                    {/* Document */}
                    <rect x="146" y="116" width="220" height="280" rx="20" fill="#FFFFFF" filter="url(#hero-dev-shadow)"/>
                    <rect x="176" y="160" width="80" height="8" rx="4" fill="#E2E8F0"/>
                    <rect x="176" y="190" width="160" height="8" rx="4" fill="#F1F5F9"/>
                    <rect x="176" y="210" width="140" height="8" rx="4" fill="#F1F5F9"/>

                    {/* Stethoscope */}
                    <path d="M256 80 V 120 C 256 150 320 120 320 180 V 260 C 320 310 280 340 256 340" 
                          stroke="url(#hero-stetho-grad)" 
                          strokeWidth="18" 
                          strokeLinecap="round"/>
                    <path d="M230 80 C 230 100 282 100 282 80" stroke="url(#hero-stetho-grad)" strokeWidth="18" strokeLinecap="round"/>

                    {/* Sensor */}
                    <circle cx="256" cy="340" r="32" fill="url(#hero-stetho-grad)"/>
                    <circle cx="256" cy="340" r="24" fill="#FFFFFF" opacity="0.2"/> 
                    <circle cx="256" cy="340" r="12" fill="#FFFFFF"/> 
                    
                    {/* Spark - Added transparency */}
                    <path d="M360 130 L 365 140 L 375 145 L 365 150 L 360 160 L 355 150 L 345 145 L 355 140 Z" fill="#2DD4BF" fillOpacity="0.6"/>
                </svg>
            </div>
            <div className="flex flex-col items-start">
                <h1 className="text-7xl font-bold text-slate-800 tracking-tighter leading-none">Doctoi</h1>
                <span className="text-sm font-bold text-blue-500 tracking-widest uppercase ml-1">Inteligencia Clínica</span>
            </div>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 tracking-tight leading-tight md:leading-[1.1]">
            De la incertidumbre a la <br className="hidden xl:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">atención médica ideal.</span>
        </h2>
        <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
          Doctoi analiza tus síntomas en segundos y conecta tu diagnóstico con los mejores especialistas, farmacias y centros de salud en Perú.
        </p>
      </div>
    </section>
  );
};
