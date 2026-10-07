const assert=require('assert/strict');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const {ROOT,RUNTIME_FILES}=require('../helpers/runtime.cjs');

const expected='2D478B0A81281EDA81317E5D94ED9B7D1105D3F3B38D1A597B7BCB69B8E825E4';
const golden=fs.readFileSync(path.join(ROOT,'archive','Made2Run_F14.1_STABLE.html'));
assert.equal(crypto.createHash('sha256').update(golden).digest('hex').toUpperCase(),expected,'golden-master hash');

const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
assert.equal(/<style[\s>]/i.test(html),false,'index.html must not contain inline CSS');
assert.equal([...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/gi)].length,0,'index.html must not contain inline scripts');
assert.match(html,/type="module" src="\.\/js\/app\.js"/);

const refs=[...html.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g)].map(m=>m[1]);
for(const ref of refs)assert.ok(fs.existsSync(path.join(ROOT,ref)),`missing asset: ${ref}`);
for(const file of RUNTIME_FILES)assert.ok(fs.existsSync(path.join(ROOT,file)),`missing runtime: ${file}`);

const body=value=>value.match(/<body>([\s\S]*?)<\/body>/)?.[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'').replace(/\s+/g,' ').trim();
assert.equal(body(html),body(golden.toString('utf8')),'static body changed from F14.1');

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(ids.filter((id,i)=>ids.indexOf(id)!==i),[],'duplicate static IDs');

const source=RUNTIME_FILES.map(file=>fs.readFileSync(path.join(ROOT,file),'utf8')).join('\n');
assert.equal(/service[_-]?role|sk-[A-Za-z0-9_-]{20,}|OPENAI_API_KEY/i.test(source),false,'private secret pattern found');
console.log(JSON.stringify({ok:true,goldenHash:expected,assets:refs.length,runtimeFiles:RUNTIME_FILES.length,duplicateIds:0},null,2));
