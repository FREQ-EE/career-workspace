// Small field patches let autosave merge unrelated GitHub changes safely.
export type Edit = {path:string[]; before?:unknown; value?:unknown; remove?:boolean; alternatives?:unknown[]};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const object=(v:any)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keyed=(v:any)=>Array.isArray(v)&&v.every((x:any)=>object(x)&&typeof x.id==='string');
export function changes(before:any,after:any,path:string[]=[]):Edit[]{
 if(same(before,after))return [];
 if(object(before)&&object(after))return [...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(k=>changes(before[k],after[k],[...path,k]));
 if(keyed(before)&&keyed(after))return [...new Set([...before,...after].map(x=>x.id))].flatMap(id=>changes(before.find((x:any)=>x.id===id),after.find((x:any)=>x.id===id),[...path,'@'+id]));
 return [{path,before,...(after===undefined?{remove:true}:{value:after})}];
}
function location(root:any,path:string[]){let parent=root;for(const key of path.slice(0,-1)){parent=key.startsWith('@')&&Array.isArray(parent)?parent.find((x:any)=>x.id===key.slice(1)):parent?.[key];if(parent===undefined)throw new Error('The edited record has been removed.');}const last=path.at(-1)!;const key=last.startsWith('@')&&Array.isArray(parent)?parent.findIndex((x:any)=>x.id===last.slice(1)):last;return {parent,key,current:typeof key==='number'&&key<0?undefined:parent?.[key]};}
export function valueAt(root:any,path:string[]){return location(root,path).current;}
export function applyChanges<T>(root:T,edits:Edit[],check=true):T{
 const result=structuredClone(root);
 for(const edit of edits){if(!Array.isArray(edit.path)||!edit.path.length||edit.path.some(k=>typeof k!=='string'||['__proto__','constructor','prototype'].includes(k)))throw new Error('Invalid edit path.');const {parent,key,current}=location(result,edit.path);if(!parent)throw new Error('The edited record has been removed.');if(check&&!same(current,edit.before)&&!same(current,edit.value)&&!(edit.alternatives||[]).some(v=>same(current,v)))throw new Error('This field changed in another session: '+edit.path.join(' / '));if(typeof key==='number'){if(edit.remove){if(key>=0)parent.splice(key,1);}else if(key<0)parent.unshift(structuredClone(edit.value));else parent[key]=structuredClone(edit.value);}else if(edit.remove)delete parent[key];else parent[key]=structuredClone(edit.value);}
 return result;
}
export type SaveState<T>={data:T;dirty:boolean;saving:boolean;error:string};
export class Autosave<T>{
 base:T;data:T;revision:string;private running=false;private inFlight:T|null=null;private timer:ReturnType<typeof setTimeout>|undefined;private retry=1000;error='';
 constructor(data:T,revision:string,private send:(edits:Edit[],revision:string)=>Promise<{data:T;revision:string}>,private notify:(state:SaveState<T>)=>void){this.base=structuredClone(data);this.data=structuredClone(data);this.revision=revision;}
 get dirty(){return !same(this.base,this.data);}
 private emit(){this.notify({data:this.data,dirty:this.dirty,saving:this.running,error:this.error});}
 change(fn:(data:T)=>T,immediate=false){this.data=fn(structuredClone(this.data));this.error='';this.emit();clearTimeout(this.timer);if(immediate)void this.flush();else this.timer=setTimeout(()=>void this.flush(),650);}
 async flush():Promise<void>{clearTimeout(this.timer);if(this.running||!this.dirty)return;this.running=true;this.inFlight=structuredClone(this.data);const saving=this.inFlight;this.emit();try{const saved=await this.send(changes(this.base,saving),this.revision);const newer=changes(saving,this.data);this.base=structuredClone(saved.data);this.data=applyChanges(saved.data,newer,false);this.revision=saved.revision;this.error='';this.retry=1000;}catch(e){this.error=e instanceof Error?e.message:'Automatic save failed.';}finally{this.running=false;this.inFlight=null;this.emit();}if(this.dirty){this.timer=setTimeout(()=>void this.flush(),this.error?this.retry:0);if(this.error)this.retry=Math.min(this.retry*2,30000);}}
 resolve(data:T,revision:string,keepLocal:boolean){if(this.running)return;const edits=changes(this.base,this.data);this.data=keepLocal?applyChanges(data,edits,false):structuredClone(data);this.base=structuredClone(data);this.revision=revision;this.error="";this.emit();if(this.dirty)void this.flush();}
 refresh(data:T,revision:string){if(this.running)return;try{this.data=applyChanges(data,changes(this.base,this.data));this.base=structuredClone(data);this.revision=revision;this.error="";this.emit();if(this.dirty)void this.flush();}catch(e){this.error=e instanceof Error?e.message:'Refresh conflict';this.emit();}}
 closingEdits(){return changes(this.base,this.data).map(edit=>({...edit,...(this.inFlight?{alternatives:[valueAt(this.inFlight,edit.path)]}:{})}));}
 async settled(){void this.flush();const started=Date.now();while(this.dirty||this.running){if(this.error)throw new Error(this.error);if(Date.now()-started>20000)throw new Error("Automatic save is still running. Please try generating again shortly.");await new Promise(resolve=>setTimeout(resolve,25));}}
 dispose(){clearTimeout(this.timer);}
}
