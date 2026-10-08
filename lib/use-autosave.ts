"use client";
import {useEffect,useRef,useState} from 'react';
import {Autosave,type SaveState} from './autosave';
export function useAutosave<T>(initial:T,url:string,method='POST'){
 const [state,setState]=useState<SaveState<T>>({data:initial,dirty:false,saving:false,error:''});const queue=useRef<Autosave<T>|null>(null);
 function initialise(data:T,revision:string){
  if(queue.current){queue.current.refresh(data,revision);return;}
  queue.current=new Autosave(data,revision,async(edits,rev)=>{const body=JSON.stringify({edits,revision:rev});const response=await fetch(url,{method,signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json'},body,keepalive:new TextEncoder().encode(body).length<60000});const result=await response.json();if(!response.ok)throw new Error(result.error||'Automatic save failed.');return {data:result.data,revision:result.revision};},setState);
  setState({data,dirty:false,saving:false,error:''});
 }

 useEffect(()=>{const flush=()=>void queue.current?.flush();const hidden=()=>{if(document.visibilityState==='hidden')flush();};const closing=()=>{const q=queue.current;if(!q?.dirty)return;const body=JSON.stringify({edits:q.closingEdits(),revision:q.revision});if(new TextEncoder().encode(body).length<60000)void fetch(url,{method,headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});};window.addEventListener('online',flush);window.addEventListener('pagehide',closing);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('online',flush);window.removeEventListener('pagehide',closing);document.removeEventListener('visibilitychange',hidden);closing();queue.current?.dispose();};},[url,method]);
 return {...state,initialise,change:(fn:(data:T)=>T,immediate=false)=>queue.current?.change(fn,immediate),flush:()=>queue.current?.flush(),settled:()=>queue.current?.settled(),queue};
}
