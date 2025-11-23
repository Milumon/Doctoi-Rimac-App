
import React from 'react';

interface MobileNavBarProps {
  activeTab: 'chat' | 'analysis' | 'results' | 'doctor';
  setActiveTab: (tab: 'chat' | 'analysis' | 'results' | 'doctor') => void;
  hasAnalysis: boolean;
  hasResults: boolean;
  hasDoctor: boolean;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({ activeTab, setActiveTab, hasAnalysis, hasResults, hasDoctor }) => {
  return (
    <div className="lg:hidden w-full h-20 bg-white/95 backdrop-blur-xl rounded-t-[2rem] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-slate-100 z-50 flex items-center justify-around px-2 flex-shrink-0">
      
      <button 
        onClick={() => setActiveTab('chat')}
        className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-300 ${activeTab === 'chat' ? 'text-blue-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <div className={`p-1.5 rounded-xl mb-0.5 transition-colors ${activeTab === 'chat' ? 'bg-blue-100' : 'bg-transparent'}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
        </div>
        <span className="text-[10px] font-bold">Chat</span>
      </button>

      <button 
        onClick={() => hasAnalysis && setActiveTab('analysis')}
        disabled={!hasAnalysis}
        className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-300 ${activeTab === 'analysis' ? 'text-emerald-600 -translate-y-1' : (hasAnalysis ? 'text-slate-400 hover:text-slate-600' : 'text-slate-200 cursor-not-allowed')}`}
      >
         <div className={`p-1.5 rounded-xl mb-0.5 transition-colors relative ${activeTab === 'analysis' ? 'bg-emerald-100' : 'bg-transparent'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            {!hasAnalysis && <div className="absolute top-1 right-1 w-2 h-2 bg-slate-200 rounded-full border border-white"></div>}
        </div>
        <span className="text-[10px] font-bold">Análisis</span>
      </button>

      <button 
        onClick={() => hasResults && setActiveTab('results')}
        disabled={!hasResults}
        className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-300 ${activeTab === 'results' ? 'text-indigo-600 -translate-y-1' : (hasResults ? 'text-slate-400 hover:text-slate-600' : 'text-slate-200 cursor-not-allowed')}`}
      >
         <div className={`p-1.5 rounded-xl mb-0.5 transition-colors relative ${activeTab === 'results' ? 'bg-indigo-100' : 'bg-transparent'}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
             {!hasResults && <div className="absolute top-1 right-1 w-2 h-2 bg-slate-200 rounded-full border border-white"></div>}
         </div>
        <span className="text-[10px] font-bold">Lugares</span>
      </button>

      {hasDoctor && (
        <button 
            onClick={() => setActiveTab('doctor')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-300 ${activeTab === 'doctor' ? 'text-indigo-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600'}`}
        >
            <div className={`p-1.5 rounded-xl mb-0.5 transition-colors ${activeTab === 'doctor' ? 'bg-indigo-100' : 'bg-transparent'} relative`}>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></div>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </div>
            <span className="text-[10px] font-bold text-indigo-600">Dr.</span>
        </button>
      )}

    </div>
  );
};
