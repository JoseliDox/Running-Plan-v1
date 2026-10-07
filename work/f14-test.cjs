const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('outputs/index.html','utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function context(){
  const storage=new Map();const node=()=>({style:{},classList:{add(){},remove(){}},addEventListener(){},removeEventListener(){},click(){}});
  const c=vm.createContext({console,URLSearchParams,Date,setTimeout,clearTimeout,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},window:{addEventListener(){},location:{hash:'',pathname:'/',search:'',origin:'https://example.test'}},document:{documentElement:{setAttribute(){}},getElementById:()=>node(),querySelector:()=>node()},fetch:()=>{throw Error('NETWORK FORBIDDEN')}});
  scripts.forEach(s=>vm.runInContext(s,c));return c;
}
function assert(ok,msg){if(!ok)throw Error(msg)}
const c=context();
function makePlan({level='principiante',knowledge='basico',capability=0,distance=5,weeks=10,maxMinutes=90}){
  const profile={...c.defaultProfile(),level,trainingKnowledge:knowledge,currentCapabilityMinutes:capability};
  const goal={...c.defaultGoal(),distanceKm:distance,startDate:'2026-01-01',date:c.addDays('2026-01-01',weeks*7-1)};
  const availability={...c.defaultAvailability(),days:[1,3,6],maxSessionsPerWeek:3,sessionDurationAvailMin:maxMinutes,blockedDates:[]};
  const ctx={profile,goal,availability,activities:[],limitations:[]};const plan=c.generateAdaptivePlan(ctx);c.enrichPlan(plan,ctx);return {plan,ctx};
}
const report=[];
function test(id,fn){try{report.push({id,ok:true,result:fn()})}catch(e){report.push({id,ok:false,error:e.message})}}

test('A-cero-real-caco-estructurado',()=>{const {plan}=makePlan({capability:0,weeks:8});const runs=plan.weeks.flatMap(w=>w.days).filter(d=>['WALK','RUN_WALK','EASY_RUN'].includes(d.type));assert(runs.length>0,'sin sesiones iniciales');assert(!plan.weeks.slice(0,4).flatMap(w=>w.days).some(d=>['TEMPO','THRESHOLD','INTERVALS','SHORT_INTERVALS','LONG_INTERVALS'].includes(d.type)),'intensidad avanzada demasiado pronto');const caco=runs.find(d=>d.type==='RUN_WALK');assert(caco?.planned?.schemaVersion===3,'CaCo sin schema v3');assert(caco.planned.blocks.find(b=>b.role==='main')?.steps?.length===2,'CaCo no machine-readable');assert(/Caminar no significa fallar/.test(caco.planned.notes),'falta explicación de caminar');return {types:[...new Set(runs.map(d=>d.type))],main:caco.planned.main};});
test('B-principiante-continuo-lenguaje-natural',()=>{const {plan}=makePlan({capability:25,weeks:10});const sessions=plan.weeks.flatMap(w=>w.days).filter(d=>d.planned);assert(sessions.every(d=>d.planned.feel&&d.planned.fallback&&d.planned.why),'explicación incompleta');assert(sessions.every(d=>!String(d.planned.how).includes('RPE')),'RPE requerido en lenguaje básico');return {sessions:sessions.length,example:sessions.find(d=>d.type==='EASY_RUN')?.planned.feel};});
test('C-intermedio-10k',()=>{const {plan}=makePlan({level:'intermedio',knowledge:'familiar',capability:45,distance:10,weeks:12});const types=plan.weeks.flatMap(w=>w.days.map(d=>d.type));assert(types.includes('LONG_EASY'),'sin tirada larga');assert(types.some(t=>['LONG_INTERVALS','TEST'].includes(t)),'sin especificidad 10 km');return {policy:plan.meta.distancePolicy,types:[...new Set(types)]};});
test('D-avanzado-objetivo-tiempo',()=>{const {plan}=makePlan({level:'avanzado',knowledge:'tecnico',capability:60,distance:5,weeks:10});const technical=plan.weeks.flatMap(w=>w.days).find(d=>d.planned?.rpe&&d.planned?.how?.includes('RPE'));assert(technical,'sin capa técnica opcional');return {policy:plan.meta.distancePolicy,technical:technical.type};});
test('E-distancia-personalizada',()=>{const p7=makePlan({level:'intermedio',capability:40,distance:7,weeks:12}).plan,p15=makePlan({level:'intermedio',capability:40,distance:15,weeks:12}).plan;assert(p7.meta.distanceKm===7&&p15.meta.distanceKm===15,'distancia alterada');assert(p7.meta.distancePolicy!==p15.meta.distancePolicy,'política idéntica');assert(JSON.stringify(p7)!==JSON.stringify(p15),'planes idénticos');return {seven:p7.meta.distancePolicy,fifteen:p15.meta.distancePolicy};});
test('F-multirace-y-legacy',()=>vm.runInContext(`state=f13_2_blankAthleteState();f12EnsureState();const a=f12CreateRace({distanceKm:7,date:'2027-04-01'});f12SetActiveRace(a.id);ensurePlan();const countA=state.planCurrent.weeks.length;const b=f12CreateRace({distanceKm:21.097,date:'2027-09-01'});f12SetActiveRace(b.id);ensurePlan();f12SetActiveRace(a.id);if(state.goal.distanceKm!==7)throw Error('scope de carrera perdido');if(state.planCurrent.weeks.length!==countA)throw Error('plan de carrera alterado');if(!state.planCurrent.weeks.flatMap(w=>w.days).filter(d=>d.planned).every(d=>d.planned.schemaVersion===3))throw Error('plan no migrado');({races:state.races.length,distance:state.goal.distanceKm,weeks:countA})`,c));
test('G-progresion-sin-saltos',()=>{const rows=makePlan({level:'principiante',capability:8,distance:10,weeks:12,maxMinutes:90}).plan.weeks.map(w=>{const ds=w.days.filter(d=>d.planned?.duration).map(d=>d.planned.duration);return {avg:ds.length?ds.reduce((a,b)=>a+b,0)/ds.length:null,deload:w.deload}}).filter(x=>x.avg);const jumps=rows.slice(1).map((row,i)=>{const baseline=rows[i].deload&&i>0?Math.max(rows[i].avg,rows[i-1].avg):rows[i].avg;return row.avg/baseline});assert(Math.max(...jumps)<1.5,'salto semanal '+Math.max(...jumps));return {maxJump:Math.max(...jumps),weekly:rows.map(x=>Math.round(x.avg))};});

console.log(JSON.stringify(report,null,2));
if(report.some(x=>!x.ok))process.exitCode=1;
