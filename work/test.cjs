const {chromium}=require('C:/Users/josel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),http=require('http'),assert=require('assert/strict');
(async()=>{
const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(fs.readFileSync('outputs/index.html'))}).listen(8765,'127.0.0.1');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const rows={};let uid='A';
 await page.route('https://mpbvrhlwlduyglkevfyw.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url());let body={};
 if(url.pathname==='/auth/v1/signup'||url.pathname==='/auth/v1/token')body={access_token:'test-'+uid,refresh_token:'r-'+uid,expires_at:9999999999,user:{id:uid,email:uid+'@test.invalid',user_metadata:{made2run_new_signup:true}}};
 else if(req.method()==='POST'&&url.pathname.includes('user_state')){for(const row of req.postDataJSON())rows[row.user_id]=row;body=null}
 else if(url.pathname.includes('user_state')){const id=url.searchParams.get('user_id').slice(3);body=rows[id]?[rows[id]]:[]}
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('http://127.0.0.1:8765');
 await page.locator('#gateToggleBtn').click();await page.locator('#gateEmail').fill('A@test.invalid');await page.locator('#gatePassword').fill('test-password');await page.locator('#gateSubmitBtn').click();
 await page.locator('#firstRaceBtn').waitFor();
 const blank=await page.evaluate(()=>JSON.parse(JSON.stringify(state)));
 assert.deepEqual(blank.races,[]);assert.equal(blank.activeRaceId,null);assert.equal(blank.planCurrent,null);assert.deepEqual(blank.weights,[]);assert.deepEqual(blank.limitations,[]);assert.equal(blank.profile.weightKg,'');
 await page.evaluate(()=>{for(let i=0;i<10;i++){f12EnsureState();renderAll();ensurePlan();f12ActiveCycle();}saveState()});
 assert.equal(await page.evaluate(()=>state.races.length),0);
 await page.reload();await page.locator('#firstRaceBtn').waitFor();
 await page.locator('#firstRaceBtn').click();assert(await page.locator('#r_name').isFocused());
 await page.locator('#r_name').fill('Primera 10K');await page.locator('#r_date').fill('2026-11-20');await page.locator('#addRaceBtn').click();
 assert.equal(await page.evaluate(()=>state.races.length),1);assert.equal(await page.evaluate(()=>state.goal.targetPaceMinKm),null);
 assert(await page.evaluate(()=>state.planCurrent.weeks.length>0));assert.equal(await page.evaluate(()=>state.races[0].id===state.activeRaceId),true);
 await page.reload();await page.locator('#openRacesBtn').waitFor();assert.equal(await page.evaluate(()=>state.races[0].name),'Primera 10K');
 await page.evaluate(()=>{state.profile.name='Private A';saveState()});await page.evaluate(()=>logout());
 uid='B';await page.locator('#gateEmail').fill('B@test.invalid');await page.locator('#gatePassword').fill('test-password');await page.locator('#gateSubmitBtn').click();await page.locator('#firstRaceBtn').waitFor();assert.equal(await page.evaluate(()=>state.profile.name),'');assert.equal(rows.A.state.profile.name,'Private A');
 // B has no metadata: a foreign owned cache must still never be migrated.
 await page.evaluate(async()=>{f12AdoptRemoteUser({id:'A',email:'A'}, { ...f13_2_blankAthleteState(),profile:{...f13_2_blankAthleteState().profile,name:'Secret'}}); await f13_2_syncAfterAuth({id:'C',email:'C'},{});});assert.equal(await page.evaluate(()=>state.profile.name),'');
 // Preserve the deliberate unowned legacy migration, including its default race.
 await page.evaluate(async()=>{const legacy=defaultState();legacy.profile.name='Legacy owner';usersStore={schemaVersion:1,activeUserId:'local',users:[{id:'local',authUserId:null,f12State:legacy}]};state=legacy;f12EnsureState();await f13_2_syncAfterAuth({id:'D',email:'D'},{});});assert.equal(await page.evaluate(()=>state.profile.name),'Legacy owner');assert.equal(await page.evaluate(()=>state.races.length),1);
 await page.evaluate(()=>{const first=state.activeRaceId;const r=f12CreateRace({name:'Second',date:'2026-12-20',distanceKm:10});f12SetActiveRace(r.id);ensurePlan();f12SetActiveRace(first);ensurePlan()});assert.equal(await page.evaluate(()=>state.races.length),2);
 assert.deepEqual(errors,[]);await page.screenshot({path:'work/verified.png'});
 console.log('PASS: signup UI, clean state, repeated normalization, empty reload, first-race button/form, plan generation, remote save/reload, A/B/C isolation, legacy migration, multi-race; no browser errors.');
}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
