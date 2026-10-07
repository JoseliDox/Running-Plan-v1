const fs=require('fs'),http=require('http');
const pre=`<script>
localStorage.clear();const testRows={};let testUid='A';const testErrors=[];window.addEventListener('error',e=>testErrors.push(e.message));
window.fetch=async(url,opts={})=>{url=new URL(url);let body={};
if(url.pathname==='/auth/v1/signup'||url.pathname==='/auth/v1/token')body={access_token:'test-'+testUid,refresh_token:'r',expires_at:9999999999,user:{id:testUid,email:testUid+'@test.invalid',user_metadata:{made2run_new_signup:true}}};
else if(opts.method==='POST'&&url.pathname.includes('user_state')){for(const row of JSON.parse(opts.body))testRows[row.user_id]=row;body=null}
else if(url.pathname.includes('user_state')){const id=url.searchParams.get('user_id').slice(3);body=testRows[id]?[testRows[id]]:[]}
return {ok:true,json:async()=>body};};
</script>`;
const post=`<script>
window.addEventListener('DOMContentLoaded',()=>setTimeout(async()=>{
const results=[];function check(condition,label){if(!condition)throw Error(label);results.push('PASS '+label)}
try{
renderAuthGate('signup');document.getElementById('gateEmail').value='A@test.invalid';document.getElementById('gatePassword').value='test-password';await document.getElementById('gateSubmitBtn').onclick();
check(state.races.length===0&&state.activeRaceId===null&&state.planCurrent===null,'signup sin carrera ni plan');
check(state.weights.length===0&&state.limitations.length===0&&state.activities.length===0&&state.profile.weightKg===''&&state.profile.age==='','sin datos personales');
for(let i=0;i<10;i++){f12EnsureState();renderAll();ensurePlan();f12ActiveCycle();}saveState();
check(state.races.length===0,'normalización y render repetidos conservan vacío');
check(document.getElementById('firstRaceBtn')?.textContent==='Crear mi primera carrera','bienvenida y botón');
await f13_2_syncAfterAuth(remoteAuth.session.user,{});check(state.races.length===0,'restauración remota vacía');
document.getElementById('firstRaceBtn').click();check(document.activeElement.id==='r_name','botón abre formulario existente');
document.getElementById('r_name').value='Primera 10K';document.getElementById('r_date').value='2026-11-20';document.getElementById('addRaceBtn').click();
check(state.races.length===1&&state.activeRaceId===state.races[0].id,'primera carrera seleccionada sin carrera fantasma');
check(state.goal.targetPaceMinKm===null&&state.goal.date==='2026-11-20','sin objetivo legacy en nueva carrera');
check(state.planCurrent.weeks.length>0,'plan normal generado');
await f13_2_syncAfterAuth(remoteAuth.session.user,{});check(state.races[0].name==='Primera 10K','persistencia remota y restauración');
state.profile.name='Private A';saveState();await logout();testUid='B';renderAuthGate('signup');document.getElementById('gateEmail').value='B@test.invalid';document.getElementById('gatePassword').value='test-password';await document.getElementById('gateSubmitBtn').onclick();
check(state.profile.name===''&&state.races.length===0&&testRows.A.state.profile.name==='Private A','aislamiento A/B y conservación de A');
f12AdoptRemoteUser({id:'A'},testRows.A.state);await f13_2_syncAfterAuth({id:'C'},{});check(state.profile.name===''&&state.races.length===0,'login sin fila no migra cuenta ajena');
const legacy=defaultState();legacy.profile.name='Legacy owner';usersStore={schemaVersion:1,activeUserId:'local',users:[{id:'local',authUserId:null,f12State:legacy}]};state=legacy;f12EnsureState();await f13_2_syncAfterAuth({id:'D'},{});check(state.profile.name==='Legacy owner'&&state.races.length===1,'migración local sin propietario conservada');
const first=state.activeRaceId;const firstScope=JSON.stringify(state.racePlans[first]);const r=f12CreateRace({name:'Second',date:'2026-12-20',distanceKm:10});f12SetActiveRace(r.id);ensurePlan();f12SetActiveRace(first);ensurePlan();check(state.races.length===2&&JSON.stringify(state.racePlans[first])===firstScope,'multi-race conserva scopes');
check(!testErrors.length,'sin errores JavaScript');
}catch(e){results.push('FAIL '+e.stack)}
document.body.innerHTML='<pre id="testResults"></pre>';document.getElementById('testResults').textContent=results.join('\\n');
fetch('/results',{method:'POST',body:results.join('\\n')});
},50));</script>`;
http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('outputs/index.html','utf8').replace('<head>','<head>'+pre).replace('</body>',post+'</body>'))}).listen(8766,'127.0.0.1');
