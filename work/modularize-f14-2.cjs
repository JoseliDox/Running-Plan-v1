const fs=require('fs');
const path=require('path');

const root=process.cwd();
const source=fs.readFileSync(path.join(root,'archive','Made2Run_F14.1_STABLE.html'),'utf8');
const styleMatch=source.match(/<style>([\s\S]*?)<\/style>/);
const scriptMatches=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if(!styleMatch||scriptMatches.length!==2)throw new Error('Unexpected golden-master structure');

const css=styleMatch[1].replace(/^\r?\n/,'');
const tokensEnd=css.indexOf('/* ======================================================================= */');
if(tokensEnd<0)throw new Error('Theme boundary not found');
const tokens=css.slice(0,tokensEnd+'/* ======================================================================= */'.length).trim()+'\n';
const components=css.slice(tokensEnd+'/* ======================================================================= */'.length).trim()+'\n';

const bootstrapAndRaces=scriptMatches[0][1].replace(/^\r?\n/,'');
const bootstrapEnd=bootstrapAndRaces.indexOf('})();');
if(bootstrapEnd<0)throw new Error('Theme bootstrap boundary not found');
const theme=bootstrapAndRaces.slice(0,bootstrapEnd+5).trim()+'\n';
const races=bootstrapAndRaces.slice(bootstrapEnd+5).trim()+'\n';

const runtime=scriptMatches[1][1].replace(/^\r?\n/,'');
const stateMarker='/* =====================================================================\n   MADE2RUN — V2 — STATE + ORQUESTACIÓN + UI';
const workoutsMarker='/* ---------------------------------------------------------------------\n   2) CONTENIDO DE SESIÓN — texto generado a partir del tipo/fase';
const uiMarker='/* =====================================================================\n   7) UI — render. Consume STATE/PLAN/ENGINE, no decide nada por su cuenta.';
const stateAt=runtime.indexOf(stateMarker),workoutsAt=runtime.indexOf(workoutsMarker),uiAt=runtime.indexOf(uiMarker);
if(stateAt<0||workoutsAt<0||uiAt<0||!(stateAt<workoutsAt&&workoutsAt<uiAt))throw new Error('Runtime boundaries not found');
const engine=runtime.slice(0,stateAt).trim()+'\n';
const stateRuntime=runtime.slice(stateAt,workoutsAt).trim()+'\n';
const authMarker='/* =====================================================================\n   F13.2 — SUPABASE AUTH + PERSISTENCIA REMOTA';
const persistenceMarker="/* Selector de adaptador activo para la persistencia LOCAL";
const authAt=stateRuntime.indexOf(authMarker),persistenceAt=stateRuntime.indexOf(persistenceMarker);
if(authAt<0||persistenceAt<0||authAt>=persistenceAt)throw new Error('Auth boundaries not found');
const stateModel=stateRuntime.slice(0,authAt).trim()+'\n';
let auth=stateRuntime.slice(authAt,persistenceAt).trim()+'\n';
const configPattern=/const SUPABASE_URL = '[^']+';\nconst SUPABASE_ANON_KEY = '[^']+';[^\n]*\nconst AUTH_SESSION_KEY = '[^']+';[^\n]*\n/;
const configMatch=auth.match(configPattern);
if(!configMatch)throw new Error('Supabase public config not found');
const config='/* Configuración pública del cliente Supabase. RLS protege user_state. */\n'+configMatch[0];
auth=auth.replace(configPattern,'');
const persistence=stateRuntime.slice(persistenceAt).trim()+'\n';
const workouts=runtime.slice(workoutsAt,uiAt).trim()+'\n';
let ui=runtime.slice(uiAt).trim()+'\n';
ui=ui.replace("window.addEventListener('DOMContentLoaded', ()=>{","function f14_2_startApp(){");
ui=ui.replace(/\}\);\s*$/,"}\nif(document.readyState==='loading') window.addEventListener('DOMContentLoaded',f14_2_startApp,{once:true});\nelse f14_2_startApp();\n");

const files={
  'css/variables.css':tokens,
  'css/app.css':components,
  'js/bootstrap/theme.js':theme,
  'js/races/multi-race.js':races,
  'js/engine/prescription-engine.js':engine,
  'js/config/supabase.js':config,
  'js/state/persistence.js':persistence,
  'js/state/state-model.js':stateModel,
  'js/auth/supabase-auth.js':auth,
  'js/workouts/workouts.js':workouts,
  'js/ui/ui.js':ui,
};
for(const [file,content] of Object.entries(files)){
  const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);
}

const app=`const runtimeScripts = [\n  './js/engine/prescription-engine.js',\n  './js/races/multi-race.js',\n  './js/state/state-model.js',\n  './js/config/supabase.js',\n  './js/auth/supabase-auth.js',\n  './js/state/persistence.js',\n  './js/workouts/workouts.js',\n  './js/ui/ui.js',\n];\n\nfor (const src of runtimeScripts) {\n  await new Promise((resolve, reject) => {\n    const script = document.createElement('script');\n    script.src = src;\n    script.async = false;\n    script.onload = resolve;\n    script.onerror = () => reject(new Error('No se pudo cargar '+src));\n    document.head.appendChild(script);\n  });\n}\n`;
fs.mkdirSync(path.join(root,'js'),{recursive:true});fs.writeFileSync(path.join(root,'js','app.js'),app);

let html=source.replace(styleMatch[0],'<link rel="stylesheet" href="./css/variables.css">\n<link rel="stylesheet" href="./css/app.css">');
html=html.replace(scriptMatches[0][0],'');
html=html.replace('</head>','<script src="./js/bootstrap/theme.js"></script>\n</head>');
html=html.replace(scriptMatches[1][0],'<script type="module" src="./js/app.js"></script>');
fs.writeFileSync(path.join(root,'index.html'),html);

console.log(JSON.stringify(Object.fromEntries(Object.entries(files).map(([file,content])=>[file,content.length])),null,2));
