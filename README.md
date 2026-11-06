# AptoMed

Plataforma para exámenes médicos de preempleo, creada para HackaToB 2026 (HealthTrack).

Un preempleo es el examen médico que una persona hace antes de empezar un trabajo. AptoMed es un servicio para medicinas de empresa: el candidato llena su historia desde el celular, la IA lee los laboratorios y propone un borrador, y el médico valora, corrige y firma. La empresa cliente (RRHH) recibe **solo** el certificado de aptitud, nunca los datos clínicos.

**App publicada:** https://preempleo-digital.vercel.app

Todos los candidatos y datos clínicos de la demo son ficticios.

## Tecnología

- Next.js y TypeScript
- Supabase (base de datos, inicio de sesión y permisos por fila)
- Gemini (lectura de laboratorios y borrador)
- Vercel (publicación)

## Cómo correrlo

1. Instala las dependencias con `npm install`.
2. Crea un proyecto en Supabase y ejecuta en orden los archivos de `supabase/` en el SQL Editor.
3. Crea un archivo `.env.local` con estas variables:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`, `DEMO_MEDICO_EMAIL`, `DEMO_MEDICO_PASSWORD`, `DEMO_RRHH_EMAIL`, `DEMO_RRHH_PASSWORD`.
4. Carga los datos ficticios con `npm run seed`. Este comando borra y vuelve a crear los datos.
5. Abre la app con `npm run dev` en http://localhost:3000.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Abre la app en modo local |
| `npm run seed` | Borra y vuelve a cargar los datos de demostración |
| `npm run test:rls` | Prueba que RRHH no puede leer datos clínicos (Ley 8968) |
| `npm run test:lab` | Prueba el filtro legal y la lectura de rangos de laboratorio |
| `npm run test:informe` | Prueba que el PDF del Informe Final sea fijo y sin campos |
| `npm run build` | Compila como en producción |
