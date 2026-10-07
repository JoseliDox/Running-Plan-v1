const fs=require('fs'),http=require('http');
const pre=`<script>localStorage.clear();window.fetch=async()=>({ok:true,json:async()=>[]});window.auditErrors=[];window.addEventListener('error',e=>auditErrors.push(e.message));</script>`;
const post=`<script>
window.addEventListener('DOMContentLoaded',()=>setTimeout(async()=>{
const findings=[];function record(id,data){findings.push({id,data})}function clean(){remoteAuth.session=null;state=f13_2_blankAthleteState();usersStore={schemaVersion:1,activeUserId:'test',users:[{id:'test',f12State:state,remoteSync:{}}]};f12EnsureState()}
function race(distance=10){clean();const r=f12CreateRace({name:'Audit',date:addDays(todayISO(),40),distanceKm:distance});f12SetActiveRace(r.id);ensurePlan();renderAll();return r}
try{
clean();renderAll();record('B01-empty',{welcome:document.getElementById('activeRaceCard').textContent,planVisibleChildren:[...document.getElementById('tab-plan').children].filter(x=>x.style.display!=='none').length});
let callbacks=[];showConfirm('A','test',()=>callbacks.push('cancelled A'));document.getElementById('confirmCancelBtn').click();showConfirm('B','test',()=>callbacks.push('confirmed B'));document.getElementById('confirmOkBtn').click();record('B02-modal-cancel',callbacks);
race(21.0975);const before=state.goal.distanceKm;const selected=document.getElementById('g_dist').value;document.getElementById('saveGoalBtn').click();record('B03-custom-distance',{before,selected,after:state.goal.distanceKm,raceDistance:state.races[0].distanceKm});
race();document.getElementById('r_distance').value='-5';document.getElementById('r_date').value='2020-01-01';document.getElementById('r_time').value='-10';document.getElementById('addRaceBtn').click();record('B04-validation',{distance:state.races.at(-1).distanceKm,date:state.races.at(-1).date,time:state.races.at(-1).targetTimeSec});
race();state.races[0].name='<svg onload="document.body.dataset.auditXss=1"></svg>';renderActiveRace();await new Promise(r=>setTimeout(r,60));record('B05-xss',{executed:document.body.dataset.auditXss==='1'});
race();const allIds=[...document.querySelectorAll('[id]')].map(x=>x.id);record('B06-duplicate-ids',allIds.filter((x,i)=>allIds.indexOf(x)!==i));record('B07-labels',{unassociated:[...document.querySelectorAll('label')].filter(l=>!l.control).length,total:document.querySelectorAll('label').length,clickableDivs:document.querySelectorAll('.themechip,.daychip,.checkin-chip').length});
document.getElementById('chartKmCaption').textContent='OLD USER 5 km';clean();const b=f12CreateRace({date:addDays(todayISO(),40),distanceKm:5});f12SetActiveRace(b.id);ensurePlan();renderAll();record('B08-old-chart-caption',document.getElementById('chartKmCaption').textContent);
const originalSave=saveState;let writes=0;saveState=()=>{writes++};renderAll();renderAll();saveState=originalSave;record('B09-render-writes',writes);
race();document.getElementById('g_pace').value='05:30';document.querySelector('input[name=g_type][value=tiempo_objetivo]').checked=true;document.getElementById('saveGoalBtn').click();document.querySelector('input[name=g_type][value=completar]').checked=true;document.getElementById('saveGoalBtn').click();record('B10-complete-keeps-pace',{type:state.goal.type,pace:state.goal.targetPaceMinKm,card:f12RaceTarget(state.races[0])});
record('B11-baseline-console',auditErrors);
const s=allSessions().find(s=>s.category==='running');const box=buildQuickLog(s,{status:'completed',distance:1,duration:10});document.body.appendChild(box);box.querySelector('.inDist').value='-10';box.querySelector('.inTime').value='-20';box.querySelector('.inRpe').value='99';box.querySelector('.inDiscomfort').value='-3';box.querySelector('.saveBtn').click();record('B12-result-validation',state.results[s.id]);
}catch(e){record('HARNESS-ERROR',e.stack)}
const pre=document.createElement('pre');pre.id='auditResults';pre.textContent=JSON.stringify(findings,null,2);document.body.replaceChildren(pre);
// Solo el servidor local de auditoría recibe los resultados, sin datos reales.
const xhr=new XMLHttpRequest();xhr.open('POST','/results');xhr.send(JSON.stringify(findings,null,2));
},30));</script>`;
http.createServer((req,res)=>{if(req.url==='/results'){let body='';req.on('data',x=>body+=x);req.on('end',()=>{fs.writeFileSync('work/audit/browser-tests.json',body);res.end('ok')});return}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('outputs/index.html','utf8').replace('<head>','<head>'+pre).replace('</body>',post+'</body>'))}).listen(8770,'127.0.0.1');
