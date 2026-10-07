# Made2Run

Made2Run genera y gestiona planes de running desde principiantes absolutos hasta corredores experimentados. Incluye distancias abiertas, CaCo, multi-race, registro de sesiones, Supabase Auth y persistencia remota por usuario.

La versión actual es **F14.2 — Repository Architecture**. F14.2 separa la aplicación monolítica en CSS y JavaScript por dominios sin cambiar el comportamiento deportivo de **F14.1**, conservado en [`archive/Made2Run_F14.1_STABLE.html`](archive/Made2Run_F14.1_STABLE.html).

## Arquitectura

- `index.html`: estructura estática y entrada de GitHub Pages.
- `css/`: variables de tema y estilos de la aplicación.
- `js/app.js`: punto de entrada ES Module y orden explícito del runtime.
- `js/engine/`: Prescription Engine F14.1.
- `js/state/`: modelo local, migraciones y persistencia.
- `js/auth/` y `js/config/`: Supabase Auth y configuración pública.
- `js/races/`: ciclos, scopes y multi-race.
- `js/workouts/`: construcción de entrenamientos, resultados y orquestación de planes.
- `js/ui/`: renderizado, formularios, navegación y arranque.
- `tests/`: matriz deportiva, golden master, regresión de estado/Auth y navegador.
- `docs/`: documentación arquitectónica y hoja de ruta.

Los dominios conservan por ahora el contrato global histórico y se cargan secuencialmente desde `js/app.js`. Esta decisión evita alterar los contratos de F14.1 durante la modularización. Los límites de archivos ya permiten convertir cada dominio a exports explícitos de forma incremental en futuras fases.

## Ejecución local

Requiere Node.js 22 o compatible:

```bash
npm run serve
```

Abre `http://127.0.0.1:8080`. Debe usarse HTTP; los ES Modules no deben validarse principalmente con `file://`.

## Tests

```bash
npm test
```

La batería crítica incluye sintaxis, rutas, hash del golden master, 720 planes, invariantes deportivos, equivalencia F14.1→F14.2 y regresiones de estado/Auth.

Para la prueba de navegador:

```bash
npm install
npx playwright install chromium
npm run test:browser
```

## Supabase

La URL y la clave publishable/anon del frontend están en `js/config/supabase.js`. Son configuración pública de cliente y requieren Row Level Security sobre `user_state`. Nunca debe añadirse una `service_role` ni otra credencial privada al repositorio.

Las futuras llamadas privadas a modelos de IA deberán pasar por un backend o una Supabase Edge Function. Las API keys privadas nunca deben llegar al navegador.

## GitHub Pages

Todos los recursos usan rutas relativas, por lo que puede publicarse la raíz del repositorio directamente con GitHub Pages. No hay paso de build ni framework de aplicación.

## Estado y documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Prescription Engine](docs/ENGINE.md)
- [Estado y persistencia](docs/STATE.md)
- [Roadmap](docs/ROADMAP.md)

La licencia actual conserva todos los derechos. Puede sustituirse por una licencia abierta si el propietario decide publicar el código con esos términos.
