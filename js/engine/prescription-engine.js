/* =====================================================================
   MADE2RUN — V2 — DATA + GENERADOR + ENGINE
   Fase 1-3 de la implementación (modelo de datos, generador, motor).
   Este archivo se desarrolla y prueba de forma aislada en Node antes
   de incrustarse en el <script> del HTML final.
===================================================================== */

/* ---------------------------------------------------------------------
   0) BIBLIOTECA DE SESIONES — el ENGINE nunca inventa tipos nuevos,
   solo combina los definidos aquí.
--------------------------------------------------------------------- */
const SESSION_LIBRARY = {
  REST:        { label:'Descanso', category:'rest', goal:'Recuperación completa', level:['principiante','intermedio','avanzado'], rpe:[0,0], durationRange:[0,0] },
  WALK:        { label:'Caminata activa', category:'running', goal:'Crear hábito y capacidad aeróbica sin exigir carrera continua', level:['principiante','intermedio','avanzado'], rpe:[2,3], durationRange:[20,45] },
  RUN_WALK:    { label:'Caminar-correr', category:'running', goal:'Adaptar al impacto de forma progresiva', level:['principiante'], rpe:[3,4], durationRange:[18,30],
                 useWhen:'Fase de adaptación, o capacidad continua actual menor de 10 minutos.', avoidWhen:'Ya se corren 15+ minutos continuos sin problema.' },
  EASY_RUN:    { label:'Rodaje fácil', category:'running', goal:'Base aeróbica', level:['principiante','intermedio','avanzado'], rpe:[3,4], durationRange:[15,40],
                 useWhen:'Cualquier fase, sesión por defecto.', avoidWhen:'' },
  AEROBIC_RUN: { label:'Rodaje aeróbico', category:'running', goal:'Sostener un esfuerzo cómodo durante más tiempo', level:['principiante','intermedio','avanzado'], rpe:[4,5], durationRange:[25,60] },
  RECOVERY_RUN:{ label:'Rodaje de recuperación', category:'running', goal:'Activar sin fatigar', level:['principiante','intermedio','avanzado'], rpe:[2,3], durationRange:[12,22],
                 useWhen:'Tras una sesión dura, en descarga, o en taper.', avoidWhen:'' },
  LONG_EASY:   { label:'Rodaje largo', category:'running', goal:'Resistencia / volumen semanal', level:['principiante','intermedio','avanzado'], rpe:[4,5], durationRange:[20,45],
                 useWhen:'Desde fase base en adelante, normalmente 1x/semana.', avoidWhen:'Fase de adaptación pura.' },
  FARTLEK:     { label:'Fartlek suave', goal:'Introducir cambios de ritmo de forma controlada', category:'running', level:['principiante','intermedio','avanzado'], rpe:[5,6], durationRange:[20,30],
                 useWhen:'Fase de desarrollo, con base de 15-20 min continuos.', avoidWhen:'Fase de adaptación.' },
  PROGRESSION: { label:'Rodaje progresivo', goal:'Aprender a aumentar el esfuerzo sin salir demasiado rápido', category:'running', level:['intermedio','avanzado'], rpe:[4,7], durationRange:[25,50] },
  HILLS:       { label:'Cuestas', goal:'Mejorar fuerza y técnica con esfuerzos cortos y controlados', category:'running', level:['intermedio','avanzado'], rpe:[6,8], durationRange:[25,45] },
  STRIDES:     { label:'Progresiones cortas', goal:'Economía de carrera', category:'running', level:['principiante','intermedio','avanzado'], rpe:[6,7], durationRange:[15,25],
                 useWhen:'Añadidas al final de un rodaje fácil.', avoidWhen:'Molestias activas ≥3/10.' },
  TEMPO:       { label:'Tempo / umbral suave', goal:'Umbral aeróbico', category:'running', level:['intermedio','avanzado'], rpe:[6,7], durationRange:[20,35],
                 useWhen:'Fase desarrollo/específica, nivel intermedio o superior.', avoidWhen:'Principiante en fase temprana.' },
  THRESHOLD:   { label:'Umbral', goal:'Resistencia a la fatiga a ritmo fuerte', category:'running', level:['intermedio','avanzado'], rpe:[7,8], durationRange:[25,40],
                 useWhen:'Fase desarrollo/específica.', avoidWhen:'Principiante en fase temprana, o con molestias.' },
  INTERVALS:   { label:'Intervalos a ritmo objetivo', goal:'Especificidad de carrera', category:'running', level:['principiante','intermedio','avanzado'], rpe:[7,8], durationRange:[20,35],
                 useWhen:'Fase específica, con base de 20-25 min continuos.', avoidWhen:'Fase adaptación/base.' },
  SHORT_INTERVALS:{ label:'Intervalos cortos', goal:'Mejorar velocidad y economía manteniendo buena técnica', category:'running', level:['intermedio','avanzado'], rpe:[7,8], durationRange:[25,45] },
  LONG_INTERVALS:{ label:'Intervalos largos', goal:'Sostener esfuerzos próximos al ritmo de competición', category:'running', level:['intermedio','avanzado'], rpe:[7,8], durationRange:[30,60] },
  RACE_PACE:   { label:'Ritmo de carrera', goal:'Practicar el esfuerzo específico del objetivo', category:'running', level:['intermedio','avanzado'], rpe:[6,8], durationRange:[25,70] },
  TEST:        { label:'Test de referencia', goal:'Medir capacidad real para ajustar el plan', category:'test', level:['principiante','intermedio','avanzado'], rpe:[7,8], durationRange:[10,20],
                 useWhen:'Solo si hay base aeróbica suficiente (≥18-20 min continuos).', avoidWhen:'Sin esa base, o con molestias activas.' },
  RACE:        { label:'Carrera', goal:'Objetivo final', category:'carrera', level:['principiante','intermedio','avanzado'], rpe:['según escenario','según escenario'], durationRange:[0,0],
                 useWhen:'Día de la prueba.', avoidWhen:'' },
};

/* ---------------------------------------------------------------------
   1) FASES — qué tipos de sesión permite cada fase (antes de filtrar
   por nivel y por limitaciones activas)
--------------------------------------------------------------------- */
const PHASES = {
  adaptacion: { label:'Adaptación',  allowed:['WALK','RUN_WALK','REST'] },
  base:       { label:'Base',        allowed:['EASY_RUN','AEROBIC_RUN','RUN_WALK','LONG_EASY','RECOVERY_RUN','REST'] },
  desarrollo: { label:'Desarrollo',  allowed:['EASY_RUN','AEROBIC_RUN','LONG_EASY','FARTLEK','PROGRESSION','HILLS','STRIDES','RECOVERY_RUN','TEMPO','REST'] },
  especifica: { label:'Específica',  allowed:['EASY_RUN','AEROBIC_RUN','LONG_EASY','INTERVALS','SHORT_INTERVALS','LONG_INTERVALS','RACE_PACE','TEMPO','THRESHOLD','TEST','RECOVERY_RUN','REST'] },
  taper:      { label:'Taper',       allowed:['EASY_RUN','RECOVERY_RUN','STRIDES','REST','RACE'] },
};

/* ---------------------------------------------------------------------
   2) VALORES POR DEFECTO — perfil inicial real del usuario
--------------------------------------------------------------------- */
function defaultProfile(){
  return {
    name: '',
    age: 27,
    heightCm: 181,
    weightKg: 96.85,
    weightGoalKg: 90,
    level: 'principiante',          // principiante | intermedio | avanzado
    trainingKnowledge: 'basico',    // basico | familiar | tecnico (afecta a la explicación, no a la carga)
    experienceNote: '',
    currentCapabilityMinutes: 7.5,  // minutos corriendo de forma continua actualmente
    recentRunDaysPerWeek: 2,
    currentWeeklyMinutes: 45,
    usualLongSessionMinutes: 20,
    trainingYears: 0,
    toleratesConsecutiveDays: false,
    walkingPaceMinKm: 11,
    knownRecentPaceMinKm: null,     // ritmo habitual si se conoce (null = desconocido, válido)
    knownRecentBest: null,          // mejor marca reciente si se conoce
  };
}
function defaultGoal(){
  return {
    distanceKm: 5,                   // 3 | 5 | 10
    date: '2026-10-10',
    type: 'tiempo_objetivo',         // 'completar' | 'tiempo_objetivo' | 'mejorar_rendimiento'
    targetPaceMinKm: 6.5,            // solo relevante si type !== 'completar'
    targetPaceLabel: '6:30',
    startDate: '2026-08-12',
  };
}
function defaultAvailability(){
  return {
    days: [1,3,6],                   // 0=domingo ... 6=sábado (convención JS Date.getDay)
    maxSessionsPerWeek: 3,
    sessionDurationAvailMin: 40,
    blockedDates: [],                 // fechas ISO puntuales bloqueadas
  };
}
function defaultActivities(){
  return [
    { id:'act-1', type:'hipertrofia', frequency:4, intensity:'alta' },
  ];
}
function defaultLimitations(){
  return [
    { id:'lim-1', area:'rodilla', label:'Condromalacia rotuliana', discomfort:0 },
  ];
}

/* ---------------------------------------------------------------------
   3) UTILIDADES DE FECHAS
--------------------------------------------------------------------- */
function parseISO(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function toISO(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function addDays(iso, n){ const d=parseISO(iso); d.setDate(d.getDate()+n); return toISO(d); }
function daysBetween(a,b){ return Math.round((parseISO(b)-parseISO(a))/86400000); }
const DOW_LABEL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

/* F14: contrato único de distancia. Los rangos definen decisiones deportivas
   graduales; la distancia real se conserva siempre, también en valores custom. */
function normalizeDistanceKm(value, fallback=5){
  const n=Number(value);
  return Number.isFinite(n)&&n>=0.5&&n<=200 ? Math.round(n*1000)/1000 : fallback;
}
function formatDistanceKm(value){
  const n=normalizeDistanceKm(value,0);
  if(!n)return '--';
  return (Number.isInteger(n)?String(n):String(Math.round(n*1000)/1000).replace('.',','))+' km';
}
function distancePolicy(distanceKm){
  const d=normalizeDistanceKm(distanceKm,5);
  if(d<=3)return {key:'short',label:'Distancia corta',recommendedWeeks:6,taperWeeks:1,longMax:45,durationFactor:.85,specificType:'SHORT_INTERVALS'};
  if(d<=7)return {key:'five',label:'Corta distancia',recommendedWeeks:8,taperWeeks:1,longMax:60,durationFactor:1,specificType:'SHORT_INTERVALS'};
  if(d<=12)return {key:'ten',label:'Distancia media',recommendedWeeks:10,taperWeeks:1,longMax:75,durationFactor:1.08,specificType:'LONG_INTERVALS'};
  if(d<=18)return {key:'long',label:'Fondo corto',recommendedWeeks:12,taperWeeks:2,longMax:95,durationFactor:1.18,specificType:'TEMPO'};
  if(d<=25)return {key:'half',label:'Media distancia',recommendedWeeks:14,taperWeeks:2,longMax:120,durationFactor:1.3,specificType:'RACE_PACE'};
  if(d<=45)return {key:'marathon',label:'Maratón',recommendedWeeks:20,taperWeeks:3,longMax:165,durationFactor:1.48,specificType:'RACE_PACE'};
  return {key:'ultra',label:'Larga distancia',recommendedWeeks:24,taperWeeks:3,longMax:180,durationFactor:1.6,specificType:'AEROBIC_RUN'};
}

/* ---------------------------------------------------------------------
   4) ESTRUCTURA DE FASES SEGÚN CONTEXTO (no siempre la misma)
--------------------------------------------------------------------- */
function buildPhaseStructure(totalWeeks, level, policy){
  totalWeeks = Math.max(1, Math.round(totalWeeks));
  const taper = Math.min(totalWeeks,Math.max(1,Number(policy?.taperWeeks)||1));
  if(totalWeeks<=taper){
    return [{phase:'taper', weeks:totalWeeks}];
  }
  let remaining = totalWeeks - taper;

  if(level==='principiante'){
    if(remaining<=2){
      return [{phase:'adaptacion',weeks:remaining},{phase:'taper',weeks:taper}];
    }
    if(remaining<=4){
      const adapt = 1;
      const rest = remaining - adapt;
      const base = Math.ceil(rest/2), desarrollo = rest-base;
      const parts = [{phase:'adaptacion',weeks:adapt}];
      if(base>0) parts.push({phase:'base',weeks:base});
      if(desarrollo>0) parts.push({phase:'desarrollo',weeks:desarrollo});
      parts.push({phase:'taper',weeks:taper});
      return parts;
    }
    // estructura completa
    const adapt = 2;
    const rem2 = remaining - adapt;
    const base = Math.max(1, Math.round(rem2*0.25));
    const desarrollo = Math.max(1, Math.round(rem2*0.35));
    const especifica = Math.max(1, rem2 - base - desarrollo);
    return [
      {phase:'adaptacion',weeks:adapt},
      {phase:'base',weeks:base},
      {phase:'desarrollo',weeks:desarrollo},
      {phase:'especifica',weeks:especifica},
      {phase:'taper',weeks:taper},
    ];
  }

  // intermedio / avanzado: sin fase de adaptación
  if(remaining<=3){
    return [{phase:'especifica',weeks:remaining},{phase:'taper',weeks:taper}];
  }
  const base = Math.max(1, Math.round(remaining*0.2));
  const desarrollo = Math.max(1, Math.round(remaining*0.35));
  const especifica = Math.max(1, remaining - base - desarrollo);
  return [
    {phase:'base',weeks:base},
    {phase:'desarrollo',weeks:desarrollo},
    {phase:'especifica',weeks:especifica},
    {phase:'taper',weeks:taper},
  ];
}

/* ---------------------------------------------------------------------
   5) BLOQUES SEMANALES DE CALENDARIO (7 días desde startDate,
   última semana recortada exactamente en goalDate)
--------------------------------------------------------------------- */
function buildWeekBlocks(startDate, goalDate){
  const blocks = [];
  let cursor = startDate;
  let n=1;
  while(cursor <= goalDate){
    let end = addDays(cursor, 6);
    if(end > goalDate) end = goalDate;
    const days = [];
    let d = cursor;
    while(d<=end){ days.push(d); d = addDays(d,1); }
    blocks.push({ n, start:cursor, end, days });
    cursor = addDays(end,1);
    n++;
  }
  return blocks;
}

/* ---------------------------------------------------------------------
   6) SELECCIÓN DE DÍAS DE RUNNING DENTRO DE UN BLOQUE, RESPETANDO
   disponibilidad y fechas bloqueadas
--------------------------------------------------------------------- */
function pickRunningDates(weekDays, availability, sessionsWanted){
  const candidates = weekDays.filter(iso=>{
    const dow = parseISO(iso).getDay();
    return availability.days.includes(dow) && !availability.blockedDates.includes(iso);
  });
  if(candidates.length<=sessionsWanted) return candidates;
  // si hay más candidatos que sesiones deseadas, repartir de forma uniforme
  const picked = [];
  const step = candidates.length/sessionsWanted;
  for(let i=0;i<sessionsWanted;i++){
    picked.push(candidates[Math.min(candidates.length-1, Math.round(i*step))]);
  }
  return [...new Set(picked)];
}

/* ---------------------------------------------------------------------
   7) ¿CUÁNTAS SESIONES DE RUNNING POR SEMANA? (disponibilidad + criterio
   de progresión del motor para el 4º día opcional)
--------------------------------------------------------------------- */
function readyForFourthDay(historySummary){
  if(!historySummary) return false;
  return historySummary.longestContinuousMinutes>=25
      && historySummary.recentDiscomfortMax<3
      && historySummary.adherence!=null && historySummary.adherence>=0.8
      && historySummary.weeksCompleted>=4;
}

function effectiveSessionsPerWeek(profile, availability, historySummary){
  const desired = Math.min(availability.maxSessionsPerWeek, availability.days.length);
  const baseline = Math.min(desired, 3);
  if(desired<=3) return { count: Math.max(1,desired), note: desired<3 ? 'Ajustado a tu disponibilidad actual ('+desired+' día/s).' : null };
  // el usuario permite 4, pero el motor solo lo concede si hay evidencia
  if(readyForFourthDay(historySummary)){
    return { count:4, note:'4º día activado: cumples los criterios de progresión.' };
  }
  return { count:3, note:'Se mantienen 3 días de running: aún no se cumplen todos los criterios para un 4º día (ver Perfil).' };
}

/* ---------------------------------------------------------------------
   8) PATRÓN DE TIPOS DE SESIÓN POR FASE, SEGÚN Nº DE SESIONES/SEMANA
--------------------------------------------------------------------- */
function sessionPattern(phase, count, weekIdxInPhase, phaseWeeks, isDeloadWeek, limitationCap, policy, profile){
  let base;
  const capability=Number(profile?.currentCapabilityMinutes||0);
  const beginner=profile?.level==='principiante';
  if(beginner&&capability<15&&phase!=='taper'){
    base=capability<5?['WALK','RUN_WALK','WALK','RUN_WALK']:['RUN_WALK','RUN_WALK','EASY_RUN','RECOVERY_RUN'];
  }else switch(phase){
    case 'adaptacion': base = ['RUN_WALK','RUN_WALK','RUN_WALK','RUN_WALK']; break;
    case 'base':       base = ['EASY_RUN','LONG_EASY','EASY_RUN','RECOVERY_RUN']; break;
    case 'desarrollo': base = ['EASY_RUN',beginner?'FARTLEK':(profile?.level==='avanzado'&&weekIdxInPhase%2?'HILLS':'PROGRESSION'),'LONG_EASY','RECOVERY_RUN']; break;
    case 'especifica': base = ['EASY_RUN',beginner?'FARTLEK':(policy?.specificType||'INTERVALS'),'LONG_EASY','RECOVERY_RUN']; break;
    case 'taper':       base = ['RECOVERY_RUN','EASY_RUN','RECOVERY_RUN','RECOVERY_RUN']; break;
    default: base = ['EASY_RUN','EASY_RUN','EASY_RUN','EASY_RUN'];
  }
  let pattern = base.slice(0,count);
  if(isDeloadWeek){
    pattern = pattern.map(t => ['INTERVALS','SHORT_INTERVALS','LONG_INTERVALS','RACE_PACE','HILLS','PROGRESSION','FARTLEK','THRESHOLD','TEMPO'].includes(t) ? 'EASY_RUN' : t);
  }
  if(limitationCap==='severe'){
    pattern = pattern.map((_,i)=> i%2===0 ? 'RUN_WALK' : 'REST');
  } else if(limitationCap==='moderate'){
    pattern = pattern.map(t => ['INTERVALS','SHORT_INTERVALS','LONG_INTERVALS','RACE_PACE','HILLS','THRESHOLD','TEMPO'].includes(t) ? 'FARTLEK' : t);
  }
  return pattern;
}

function lerp(a,b,t){ return a + (b-a)*Math.max(0,Math.min(1,t)); }

function durationFor(type, weekIdxInPhase, phaseWeeks, availability, profile, policy){
  const def = SESSION_LIBRARY[type];
  if(!def || def.durationRange[1]===0) return null;
  const t = phaseWeeks>1 ? weekIdxInPhase/(phaseWeeks-1) : 1;
  let dur = Math.round(lerp(def.durationRange[0], def.durationRange[1], t));
  if(type==='RUN_WALK'){
    dur = Math.round(Math.min(availability.sessionDurationAvailMin, Math.max(18, profile.currentCapabilityMinutes*2 + weekIdxInPhase*4)));
  }else if(type==='WALK'){
    dur=Math.round(Math.min(availability.sessionDurationAvailMin,25+weekIdxInPhase*4));
  }else if(type==='LONG_EASY'){
    const target=Math.round(30+(policy?.durationFactor||1)*weekIdxInPhase*8);
    dur=Math.min(policy?.longMax||60,Math.max(dur,target));
  }else{
    dur=Math.round(dur*(policy?.durationFactor||1));
  }
  dur = Math.min(dur, availability.sessionDurationAvailMin);
  return dur;
}

/* ---------------------------------------------------------------------
   9) NIVEL DE LIMITACIÓN ACTIVA (a partir de las molestias declaradas)
--------------------------------------------------------------------- */
function limitationCapFrom(limitations){
  if(!limitations || !limitations.length) return 'none';
  const max = Math.max(...limitations.map(l=>l.discomfort||0));
  if(max>4) return 'severe';
  if(max>=3) return 'moderate';
  return 'none';
}

/* ---------------------------------------------------------------------
   F14.1 — PRESCRIPTION ENGINE
   Baseline -> viabilidad -> capacidad/volumen proyectados -> microciclo.
--------------------------------------------------------------------- */
function f141Baseline(profile){
  const cap=Math.max(0,Number(profile?.currentCapabilityMinutes)||0);
  const level=profile?.level||'principiante';
  const frequency=Math.max(0,Math.min(7,Number(profile?.recentRunDaysPerWeek)||0));
  const inferredFrequency=frequency||(cap>0?(level==='avanzado'?4:level==='intermedio'?3:2):0);
  const weekly=Number(profile?.currentWeeklyMinutes)>0?Number(profile.currentWeeklyMinutes):Math.round(cap*Math.max(1,inferredFrequency)*.8);
  const long=Number(profile?.usualLongSessionMinutes)>0?Number(profile.usualLongSessionMinutes):Math.round(Math.max(cap,weekly*.35));
  return {continuousMin:cap,frequency:inferredFrequency,weeklyMinutes:Math.max(cap?20:30,weekly||0),longMinutes:Math.max(0,long),years:Math.max(0,Number(profile?.trainingYears)||0),consecutive:profile?.toleratesConsecutiveDays===true};
}
function f141Feasibility(profile,goal,availability,totalWeeks){
  const b=f141Baseline(profile),d=normalizeDistanceKm(goal.distanceKm,5),p=distancePolicy(d),available=Math.min(Number(availability.maxSessionsPerWeek)||0,(availability.days||[]).length);
  let status='viable',reason='El horizonte, la base reciente y la disponibilidad permiten construir una progresión razonable.';
  const minimumWeeks=Math.max(3,Math.ceil(p.recommendedWeeks*(d>=42?.7:d>=21?.6:.5)));
  if(totalWeeks<minimumWeeks){status='horizon_insufficient';reason=`Quedan ${totalWeeks} semanas; para ${formatDistanceKm(d)} esta base necesita aproximadamente ${minimumWeeks} o más para una preparación razonable.`;}
  else if((d>=42&&b.weeklyMinutes<120&&b.longMinutes<45)||(d>42&&b.weeklyMinutes<180)){status='base_insufficient';reason=`La base reciente (${Math.round(b.weeklyMinutes)} min/semana y sesión larga de ${Math.round(b.longMinutes)} min) es insuficiente para preparar ${formatDistanceKm(d)} con garantías razonables.`;}
  else if(b.continuousMin<20&&d>10){status='conservative';reason=`El objetivo requiere una estrategia conservadora: se priorizará tiempo de movimiento y CaCo sobre ritmos o marca.`;}
  else if(available<2){status='base_insufficient';reason='Se necesita disponibilidad para al menos dos sesiones semanales para construir una preparación razonable.';}
  return {status,reason,minimumWeeks,baseline:b};
}
function f141ProjectedCapability(baseline,weekIndex,totalWeeks,isConsolidation,feasibility){
  let cap=baseline.continuousMin;
  if(cap<=0)cap=Math.max(0,(weekIndex-1)*1.25);
  else cap+=Math.max(0,weekIndex-1)*(cap<15?1.5:cap<30?2:Math.min(2.5,cap*.035));
  if(isConsolidation)cap-=baseline.continuousMin<15?1:1.5;
  if(['horizon_insufficient','base_insufficient'].includes(feasibility.status))cap=Math.min(cap,baseline.continuousMin+Math.max(0,totalWeeks-1)*1.25);
  return Math.max(baseline.continuousMin,Math.round(cap*2)/2);
}
function f141TargetWeeklyVolume(distanceKm,level){
  const d=normalizeDistanceKm(distanceKm,5),base=70+Math.pow(d,0.62)*36;
  const levelFactor=level==='avanzado'?1.35:level==='intermedio'?1.15:1;
  return Math.round(Math.min(600,base*levelFactor));
}
function f141Frequency(profile,availability,policy,progress,projectedCapability,activities,isTaper){
  const b=f141Baseline(profile),available=Math.max(1,Math.min(Number(availability.maxSessionsPerWeek)||1,(availability.days||[]).length||1));
  let ceiling=profile.level==='avanzado'?(policy.key==='marathon'||policy.key==='ultra'?6:5):profile.level==='intermedio'?(policy.key==='marathon'||policy.key==='ultra'?5:4):3;
  if(projectedCapability<12)ceiling=Math.min(ceiling,3);
  const heavy=(activities||[]).some(a=>a&&a.intensity==='alta'&&Number(a.frequency)>=3);
  if(heavy)ceiling=Math.max(2,ceiling-1);
  const growth=isTaper?0:Math.floor(progress*2+.001),fromBase=Math.max(projectedCapability<8?2:3,b.frequency||0)+growth;
  return Math.max(1,Math.min(available,ceiling,fromBase));
}
function f141QualityType(phase,profile,policy,weekIndex){
  if(phase==='base'||phase==='adaptacion')return null;
  if(profile.level==='principiante')return 'FARTLEK';
  if(phase==='desarrollo')return profile.level==='avanzado'&&weekIndex%2===0?'HILLS':'PROGRESSION';
  return policy.specificType||'TEMPO';
}
function f141Microcycle(count,phase,profile,policy,projectedCapability,isConsolidation,isRaceWeek,limitationCap,weekIndex){
  const beginnerMode=projectedCapability<30;
  if(limitationCap==='severe')return Array.from({length:count},(_,i)=>i%2?'REST':'RUN_WALK');
  if(beginnerMode){
    const types=Array.from({length:count},(_,i)=>projectedCapability<5?(i%2?'RUN_WALK':'WALK'):'RUN_WALK');
    if(count>=3&&projectedCapability<5)types[count-1]='WALK';
    return types;
  }
  if(isRaceWeek){
    const base=['RECOVERY_RUN','EASY_RUN','STRIDES','RECOVERY_RUN','EASY_RUN'];
    return base.slice(0,count);
  }
  const quality=!isConsolidation?f141QualityType(phase,profile,policy,weekIndex):null;
  let types;
  if(count===1)types=['LONG_EASY'];
  else if(count===2)types=[quality||'EASY_RUN','LONG_EASY'];
  else if(count===3)types=[quality||'EASY_RUN','EASY_RUN','LONG_EASY'];
  else if(count===4)types=['EASY_RUN',quality||'AEROBIC_RUN','EASY_RUN','LONG_EASY'];
  else if(count===5)types=['EASY_RUN',quality||'AEROBIC_RUN','RECOVERY_RUN','EASY_RUN','LONG_EASY'];
  else types=['EASY_RUN',quality||'AEROBIC_RUN','RECOVERY_RUN','EASY_RUN','LONG_EASY','RECOVERY_RUN'];
  if(limitationCap==='moderate')types=types.map(t=>['SHORT_INTERVALS','LONG_INTERVALS','RACE_PACE','HILLS','THRESHOLD','TEMPO'].includes(t)?'FARTLEK':t);
  return types.slice(0,count);
}
function f141ArrangeMicrocycle(types,dates){
  if(types.length!==dates.length||types.length<2)return {types,note:null};
  const qualityTypes=['SHORT_INTERVALS','LONG_INTERVALS','RACE_PACE','TEMPO','THRESHOLD','HILLS','FARTLEK','PROGRESSION','TEST'];
  const quality=types.find(t=>qualityTypes.includes(t)),hasLong=types.includes('LONG_EASY');
  if(!quality||!hasLong)return {types,note:null};
  let best={a:0,b:types.length-1,gap:-1};
  for(let a=0;a<dates.length;a++)for(let b=a+1;b<dates.length;b++){const gap=daysBetween(dates[a],dates[b]);if(gap>best.gap)best={a,b,gap};}
  const remaining=types.filter(t=>t!==quality&&t!=='LONG_EASY'),arranged=Array(types.length),note=best.gap<=1?'La disponibilidad junta las dos sesiones clave; la sesión de calidad se convierte en rodaje fácil para proteger la recuperación.':null;
  arranged[best.a]=best.gap<=1?'EASY_RUN':quality;arranged[best.b]='LONG_EASY';
  let ri=0;for(let i=0;i<arranged.length;i++)if(!arranged[i])arranged[i]=remaining[ri++]||'EASY_RUN';
  return {types:arranged,note};
}
function f141AllocateDurations(types,weeklyVolume,availability,profile,policy,progress,projectedCapability,isConsolidation){
  const maxSession=Math.max(15,Number(availability.sessionDurationAvailMin)||40),b=f141Baseline(profile),n=Math.max(1,types.filter(t=>t!=='REST').length);
  const weights=types.map(t=>t==='LONG_EASY'?1.65:['SHORT_INTERVALS','LONG_INTERVALS','RACE_PACE','TEMPO','THRESHOLD','HILLS','FARTLEK','PROGRESSION'].includes(t)?1.2:t==='RECOVERY_RUN'?.7:1);
  const sum=weights.reduce((a,b)=>a+b,0)||1;
  let durations=weights.map(w=>Math.max(15,Math.min(maxSession,Math.round(weeklyVolume*w/sum))));
  const longIndex=types.indexOf('LONG_EASY');
  if(longIndex>=0){
    const desired=b.longMinutes+(Math.min(policy.longMax,maxSession)-b.longMinutes)*Math.min(1,progress*.9);
    const volumeCap=weeklyVolume*(n<=2?.55:n===3?.5:(policy.key==='marathon'||policy.key==='ultra')?.36:.4);
    durations[longIndex]=Math.round(Math.max(20,Math.min(maxSession,policy.longMax,desired,volumeCap)));
  }
  if(projectedCapability<20)durations=durations.map((d,i)=>Math.min(maxSession,Math.max(20,Math.round((projectedCapability<5?25:30)+progress*15+(i===types.length-1?5:0)))));
  if(isConsolidation)durations=durations.map(d=>Math.round(d*.88));
  const prescribedTotal=durations.reduce((sum,d,i)=>sum+(types[i]==='REST'?0:d),0);
  if(prescribedTotal>weeklyVolume){
    const scale=Math.max(.1,weeklyVolume/prescribedTotal);
    durations=durations.map((d,i)=>types[i]==='REST'?0:Math.max(10,Math.min(maxSession,Math.round(d*scale))));
  }
  return durations;
}

/* ---------------------------------------------------------------------
   10) GENERADOR PRINCIPAL — generateAdaptivePlan()
   Combina PROFILE + GOAL + AVAILABILITY + ACTIVITIES + LIMITATIONS
   (+ historySummary opcional) y produce una lista de semanas con
   sesiones. NO usa GPT/IA: son reglas deterministas.
--------------------------------------------------------------------- */
function generateAdaptivePlan(ctx){
  const { profile, goal, availability, activities, limitations, historySummary, startDate } = ctx;
  const start = startDate || goal.startDate;
  const totalWeeksFloat = Math.max(1, daysBetween(start, goal.date)/7);
  const policy=distancePolicy(goal.distanceKm);
  const phaseStructure = buildPhaseStructure(totalWeeksFloat, profile.level, policy);
  const weekBlocks = buildWeekBlocks(start, goal.date);
  const limCap = limitationCapFrom(limitations);
  const feasibility=f141Feasibility(profile,goal,availability,weekBlocks.length);
  const baseline=feasibility.baseline;
  const targetVolume=Math.min(600,Math.max(f141TargetWeeklyVolume(goal.distanceKm,profile.level),baseline.weeklyMinutes*1.08));

  // expandir phaseStructure a un array de fase por cada bloque semanal real
  const phasePerWeek = [];
  phaseStructure.forEach(seg=>{
    for(let i=0;i<seg.weeks;i++) phasePerWeek.push({phase:seg.phase, idxInPhase:i, phaseWeeks:seg.weeks});
  });
  // si hay más bloques reales que fases previstas (redondeos), rellenar con la última fase antes del taper
  while(phasePerWeek.length < weekBlocks.length){
    const last = phasePerWeek[phasePerWeek.length-1] || {phase:'base',idxInPhase:0,phaseWeeks:1};
    phasePerWeek.splice(phasePerWeek.length-1, 0, {phase:last.phase, idxInPhase:last.idxInPhase+1, phaseWeeks:last.phaseWeeks+1});
  }
  while(phasePerWeek.length > weekBlocks.length){
    phasePerWeek.shift();
  }

  const weeks = [];
  let testPlaced = false,buildVolume=Math.max(30,baseline.weeklyMinutes),previousTrainingVolume=null,previousTaperVolume=null;
  const taperStart=phasePerWeek.findIndex(p=>p.phase==='taper');

  weekBlocks.forEach((block, wi)=>{
    const pinfo = phasePerWeek[wi] || {phase:'base', idxInPhase:0, phaseWeeks:1};
    const isLastWeek = wi===weekBlocks.length-1;
    const isTaper=pinfo.phase==='taper';
    const isConsolidation=!isTaper&&wi>1&&(wi+1)%4===0;
    const progress=weekBlocks.length>1?wi/(weekBlocks.length-1):1;
    const projectedCapability=f141ProjectedCapability(baseline,wi+1,weekBlocks.length,isConsolidation,feasibility);
    const frequency=f141Frequency(profile,availability,policy,progress,projectedCapability,activities,isTaper);
    const trainingCount=isLastWeek?Math.max(1,frequency-1):frequency;
    const datesForPattern=pickRunningDates(block.days.filter(d=>!isLastWeek||d!==goal.date),availability,trainingCount);
    let pattern=f141Microcycle(datesForPattern.length,pinfo.phase,profile,policy,projectedCapability,isConsolidation,isLastWeek,limCap,wi+1);
    const capableForTest=projectedCapability>=30||Number(historySummary?.longestContinuousMinutes||0)>=30;
    if(!testPlaced&&capableForTest&&pinfo.phase==='especifica'&&pinfo.idxInPhase===0&&pattern.length>=3&&limCap==='none'&&policy.key!=='marathon'&&policy.key!=='ultra'){
      const qi=pattern.findIndex(t=>['SHORT_INTERVALS','LONG_INTERVALS','RACE_PACE','TEMPO','FARTLEK'].includes(t));if(qi>=0)pattern[qi]='TEST';testPlaced=true;
    }
    const arranged=f141ArrangeMicrocycle(pattern,datesForPattern);pattern=arranged.types;
    const heavyActivities=(activities||[]).some(a=>a&&a.intensity==='alta'&&Number(a.frequency)>=3);
    if(!isTaper&&!isConsolidation&&wi>0){const growth=profile.level==='principiante'?1.07:profile.level==='intermedio'?1.09:1.1;buildVolume=Math.min(targetVolume,Math.max(buildVolume,baseline.weeklyMinutes||30)*growth);}
    let weeklyVolume=buildVolume;
    if(isConsolidation)weeklyVolume=buildVolume*.82;
    if(isTaper){const ti=Math.max(0,wi-taperStart),tw=Math.max(1,weekBlocks.length-taperStart),factor=isLastWeek?.3:Math.max(.48,.75-ti*(.27/Math.max(1,tw-1)));weeklyVolume=buildVolume*factor;}
    if(heavyActivities)weeklyVolume*=.9;
    weeklyVolume=Math.min(weeklyVolume,Math.max(1,datesForPattern.length)*(Number(availability.sessionDurationAvailMin)||40));
    let durations=f141AllocateDurations(pattern,weeklyVolume,availability,profile,policy,progress,projectedCapability,isConsolidation);
    if(isTaper&&durations.length){
      const taperCap=previousTaperVolume!=null?previousTaperVolume:(previousTrainingVolume!=null?previousTrainingVolume*.85:weeklyVolume);
      let sum=durations.reduce((a,b)=>a+b,0);
      if(sum>taperCap){const scale=taperCap/sum;durations=durations.map(d=>Math.max(10,Math.round(d*scale)));sum=durations.reduce((a,b)=>a+b,0);while(sum>Math.floor(taperCap)&&durations.some(d=>d>10)){const i=durations.indexOf(Math.max(...durations));durations[i]--;sum--;}}
      previousTaperVolume=durations.reduce((a,b)=>a+b,0);
    }
    previousTrainingVolume=durations.reduce((a,b)=>a+b,0);

    const days = block.days.map(iso=>{
      if(iso===goal.date && isLastWeek){
        const estimatedRaceMin=goal.targetTimeSec?Number(goal.targetTimeSec)/60:normalizeDistanceKm(goal.distanceKm,5)*(Number(profile.knownRecentPaceMinKm)||Number(goal.targetPaceMinKm)||7);
        const continuousNeed=estimatedRaceMin*(policy.key==='marathon'||policy.key==='ultra'?.6:policy.key==='half'?.65:.7);
        const raceStrategy=projectedCapability<Math.max(30,continuousNeed)||feasibility.status!=='viable'?'caco':'continuous';
        return { date:iso, type:'RACE', dow:parseISO(iso).getDay(), prescriptionSeed:{raceStrategy,projectedCapabilityMin:projectedCapability,estimatedRaceMin} };
      }
      const idx = datesForPattern.indexOf(iso);
      if(idx>=0){
        const type = pattern[idx];
        return { date:iso, type, dow:parseISO(iso).getDay(), prescriptionSeed:{totalDurationMin:durations[idx],projectedCapabilityMin:projectedCapability,weekProgress:progress,consolidation:isConsolidation} };
      }
      return { date:iso, type:'COMPLEMENT', dow:parseISO(iso).getDay() };
    });

    weeks.push({
      n: block.n, phase: pinfo.phase, phaseLabel: PHASES[pinfo.phase].label,
      deload: !!isConsolidation, start: block.start, end: block.end,
      projectedCapabilityMin:projectedCapability,targetVolumeMin:Math.round(weeklyVolume),recommendedFrequency:datesForPattern.length,
      sessionsNote: `Carga prevista: ${Math.round(weeklyVolume)} min · ${datesForPattern.length} sesión(es) · capacidad continua proyectada: ${projectedCapability} min.${heavyActivities?' Se ha reducido la carga de running por la actividad complementaria intensa.':''}${arranged.note?' '+arranged.note:''}`, days
    });
  });

  return { weeks, meta:{ generatedAt: new Date().toISOString(), totalWeeks: weekBlocks.length, phaseStructure, limitationCap: limCap, distanceKm:normalizeDistanceKm(goal.distanceKm,5), distancePolicy:policy.key, feasibility, baseline, targetWeeklyVolumeMin:targetVolume, prescriptionVersion:'14.1' } };
}

if(typeof module !== "undefined"){ module.exports = {
  SESSION_LIBRARY, PHASES, defaultProfile, defaultGoal, defaultAvailability, defaultActivities, defaultLimitations,
  buildPhaseStructure, buildWeekBlocks, pickRunningDates, effectiveSessionsPerWeek, sessionPattern, durationFor,
  limitationCapFrom, generateAdaptivePlan, parseISO, toISO, addDays, daysBetween, readyForFourthDay
}; }

/* =====================================================================
   11) ENGINE — evaluación de sesiones, readiness, adherencia,
   adaptación por sesión, revisión semanal, estimación de capacidad.
   Trabaja siempre sobre PLAN_CURRENT + STATE.results, nunca sobre
   PLAN_ORIGINAL (que es inmutable).
===================================================================== */

function minToPaceStr(min){
  if(min==null || isNaN(min)) return '--';
  const totalSeconds = Math.max(0,Math.round(Number(min)*60));
  const m = Math.floor(totalSeconds/60);
  const s = totalSeconds%60;
  return m+':'+String(s).padStart(2,'0');
}

/* --- 11a) Adherencia: planificadas vs completadas/parciales/omitidas --- */
function computeAdherence(sessions, results, uptoIso){
  let planned=0, completed=0, partial=0, missed=0, pending=0;
  sessions.forEach(s=>{
    if(s.category!=='running' && s.category!=='test' && s.category!=='carrera') return;
    if(s.date>uptoIso) return;
    planned++;
    const r = results[s.id];
    if(!r || !r.status) { pending++; return; }
    if(r.status==='completed') completed++;
    else if(r.status==='partial') partial++;
    else if(r.status==='missed') missed++;
  });
  const scored = completed + partial + missed;
  const rate = scored>0 ? (completed + partial*0.5) / scored : null;
  return { planned, completed, partial, missed, pending, rate };
}

/* --- 11b) Resumen de historial para el generador (readyForFourthDay, etc.) --- */
function buildHistorySummary(sessions, results, uptoIso){
  let longest=0, weeksSet=new Set(), recentDiscomfortMax=0;
  const cutoff = addDays(uptoIso, -21);
  sessions.forEach(s=>{
    if(s.category!=='running' && s.category!=='test') return;
    if(s.date>uptoIso) return;
    const r = results[s.id];
    if(!r || (r.status!=='completed' && r.status!=='partial')) return;
    if(!['RUN_WALK','WALK'].includes(s.subtype) && r.duration && r.duration>longest) longest = r.duration;
    weeksSet.add(s.week);
    if(s.date>=cutoff && r.discomfort!=null && r.discomfort>recentDiscomfortMax) recentDiscomfortMax = r.discomfort;
  });
  const adh = computeAdherence(sessions, results, uptoIso);
  return {
    longestContinuousMinutes: longest,
    weeksCompleted: weeksSet.size,
    recentDiscomfortMax,
    adherence: adh.rate
  };
}

/* --- 11b-bis) MEMORIA DE CARGA, TENDENCIAS Y EVIDENCIA (Fase 10)
   Fuente única reutilizada por weeklyReview() y estimateCapacity(). No
   sustituye ninguna función existente: las complementa. Todo determinista,
   sin datos inventados — si faltan registros, la confianza baja en vez de
   asumir que todo está bien. --- */

// Umbrales documentados (nada de "valores mágicos" sueltos en el código):
const EVIDENCE_MIN_SESSIONS = { limitada:2, moderada:4, solida:8 };   // nº de sesiones con resultado
const EVIDENCE_MIN_WEEKS    = { limitada:1, moderada:2, solida:4 };   // nº de semanas con datos
const EVIDENCE_MIN_ADHERENCE_FOR_HIGH = 0.6;  // por debajo de esto, se limita el nivel de evidencia aunque haya volumen
const TREND_MIN_POINTS = 3;        // mínimo de puntos para hablar de "tendencia" (si no, es señal aislada)
const RPE_TREND_STEP = 0.5;        // variación mínima acumulada para considerar que el RPE empeora/mejora
const DISCOMFORT_TREND_STEP = 1;   // variación mínima acumulada para considerar que la molestia empeora/mejora
const RPE_HIGH_THRESHOLD = 8;      // a partir de aquí, un RPE se considera "alto"
const LOAD_WINDOW_DAYS = 10;       // ventana de "carga reciente" (memoria de carga)
const LOAD_HIGH_AVG_RPE = 7.5;     // RPE medio de la carga reciente a partir del cual se considera sostenida-alta
const STAGNATION_MIN_WEEKS = 3;    // nº de semanas previas necesarias para evaluar estancamiento
const STAGNATION_PACE_EPSILON = 0.02; // mejora mínima esperada de ritmo (2%) en ese periodo
const CAPACITY_STABILITY_CV = 0.08;   // coeficiente de variación por debajo del cual los ritmos se consideran "estables"

function levelFromCount(count, thresholds){
  if(count < thresholds.limitada) return 0;
  if(count < thresholds.moderada) return 1;
  if(count < thresholds.solida) return 2;
  return 3;
}
const EVIDENCE_LABELS = ['insuficiente','limitada','moderada','solida'];

/* Nivel de evidencia/confianza unificado: 'insuficiente' | 'limitada' | 'moderada' | 'solida'.
   Combina volumen de sesiones, nº de semanas con datos y adherencia. Es SIEMPRE el mínimo de
   ambas dimensiones (nunca "moderada" solo por muchas sesiones si apenas hay semanas, ni al revés). */
function evidenceLevel(sessionsCount, weeksWithData, adherenceRate){
  const bySessions = levelFromCount(sessionsCount||0, EVIDENCE_MIN_SESSIONS);
  const byWeeks = levelFromCount(weeksWithData||0, EVIDENCE_MIN_WEEKS);
  let level = Math.min(bySessions, byWeeks);
  if(adherenceRate!=null && adherenceRate<EVIDENCE_MIN_ADHERENCE_FOR_HIGH && level>1) level=1;
  return EVIDENCE_LABELS[level];
}

/* Clasifica una serie CRONOLÓGICA (más antigua primero) de valores numéricos como:
   'insuficiente' (sin datos) | 'aislado' (<TREND_MIN_POINTS puntos) |
   'estable' | 'tendencia_negativa' | 'tendencia_positiva'.
   higherIsWorse=true para RPE/molestias (subir = peor); false para ritmo si se quisiera usar al revés. */
function classifySeriesTrend(values, opts){
  opts = opts || {};
  const minPoints = opts.minPoints || TREND_MIN_POINTS;
  const step = opts.step!=null ? opts.step : RPE_TREND_STEP;
  const higherIsWorse = opts.higherIsWorse!==false;
  if(!values || values.length===0) return 'insuficiente';
  if(values.length<minPoints) return 'aislado';
  const last = values.slice(-minPoints);
  let increasing = true, decreasing = true;
  for(let i=1;i<last.length;i++){
    if(last[i] < last[i-1]-1e-9) increasing=false;
    if(last[i] > last[i-1]+1e-9) decreasing=false;
  }
  const totalDelta = last[last.length-1]-last[0];
  if(increasing && totalDelta>=step) return higherIsWorse?'tendencia_negativa':'tendencia_positiva';
  if(decreasing && Math.abs(totalDelta)>=step) return higherIsWorse?'tendencia_positiva':'tendencia_negativa';
  return 'estable';
}

/* Memoria de carga reciente (ventana de LOAD_WINDOW_DAYS días). Carga = duración × (RPE/10),
   sumada por sesión. Si falta el RPE de una sesión, se asume un esfuerzo medio conservador
   (0.5) en vez de cero, para no subestimar la carga por falta de dato. La "confianza" de esta
   estimación baja cuando faltan datos, en vez de asumir que todo está en orden. */
function computeRecentLoad(sessions, results, uptoIso, windowDays){
  windowDays = windowDays || LOAD_WINDOW_DAYS;
  const cutoff = addDays(uptoIso, -windowDays);
  let load=0, count=0, rpeSum=0, rpeCount=0, missingData=0;
  sessions.forEach(s=>{
    if(!['running','test','carrera'].includes(s.category)) return;
    if(s.date>uptoIso || s.date<cutoff) return;
    const r = results[s.id];
    if(!r || (r.status!=='completed' && r.status!=='partial')) return;
    count++;
    const dur = r.duration || (s.planned && s.planned.duration) || 0;
    const rpeVal = (r.rpe!=null && r.rpe!=='') ? Number(r.rpe) : null;
    if(rpeVal==null) missingData++; else { rpeSum+=rpeVal; rpeCount++; }
    load += dur * (rpeVal!=null ? rpeVal/10 : 0.5);
  });
  const avgRpe = rpeCount? rpeSum/rpeCount : null;
  const confidence = count===0 ? 'insuficiente' : (missingData>count/2 || count<3) ? 'limitada' : 'moderada';
  return { load:Math.round(load), sessionsCount:count, avgRpe, missingData, windowDays, confidence };
}

/* --- 11c) READINESS: estado antes de entrenar hoy.
   checkin (opcional, Fase 9): {sleep, fatigue, discomfort, feeling} del
   check-in diario de HOY. Si no se pasa (o es null), el comportamiento es
   exactamente el mismo que antes de la Fase 9 (100% retrocompatible).
   El check-in se evalúa con las MISMAS reglas/umbrales que ya existían
   para los resultados de sesión: no se inventa una escala nueva. --- */
function computeReadiness(sessions, results, todayIso, checkin){
  checkin = checkin || null;
  const recent = sessions
    .filter(s=> (s.category==='running'||s.category==='test') && s.date<=todayIso)
    .sort((a,b)=> a.date<b.date?1:-1)
    .map(s=> results[s.id])
    .filter(r=> r && r.status);
  recent.splice(4);

  // Traducimos el check-in al mismo "formato de señal" que un resultado de
  // sesión (discomfort/fatigue/sensations), para poder reutilizar tal cual
  // las reglas de más abajo en vez de duplicarlas.
  const checkinSignal = checkin ? {
    discomfort: checkin.discomfort,
    rpe: null,
    sensations: checkin.feeling==='mal' ? 'duro' : null,
    fatigue: checkin.fatigue,
  } : null;
  const poorSleep = !!(checkin && checkin.sleep==='mal');

  if(recent.length===0 && !checkinSignal){
    return { level:'READY', emoji:'🟢', label:'Listo', reason:'Sin datos recientes todavía: estado por defecto.', source:'default' };
  }

  // El check-in de hoy es la señal más inmediata: se evalúa primero, con el
  // mismo umbral de "molestia >4/10" ya usado para sesiones pasadas.
  if(checkinSignal && checkinSignal.discomfort!=null && checkinSignal.discomfort>4){
    return { level:'STOP', emoji:'🔴', label:'Parar / revisar', reason:'Tu check-in de hoy indica molestia por encima de 4/10. No fuerces la sesión prevista; sustitúyela o valora consultar con un profesional si persiste.', source:'checkin' };
  }
  const lastDiscomfort = recent.length ? recent[0].discomfort : null;
  if(lastDiscomfort!=null && lastDiscomfort>4){
    return { level:'STOP', emoji:'🔴', label:'Parar / revisar', reason:'Tu último registro indica molestia por encima de 4/10. No progreses hasta comprobar evolución; valora consultar con un profesional si persiste.', source:'session' };
  }

  const combinedForDiscomfort = checkinSignal ? [checkinSignal, ...recent] : recent;
  const highDiscomfortCount = combinedForDiscomfort.filter(r=> r.discomfort!=null && r.discomfort>=3).length;
  const highRpeCount = recent.filter(r=> r.rpe!=null && Number(r.rpe)>=8).length;
  const highFatigueCheckin = !!(checkinSignal && checkinSignal.fatigue==='alta');
  if(highDiscomfortCount>=2 || highRpeCount>=3 || (highFatigueCheckin && poorSleep)){
    return { level:'DELOAD', emoji:'🟠', label:'Bajar carga', reason:'Varias señales recientes (sesiones y/o tu check-in de hoy) muestran molestia sostenida, esfuerzo muy elevado, o fatiga alta combinada con mal descanso. Conviene reducir antes de seguir progresando.', source: checkinSignal?'combined':'session' };
  }

  const mildDiscomfort = combinedForDiscomfort.some(r=> r.discomfort!=null && r.discomfort>=1 && r.discomfort<3);
  const someFatigue = recent.some(r=> r.sensations==='duro' || r.fatigue==='alta') || highFatigueCheckin || poorSleep;
  if(mildDiscomfort || someFatigue || (checkinSignal && checkinSignal.discomfort>=3)){
    return { level:'CAUTION', emoji:'🟡', label:'Con cautela', reason:'Hay señales leves (molestia ligera, cansancio o descanso regular/malo hoy). Vigila cómo evoluciona antes de forzar la progresión.', source: checkinSignal?'combined':'session' };
  }
  return { level:'READY', emoji:'🟢', label:'Listo', reason: checkinSignal ? 'Tu check-in de hoy y tus últimas sesiones indican buen estado.' : 'Tus últimas sesiones se han tolerado bien.', source: checkinSignal?'combined':'session' };
}

/* --- 11d) Estimación PROVISIONAL de capacidad / ritmo.
   Metodología sin cambios (media ponderada de ritmos recientes); lo que se
   refina es la EXPLICACIÓN de confianza: nivel de evidencia unificado +
   estabilidad de los datos (coeficiente de variación) + si el esfuerzo con
   el que se lograron esos ritmos fue muy alto (menos sostenible todavía). --- */
function estimateCapacity(sessions, results, goal, todayIso){
  const cutoff = addDays(todayIso, -21);
  const recentPaces = [];
  sessions.forEach(s=>{
    if(s.category!=='running' && s.category!=='test') return;
    if(s.date>todayIso || s.date<cutoff) return;
    const r = results[s.id];
    if(!r || (r.status!=='completed' && r.status!=='partial') || !r.distance || !r.duration) return;
    const daysAgo = daysBetween(s.date, todayIso);
    const w = (s.category==='test'?2:1) * Math.max(0.15, 1-daysAgo/28);
    recentPaces.push({pace: r.duration/r.distance, distance:Number(r.distance), weight:w, rpe: (r.rpe!=null && r.rpe!=='') ? Number(r.rpe) : null});
  });
  const hist = buildHistorySummary(sessions, results, todayIso);
  const daysLeft = daysBetween(todayIso, goal.date);
  const evidence = evidenceLevel(recentPaces.length, hist.weeksCompleted, hist.adherence);

  if(recentPaces.length===0){
    return {
      pace:null, headline:'Datos insuficientes todavía',
      status: goal.type==='completar' ? null : 'insuficientes datos',
      confidence:'Registra sesiones con distancia y tiempo para obtener una primera estimación.',
      rationale:'Se calcula con tus sesiones de running/test registradas en las últimas 3 semanas.',
      scenario: daysLeft<10 ? 'C' : null,
      evidence:'insuficiente'
    };
  }
  const totalW = recentPaces.reduce((a,b)=>a+b.weight,0);
  const weighted = recentPaces.reduce((a,b)=>a+b.pace*b.weight,0)/totalW;
  const weightedDistance=recentPaces.reduce((a,b)=>a+b.distance*b.weight,0)/totalW;
  const distanceRatio=Math.max(1,normalizeDistanceKm(goal.distanceKm,5)/Math.max(.5,weightedDistance));
  const sustainablePace=weighted*(1+Math.min(.12,Math.log(distanceRatio)*.035));

  // Estabilidad: coeficiente de variación ponderado de los ritmos recientes.
  const variance = recentPaces.reduce((a,b)=> a + b.weight*Math.pow(b.pace-weighted,2), 0) / totalW;
  const cv = weighted>0 ? Math.sqrt(variance)/weighted : 0;
  const stable = cv < CAPACITY_STABILITY_CV;
  const withRpe = recentPaces.filter(p=>p.rpe!=null);
  const highEffortShare = withRpe.length ? withRpe.filter(p=>p.rpe>=RPE_HIGH_THRESHOLD).length/withRpe.length : 0;

  if(goal.type==='completar'&&hist.longestContinuousMinutes<20){
    return {pace:null,paceRange:null,headline:'Entrena por sensación y tiempo',status:null,confidence:'Todavía no hay base continua suficiente para proponer un ritmo útil.',rationale:'Prioriza un esfuerzo cómodo y la estrategia CaCo entrenada; el ritmo se estimará cuando exista una base suficiente y estable.',scenario:'C',evidence};
  }
  const uncertainty=Math.min(.12,(evidence==='solida'?.035:evidence==='moderada'?.05:.08)+Math.min(.05,cv*.5));
  const paceRange={fast:sustainablePace*(1-uncertainty),slow:sustainablePace*(1+uncertainty)};

  let status = null;
  if(goal.type!=='completar' && goal.targetPaceMinKm){
    if(sustainablePace<=goal.targetPaceMinKm*1.03) status='alcanzable';
    else if(sustainablePace<=goal.targetPaceMinKm*1.15) status='en desarrollo';
    else status='todavía lejano';
  }

  const confidenceByEvidence = {
    insuficiente:'Confianza baja', limitada: stable?'Confianza baja-media':'Confianza baja',
    moderada: stable?'Confianza media-alta':'Confianza media', solida: stable?'Confianza alta':'Confianza media-alta'
  };
  let confidenceLabel = confidenceByEvidence[evidence];

  const cautions=[];
  if(hist.longestContinuousMinutes>0 && hist.longestContinuousMinutes<20) cautions.push('tu carrera continua más larga registrada es de '+hist.longestContinuousMinutes+' min');
  if(hist.adherence!=null && hist.adherence<0.6) cautions.push('tu adherencia reciente es del '+Math.round(hist.adherence*100)+'%');
  if(!stable && recentPaces.length>=2) cautions.push('tus ritmos recientes son poco consistentes entre sí');
  if(highEffortShare>0.6) cautions.push('gran parte de estos datos se lograron a un esfuerzo (RPE) muy alto, así que podrían no ser sostenibles todavía');

  let scenario='B';
  if(goal.targetPaceMinKm && sustainablePace<=goal.targetPaceMinKm*1.02 && (hist.adherence==null||hist.adherence>=0.7) && hist.longestContinuousMinutes>=20) scenario='A';
  if(sustainablePace>7.3 || (hist.adherence!=null && hist.adherence<0.5) || (daysLeft<14 && hist.longestContinuousMinutes<18)) scenario='C';

  return {
    pace: sustainablePace,
    paceRange,
    headline: minToPaceStr(paceRange.fast)+'–'+minToPaceStr(paceRange.slow)+' /km (rango orientativo)',
    status,
    confidence: confidenceLabel + (cautions.length? ' — '+cautions.join('; ')+'.' : '.'),
    rationale: 'Rango calculado con '+recentPaces.length+' sesión(es) de las últimas 3 semanas, su variabilidad y un margen conservador para '+formatDistanceKm(goal.distanceKm)+'. Se recalcula con cada sesión nueva.',
    scenario,
    evidence
  };
}

/* --- 11e) Adaptación INMEDIATA tras registrar una sesión (jerarquía:
   seguridad primero). Solo actúa sobre PLAN_CURRENT, sobre sesiones
   futuras próximas. Nunca progresa aquí: solo mantiene o reduce.
   recentResults (opcional, Fase 10): resultados de las sesiones anteriores
   a esta (más reciente primero), para detectar RPE alto repetido sin
   esperar a la revisión semanal. Sin este parámetro, el comportamiento es
   idéntico al de antes de la Fase 10 (retrocompatible). --- */
function evaluateSessionResult(session, result, recentResults){
  const decisions = [];
  if(result.discomfort!=null && result.discomfort>4){
    decisions.push({ action:'REPLACE', scope:'next_1', reason:'Molestia registrada por encima de 4/10 en "'+(session.title||session.type)+'". Se sustituye la siguiente sesión por una alternativa de bajo impacto (bici/elíptica) y no se progresa hasta comprobar evolución.' });
  } else if(result.discomfort!=null && result.discomfort>=3){
    decisions.push({ action:'MAINTAIN', scope:'next_2', reason:'Molestia de 3-4/10 registrada. No se aumenta carga hasta confirmar que remite.' });
  } else if(result.status==='missed' && (result.missedReason==='molestias')){
    decisions.push({ action:'MAINTAIN', scope:'next_1', reason:'Sesión no realizada por molestias. Se mantiene la carga prevista sin progresar hasta tener más información.' });
  }

  // RPE alto repetido (Fase 10): una sesión aislada con RPE alto no reacciona aquí (eso ya
  // lo puede considerar weeklyReview con la semana completa). Si ya son 2 de las últimas 3
  // con RPE alto, sí conviene no progresar de inmediato mientras se confirma la tendencia.
  if(decisions.length===0 && recentResults && recentResults.length){
    const window = [result].concat(recentResults).slice(0,3);
    const highCount = window.filter(r=> r && r.rpe!=null && r.rpe!=='' && Number(r.rpe)>=RPE_HIGH_THRESHOLD).length;
    if(highCount>=2){
      decisions.push({ action:'MAINTAIN', scope:'next_1', reason:'RPE alto (≥'+RPE_HIGH_THRESHOLD+') repetido en '+highCount+' de tus últimas 3 sesiones. Se mantiene la carga prevista sin progresar hasta confirmar que el esfuerzo baja.' });
    }
  }
  return decisions;
}

/* --- 11f) Revisión SEMANAL: tiene más peso que una sesión aislada.
   context (opcional, Fase 10): { priorWeeks: [{week,adherenceRate,avgPace}, ...]
   (semanas previas ya revisadas, de más antigua a más reciente), recentLoad:
   resultado de computeRecentLoad() }. Sin context, el comportamiento cae de
   forma segura a "evidencia limitada" (nunca progresa a ciegas por defecto). --- */
function weeklyReview(weekSessions, results, context){
  context = context || {};
  const priorWeeks = context.priorWeeks || [];
  const recentLoad = context.recentLoad || null;

  const scored = weekSessions.filter(s=> s.category==='running'||s.category==='test');
  const adh = (()=>{
    let c=0,p=0,m=0,pend=0;
    scored.forEach(s=>{ const r=results[s.id]; if(!r||!r.status) pend++; else if(r.status==='completed') c++; else if(r.status==='partial') p++; else m++; });
    const total = c+p+m;
    return { rate: total>0 ? (c+p*0.5)/total : null, completed:c, partial:p, missed:m, pending:pend, total: scored.length };
  })();

  const discomforts = scored.map(s=> results[s.id] && results[s.id].discomfort).filter(v=>v!=null);
  const maxDiscomfort = discomforts.length? Math.max(...discomforts) : 0;

  const rpeDiffs = scored.map(s=>{
    const r = results[s.id];
    if(!r || r.rpe==null || r.rpe==='' || !s.planned || !s.planned.rpe) return null;
    const plannedRpe = String(s.planned.rpe).split('-').map(Number);
    const mid = plannedRpe.length===2 ? (plannedRpe[0]+plannedRpe[1])/2 : plannedRpe[0];
    if(isNaN(mid)) return null;
    return Number(r.rpe) - mid;
  }).filter(v=>v!=null);
  const avgRpeDiff = rpeDiffs.length? rpeDiffs.reduce((a,b)=>a+b,0)/rpeDiffs.length : 0;
  const scoredWithRpe = scored.filter(s=>{const r=results[s.id];return r&&r.status&&r.rpe!=null&&r.rpe!==''}).length;

  const discomfortTrend = classifySeriesTrend(discomforts, {step:DISCOMFORT_TREND_STEP});
  const rpeDiffTrend = classifySeriesTrend(rpeDiffs, {step:RPE_TREND_STEP});

  const sessionsForEvidence = priorWeeks.reduce((a,w)=>a+(w.sessionsCount||0),0)
    + scored.filter(s=> results[s.id] && results[s.id].status).length;
  const weeksWithData = priorWeeks.length + 1; // +1 = la semana que se está revisando ahora
  const evidence = evidenceLevel(sessionsForEvidence, weeksWithData, adh.rate);

  // Estancamiento (Caso D): varias semanas previas con buena adherencia pero sin mejora de ritmo.
  let stagnation = false;
  if(priorWeeks.length>=STAGNATION_MIN_WEEKS){
    const lastN = priorWeeks.slice(-STAGNATION_MIN_WEEKS);
    const goodAdherence = lastN.every(w=> w.adherenceRate!=null && w.adherenceRate>=0.7);
    const paces = lastN.map(w=>w.avgPace).filter(p=>p!=null);
    if(goodAdherence && paces.length>=2){
      const improvement = (paces[0]-paces[paces.length-1])/paces[0]; // positivo = mejora (menos min/km)
      if(improvement < STAGNATION_PACE_EPSILON) stagnation = true;
    }
  }

  // Fase 11 — guardrails de coherencia a largo plazo.
  // El historial deja de ser solo informativo: limita progresiones repetidas y evita
  // oscilaciones automáticas. Seguridad sigue teniendo prioridad absoluta.
  const historyDecisions = (context.decisionHistory || []).filter(e=>e && e.decision);
  const progressionGuard = progressionGuardrail(historyDecisions, context.progressionLoadDeltaPct);

  const reasons = [];
  let decision;

  // 1) SEGURIDAD — prioridad absoluta, nunca se sobrescribe con PROGRESS.
  if(maxDiscomfort>=3 || discomfortTrend==='tendencia_negativa'){
    decision='DELOAD';
    reasons.push(maxDiscomfort>=3
      ? 'se registraron molestias de '+maxDiscomfort+'/10 durante la semana'
      : 'las molestias muestran una tendencia creciente en las últimas sesiones');
  }
  // 2) CARGA RECIENTE / RECUPERACIÓN insuficiente.
  else if(recentLoad && recentLoad.confidence!=='insuficiente' && recentLoad.avgRpe!=null && recentLoad.avgRpe>=LOAD_HIGH_AVG_RPE && recentLoad.sessionsCount>=3){
    decision='DELOAD';
    reasons.push('la carga reciente (últimos '+recentLoad.windowDays+' días) muestra un RPE medio elevado ('+recentLoad.avgRpe.toFixed(1)+') de forma sostenida');
  }
  // 3) TENDENCIA de esfuerzo en deterioro constante (no una sesión aislada).
  else if(rpeDiffTrend==='tendencia_negativa'){
    decision='DELOAD';
    reasons.push('el esfuerzo percibido muestra una tendencia de deterioro constante en las últimas sesiones (cada vez más alto de lo previsto)');
  }
  // 4) Adherencia insuficiente: no se interpreta como problema físico, solo falta de datos.
  else if(adh.rate!=null && adh.rate<0.5){
    decision='MAINTAIN';
    reasons.push('adherencia baja esta semana ('+Math.round(adh.rate*100)+'%): no hay evidencia suficiente para progresar ni para reducir por motivos físicos');
  }
  else if(avgRpeDiff>=1.5){
    decision='DELOAD';
    reasons.push('el esfuerzo percibido real superó claramente al planificado (+'+avgRpeDiff.toFixed(1)+' RPE de media)');
  }
  else if(avgRpeDiff>=0.5){
    decision='MAINTAIN';
    reasons.push('el esfuerzo percibido fue algo mayor de lo previsto (+'+avgRpeDiff.toFixed(1)+' RPE): se mantiene sin subir todavía');
  }
  // 5) Estancamiento: buena adherencia sostenida pero sin mejora real de ritmo.
  else if(stagnation){
    decision='MAINTAIN';
    reasons.push('llevas '+STAGNATION_MIN_WEEKS+' semanas o más con buena adherencia pero sin mejora clara de ritmo: se mantiene la carga en vez de seguir subiendo indefinidamente');
  }
  // 6) Evidencia insuficiente/limitada: nunca se progresa a ciegas, aunque la semana "parezca" buena.
  else if(evidence==='insuficiente' || evidence==='limitada'){
    decision='MAINTAIN';
    reasons.push('todavía no hay evidencia suficiente ('+evidence+') para progresar con seguridad');
  }
  // 7) GUARDRAILS F11 — aunque la semana sea buena, no se progresa si la
  // progresión acumulada o la secuencia reciente indican que hace falta consolidar.
  else if(progressionGuard.blockProgress){
    decision='MAINTAIN';
    reasons.push(progressionGuard.reason);
  }
  // 8) PROGRESO: requiere evidencia moderada/sólida + buena adherencia + esfuerzo estable + sin molestias.
  else if(adh.rate!=null && adh.rate>=0.8 && scoredWithRpe>=Math.max(2,Math.ceil(scored.length*0.6)) && avgRpeDiff<=0.2 && maxDiscomfort===0 && rpeDiffTrend!=='tendencia_negativa'){
    decision='PROGRESS';
    reasons.push('buena adherencia ('+Math.round(adh.rate*100)+'%)');
    reasons.push('esfuerzo percibido acorde a lo planificado');
    reasons.push('sin molestias');
    reasons.push('evidencia '+evidence);
  }
  else {
    decision='MAINTAIN';
    reasons.push('sin evidencia suficiente para progresar ni señales claras para reducir');
  }

  return { decision, reason: reasons.join('; ')+'.', reasons, adherence:adh, avgRpeDiff, maxDiscomfort,
    evidence, discomfortTrend, rpeDiffTrend, stagnation, recentLoad, progressionGuard };
}

/* ---------------------------------------------------------------------
   FASE 11 — CONTROL DE PROGRESIÓN Y COHERENCIA A LARGO PLAZO
--------------------------------------------------------------------- */
const F11_PROGRESS_WINDOW = 3;
const F11_MAX_PROGRESS_IN_WINDOW = 2;
const F11_DELOAD_COOLDOWN_WEEKS = 1;

function progressionGuardrail(decisionHistory, progressionLoadDeltaPct){
  const hist = (decisionHistory||[]).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  const recent = hist.slice(-F11_PROGRESS_WINDOW);
  const decisions = recent.map(e=>e.decision);
  const progressCount = decisions.filter(d=>d==='PROGRESS').length;
  const last = decisions[decisions.length-1] || null;
  const prev = decisions[decisions.length-2] || null;
  const hasRecentDeload = last==='DELOAD';
  const oscillating = decisions.length>=3 && decisions.slice(-3).join(',')==='PROGRESS,DELOAD,PROGRESS';

  if(progressionLoadDeltaPct!=null && progressionLoadDeltaPct>20){
    return {blockProgress:true, reason:'la carga prevista de la próxima semana ya supera en más de un 20% la referencia original: se consolida antes de aumentar', progressCount, decisions, oscillating, progressionLoadDeltaPct};
  }
  if(hasRecentDeload){
    return {blockProgress:true, reason:'se ha producido una descarga en la última revisión: se consolida al menos una semana antes de volver a progresar', progressCount, decisions, oscillating};
  }
  if(oscillating || (last==='DELOAD' && prev==='PROGRESS')){
    return {blockProgress:true, reason:'la secuencia reciente muestra oscilación de carga: se consolida antes de volver a aumentar', progressCount, decisions, oscillating:true};
  }
  if(progressCount>=F11_MAX_PROGRESS_IN_WINDOW){
    return {blockProgress:true, reason:'ya hubo '+progressCount+' progresiones en las últimas '+recent.length+' revisiones: se consolida la carga antes de otro aumento', progressCount, decisions, oscillating};
  }
  return {blockProgress:false, reason:'guardrails de progresión a largo plazo superados sin bloqueo', progressCount, decisions, oscillating, progressionLoadDeltaPct:progressionLoadDeltaPct==null?null:progressionLoadDeltaPct};
}

function buildDecisionHistoryForEngine(){
  return (state.adaptationLog||[])
    .filter(e=>e && e.type==='week' && e.decision)
    .map(e=>({date:e.date, decision:e.decision, reason:e.reason}))
    .reverse();
}

/* --- 11g) Aplicar una decisión semanal a las sesiones futuras de la
   semana siguiente. F11 convierte DELOAD en descarga real: reduce volumen y
   sustituye sesiones exigentes por alternativas suaves cuando procede. --- */
const APPLY_PROGRESS_FACTOR = 1.1; // +10%, solo tras pasar todas las comprobaciones de weeklyReview
const APPLY_DELOAD_FACTOR = 0.7;   // -30%
function applyWeeklyDecision(nextWeekSessions, decision, reasonText){
  const factor = decision==='PROGRESS' ? APPLY_PROGRESS_FACTOR : decision==='DELOAD' ? APPLY_DELOAD_FACTOR : 1.0;
  if(factor===1.0) return [];
  const touched = [];
  nextWeekSessions.forEach(s=>{
    if(!['running','test'].includes(s.category) || !s.planned || !s.planned.duration) return;
    const lib = SESSION_LIBRARY[s.subtype];
    let newType = s.subtype;
    // En descarga, las sesiones de calidad pasan a una sesión fácil/recuperación.
    if(decision==='DELOAD' && ['FARTLEK','INTERVALS','SHORT_INTERVALS','LONG_INTERVALS','RACE_PACE','HILLS','PROGRESSION','TEMPO','THRESHOLD','TEST'].includes(s.subtype)){
      newType = s.subtype==='TEST' ? 'RECOVERY_RUN' : 'EASY_RUN';
    }
    const targetLib = SESSION_LIBRARY[newType];
    let nd = Math.round(s.planned.duration*factor);
    if(targetLib && targetLib.durationRange){
      nd = Math.min(targetLib.durationRange[1]||nd, nd);
      if(decision==='DELOAD') nd=Math.min(nd,s.planned.duration);
      else nd=Math.max(targetLib.durationRange[0]||nd,nd);
    }
    if(nd!==s.planned.duration || newType!==s.subtype){
      touched.push({ id:s.id, date:s.date, oldType:s.subtype, newType, newDuration:nd, oldDuration:s.planned.duration, reason:reasonText });
    }
  });
  return touched;
}

if(typeof module !== "undefined"){
  module.exports.computeAdherence = computeAdherence;
  module.exports.buildHistorySummary = buildHistorySummary;
  module.exports.computeReadiness = computeReadiness;
  module.exports.estimateCapacity = estimateCapacity;
  module.exports.evaluateSessionResult = evaluateSessionResult;
  module.exports.weeklyReview = weeklyReview;
  module.exports.applyWeeklyDecision = applyWeeklyDecision;
  module.exports.evidenceLevel = evidenceLevel;
  module.exports.classifySeriesTrend = classifySeriesTrend;
  module.exports.computeRecentLoad = computeRecentLoad;
  module.exports.progressionGuardrail = progressionGuardrail;
  module.exports.buildDecisionHistoryForEngine = buildDecisionHistoryForEngine;
  module.exports.minToPaceStr = minToPaceStr;
}
