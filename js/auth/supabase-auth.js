/* =====================================================================
   F13.2 — SUPABASE AUTH + PERSISTENCIA REMOTA
   Diseño: el arranque SÍNCRONO local (localStorage) de F13.1 se mantiene
   EXACTAMENTE igual — la app sigue arrancando y funcionando sin red ni
   sesión, tal como siempre. Por encima de eso se añade una capa
   ASÍNCRONA independiente (remoteAuth + remoteState) que, si hay una
   sesión válida, sustituye 'state'/'usersStore' por los datos remotos
   usando el MISMO mecanismo de reasignación que ya usa switchUser().
   Motivo de esta separación (no forzarlo dentro de dataService.load/save):
   Supabase es async y modela "1 fila = 1 cuenta", mientras que
   dataService.load/save(key) de F13.1 era síncrono y pensado para un
   único blob local. Forzar ambas cosas en la misma interfaz sería más
   frágil que separarlas con claridad. El ENGINE sigue sin saber nada de
   esto: solo ve 'state' cambiar de contenido, igual que al cambiar de
   usuario local.
===================================================================== */

async function supabaseFetch(path, opts){
  opts = opts || {};
  const headers = Object.assign({ apikey: SUPABASE_ANON_KEY, 'Content-Type':'application/json' }, opts.headers||{});
  if(remoteAuth.session && remoteAuth.session.access_token && !headers.Authorization){
    headers.Authorization = 'Bearer '+remoteAuth.session.access_token;
  }
  // Fuerza explícitamente el esquema 'public' en las llamadas REST (PostgREST).
  // Sin esto, con varios esquemas expuestos en el proyecto (public + graphql_public),
  // PostgREST puede resolver al primero por orden alfabético (graphql_public),
  // dando el error "Could not find the table 'graphql_public.user_state'...".
  // Accept-Profile se usa en GET; Content-Profile en POST/PATCH/PUT/DELETE.
  if(path.indexOf('/rest/v1/')===0){
    const method = (opts.method||'GET').toUpperCase();
    if(method==='GET' || method==='HEAD') headers['Accept-Profile'] = headers['Accept-Profile'] || 'public';
    else headers['Content-Profile'] = headers['Content-Profile'] || 'public';
  }
  const res = await fetch(SUPABASE_URL+path, Object.assign({}, opts, {headers}));
  let body = null;
  try{ body = await res.json(); }catch(e){ /* respuesta vacía, p.ej. logout */ }
  if(!res.ok){
    const msg = (body && (body.msg||body.error_description||body.message)) || ('HTTP '+res.status);
    throw new Error(msg);
  }
  return body;
}

const remoteAuth = {
  session: null, // {access_token, refresh_token, expires_at, user:{id,email,...}}

  persistSession(){
    try{
      if(this.session) localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(this.session));
      else localStorage.removeItem(AUTH_SESSION_KEY);
    }catch(e){}
  },

  async signUp(email, password){
    const body = await supabaseFetch('/auth/v1/signup', { method:'POST', body: JSON.stringify({email, password, data:{made2run_new_signup:true}}) });
    if(body && body.access_token){
      this.session = { access_token: body.access_token, refresh_token: body.refresh_token, expires_at: body.expires_at, user: body.user };
      this.persistSession();
      return { confirmed: true, user: body.user };
    }
    // Confirmación por email habilitada: la cuenta se crea pero sin sesión hasta confirmar.
    return { confirmed: false, user: body && body.id ? body : null };
  },

  async signIn(email, password){
    const body = await supabaseFetch('/auth/v1/token?grant_type=password', { method:'POST', body: JSON.stringify({email, password}) });
    this.session = { access_token: body.access_token, refresh_token: body.refresh_token, expires_at: body.expires_at, user: body.user };
    this.persistSession();
    return body.user;
  },

  async signOut(){
    const request = supabaseFetch('/auth/v1/logout', { method:'POST' });
    try{ await Promise.race([request,new Promise((_,reject)=>setTimeout(()=>reject(new Error('logout timeout')),5000))]); }catch(e){ /* el cierre local no depende de la red */ }
    this.session = null;
    this.persistSession();
  },

  /* Establece una nueva contraseña usando el access_token de RECUPERACIÓN
     (el que llega en el hash del enlace del email, type=recovery) — no el
     de una sesión normal. Tras confirmar, ese mismo access_token queda
     como sesión válida (Supabase ya autentica con él), así que se persiste
     igual que un login normal. */
  async updatePassword(recoveryAccessToken, newPassword){
    const body = await supabaseFetch('/auth/v1/user', {
      method:'PUT',
      headers:{ Authorization:'Bearer '+recoveryAccessToken },
      body: JSON.stringify({ password:newPassword }),
    });
    return body;
  },

  async resetPassword(email){
    // Mecanismo oficial de Supabase Auth: envía un email con enlace de recuperación.
    // redirect_to debe apuntar exactamente a esta página (origin+pathname, sin
    // hash/query), para que el enlace del email vuelva aquí y no a la raíz del
    // dominio — coincide con la Redirect URL configurada en el proyecto
    // (https://joselidox.github.io/Running-Plan-v1/). Se calcula en tiempo real,
    // nunca hardcodeado, así funciona igual si la app se sirve desde otra ruta.
    // No informamos si el email existe o no (evita enumerar cuentas): la UI
    // siempre muestra el mismo mensaje genérico, tal como pide el diseño.
    const redirectTo = window.location.origin + window.location.pathname;
    await supabaseFetch('/auth/v1/recover?redirect_to='+encodeURIComponent(redirectTo), { method:'POST', body: JSON.stringify({email}) });
  },

  /* Intenta recuperar una sesión persistida (reload / nuevo dispositivo con el mismo
     navegador). Si el access_token está caducado, intenta refrescarlo con el
     refresh_token antes de darla por inválida. Nunca lanza: si algo falla,
     simplemente no hay sesión y la app sigue en modo local (F13.1). */
  async restoreSession(){
    let raw;
    try{ raw = localStorage.getItem(AUTH_SESSION_KEY); }catch(e){ return null; }
    if(!raw) return null;
    let saved;
    try{ saved = JSON.parse(raw); }catch(e){ return null; }
    if(!saved || !saved.refresh_token) return null;
    this.session = saved;
    const expiresAt = saved.expires_at ? saved.expires_at*1000 : 0;
    if(Date.now() < expiresAt - 30000){
      return saved.user; // token todavía válido
    }
    try{
      const body = await supabaseFetch('/auth/v1/token?grant_type=refresh_token', { method:'POST', body: JSON.stringify({refresh_token: saved.refresh_token}) });
      this.session = { access_token: body.access_token, refresh_token: body.refresh_token, expires_at: body.expires_at, user: body.user };
      this.persistSession();
      return body.user;
    }catch(e){
      this.session = null;
      this.persistSession();
      return null;
    }
  },
};

const remoteState = {
  async fetch(uid){
    const rows = await supabaseFetch('/rest/v1/user_state?select=user_id,schema_version,state,updated_at&user_id=eq.'+encodeURIComponent(uid));
    return (rows && rows[0]) || null;
  },
  async upsert(uid, f12StateObj){
    await supabaseFetch('/rest/v1/user_state', {
      method:'POST',
      headers:{ Prefer:'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ user_id:uid, schema_version:1, state:f12StateObj, updated_at:new Date().toISOString() }]),
    });
  },
};
let remoteWriteChain=Promise.resolve();
let remoteWritePending=null;
let remoteWriteGeneration=0;
function queueRemoteState(uid,stateObj,entry){
  remoteWritePending={uid,stateObj:f12Clone(stateObj),entry,generation:++remoteWriteGeneration};
  remoteWriteChain=remoteWriteChain.then(async()=>{
    while(remoteWritePending){
      const job=remoteWritePending; remoteWritePending=null;
      await remoteState.upsert(job.uid,job.stateObj);
      if(job.entry.remoteSync){job.entry.remoteSync.status='synced';job.entry.remoteSync.lastSyncedAt=f12Now();saveUsersStore();}
    }
  }).catch(()=>{if(entry.remoteSync){entry.remoteSync.status='error';saveUsersStore();}});
  return remoteWriteChain;
}

/* Reemplaza 'state'/'usersStore' en memoria por los datos de la cuenta autenticada,
   con el MISMO patrón de reasignación que switchUser(). No toca localStorage: la
   copia local sigue existiendo como caché para cuando no haya sesión/red. */
function f12AdoptRemoteUser(authUser, f12StateObj){
  const incoming=(f12StateObj&&typeof f12StateObj==='object')?f12StateObj:{};
  const base=f13_2_blankAthleteState();
  f12StateObj=Object.assign(base,incoming);
  f12StateObj.profile=Object.assign(base.profile,incoming.profile||{});
  f12StateObj.theme=Object.assign(base.theme,incoming.theme||{});
  f12StateObj.checkins=incoming.checkins&&typeof incoming.checkins==='object'?incoming.checkins:{};
  const entry = {
    id: authUser.id, name: authUser.email || 'Cuenta', createdAt: f12Now(), updatedAt: f12Now(),
    role:'athlete', authUserId: authUser.id,
    remoteSync: { backend:'supabase', status:'synced', lastSyncedAt:f12Now() },
    f12State: f12StateObj,
  };
  const previousUsers=Array.isArray(usersStore?.users)?usersStore.users:[];
  // La adopción remota actualiza solo la cuenta autenticada; no destruye
  // perfiles locales independientes creados en este dispositivo.
  const preserved=previousUsers.filter(u=>u&&u.id!==entry.id&&u.authUserId!==authUser.id);
  usersStore = { schemaVersion:1, activeUserId: entry.id, users:[...preserved,entry], migratedAt: usersStore.migratedAt };
  state = entry.f12State;
  f12EnsureState();
}

/* Punto de entrada para el formulario de Cuenta (login/registro) y para la
   restauración automática al arrancar. best-effort: cualquier fallo de red dega
   con gracia a modo local, nunca rompe la app. */
/* Solo se migra un estado local sin propietario o de esta misma cuenta.
   La marca de signup también cubre la confirmación por email en otro dispositivo. */
async function f13_2_syncAfterAuth(authUser, opts){
  opts = opts || {};
  const syncGeneration = ++f13_2_syncAfterAuth.generation;
  const remoteRow = await remoteState.fetch(authUser.id);
  if(syncGeneration!==f13_2_syncAfterAuth.generation || !remoteAuth.session || remoteAuth.session.user?.id!==authUser.id) return false;
  const localEntry = (usersStore?.users||[]).find(u=>u && u.authUserId===authUser.id);
  const localPending = localEntry && localEntry.remoteSync && (localEntry.remoteSync.status==='syncing' || localEntry.remoteSync.status==='error');
  if(localPending && localEntry.f12State){
    localEntry.remoteSync.status='syncing';
    queueRemoteState(authUser.id, localEntry.f12State, localEntry);
  } else if(remoteRow && remoteRow.state){
    f12AdoptRemoteUser(authUser, remoteRow.state);
  } else {
    const entry=f12ActiveUserEntry();
    const isNewSignup=opts.isNewSignup || authUser.user_metadata?.made2run_new_signup===true;
    const canMigrate=!isNewSignup && entry && (!entry.authUserId || entry.authUserId===authUser.id);
    const initial=canMigrate?f12Clone(entry.f12State):f13_2_blankAthleteState();
    await remoteState.upsert(authUser.id, initial);
    f12AdoptRemoteUser(authUser, initial);
  }
  saveUsersStore();
  applyTheme(state.theme.mode,state.theme.palette);
  ensurePlan();
  renderAll();
  renderCharts();
  document.querySelector('.tabbtn[data-tab="hoy"]').click();
  showApp();
  return true;
}
f13_2_syncAfterAuth.generation=0;
