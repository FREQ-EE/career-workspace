import vinext from 'vinext';
import {defineConfig} from 'vite';
import {sites} from './build/sites-vite-plugin';
import {fileURLToPath} from 'node:url';
export default defineConfig(async()=>{
 process.env.CLOUDFLARE_CF_FETCH_ENABLED??='false';process.env.WRANGLER_SEND_METRICS??='false';
 const {cloudflare}=await import('@cloudflare/vite-plugin');
 return {resolve:{alias:[{find:/^(?:@\/lib\/runtime|\.\/runtime(?:\.ts)?)$/,replacement:fileURLToPath(new URL('./lib/runtime-sites.ts',import.meta.url))}]},plugins:[vinext(),sites({mockAuth:false}),cloudflare({viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false,config:{main:'vinext/server/fetch-handler',compatibility_flags:['nodejs_compat'],compatibility_date:'2026-10-01'}})]};
});
