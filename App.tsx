
import React, { useState, useRef } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { DetailModal } from './components/DetailModal';
import { Message, MedicalCenter } from './types';
import { medicalCenters } from './data/centers';
import { chatWithDoctoi } from './services/geminiService';

export default function App() {
  // State management simplified: Single source of truth is the message history and current context
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola. Soy Doctoi. Puedo ayudarte a pre-diagnosticar síntomas, encontrar farmacias o buscar clínicas. \n\nCuéntame, ¿cómo te puedo ayudar hoy?', sender: 'ai', type: 'text' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<MedicalCenter | null>(null);
  
  // Context extracted by AI to persist across the session
  const [userContext, setUserContext] = useState<{location?: string, insurance?: string}>({});
  const sessionRef = useRef(0);

  const addMessage = (
    text: string, 
    sender: 'user' | 'ai', 
    type: Message['type'] = 'text',
    extras: { analysisData?: any, medicalCentersData?: any } = {}
  ) => {
    setMessages(prev => [...prev, { 
        id: (Date.now() + Math.random()).toString(), 
        text, 
        sender, 
        type,
        ...extras
    }]);
  };

  const handleSendMessage = async (text: string) => {
    const currentSession = sessionRef.current;
    addMessage(text, 'user');
    setIsTyping(true);

    try {
        // Prepare history for context
        const history = messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        }));

        // Call the Unified Agent
        const agentResponse = await chatWithDoctoi(history, text, userContext);

        if (sessionRef.current !== currentSession) return;
        setIsTyping(false);

        // 1. Update Context if extracted
        if (agentResponse.extracted_context) {
            setUserContext(prev => ({
                ...prev,
                location: agentResponse.extracted_context.location || prev.location,
                insurance: agentResponse.extracted_context.insurance || prev.insurance
            }));
        }

        // 2. Respond with text first (empathy/questions)
        if (agentResponse.response_text) {
            addMessage(agentResponse.response_text, 'ai');
        }

        // 3. Handle Specific Actions
        if (agentResponse.action === 'perform_triage' && agentResponse.triage_analysis) {
            // Render Analysis Card
            addMessage('', 'ai', 'analysis', { analysisData: agentResponse.triage_analysis });
            
            // Automatically find relevant centers after triage
            const relevantCenters = filterCenters(
                'triage', 
                agentResponse.extracted_context.location || userContext.location || '',
                agentResponse.extracted_context.insurance || userContext.insurance || ''
            );
            
            if (relevantCenters.length > 0) {
                 setTimeout(() => {
                    addMessage('', 'ai', 'medical_centers', { medicalCentersData: relevantCenters });
                 }, 600);
            }
        } 
        else if (agentResponse.action === 'search_directory' || agentResponse.action === 'search_pharmacy') {
            const location = agentResponse.extracted_context.location || userContext.location || '';
            const query = agentResponse.extracted_context.symptoms_or_query || '';
            const type = agentResponse.action === 'search_pharmacy' ? 'pharmacy' : 'directory';

            const results = filterCenters(type, location, '', query);
            
            if (results.length > 0) {
                addMessage('', 'ai', 'medical_centers', { medicalCentersData: results });
            } else {
                 // Agent usually apologizes in text, but we can add a system note if needed
            }
        }

    } catch (e) {
        console.error(e);
        setIsTyping(false);
        addMessage("Lo siento, hubo un error procesando tu solicitud. Intenta de nuevo.", 'ai');
    }
  };

  // Simple logic to filter local data based on extracted context
  const filterCenters = (flow: 'triage' | 'pharmacy' | 'directory', location: string, insurance: string, query?: string) => {
      const normLoc = location.toLowerCase();
      const normIns = insurance.toLowerCase();
      const normQuery = query ? query.toLowerCase() : '';

      return medicalCenters.filter(c => {
          // 1. Type Filter
          if (flow === 'pharmacy' && c.type !== 'Farmacia') return false;
          if (flow === 'triage' && c.type === 'Farmacia') return false;

          // 2. Location Filter (Loose Match)
          const cDist = c.district.toLowerCase();
          const isLocationMatch = cDist.includes(normLoc) || normLoc.includes(cDist) || (normLoc.includes('lima') && ['San Borja', 'Miraflores', 'San Isidro', 'Surco'].includes(c.district));
          
          if (location && !isLocationMatch) return false;

          // 3. Insurance Filter (Only for Triage)
          if (flow === 'triage' && insurance) {
              const accepts = c.insurances.some(i => i.toLowerCase().includes(normIns) || i === 'Particular');
              if (!accepts) return false;
          }

          // 4. Query Filter (Directory/Pharmacy)
          if (query) {
              const textMatch = c.name.toLowerCase().includes(normQuery) || c.specialties.some(s => s.toLowerCase().includes(normQuery));
              if (!textMatch) return false;
          }

          return true;
      }).slice(0, 5); // Limit results
  };

  return (
    <div className="h-full w-full overflow-hidden flex flex-col items-center justify-center relative bg-[#F9F8F4]">
       
       {/* Background Decoration */}
       <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-3xl"></div>
       </div>

       {/* MAIN CONTAINER */}
       <main className="w-full h-full md:max-w-4xl md:h-[90vh] relative z-10 p-0 md:p-6">
             <ChatPanel 
                 messages={messages} 
                 onSendMessage={handleSendMessage}
                 isTyping={isTyping}
                 onSelectCenter={setSelectedCenter}
             />
       </main>

       <DetailModal 
          center={selectedCenter} 
          onClose={() => setSelectedCenter(null)} 
       />
    </div>
  );
}
