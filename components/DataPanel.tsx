
import React, { useRef, useState } from 'react';
import { RagDocument } from '../types';

interface DataPanelProps {
  files: RagDocument[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (fileId: string) => Promise<void>;
  isUploading: boolean;
}

export const DataPanel: React.FC<DataPanelProps> = ({ files, onUpload, onDelete, isUploading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

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

  return (
    <section className="col-span-12 lg:col-span-4 h-full bg-white/90 backdrop-blur-xl lg:rounded-[2.5rem] shadow-lg border border-white flex flex-col overflow-hidden relative z-10 animate-fade-enter min-h-0">
      
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-50 bg-violet-50/30 shrink-0 flex items-center justify-between">
        <span className="text-sm font-bold text-violet-900 flex items-center gap-2">
           <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
           Mis Documentos (RAG)
        </span>
        <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-bold">
            {files.length} Archivos
        </span>
      </div>

      <div className="p-6 flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6">
          
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
                accept=".pdf,.txt,.md,.csv" // Gemini supports mainly text/pdf
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

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
              <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div className="text-xs text-blue-800 leading-relaxed">
                  <p className="font-bold mb-1">¿Cómo funciona?</p>
                  Sube documentos médicos (resultados de lab, recetas, manuales de seguros) y pregúntale a Doctoi sobre ellos. La IA usará esta información para responderte.
              </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
              <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Archivos Activos</h4>
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
    </section>
  );
};
