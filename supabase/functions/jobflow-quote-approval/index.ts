// Customer quote decisions for isolated Ezysouth JobFlow staging.
// A random private document link acts as the customer's bearer credential.
// The service-side PostgreSQL function atomically validates and records each decision.
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const PROJECT_URL=Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ORIGIN="https://ezysouth-jobflow-test.netlify.app";
const service=createClient(PROJECT_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={
 "Access-Control-Allow-Origin":ORIGIN,
 "Access-Control-Allow-Methods":"POST,OPTIONS",
 "Access-Control-Allow-Headers":"content-type,apikey,authorization,x-client-info",
 "Cache-Control":"no-store,private",
 "X-Content-Type-Options":"nosniff",
 "Referrer-Policy":"no-referrer",
 "Vary":"Origin"
};
function result(payload,status=200){
 return new Response(JSON.stringify(payload),{status,headers:{...headers,"Content-Type":"application/json; charset=utf-8"}});
}
async function hash(token){
 const bytes=new TextEncoder().encode(token);
 const d=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(d)).map(v=>v.toString(16).padStart(2,"0")).join("");
}
async function load(hashValue){
 const {data,error}=await service.from("jobflow_document_deliveries")
 .select("id,document_id,owner_id,document_snapshot,status,revoked_at,expires_at,quote_response,quote_responded_at,quote_response_name")
 .eq("token_hash",hashValue).maybeSingle();
 if(error)throw error;
 if(!data||data.revoked_at||Date.parse(data.expires_at)<=Date.now()||!["prepared","sent"].includes(data.status)){
  return {error:"This private quote link has expired or been revoked.",code:"link_unavailable",status:410};
 }
 if(data.document_snapshot?.type!=="quote")return {error:"This is not a quote.",code:"not_quote",status:400};
 return {record:data};
}
function equalToSnapshot(d,s){
 const fields=["business_name","business_gst_number","customer_name","description","due_date","line_items",
   "discount_cents","subtotal_cents","gst_cents","amount_cents","gst_treatment"];
 return fields.every(key=>JSON.stringify(d[key]??null)===JSON.stringify(s[key]??null));
}
function nzDateString(){
 const parts=new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return values.year+'-'+values.month+'-'+values.day;
}
function humanReason(code){
 return {
  invalid_input:"Enter your name and choose Accept or Decline.",
  link_unavailable:"This private link is unavailable. Please request a new link from the business.",
  not_quote:"Only quotes can be accepted or declined.",
  quote_unavailable:"The quote is no longer available.",
  quote_changed:"This quote has changed since the link was created. Ask the business for an updated link.",
  quote_expired:"This quote is past its valid-until date. Ask for a new quote.",
  quote_not_ready:"This quote is not ready for customer approval.",
  quote_already_closed:"This quote has already been accepted, declined or closed. Contact the business if you need help."
 }[code]||"The response could not be recorded. Please try again.";
}
Deno.serve(async request=>{
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(request.method!=="POST")return result({error:"Unsupported request"},405);
 if(request.headers.get("origin")!==ORIGIN)return result({error:"Origin not allowed"},403);
 if(!PROJECT_URL||!SERVICE_KEY)return result({error:"Approval service is unavailable."},503);
 let payload;
 try{payload=await request.json()}catch{return result({error:"Invalid request."},400)}
 const token=String(payload?.token||"");
 if(!/^[0-9a-f]{64}$/.test(token))return result({error:"Invalid private quote link."},400);
 const action=String(payload?.action||"");
 if(action!=="state"&&action!=="respond")return result({error:"Unsupported action."},400);
 try{
  const tokenHash=await hash(token);
  if(action==="state"){
   const lookup=await load(tokenHash);
   if(lookup.error)return result({error:lookup.error,code:lookup.code},lookup.status);
   const delivery=lookup.record;
   const {data:d,error}=await service.from("jobflow_documents")
    .select("id,document_type,status,business_name,business_gst_number,customer_name,description,due_date,line_items,discount_cents,subtotal_cents,gst_cents,amount_cents,gst_treatment")
    .eq("id",delivery.document_id).eq("owner_id",delivery.owner_id).maybeSingle();
   if(error)throw error;
   if(!d||d.document_type!=="quote")return result({error:"Quote unavailable.",code:"quote_unavailable"},410);
   let reason=null;
   if(!delivery.quote_response){
    if(!equalToSnapshot(d,delivery.document_snapshot))reason="quote_changed";
    else if(d.due_date&&d.due_date<nzDateString())reason="quote_expired";
    else if(!["Draft","Sent"].includes(d.status))reason="quote_already_closed";
    else if(!Number.isFinite(Number(d.amount_cents))||Number(d.amount_cents)<=0)reason="quote_not_ready";
   }
   return result({
    canRespond:!reason&&!delivery.quote_response,
    quoteStatus:d.status,
    response:delivery.quote_response||null,
    respondedAt:delivery.quote_responded_at||null,
    responseName:delivery.quote_response_name||null,
    reason:reason?humanReason(reason):null
   });
  }
  const decision=String(payload.decision||"");
  const name=String(payload.name||"").trim();
  if(!["Accepted","Declined"].includes(decision)||name.length<2||name.length>120)
   return result({error:"Enter your name and choose Accept or Decline."},422);
  // The service-role-only RPC checks current terms, expiry and revocation under row locks.
  const {data,error}=await service.rpc("jobflow_record_quote_decision",{
    p_token_hash:tokenHash,p_decision:decision,p_customer_name:name
  });
  if(error)throw error;
  if(!data?.ok)return result({error:humanReason(data?.code),code:data?.code||"unavailable"},409);
  return result({
    status:data.result,
    respondedAt:data.responded_at,
    responseName:data.response_name,
    alreadyRecorded:!!data.already_recorded
  });
 }catch(err){
  console.error("Quote approval failure",err instanceof Error?err.name:"unknown");
  return result({error:"Could not record this decision. Please try again."},500);
 }
});