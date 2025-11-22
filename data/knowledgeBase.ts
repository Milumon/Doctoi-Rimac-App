
// Simulación de Base de Datos Documental (RAG)
// En una arquitectura AWS, esto vendría de un S3 Bucket o Vector DB (Pinecone)

export const INSURANCE_POLICIES = `
[DOCUMENTO INTERNO CONFIDENCIAL: PÓLIZAS VIGENTES 2025]

EMPRESA: RÍMAC SEGUROS
- Plan: EPS Preferente
- Cobertura Emergencia: 100% en Red 1 (Clínica Internacional, San Pablo).
- Cobertura Ambulatoria: 80% (Copago variable S/ 40-60).
- Medicamentos: 70% en Farmacias afiliadas.
- Exclusiones: Cirugía estética, vitaminas.

EMPRESA: PACÍFICO SALUD
- Plan: Salud Total
- Cobertura Emergencia: 100% hasta S/ 15,000.
- Cobertura Oncológica: 100% en Aliada.
- Maternidad: Cubierta al 100% tras 10 meses de carencia.
- Médico a Domicilio: Copago fijo S/ 35.00.

EMPRESA: SIS (SEGURO INTEGRAL DE SALUD)
- Plan: Gratuito
- Cobertura: 100% en hospitales del MINSA (Loayza, Casimiro Ulloa, Dos de Mayo).
- Restricción: Requiere hoja de referencia de posta médica, excepto en Emergencias (Ley de Emergencia).

EMPRESA: ESSALUD
- Cobertura: 100% en red propia (Rebagliati, Almenara).
- Tiempo de espera: Variable. Prioridad a emergencias.
`;

export const CLINICAL_GUIDELINES = `
[DOCUMENTO INTERNO: GUÍAS DE PRÁCTICA CLÍNICA MINSA PERÚ]

PROTOCOLO DE FIEBRE (>38°C):
1. Adultos: Paracetamol 500mg/8h si no hay alergia. Hidratación.
2. Signos de Alarma (Derivar a Emergencia): Confusión, rigidez de nuca, petequias (manchas rojas), dificultad respiratoria.

PROTOCOLO DE DOLOR ABDOMINAL:
1. Fosa Iliaca Derecha (Abajo derecha): Posible Apendicitis. NADA por boca. IR A EMERGENCIA.
2. Epigastrio (Boca del estómago): Posible Gastritis. Evitar irritantes. Consulta ambulatoria.
3. Cólico Biliar (Tras comer grasas): Ir a urgencia si el dolor persiste > 2 horas.

PROTOCOLO RESPIRATORIO:
1. Resfriado común: Reposo, líquidos. No antibióticos.
2. Neumonía (Fiebre alta + falta de aire + dolor torácico): EMERGENCIA HOSPITALARIA.
`;
