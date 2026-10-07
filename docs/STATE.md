# Estado y persistencia

## Modelo principal

`state` es la vista en memoria del atleta activo. Contiene perfil, objetivo activo, disponibilidad, actividades, limitaciones, resultados, pesos, check-ins, planes, revisiones y configuración visual.

Multi-race añade:

- `races`
- `activeRaceId`
- `raceCycles`
- `raceCycleHistory`
- `racePlans`
- `athleteHistory`
- `multiRace`

Cada carrera conserva su scope de objetivo, plan, resultados y revisiones. `races=[]` y `activeRaceId=null` son estados válidos para un atleta nuevo.

## Persistencia local

`made2run_v2_users` es el contenedor multiusuario local. Cada entrada mantiene su propio `f12State`. Los formatos anteriores se leen únicamente como origen de migración y no vuelven a convertirse en fuente de verdad.

## Supabase

Supabase Auth identifica la cuenta. La tabla `user_state` almacena una fila por `auth.users.id`. Las escrituras remotas se serializan y coalescen; el guardado local sigue siendo inmediato. Una respuesta Auth antigua no puede sustituir a una sesión más reciente.

Un signup nuevo recibe `f13_2_blankAthleteState()`. Solo se migra estado local cuando no tiene propietario o pertenece a la misma cuenta. Logout limpia la sesión visible aunque falle la red.

## Compatibilidad

La normalización es idempotente y no destruye campos desconocidos. Los planes F14 se actualizan al esquema estructurado manteniendo tipo, fecha y resultados. El golden master y las regresiones cubren estado vacío, legacy, multi-race, Auth, sincronización y aislamiento.
