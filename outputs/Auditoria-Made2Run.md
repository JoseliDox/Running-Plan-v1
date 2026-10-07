# Auditoría integral de Made2Run — antes de F14

16 de septiembre de 2026. Archivo auditado: `outputs/index.html` actualizado en esta conversación, no el original de Downloads ni una versión publicada.

**Conclusión: resolver los críticos y las incoherencias del ENGINE antes de ampliar funcionalidades.** El flujo normal de onboarding funciona, pero no cubre concurrencia, fallos de red, ciclos nuevos ni entradas inválidas.

**En el momento de la auditoría no se había modificado el HTML, CSS, JavaScript ni ENGINE. No se escribió en Supabase durante la auditoría.**

Nota: después de emitir esta auditoría se aplicó una primera tanda de estabilización sobre `outputs/index.html` (escape de contenido, Auth obsoleto, cola local de guardado, validación, IDs estables y varias correcciones del ENGINE). Los hallazgos del documento describen el estado auditado originalmente; deben usarse junto con el resumen de cambios de la respuesta posterior, no como un diff actualizado.

SHA-256 antes/después: `32b35a06b47d320e32af7af320e70f0e045f929acc2112ad8f6e06d54e7e7c42`.

Las líneas corresponden a ese archivo. **Confirmado** significa reproducido con funciones reales en Node o con DOM real en navegador; **estático**, una ruta concreta identificada por lectura; **pendiente**, algo que exige infraestructura o una decisión de producto. Los tests sustituyen red por respuestas sintéticas y algunos tests Node sustituyen el render por funciones vacías. No prueban las políticas SQL del servidor.

## 1. CRÍTICOS

### C1. Inyección persistente de HTML y JavaScript

**Dónde:** `renderActiveRace`/`renderRaces`, 2714–2728; `renderProfileForm`, 3666; `renderUsersForm`, 3593; notas de `buildQuickLog`, 2624–2670; `renderAdaptationLog`, 3413.

**Confirmado, B05.** El nombre de carrera entra directamente en `innerHTML`. Un nombre con un botón y un manejador JavaScript crea un elemento ejecutable: activarlo ejecutó un marcador inocuo en el documento. La primera variante de prueba con un evento SVG automático no se disparó; la variante de activación sí quedó confirmada. No se extrajeron credenciales ni datos.

También hay notas interpoladas dentro de `textarea` y nombres dentro de atributos `value` sin escape. Un contenido malicioso almacenado o importado podría ejecutar código con acceso al estado y tokens del mismo origen. Esto no demuestra que una cuenta pueda modificar la fila de otra: ese límite depende de RLS.

**Propuesta:** nodos DOM, `textContent` y propiedades para valores de usuario; escape según contexto cuando se necesite templar; sanitización explícita si se admite HTML enriquecido. CSP como defensa adicional, no sustituto. Tests de nombres, notas y datos importados.

### C2. Los guardados remotos pueden sobrescribir cambios más recientes

**Dónde:** `saveState`, 2003–2020; `remoteState.upsert`, 1896–1902; `runPendingWeeklyReviews`, 2386.

**Confirmado, T20.** Dos guardados se envían simultáneamente. Si el nuevo termina primero y el antiguo después, el servidor simulado termina con `old`, mientras el cliente tiene `new`. Se reemplaza todo el documento, sin cola ni revisión esperada. El mismo diseño permite conflictos entre pestañas/dispositivos. `updated_at` no es una precondición de escritura. Renderizar también guarda y agrava la frecuencia del problema.

**Propuesta:** cola y agrupación por usuario, cambios pendientes duraderos y control de concurrencia optimista con revisión del servidor. Serializar únicamente en un dispositivo no resuelve el conflicto entre varios.

### C3. Login/recarga pueden destruir cambios locales no sincronizados

**Dónde:** `f13_2_syncAfterAuth`, 1925–1946; `f12AdoptRemoteUser`, 1908; adaptador local, 1741; errores de `saveState`, 2018–2022.

**Confirmado, T19/T23.** Si existe fila remota, siempre sustituye la caché local aunque esta tenga cambios posteriores cuyo envío falló. Después se sobrescribe también esa copia local. No se consulta versión, pendiente ni `remoteSync.status`.

Además, `made2run_new_signup` permanece en la cuenta: si no aparece fila remota, puede obligar a empezar vacío aunque exista caché propia recuperable. La marca describe el origen de la cuenta, no si sigue siendo nueva. Los errores locales tampoco se propagan: se ignora el `false` del adaptador.

**Propuesta:** distinguir inicialización, caché propia pendiente y migración; no reemplazar cambios no confirmados. Mantener cola pendiente/copia anterior, resolver conflictos y consumir o reinterpretar la marca de signup solo para inicialización. Mostrar errores de almacenamiento.

### C4. «Crear usuario» crea perfiles que la restauración de Auth elimina

**Dónde:** `createUser`, 2043; `renderUsersForm`, 3593; reemplazo `users:[entry]`, 1917; condición de subida, 2015.

**Confirmado, T18.** Crear un segundo perfil local deja dos entradas. Restaurar la cuenta Supabase deja una y el siguiente guardado persiste la desaparición. El perfil adicional no se sube porque no tiene `authUserId`, aunque Cuenta sigue diciendo que los datos están en la nube. También afecta a otros perfiles locales anteriores a la migración.

**Propuesta:** definir la relación cuenta/perfiles. Preservar y separar los perfiles locales del contenedor reemplazado al adoptar la caché remota. Si se retira el selector, migrar/exportar antes sus datos; ocultarlo no soluciona datos ya creados.

### C5. Respuestas tardías de Auth mezclan cuentas y reabren la app tras logout

**Dónde:** `f13_2_syncAfterAuth`, 1925; handlers, 3568; restauración, 4020; `logout`, 3469; guardado, 2015.

**Confirmado, T21 y extra `delayedLogout`.** Resolviendo la sincronización de B y después una anterior de A, queda sesión B con datos activos A. Una respuesta pendiente después de salir vuelve a ejecutar `showApp()` con sesión nula.

No hay bloqueo de envío múltiple, cancelación ni verificación de que la operación siga perteneciendo a la sesión actual. `saveState` tampoco exige coincidencia entre `entry.authUserId` y el usuario del token. RLS correcta debería impedir escritura cruzada; no evita mostrar datos ya recibidos por el cliente.

**Propuesta:** generación/identificador de operación Auth; invalidarlo al salir o iniciar otra; comprobar identidad antes de adoptar, mostrar o guardar; cancelar peticiones obsoletas y capturar contexto de usuario inmutable.

## 2. ALTOS

### A1. La sesión prolongada puede dejar de sincronizar al caducar el token

**Dónde:** `restoreSession`, 1861–1888; `supabaseFetch`, 1775; `saveState`, 2015.

**Estático.** El refresco solo se intenta al restaurar al arrancar. No hay renovación durante uso continuado, antes de una petición o tras 401. Los guardados fallan y la UI no muestra claramente el fallo; después C3 puede borrar lo pendiente.

**Propuesta:** renovación centralizada con exclusión mutua, reintento controlado y estado pendiente visible/duradero. Probar expiración durante edición y fallos de refresh.

### A2. Logout espera indefinidamente a la red

**Dónde:** `signOut`, 1834; `logout`, 3469; fetch sin timeout, 1790.

**Confirmado, T22.** Con `/logout` pendiente, la sesión sigue en memoria y la app visible. Un `catch` no limita una petición que no termina.

**Propuesta:** bloquear/limpiar acceso local e invalidar operaciones primero; revocación remota acotada después, con estado independiente del cierre local.

### A3. No se valida ni migra suficientemente la estructura del estado

**Dónde:** `loadUsersStore`, 1969; `loadState`, 1675; `f12EnsureState`, 494; `f12AdoptRemoteUser`, 1908; `flattenPlan`, 2138.

**Confirmado, T24/T27 y suplemento.** Una fila `state={}` falla en `theme.mode`; `races:[null]` rompe el normalizador. Dos carreras con el mismo ID comparten un ciclo. Cero carreras puede conservar un plan no vacío. Se valida el contenedor local, pero no sus entradas. La ruta remota tampoco aplica los pequeños backfills de `loadState`.

Una caché dañada puede fallar antes de ofrecer login. `schema_version` se lee pero no decide una migración/validación.

**Propuesta:** esquema canónico validado en cada frontera, migraciones versionadas, IDs únicos y referencias coherentes. Preservar documento inválido para recuperar; no resetear silenciosamente. Permitir login/recuperación cuando la caché esté rota.

### A4. Cancelar un diálogo no elimina su acción de confirmación

**Dónde:** `showConfirm`, 2430–2441.

**Confirmado, B02.** Abrir A, cancelar, abrir B y confirmar ejecuta A y B. Cancelar solo retira su listener, dejando el de aceptar. Aceptar tiene el problema simétrico.

**Propuesta:** limpiar ambos listeners en todos los caminos o usar un único handler/acción pendiente. Validar usuario/carrera de la acción. Test cancelar→confirmar y aperturas repetidas.

### A5. «Nuevo ciclo» reutiliza fechas y objetivo legacy

**Dónde:** `f12StartNewCycle`, 527; `f12NewCycle`/`f12CycleStartDate`, 488–489; historial, 528.

**Confirmado, T03/T14.** «Completar» sin ritmo pasa a objetivo `6:30/km`. Se mantiene fecha de carrera y vuelve a calcularse el mismo inicio; una carrera pasada produce otro ciclo pasado. El historial común identifica por `raceId+sessionId`, sin `cycleId`: repetir fecha/tipo reemplaza la entrada anterior. El archivo del scope existe, pero no tiene vista de recuperación.

**Propuesta:** inicio/objetivo explícitos del nuevo ciclo, sin plantilla personal; IDs estables de sesión/ciclo y acceso a archivos previos.

### A6. Adaptación y recálculo pueden ocultar registros guardados

**Dónde:** revisión semanal, 2340–2383; ID en `flattenPlan`, 2145; adaptación inmediata, 2264; `mergePlans`, 2200.

**Confirmado, T16/T17 y extra `future`.** La revisión modifica toda la semana siguiente sin filtrar pasado/resultados: se modificaron tres días anteriores a hoy. Como el ID es `fecha__tipo`, cambiar tipo rompe la relación con `results`.

La UI permite registrar una sesión futura. Con molestias, puede adaptar esa misma sesión de RUN_WALK a RECOVERY_RUN: el resultado permanece en el ID antiguo y desaparece visualmente. Recortar el nuevo calendario también excluye días históricos que ya no aparecen en él.

**Propuesta:** IDs independientes del tipo, adaptación solo de futuro no registrado y conservación explícita de historial fuera del nuevo calendario. Definir y proteger el registro futuro.

### A7. Cambios globales no invalidan otras carreras; el historial común no alimenta al motor

**Dónde:** contexto, 2182; `markConfigDirty`, 2230; scopes, 491–493; perfil/disponibilidad, 3697/3789; métricas, 1145/1258.

**Confirmado, suplemento `multiRaceDirty`; lectura del historial estática.** Con planes A/B, cambiar disponibilidad a cero días en B y volver a A deja running en A y `configDirty=false`. Configuración del atleta es común; planes/dirty son por carrera.

Readiness, carga y capacidad usan resultados del scope activo, no `athleteHistory`. Cambiar de carrera oculta para esas decisiones la carga de otras carreras del mismo atleta.

**Propuesta:** revisionar configuración común e invalidar planes dependientes. Diferenciar métricas del atleta y de carrera; consumir historial compartido con deduplicación donde corresponda.

### A8. Formularios aceptan valores inválidos

**Dónde:** alta, 2728; resultados, 2680; perfil, 3697; disponibilidad, 3789; limitaciones, 3887; normalización, 485.

**Confirmado, B04/B12/T08.** Se guardaron -5 km, objetivo -600 segundos, fecha pasada, resultado -10 km/-20 min, RPE 99 y molestias -3. Los botones no validan un formulario ni llaman a `checkValidity`: `min/max/pattern` no protegen su handler. No hay límite práctico a calendarios enormes. `valor || anterior` confunde vacío/cero e impide limpiar datos. Se acepta `2026-02-31` como fecha ISO válida.

**Propuesta:** validación central de tipos/rangos/números finitos/fechas reales; límites temporales y de tamaño; reglas para vacío y cero. Validar todo antes de modificar el estado.

### A9. Guardar objetivos altera distancias y deja representaciones contradictorias

**Dónde:** `renderGoalForm`, 3715–3762; `f12GoalForRace`, 490; `f12RaceTarget`, 2709; estimación UI, 2771.

**Confirmado, B03/B10/T31.** Guardar una carrera de 21,0975 km la convierte en 3 km por el selector cerrado. «Completar» conserva ritmo antiguo y la tarjeta sigue mostrando `5:30/km`. Un objetivo de 50 min/10K no se convierte en ritmo para el estimador.

Sec/km, min/km, etiqueta y tiempo total pueden discrepar. Se cambia distancia/fecha/tipo antes de validar ritmo: un error deja una edición parcial en memoria que otro guardado puede persistir.

**Propuesta:** representación canónica y conversiones; limpiar valores incompatibles al cambiar tipo; validación transaccional; preservar cualquier distancia ya almacenada.

Los fallos altos propios del ENGINE se detallan en la sección 5 para evitar duplicación.

## 3. MEDIOS

### M1. Textos de gráficas sobreviven al cambio de usuario/carrera

**Dónde:** `renderCharts`, 3315–3403; `wireChartTap`, 3261; rama sin plan, 3950.

**Confirmado, B08.** Ocultar una gráfica sin datos no borra el caption: permanece `OLD USER 5 km` en el siguiente estado. Ocultar paneles con cero carreras tampoco elimina nodos/callbacks anteriores. La rama sin plan deja sin limpiar varias vistas previas si existe carrera.

**Propuesta:** reiniciar captions, handlers y contenido al cambiar propietario/scope; renderizar estados vacíos completos, no depender de `display:none`.

### M2. Una sesión omitida conserva métricas de cuando estaba completada

**Dónde:** `setResult`, 2236; patch omitida, 2683; agregadores, 3042/3072; KPI, 3143.

**Confirmado, T15.** Conserva 5 km/30 min. El KPI excluye los km y la gráfica semanal los incluye: 0 frente a 5. RPE/molestias antiguos también pueden afectar revisiones. «Completadas/planificadas» usa un numerador que incluye omitidas.

**Propuesta:** esquema por estado del resultado, limpieza/archivo de campos incompatibles y agregador común con etiquetas correctas.

### M3. El formato de ritmo puede mostrar segundos 60

**Dónde:** `minToPaceStr`, 1119. **Confirmado, T08:** 5.999 devuelve `5:60`.

**Propuesta:** redondear primero a segundos totales y separar minutos/resto; validar finitud.

### M4. Carrera completada sigue ofreciendo preparación futura

**Dónde:** `f12CompleteRace`, 526; `ensurePlan`, 2187; `renderTodayNext`, 2907.

**Confirmado, T28; semántica de producto pendiente.** Puede ser legítimo mantener seleccionada una completada, pero ciclo `post_race` y sesiones futuras de preparación coexisten sin tratamiento específico.

**Propuesta:** definir selección frente a preparación/post-carrera y qué se registra. No borrar historial como solución. No existe flujo de eliminar/archivar carreras: no se ha tratado como si estuviera implementado.

### M5. Peso de perfil y mediciones son fuentes diferentes

**Dónde:** `setWeight`, 2395; `renderWeight`, 2964; perfil, 3701.

**Estático.** Registrar peso no actualiza perfil; editar perfil no crea medición. «Inicial» usa un campo mutable; el actual toma la última entrada sin ordenar por fecha.

**Propuesta:** definir inicial/última medición/perfil y una fuente canónica; validar orden en importación.

### M6. Accesibilidad incompleta

**Dónde:** viewport, 5; chips/formularios, 3593/3622/3666/3765/2862; modal, 2430; `.authgate`, 443.

**Confirmado parcialmente, B07.** En el DOM probado, 67 de 70 labels no están asociados y hay 28 chips div interactivos sin semántica/teclado equivalente a botones. Modal sin gestión de foco ni Escape. `maximum-scale=1` restringe zoom donde se respeta. La puerta fija no gestiona explícitamente desbordamiento con poca altura/teclado virtual.

**Propuesta:** controles nativos, labels asociados, foco/diálogo, zoom y pruebas móviles. No se ha certificado contraste WCAG.

### M7. Fecha visible, borradores y gráficas pueden quedar desactualizados

**Dónde:** `initTabs`, 3918; check-in, 2862; `renderAll`, 3931; canvas, 3158–3260.

**Estático.** No hay refresco al pasar medianoche y los handlers conservan fechas anteriores. Render global reconstruye formularios y puede borrar borradores. Canvas toma ancho aunque el panel esté oculto y no observa resize; entrar en Progreso lo redibuja y mitiga parte del problema.

**Propuesta:** refresco por día/visibilidad, borradores explícitos y dibujo de gráficos visibles con seguimiento de tamaño.

## 4. BAJOS — deuda técnica y mantenibilidad

### B1. Renderizado con efectos secundarios y coste creciente

**Dónde:** `renderAll`, 3931; `runPendingWeeklyReviews`, 2386; `f12EnsureState`, 494; `renderCalendar`/`complementRecommendation`, 2997/2566.

**Confirmado parcialmente, B09; estático para el coste.** Dos renders sin edición producen dos guardados. Cada consulta de carrera normaliza todas las carreras. El calendario completo se reconstruye y cada recomendación complementaria vuelve a aplanar el plan, con coste creciente al aumentar el horizonte. Se redibujan gráficas aunque el panel no esté visible y algunos flujos las llaman otra vez después de `renderAll`.

**Propuesta:** separar comandos, normalización, cálculo y render; normalizar solo al cargar/mutar, memorizar sesiones por revisión y renderizar por panel. Medir en dispositivos móviles antes de optimizar más.

### B2. Estado global con demasiadas copias y propietarios implícitos

**Dónde:** 491–528, 1568, 1908–2058, 2236–2389.

Objetivo, plan, logs y revisiones se repiten entre `state`, `racePlans`, `raceCycles`, archivos de ciclo e historial del atleta. Algunas funciones de lectura mutan estado. `buildDecisionHistoryForEngine()` lee globales pese a que los comentarios describen un ENGINE aislado.

**Propuesta:** declarar invariantes y propietario de cada dato; pasar contexto explícito; mantener representación canónica por entidad. Hacerlo después de fijar contratos y tests, no como refactor masivo previo.

### B3. Comentarios y mensajes no reflejan el comportamiento actual

**Dónde:** comentarios Auth 1754–1770/1858; mensaje de nube 3484; nombre inicial 1978; ayuda de capacidad 3687.

Se habla de modo local sin sesión aunque la puerta Auth es obligatoria; se promete nube para perfiles locales; la ayuda menciona dejar 7–8 minutos mientras el onboarding deja ese dato vacío; comentarios describen rutas de generación que no se ejecutan.

**Propuesta:** actualizar documentación y textos después de decidir los contratos. No eliminar código funcional solo por comentarios antiguos.

## 5. ENGINE — problemas y limitaciones

Estas observaciones evalúan coherencia con las reglas declaradas por la aplicación; no certifican idoneidad deportiva ni clínica.

### E1. ALTO: DELOAD puede aumentar volumen y excluye TEST

**Dónde:** `applyWeeklyDecision`, 1580–1602.

**Confirmado, T06/T07.** EASY_RUN de 10 minutos pasa a 15 por el mínimo de biblioteca. TEST no cambia porque el filtro exige `category==='running'`, aunque existe una rama de TEST. PROGRESS puede superar disponibilidad al aplicar mínimos/máximos.

**Propuesta:** monotonía explícita de DELOAD, respetar disponibilidad y definir tratamiento de TEST/RACE por separado.

### E2. ALTO: readiness trata algunas señales como READY

**Dónde:** `computeReadiness`, 1258–1306.

**Confirmado, T10/T11.** Dolor 3 o 4 en un único check-in devuelve READY. Se toman cuatro sesiones planificadas antes de filtrar resultados, de modo que pendientes pueden ocultar un registro doloroso más reciente. No hay ventana de antigüedad explícita. El feeling de check-in no se integra igual que `sensations` de sesión.

**Propuesta:** tabla completa de señales, filtrar resultados antes de limitar, ventana temporal definida y tests de combinaciones. La ausencia de señal no debe convertirse en buen estado automáticamente.

### E3. ALTO: PROGRESS sin evidencia suficiente

**Dónde:** `weeklyReview`, 1426–1527; `evidenceLevel`, 1197; `computeAdherence`, 1127.

**Confirmado, T12.** Resultados solo con `status:'completed'` y semanas previas generan PROGRESS: ausencia de RPE equivale a diferencia cero y ausencia de molestias a cero. Pendientes no registrados tampoco penalizan el denominador como una sesión vencida.

**Propuesta:** desconocido separado de cero, cobertura mínima de señales y definición explícita de adherencia del motor frente a la mostrada.

### E4. ALTO: limitación severa no garantiza plan conservador

**Dónde:** `sessionPattern`, 987–1006; `limitationCapFrom`, 1026; `applyImmediateDecision`, 2264.

**Confirmado, T26.** `severe` transforma RUN_WALK en EASY_RUN continuo. REPLACE anuncia bici/elíptica pero crea RECOVERY_RUN. MAINTAIN marca sesiones sin neutralizar aumentos ya programados.

**Propuesta:** alinear acción, tipo y texto; distinguir bloqueo real de consejo informativo.

### E5. ALTO: fases y duraciones no comparten progresión

**Dónde:** `generateAdaptivePlan`, 1040–1107; `enrichPlan`, 2163.

**Confirmado para el plan por defecto.** El plan produce dos bloques TAPER por el relleno de fases; el comentario dice insertar la fase anterior, pero se reutiliza la última. `enrichPlan` asigna duración usando `(w.n-1)%4`, reiniciando la progresión cada cuatro semanas en vez de usar la fase real. DELOAD de tipos no garantiza reducción de volumen.

**Propuesta:** construir fases con número real de bloques y pasar índice/metadatos de fase al enriquecimiento; comprobar volumen y taper por semana.

### E6. ALTO: capacidad continua sobreestimada y TEST sin requisito ejecutable

**Dónde:** `buildHistorySummary`, 1145; `readyForFourthDay`, 965; selección de TEST 1076.

**Confirmado, T09/T30.** 30 minutos de caminar-correr cuentan como 30 continuos y pueden activar el cuarto día. Se coloca TEST con capacidad declarada cero si llega la fase específica; la condición de la biblioteca solo aparece como texto.

**Propuesta:** distinguir duración total de minutos continuos y convertir `useWhen` en regla de selección verificable.

### E7. ALTO: distancia objetivo no influye en el plan

**Dónde:** `generateAdaptivePlan`, 1040; `sessionPattern`, 987; `durationFor`, 1011; `estimateCapacity`, 1313.

**Confirmado, T02.** 3K, 5K, 10K, 21,0975K y 42,195K producen el mismo calendario y sesiones. No se consume `goal.distanceKm` en selección ni volumen. El estimador tampoco modela la distancia a sostener.

**Propuesta:** antes de ampliar distancias, definir políticas por distancia, experiencia, duración y especificidad; validar la salida, no solo el input.

### E8. MEDIO: entradas configurables que no gobiernan el plan

**Dónde:** `currentContext`, 2182; generador, 1040; perfil 813; recomendaciones 2566.

Edad, altura, peso, ritmo habitual y ritmo caminando no influyen en la generación principal. Actividades complementarias solo aparecen en texto. `PHASES.allowed`, `level`, `useWhen` y `avoidWhen` son principalmente descriptivos. Con pocos días disponibles, truncar el patrón puede eliminar el rodaje largo de forma sistemática.

**Propuesta:** declarar qué entradas son informativas y cuáles gobiernan el plan; diseñar patrones específicos para cada número de sesiones.

### E9. MEDIO: RACE pierde contenido específico

**Dónde:** `enrichPlan`, 2169; `buildSessionContent`, 2106–2122.

**Confirmado en prueba adicional.** Como RACE tiene `durationRange:[0,0]`, `enrichPlan` asigna `planned=null` y sale antes de generar calentamiento, estrategia y enfriamiento. El código de contenido existe, pero no se usa en la ruta normal.

**Propuesta:** separar «sin duración» de «sin contenido» y probar la tarjeta de carrera.

### E10. MEDIO: replanificación y revisiones pueden perder o congelar adaptaciones

**Dónde:** `recalcFuture`, 2213; `maybeRunWeeklyReview`, 2340; `buildWeeklyReviewContext`, 2307.

**Estático, relacionado con A6.** Recalcular regenera futuro sin reaplicar necesariamente restricciones previas. Una revisión ya guardada no se recalcula ante resultados retroactivos. La carga reciente se calcula respecto a hoy aunque se revise una semana histórica. Cambiar el número de semanas hace ambiguos los números `w1`, `w2` conservados.

**Propuesta:** versionar decisiones, identificar semanas por fechas estables y permitir recomputación controlada sin tocar resultados registrados.

## 6. DISTANCIAS — dependencias actuales de 5K/10K

La app guarda algunos decimales al crear una carrera, pero el producto no soporta aún cualquier distancia de forma funcional.

| Área | Dependencia actual | Trabajo futuro necesario |
|---|---|---|
| `renderGoalForm`, 3715–3762 | Selector cerrado 3/5/10 y `parseInt`; convierte distancia no listada en 3 | Preservar decimal y editar sin pérdida |
| `renderRaces`, 2727 | Ejemplo 10K y validación solo HTML | Límites, precisión, unidades y fechas |
| `f12NormalizeRace`, 485 | Fallback silencioso a 5 | Separar dato ausente de valor elegido |
| `defaultGoal`, 828; migración 1978 | 5K, 6:30/km y fecha fija | Aislar defaults históricos a migración verificable |
| `f12PreparationHorizonDays`, 487 | Horizonte derivado de fechas por defecto | Horizonte explícito por objetivo/calendario |
| Generador/biblioteca, 768–1107 | Patrones y techos iguales para todas las distancias | Políticas de carga y especificidad por distancia |
| `estimateCapacity`, 1313 | No usa distancia objetivo ni tiempo total | Modelo de sostenibilidad por distancia |
| Objetivos, 490/2709/2771 | Sec/km, min/km, etiqueta y tiempo pueden discrepar | Representación canónica y formato de tiempos largos |
| Multi-race, 491–528 | Carreras aisladas sin interferencia de carga entre objetivos | Prioridad, calendario y carga compartida |
| UI, 2717/2768 | Concatenación fija `distancia+'K'` | Formateador de distancia/unidad/precisión |

El `42` del SVG es el radio del anillo, no una dependencia de maratón.

## 7. CÓDIGO LEGACY — eliminación segura

No hay redefiniciones globales claras. Los `renderList` repetidos son funciones locales.

| Elemento | Situación | Recomendación |
|---|---|---|
| `f12ScopedLog`/`f12ScopedReviews`, 528 | Sin consumidores internos encontrados | Candidatos después de comprobar API/tests externos |
| `F12_RACE_STATUS`/`F12_CYCLE_STATUS`, 481 | Declarados pero no validan | Usarlos al validar; no borrarlos aún |
| `F11_DELOAD_COOLDOWN_WEEKS`, 1541 | No participa en cálculo | Candidato de limpieza con test |
| `baseline`, `specificaStartIdx`, `phaseWeeks`, `lib` locales | No usados | Limpieza segura tras tests |
| `progressionState`, `preparationPhase` | Persistidos, poco consumidos | No borrar datos sin migración |
| `athleteHistory`, `raceCycleHistory` | Historial real/archivos | Conservar hasta definir consulta/recuperación |
| Migración `made2run_v2`/`rumbo5k_v2`/`rumbo5k_v1_1` | Compatibilidad activa | Conservar y versionar |
| `defaultProfile`/`defaultGoal`/defaults personales | Usados también en migración | Aislar plantilla legacy, no eliminar directamente |
| `module.exports`, 1109/1604 | Inertes en navegador, útiles en tests | Conservar hasta revisar consumidores |
| CSS de `.logrow`, `.weekmeta`, `.rulepill`, `.accordion-mini`, banners y `type-cardio` | Sin uso aparente | Retirar solo tras cobertura visual |

T25 muestra una migración delicada: una cuenta antigua sin fila remota puede recibir 96,85 kg, rodilla y 5K por la plantilla local, sin una prueba de propiedad suficiente. No debe eliminarse esa ruta sin distinguir instalaciones legítimas de plantillas.

## 8. TESTS — resultados

- Scripts reales compilados con Node `vm`: sin error de sintaxis.
- 32 casos diagnósticos de estado/Auth/multi-race/ENGINE: resultados en `work/audit/tests.json`.
- 180 combinaciones de horizonte, nivel y disponibilidad: sin fallos de días esperados, fechas únicas y exactamente una RACE. Esto no certifica la adecuación deportiva.
- Pruebas DOM en navegador con red simulada: resultados en `work/audit/browser-tests-2.json`.
- Casos adicionales de nuevo ciclo, sesión futura adaptada, descripción RACE y logout tardío.
- Inventario estático: 67 IDs HTML sin duplicados; ningún `getElementById` literal sin declaración encontrada; 147 funciones top-level sin duplicados.
- Sin errores de consola en el recorrido DOM normal probado; estados corruptos produjeron las excepciones documentadas.
- Hash íntegro antes/después: `32b35a06b47d320e32af7af320e70f0e045f929acc2112ad8f6e06d54e7e7c42`.

No quedan certificados RLS, índices/restricciones Supabase, backups, refresh real, confirmación de email, recuperación real, revocación entre dispositivos, compatibilidad Safari/iOS/Android ni contraste WCAG completo. El filtro cliente `user_id=eq...` no sustituye RLS.

### Orden recomendado antes de F14

1. Propiedad de datos, Auth obsoleto, caché pendiente, perfiles locales, concurrencia y escape de contenido; verificar RLS.
2. IDs estables de sesiones/ciclos, protección del historial, modal y validación/normalización.
3. Reglas ENGINE: readiness, evidencia, descarga, fases y replanificación.
4. Contrato de distancias y objetivos, conservando valores existentes.
5. Accesibilidad, limpieza, rendimiento y legacy solo con migración/tests.

**No se ha aplicado ninguna corrección.**
