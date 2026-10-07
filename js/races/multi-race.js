const F12_SCHEMA_VERSION=3; const F12_RACE_STATUS=['planned','active','completed','archived']; const F12_CYCLE_STATUS=['preparation','race_week','post_race','recovery','completed'];
function f12Now(){return new Date().toISOString()} function f12Id(p='id'){return p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)} function f12Clone(x){return x==null?x:JSON.parse(JSON.stringify(x))}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function f12ParsePace(value){if(value==null||String(value).trim()==='')return null;const text=String(value).trim();const match=/^(\d{1,2}):(\d{2})$/.exec(text);if(match){const min=Number(match[1]),sec=Number(match[2]);return sec<60&&min>0?min*60+sec:null}const legacy=Number(text);return Number.isFinite(legacy)&&legacy>0?Math.round(legacy*60):null}
function f12PaceInputValue(value,isSeconds=false){const sec=isSeconds?Math.round(Number(value)):f12ParsePace(value);return Number.isFinite(sec)&&sec>0?String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0'):''}
function f12NormalizeRace(r={},i=0){r=(r&&typeof r==='object')?r:{};const x=Object.assign({id:f12Id('race'),name:'Carrera '+(i+1),distanceKm:5,date:'',targetPaceSecPerKm:null,targetPaceMinKm:null,targetTimeSec:null,priority:i===0?'primary':'secondary',status:i===0?'active':'planned',preparationPhase:'Adaptación',createdAt:f12Now(),updatedAt:f12Now()},f12Clone(r),{distanceKm:normalizeDistanceKm(r.distanceKm,5)});const sec=x.targetPaceSecPerKm!=null?Math.round(Number(x.targetPaceSecPerKm)):f12ParsePace(x.targetPaceMinKm);x.targetPaceSecPerKm=Number.isFinite(sec)&&sec>0?sec:null;x.targetPaceMinKm=x.targetPaceSecPerKm!=null?x.targetPaceSecPerKm/60:null;return x}
function f12IsISODate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number),x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d}
function f12ValidDate(value){if(!f12IsISODate(value))return false;const [y,m,d]=value.split('-').map(Number),x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d}
function f12PreparationHorizonDays(distanceKm){return distancePolicy(distanceKm).recommendedWeeks*7}
function f12CycleStartDate(r,preferredStartDate){if(f12IsISODate(preferredStartDate))return preferredStartDate;if(r&&f12IsISODate(r.date))return addDays(r.date,-f12PreparationHorizonDays(r.distanceKm));return defaultGoal().startDate}
function f12NewCycle(r,status='preparation',preferredStartDate=null){return {id:f12Id('cycle'),raceId:r.id,status,startDate:f12CycleStartDate(r,preferredStartDate),startedAt:f12Now(),completedAt:null,adaptationLog:[],weeklyReviews:[],progressionState:{recentProgress:[],recentDeloads:[],consecutiveProgress:0,postDeloadConsolidation:false}}}
function f12GoalForRace(r,base={},cycle=null){const targetTimeSec=r.targetTimeSec||null,derivedPace=targetTimeSec&&r.distanceKm?targetTimeSec/60/Number(r.distanceKm):null;const g=Object.assign({},base,{distanceKm:r.distanceKm,date:r.date||base.date,startDate:f12CycleStartDate(r,cycle&&cycle.startDate),targetPaceMinKm:r.targetPaceMinKm!=null?Number(r.targetPaceMinKm):(derivedPace||base.targetPaceMinKm),targetTimeSec});if(g.targetPaceMinKm){g.targetPaceSecPerKm=Math.round(g.targetPaceMinKm*60);g.targetPaceLabel=minToPaceStr(g.targetPaceMinKm);}return g}
function f12ScopeFromState(){return {goal:f12Clone(state.goal||{}),planOriginal:f12Clone(state.planOriginal),planCurrent:f12Clone(state.planCurrent),results:f12Clone(state.results||{}),adaptationLog:f12Clone(state.adaptationLog||[]),weeklyReviews:f12Clone(state.weeklyReviews||{}),configDirty:!!state.configDirty}}
function f12SaveActiveScope(){if(typeof state==='undefined'||!state.activeRaceId||!state.racePlans)return;const race=state.races?.find(r=>r.id===state.activeRaceId),goal=state.goal||{};if(race){const changed=Number(race.distanceKm)!==Number(goal.distanceKm)||race.date!==goal.date;if(Number.isFinite(Number(goal.distanceKm))&&Number(goal.distanceKm)>0)race.distanceKm=Number(goal.distanceKm);if(f12ValidDate(goal.date))race.date=goal.date;if(changed)state.configDirty=true;race.targetPaceMinKm=goal.targetPaceMinKm||null;race.targetPaceSecPerKm=goal.targetPaceSecPerKm||(race.targetPaceMinKm?Math.round(race.targetPaceMinKm*60):null);race.targetTimeSec=goal.targetTimeSec||null;}state.racePlans[state.activeRaceId]=f12ScopeFromState()}
function f12LoadScope(r){const scope=state.racePlans[r.id]||{}; const cycle=state.raceCycles[r.id]||f12NewCycle(r); state.raceCycles[r.id]=cycle; const baseGoal=scope.goal||defaultGoal(); state.goal=f12GoalForRace(r,baseGoal,cycle); state.planOriginal=scope.planOriginal||null; state.planCurrent=scope.planCurrent||null; state.results=scope.results||{}; state.adaptationLog=scope.adaptationLog||[]; state.weeklyReviews=scope.weeklyReviews||{}; state.configDirty=!!scope.configDirty}
function f12EnsureState(){
  if(typeof state==='undefined'||!state)return false;
  state.profile=state.profile||{};
  if(!['basico','familiar','tecnico'].includes(state.profile.trainingKnowledge))state.profile.trainingKnowledge='basico';
  const cap=Math.max(0,Number(state.profile.currentCapabilityMinutes)||0);
  const level=state.profile.level||'principiante';
  if(!Number.isFinite(Number(state.profile.recentRunDaysPerWeek))||Number(state.profile.recentRunDaysPerWeek)<0)state.profile.recentRunDaysPerWeek=cap>0?(level==='avanzado'?4:level==='intermedio'?3:2):0;
  if(!Number.isFinite(Number(state.profile.currentWeeklyMinutes))||Number(state.profile.currentWeeklyMinutes)<0)state.profile.currentWeeklyMinutes=Math.round(cap*Math.max(1,Number(state.profile.recentRunDaysPerWeek)||1)*.8);
  if(!Number.isFinite(Number(state.profile.usualLongSessionMinutes))||Number(state.profile.usualLongSessionMinutes)<0)state.profile.usualLongSessionMinutes=Math.round(Math.max(cap,Number(state.profile.currentWeeklyMinutes||0)*.35));
  if(!Number.isFinite(Number(state.profile.trainingYears))||Number(state.profile.trainingYears)<0)state.profile.trainingYears=level==='avanzado'?3:level==='intermedio'?1:0;
  state.profile.toleratesConsecutiveDays=state.profile.toleratesConsecutiveDays===true;
  state.trainingSystemVersion='14.1';
  state.athleteHistory=state.athleteHistory||{sessions:[],weighIns:[],readiness:[],injuries:[],notes:[],updatedAt:f12Now()};
  state.races=Array.isArray(state.races)?state.races.filter(r=>r&&typeof r==='object').map(f12NormalizeRace):[];
  const hadCycles=!!state.raceCycles;
  state.multiRace=Object.assign({schemaVersion:F12_SCHEMA_VERSION,migratedAt:f12Now()},state.multiRace||{});
  state.multiRace.schemaVersion=F12_SCHEMA_VERSION;
  state.raceCycles=state.raceCycles||{};
  state.raceCycleHistory=state.raceCycleHistory||{};
  state.racePlans=state.racePlans||{};
  if(!state.races.length){
    if(state.multiRace.allowEmptyRaces===true){state.activeRaceId=null;state.planOriginal=null;state.planCurrent=null;state.results={};state.adaptationLog=[];state.weeklyReviews={};state.configDirty=false;return true;}
    // Compatibilidad: solo los estados legacy necesitan una carrera inicial.
    const g=state.goal||state.GOAL||{};
    state.races=[f12NormalizeRace({name:g.name||((g.distanceKm||5)+'K objetivo'),distanceKm:g.distanceKm||g.distance||5,date:g.date||g.raceDate||'',targetPaceSecPerKm:g.targetPaceSecPerKm||g.targetPace||null,targetPaceMinKm:g.targetPaceMinKm||null,targetTimeSec:g.targetTimeSec||g.targetTime||null},0)];
  }
  const eligible=state.races.filter(x=>x.status!=='completed'&&x.status!=='archived');
  let r=state.races.find(x=>x.id===state.activeRaceId&&eligible.some(e=>e.id===x.id))||eligible.find(x=>x.status==='active')||eligible[0]||null;
  state.activeRaceId=r?r.id:null;
  state.races.forEach(race=>{
    let cycle=state.raceCycles[race.id];
    if(!cycle){
      const migratedStart=!hadCycles&&state.races.length===1&&race.id===state.activeRaceId?(state.goal||{}).startDate:null;
      state.raceCycles[race.id]=f12NewCycle(race,'preparation',migratedStart);
    }else if(!f12IsISODate(cycle.startDate)){cycle.startDate=f12CycleStartDate(race,null);}
  });
  if(r&&!state.racePlans[r.id])state.racePlans[r.id]=f12ScopeFromState();
  return true;
}
function f12ActiveRace(){f12EnsureState();return state.races.find(r=>r.id===state.activeRaceId)||null} function f12ActiveCycle(){const r=f12ActiveRace();return r?state.raceCycles[r.id]:null} function f12ActiveCycleStartDate(){const r=f12ActiveRace(),c=f12ActiveCycle();return r?f12CycleStartDate(r,c&&c.startDate):todayISO()}
function f12CreateRace(input={}){f12EnsureState();const r=f12NormalizeRace(input,state.races.length);r.status='planned';state.races.push(r);const cycle=state.raceCycles[r.id]=f12NewCycle(r);state.racePlans[r.id]={goal:f12GoalForRace(r,state.multiRace?.allowEmptyRaces===true?{type:r.targetPaceSecPerKm||r.targetTimeSec?'tiempo_objetivo':'completar',targetPaceMinKm:null,targetPaceLabel:'',startDate:todayISO()}:defaultGoal(),cycle),planOriginal:null,planCurrent:null,results:{},adaptationLog:[],weeklyReviews:{},configDirty:false};return r}
function f12SetActiveRace(id){f12SaveActiveScope();f12EnsureState();const r=state.races.find(x=>x.id===id);if(!r)throw Error('Carrera no encontrada');state.races.forEach(x=>{if(x.status==='active'&&x.id!==r.id)x.status='planned'});if(r.status!=='completed')r.status='active';state.activeRaceId=r.id;state.raceCycles[r.id]=state.raceCycles[r.id]||f12NewCycle(r);f12LoadScope(r);return r}
function f12CompleteRace(id){f12EnsureState();const wasActive=id===state.activeRaceId;if(wasActive)f12SaveActiveScope();const r=state.races.find(x=>x.id===id);if(!r)throw Error('Carrera no encontrada');r.status='completed';const c=state.raceCycles[id]||f12NewCycle(r,'post_race');c.status='post_race';c.completedAt=f12Now();state.raceCycles[id]=c;if(wasActive){const next=state.races.find(x=>x.id!==id&&x.status!=='completed'&&x.status!=='archived');state.activeRaceId=null;if(next)f12SetActiveRace(next.id);else{state.planCurrent=null;state.planOriginal=null;state.results={};state.adaptationLog=[];state.weeklyReviews={};state.configDirty=false;}}return c}
function f12StartNewCycle(id){f12EnsureState();if(!state.races.some(x=>x.id===id))throw Error('Carrera no encontrada');f12SetActiveRace(id);const r=state.races.find(x=>x.id===id),previousGoal=f12Clone(state.goal||{});f12SaveActiveScope();state.raceCycleHistory[id]=state.raceCycleHistory[id]||[];state.raceCycleHistory[id].push({cycle:f12Clone(state.raceCycles[id]),scope:f12Clone(state.racePlans[id]),archivedAt:f12Now()});const cycle=state.raceCycles[id]=f12NewCycle(r);state.racePlans[id]={goal:f12GoalForRace(r,previousGoal,cycle),planOriginal:null,planCurrent:null,results:{},adaptationLog:[],weeklyReviews:{},configDirty:false};r.status='active';f12LoadScope(r);return state.raceCycles[id]}
function f12RecordAthleteSession(s){f12EnsureState();const copy=f12Clone(s),sessions=state.athleteHistory.sessions;const i=sessions.findIndex(x=>x.raceId===copy.raceId&&x.cycleId===copy.cycleId&&x.sessionId===copy.sessionId);if(i>=0)sessions[i]=copy;else sessions.push(copy);state.athleteHistory.updatedAt=f12Now()} function f12ScopedLog(){return f12ActiveCycle()?.adaptationLog||[]} function f12ScopedReviews(){return f12ActiveCycle()?.weeklyReviews||[]}
