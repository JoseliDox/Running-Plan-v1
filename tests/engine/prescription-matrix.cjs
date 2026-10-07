const vm=require('vm');
const {createRuntime}=require('../helpers/runtime.cjs');
const c=createRuntime('modular'),errors=[],stats={plans:0,sessions:0,blocks:0,statuses:{},profiles:{},distances:{},horizons:{},availability:{},maxBlockDriftMin:0,maxComponentDriftMin:0,maxLongJump:0};
const profiles=[
  {id:'absolute',level:'principiante',trainingKnowledge:'basico',currentCapabilityMinutes:0,recentRunDaysPerWeek:0,currentWeeklyMinutes:0,usualLongSessionMinutes:0,trainingYears:0,toleratesConsecutiveDays:false},
  {id:'beginner15',level:'principiante',trainingKnowledge:'basico',currentCapabilityMinutes:15,recentRunDaysPerWeek:2,currentWeeklyMinutes:50,usualLongSessionMinutes:25,trainingYears:.2,toleratesConsecutiveDays:false},
  {id:'beginner30',level:'principiante',trainingKnowledge:'familiar',currentCapabilityMinutes:30,recentRunDaysPerWeek:3,currentWeeklyMinutes:90,usualLongSessionMinutes:40,trainingYears:.7,toleratesConsecutiveDays:false},
  {id:'recreational',level:'intermedio',trainingKnowledge:'familiar',currentCapabilityMinutes:45,recentRunDaysPerWeek:3,currentWeeklyMinutes:140,usualLongSessionMinutes:60,trainingYears:2,toleratesConsecutiveDays:false},
  {id:'intermediate',level:'intermedio',trainingKnowledge:'tecnico',currentCapabilityMinutes:65,recentRunDaysPerWeek:4,currentWeeklyMinutes:230,usualLongSessionMinutes:90,trainingYears:4,toleratesConsecutiveDays:true},
  {id:'experienced',level:'avanzado',trainingKnowledge:'tecnico',currentCapabilityMinutes:100,recentRunDaysPerWeek:5,currentWeeklyMinutes:360,usualLongSessionMinutes:135,trainingYears:8,toleratesConsecutiveDays:true},
];
const distances=[3,5,7,10,15,21.097,42.195,50],horizons=[4,12,24],frequencies=[2,3,4,5,6];
const daySets={2:[2,6],3:[1,3,6],4:[1,3,5,6],5:[1,2,3,5,6],6:[1,2,3,4,5,6]};
function fail(code,label,detail){errors.push({code,label,detail});}
function near(a,b,t=.21){return Math.abs(a-b)<=t;}
for(const spec of profiles)for(const distance of distances)for(const weeks of horizons)for(const available of frequencies){
  const label=`${spec.id}-${distance}k-${weeks}w-${available}d`;
  const profile=Object.assign(c.defaultProfile(),spec);
  const goal=Object.assign(c.defaultGoal(),{distanceKm:distance,type:spec.id==='experienced'?'tiempo_objetivo':'completar',targetPaceMinKm:spec.id==='experienced'?4.8:null,startDate:'2026-01-05',date:c.addDays('2026-01-05',weeks*7-1)});
  const maxMinutes=spec.id==='absolute'?55:spec.id.startsWith('beginner')?75:spec.id==='experienced'?180:150;
  const availability=Object.assign(c.defaultAvailability(),{days:daySets[available],maxSessionsPerWeek:available,sessionDurationAvailMin:maxMinutes,blockedDates:[]});
  const ctx={profile,goal,availability,activities:spec.id==='recreational'?[{type:'fuerza',frequency:3,intensity:'alta'}]:[],limitations:[]};
  let plan;
  try{plan=c.generateAdaptivePlan(ctx);c.enrichPlan(plan,ctx);}catch(e){fail('runtime',label,e.stack||e.message);continue;}
  stats.plans++;stats.profiles[spec.id]=(stats.profiles[spec.id]||0)+1;stats.distances[distance]=(stats.distances[distance]||0)+1;stats.horizons[weeks]=(stats.horizons[weeks]||0)+1;stats.availability[available]=(stats.availability[available]||0)+1;
  const status=plan.meta?.feasibility?.status||'missing';stats.statuses[status]=(stats.statuses[status]||0)+1;
  if(!['viable','conservative','horizon_insufficient','base_insufficient'].includes(status))fail('feasibility-missing',label,status);
  const longRows=[];
  for(const week of plan.weeks){
    const prescribed=week.days.filter(d=>d.planned&&d.type!=='RACE');
    if(prescribed.length>available)fail('frequency-over',label,`week ${week.n}: ${prescribed.length}>${available}`);
    if(Number(week.recommendedFrequency)>available)fail('frequency-meta-over',label,`week ${week.n}`);
    if(week.projectedCapabilityMin>=30&&week.phase!=='taper'&&!week.deload&&prescribed.length&& !week.days.some(d=>d.type==='LONG_EASY'))fail('long-missing',label,`week ${week.n}`);
    const long=week.days.find(d=>d.type==='LONG_EASY'&&d.planned);if(long)longRows.push({week:week.n,duration:long.planned.totalDurationMin,deload:week.deload});
    for(const d of week.days){
      const p=d.planned;if(!p)continue;stats.sessions++;
      for(const key of ['totalDurationMin','warmupDurationMin','mainDurationMin','recoveryDurationMin','cooldownDurationMin'])if(!Number.isFinite(Number(p[key]))||Number(p[key])<0)fail('invalid-duration',label,`w${week.n} ${d.type} ${key}=${p[key]}`);
      const blockSum=(p.blocks||[]).reduce((s,b)=>s+Number(b.durationSec||0),0)/60,componentSum=Number(p.warmupDurationMin)+Number(p.mainDurationMin)+Number(p.recoveryDurationMin)+Number(p.cooldownDurationMin);
      stats.blocks+=(p.blocks||[]).length;stats.maxBlockDriftMin=Math.max(stats.maxBlockDriftMin,Math.abs(blockSum-p.totalDurationMin));stats.maxComponentDriftMin=Math.max(stats.maxComponentDriftMin,Math.abs(componentSum-p.totalDurationMin));
      if(!near(blockSum,p.totalDurationMin))fail('block-contract',label,`w${week.n} ${d.type}: ${blockSum} vs ${p.totalDurationMin}`);
      if(!near(componentSum,p.totalDurationMin))fail('component-contract',label,`w${week.n} ${d.type}: ${componentSum} vs ${p.totalDurationMin}`);
      if(d.type!=='RACE'&&p.totalDurationMin>maxMinutes+.21)fail('session-over-availability',label,`w${week.n} ${d.type}: ${p.totalDurationMin}>${maxMinutes}`);
      if(week.projectedCapabilityMin<30&&['EASY_RUN','RECOVERY_RUN','AEROBIC_RUN','LONG_EASY','TEMPO','THRESHOLD','INTERVALS','SHORT_INTERVALS','LONG_INTERVALS','RACE_PACE','PROGRESSION','HILLS'].includes(d.type))fail('capability-jump',label,`w${week.n}: ${week.projectedCapabilityMin} min -> ${d.type}`);
      for(const b of p.blocks||[]){
        if(!Number.isFinite(Number(b.durationSec))||Number(b.durationSec)<0)fail('uncomputable-block',label,`w${week.n} ${d.type}`);
        if(Array.isArray(b.steps)&&b.repeat){const resolved=b.steps.reduce((s,x)=>s+Number(x.durationSec||0),0)*b.repeat;if(Math.abs(resolved-b.durationSec)>1)fail('repeat-contract',label,`w${week.n} ${d.type}: ${resolved} vs ${b.durationSec}`);}
        if(Array.isArray(b.steps)&&!b.repeat){const resolved=b.steps.reduce((s,x)=>s+Number(x.durationSec||0),0);if(Math.abs(resolved-b.durationSec)>1)fail('steps-contract',label,`w${week.n} ${d.type}: ${resolved} vs ${b.durationSec}`);}
      }
    }
  }
  for(let i=1;i<longRows.length;i++){if(longRows[i-1].deload||longRows[i].deload)continue;const jump=longRows[i].duration/Math.max(1,longRows[i-1].duration);stats.maxLongJump=Math.max(stats.maxLongJump,jump);if(jump>1.36)fail('long-jump',label,`${longRows[i-1].duration}->${longRows[i].duration}`);}
  const taper=plan.weeks.filter(w=>w.phase==='taper').map(w=>w.days.filter(d=>d.planned&&d.type!=='RACE').reduce((s,d)=>s+d.planned.totalDurationMin,0));
  for(let i=1;i<taper.length;i++)if(taper[i]>taper[i-1]+.21)fail('taper-increase',label,`${taper.join(',')}`);
  const preTaper=[...plan.weeks].reverse().find(w=>w.phase!=='taper');
  const preTaperVolume=preTaper?.days.filter(d=>d.planned&&d.type!=='RACE').reduce((s,d)=>s+d.planned.totalDurationMin,0);
  if(taper.length&&preTaperVolume&&taper[0]>=preTaperVolume*.98)fail('taper-no-reduction',label,`${preTaperVolume}->${taper[0]}`);
  const race=plan.weeks.flatMap(w=>w.days).find(d=>d.type==='RACE');
  const finalCap=plan.weeks.at(-1)?.projectedCapabilityMin||0;
  const policy=c.distancePolicy(distance),estimatedRaceMin=goal.targetTimeSec?goal.targetTimeSec/60:distance*(Number(profile.knownRecentPaceMinKm)||Number(goal.targetPaceMinKm)||7),continuousNeed=estimatedRaceMin*((policy.key==='marathon'||policy.key==='ultra')?.6:policy.key==='half'?.65:.7);
  if(race&&(finalCap<Math.max(30,continuousNeed)||status!=='viable')&&race.planned?.prescriptionSeed?.raceStrategy!=='caco'&&race.planned?.prescription?.strategy!=='caco'&&!race.planned?.main?.includes('CaCo'))fail('race-strategy',label,`${status}/${finalCap}/${continuousNeed}: ${race.planned?.main}`);
}

// Casos de compatibilidad fuera de la matriz deportiva.
try{
  const ctx={profile:Object.assign(c.defaultProfile(),profiles[2]),goal:Object.assign(c.defaultGoal(),{distanceKm:7,startDate:'2026-01-05',date:'2026-04-05'}),availability:Object.assign(c.defaultAvailability(),{days:[1,3,6],maxSessionsPerWeek:3,sessionDurationAvailMin:75}),activities:[],limitations:[]};
  const legacy={meta:{workoutSchemaVersion:2},weeks:[{n:1,phase:'base',phaseLabel:'Base',projectedCapabilityMin:30,days:[{date:'2026-01-05',type:'EASY_RUN',planned:{duration:37,schemaVersion:2}}]}]};
  if(!c.f14UpgradePlanContent(legacy,ctx)||legacy.weeks[0].days[0].planned.schemaVersion!==3||legacy.weeks[0].days[0].planned.totalDurationMin!==37)fail('legacy-upgrade','legacy','duration/schema not preserved');
  vm.runInContext("state=f13_2_blankAthleteState();f12EnsureState();if(state.races.length!==0||state.activeRaceId!==null)throw Error('zero races invalid')",c);
}catch(e){fail('compatibility','state/legacy',e.message);}

const criticalCodes=new Set(['runtime','invalid-duration','block-contract','component-contract','session-over-availability','capability-jump','race-strategy','uncomputable-block','repeat-contract','steps-contract','feasibility-missing','legacy-upgrade','compatibility']);
const critical=errors.filter(e=>criticalCodes.has(e.code));
console.log(JSON.stringify({ok:errors.length===0,stats,errorCount:errors.length,criticalCount:critical.length,errors:errors.slice(0,60)},null,2));
if(errors.length)process.exitCode=1;
