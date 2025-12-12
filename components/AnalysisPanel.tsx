
import React, { useState } from 'react';
import { TriageAnalysis, MedicineInfo, UrgencyLevel } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AnalysisPanelProps {
  analysis?: TriageAnalysis | null;
  pharmacyData?: MedicineInfo[] | null;
  flow: 'triage' | 'pharmacy' | 'directory' | null;
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

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis, pharmacyData, flow, onContactDoctor }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);

  // === RENDER FOR PHARMACY (VADEMECUM) ===
  if (flow === 'pharmacy' && pharmacyData && pharmacyData.length > 0) {
      const currentMed = pharmacyData[activeTab];

      return (
        <section className="col-span-12 lg:col-span-4 h-full bg-white/80 backdrop-blur-xl lg:rounded-[2.5rem] shadow-lg border-b lg:border border-white flex flex-col overflow-hidden relative z-10 animate-fade-enter min-h-0">
            {/* Pharmacy Header */}
            <div className="px-6 py-5 border-b border-blue-50 bg-blue-50/30 flex justify-between items-center shrink-0">
                <span className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    💊 {t.pharmacy.title}
                </span>
                {pharmacyData.length > 1 && (
                    <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{pharmacyData.length} {t.pharmacy.detectedCount}</span>
                )}
            </div>

            {/* Tabs if Multiple Meds */}
            {pharmacyData.length > 1 && (
                <div className="flex px-6 pt-4 gap-2 overflow-x-auto no-scrollbar">
                    {pharmacyData.map((med, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setActiveTab(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeTab === idx ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {med.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Content for Medication */}
            <div className="p-6 overflow-y-auto space-y-6 no-scrollbar flex-1 min-h-0">
                <div className="text-center mt-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-3 text-3xl">
                        💊
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{currentMed.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{currentMed.activeIngredient}</p>
                    
                    {currentMed.requiresPrescription && (
                        <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            <span className="text-xs font-bold text-amber-800">{t.pharmacy.prescriptionRequired}</span>
                        </div>
                    )}
                </div>

                {/* Purpose */}
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                    <h4 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-2">{t.pharmacy.purpose}</h4>
                    <p className="text-sm text-blue-900 leading-relaxed">{currentMed.purpose}</p>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{t.pharmacy.dosage}</span>
                        <p className="text-xs font-semibold text-slate-700">{currentMed.dosage}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{t.pharmacy.takenWith}</span>
                        <p className={`text-xs font-semibold ${currentMed.takenWithFood === 'Con alimentos' || currentMed.takenWithFood === 'With food' ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {currentMed.takenWithFood}
                        </p>
                    </div>
                </div>

                {/* Warnings */}
                {currentMed.warnings && currentMed.warnings.length > 0 && (
                    <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl">
                        <h4 className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1">
                            {t.pharmacy.warnings}
                        </h4>
                        <ul className="text-[11px] text-red-900 space-y-1 list-disc list-inside opacity-90">
                            {currentMed.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                    </div>
                )}
                
                {/* Interactions */}
                {currentMed.interactions && currentMed.interactions.length > 0 && (
                    <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
                        <h4 className="text-xs font-bold text-amber-800 mb-2">{t.pharmacy.interactions}</h4>
                        <div className="flex flex-wrap gap-2">
                            {currentMed.interactions.map((int, idx) => (
                                <span key={idx} className="text-[10px] bg-white border border-amber-200 text-amber-900 px-2 py-1 rounded-lg">
                                {int}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Alternatives */}
                {currentMed.alternatives && currentMed.alternatives.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">{t.pharmacy.alternatives}</h4>
                        <div className="flex flex-wrap gap-2">
                            {currentMed.alternatives.map((alt, idx) => (
                            <span key={idx} className="text-xs bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium">
                                {alt}
                            </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
             <div className="p-3 bg-slate-50 border-t border-slate-100 text-[9px] text-center text-slate-400">
                {t.pharmacy.disclaimer}
            </div>
        </section>
      );
  }

  // === RENDER FOR TRIAGE (SYMPTOMS) ===
  if (flow === 'triage' && analysis) {
    const colors = getUrgencyColors(analysis.urgency);

    return (
        <section className="col-span-12 lg:col-span-4 h-full bg-white/80 backdrop-blur-xl lg:rounded-[2.5rem] shadow-lg border-b lg:border border-white flex flex-col overflow-hidden relative z-10 animate-fade-enter min-h-0">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-50 bg-blue-50/30 flex justify-between items-center shrink-0">
            <span className="text-sm font-bold text-blue-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            {t.analysis.title}
            </span>
            <span className="text-[10px] font-bold px-2 py-1 bg-violet-100 text-violet-700 rounded-full border border-violet-200 flex items-center gap-1 shadow-sm">
                ✨ {t.analysis.aiGenerated}
            </span>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 no-scrollbar flex-1 min-h-0">
            <div className="text-center mt-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-3 text-3xl">
                🩺
            </div>
            <h3 className="text-xl font-bold text-slate-800">{analysis.specialty}</h3>
            <p className="text-xs text-slate-500 mt-1">{analysis.specialtyDescription}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between text-xs mb-2 font-semibold">
                <span className="text-slate-500">{t.analysis.urgencyLevel}</span>
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

            <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.analysis.detectedSymptoms}</span>
            <div className="flex flex-wrap gap-2">
                {analysis.detectedSymptoms.map((sym, idx) => (
                    <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200">{sym}</span>
                ))}
            </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
            <h4 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {t.analysis.recommendations}
            </h4>
            <ul className="text-[11px] text-emerald-700 space-y-1 list-disc list-inside">
                {analysis.advice.map((item, idx) => (
                    <li key={idx}>{item}</li>
                ))}
            </ul>
            </div>
        </div>

        {onContactDoctor && (
            <div className="p-4 bg-white border-t border-slate-50 shrink-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={onContactDoctor}
                    className="w-full py-4 bg-gradient-to-r from