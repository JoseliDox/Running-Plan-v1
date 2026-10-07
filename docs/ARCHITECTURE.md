# Arquitectura F14.2

## Flujo de arranque

`index.html` carga primero las variables CSS y el bootstrap de tema para evitar parpadeos. Al final del documento carga `js/app.js` como ES Module. El punto de entrada carga secuencialmente los dominios existentes y `js/ui/ui.js` inicia la aplicación cuando el DOM está disponible.

```text
theme → engine → races → state model → Supabase config/Auth
      → persistence → workouts/orchestration → UI
```

El orden hace explícitas las dependencias que antes estaban implícitas por su posición dentro del HTML. Durante F14.2 se mantiene el contrato global de F14.1 para evitar cambios funcionales y ciclos artificiales. Los archivos son fronteras reales de responsabilidad, aunque todavía no exponen todos sus símbolos mediante `export`.

## Responsabilidades

| Dominio | Responsabilidad |
| --- | --- |
| `bootstrap/theme.js` | Tema antes del primer paint. |
| `engine/prescription-engine.js` | Reglas deportivas puras, fases, volumen, capacidad, viabilidad y adaptación ya existente. |
| `races/multi-race.js` | Carreras, ciclos, scopes y compatibilidad multi-race. |
| `state/state-model.js` | Defaults, estado vacío, carga legacy y adaptador local. |
| `config/supabase.js` | Configuración pública del cliente. |
| `auth/supabase-auth.js` | Auth, sesión, `user_state`, sincronización y serialización remota. |
| `state/persistence.js` | Contenedor multiusuario local, guardado y cambio de usuario. |
| `workouts/workouts.js` | Sesiones estructuradas, planes, resultados, revisiones y peso/check-in. |
| `ui/ui.js` | DOM, formularios, gráficos, navegación y arranque. |

## Dependencias y datos

La UI consume estado y operaciones de workouts. Workouts consume el ENGINE, carreras y persistencia. Auth sustituye el estado en memoria únicamente después de identificar al usuario. El ENGINE no depende de Supabase ni del DOM para generar planes.

Los tests cargan los mismos archivos en un contexto controlado. El golden master ejecuta el HTML F14.1 archivado y compara sus planes con los módulos F14.2.

## Restricciones

- Sin framework y sin build para conservar compatibilidad directa con GitHub Pages.
- Rutas relativas en todos los assets.
- Ningún secreto de servidor en frontend.
- F15 debe mantener la frontera `estado → ENGINE → workouts → UI` y evitar introducir lógica adaptativa en renderizado.
