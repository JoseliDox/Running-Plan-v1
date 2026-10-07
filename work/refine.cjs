const fs=require('fs');let s=fs.readFileSync('outputs/index.html','utf8');const start=s.indexOf('function f12EnsureState(){'),end=s.indexOf('\nfunction f12ActiveRace()',start);
s=s.slice(0,start)+`function f12EnsureState(){
  if(typeof state==='undefined'||!state)return false;
  state.athleteHistory=state.athleteHistory||{sessions:[],weighIns:[],readiness:[],injuries:[],notes:[],updatedAt:f12Now()};
  state.races=Array.isArray(state.races)?state.races.map(f12NormalizeRace):[];
  const hadCycles=!!state.raceCycles;
  state.multiRace=Object.assign({schemaVersion:F12_SCHEMA_VERSION,migratedAt:f12Now()},state.multiRace||{});
  state.multiRace.schemaVersion=F12_SCHEMA_VERSION;
  state.raceCycles=state.raceCycles||{};
  state.raceCycleHistory=state.raceCycleHistory||{};
  state.racePlans=state.racePlans||{};
  if(!state.races.length){
    if(state.multiRace.allowEmptyRaces===true){state.activeRaceId=null;return true;}
    // Compatibilidad: solo los estados legacy necesitan una carrera inicial.
    const g=state.goal||state.GOAL||{};
    state.races=[f12NormalizeRace({name:g.name||((g.distanceKm||5)+'K objetivo'),distanceKm:g.distanceKm||g.distance||5,date:g.date||g.raceDate||'',targetPaceSecPerKm:g.targetPaceSecPerKm||g.targetPace||null,targetPaceMinKm:g.targetPaceMinKm||null,targetTimeSec:g.targetTimeSec||g.targetTime||null},0)];
  }
  const r=state.races.find(x=>x.id===state.activeRaceId)||state.races.find(x=>x.status==='active')||state.races[0];
  state.activeRaceId=r.id;
  state.races.forEach(race=>{
    let cycle=state.raceCycles[race.id];
    if(!cycle){
      const migratedStart=!hadCycles&&state.races.length===1&&race.id===state.activeRaceId?(state.goal||{}).startDate:null;
      state.raceCycles[race.id]=f12NewCycle(race,'preparation',migratedStart);
    }else if(!f12IsISODate(cycle.startDate)){cycle.startDate=f12CycleStartDate(race,null);}
  });
  if(!state.racePlans[r.id])state.racePlans[r.id]=f12ScopeFromState();
  return true;
}`+s.slice(end);
s=s.replace("/* Crea un usuario nuevo con un f12State totalmente independiente\n   (defaultState(), la misma función que ya usa F12 para el estado base;\n   no se duplica ninguna lógica) y lo activa. */","/* Crea y activa un atleta limpio con el mismo onboarding del signup. */");
// Mantener exactamente el fallback histórico si un id activo no existe.
s=s.replace("const r=state.races.find(x=>x.id===state.activeRaceId)||state.races.find(x=>x.status==='active')||state.races[0];", "state.activeRaceId=state.activeRaceId||state.races.find(x=>x.status==='active')?.id||state.races[0].id;\n  const r=state.races.find(x=>x.id===state.activeRaceId)||state.races[0];");
fs.writeFileSync('outputs/index.html',s);
const orig=fs.readFileSync('C:/Users/josel/Downloads/index.html','utf8');
const engine=x=>x.slice(x.indexOf('function defaultProfile(){'),x.indexOf("const STORAGE_KEY_V2 ="));
if(engine(orig)!==engine(s))throw Error('ENGINE modified');
for(const m of s.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new(require('vm').Script)(m[1]);
console.log('ENGINE idéntico; scripts compilados correctamente.');
