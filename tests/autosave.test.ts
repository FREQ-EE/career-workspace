import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Autosave,applyChanges,changes} from '../lib/autosave.ts';
const initial=()=>({schemaVersion:1,opportunities:[{id:'role',stage:'Inbox',notes:'',fit:'Original assessment',history:[]}],tasks:[],activity:[]});
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
test('shortlist persists immediately and repeated delivery is idempotent',async()=>{
 let remote=initial(),writes=0;const q=new Autosave(remote,'one',async edits=>{remote=applyChanges(remote,edits);writes++;return {data:remote,revision:'two'};},()=>{});
 q.change(w=>{w.opportunities[0].stage='Shortlisted';return w;},true);await q.settled();assert.equal(writes,1);assert.equal(remote.opportunities[0].stage,'Shortlisted');assert.equal(q.dirty,false);assert.deepEqual(applyChanges(remote,changes(initial(),remote)),remote);q.dispose();
});
test('debounced text can flush on blur and changes made during a save are queued',async()=>{
 let remote=initial();let release!:()=>void;const gate=new Promise<void>(r=>release=r);let writes=0;const q=new Autosave(remote,'one',async edits=>{if(writes++===0)await gate;remote=applyChanges(remote,edits);return {data:remote,revision:String(writes)};},()=>{});
 q.change(w=>{w.opportunities[0].notes='first';return w;});assert.equal(writes,0);const pending=q.flush();q.change(w=>{w.opportunities[0].notes='second';return w;});release();await pending;await q.settled();assert.equal(remote.opportunities[0].notes,'second');assert.equal(writes,2);q.dispose();
});
test('autosave preserves new discovery records and unrelated employer updates',async()=>{
 const before=initial(),ours=initial(),latest=initial();ours.opportunities[0].notes='Our note';latest.opportunities[0].fit='New assessment';latest.opportunities.push({id:'discovered',stage:'Inbox',notes:'',fit:'New role',history:[]});const merged=applyChanges(latest,changes(before,ours));assert.equal(merged.opportunities.length,2);assert.equal(merged.opportunities[0].fit,'New assessment');assert.equal(merged.opportunities[0].notes,'Our note');
});
test('same-field conflicts never silently overwrite another session',()=>{
 const ours=initial(),latest=initial();ours.opportunities[0].notes='Our note';latest.opportunities[0].notes='Other note';assert.throws(()=>applyChanges(latest,changes(initial(),ours)),/field changed/);
});
test('failed save retains edits and retries automatically',async()=>{
 let remote=initial(),attempts=0;const q=new Autosave(remote,'one',async edits=>{if(++attempts===1)throw new Error('Offline');remote=applyChanges(remote,edits);return {data:remote,revision:'two'};},()=>{});q.change(w=>{w.opportunities[0].notes='Retained';return w;});await q.flush();assert.equal(q.dirty,true);assert.equal(q.error,'Offline');await new Promise(r=>setTimeout(r,1100));assert.equal(remote.opportunities[0].notes,'Retained');assert.equal(q.dirty,false);q.dispose();
});
test('automatic refresh merges pending notes and exposes new discovery',async()=>{
 const q=new Autosave(initial(),'one',async edits=>({data:applyChanges(latest,edits),revision:'three'}),()=>{});q.change(w=>{w.opportunities[0].notes='Pending';return w;});const latest=initial();latest.opportunities[0].fit='Updated';q.refresh(latest,'two');await q.settled();assert.equal(q.data.opportunities[0].notes,'Pending');assert.equal(q.data.opportunities[0].fit,'Updated');q.dispose();
});
test('closing the tab during a save carries the latest text in either request order',async()=>{
 let remote=initial();let release!:()=>void;const gate=new Promise<void>(r=>release=r);const q=new Autosave(initial(),'one',async edits=>{await gate;remote=applyChanges(remote,edits);return {data:remote,revision:'two'};},()=>{});q.change(w=>{w.opportunities[0].notes='first';return w;},true);q.change(w=>{w.opportunities[0].notes='final';return w;});const closing=q.closingEdits();const first=initial();first.opportunities[0].notes='first';assert.equal(applyChanges(first,closing).opportunities[0].notes,'final');const closed=applyChanges(initial(),closing);assert.equal(closed.opportunities[0].notes,'final');assert.throws(()=>applyChanges(closed,changes(initial(),first)),/field changed/);release();await q.settled();q.dispose();
});
test('deleted fields, added tasks and import removals are applied safely',()=>{
 const a={tasks:[{id:'old',title:'Old'}],verification:{url:'old'}};const b={tasks:[{id:'new',title:'New'}]};assert.deepEqual(applyChanges(a,changes(a,b)),b);assert.throws(()=>applyChanges({},[{path:['__proto__','x'],value:'bad'}]),/Invalid/);
});
test('typing coalesces into one automatic save after the pause',async()=>{
 let remote=initial(),writes=0;const q=new Autosave(remote,'one',async edits=>{writes++;remote=applyChanges(remote,edits);return {data:remote,revision:'two'};},()=>{});q.change(w=>{w.opportunities[0].notes='a';return w;});q.change(w=>{w.opportunities[0].notes='complete';return w;});await new Promise(r=>setTimeout(r,750));assert.equal(writes,1);assert.equal(remote.opportunities[0].notes,'complete');q.dispose();
});
test('an explicit conflict choice can preserve our edits without losing other fields',async()=>{
 let remote=initial();remote.opportunities[0].notes='Other note';remote.opportunities[0].fit='New assessment';const q=new Autosave(initial(),'one',async edits=>{remote=applyChanges(remote,edits);return {data:remote,revision:'three'};},()=>{});q.change(w=>{w.opportunities[0].notes='Our note';return w;});await q.flush();assert.match(q.error,/field changed/);q.resolve(remote,'two',true);await q.settled();assert.equal(remote.opportunities[0].notes,'Our note');assert.equal(remote.opportunities[0].fit,'New assessment');q.dispose();
});

test('refresh clears a failed response when GitHub already contains the saved edit',async()=>{
 const latest=initial();const q=new Autosave(initial(),'one',async()=>{throw new Error('Response lost');},()=>{});q.change(w=>{w.opportunities[0].notes='Saved remotely';return w;});await q.flush();latest.opportunities[0].notes='Saved remotely';q.refresh(latest,'two');assert.equal(q.dirty,false);assert.equal(q.error,'');q.dispose();
});
