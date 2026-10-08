import {NextRequest,NextResponse} from 'next/server';
import {config as setting} from './lib/runtime';
import {timingSafeEqual} from 'node:crypto';
export function proxy(request:NextRequest){
 const runtime=setting('APP_RUNTIME')||'local';
 if(runtime==='sites')return NextResponse.next(); // Only deploy with owner-private Sites access.
 const password=setting('APP_PASSWORD');
 if(password){let supplied='';try{const header=request.headers.get('authorization')||'';if(header.startsWith('Basic ')){const decoded=atob(header.slice(6));supplied=decoded.slice(decoded.indexOf(':')+1);}}catch{}const a=Buffer.from(password),b=Buffer.from(supplied);if(a.length===b.length&&timingSafeEqual(a,b))return NextResponse.next();return new NextResponse('Authentication required',{status:401,headers:{'WWW-Authenticate':'Basic realm="Private workspace"','Cache-Control':'no-store'}});}
 const hostname=new URL(request.url).hostname;
 if(runtime!=='local'||!['localhost','127.0.0.1','[::1]','::1'].includes(hostname))return new NextResponse('Configure APP_PASSWORD before exposing this application beyond loopback.',{status:403});
 return NextResponse.next();
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.svg).*)']};
