/* Selector de adaptador activo para la persistencia LOCAL (sin cambios de
   comportamiento respecto a F13.1). La persistencia remota es la capa
   independiente de arriba, no pasa por aquí. */
const dataService = localStorageAdapter;

function f12WrapAsUser(f12StateObj, name){
  return {
    id: f12Id('user'),
    name: name||'Atleta',
    createdAt: f12Now(),
    updatedAt: f12Now(),
    // Preparación F13.1 (inertes, sin efecto en el comportamiento actual):
    role: 'athlete',        // 'athlete' | 'admin' — Fase 5, sin panel Admin todavía
    authUserId: null,       // futuro FK a auth.users.id de Supabase (Fase 4)
    remoteSync: { backend: dataService.backend, status: 'local-only', lastSyncedAt: null },
    f12State: f12StateObj,
  };
}

/* Carga (y, si hace falta, migra UNA sola vez) el contenedor multiusuario.
   Idempotente: si STORAGE_KEY_USERS ya existe y es válido, se usa tal
   cual y NO se vuelve a tocar loadState()/STORAGE_KEY_V2 para nada. */
function loadUsersStore(){
  const parsed = dataService.load(STORAGE_KEY_USERS);
  if(parsed && Array.isArray(parsed.users) && parsed.users.length && parsed.activeUserId){
    return parsed;
  }
  // No existe (o está corrupto/incompleto): migración F12 → primer usuario.
  // loadState() es la función F12 existente, sin modificar: hace su propia
  // cascada made2run_v2 → rumbo5k_v2 → rumbo5k_v1_1 → defaults.
  const migratedF12State = loadState();
  const firstUser = f12WrapAsUser(migratedF12State, 'Carrera Inicial 5K Octubre');
  const store = { schemaVersion:1, activeUserId: firstUser.id, users:[firstUser], migratedAt: f12Now() };
  dataService.save(STORAGE_KEY_USERS, store);
  return store;
}

function f12ActiveUserEntry(){
  return usersStore.users.find(u=>u.id===usersStore.activeUserId) || usersStore.users[0];
}

/* Persiste el contenedor completo (todos los usuarios). Único punto de
   escritura de F13; STORAGE_KEY_V2 ya no se escribe nunca más. */
function saveUsersStore(){
  dataService.save(STORAGE_KEY_USERS, usersStore);
}

let usersStore = loadUsersStore();
let state = f12ActiveUserEntry().f12State;
f12EnsureState();
saveUsersStore(); // persiste inmediatamente el resultado de f12EnsureState() sobre el primer usuario

/* saveState() sigue siendo la función que usa TODO el ENGINE/UI existente.
   Ahora, además de sincronizar el scope de carrera activo (f12SaveActiveScope,
   sin cambios), vuelca 'state' de vuelta en su usuario dentro de usersStore
   y persiste el contenedor completo — nunca made2run_v2 suelto. */
function saveState(){
  try{
    f12SaveActiveScope();
    const entry = f12ActiveUserEntry();

    entry.f12State = state;
    entry.updatedAt = f12Now();
    saveUsersStore();

    // F13.2: si hay sesión Supabase activa, empujar también a la nube.
    // Best-effort y asíncrono: nunca bloquea ni rompe el guardado local,
    // que sigue siendo la fuente de verdad instantánea/offline.
    if(remoteAuth.session && entry.authUserId && entry.authUserId===remoteAuth.session.user?.id){
      entry.remoteSync.status = 'syncing';
      queueRemoteState(entry.authUserId,state,entry);
    }
  }catch(e){}
}

/* Cambia de usuario activo: persiste el actual, reasigna 'state' al f12State
   del nuevo usuario (mismo patrón que f12SetActiveRace para carreras), y
   deja el plan/UI listos para ese usuario. No toca el ENGINE. */
function switchUser(userId){
  const target = usersStore.users.find(u=>u.id===userId);
  if(!target) throw new Error('Usuario no encontrado');
  if(target.id===usersStore.activeUserId) return target;
  saveState(); // persiste el usuario saliente antes de cambiar
  usersStore.activeUserId = target.id;
  state = target.f12State;
  f12EnsureState();
  saveUsersStore();
  ensurePlan();
  renderAll();
  renderCharts();
  return target;
}

/* Crea y activa un atleta limpio con el mismo onboarding del signup. */
function createUser(name){
  saveState(); // conserva el usuario actual tal como está antes de cambiar de foco
  const fresh = f13_2_blankAthleteState();
  const user = f12WrapAsUser(fresh, name && name.trim() ? name.trim() : ('Atleta '+(usersStore.users.length+1)));
  usersStore.users.push(user);
  usersStore.activeUserId = user.id;
  state = user.f12State;
  f12EnsureState();
  saveUsersStore();
  ensurePlan();
  renderAll();
  renderCharts();
  return user;
}

function logAdaptation(entry){
  state.adaptationLog.unshift(Object.assign({date: todayISO()}, entry));
  if(state.adaptationLog.length>60) state.adaptationLog.length = 60;
  const cycle=f12ActiveCycle();
  if(cycle){ cycle.adaptationLog.unshift(f12Clone(state.adaptationLog[0])); if(cycle.adaptationLog.length>60)cycle.adaptationLog.length=60; }
}
