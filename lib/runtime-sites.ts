import {env} from 'cloudflare:workers';
export function config(key:string):string|undefined{return (env as unknown as Record<string,string>)[key];}
