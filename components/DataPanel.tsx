
import React, { useRef, useState, useMemo } from 'react';
import { RagDocument, KnowledgeSource } from '../types';

interface DataPanelProps {
  files: RagDocument[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (fileId: string) => Promise<void>;
  isUploading: boolean;
  
  sources?: KnowledgeSource[];
  onToggleSource?: (id: string) => void;
  onClose?: () => void; // New prop for closing the panel
}

export const DataPanel: React.FC<DataPanelProps> = ({ 
    files, 
    onUpload, 
    onDelete, 
    isUploading,
    sources = [],
    onToggleSource,
    onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'sources'>('sources');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  // Group sources logically for display
  const groupedSources = useMemo(() => {
      return {
          'Dolencia & Protocolos': sources.filter(s => s.category === 'Protocolos'),
          'Farmacia & Precios': sources.filter(s => s.category === 'Farmacia'),
          'Directorio & Seguros': sources.filter(s => s.category === 'Directorio' || s.category === 'Seguros'),
      };
  }, [sources]);

  return (
    <section className="col-span-12 lg:col-span-4 h-full bg-white/90 backdrop-blur-xl lg:rounded-[2.5rem] shadow-lg border border-white flex flex-col overflow-hidden relative z-10 animate-fade-enter min-h-0">
      
      {/* Header with Tabs and Close Button */}
      <div className="px-5 py-4 border-b border-slate-50 bg-violet-50/30 shrink-0">
        <div className="flex justify-between items-start mb-4">
             <span className="text-sm font-bold text-violet-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                Base de Conocimiento
             </span>
             
             {onClose && (
                 <button 
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition"
                 >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
             )}
        </div>
        
        <div className="flex bg-slate-100/50 p-1 rounded-xl">
             <button 
                onClick={() => setActiveTab('sources')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'sources' ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Fuentes Oficiales
             </button>
             <button 
                onClick={() => setActiveTab('files')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'files' ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Mis Archivos
             </button>
        </div>
      </div>

      <div className="p-5 flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6">
          
          {/* === TAB: SOURCES (Categorized) === */}
          {activeTab === 'sources' && (
              <div className="space-y-6 animate-fade-enter">
                  <div className="bg-violet-50 border border-violet-100 p-4 rounded-xl flex gap-3">
                      <div className="text-xl">🏛️</div>
                      <div className="text-[11px] text-violet-800 leading-relaxed">
                          <p className="font-bold mb-1">Contexto Automático</p>
                          Doctoi seleccionará automáticamente la categoría relevante según lo que preguntes (síntomas, medicinas o clínicas).
                      </div>
                  </div>

                  {Object.entries(groupedSources).map(([categoryName, categorySources]) => (
                      categorySources.length > 0 && (
                          <div key={categoryName} className="space-y-3">
                              <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                                  {categoryName}
                              </h4>
                              {categorySources.map(source => (
                                  <div key={source.id} className={`p-3 rounded-xl border transition-all ${source.isActive ? 'bg-white border-violet-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                       <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{source.icon || '🔗'}</span>
                                                <div>
                                                    <h4 className={`text-sm font-bold ${source.isActive ? 'text-slate-700' : 'text-slate-500'}`}>{source.name}</h4>
                                                </div>
                                            </div>
                                            
                                            {onToggleSource && (
                                                <button 
                                                    onClick={() => onToggleSource(source.id)}
                                                    className={`relative w-9 h-5 rounded-full transition-colors ${source.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                >
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${source.isActive ? 'left-5' : 'left-1'}`}></div>
                                                </button>
                                            )}
                                       </div>
                                       <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{source.description}</p>
                                       <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1.5 inline-flex items-center gap-1">
                                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                           Ver fuente original
                                       </a>
                                  </div>
                              ))}
                          </div>
                      )
                  ))}
              </div>
          )}

          {/* === TAB: FILES === */}
          {activeTab === 'files' && (
            <div className="space-y-6 animate-fade-enter">
                {/* Upload Area */}
                <div 
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group
                        ${dragActive ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'}
                    `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        accept=".pdf,.txt,.md,.csv" 
                        onChange={handleChange}
                        disabled={isUploading}
                    />
                    
                    {isUploading ? (
                        <div className="flex flex-col items-center animate-pulse">
                            <div className="w-10 h-10 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin mb-3"></div>
                            <span className="text-sm font-bold text-violet-600">Subiendo a Gemini...</span>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            </div>
                            <p className="text-sm font-bold text-slate-700">Haz clic o arrastra un archivo</p>
                            <p className="text-xs text-slate-400 mt-1">PDF, TXT o MD (Max 10MB)</p>
                        </>
                    )}
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs text-slate-500">
                     Sube tus resultados de laboratorio o recetas para que la IA los analice en esta sesión.
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Archivos Personales</h4>
                        {files.map((file) => (
                            <div key={file.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 group hover:border-violet-200 transition">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase shrink-0">
                                    {file.displayName.split('.').pop()?.slice(0,3) || 'DOC'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="text-sm font-bold text-slate-700 truncate">{file.displayName}</h5>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {file.state === 'ACTIVE' ? (
                                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Listo
                                            </span>
                                        ) : file.state === 'FAILED' ? (
                                            <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Error
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Procesando
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onDelete(file.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          )}
      </div>
    </section>
  );
};
