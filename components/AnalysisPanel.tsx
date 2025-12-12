import React from 'react';
import { TriageAnalysis, UrgencyLevel } from '../types';

interface AnalysisPanelProps {
  analysis: TriageAnalysis;
  onContactDoctor?: () => void;
  userInsurance?: string;
}

const getUrgencyColors = (level: UrgencyLevel) => {
    switch(level) {
        case UrgencyLevel.LOW: return { text: 'text-emerald-600', bg: 'bg-emerald-100', gradient: 'from-emerald-400 to-green-400', width: '25%' };
        case UrgencyLevel.MODERATE: return { text: 'text-amber-600', bg: 'bg-amber-100', gradient: 'from-amber-400 to-orange-400', width: '50%' };
        case UrgencyLevel.HIGH: return { text: 'text-orange-600', bg: 'bg-orange-100', gradient: 'from-orange-400 to-red-400', width: '75%' };
        case UrgencyLevel.EMERGENCY: return { text: 'text-red-600', bg: 'bg-red-100', gradient: 'from-red-500 to-red-700', width: '100%' };
        default: return { text: 'text-slate-600', bg: 'bg-slate-100', gradient: 'from-slate-400', width: '0%' };
    }
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis, onContactDoctor, userInsurance }) => {
  const colors = getUrgencyColors(analysis.urgency);

  return (
    <section className="col-span-12 lg:col-span-4 h-full bg-white/80 backdrop-blur-xl lg:rounded-[2.5rem] shadow-lg border-b lg:border border-white flex flex-col overflow-hidden relative z-10 animate-fade-enter min-h-0">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-50 bg-blue-50/30 flex justify-between items-center shrink-0">
        <span className="text-sm font-bold text-blue-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
          Análisis Clínico
        </span>
        <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{analysis.confidence}% Confianza</span>
      </div>

      {/* Scrollable Content */}
      <div className="p-6 overflow-y-auto space-y-6 no-scrollbar flex-1 min-h-0">
        {/* Specialty */}
        <div className="text-center mt-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-3 text-3xl">
             🩺
          </div>
          <h3 className="text-xl font-bold text-slate-800">{analysis.specialty}</h3>
          <p className="text-xs text-slate-500 mt-1">{analysis.specialtyDescription}</p>
        </div>

        {/* Urgency Bar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex justify-between text-xs mb-2 font-semibold">
            <span className="text-slate-500">Nivel de Urgencia</span>
            <span className={colors.text}>{analysis.urgency}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
                className={`bg-gradient-to-r ${colors.gradient} h-2 rounded-full shadow-sm transition-all duration-1000 ease-out`} 
                style={{ width: colors.width }}
            ></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-tight">{analysis.urgencyExplanation}</p>
        </div>

        {/* Detected Symptoms */}
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Síntomas Detectados</span>
          <div className="flex flex-wrap gap-2">
            {analysis.detectedSymptoms.map((sym, idx) => (
                 <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200">{sym}</span>
            ))}
          </div>
        </div>

        {/* Advice */}
        <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
          <h4 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Recomendaciones
          </h4>
          <ul className="text-[11px] text-emerald-700 space-y-1 list-disc list-inside">
            {analysis.advice.map((item, idx) => (
                <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sticky Footer Action */}
      {onContactDoctor && (
        <div className="p-4 bg-white border-t border-slate-50 shrink-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <button 
                onClick={onContactDoctor}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 group"
            >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Disponible ahora</span>
                    <span className="text-base font-bold">Consultar Especialista</span>
                </div>
            </button>
        </div>
      )}
    </section>
  );
};