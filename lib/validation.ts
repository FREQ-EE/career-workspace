import * as validators from './compiled-schemas.mjs';
import mapping from '../config/record-schemas.json';
import {DataError} from './storage-backend';
export function schemaFor(path:string){return (mapping as Record<string,string>)[path]||(path.match(/^inventory\/pantry\/[a-z0-9-]+\.json$/)?'pantry':path.match(/^recipes\/records\/[a-z0-9-]+\.json$/)?'recipe':'');}
export function validateRecord(path:string,value:unknown){const name=schemaFor(path).replaceAll('-','_');const fn=(validators as unknown as Record<string,((value:unknown)=>boolean)&{errors?:unknown}>)[name];if(!fn||!fn(value))throw new DataError('Record does not match '+name+' schema. '+(fn?JSON.stringify(fn.errors):'Path is not editable.'),400);}
