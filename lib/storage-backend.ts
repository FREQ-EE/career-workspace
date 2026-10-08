import {createHash} from 'node:crypto';
import {readFile,writeFile,rename,mkdir,open,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {config} from './runtime.ts';

export class DataError extends Error {constructor(message:string,public status=503){super(message);}}
const sha=(bytes:Uint8Array)=>createHash('sha1').update(bytes).digest('hex');
function safe(path:string){if(!/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(path)||path.split('/').some(x=>x==='..'||x==='.')||path.includes('//'))throw new DataError('Invalid record path.',400);return path;}
function localPath(path:string){return resolve(config('DATA_DIRECTORY')||process.cwd(),safe(path));}
export function backend(){const value=config('DATA_BACKEND')||'local';if(!['local','github'].includes(value))throw new DataError('DATA_BACKEND must be local or github.');return value;}
export function repository(){const value=config('GITHUB_REPOSITORY')||'';if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value))throw new DataError('Set GITHUB_REPOSITORY to your private owner/repository.');return value;}
export function branch(){return config('GITHUB_BRANCH')||'main';}
export async function github(path:string,init:RequestInit={}){
 const token=config('GITHUB_TOKEN');if(!token)throw new DataError('Set GITHUB_TOKEN on the server, with access to your selected repository.');
 const response=await fetch(`https://api.github.com/repos/${repository()}/${path}`,{...init,cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Personal-Workspace','Content-Type':'application/json',...init.headers}});
 if(!response.ok){const messages:Record<number,string>={401:'GitHub rejected the credential. Renew it in server settings.',403:'GitHub denied access. Check Contents permissions, branch rules and rate limits.',404:'The configured repository, branch or record is unavailable.',409:'The record changed elsewhere. Refresh and review your edit.',422:'GitHub rejected this write. Refresh and review your edit.',429:'GitHub rate limit reached. Saving will retry.'};throw new DataError(messages[response.status]||'GitHub is temporarily unavailable. Pending changes are retained.',[409,422].includes(response.status)?409:503);}
 return response.json() as Promise<any>;
}
export async function head(){if(backend()==='local')return '';return (await github(`git/ref/heads/${encodeURIComponent(branch())}`)).object.sha as string;}
export async function readBytes(path:string,ref=branch()){
 safe(path);if(backend()==='local'){if(config('APP_RUNTIME')==='sites')throw new DataError('Sites requires DATA_BACKEND=github.');try{const bytes=new Uint8Array(await readFile(/* turbopackIgnore: true */ localPath(path)));return {bytes,sha:sha(bytes)};}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')throw new DataError(`Missing record: ${path}`,404);throw e;}}
 const data=await github(`contents/${path}?ref=${encodeURIComponent(ref)}`);if(data.encoding!=='base64')throw new DataError('This record exceeds the GitHub contents reader limit.');const bytes=Uint8Array.from(atob(data.content.replace(/\s/g,'')),c=>c.charCodeAt(0));return {bytes,sha:data.sha as string};
}
export async function readJSON<T=any>(path:string,ref?:string){const {bytes,sha}=await readBytes(path,ref);return {data:JSON.parse(new TextDecoder().decode(bytes)) as T,sha};}
export async function writeBytes(path:string,bytes:Uint8Array,expected:string|undefined,message:string){
 safe(path);if(backend()==='github'){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);const result=await github(`contents/${path}`,{method:'PUT',body:JSON.stringify({message,content:btoa(binary),branch:branch(),...(expected?{sha:expected}:{})})});return {sha:result.content.sha as string,commit:result.commit.sha as string};}
 // An exclusive filesystem lock serialises compare-and-swap across processes.
 const lock=localPath('data-lock');let handle;
 for(let n=0;n<50;n++){try{handle=await open(lock,'wx');break;}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;await new Promise(r=>setTimeout(r,20));}}
 if(!handle)throw new DataError('Local data is busy. Saving will retry.');
 const file=localPath(path),temp=file+'.'+crypto.randomUUID()+'.tmp';
 try{let current:string|undefined;try{current=sha(await readFile(/* turbopackIgnore: true */ file));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}if(current!==expected)throw new DataError('The record changed elsewhere. Refresh and review your edit.',409);await mkdir(dirname(file),{recursive:true});await writeFile(temp,bytes);await rename(temp,file);return {sha:sha(bytes),commit:''};}finally{await unlink(temp).catch(()=>{});await handle.close();await unlink(lock);}
}
export async function writeJSON(path:string,data:unknown,expected:string|undefined,message:string){return writeBytes(path,new TextEncoder().encode(JSON.stringify(data,null,2)+'\n'),expected,message);}
export function apiError(error:unknown){return Response.json({error:error instanceof Error?error.message:'The operation could not be completed.'},{status:error instanceof DataError?error.status:503,headers:{'Cache-Control':'private, no-store'}});}
export function sameOrigin(request:Request){
 try{const origin=request.headers.get('origin');if(!origin||!request.headers.get('content-type')?.startsWith('application/json'))return false;const expected=config('APP_ORIGIN');if(expected)return origin===new URL(expected).origin;const source=new URL(origin),target=new URL(request.url);return ['http:','https:'].includes(source.protocol)&&source.host===(request.headers.get('host')||target.host);}
 catch{return false;}
}
