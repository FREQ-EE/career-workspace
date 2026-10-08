import {readFileSync,existsSync} from 'node:fs';
import * as validators from '../lib/compiled-schemas.mjs';
const mapping=JSON.parse(readFileSync('config/record-schemas.json','utf8'));
function check(path,schema){if(!existsSync(path))throw Error('Missing '+path);const data=JSON.parse(readFileSync(path,'utf8'));const validate=validators[schema.replaceAll('-','_')];if(!validate(data))throw Error(path+': '+JSON.stringify(validate.errors));return data;}
for(const [path,schema] of Object.entries(mapping))check(path,schema);
if(existsSync('manifest-index.json')){
 const manifest=check('manifest-index.json','manifest-index'),index=check('recipes/index.json','recipe-index'),keys=new Set();
 for(const c of manifest.collections){for(const p of check(c.path,'pantry').items){const key=c.id+':'+p.id;if(keys.has(key))throw Error('Duplicate pantry ID');keys.add(key);}}
 const ids=new Set(index.recipes.map(r=>r.id));if(ids.size!==index.recipes.length)throw Error('Duplicate recipe ID');
 for(const row of index.recipes){const recipe=check(row.path,'recipe');if(recipe.id!==row.id)throw Error('Recipe index ID mismatch');for(const i of [...recipe.ingredients,...(recipe.variants||[]).flatMap(v=>v.overrides||[])]){if(i.ref&&!keys.has(i.ref))throw Error('Unknown pantry reference '+i.ref);if(i.recipe&&!ids.has(i.recipe))throw Error('Unknown preparation reference '+i.recipe);}for(const id of recipe.related||[])if(!ids.has(id))throw Error('Unknown related recipe '+id);}
 for(const id of Object.keys(check('recipes/annotations.json','annotations').recipes))if(!ids.has(id))throw Error('Unknown annotation recipe '+id);
}
console.log('Schemas and record references passed.');
