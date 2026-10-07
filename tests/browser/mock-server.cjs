const http=require('http');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..','..'),port=Number(process.env.PORT)||8774;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const mock=`<script>
window.fetch=async(url,opts={})=>{const u=new URL(url,location.href),method=(opts.method||'GET').toUpperCase();let body=null;
if(u.pathname==='/auth/v1/signup'||u.pathname==='/auth/v1/token')body={access_token:'browser-test',refresh_token:'browser-refresh',expires_at:9999999999,user:{id:'browser-user',email:'browser@example.test',user_metadata:{made2run_new_signup:true}}};
else if(u.pathname.includes('/rest/v1/user_state')&&method==='POST'){try{localStorage.setItem('__made2run_mock_remote',opts.body||'[]')}catch(e){}}
else if(u.pathname.includes('/rest/v1/user_state')&&method==='GET'){try{body=JSON.parse(localStorage.getItem('__made2run_mock_remote')||'[]')}catch(e){body=[]}}
return {ok:true,status:200,json:async()=>body};};
</script>`;
http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(target,(e,b)=>{if(e){res.writeHead(404);return res.end();}let data=b;if(target===path.join(root,'index.html'))data=Buffer.from(b.toString('utf8').replace('<head>','<head>'+mock));res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(data);});}).listen(port,'127.0.0.1',()=>console.log(`Mock browser test: http://127.0.0.1:${port}`));
