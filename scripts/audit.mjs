import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import assert from 'node:assert/strict';
import {join} from 'node:path';
const excluded=new Set(['node_modules','.next','dist','.git','releases','downloads']);
const forbidden=/appgprj_[a-z0-9]+|oaiapp_[a-z0-9]+|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}/i;
function scan(dir){for(const e of readdirSync(dir,{withFileTypes:true})){if(excluded.has(e.name))continue;const path=join(dir,e.name);if(e.isSymbolicLink())throw Error('Unexpected symlink '+path);if(e.isDirectory())scan(path);else{assert.ok(!forbidden.test(path),'Personal path '+path);if(!/\.(ttf|png|jpg|webp|zip)$/.test(path))assert.ok(!forbidden.test(readFileSync(path,'utf8')),'Personal or credential marker in '+path);assert.ok(!e.name.startsWith('.env')||e.name==='.env.example','Environment secret file '+path);}}}
scan('.');
const read=path=>JSON.parse(readFileSync(path,'utf8'));
assert.equal(read('.openai/hosting.json').project_id,undefined);
if(existsSync('data/workspace.json')){
 const w=read('data/workspace.json'),cv=read('career/cv.json'),p=read('data/profile.json'),content=read('data/site-content.json');assert.deepEqual(w,{schemaVersion:1,opportunities:[],tasks:[],activity:[]});for(const field of ['name','email','phone','location'])assert.equal(cv[field],'');for(const field of ['experience','education','projects'])assert.deepEqual(cv[field],[]);for(const values of Object.values(cv.summaries))assert.deepEqual(values,{en:'',de:''});assert.deepEqual(content.projects,[]);assert.equal(content.name,'');assert.equal(content.direction,'');assert.equal(content.targetBase,null);for(const [key,value] of Object.entries(p))if(key!=='schema_version')assert.equal(Object.keys(value).length,0);assert.equal(read('config/discovery.json').enabled,false);
}else{
 assert.deepEqual(read('recipes/index.json').recipes,[]);assert.deepEqual(read('recipes/annotations.json').recipes,{});assert.deepEqual(read('config/storage.json').stores,[]);assert.deepEqual(read('config/shopping.json').routes,[]);for(const c of read('manifest-index.json').collections)assert.deepEqual(read(c.path).items,[]);
}
console.log('Privacy markers, credentials, Site identity and empty starter records passed.');
