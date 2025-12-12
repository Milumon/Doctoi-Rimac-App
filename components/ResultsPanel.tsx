
import React, { useState, useMemo } from 'react';
import { MedicalCenter, INSURANCES } from '../types';
import { DEPARTMENTS, PROVINCES, DISTRICTS } from '../data/ubigeo';

interface ResultsPanelProps {
  onSelectCenter: (center: MedicalCenter) => void;
  userInsurance: string;
  userDistrict: string;
  flow: 'triage' | 'pharmacy' | 'directory' | null;
  query?: string;
  onRequestLocation?: () => void;
  isRequestingLocation?: boolean;
  onSetLocation?: (district: string) => void;
  onSetInsurance?: (insurance: string) => void;
  dynamicResults?: MedicalCenter[];
  isLoading?: boolean;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ 
    onSelectCenter, 
    userInsurance, 
    userDistrict, 
    flow, 
    onRequestLocation,
    isRequestingLocation,
    onSetLocation,
    onSetInsurance,
    dynamicResults = [],
    isLoading = false
}) => {
  
  const [isManualLocationMode, setIsManualLocationMode] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedProvId, setSelectedProvId] = useState('');
  
  // Direct use of Ubigeo Data (Lima Only)
  const { activeDepartments, displayProvinces, displayDistricts } = useMemo(() => {
    return {
        activeDepartments: DEPARTMENTS,
        displayProvinces: PROVINCES.filter(p => p.department_id === selectedDeptId),
        displayDistricts: DISTRICTS.filter(d => d.province_id === selectedProvId)
    };
  }, [selectedDeptId, selectedProvId]);

  const headerColor = flow === 'pharmacy' ? 'blue' : (flow === 'directory' ? 'indigo' : 'emerald');
  
  // -- FEATURED RESULT LOGIC (Only for Directory) --
  const featuredResult = flow === 'directory' && dynamicResults.length > 0 ? dynamicResults[0] : null;
  const otherResults = flow === 'directory' && dynamicResults.length > 0 ? dynamicResults.slice(1) : dynamicResults;

  // -- RENDER: LOCATION SETUP (If no district set AND not loading AND no results AND NOT Directory mode) --
  // Directory mode skips this screen because it searches globally first.
  if (!userDistrict && !isLoading && dynamicResults.length === 0 && flow !== 'directory') {
      return (
        <section className="col-span-12 lg:col-span-4 h-full bg-white/90 backdrop-blur-xl rounded-3xl lg:rounded-[2.5rem] shadow-lg border border-slate-100 flex flex-col overflow-hidden z-10 animate-fade-enter min-h-0 relative">
             <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 animate-bounce ${flow === 'pharmacy' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                     <svg className={`w-10 h-10 text-${headerColor}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
                
                <div>
                    <h3 className="text-xl font-bold text-slate-800">¿Dónde buscamos?</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-[250px] mx-auto">
                        Usaremos Google Maps para encontrar {flow === 'pharmacy' ? 'farmacias' : 'centros'} reales cerca de ti en Lima.
                    </p>
                </div>

                {!isManualLocationMode ? (
                    <div className="w-full space-y-3">
                         <button 
                            onClick={onRequestLocation}
                            disabled={isRequestingLocation}
                            className={`w-full py-3 text-white font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 ${flow === 'pharmacy' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                         >
                            {isRequestingLocation ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Obteniendo coordenadas...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18d-2 2-4-4-5-8 5-8 4 4 2 2z"></path></svg>
                                    Usar GPS (Preciso)
                                </>
                            )}
                         </button>
                         <button 
                            onClick={() => setIsManualLocationMode(true)}
                            className="w-full py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition"
                         >
                            Seleccionar Distrito
                         </button>
                    </div>
                ) : (
                    <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl text-left animate-fade-enter">
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-bold text-slate-400 uppercase">Selección Manual</span>
                             <button onClick={() => setIsManualLocationMode(false)} className="text-xs text-blue-600 font-bold hover:underline">Cancelar</button>
                         </div>
                         
                         <select 
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 bg-white"
                         >
                            <option value="">Departamento</option>
                            {activeDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                         </select>

                         <select 
                            value={selectedProvId}
                            onChange={(e) => setSelectedProvId(e.target.value)}
                            disabled={!selectedDeptId}
                            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 bg-white disabled:opacity-50"
                         >
                            <option value="">Provincia</option>
                            {displayProvinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                         </select>

                         <select 
                            onChange={(e) => {
                                const dist = DISTRICTS.find(d => d.id === e.target.value);
                                const dept = DEPARTMENTS.find(d => d.id === selectedDeptId);
                                const prov = PROVINCES.find(p => p.id === selectedProvId);
                                
                                if (dist && onSetLocation && dept && prov) {
                                    onSetLocation(`${dist.name}, ${prov.name}, ${dept.name}`);
                                }
                            }}
                            disabled={!selectedProvId}
                            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 bg-white disabled:opacity-50"
                         >
                            <option value="">Distrito</option>
                            {displayDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                         </select>
                    </div>
                )}
             </div>
        </section>
      );
  }

  // -- RENDER: LIST OF CENTERS --
  return (
    <section className="col-span-12 lg:col-span-4 h-full bg-white/90 backdrop-blur-xl lg:rounded-[2.5rem] shadow-lg border border-white flex flex-col overflow-hidden relative z-10 animate-fade-enter min-h-0">
      
      {/* Header with Filters */}
      <div className={`px-6 py-5 border-b border-slate-50 bg-${headerColor}-50/30 shrink-0 flex flex-col gap-3`}>
        <div className="flex justify-between items-center">
            <span className={`text-sm font-bold text-${headerColor}-900 flex items-center gap-2`}>
            {flow === 'pharmacy' ? (
                <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                Farmacias y Boticas
                </>
            ) : flow === 'directory' ? (
                <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                Directorio Médico
                </>
            ) : (
                <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                Clínicas Cercanas
                </>
            )}
            </span>
            <div className="flex items-center gap-2">
                {userDistrict ? (
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 hidden sm:block">Ubicación de Búsqueda</span>
                        <span className={`text-[10px] font-bold px-2 py-1 bg-${headerColor}-100 text-${headerColor}-700 rounded-lg flex items-center gap-1 max-w-[150px] truncate border border-${headerColor}-200`}>
                            📍 {userDistrict.split(',')[0]} 
                            {onSetLocation && (
                                <button onClick={() => onSetLocation('')} className="ml-1 hover:text-red-500">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            )}
                        </span>
                    </div>
                ) : (
                     <span className={`text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-full flex items-center gap-1`}>
                        🌎 Búsqueda Global
                    </span>
                )}
            </div>
        </div>

        {/* Insurance Filter (Visual only for Maps mode as Maps doesn't filter by insurance reliably) */}
        {flow === 'triage' && onSetInsurance && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar opacity-60 pointer-events-none grayscale">
                {INSURANCES.map(ins => (
                    <button key={ins} className="whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold border bg-white text-slate-400 border-slate-100">
                        {ins}
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* List */}
      <div className="p-4 overflow-y-auto space-y-3 flex-1 no-scrollbar min-h-0">
        
        {isLoading ? (
            // LOADING STATE WITH EXPLICIT LOCATION INDICATOR
            <div className="space-y-4 animate-pulse p-2">
                {/* Visual Feedback for User Location */}
                <div className="flex flex-col items-center justify-center py-4 text-center">
                     <div className={`p-3 rounded-full bg-${headerColor}-50 mb-3 relative`}>
                        <div className={`absolute inset-0 rounded-full bg-${headerColor}-400 opacity-20 animate-ping`}></div>
                        <svg className={`w-6 h-6 text-${headerColor}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                     </div>
                     <h4 className="text-sm font-bold text-slate-700">
                        {userDistrict ? `Buscando alrededor de:` : 'Buscando en Google Maps...'}
                     </h4>
                     {userDistrict && (
                         <p className={`text-xs font-bold text-${headerColor}-600 mt-1 px-3 py-1 bg-${headerColor}-50 rounded-lg shadow-sm border border-${headerColor}-100`}>
                            📍 {userDistrict}
                         </p>
                     )}
                     <p className="text-[10px] text-slate-400 mt-2">
                        Filtrando {flow === 'pharmacy' ? 'farmacias' : 'centros'} reales y verificando horarios...
                     </p>
                </div>

                {/* Card Skeletons */}
                {[1,2,3].map(i => (
                    <div key={i} className="p-4 rounded-2xl border border-slate-100 bg-white opacity-60">
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-slate-100 rounded w-1/2 mb-4"></div>
                        <div className="flex gap-2">
                            <div className="h-5 w-16 bg-slate-100 rounded-full"></div>
                            <div className="h-5 w-16 bg-slate-100 rounded-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        ) : dynamicResults.length > 0 ? (
            <>
                {/* DIRECTORY MODE: HERO RESULT */}
                {featuredResult && (
                    <div className="mb-6 animate-fade-enter">
                         <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Resultado Principal</span>
                         </div>
                         <div className="bg-white rounded-3xl overflow-hidden border border-indigo-100 shadow-xl shadow-indigo-100/50">
                             <div className="h-24 bg-gradient-to-r from-indigo-500 to-blue-500 relative p-4 flex items-end">
                                 <h2 className="text-white font-bold text-lg leading-tight shadow-black drop-shadow-md">{featuredResult.name}</h2>
                             </div>
                             <div className="p-4 space-y-3">
                                 {featuredResult.description && <p className="text-xs text-slate-500 line-clamp-2">{featuredResult.description}</p>}
                                 
                                 <div className="flex items-start gap-2 text-xs text-slate-600">
                                     <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                                     {featuredResult.address}
                                 </div>
                                 <div className="flex items-center gap-2 text-xs text-slate-600">
                                     <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                     <span className="font-bold">{featuredResult.phone}</span>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 gap-2 mt-2">
                                     <a href={featuredResult.googleMapsUri} target="_blank" rel="noopener noreferrer" className="py-2 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs text-center border border-indigo-100 hover:bg-indigo-100 transition">
                                         Ver en Mapa
                                     </a>
                                     <a href={`tel:${featuredResult.phone}`} className="py-2 rounded-lg bg-indigo-600 text-white font-bold text-xs text-center hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                                         Llamar
                                     </a>
                                 </div>
                             </div>
                         </div>
                         {otherResults.length > 0 && (
                            <div className="mt-6 mb-2 px-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Alternativas Cercanas
                            </div>
                         )}
                    </div>
                )}

                {/* LIST OF OTHER RESULTS */}
                {otherResults.map((center) => (
                    <div 
                        key={center.id} 
                        onClick={() => {
                            if (center.googleMapsUri) window.open(center.googleMapsUri, '_blank');
                            else onSelectCenter(center);
                        }}
                        className="p-4 rounded-2xl border shadow-sm transition-all cursor-pointer group relative bg-white border-slate-100 hover:shadow-md hover:border-blue-300"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 pr-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${flow === 'pharmacy' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                                    Google Maps
                                </span>
                                <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight mt-0.5">{center.name}</h3>
                            </div>
                            
                            <div className="shrink-0 text-blue-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                            {center.address || userDistrict}
                        </div>
                    </div>
                ))}
            </>
        ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center opacity-60">
                <svg className="w-12 h-12 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="text-sm font-bold text-slate-500">Sin resultados en Maps</p>
                <p className="text-xs text-slate-400">Intenta otra ubicación o término de búsqueda.</p>
            </div>
        )}
      </div>
    </section>
  );
}
