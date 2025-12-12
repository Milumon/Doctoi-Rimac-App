import React from 'react';
import { MedicalCenter } from '../types';

interface DetailModalProps {
  center: MedicalCenter | null;
  onClose: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ center, onClose }) => {
  if (!center) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-enter p-4">
        <div className="bg-white w-full max-w-2xl h-auto max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative">
            {/* Header Image */}
            <div className="h-36 md:h-44 bg-gradient-to-br from-blue-600 to-emerald-500 relative shrink-0">
                <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur transition z-10">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                
                <div className="absolute inset-0 bg-black/10"></div>

                <div className="absolute bottom-6 left-6 text-white z-10 max-w-[80%]">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-white/20 backdrop-blur px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">{center.type}</span>
                        {center.isOpen ? (
                             <span className="bg-emerald-400/90 text-emerald-900 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-800"></div> Abierto
                             </span>
                        ) : (
                            <span className="bg-red-400/90 text-red-900 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase">Cerrado</span>
                        )}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold leading-tight">{center.name}</h2>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8 no-scrollbar">
                
                {/* Description */}
                {center.description && (
                    <div>
                        <p className="text-slate-600 text-sm leading-relaxed">{center.description}</p>
                    </div>
                )}

                {/* Key Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Horario
                        </span>
                        <span className="text-sm font-bold text-slate-800">{center.operatingHours || '24 Horas'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                             Teléfono
                        </span>
                        <span className="text-sm font-bold text-slate-800">{center.phone}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1 col-span-2 md:col-span-1">
                         <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                            Calificación
                         </span>
                        <span className="text-sm font-bold text-slate-800">{center.rating}/5.0 (Google Maps)</span>
                    </div>
                </div>

                {/* Requirements */}
                {center.requirements && center.requirements.length > 0 && (
                    <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
                        <h4 className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                            Requisitos para atención
                        </h4>
                        <ul className="space-y-2">
                            {center.requirements.map((req, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-xs text-amber-900/80">
                                    <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
                                    {req}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Lists */}
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm mb-3">Especialidades Principales</h4>
                        <div className="flex flex-wrap gap-2">
                            {center.specialties.map(s => (
                                <span key={s} className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium shadow-sm">{s}</span>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm mb-3">Seguros Aceptados</h4>
                        <div className="flex flex-wrap gap-2">
                            {center.insurances.map(ins => (
                                <span key={ins} className="text-xs bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    {ins}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-800 text-sm mb-3">Ubicación</h4>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3">
                             <div className="bg-white p-2 rounded-full shadow-sm text-red-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                             </div>
                             <div>
                                 <p className="font-bold text-slate-800 text-sm">{center.district}</p>
                                 <p className="text-slate-500 text-xs mt-0.5">{center.address}</p>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 gap-3 pt-2 mt-4 sticky bottom-0 bg-white pb-4 border-t border-slate-50">
                     <a href={`tel:${center.phone}`} className="py-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                        Llamar Ahora
                     </a>
                </div>
            </div>
        </div>
    </div>
  );
}