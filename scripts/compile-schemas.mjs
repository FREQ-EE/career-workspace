import Ajv from 'ajv/dist/2020.js';
import formats from 'ajv-formats';
import standalone from 'ajv/dist/standalone/index.js';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
const ajv=new Ajv({code:{source:true,esm:true},allErrors:true,strict:false});formats(ajv);
const exports={};
for(const file of readdirSync('schemas').filter(f=>f.endsWith('.schema.json'))){const key=file.split('.')[0].replaceAll('-','_');ajv.addSchema(JSON.parse(readFileSync('schemas/'+file,'utf8')),key);exports[key]=key;}
let code=standalone(ajv,exports);const imports=[];
code=code.replace(/require\("([^"\n]+)"\)/g,(_,name)=>{const key='_runtime'+imports.length;imports.push(`import * as ${key} from '${name}.js';`);return key;});
code=code.replace(/(_runtime\d+)\.default/g,'($1.default?.default ?? $1.default)');
writeFileSync('lib/compiled-schemas.mjs',imports.join('\n')+'\n'+code);

