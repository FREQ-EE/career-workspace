import {PDFDocument,PDFFont,PDFPage,rgb} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
export type CVLanguage="en"|"de";
export async function renderCV(cv:any,language:CVLanguage,focus:string,photo:boolean,assets:{regular:Uint8Array;medium:Uint8Array;portrait?:Uint8Array},summary?:string){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const regular=await doc.embedFont(assets.regular,{subset:true}),medium=await doc.embedFont(assets.medium,{subset:true});
 const portrait=photo&&assets.portrait?await doc.embedJpg(assets.portrait):null;
 const W=595.28,H=841.89,M=36,R=559.28,rail=108,x=M+rail+12,width=R-x;
 let page:PDFPage,y:number;
 const ink=rgb(.09,.09,.09),light=rgb(.38,.38,.38);
 function newPage(){page=doc.addPage([W,H]);y=H-M;if(doc.getPageCount()>1){page.drawText(cv.name,{x:M,y:y-12,size:11,font:medium,color:ink});y-=40;}}
 function ensure(height:number){if(y-height<48)newPage();}
 function lines(text:string,font:PDFFont,size:number,max:number){
  const result:string[]=[];for(const paragraph of text.split("\n")){let line="";for(const word of paragraph.split(/\s+/)){const next=line?line+" "+word:word;if(font.widthOfTextAtSize(next,size)>max&&line){result.push(line);line=word;}else line=next;}result.push(line);}return result;
 }
 function text(t:string,tx:number,tw:number,font=regular,size=10,colour=ink){const ls=lines(t,font,size,tw);for(const l of ls){page.drawText(l,{x:tx,y:y-size,size,font,color:colour});y-=size*1.38;}return ls.length;}
 function section(en:string,de:string){ensure(55);y-=14;page.drawText(language==="de"?de:en,{x:M,y:y-11,size:11,font:medium,color:ink});y-=26;}
 function row(label:string,location:string,title:string,body:string[]){
  const titleLines=lines(title,medium,10,width);const bodyLines=body.flatMap(b=>lines(b,regular,10,width-11));const height=titleLines.length*14+bodyLines.length*14+body.length*3+12;
  ensure(Math.min(height,H-100));const top=y;
  const labs=lines(label.replace("present",language==="de"?"heute":"present"),medium,10,rail-18);let ly=y-10;for(const l of labs){page.drawText(l,{x:x-24-medium.widthOfTextAtSize(l,10),y:ly,size:10,font:medium,color:ink});ly-=14;}
  for(const l of lines(location,regular,9,rail-18)){page.drawText(l,{x:x-24-regular.widthOfTextAtSize(l,9),y:ly,size:9,font:regular,color:light});ly-=13;}
  text(title,x,width,medium);
  for(const b of body){y-=3;const ls=lines(b,regular,10,width-11);ensure(ls.length*14+3);page.drawCircle({x:x+2,y:y-6.5,size:1.65,color:ink});text(b,x+11,width-11);}
  page.drawLine({start:{x:x-12,y:top+2},end:{x:x-12,y:y-2},thickness:.5,color:rgb(.6,.6,.6)});y-=13;
 }
 newPage();
 page!.drawText(cv.name.toUpperCase(),{x:M,y:y!-30,size:Math.min(28,(portrait?W-M*2-110:W-M*2)/medium.widthOfTextAtSize(cv.name.toUpperCase(),1)),font:medium,color:ink});
 y!-=54;text(cv.headlines[language],M,portrait?W-M*2-110:W-M*2,medium,11);
 y!-=8;for(const contact of [cv.location,cv.email,cv.phone])text(contact,M,W-M*2-120,regular,10,light);
 if(portrait)page!.drawImage(portrait,{x:R-98.4,y:H-M-123,width:98.4,height:123});
 y=Math.min(y!,H-M-145);
 section("PROFILE","PROFIL");text(summary||cv.summaries[focus][language],M,W-M*2,regular,10);
 section("PROFESSIONAL EXPERIENCE","BERUFSERFAHRUNG");
 for(const r of cv.experience)row(r.dates,r.location,r.title[language]+" | "+r.company,r.bullets[language]);
 section("EDUCATION & TRAINING","AUSBILDUNG & WEITERBILDUNG");
 for(const e of cv.education)row(e.dates,e.organisation,e.title[language],[e.detail[language]]);
 section("SELECTED PROJECTS","AUSGEWÄHLTE PROJEKTE");
 const projects=[...cv.projects];
 for(const p of projects)row("","",p.name,[p.detail[language]]);
 section("SKILLS & LANGUAGES","KENNTNISSE & SPRACHEN");text(cv.skills[language].join(" · "),M,W-M*2);y-=8;text(cv.languages[language].join(" · "),M,W-M*2);
 const pages=doc.getPages();for(let i=0;i<pages.length;i++){pages[i].drawText(cv.name+" · "+(language==="de"?"Lebenslauf":"Curriculum Vitae"),{x:M,y:24,size:8,font:regular,color:light});const footer=language==="de"?`Seite ${i+1} von ${pages.length}`:`Page ${i+1} of ${pages.length}`;pages[i].drawText(footer,{x:R-regular.widthOfTextAtSize(footer,8),y:24,size:8,font:regular,color:light});}
 doc.setTitle(cv.name+" — "+(language==="de"?"Lebenslauf":"Curriculum Vitae"));doc.setAuthor(cv.name);doc.setSubject(cv.headlines[language]);doc.setKeywords(["Career Workshop",language,focus]);
 return doc.save();
}
