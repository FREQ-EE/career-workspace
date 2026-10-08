import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {join,relative} from 'node:path';
import {zipSync,strToU8} from 'fflate';
import {createHash} from 'node:crypto';

execFileSync(process.execPath,['scripts/audit.mjs'],{stdio:'inherit'});
const root=process.cwd(),name=JSON.parse(readFileSync('package.json','utf8')).name;
const excluded=new Set(['node_modules','.git','.next','dist','releases','.wrangler','downloads']);
function files(directory,prefix='',filter=()=>true){const out={};for(const entry of readdirSync(directory,{withFileTypes:true})){if(!filter(entry.name))continue;const path=join(directory,entry.name),key=prefix+entry.name;if(entry.isSymbolicLink())throw Error('Archive refuses symlink '+key);if(entry.isDirectory())Object.assign(out,files(path,key+'/',filter));else out[key]=new Uint8Array(readFileSync(path));}return out;}
function safe(name){return !excluded.has(name)&&(!name.startsWith('.env')||name==='.env.example')&&!name.startsWith('.dev.vars')&&!name.endsWith('.log')&&!name.endsWith('.tsbuildinfo')&&!name.endsWith('.tmp')&&!name.endsWith('.base64')&&name!=='data-lock';}
function save(suffix,entries){for(const [key,bytes] of Object.entries(entries)){if(/\.(js|mjs|json|map|nft.json)$/.test(key)){const value=new TextDecoder().decode(bytes);if(value.includes(root))entries[key]=strToU8(value.replaceAll(root,'/app/'+name));}}const filename=`${name}-${suffix}.zip`,bytes=zipSync(entries,{level:6});writeFileSync('releases/'+filename,bytes);return {filename,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}
mkdirSync('releases',{recursive:true});
const source=files(root,'',safe);
const outputs=[save('source',source)];
if(existsSync('dist/server/index.js')){const entries={...files(join(root,'dist'),'dist/'),'.openai/hosting.json':strToU8(readFileSync('.openai/hosting.json','utf8')),'DEPLOYMENT.md':strToU8('This Worker build has no inherited Site identity. Register a new owner-private Site from the source distribution, configure DATA_BACKEND=github, GITHUB_REPOSITORY, GITHUB_BRANCH, GITHUB_TOKEN and APP_RUNTIME=sites, then build and publish using its assigned project ID. This archive is build output, not a source checkout. See docs/deployment.md in the source archive.\n')};outputs.push(save('sites',entries));}
if(existsSync('.next/standalone/server.js')){
 const entries={...files(join(root,'.next/standalone'),'',n=>(!n.startsWith('.env')||n==='.env.example')&&!n.startsWith('.dev.vars')&&!n.endsWith('.log')&&!n.endsWith('.tmp')),...files(join(root,'.next/static'),'.next/static/'),...files(join(root,'public'),'public/')};
 // Only explicitly selected empty starter records enter the distribution.
 for(const directory of ['data','career','config','recipes','inventory','assets'])if(existsSync(directory))Object.assign(entries,files(join(root,directory),directory+'/',safe));
 for(const file of ['manifest-index.json','LICENSE','NOTICE','.env.example'])if(existsSync(file))entries[file]=new Uint8Array(readFileSync(file));
 entries['RUN.md']=strToU8('Requires Node.js 24 or newer. Extract into an empty directory. Run HOSTNAME=127.0.0.1 PORT=3000 node server.js (PowerShell: $env:HOSTNAME="127.0.0.1"; $env:PORT="3000"; node server.js). Defaults to local files. Put optional GitHub configuration in the process environment; never add credentials to this archive. For durable local data use DATA_DIRECTORY pointing to a copy of the included data directories.\n');
 outputs.push(save('local',entries));
}
const localArchive='releases/'+name+'-local.zip';if(existsSync(localArchive)){const bytes=readFileSync(localArchive),block=8*1024*1024;for(let offset=0,part=1;offset<bytes.length;offset+=block,part++)writeFileSync(localArchive+'.'+String(part).padStart(3,'0'),bytes.subarray(offset,offset+block));}
writeFileSync('releases/SHA256SUMS',outputs.map(x=>x.sha256+'  '+x.filename).join('\n')+'\n');
console.log(JSON.stringify(outputs,null,2));
