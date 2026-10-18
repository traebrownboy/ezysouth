// EzySouth STAGING ONLY: fictional test enquiry submission from publicly
// published preview pages. Never deploy to the production Supabase project.
// Anonymous endpoint with honeypot, origin checks and database-backed limits.
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
const PROJECT='https://anldjuaqlpowwodlphqf.supabase.co';
const HOST='staging-edge-hosted';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-client-info,apikey,authorization','Access-Control-Allow-Methods':'OPTIONS,POST','Cache-Control':'no-store','Vary':'Origin'};
function answer(data:object,status=200){return new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'}})}
function adminKey():string|undefined{
 const direct=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(direct)return direct;
 try{const x=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');return x.default||Object.values(x)[0] as string}
 catch{return undefined}
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function hash(input:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('')}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return answer({error:'Method not allowed.'},405);
 if(Deno.env.get('SUPABASE_URL')!==PROJECT)return answer({error:'Staging enquiry service not configured.'},503);
 if(Number(req.headers.get('content-length')||'0')>12000)return answer({error:'Form is too large.'},413);
 const origin=req.headers.get('origin');
 // Public pages are CSP-sandboxed and therefore send origin:null. Netlify
 // project origins are accepted for test builds; others cannot POST by browser.
 if(origin&&origin!=='null'&&origin!==PROJECT&&!/^https:\/\/(?:ezysouth-jobflow-test|deploy-preview-[0-9]+--ezysouth-jobflow-test)\.netlify\.app$/.test(origin))
  return answer({error:'Only staging preview websites can send test enquiries.'},403);
 const secret=adminKey();if(!secret)return answer({error:'Staging enquiry service unavailable.'},503);
 try{
  const raw=await req.text();if(raw.length>12000)return answer({error:'Form is too large.'},413);
  const body=JSON.parse(raw);
  const id=body?.website_id,name=typeof body?.customer_name==='string'?body.customer_name.trim():'',
    contact=typeof body?.customer_contact==='string'?body.customer_contact.trim():'',
    message=typeof body?.message==='string'?body.message.trim():'',
    honey=typeof body?.company_website==='string'?body.company_website.trim():'';
  if(honey)return answer({ok:true,message:'Thank you! Your test enquiry was sent.'});
  if(!UUID.test(id||'')||!name||name.length>120||contact.length<3||contact.length>200||message.length<5||message.length>3000)
   return answer({error:'Check the enquiry details and try again.'},400);
  const db=createClient(PROJECT,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const [siteResult,deployResult]=await Promise.all([
   db.from('websites').select('id,accepting_enquiries').eq('id',id).maybeSingle(),
   db.from('website_deployments').select('publish_status,netlify_site_id').eq('website_id',id).maybeSingle()
  ]);
  if(siteResult.error||deployResult.error)return answer({error:'Could not check test website.'},503);
  if(!siteResult.data?.accepting_enquiries || deployResult.data?.publish_status!=='live' || deployResult.data?.netlify_site_id!==HOST)
   return answer({error:'This test website is not accepting enquiries right now.'},409);
  const ip=(req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'unidentified').slice(0,100);
  const ua=(req.headers.get('user-agent')||'').slice(0,130);
  const clientHash=await hash(id+'|'+ip+'|'+ua);
  const tenMinutesAgo=new Date(Date.now()-10*60000).toISOString();
  const sinceYesterday=new Date(Date.now()-24*3600000).toISOString();
  await db.from('enquiry_rate_limits').delete().eq('website_id',id).eq('client_hash',clientHash).lt('created_at',sinceYesterday);
  const {count,error:countErr}=await db.from('enquiry_rate_limits').select('id',{count:'exact',head:true})
   .eq('website_id',id).eq('client_hash',clientHash).gte('created_at',tenMinutesAgo);
  if(countErr)return answer({error:'Enquiry rate limit unavailable.'},503);
  if((count||0)>=5)return answer({error:'Too many test enquiries. Try again in ten minutes.'},429);
  const {error:rateErr}=await db.from('enquiry_rate_limits').insert({website_id:id,client_hash:clientHash});
  if(rateErr)return answer({error:'Enquiry service unavailable.'},503);
  const {error:saveErr}=await db.from('enquiries').insert({website_id:id,customer_name:name,customer_contact:contact,message,status:'New'});
  if(saveErr){console.error('Staging enquiry insert:',saveErr.message);return answer({error:'Test enquiry could not be saved.'},503)}
  return answer({ok:true,message:'Test enquiry received. Check your JobFlow inbox.'},201);
 }catch(error){
  console.error('Staging enquiry request:',error instanceof Error?error.message:'unknown');
  return answer({error:'Enquiry could not be sent. Check the form and try again.'},400);
 }
});
