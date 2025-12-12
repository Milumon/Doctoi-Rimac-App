
import { KnowledgeSource } from '../types';

export const OFFICIAL_SOURCES: KnowledgeSource[] = [
    {
        id: 'minsa-protocolos',
        name: 'Guías de Práctica Clínica MINSA',
        category: 'Protocolos',
        url: 'https://www.gob.pe/minsa/',
        description: 'Protocolos oficiales de atención y triaje del Ministerio de Salud del Perú.',
        isActive: true,
        icon: '🏥'
    },
    {
        id: 'digemid-precios',
        name: 'Observatorio DIGEMID',
        category: 'Farmacia',
        url: 'http://observatorio.digemid.minsa.gob.pe/',
        description: 'Búsqueda de medicamentos, precios referenciales y disponibilidad en farmacias.',
        isActive: true,
        icon: '💊'
    },
    {
        id: 'susalud-registro',
        name: 'Registro IPRESS SUSALUD',
        category: 'Directorio',
        url: 'http://portal.susalud.gob.pe/',
        description: 'Base de datos oficial de Instituciones Prestadoras de Servicios de Salud autorizadas.',
        isActive: true,
        icon: '📋'
    },
    {
        id: 'vademecum-peru',
        name: 'Vademécum Farmacológico',
        category: 'Farmacia',
        url: 'https://www.vademecum.es/medicamentos-peru',
        description: 'Información detallada sobre principios activos, dosificación e interacciones.',
        isActive: true,
        icon: 'book'
    },
    {
        id: 'essalud-emergencia',
        name: 'Protocolos Emergencia EsSalud',
        category: 'Protocolos',
        url: 'http://www.essalud.gob.pe/',
        description: 'Criterios de atención prioritaria en hospitales de la seguridad social.',
        isActive: true,
        icon: '🚑'
    }
];
