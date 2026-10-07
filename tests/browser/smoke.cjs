const {chromium}=require('playwright');
const http=require('http');
const fs=require('fs');
const path=require('path');
const assert=require('assert/strict');
const root=path.resolve(__dirname,'..','..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(target,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(b);});});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port,rows={};
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext();
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://mpbvrhlwlduyglkevfyw.supabase.co/**',async route=>{
      const req=route.request(),url=new URL(req.url());let body=null;
      if(url.pathname==='/auth/v1/signup')body={access_token:'test-A',refresh_token:'refresh-A',expires_at:9999999999,user:{id:'A',email:'a@example.test',user_metadata:{made2run_new_signup:true}}};
      else if(req.method()==='POST'&&url.pathname.includes('/rest/v1/user_state')){for(const row of req.postDataJSON())rows[row.user_id]=row;}
      else if(url.pathname.includes('/rest/v1/user_state')){const uid=url.searchParams.get('user_id')?.replace(/^eq\./,'');body=rows[uid]?[rows[uid]]:[];}
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.locator('#gateToggleBtn').click();
    await page.locator('#gateEmail').fill('a@example.test');
    await page.locator('#gatePassword').fill('test-password');
    await page.locator('#gateSubmitBtn').click();
    await page.locator('#firstRaceBtn').waitFor();
    assert.deepEqual(await page.evaluate(()=>({races:state.races.length,active:state.activeRaceId})),{races:0,active:null});
    await page.locator('#firstRaceBtn').click();
    await page.locator('#r_name').fill('Primera 10K');
    await page.locator('#r_distance').fill('10');
    await page.locator('#r_date').fill('2027-06-01');
    await page.locator('#addRaceBtn').click();
      await page.locator('.race-list-item.active').waitFor();
    assert.ok(await page.evaluate(()=>state.planCurrent.weeks.length>0));
    await page.locator('.tabbtn[data-tab="plan"]').click();
    assert.ok((await page.locator('#tab-plan').innerText()).includes('min total'));
    const firstLog=page.locator('#tab-plan .logbox').first();
    await firstLog.getByRole('button',{name:'Sí',exact:true}).click();
    await firstLog.locator('.inDist').fill('3');await firstLog.locator('.inTime').fill('24');
    await firstLog.locator('.saveBtn').click();
    assert.ok(await page.evaluate(()=>Object.keys(state.results).length>0));
    await page.reload();await page.locator('#openRacesBtn').waitFor();
    assert.equal(await page.evaluate(()=>state.races[0].name),'Primera 10K');
    await page.locator('.tabbtn[data-tab="perfil"]').click();
    for(const id of ['f_recentdays','f_weeklyminutes','f_longminutes','f_years','f_consecutive'])assert.ok(await page.locator('#'+id).count());
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,signup:true,onboarding:true,plan:true,feedback:true,reload:true,profile:true,consoleErrors:0},null,2));
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
