# Doctoi Frontend

Este es el frontend de Doctoi (React + Tailwind).

## 🚀 Conexión con Backend (Nuevo)

La aplicación ha sido refactorizada para no llamar a Gemini AI directamente desde el navegador. Ahora espera una API REST en la dirección `/api` (o la que configures).

### 1. Configuración
Crea un archivo `.env` o configura la variable de entorno en tu plataforma de despliegue (Vercel, Netlify):

```bash
REACT_APP_API_URL=https://tu-backend-api.com/api
# Si estás en local, por defecto usa: /api (proxy) o http://localhost:3000/api
```

### 2. Endpoints Requeridos
Tu backend debe implementar las siguientes rutas (POST):

1.  **POST `/classify`**
    *   Body: `{ text: string }`
    *   Response: `{ intent: 'triage' | 'pharmacy' | 'directory' }`

2.  **POST `/triage`**
    *   Body: `{ symptoms: string, userContext: { district: string, insurance: string } }`
    *   Response: Objeto JSON `TriageAnalysisWithCenters` (ver `types.ts`).

3.  **POST `/chat`**
    *   Body: `{ history: Array }`
    *   Response: `{ text: string }`

4.  **POST `/documents`**
    *   Body: `{ query: string }`
    *   Response: `{ text: string }`

### 3. Migración de Lógica
La lógica original de IA se encuentra comentada en `services/geminiService.ts`. Úsala como base para programar tus Lambda Functions o rutas de Express/FastAPI.
