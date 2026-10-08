import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as validators from '../lib/compiled-schemas.mjs';
test('distribution starts empty and has no inherited Site identity',()=>{
 if(process.env.ASSERT_EMPTY_STARTER!=='1')return;
 const manifest=JSON.parse(readFileSync('.openai/hosting.json','utf8'));assert.equal(manifest.project_id,undefined);
 if(existsSync('data/workspace.json')){const w=JSON.parse(readFileSync('data/workspace.json','utf8'));assert.deepEqual(w.opportunities,[]);assert.deepEqual(w.tasks,[]);assert.deepEqual(w.activity,[]);assert.equal(validators.workspace(w),true);const cv=JSON.parse(readFileSync('career/cv.json','utf8'));assert.equal(cv.name,'');assert.deepEqual(cv.experience,[]);assert.equal(validators.cv(cv),true);}
 else{const index=JSON.parse(readFileSync('recipes/index.json','utf8'));assert.deepEqual(index.recipes,[]);const pantry=JSON.parse(readFileSync('inventory/pantry/ingredients.json','utf8'));assert.deepEqual(pantry.items,[]);assert.equal(validators.pantry(pantry),true);}
});
