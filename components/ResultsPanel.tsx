
import React from 'react';
import { MedicalCenter, TriageAnalysisWithCenters, RecommendedCenter } from '../types';

interface ResultsPanelProps {
  centers: MedicalCenter[]; // Legacy/Fallback Data
  onSelectCenter: (center: MedicalCenter) => void; // Works for both if we cast RAG centers to MedicalCenter when detailed
  userInsurance: string;
  userDistrict: string;
  flow: 'triage' | 'pharmacy' | 'directory' | null;
  query?: string;
  analysis?: TriageAnalysisWithCenters | null; // RAG Analysis Data
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ 
    centers, 
    onSelectCenter, 
    userInsurance, 
    userDistrict, 
    flow, 
    query,
    analysis 
}) => {
    
  // Check if we have RAG results
  const ragResults = analysis?.recommendedCenters;
  const hasRagResults = ragResults && ragResults.length > 0;

  // Filter Logic for Legacy/Fallback Data
  const filteredCenters = centers.filter(c => {
      if (flow === 'pharmacy') {
          if (c.type !== 'Farmacia') return false;
      } else if (flow === 'triage') {
          if (c.type === 'Farmacia') return false;
      }

      if (flow === 'directory' && query) {
          const q = query.toLowerCase();
          const textMatch = c.name.toLowerCase().includes(q) || 
                            c.district.toLowerCase().includes(q) || 
                            c.type.toLowerCase().includes(q);
          return textMatch;
      }

      const normalizedUserLoc = userDistrict.toLowerCase();
      const normalizedCenterDist = c.district.toLowerCase();
      const isLimaHub = ['san borja', 'surco', 'santiago de surco', 'miraflores', 'san isidro', 'la molina', 'lima', 'jesus maría', 'lince', 'magdalena', 'callao'].some(d => normalizedUserLoc.includes(d));
      
      let locationMatch = false;
      if (normalizedCenterDist.includes(normalizedUserLoc) || normalizedUserLoc.includes(normalizedCenterDist)) {
          locationMatch = true;
      } else if (isLimaHub && ['San Borja', 'Santiago de Surco', 'Miraflores', 'San Isidro', 'La Molina', 'Lima Cercado', 'Jesus María', 'Callao'].includes(c.district)) {
          locationMatch = true; 
      } else if (c.district === 'Provincia' && !isLimaHub) {
          locationMatch = true;
      }

      if (!locationMatch) return false;

      if (flow === 'triage') {
          let insuranceMatch = false;
          if (userInsurance === 'Particular') {
              insuranceMatch = true; 
          } else if (userInsurance === 'Sin Seguro') {
              insuranceMatch = c.insurances.includes('SIS') || c.insurances.includes('Particular');
          } else {
              insuranceMatch = c.insurances.includes(userInsurance) || c.insurances.includes('Particular');
          }
          return insuranceMatch;
      }

      return true;
  }).sort((a, b) => b.rating - a.rating);

  const displayFallbackCenters = filteredCenters.length > 0 ? filteredCenters : centers.slice(0, 4);
  const headerColor = flow === 'pharmacy' ? 'blue' : (flow === 'directory' ? 'indigo' : 'emerald');
  
  let title = `Resultados`;
  if (hasRagResults) title = `Centros Recomendados (${ragResults.length})`;
  else if (flow === 'pharmacy') title = `Farmacias en ${userDistrict}`;
  else if (flow === 'directory') title = `Directorio Médico`;
  else title = `Recomendados (${userDistrict})`;

  return (
    <section className="col-span-12 lg:col-span-4 h-full bg-white/80 backdrop-blur-xl lg:rounded-[2.5rem] shadow-lg border-b lg:border border-white flex flex-col overflow-hidden z-10 animate-fade-enter">
      <div className={`px-6 py-5 border-b border-slate-50 bg-${headerColor}-50/30 flex justify-between items-center`}>
        <span className={`text-sm font-bold text-${headerColor}-900 flex items-center gap-2`}>
          <svg className={`w-4 h-4 text-${headerColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
          {title}
        </span>
        {/* Show source attribution if RAG was used */}
        {analysis?.sourcesUsed && analysis.sourcesUsed.length > 0 && (
             <span className="text-[9px] text-slate-400 bg-white px-2 py-1 rounded-full border border-slate-100 shadow-sm max-w-[120px] truncate" title={analysis.sourcesUsed.join(', ')}>
                📄 Fuente: {analysis.sourcesUsed[0]}
             </span>
        )}
      </div>

      {/* INSURANCE COVERAGE INFO (RAG) */}
      {analysis?.insuranceCoverage && analysis.insuranceCoverage.details && (
          <div className="mx-4 mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-2">
              <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   </div>
                   <div>
                       <h4 className="text-xs font-bold text-blue-800">Tu Cobertura ({userInsurance})</h4>
                       <p className="text-xs text-blue-600/90 mt-0.5 leading-relaxed">{analysis.insuranceCoverage.details}</p>
                       {analysis.insuranceCoverage.copayEstimate && (
                           <p className="text-[10px] font-bold text-blue-500 mt-1">💰 {analysis.insuranceCoverage.copayEstimate}</p>
                       )}
                   </div>
              </div>
              {analysis.insuranceCoverage.requirements.length > 0 && (
                   <div className="ml-11 flex flex-wrap gap-1">
                       {analysis.insuranceCoverage.requirements.map((req, idx) => (
                           <span key={idx} className="text-[9px] bg-white px-2 py-0.5 rounded-full border border-blue-100 text-blue-400 font-medium">{req}</span>
                       ))}
                   </div>
              )}
          </div>
      )}

      <div className="p-4 pb-4 overflow-y-auto space-y-4 bg-slate-50/50 flex-1 no-scrollbar">
        
        {/* CASE 1: RAG RESULTS */}
        {hasRagResults && ragResults.map((center, idx) => (
             <div key={idx} className="bg-white p-0 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition-all group overflow-hidden relative">
                {/* Verified Badge */}
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-xl z-10 shadow-sm">
                    Verificado
                </div>

                <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-emerald-50/10">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{center.type || 'Centro de Salud'}</span>
                </div>
                
                <div className="p-4">
                    <h4 className="font-bold text-slate-800 text-base leading-tight">{center.name}</h4>
                    
                    <div className="mt-2 space-y-1.5">
                        {center.reason && (
                            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100/50">
                                <p className="text-[10px] text-emerald-800 leading-tight font-medium">
                                    💡 {center.reason}
                                </p>
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-1 text-xs text-slate-500 mt-2">
                             {center.address && (
                                 <div className="flex items-start gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                                    <span>{center.address} {center.district ? `(${center.district})` : ''}</span>
                                 </div>
                             )}
                             {center.phone && (
                                 <div className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                    <span className="font-mono text-slate-600">{center.phone}</span>
                                 </div>
                             )}
                             {center.operatingHours && (
                                 <div className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    <span>{center.operatingHours}</span>
                                 </div>
                             )}
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                         {center.phone && (
                            <a href={`tel:${center.phone}`} className="flex-1 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition text-center flex items-center justify-center shadow-blue-100 shadow-md">Llamar</a>
                         )}
                         {center.address && (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center.address + ' ' + (center.district || 'Lima'))}`} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-white hover:border-slate-300 transition text-center flex items-center justify-center">Mapa</a>
                         )}
                    </div>
                </div>
             </div>
        ))}

        {/* CASE 2: FALLBACK RESULTS (If RAG empty) */}
        {!hasRagResults && displayFallbackCenters.map((center) => (
            <div key={center.id} className="bg-white p-0 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{center.type}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${center.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${center.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></div> 
                        {center.isOpen ? 'Abierto' : `Cerrado (${center.closingTime || '8am'})`}
                    </span>
                </div>
                <div className="p-4">
                    <h4 className="font-bold text-slate-800 text-base">{center.name}</h4>
                    <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500">
                        {flow === 'triage' && (
                            <div className="flex items-center gap-1">
                                {(center.insurances.includes(userInsurance) || (userInsurance === 'Sin Seguro' && (center.insurances.includes('SIS') || center.insurances.includes('Particular')))) ? (
                                    <>
                                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <span className="font-medium text-slate-700">Compatible ({userInsurance})</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <span className="text-slate-400">Seguro no listado</span>
                                    </>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                            <span>{center.district} - {center.address}</span>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <a href={`tel:${center.phone}`} className="flex-1 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-white hover:border-blue-300 transition text-center flex items-center justify-center">Llamar</a>
                        <button onClick={() => onSelectCenter(center)} className={`flex-1 py-2 text-white text-xs font-bold rounded-xl transition shadow-md ${flow === 'pharmacy' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : (flow === 'directory' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100')}`}>Ver más</button>
                    </div>
                </div>
            </div>
        ))}

        {/* Empty State */}
        {!hasRagResults && displayFallbackCenters.length === 0 && (
             <div className="text-center p-10 text-slate-400 text-sm">No se encontraron lugares específicos.</div>
        )}
      </div>
    </section>
  );
};
