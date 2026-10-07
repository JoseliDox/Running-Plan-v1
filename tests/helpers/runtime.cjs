const fs=require('fs');
const path=require('path');
const vm=require('vm');

const ROOT=path.resolve(__dirname,'..','..');
const RUNTIME_FILES=[
  'js/bootstrap/theme.js',
  'js/engine/prescription-engine.js',
  'js/races/multi-race.js',
  'js/state/state-model.js',
  'js/config/supabase.js',
  'js/auth/supabase-auth.js',
  'js/state/persistence.js',
  'js/workouts/workouts.js',
  'js/ui/ui.js',
];

function nodeStub(){
  return {style:{},dataset:{},children:[],classList:{add(){},remove(){},contains(){return false}},addEventListener(){},removeEventListener(){},click(){},appendChild(){},querySelector(){return nodeStub()},querySelectorAll(){return []},setAttribute(){},getAttribute(){return ''},hasAttribute(){return false},removeAttribute(){},innerHTML:'',textContent:''};
}

function createSandbox(){
  const storage=new Map(),nodes=new Map();
  const sandbox={console,URL,URLSearchParams,Date,Promise,setTimeout,clearTimeout,structuredClone,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),clear:()=>storage.clear()},
    window:{addEventListener(){},location:{hash:'',pathname:'/',search:'',origin:'https://example.test'}},
    document:{readyState:'loading',documentElement:{setAttribute(){}},getElementById:id=>{if(!nodes.has(id))nodes.set(id,nodeStub());return nodes.get(id)},querySelector:()=>nodeStub(),querySelectorAll:()=>[],createElement:()=>nodeStub()},
    fetch:()=>{throw Error('NETWORK FORBIDDEN')},
  };
  sandbox.window.document=sandbox.document;
  return vm.createContext(sandbox);
}

function scriptsFor(mode){
  if(mode==='golden'){
    const html=fs.readFileSync(path.join(ROOT,'archive','Made2Run_F14.1_STABLE.html'),'utf8');
    return [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  }
  return RUNTIME_FILES.map(file=>fs.readFileSync(path.join(ROOT,file),'utf8'));
}

function createRuntime(mode='modular'){
  const context=createSandbox();
  for(const script of scriptsFor(mode))vm.runInContext(script,context,{timeout:10000});
  return context;
}

module.exports={ROOT,RUNTIME_FILES,createRuntime,scriptsFor};
