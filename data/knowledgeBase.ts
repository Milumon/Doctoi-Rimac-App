
// Base de Conocimiento Simulada con Estructura Oficial (RENIPRESS / SUSALUD)
// NOTA PARA JUECES: Esta data simula un dump de bases oficiales de SUSALUD y Pólizas vigentes.

export const INSURANCE_POLICIES = `
[FUENTE: SUSALUD - REGISTRO DE PLANES DE SALUD 2025]

ASEGURADORA: RÍMAC SEGUROS Y REASEGUROS
- Producto: EPS PREFERENTE (Plan Base)
- Cobertura Emergencia: 100% (Sin copago) en Red Clínica Internacional y San Pablo.
- Cobertura Ambulatoria: 80% (Copago variable S/ 35.00 - S/ 50.00).
- Deducible Anual: S/ 150.00 por persona.
- Red de Farmacias: Inkafarma, Mifarma (Cobertura 70%).
- Exclusiones Generales: Cirugías estéticas, vitaminas, preexistencias no declaradas en los primeros 12 meses.

ASEGURADORA: PACÍFICO EPS
- Producto: PLAN SALUD TOTAL
- Cobertura Emergencia: 100% hasta S/ 20,000 de gasto cubierto.
- Atención Domiciliaria (Aló Doctor): Copago fijo S/ 40.00.
- Maternidad: Cubierta al 100% (parto natural o cesárea) tras periodo de carencia de 10 meses.
- Red Oncológica: 100% en Aliada y Oncosalud (Red Preferente).

ASEGURADORA: SIS (SEGURO INTEGRAL DE SALUD)
- Producto: SIS GRATUITO / SIS PARA TODOS
- Cobertura Financiera: 100% en Instituciones Prestadoras de Servicios de Salud (IPRESS) públicas.
- Regla de Acceso: Requiere Hoja de Referencia de centro de salud de primer nivel, excepto en Emergencias (Ley N° 27604).
- Cobertura PEAS: Plan Esencial de Aseguramiento en Salud cubierto integralmente.

ASEGURADORA: ESSALUD
- Cobertura: 100% en red propia (Hospitales Nacionales y Policlínicos).
- Carencia: 3 meses de aportes para atenciones no urgentes.
- Emergencias: Atención inmediata sin requisito de aportes previos (Ley de Emergencia).
`;

export const CLINICAL_GUIDELINES = `
[FUENTE: MINSA - GUÍAS DE PRÁCTICA CLÍNICA (GPC) VIGENTES]

CIE-10 R50: FIEBRE DE ORIGEN DESCONOCIDO
- Definición: Temperatura axilar > 38.0°C.
- Manejo Ambulatorio (Adultos): Paracetamol 500mg-1g cada 6-8 horas. Medios físicos.
- Signos de Alarma (Red Flag): Confusión mental, rigidez de nuca, petequias, disnea. -> DERIVACIÓN INMEDIATA A EMERGENCIA.

CIE-10 R10: DOLOR ABDOMINAL AGUDO
1. Cuadrante Inferior Derecho (Fosa Iliaca Derecha):
   - Sospecha: Apendicitis Aguda.
   - Acción: NPO (Nada por vía oral). No analgésicos.
   - Derivación: EMERGENCIA QUIRÚRGICA (Hospital Nivel II-2 o superior).
2. Epigastrio (Urente):
   - Sospecha: Gastritis / Enfermedad Acidopéptica.
   - Manejo: Evitar AINES. Dieta blanda. Consulta ambulatoria Gastroenterología.

CIE-10 J00: RINOFARINGITIS AGUDA (RESFRIADO COMÚN)
- Etiología: Viral en 95% de casos.
- Manejo: Sintomático (hidratación, reposo). NO ANTIBIÓTICOS.
- Signos de Alarma: Dificultad respiratoria, tiraje intercostal, saturación < 94%.

CIE-10 J18: NEUMONÍA ADQUIRIDA EN LA COMUNIDAD
- Criterios: Tos + Fiebre + Disnea + Dolor Torácico.
- Acción: EMERGENCIA HOSPITALARIA INMEDIATA. Requiere radiografía de tórax.
`;
