const fs=require('fs'),http=require('http');
const pre=`<script>localStorage.clear();window.fetch=async()=>({ok:true,json:async()=>[]});window.f141BrowserErrors=[];window.addEventListener('error',e=>f141BrowserErrors.push(e.message));</script>`;
const post=`<script>
window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{
 const report={};
 try{
  const clean=()=>{remoteAuth.session=null;state=f13_2_blankAthleteState();usersStore={schemaVersion:1,activeUserId:'visual-test',users:[{id:'visual-test',f12State:state,remoteSync:{}}]};f12EnsureState();};
  clean();renderAll();report.empty={races:state.races.length,activeRaceId:state.activeRaceId,welcome:document.getElementById('activeRaceCard').textContent.trim()};
  state.profile=Object.assign(state.profile,{level:'principiante',trainingKnowledge:'basico',currentCapabilityMinutes:0,recentRunDaysPerWeek:0,currentWeeklyMinutes:0,usualLongSessionMinutes:0,trainingYears:0});
  state.availability={days:[1,3,6],maxSessionsPerWeek:3,sessionDurationAvailMin:60,blockedDates:[]};
  let race=f12CreateRace({name:'Primera 5K',distanceKm:5,date:addDays(todayISO(),83),priority:'primary'});f12SetActiveRace(race.id);ensurePlan();renderAll();
  const first=allSessions().find(s=>s.planned&&s.category==='running'),firstCard=[...document.querySelectorAll('.sess')].find(el=>el.textContent.includes(first.title));
  report.beginner={feasibility:state.planCurrent.meta.feasibility.status,type:first.subtype,total:first.planned.totalDurationMin,blockMinutes:first.planned.blocks.reduce((sum,b)=>sum+b.durationSec,0)/60,cardShowsTotal:firstCard?.textContent.includes('min total')||false,raceStrategy:allSessions().find(s=>s.category==='carrera')?.planned?.prescription?.strategy};
  clean();state.profile=Object.assign(state.profile,{level:'principiante',currentCapabilityMinutes:0,recentRunDaysPerWeek:0,currentWeeklyMinutes:0,usualLongSessionMinutes:0});state.availability={days:[2,6],maxSessionsPerWeek:2,sessionDurationAvailMin:60,blockedDates:[]};
  race=f12CreateRace({name:'Maratón cercano',distanceKm:42.195,date:addDays(todayISO(),27),priority:'primary'});f12SetActiveRace(race.id);ensurePlan();renderAll();
  report.infeasible={status:state.planCurrent.meta.feasibility.status,notice:!!document.querySelector('#activeRaceCard .condition-banner'),raceStrategy:allSessions().find(s=>s.category==='carrera')?.planned?.prescription?.strategy,taper:state.planCurrent.weeks.filter(w=>w.phase==='taper').map(w=>w.days.filter(d=>d.planned&&d.type!=='RACE').reduce((sum,d)=>sum+d.planned.totalDurationMin,0))};
  renderProfileForm();report.profileFields=['f_recentdays','f_weeklyminutes','f_longminutes','f_years','f_consecutive'].every(id=>!!document.getElementById(id));
  report.duplicateIds=[...document.querySelectorAll('[id]')].map(x=>x.id).filter((x,i,a)=>a.indexOf(x)!==i);report.consoleErrors=f141BrowserErrors;
 }catch(error){report.harnessError=error.stack||error.message;}
 const preEl=document.createElement('pre');preEl.id='f141BrowserResults';preEl.textContent=JSON.stringify(report,null,2);document.body.replaceChildren(preEl);
 const xhr=new XMLHttpRequest();xhr.open('POST','/results');xhr.send(JSON.stringify(report,null,2));
},80));
</script>`;
const server=http.createServer((req,res)=>{if(req.url==='/results'){let body='';req.on('data',x=>body+=x);req.on('end',()=>{fs.writeFileSync('work/f14_1-browser-results.json',body);res.end('ok')});return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('outputs/index.html','utf8').replace('<head>','<head>'+pre).replace('</body>',post+'</body>'));});
server.listen(8772,'127.0.0.1');
