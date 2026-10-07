const fs=require('fs');
let s=fs.readFileSync('C:/Users/josel/Downloads/index.html','utf8');
function rep(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,90));s=s.replace(a,b)}
rep('if(!state.races.length){const g=', 'if(!state.races.length&&state.multiRace?.allowEmptyRaces!==true){const g=');
rep("state.activeRaceId=state.activeRaceId||state.races.find", "state.raceCycles=state.raceCycles||{}; state.raceCycleHistory=state.raceCycleHistory||{}; state.racePlans=state.racePlans||{}; state.multiRace=Object.assign({schemaVersion:F12_SCHEMA_VERSION,migratedAt:f12Now()},state.multiRace||{}); state.multiRace.schemaVersion=F12_SCHEMA_VERSION; if(!state.races.length){state.activeRaceId=null;return true} state.activeRaceId=state.activeRaceId||state.races.find");
rep("function f12SetActiveRace(id){f12EnsureState();", "function f12SetActiveRace(id){f12SaveActiveScope();f12EnsureState();");
rep("throw Error('Carrera no encontrada');f12SaveActiveScope();state.races.forEach", "throw Error('Carrera no encontrada');state.races.forEach");
rep('goal:f12GoalForRace(r,defaultGoal(),cycle),planOriginal:null', "goal:f12GoalForRace(r,state.multiRace?.allowEmptyRaces===true?{type:r.targetPaceSecPerKm||r.targetTimeSec?'tiempo_objetivo':'completar',targetPaceMinKm:null,targetPaceLabel:'',startDate:todayISO()}:defaultGoal(),cycle),planOriginal:null");
rep('function loadState(){', `// Nuevo atleta: preferencias neutras, sin mediciones, objetivos ni historial heredado.
function f13_2_blankAthleteState(){
  const fresh=defaultState();
  fresh.profile={name:'',age:'',heightCm:'',weightKg:'',weightGoalKg:'',level:'principiante',experienceNote:'',currentCapabilityMinutes:'',walkingPaceMinKm:'',knownRecentPaceMinKm:null,knownRecentBest:null};
  fresh.goal={distanceKm:null,date:'',startDate:todayISO(),type:'completar',targetPaceMinKm:null,targetPaceLabel:''};
  fresh.activities=[]; fresh.limitations=[]; fresh.weights=[];
  fresh.races=[]; fresh.activeRaceId=null; fresh.raceCycles={}; fresh.raceCycleHistory={}; fresh.racePlans={};
  fresh.athleteHistory={sessions:[],weighIns:[],readiness:[],injuries:[],notes:[],updatedAt:f12Now()};
  fresh.multiRace={schemaVersion:F12_SCHEMA_VERSION,allowEmptyRaces:true};
  return fresh;
}

function loadState(){`);
rep('JSON.stringify({email, password})', "JSON.stringify({email, password, data:{made2run_new_signup:true}})");
const start=s.indexOf('/* isNewSignup=true');const end=s.indexOf('\n/* Selector de adaptador',start);
s=s.slice(0,start)+`/* Solo se migra un estado local sin propietario o de esta misma cuenta.
   La marca de signup también cubre la confirmación por email en otro dispositivo. */
async function f13_2_syncAfterAuth(authUser, opts){
  opts = opts || {};
  const remoteRow = await remoteState.fetch(authUser.id);
  if(remoteRow && remoteRow.state){
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
}
`+s.slice(end);
rep('function ensurePlan(){','function ensurePlan(){\n  if(!f12ActiveRace()) return;');
rep('state = defaultState();\n  f12EnsureState();','state = f13_2_blankAthleteState();\n  f12EnsureState();');
rep('const fresh = defaultState();','const fresh = f13_2_blankAthleteState();');
rep("if(!r){box.innerHTML='';return;}",`if(!r){box.innerHTML='<h2>Bienvenido a Made2Run</h2><p>Crea tu primera carrera para empezar.</p><button class="smallbtn primary" id="firstRaceBtn">Crear mi primera carrera</button>';document.getElementById('firstRaceBtn').onclick=f13_2_openRaceForm;return;}`);
rep('function renderActiveRace(){',`function f13_2_openRaceForm(){
  document.querySelector('.tabbtn[data-tab="carreras"]').click();
  document.getElementById('r_name').focus();
}
function renderActiveRace(){`);
rep('function renderGoalForm(){',`function renderGoalForm(){
  if(!f12ActiveRace()){document.getElementById('goalForm').textContent='Crea tu primera carrera para configurar su objetivo.';return;}`);
rep('function renderPlanActionBtn(){\n  const btn = document.getElementById(\'planActionBtn\');',`function renderPlanActionBtn(){
  const btn = document.getElementById('planActionBtn');
  if(!f12ActiveRace()){btn.textContent='Crear mi primera carrera';btn.onclick=f13_2_openRaceForm;return;}`);
rep('function renderAll(){\n  f12EnsureState();',`function renderAll(){
  f12EnsureState();
  const empty=state.races.length===0;
  // Ocultar también los paneles previamente renderizados de otra cuenta.
  for(const id of ['tab-hoy','tab-plan','tab-progreso']){
    for(const child of document.getElementById(id).children){
      if(child.id==='activeRaceCard') continue;
      if(empty && !child.hasAttribute('data-onboarding-display')){
        child.setAttribute('data-onboarding-display',child.style.display);child.style.display='none';
      }else if(!empty && child.hasAttribute('data-onboarding-display')){
        child.style.display=child.getAttribute('data-onboarding-display');child.removeAttribute('data-onboarding-display');
      }
    }
  }`);
rep('function renderCharts(){','function renderCharts(){\n  if(!f12ActiveRace()) return;');
fs.writeFileSync('outputs/index.html',s);
