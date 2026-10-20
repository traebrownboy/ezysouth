// STAGING ONLY. Synthetic website enquiry injector.
// Never deploy this function to production EzySouth.
// Requires signed-in staging user JWT and verifies website ownership server-side.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const stagingOrigin = "https://anldjuaqlpowwodlphqf.supabase.co";
const corsBase = {
 "Access-Control-Allow-Methods": "POST, OPTIONS",
 "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
 "Vary":"Origin"
};
// Permit first-party staging and Netlify's HTTPS test domains.
// The browser still MUST supply a real user JWT; the server validates
// Supabase Auth and checks website ownership before any insert.
function allowedOrigin(origin: string | null): string | null {
 if (!origin) return null;
 try {
  const url = new URL(origin);
  if (url.origin !== origin || url.protocol !== "https:") return null;
  if (origin === stagingOrigin) return origin;
  if (/^[a-z0-9][a-z0-9-]*\.netlify\.app$/.test(url.hostname)) return origin;
 } catch { /* invalid URL */ }
 return null;
}
function secretKey():string|undefined {
 const direct=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(direct)return direct;
 const raw=Deno.env.get("SUPABASE_SECRET_KEYS");
 if(!raw)return undefined;
 try {
  const p=JSON.parse(raw);
  return (p?.default||Object.values(p||{})[0]) as string|undefined;
 }catch{return undefined;}
}
function uuid(input:unknown):input is string {
 return typeof input==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}
Deno.serve(async request=>{
 const callerOrigin=request.headers.get("Origin");
 const acceptedOrigin=allowedOrigin(callerOrigin);
 const cors={...corsBase,...(acceptedOrigin?{"Access-Control-Allow-Origin":acceptedOrigin}:{})};
 const reply=(payload:object,status=200)=>new Response(JSON.stringify(payload),{
   status,headers:{...cors,"Content-Type":"application/json; charset=utf-8",
   "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
 });
 if(callerOrigin&&!acceptedOrigin)return reply({error:"Only a valid staging origin may trigger a demo enquiry."},403);
 if(request.method==="OPTIONS")return new Response("ok",{status:200,headers:cors});
 if(request.method!=="POST")return reply({error:"Method not allowed"},405);
 if(Number(request.headers.get("content-length")||"0")>2000)return reply({error:"Request too large"},413);
 const token=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!token)return reply({error:"Sign into staging JobFlow first."},401);
 const serviceKey=secretKey();
 const projectUrl=Deno.env.get("SUPABASE_URL");
 if(!serviceKey||projectUrl!==stagingOrigin)return reply({error:"Staging test service not configured"},503);
 const db=createClient(projectUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 try {
  // Validate the JWT through Supabase Auth, not by trusting a client-supplied owner ID.
  const {data,error:userError}=await db.auth.getUser(token);
  if(userError||!data.user)return reply({error:"Invalid or expired session"},401);
  const body=await request.json().catch(()=>null);
  const websiteId=body?.website_id;
  if(!uuid(websiteId))return reply({error:"Choose a staging website first"},400);
  const {data:site,error:siteError}=await db.from("websites")
     .select("id,owner_id,accepting_enquiries")
     .eq("id",websiteId).maybeSingle();
  if(siteError)return reply({error:"Could not check test website"},503);
  if(!site||site.owner_id!==data.user.id)return reply({error:"You do not own this staging website"},403);
  if(!site.accepting_enquiries)return reply({error:"Enable JobFlow enquiries for this fake website in the Website Builder's Launch tab first."},409);
  // Keep free-tier usage predictable: up to five generated demo enquiries per hour/website.
  const oneHourAgo=new Date(Date.now()-3600000).toISOString();
  const {count,error:countError}=await db.from("enquiries").select("id",{head:true,count:"exact"})
    .eq("website_id",websiteId).gte("created_at",oneHourAgo);
  if(countError)return reply({error:"Could not check demo enquiry limit"},503);
  if((count||0)>=5)return reply({error:"Five demo enquiries per hour is the staging limit."},429);
  const fakeContact="fictional-"+crypto.randomUUID().slice(0,8)+"@example.invalid";
  const {data:enquiry,error:insertError}=await db.from("enquiries").insert({
   website_id:websiteId,
   customer_name:"Fictional Website Customer",
   customer_contact:fakeContact,
   message:"Demo enquiry from a simulated EzySouth website. Please quote for a fictional garden tidy-up. No real customer details.",
   status:"New"
  }).select("id").single();
  if(insertError)return reply({error:"Could not save test enquiry"},500);
  return reply({ok:true,id:enquiry.id,message:"Fictional enquiry received in the staging JobFlow inbox."},201);
 }catch(error){
  console.error("Demo enquiry error:",error instanceof Error?error.message:"unknown error");
  return reply({error:"Could not process synthetic test enquiry"},500);
 }
});
