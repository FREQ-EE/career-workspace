import {backend,repository} from '@/lib/storage-backend';
import {readJSON,writeJSON,apiError,sameOrigin} from "@/lib/github";
import {saveEdits} from "@/lib/save-edits";
import {validateWorkspace} from "@/lib/model";
export const dynamic="force-dynamic";
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
// Protected by confirmed owner-only Sites policy. Token stays server-side.
export async function GET(){
 try{const [records,profile,content,cv,integrations]=await Promise.all([readJSON("data/workspace.json"),readJSON("data/profile.json"),readJSON("data/site-content.json"),readJSON("career/cv.json"),readJSON("config/integrations.json")]);if(!validateWorkspace(records.data))return response({error:"GitHub records failed validation; nothing was replaced."},503);return response({workspace:records.data,revision:records.sha,updatedAt:null,profile:profile.data,content:content.data,cv:cv.data,cvRevision:cv.sha,integrations:integrations.data,repositoryUrl:backend()==="github"?"https://github.com/"+repository():"",backend:backend()});}catch(e){return apiError(e);}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return response({error:"Invalid request origin."},403);
 try{const raw=await request.text();if(raw.length>1000000)return response({error:"Records are too large."},413);const {workspace,revision,edits}=JSON.parse(raw);if(edits)return response(await saveEdits("data/workspace.json",edits,validateWorkspace,"Career Workshop: autosave workspace changes"));if(!validateWorkspace(workspace)||typeof revision!=="string"||! /^[a-f0-9]{40}$/.test(revision))return response({error:"Invalid records."},400);const saved=await writeJSON("data/workspace.json",workspace,revision,"Career Workshop: save dashboard changes");return response({revision:saved.sha,commit:saved.commit,updatedAt:new Date().toISOString()});}catch(e){return apiError(e);}
}
