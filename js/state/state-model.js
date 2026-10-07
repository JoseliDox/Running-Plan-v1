/* =====================================================================
   MADE2RUN — V2 — STATE + ORQUESTACIÓN + UI
   Depende de v2_data_engine_browser.js (DATA + generador + ENGINE),
   que debe cargarse antes que este script.
===================================================================== */

const STORAGE_KEY_V2 = 'made2run_v2';
const LEGACY_STORAGE_KEY_V2 = 'rumbo5k_v2';
const STORAGE_KEY_V1_1 = 'rumbo5k_v1_1';

function todayISO(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function fmtDateShort(iso){
  const d = parseISO(iso);
  return d.getDate()+' '+['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()];
}
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

/* ---------------------------------------------------------------------
   1) STATE — carga, migración, guardado
--------------------------------------------------------------------- */
function defaultState(){
  return {
    profile: defaultProfile(),
    goal: defaultGoal(),
    availability: defaultAvailability(),
    activities: defaultActivities(),
    limitations: defaultLimitations(),
    results: {},
    weights: [{date: defaultGoal().startDate, weight: 96.85}],
    planOriginal: null,
    planCurrent: null,
    adaptationLog: [],
    weeklyReviews: {},
    configDirty: false,
    migrationNote: null,
    theme: { mode:'dark', palette:'running' },
    checkins: {},
  };
}

// Nuevo atleta: preferencias neutras, sin mediciones, objetivos ni historial heredado.
function f13_2_blankAthleteState(){
  const fresh=defaultState();
  fresh.profile={name:'',age:'',heightCm:'',weightKg:'',weightGoalKg:'',level:'principiante',trainingKnowledge:'basico',experienceNote:'',currentCapabilityMinutes:'',recentRunDaysPerWeek:'',currentWeeklyMinutes:'',usualLongSessionMinutes:'',trainingYears:'',toleratesConsecutiveDays:false,walkingPaceMinKm:'',knownRecentPaceMinKm:null,knownRecentBest:null};
  fresh.goal={distanceKm:null,date:'',startDate:todayISO(),type:'completar',targetPaceMinKm:null,targetPaceLabel:''};
  fresh.activities=[]; fresh.limitations=[]; fresh.weights=[];
  fresh.races=[]; fresh.activeRaceId=null; fresh.raceCycles={}; fresh.raceCycleHistory={}; fresh.racePlans={};
  fresh.athleteHistory={sessions:[],weighIns:[],readiness:[],injuries:[],notes:[],updatedAt:f12Now()};
  fresh.multiRace={schemaVersion:F12_SCHEMA_VERSION,allowEmptyRaces:true};
  return fresh;
}

function loadState(){
  let s = null;
  try{
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if(raw) s = JSON.parse(raw);
  }catch(e){}
  if(!s){
    try{
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY_V2);
      if(legacyRaw){
        s = JSON.parse(legacyRaw);
        if(s) s.storageMigration = {from:LEGACY_STORAGE_KEY_V2, to:STORAGE_KEY_V2, migratedAt:new Date().toISOString()};
      }
    }catch(e){}
  }
  if(!s){
    s = defaultState();
    // migración best-effort desde v1.1: solo peso es 1:1 compatible.
    // Los entrenamientos de la v1.1 se conservan como historial heredado
    // de solo lectura, porque el generador de V2 crea fechas/tipos de
    // sesión distintos y no se pueden vincular automáticamente al nuevo plan.
    try{
      const legacyRaw = localStorage.getItem(STORAGE_KEY_V1_1);
      if(legacyRaw){
        const legacy = JSON.parse(legacyRaw);
        if(legacy && Array.isArray(legacy.weights) && legacy.weights.length){
          s.weights = legacy.weights;
        }
        if(legacy && legacy.results && Object.keys(legacy.results).length){
          s.legacyV1_1Results = legacy.results;
          s.migrationNote = 'Se ha conservado tu peso de la V1.1. Los ' + Object.keys(legacy.results).length + ' entrenamientos registrados en la V1.1 se guardan como historial heredado (visible en Progreso), pero no están vinculados a las sesiones del nuevo plan de V2, generado con fechas y tipos distintos.';
        } else {
          s.migrationNote = 'Se ha conservado tu peso de la V1.1.';
        }
      }
    }catch(e){}
  }
  if(!s.results) s.results = {};
  if(!s.weights || !s.weights.length) s.weights = [{date: s.goal.startDate, weight: s.profile.weightKg}];
  if(!s.adaptationLog) s.adaptationLog = [];
  if(!s.weeklyReviews) s.weeklyReviews = {};
  if(!s.theme) s.theme = { mode:'dark', palette:'running' };
  if(!s.checkins) s.checkins = {};
  return s;
}

/* =====================================================================
   F13 — MULTIUSUARIO LOCAL
   Nueva fuente de verdad: STORAGE_KEY_USERS ('made2run_v2_users').
   'made2run_v2' (STORAGE_KEY_V2) deja de escribirse: solo se LEE, una
   única vez, como origen legacy durante la migración F12→F13. A partir
   de ahí 'state' pasa a ser la VISTA en memoria del f12State del usuario
   activo — el ENGINE/UI de F10/F11/F12 sigue leyendo/escribiendo
   state.xxx exactamente igual que antes, sin ningún cambio.
===================================================================== */
const STORAGE_KEY_USERS = 'made2run_v2_users';

/* =====================================================================
   F13.1 — BACKEND FOUNDATION (capa de datos, sin backend real todavía)
   Frontera deseada: BACKEND → DATA SERVICE → state → ENGINE → UI.
   El ENGINE (F10/F11) y el resto de F12/F13 siguen leyendo/escribiendo
   'state' exactamente igual; lo único que cambia es DE DÓNDE viene ese
   'state'. dataService es esa frontera: hoy solo tiene un adaptador
   (localStorage), y deja el hueco documentado para un adaptador Supabase
   futuro con la MISMA interfaz, sin tocar nada por encima de esta línea.
===================================================================== */
const localStorageAdapter = {
  backend: 'localStorage',
  load(key){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  },
  save(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ return false; }
  },
};
