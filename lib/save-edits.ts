import {applyChanges,type Edit} from './autosave.ts';
import {readJSON,writeJSON,GitHubError} from './github';
export async function saveEdits<T>(path:string,edits:Edit[],validate:(data:unknown)=>boolean,message:string){
 if(!Array.isArray(edits)||edits.length>10000)throw new GitHubError('Invalid automatic save.',400);
 for(let attempt=0;attempt<4;attempt++){
  const latest=await readJSON<T>(path);let data:T;
  try{data=applyChanges(latest.data,edits);}catch(e){throw new GitHubError(e instanceof Error?e.message:'Conflicting edit.',409);}
  if(!validate(data))throw new GitHubError('Edited records failed validation.',400);
  if(JSON.stringify(data)===JSON.stringify(latest.data))return {data,revision:latest.sha,updatedAt:new Date().toISOString()};
  try{const saved=await writeJSON(path,data,latest.sha,message);return {data,revision:saved.sha,updatedAt:new Date().toISOString(),commit:saved.commit};}catch(e){if(!(e instanceof GitHubError)||e.status!==409||attempt===3)throw e;}
 }
 throw new GitHubError('GitHub is busy; automatic save will retry.',503);
}
