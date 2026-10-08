export const stages = ["Inbox","Shortlisted","Preparing","Applied","Interview","Offer","Closed","Dismissed"] as const;
export type Stage = typeof stages[number];
export const listingStatuses = ["Live","Unavailable","Unverified"] as const;
export type Opportunity = { id:string; company:string; companySummary?:string; companySource?:string; companyCheckedOn?:string; listingStatus?:typeof listingStatuses[number]; verification?:{checkedAt:string;url:string;method:string;evidence:string}; title:string; location:string; salary:string; language:string; source:string; retrievedOn:string; sourceStatus:string; assessment:string; family:string; fit:string; gaps:string; summary:string; stage:Stage; notes:string; nextAction:string; due:string; history:{at:string;stage:string}[] };
export function setOpportunityStage(o:Opportunity,stage:Stage,at:string){
 if(o.stage===stage)return false;
 o.stage=stage;o.history.push({at,stage});return true;
}
export type Task = {id:string;title:string;detail:string;due:string;done:boolean;opportunityId:string};
export type Workspace = {schemaVersion:1;opportunities:Opportunity[];tasks:Task[];activity:{id:string;text:string;at:string;kind:string}[]};
export function validateWorkspace(value:unknown): value is Workspace {
 if(!value || typeof value!=="object") return false;
 const w=value as Workspace;
 const date=(s:unknown)=>typeof s==="string" && (s==="" || (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s));
 const str=(s:unknown,max=20000)=>typeof s==="string" && s.length<=max;
 const unique=(xs:{id:string}[])=>new Set(xs.map(x=>x.id)).size===xs.length;
 if(w.schemaVersion!==1 || !Array.isArray(w.opportunities)||w.opportunities.length>500||!Array.isArray(w.tasks)||w.tasks.length>1000||!Array.isArray(w.activity)||w.activity.length>1000) return false;
 if(!w.opportunities.every(o=>o && ["id","company","title","location","salary","language","source","retrievedOn","sourceStatus","assessment","family","fit","gaps","summary","notes","nextAction"].every(k=>str(o[k as keyof Opportunity])) && !!o.id && !!o.company && !!o.title && stages.includes(o.stage) && date(o.due) && date(o.retrievedOn) && (!o.source || /^https?:\/\//i.test(o.source)) && Array.isArray(o.history) && o.history.length<=200 && o.history.every(h=>str(h.at,100)&&str(h.stage,100))))return false;
 if(!w.opportunities.every(o=>(o.companySummary===undefined||str(o.companySummary))&&(o.companySource===undefined||(str(o.companySource)&&(!o.companySource||/^https?:\/\//i.test(o.companySource))))&&(o.companyCheckedOn===undefined||date(o.companyCheckedOn))&&(o.listingStatus===undefined||listingStatuses.includes(o.listingStatus))&&(o.verification===undefined||(o.verification&&str(o.verification.checkedAt,100)&&!Number.isNaN(Date.parse(o.verification.checkedAt))&&str(o.verification.url)&&/^https?:\/\//i.test(o.verification.url)&&str(o.verification.method,200)&&str(o.verification.evidence)))))return false;
 if(!w.tasks.every(t=>t && str(t.id)&&!!t.id&&str(t.title)&&str(t.detail)&&str(t.opportunityId)&&date(t.due)&&typeof t.done==="boolean")) return false;
 if(!w.activity.every(a=>a&&str(a.id)&&str(a.text)&&str(a.at,100)&&str(a.kind,100)))return false;
 return unique(w.opportunities)&&unique(w.tasks)&&unique(w.activity);
}
