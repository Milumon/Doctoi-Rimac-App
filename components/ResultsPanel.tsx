
import React from 'react';
import { MedicalCenter } from '../types';

interface ResultsPanelProps {
  centers: MedicalCenter[];
  onSelectCenter: (center: MedicalCenter) => void;
  userInsurance: string;
  userDistrict: string;
  flow: 'triage' | 'pharmacy' | 'directory' | null;
  query?: string;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ centers, onSelectCenter, userInsurance, userDistrict, flow, query }) => {
    
  // Filter Logic
  const filteredCenters = centers.filter(c => {
      // 1. Filter by Type based on Flow
      if (flow === 'pharmacy') {
          if (c.type !== 'Farmacia') return false;
      } else if (flow === 'triage') {
          // Triage mode: Show Clinics, Hospitals, etc., but NOT Pharmacies
          if (c.type === 'Farmacia') return false;
      }
      // Directory Flow: Shows everything unless filtered by query below.

      // 2. DIRECTORY SEARCH LOGIC (Fuzzy Text Match)
      if (flow === 'directory' && query) {
          const q = query.toLowerCase();
          // Match name OR district OR type
          const textMatch = c.name.toLowerCase().includes(q) || 
                            c.district.toLowerCase().includes(q) || 
                            c.type.toLowerCase().includes(q);
          return textMatch;
      }

      // 3. STANDARD LOCATION MATCH (For Triage and Pharmacy flows)
      const normalizedUserLoc = userDistrict.toLowerCase().trim();
      const normalizedCenterDist = c.district.toLowerCase().trim();
      
      // Strict filtering logic
      let locationMatch = false;
      
      if (normalizedCenterDist === normalizedUserLoc) {
          locationMatch = true;
      } else if (normalizedCenterDist.includes(normalizedUserLoc) || normalizedUserLoc.includes(normalizedCenterDist)) {
          // Fallback for partial matches (e.g. "Lima" vs "Lima Cercado")
          locationMatch = true;
      } else if (normalizedUserLoc === 'lima' && (normalizedCenterDist === 'lima cercado' || normalizedCenterDist === 'cercado de lima')) {
          // Explicit handle for Lima generic
          locationMatch = true;
      }

      if (!locationMatch) return false;

      // 4. Insurance Logic (Only for Triage)
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

  }).sort((a, b) => {
      return b.rating - a.rating;
  });

  // Fallback logic: Only show "Recommended" nearby if STRICT filter found 0 results.
  // This prevents "Lima" showing "San Borja" clinics unless absolutely necessary.
  let displayCenters = filteredCenters;
  let isFallback = false;

  if (filteredCenters.length === 0 && flow !== 'directory') {
      isFallback = true;
      // Try to find neighbors if user is in a known hub, but label them as such
      const normalizedUserLoc = userDistrict.toLowerCase().trim();
      const isLimaHub = ['san borja', 'surco', 'santiago de surco', 'miraflores', 'san isidro', 'la molina', 'lima', 'jesus maría', 'lince', 'magdalena'].some(d => normalizedUserLoc.includes(d));
      
      if (isLimaHub) {
           displayCenters = centers.filter(c => 
                ['San Borja', 'Santiago de Surco', 'Miraflores', 'San Isidro', 'Jesús María', 'Lince', 'Lima'].includes(c.district) &&
                c.type !== 'Farmacia' // Assuming triage fallback
           ).slice(0, 4);
      } else {
           displayCenters = centers.slice(0, 4);
      }
  }

  const headerColor = flow === 'pharmacy' ? 'blue' : (flow === 'directory' ? 'indigo' : 'emerald');
  
  let title = `Resultados`;
  if (flow === 'pharmacy') title = `Farmacias en ${userDistrict}`;
  else if (flow === 'directory') title = `Directorio Médico`;
  else title = `Recomendados (${userDistrict})`;

  return (
    <section className="col-span-12 lg:col-span-4 h-full bg-white/80 backdrop-blur-xl rounded-3xl lg:rounded-[2.5rem] shadow-lg border-b lg:border border-white flex flex-col overflow-hidden z-10 animate-fade-enter">
      <div className={`px-6 py-5 border-b border-slate-50 bg-${headerColor}-50/30 flex justify-between items-center`}>
        <span className={`text-sm font-bold text-${headerColor}-900 flex items-center gap-2`}>
          <svg className={`w-4 h-4 text-${headerColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
          {title}
        </span>
        {flow !== 'directory' && <button className={`text-xs font-medium text-${headerColor}-600 hover:underline`}>Ver Mapa</button>}
      </div>

      {query && (flow === 'pharmacy' || flow === 'directory') && (
          <div className={`px-6 py-2 bg-${headerColor}-50/50 border-b border-${headerColor}-100`}>
              <p className={`text-xs text-${headerColor}-700`}>Buscando: <strong>{query}</strong></p>
          </div>
      )}

      <div className="p-4 pb-4 overflow-y-auto space-y-4 bg-slate-50/50 flex-1 no-scrollbar">
        {displayCenters.length === 0 && (
             <div className="text-center p-10 text-slate-400 text-sm">No se encontraron lugares exactos.</div>
        )}
        
        {isFallback && displayCenters.length > 0 && (
             <div className="text-center px-4 py-2 text-xs text-amber-600 bg-amber-50 rounded-xl border border-amber-100 mb-2">
                No encontramos centros exactos con tu seguro en <strong>{userDistrict}</strong>. Mostrando opciones cercanas:
             </div>
        )}

        {displayCenters.map((center) => (
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
      </div>
    </section>
  );
};