import {spawn} from 'node:child_process';
import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
const root=process.cwd(),kind=JSON.parse(await readFile('package.json','utf8')).name;
const data=await mkdtemp(join(tmpdir(),'workspace-smoke-'));
for(const folder of ['data','career','config','recipes','inventory','assets'])await cp(join(root,folder),join(data,folder),{recursive:true}).catch(e=>{if(e.code!=='ENOENT')throw e;});
await cp(join(root,'manifest-index.json'),join(data,'manifest-index.json')).catch(e=>{if(e.code!=='ENOENT')throw e;});
const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const url='http://127.0.0.1:'+port;
let logs='';const server=spawn(process.execPath,[process.env.TEST_SERVER_ENTRY||resolve('.next/standalone/server.js')],{cwd:root,env:{...process.env,HOSTNAME:'127.0.0.1',PORT:String(port),DATA_BACKEND:'local',DATA_DIRECTORY:data,APP_RUNTIME:'local',APP_PASSWORD:'',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
async function call(path,method='GET',body,origin=url){const response=await fetch(url+path,{method,headers:body?{'Content-Type':'application/json',Origin:origin}:{},body:body?JSON.stringify(body):undefined});let result;try{result=await response.json();}catch{result=null;}if(response.status>=500)console.error(path,response.status,result);return {status:response.status,result};}
try{
 let ready=false;for(let n=0;n<100;n++){try{const r=await fetch(url);if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,logs.slice(-2000));
 const html=await (await fetch(url)).text();assert.ok(html.includes(kind==='career-workspace'?'CAREER WORKSHOP':'KITCHEN MANAGER'));
 const paths=await call('/api/records');assert.equal(paths.status,200);assert.ok(paths.result.paths.length>0);
 const marker='check-'+crypto.randomUUID();
 if(kind==='career-workspace'){
  let current=await call('/api/workspace');assert.equal(current.status,200);assert.deepEqual(current.result.workspace.opportunities,[]);assert.equal(current.result.cv.name,'');
  const before=current.result.revision;const workspace=structuredClone(current.result.workspace);workspace.activity.push({id:crypto.randomUUID(),text:marker,at:new Date().toISOString(),kind:'test'});
  const firstSave=await call('/api/workspace','POST',{workspace,revision:before});assert.equal(firstSave.status,200,JSON.stringify(firstSave));
  assert.equal((await call('/api/workspace','POST',{workspace,revision:before})).status,409);
  assert.equal((await call('/api/workspace')).result.workspace.activity[0].text,marker);
  assert.equal((await call('/api/workspace','POST',{workspace,revision:before},'https://invalid.example')).status,403);
  assert.equal((await call('/api/cv','POST',{language:'en',focus:'operations',photo:false})).status,400);
  const cvRecord=await call('/api/records?path=career/cv.json');const cv=cvRecord.result.data;cv.name=marker;cv.headlines.en=marker;cv.summaries.operations.en=marker;
  assert.equal((await call('/api/records','PUT',{path:'career/cv.json',data:cv,revision:cvRecord.result.revision})).status,200);
  const pdf=await fetch(url+'/api/cv',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify({language:'en',focus:'operations',photo:false})});assert.equal(pdf.status,200);assert.ok(new TextDecoder().decode((await pdf.arrayBuffer()).slice(0,4))==='%PDF');assert.ok(pdf.headers.get('X-Career-Document'));
 }else{
  const empty=await call('/api/corpus');assert.equal(empty.status,200);assert.deepEqual(empty.result.recipes,[]);assert.deepEqual(empty.result.pantry,[]);
  const path=join(data,'inventory/pantry/ingredients.json'),record=JSON.parse(await readFile(path,'utf8')),id='check-'+crypto.randomUUID();record.items.push({id,name:marker,stock_status:'unknown',restock_status:'unspecified',notes:marker});await writeFile(path,JSON.stringify(record));
  const change={key:'pantry.ingredients:'+id+':stock_status',kind:'pantry',id,collection:'pantry.ingredients',field:'stock_status',before:'unknown',value:'in_stock',createdAt:new Date().toISOString()};
  assert.equal((await call('/api/changes','POST',change)).status,200);assert.equal((await call('/api/changes','POST',change)).status,200);
  assert.equal((await call('/api/changes','POST',{...change,value:'low'})).status,409);
  assert.equal((await call('/api/changes','POST',{...change,field:'unsupported'})).status,400);
  assert.equal((await call('/api/changes','POST',change,'https://invalid.example')).status,403);
  const item=(await call('/api/corpus')).result.pantry[0];assert.equal(item.stock_status,'in_stock');assert.equal(item.notes,marker);
 }
 assert.equal((await call('/api/records?path=.env.local')).status,400);
 const target=paths.result.paths[0],record=await call('/api/records?path='+encodeURIComponent(target));assert.equal(record.status,200);
 assert.equal((await call('/api/records','PUT',{path:target,data:{},revision:record.result.revision})).status,400);
 console.log(kind+': production HTTP reads, writes, conflict checks, schema rejection, origin controls and empty startup passed.');
}finally{server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));await rm(data,{recursive:true,force:true});}
