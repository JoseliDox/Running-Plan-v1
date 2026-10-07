/* ---------------------------------------------------------------------
   2) CONTENIDO DE SESIÓN — texto generado a partir del tipo/fase
--------------------------------------------------------------------- */
const WU_DEFAULT = '5-8 min caminando rápido + movilidad de tobillo, rodilla y cadera.';
const CD_DEFAULT = '5 min caminando + estiramientos suaves, sin rebotes.';

function buildSessionContent(type, planned, ctx){
  const lib = SESSION_LIBRARY[type];
  if(!lib) return {};
  const profile=ctx?.profile||{};
  const goal=ctx?.goal||{};
  const week=ctx?.week||{n:1,phase:'base',phaseLabel:'Base'};
  const seed=ctx?.seed||planned?.prescriptionSeed||{};
  const projected=Math.max(0,Number(seed.projectedCapabilityMin??week.projectedCapabilityMin??profile.currentCapabilityMinutes)||0);
  const progress=Math.max(0,Math.min(1,Number(seed.weekProgress)||0));
  const technical=profile.trainingKnowledge==='tecnico';
  const rpe=(lib.rpe||[]).join('-');
  let requested=Math.max(10,Math.round(Number(seed.totalDurationMin??planned?.totalDurationMin??planned?.duration)||30));
  if(type==='RACE'){
    const raceMin=goal.targetTimeSec?goal.targetTimeSec/60:normalizeDistanceKm(goal.distanceKm,5)*(Number(profile.knownRecentPaceMinKm)||Number(goal.targetPaceMinKm)||7);
    requested=Math.max(20,Math.round(raceMin)+15);
  }
  const quality=['FARTLEK','STRIDES','PROGRESSION','HILLS','SHORT_INTERVALS','INTERVALS','LONG_INTERVALS','TEMPO','THRESHOLD','RACE_PACE','TEST'].includes(type);
  let warmupMin=type==='WALK'?0:type==='RACE'?10:quality?Math.min(10,Math.max(5,Math.round(requested*.2))):Math.min(6,Math.max(4,Math.round(requested*.14)));
  let cooldownMin=type==='WALK'?0:type==='RACE'?5:quality?Math.min(8,Math.max(4,Math.round(requested*.14))):Math.min(5,Math.max(3,Math.round(requested*.1)));
  if(warmupMin+cooldownMin>=requested-5){warmupMin=3;cooldownMin=2;}
  const mainSec=Math.max(300,requested*60-warmupMin*60-cooldownMin*60);
  const blocks=[];let recoverySecTotal=0;
  const add=(role,label,durationSec,text,data={})=>blocks.push(Object.assign({role,label,durationSec:Math.max(0,Math.round(durationSec)),text},data));
  if(warmupMin)add('warmup','Calentamiento',warmupMin*60,type==='RUN_WALK'?'Camina a paso ligero y termina con movilidad suave.':'Empieza muy suave y aumenta el movimiento progresivamente.',{mode:'easy'});
  let main='',feel='El esfuerzo debe sentirse controlado.',fallback='Reduce el ritmo o camina antes de que la técnica se deteriore. Detente si aparece dolor que aumenta.';
  const easyFeel='Deberías poder hablar en frases completas y terminar con sensación de que podrías continuar un poco más.';
  if(type==='RUN_WALK'){
    const runSec=projected<3?60:projected<6?120:projected<10?180:projected<15?300:projected<20?480:600;
    const walkSec=projected<3?120:projected<10?90:60;
    const reps=Math.max(1,Math.floor(mainSec/(runSec+walkSec))),used=reps*(runSec+walkSec),remainder=mainSec-used;
    main=`${reps} repeticiones de ${f14DurationLabel(runSec)} corriendo suave y ${f14DurationLabel(walkSec)} caminando.`;
    add('main','Parte principal',used,main,{repeat:reps,steps:[{mode:'run',durationSec:runSec,intensity:'easy'},{mode:'walk',durationSec:walkSec,intensity:'recovery'}]});
    recoverySecTotal+=reps*walkSec;
    if(remainder>0)add('main','Completar el tiempo',remainder,`Completa ${f14DurationLabel(remainder)} caminando a paso cómodo.`,{mode:'walk'});
    feel='Al correr debes poder hablar. La caminata es parte del entrenamiento: permite acumular más tiempo y adaptar músculos, articulaciones y sistema cardiovascular.';
    fallback='Camina antes de lo previsto si lo necesitas. En la siguiente repetición corre más despacio; también puedes completar una repetición menos.';
  }else if(type==='WALK'){
    main=`Camina ${requested} minutos a paso vivo pero cómodo.`;add('main','Parte principal',requested*60,main,{mode:'walk',intensity:'easy'});feel=easyFeel;
  }else if(type==='LONG_EASY'&&projected>0&&mainSec/60>projected*1.15){
    const runSec=projected<40?900:1200,walkSec=60,reps=Math.max(1,Math.floor(mainSec/(runSec+walkSec))),used=reps*(runSec+walkSec),remainder=mainSec-used;
    main=`${reps} bloques de ${f14DurationLabel(runSec)} corriendo cómodo y ${f14DurationLabel(walkSec)} caminando para acumular tiempo de pie sin forzar carrera continua por encima de tu capacidad proyectada.`;
    add('main','Resistencia con pausas',used,main,{repeat:reps,steps:[{mode:'run',durationSec:runSec,intensity:'easy'},{mode:'walk',durationSec:walkSec,intensity:'recovery'}]});recoverySecTotal+=reps*walkSec;
    if(remainder>0)add('main','Completar el tiempo',remainder,`Completa ${f14DurationLabel(remainder)} a trote muy suave o caminando.`,{mode:'easy-or-walk'});
    feel=easyFeel;fallback='Acorta los bloques corriendo y conserva las pausas caminando desde el principio.';
  }else if(['EASY_RUN','RECOVERY_RUN','AEROBIC_RUN','LONG_EASY'].includes(type)){
    const adjective=type==='RECOVERY_RUN'?'muy suave':type==='LONG_EASY'?'cómodo y constante':type==='AEROBIC_RUN'?'cómodo y sostenido':'cómodo';
    const continuousMin=Math.round(mainSec/60);main=`Corre ${continuousMin} minutos a un esfuerzo ${adjective}.`;
    add('main','Parte principal',mainSec,main,{mode:'continuous',intensity:type==='RECOVERY_RUN'?'recovery':'easy'});feel=easyFeel;
  }else if(type==='PROGRESSION'){
    const a=Math.round(mainSec*.4),b=Math.round(mainSec*.35),c=mainSec-a-b;main=`Corre ${f14DurationLabel(a)} cómodo, ${f14DurationLabel(b)} alegre y ${f14DurationLabel(c)} firme pero controlado.`;add('main','Parte principal',mainSec,main,{steps:[{mode:'run',durationSec:a,intensity:'easy'},{mode:'run',durationSec:b,intensity:'steady'},{mode:'run',durationSec:c,intensity:'controlled-hard'}]});feel='La respiración aumenta poco a poco; nunca debes sentir que estás esprintando.';
  }else if(type==='HILLS'){
    const workSec=Math.round(30+progress*15),defaultRecovery=Math.max(60,Math.round(90-progress*20)),reps=Math.max(2,Math.floor(mainSec/(workSec+defaultRecovery))),cycle=Math.floor(mainSec/reps),recoverySec=Math.max(30,Math.min(defaultRecovery,cycle-workSec)),used=reps*(workSec+recoverySec);main=`${reps} cuestas de ${f14DurationLabel(workSec)} con ${f14DurationLabel(recoverySec)} de bajada suave.`;add('main','Parte principal',used,main,{repeat:reps,steps:[{mode:'uphill',durationSec:workSec,intensity:'controlled-hard'},{mode:'recovery',durationSec:recoverySec}]});recoverySecTotal+=reps*recoverySec;if(mainSec-used>0)add('main','Rodaje suave',mainSec-used,`Completa ${f14DurationLabel(mainSec-used)} muy suave.`,{mode:'easy'});feel='Fuerte, pero siempre con buena postura y una repetición de margen.';
  }else if(['FARTLEK','STRIDES'].includes(type)){
    const defaultFast=type==='STRIDES'?20:Math.round(60+progress*90),defaultRecovery=type==='STRIDES'?70:Math.max(60,Math.round(defaultFast*(1-progress*.35))),reps=Math.max(2,Math.floor(mainSec/(defaultFast+defaultRecovery))),cycle=Math.floor(mainSec/reps),fast=Math.max(20,Math.min(defaultFast,cycle-30)),recovery=Math.max(30,Math.min(defaultRecovery,cycle-fast)),used=reps*(fast+recovery);main=`${reps} cambios de ${f14DurationLabel(fast)} alegres con ${f14DurationLabel(recovery)} muy suaves.`;add('main','Parte principal',used,main,{repeat:reps,steps:[{mode:'faster',durationSec:fast,intensity:'controlled'},{mode:'recovery',durationSec:recovery}]});recoverySecTotal+=reps*recovery;if(mainSec-used>0)add('main','Rodaje suave',mainSec-used,`Completa ${f14DurationLabel(mainSec-used)} suave.`,{mode:'easy'});feel='En los cambios respirarás más fuerte, pero recuperarás el control durante el tramo suave.';
  }else if(['SHORT_INTERVALS','INTERVALS','LONG_INTERVALS','TEMPO','THRESHOLD','RACE_PACE'].includes(type)){
    const short=type==='SHORT_INTERVALS',tempo=['TEMPO','THRESHOLD','RACE_PACE'].includes(type),baseWork=short?60:type==='LONG_INTERVALS'?240:tempo?360:180;
    const defaultRecovery=short?75:type==='LONG_INTERVALS'?150:tempo?120:120,reps=Math.max(2,Math.floor(mainSec/(baseWork+defaultRecovery))),cycle=Math.floor(mainSec/reps),recovery=Math.max(30,Math.min(defaultRecovery,cycle-60)),work=Math.max(60,cycle-recovery),used=reps*(work+recovery);
    const paceHint=type==='RACE_PACE'&&goal.targetPaceMinKm?` cerca de ${minToPaceStr(goal.targetPaceMinKm)}/km`:'';
    main=`${reps} bloques de ${f14DurationLabel(work)}${paceHint}, recuperando ${f14DurationLabel(recovery)} muy suave.`;add('main','Parte principal',used,main,{repeat:reps,steps:[{mode:'work',durationSec:work,intensity:type==='RACE_PACE'?'race-pace':'controlled-hard'},{mode:'recovery',durationSec:recovery}]});recoverySecTotal+=reps*recovery;if(mainSec-used>0)add('main','Rodaje suave',mainSec-used,`Completa ${f14DurationLabel(mainSec-used)} suave.`,{mode:'easy'});feel='Respirarás fuerte, pero debes mantener el control y una técnica estable hasta la última repetición.';fallback='Baja el ritmo. Si no recuperas el control, alarga la recuperación o elimina la última repetición.';
  }else if(type==='TEST'){
    main=`Corre ${f14DurationLabel(mainSec)} a tu esfuerzo más rápido sostenible y anota la distancia.`;add('main','Parte principal',mainSec,main,{mode:'test'});feel='Exigente y constante; evita un sprint al inicio.';
  }else if(type==='RACE'){
    const strategy=seed.raceStrategy||'continuous',raceSec=mainSec;main=strategy==='caco'?`Completa ${formatDistanceKm(goal.distanceKm)} con la estrategia CaCo entrenada: alterna ${projected<10?'3 min corriendo / 1 min 30 s caminando':projected<20?'8 min corriendo / 1 min caminando':'15 min corriendo / 1 min caminando'} desde el inicio.`:`Completa ${formatDistanceKm(goal.distanceKm)} a esfuerzo controlado al principio y progresivo solo si sigues estable.`;add('main','Competición',raceSec,main,{distanceKm:normalizeDistanceKm(goal.distanceKm,5),mode:'race',strategy});feel='El esfuerzo crecerá con la carrera. Debes sentir que reservas energía durante el primer tramo.';
  }else main=lib.goal||'';
  if(cooldownMin)add('cooldown','Vuelta a la calma',cooldownMin*60,'Termina caminando o trotando muy suave hasta normalizar la respiración.',{mode:'easy'});
  blocks.sort((a,b)=>({warmup:0,main:1,cooldown:2}[a.role]??1)-({warmup:0,main:1,cooldown:2}[b.role]??1));
  const totalSec=blocks.reduce((sum,b)=>sum+Number(b.durationSec||0),0),totalDurationMin=Math.round(totalSec/6)/10;
  const content = {
    schemaVersion:3,duration:totalDurationMin,totalDurationMin,warmupDurationMin:warmupMin,mainDurationMin:Math.round((totalSec-warmupMin*60-cooldownMin*60-recoverySecTotal)/6)/10,recoveryDurationMin:Math.round(recoverySecTotal/6)/10,cooldownDurationMin:cooldownMin,
    prescription:{primary:type==='RACE'?'distance':'time',durationMin:totalDurationMin,distanceKm:type==='RACE'?normalizeDistanceKm(goal.distanceKm,5):null,intensity:type==='RACE_PACE'&&goal.targetPaceMinKm?'pace':'effort',targetPaceMinKm:type==='RACE_PACE'?goal.targetPaceMinKm||null:null,projectedCapabilityMin:projected,strategy:type==='RACE'?(seed.raceStrategy||'continuous'):null},
    blocks,
    warmup: blocks.find(b=>b.role==='warmup')?.text||null,
    main,
    cooldown: blocks.find(b=>b.role==='cooldown')?.text||null,
    goal: lib.goal,
    how: technical&&rpe?`Mantén el esfuerzo previsto alrededor de RPE ${rpe}; usa la sensación y la técnica como control principal.`:'Empieza más despacio de lo que crees necesario y ajusta por sensaciones.',
    feel,
    fallback,
    why:`Con una capacidad continua proyectada de ${projected} min, esta dosis de ${totalDurationMin} min trabaja ${lib.goal.toLowerCase()} en la fase ${String(week.phaseLabel||week.phase||'actual').toLowerCase()} para avanzar hacia ${formatDistanceKm(goal.distanceKm)} sin aumentar todas las variables a la vez.`,
    surface: (type==='RACE') ? 'Circuito de la carrera.' : 'Elige una superficie estable y segura donde puedas controlar el esfuerzo.',
    notes: type==='RUN_WALK'?'Caminar no significa fallar: es la herramienta prevista para progresar con seguridad.':'',
  };
  if(type==='TEST'){
    content.condition = lib.useWhen + ' Si todavía no cumples esa base, sustitúyelo por un rodaje continuo fácil e inténtalo la semana siguiente.';
  }
  return content;
}

function f14DurationLabel(seconds){const s=Math.max(1,Math.round(Number(seconds)||0));if(s%60===0)return (s/60)+' min';if(s>60)return Math.floor(s/60)+' min '+(s%60)+' s';return s+' s'}
function capabilityRepeat(profile,min,max){const cap=Number(profile?.currentCapabilityMinutes||0);return Math.max(min,Math.min(max,Math.round(min+(max-min)*Math.min(1,cap/45))))}

/* ---------------------------------------------------------------------
   3) FLATTEN — construir SESSIONS a partir de PLAN_CURRENT
--------------------------------------------------------------------- */
function categoryFor(type){
  if(type==='COMPLEMENT') return 'complementary';
  if(type==='REST') return 'rest';
  if(type==='TEST') return 'test';
  if(type==='RACE') return 'carrera';
  return 'running';
}

function flattenPlan(plan){
  if(!plan) return [];
  const list = [];
  plan.weeks.forEach(w=>{
    w.days.forEach((d,dayIndex)=>{
      const category = categoryFor(d.type);
      const lib = SESSION_LIBRARY[d.type];
      // Identidad persistente: el tipo puede cambiar por una adaptación, pero
      // la sesión histórica debe seguir siendo la misma.
      const id = d.sessionId || (d.sessionId='session_'+w.n+'_'+d.date+'_'+dayIndex);
      const legacyId = d.date+'__'+d.type;
      if(state&&state.results&&legacyId!==id&&state.results[legacyId]&&!state.results[id]){state.results[id]=state.results[legacyId];delete state.results[legacyId];}
      const planned = d.planned || null;
      list.push({
        id, legacyId, date:d.date, week:w.n, phase:w.phase, phaseLabel:w.phaseLabel, deloadWeek:w.deload,
        category, subtype:d.type, title: lib ? lib.label : d.type,
        planned, plannedOriginal: d.plannedOriginal || null,
        adapted: !!d.adapted, adaptedReason: d.adaptedReason || null,
        sessionsNote: w.sessionsNote || null,
      });
    });
  });
  list.sort((a,b)=> a.date<b.date?-1:1);
  return list;
}

/* Asigna "planned" (duración/rpe) + contenido descriptivo a cada día del
   plan recién generado. El generador de datos (generateAdaptivePlan) solo
   decide TIPOS de sesión; aquí completamos duración/RPE/contenido. */
function enrichPlan(plan, ctx){
  const { availability, profile, goal } = ctx;
  const policy=distancePolicy(goal.distanceKm);
  plan.weeks.forEach(w=>{
    w.days.forEach(d=>{
      const lib = SESSION_LIBRARY[d.type];
      if(!lib) return;
      if(lib.durationRange[1]===0){
        d.planned = d.type==='RACE' ? buildSessionContent(d.type, null, {week:w,profile,goal,policy,seed:d.prescriptionSeed||{}}) : null;
        return;
      }
      const dur = Number(d.prescriptionSeed?.totalDurationMin)||durationFor(d.type,0,4,availability,profile,policy);
      d.planned = { duration:dur, totalDurationMin:dur, rpe:(lib.rpe||[]).join('-'), prescriptionSeed:d.prescriptionSeed||null };
      Object.assign(d.planned, buildSessionContent(d.type,d.planned,{week:w,profile,goal,policy,seed:d.prescriptionSeed||{}}));
    });
  });
  plan.meta=Object.assign({},plan.meta,{workoutSchemaVersion:3,prescriptionVersion:'14.1',distanceKm:normalizeDistanceKm(goal.distanceKm,5),distancePolicy:policy.key});
  return plan;
}

/* ---------------------------------------------------------------------
   4) GENERACIÓN / RECÁLCULO DEL PLAN
--------------------------------------------------------------------- */
function currentContext(){
  return { profile: state.profile, goal: state.goal, availability: state.availability,
           activities: state.activities, limitations: state.limitations };
}

function f14UpgradePlanContent(plan,ctx){
  if(!plan||!Array.isArray(plan.weeks))return false;
  let changed=false;const policy=distancePolicy(ctx.goal.distanceKm);
  plan.weeks.forEach(w=>w.days.forEach(d=>{
    if(d.type==='COMPLEMENT'||d.type==='REST')return;
    if(!d.planned&&d.type==='RACE')d.planned={};
    if(!d.planned||Number(d.planned.schemaVersion)>=3)return;
    const seed=Object.assign({totalDurationMin:Number(d.planned.totalDurationMin||d.planned.duration)||undefined,projectedCapabilityMin:Number(w.projectedCapabilityMin??ctx.profile.currentCapabilityMinutes)||0},d.prescriptionSeed||{});
    Object.assign(d.planned,buildSessionContent(d.type,d.planned,{week:w,profile:ctx.profile,goal:ctx.goal,policy,seed}));changed=true;
  }));
  if(changed){plan.meta=Object.assign({},plan.meta,{workoutSchemaVersion:3,prescriptionVersion:'14.1',distanceKm:normalizeDistanceKm(ctx.goal.distanceKm,5),distancePolicy:policy.key});}
  return changed;
}

function ensurePlan(){
  if(!f12ActiveRace()) return;
  const ctx = currentContext();
  if(state.planCurrent){if(f14UpgradePlanContent(state.planCurrent,ctx))saveState();return;}
  const raw = generateAdaptivePlan(Object.assign({}, ctx, {historySummary:null, startDate: f12ActiveCycleStartDate()}));
  enrichPlan(raw, ctx);
  state.planOriginal = deepClone(raw);
  state.planCurrent = deepClone(raw);
  state.configDirty = false;
  logAdaptation({type:'plan', decision:'GENERATE', reason:'Plan inicial generado a partir de tu perfil, objetivo, disponibilidad, actividades y limitaciones.'});
  saveState();
}

function mergePlans(oldPlan, newPlan, todayIso){
  const oldDayMap = {};
  oldPlan.weeks.forEach(w=> w.days.forEach(d=> oldDayMap[d.date]=d));
  const mergedWeeks = newPlan.weeks.map(w=>{
    const days = w.days.map(d=>{
      if(d.date<=todayIso && oldDayMap[d.date]) return oldDayMap[d.date];
      return d;
    });
    return Object.assign({}, w, {days});
  });
  const present=new Set(mergedWeeks.flatMap(w=>w.days.map(d=>d.date)));
  oldPlan.weeks.forEach(oldWeek=>{
    const missing=oldWeek.days.filter(d=>d.date<=todayIso&&!present.has(d.date));
    if(!missing.length)return;
    const oldDates=new Set(oldWeek.days.map(d=>d.date));
    const target=mergedWeeks.find(w=>w.days.some(d=>oldDates.has(d.date)));
    if(target){
      target.days=target.days.concat(missing).sort((a,b)=>a.date.localeCompare(b.date));
    }else{
      mergedWeeks.push(Object.assign({},oldWeek,{days:missing}));
      mergedWeeks.sort((a,b)=>(a.days[0]?.date||'').localeCompare(b.days[0]?.date||''));
    }
    missing.forEach(d=>present.add(d.date));
  });
  return { weeks: mergedWeeks, meta:newPlan.meta };
}

function recalcFuture(reasonText){
  const iso = todayISO();
  const ctx = currentContext();
  const sessions = flattenPlan(state.planCurrent);
  const historySummary = buildHistorySummary(sessions, state.results, iso);
  const raw = generateAdaptivePlan(Object.assign({}, ctx, {historySummary, startDate: f12ActiveCycleStartDate()}));
  enrichPlan(raw, ctx);
  const merged = mergePlans(state.planCurrent, raw, iso);
  // F11: PLAN_ORIGINAL es la referencia histórica de la primera generación.
  // Recalcular el futuro no debe redefinirla; PLAN_CURRENT representa el estado vivo.
  if(!state.planOriginal) state.planOriginal = deepClone(merged);
  state.planCurrent = deepClone(merged);
  state.configDirty = false;
  logAdaptation({type:'plan', decision:'RECALC', reason: reasonText || 'Recalculado el plan futuro tras un cambio de configuración.'});
  saveState();
}

function markConfigDirty(scope='all'){
  state.configDirty=true;
  if(scope==='all'&&state.racePlans)Object.values(state.racePlans).forEach(plan=>{if(plan)plan.configDirty=true;});
  saveState();
}

/* ---------------------------------------------------------------------
   5) RESULTADOS + ADAPTACIÓN INMEDIATA + REVISIÓN SEMANAL
--------------------------------------------------------------------- */
function getResult(id,legacyId){ return state.results[id] || (legacyId&&state.results[legacyId]) || null; }
function validateSessionPatch(patch){
  if(!patch || !['completed','partial','missed'].includes(patch.status)) return false;
  if(patch.status!=='missed'){
    if(patch.distance!=null && (!Number.isFinite(Number(patch.distance))||Number(patch.distance)<=0)) return false;
    if(patch.duration!=null && (!Number.isFinite(Number(patch.duration))||Number(patch.duration)<=0)) return false;
    if(patch.rpe!=null && patch.rpe!=='' && (!Number.isFinite(Number(patch.rpe))||Number(patch.rpe)<1||Number(patch.rpe)>10)) return false;
    if(patch.discomfort!=null && (!Number.isFinite(Number(patch.discomfort))||Number(patch.discomfort)<0||Number(patch.discomfort)>10)) return false;
  }
  return true;
}
function setResult(session, patch){
  if(!validateSessionPatch(patch)) { toast('Revisa los valores del registro'); return false; }
  const prev = getResult(session.id,session.legacyId) || {};
  const result = Object.assign({}, prev, patch, {loggedAt: new Date().toISOString()});
  if(result.status==='missed'){
    delete result.distance; delete result.duration; delete result.pace;
    delete result.rpe; delete result.discomfort; delete result.sensations; delete result.fatigue;
  }
  state.results[session.id] = result;
  if(session.legacyId && session.legacyId!==session.id) delete state.results[session.legacyId];
  f12RecordAthleteSession({raceId:state.activeRaceId,cycleId:state.raceCycles?.[state.activeRaceId]?.id||null,sessionId:session.id,date:session.date,category:session.category,result:f12Clone(result)});
  saveState();

  const recentResults = allSessions()
    .filter(s=> (s.category==='running'||s.category==='test') && s.date<session.date)
    .sort((a,b)=> a.date<b.date?1:-1)
    .slice(0,3)
    .map(s=> state.results[s.id])
    .filter(r=> r && r.status);

  const decisions = evaluateSessionResult(session, result, recentResults);
  decisions.forEach(dec=>{
    applyImmediateDecision(session, dec);
  });

  maybeRunWeeklyReview(session.week);
  saveState();
  return true;
}

function findWeekDays(weekN){
  const w = state.planCurrent.weeks.find(w=>w.n===weekN);
  return w ? w.days : [];
}

function applyImmediateDecision(session, dec){
  const iso = todayISO();
  const allDays = [];
  state.planCurrent.weeks.forEach(w=> w.days.forEach(d=> allDays.push(d)));
  const future = allDays.filter(d=> d.date>iso && (categoryFor(d.type)==='running'||categoryFor(d.type)==='test'));
  const n = dec.scope==='next_1' ? 1 : dec.scope==='next_2' ? 2 : 1;
  const targets = future.slice(0, n);

  targets.forEach(d=>{
    if(dec.action==='REPLACE'){
      if(!d.plannedOriginal) d.plannedOriginal = deepClone(d.planned);
      const oldLabel = SESSION_LIBRARY[d.type].label;
      d.type = 'RECOVERY_RUN';
      const lib = SESSION_LIBRARY['RECOVERY_RUN'];
      d.planned = Object.assign({duration: Math.min((d.plannedOriginal&&d.plannedOriginal.duration)||18, 18), rpe:(lib.rpe||[]).join('-')},
        buildSessionContent('RECOVERY_RUN', {duration:18, rpe:(lib.rpe||[]).join('-')}, {}));
      d.planned.notes = 'Sustituida por una alternativa suave (o bici/elíptica si lo prefieres) en vez de "'+oldLabel+'".';
      d.adapted = true;
      d.adaptedReason = dec.reason;
    } else if(dec.action==='MAINTAIN'){
      d.adapted = true;
      d.adaptedReason = dec.reason;
    }
  });

  if(targets.length){
    logAdaptation({type:'session', decision:dec.action, reason:dec.reason});
  }
}

function weekKeyFor(weekN){ return 'w'+weekN; }

// Margen de gracia (Fase 10): tras terminar la semana, se espera este nº de días antes
// de cerrar su revisión aunque queden sesiones sin registrar todavía, para no "congelar"
// una semana con evidencia incompleta solo porque el usuario aún no ha tenido tiempo de
// registrar todas sus sesiones (p. ej. registro retroactivo de varias sesiones seguidas).
const WEEKLY_REVIEW_GRACE_DAYS = 3;

/* Construye el contexto que necesita weeklyReview() (Fase 10): semanas previas ya
   revisadas (con nº de sesiones para el cómputo de evidencia acumulada, adherencia
   y ritmo medio para detectar estancamiento) + carga reciente (ventana corta).
   El ENGINE no toca STATE directamente; esta función es la única que traduce
   STATE a los parámetros planos que weeklyReview() espera. */
function buildWeeklyReviewContext(weekN, iso){
  const priorWeeks = [];
  for(let w=1; w<weekN; w++){
    const stored = state.weeklyReviews[weekKeyFor(w)];
    if(!stored) continue;
    const wkSessions = flattenPlan(state.planCurrent).filter(s=>s.week===w)
      .filter(s=> s.category==='running'||s.category==='test');
    const paces = [];
    let sessionsWithResult = 0;
    wkSessions.forEach(s=>{
      const r = state.results[s.id];
      if(r && r.status){ sessionsWithResult++; if(r.distance && r.duration) paces.push(r.duration/r.distance); }
    });
    priorWeeks.push({
      week: w,
      adherenceRate: stored.adherence ? stored.adherence.rate : null,
      avgPace: paces.length ? paces.reduce((a,b)=>a+b,0)/paces.length : null,
      sessionsCount: sessionsWithResult,
    });
  }
  const recentLoad = computeRecentLoad(allSessions(), state.results, iso);
  const decisionHistory = buildDecisionHistoryForEngine();
  let progressionLoadDeltaPct = null;
  const nextWeek = state.planCurrent && state.planCurrent.weeks.find(w=>w.n===weekN+1);
  const baseWeek = state.planOriginal && state.planOriginal.weeks.find(w=>w.n===weekN+1);
  if(nextWeek && baseWeek){
    const load = wk=>wk.days.reduce((sum,d)=>{ const lib=SESSION_LIBRARY[d.type]; return sum + ((d.planned&&d.planned.duration&&lib&&d.type!=='RACE') ? Number(d.planned.duration) : 0); },0);
    const baseLoad=load(baseWeek), currentLoad=load(nextWeek);
    if(baseLoad>0) progressionLoadDeltaPct=((currentLoad-baseLoad)/baseLoad)*100;
  }
  return { priorWeeks, recentLoad, decisionHistory, progressionLoadDeltaPct };
}

function maybeRunWeeklyReview(weekN){
  const iso = todayISO();
  const days = findWeekDays(weekN);
  if(!days.length) return;
  const weekEnd = days[days.length-1].date;
  if(weekEnd >= iso) return; // la semana aún no ha terminado
  const key = weekKeyFor(weekN);
  if(state.weeklyReviews[key]) return; // ya revisada

  const sessions = flattenPlan(state.planCurrent).filter(s=>s.week===weekN);
  const runningSessions = sessions.filter(s=> s.category==='running'||s.category==='test');
  const stillPending = runningSessions.some(s=> !state.results[s.id] || !state.results[s.id].status);
  const withinGrace = iso <= addDays(weekEnd, WEEKLY_REVIEW_GRACE_DAYS);
  if(stillPending && withinGrace) return; // dar margen a que el usuario registre el resto antes de fijar la revisión

  const context = buildWeeklyReviewContext(weekN, iso);
  const review = weeklyReview(sessions, state.results, context);
  state.weeklyReviews[key] = Object.assign({computedAt: iso}, review);
  const cycle=f12ActiveCycle();
  if(cycle){cycle.weeklyReviews=cycle.weeklyReviews||[];cycle.weeklyReviews.push(Object.assign({week:weekN,computedAt:iso},f12Clone(review)));}
  logAdaptation({type:'week', week:weekN, decision:review.decision, reason:'Semana '+weekN+': '+review.reason});

  if(review.decision!=='MAINTAIN'){
    const nextWeekDays = findWeekDays(weekN+1);
    if(nextWeekDays && nextWeekDays.length){
      const nextSessions = flattenPlan({weeks:[{n:weekN+1, days:nextWeekDays}]});
      const touched = applyWeeklyDecision(nextSessions, review.decision, 'Semana '+weekN+': '+review.reason);
      touched.forEach(t=>{
        const d = nextWeekDays.find(dd => dd.date===t.date);
        if(d && d.date>iso && !state.results[flattenPlan({weeks:[{n:weekN+1,days:[d]}]})[0]?.id]){
          if(!d.plannedOriginal) d.plannedOriginal = deepClone(d.planned);
          if(t.newType)d.type=t.newType;
          const lib=SESSION_LIBRARY[d.type],base={duration:t.newDuration,rpe:(lib.rpe||[]).join('-')},weekObj=state.planCurrent.weeks.find(w=>w.n===weekN+1)||{n:weekN+1,phase:'base',phaseLabel:'Base'};
          d.planned=Object.assign(base,buildSessionContent(d.type,base,{week:weekObj,profile:state.profile,goal:state.goal,policy:distancePolicy(state.goal.distanceKm)}));
          d.adapted = true;
          d.adaptedReason = t.reason;
        }
      });
    }
  }
}

function runPendingWeeklyReviews(){
  if(!state.planCurrent) return;
  state.planCurrent.weeks.forEach(w=> maybeRunWeeklyReview(w.n));
  saveState();
}

/* ---------------------------------------------------------------------
   6) WEIGHT
--------------------------------------------------------------------- */
function setWeight(v){
  const iso = todayISO();
  const idx = state.weights.findIndex(w=>w.date===iso);
  if(idx>=0) state.weights[idx].weight = v; else state.weights.push({date:iso, weight:v});
  saveState();
}

/* ---------------------------------------------------------------------
   6b) CHECK-IN DIARIO (Fase 9) — persistido en el mismo STATE/localStorage,
   asociado a su fecha (state.checkins['YYYY-MM-DD']). Es información de
   ENTRADA para computeReadiness(); nunca modifica PLAN_ORIGINAL/PLAN_CURRENT
   por sí solo (no hay progresiones/adaptaciones automáticas por check-in).
--------------------------------------------------------------------- */
function getCheckin(dateIso){ return state.checkins[dateIso] || null; }
function setCheckin(dateIso, patch){
  const prev = state.checkins[dateIso] || {};
  state.checkins[dateIso] = Object.assign({}, prev, patch, {loggedAt: new Date().toISOString()});
  saveState();
}
