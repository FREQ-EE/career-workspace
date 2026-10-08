import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readJSON,readBytes,writeJSON,writeBytes,apiError,sameOrigin} from "@/lib/github";
import {saveEdits} from "@/lib/save-edits";
import {renderCV} from "@/lib/cv-pdf";
export const dynamic="force-dynamic";
const privateHeaders={"Cache-Control":"private, no-store"};
export async function GET(request:Request){
 try{const asset=new URL(request.url).searchParams.get("asset");if(!asset){const current=await readJSON("career/cv.json");return Response.json({cv:current.data,revision:current.sha},{headers:privateHeaders});}const files:Record<string,{path:string;type:string}>={portrait:{path:"portrait.jpg",type:"image/jpeg"},regular:{path:"Raleway-Regular.ttf",type:"font/ttf"},medium:{path:"Raleway-Medium.ttf",type:"font/ttf"}};const selected=asset?files[asset]:undefined;if(!selected)return Response.json({error:"Unknown CV asset."},{status:400});const file=await readBytes("assets/cv/"+selected.path);return new Response(file.bytes as BodyInit,{headers:{...privateHeaders,"Content-Type":selected.type}});}catch(e){return apiError(e);}
}
export async function PUT(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request origin."},{status:403});
 try{const raw=await request.text();if(raw.length>150000)return Response.json({error:"CV data is too large."},{status:413});const {cv,revision,edits}=JSON.parse(raw);if(edits)return Response.json(await saveEdits("career/cv.json",edits,(v:any)=>v&&v.schemaVersion===1&&typeof v.name==="string"&&Array.isArray(v.experience)&&Array.isArray(v.education)&&Array.isArray(v.projects)&&typeof v.summaries?.operations?.en==="string"&&typeof v.summaries?.operations?.de==="string","Career Workshop: autosave bilingual CV"),{headers:privateHeaders});if(!cv||cv.schemaVersion!==1||typeof revision!=="string"||! /^[a-f0-9]{40}$/.test(revision)||typeof cv.name!=="string"||!Array.isArray(cv.experience)||!Array.isArray(cv.education)||!Array.isArray(cv.projects)||typeof cv.summaries?.operations?.en!=="string"||typeof cv.summaries?.operations?.de!=="string")return Response.json({error:"Invalid bilingual CV data."},{status:400});const result=await writeJSON("career/cv.json",cv,revision,"Career Workshop: update bilingual CV");return Response.json({revision:result.sha},{headers:privateHeaders});}catch(e){return apiError(e);}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:"Invalid request origin."},{status:403});
 try{const raw=await request.text();if(raw.length>5000)return Response.json({error:"Request is too large."},{status:413});const {language,focus,photo,opportunityId,summary}=JSON.parse(raw);if(!["en","de"].includes(language)||!["operations","implementation","ai-enablement"].includes(focus)||typeof photo!=="boolean"||(summary!==undefined&&(typeof summary!=="string"||summary.length>2000)))return Response.json({error:"Invalid CV options."},{status:400});
 const [{data:cv,sha},regular,medium,portrait]=await Promise.all([readJSON("career/cv.json"),readBytes("assets/cv/Raleway-Regular.ttf"),readBytes("assets/cv/Raleway-Medium.ttf"),photo?readBytes("assets/cv/portrait.jpg"):Promise.resolve(null)]);
 if(!cv.name.trim()||!(summary||cv.summaries[focus][language]).trim())return Response.json({error:"Complete your name and profile before generating a CV."},{status:400});
 const pdf=await renderCV(cv,language,focus,photo,{regular:regular.bytes,medium:medium.bytes,portrait:portrait?.bytes},summary);
 const id=new Date().toISOString().replace(/[:.]/g,"-")+"-"+crypto.randomUUID().slice(0,8);
 const base="applications/generated/"+id;
 await writeJSON(base+"/snapshot.json",{schemaVersion:1,createdAt:new Date().toISOString(),language,focus,photo,opportunityId:typeof opportunityId==="string"?opportunityId:"",cvSourceSha:sha,cv,summary:summary||cv.summaries[focus][language],reviewStatus:"Owner review required before sending"},undefined,"Career Workshop: record CV generation snapshot");
 await writeBytes(base+"/cv-"+language+".pdf",pdf,undefined,"Career Workshop: save generated "+language+" CV");
 return new Response(pdf as BodyInit,{headers:{...privateHeaders,"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="'+cv.name.replace(/[^a-zA-Z0-9-]+/g,"-")+'-CV-'+language+'.pdf"',"X-Career-Document":base+"/cv-"+language+".pdf"}});
 }catch(e){return apiError(e);}
}
