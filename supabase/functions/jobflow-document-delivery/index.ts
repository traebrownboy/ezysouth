// Ezysouth JobFlow staging only: secure document links and optional Resend delivery.
// Requires RESEND_API_KEY and JOBFLOW_FROM_EMAIL secrets for direct email sending.
// Do not deploy to the primary production project without security review.
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const SUPABASE_PROJECT_URL = Deno.env.get("SUPABASE_URL") || "";
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SENDER = Deno.env.get("JOBFLOW_FROM_EMAIL") || "";
const ORIGIN = "https://ezysouth-jobflow-test.netlify.app";
const VIEW_BASE = ORIGIN + "/jobflow-view.html";
const emailReady = Boolean(API_KEY && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(SENDER));
const service = createClient(SUPABASE_PROJECT_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(SUPABASE_PROJECT_URL, PUBLIC_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const e = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const usd = (n) => new Intl.NumberFormat("en-NZ", {style:"currency", currency:"NZD"}).format(Number(n||0)/100);
const iso = () => new Date().toISOString();
function headers(req) {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin === ORIGIN ? ORIGIN : ORIGIN,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  };
}
function json(req, payload, status=200) { return new Response(JSON.stringify(payload), {status, headers:{...headers(req),"Content-Type":"application/json; charset=utf-8"}}) }
async function hash(t) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
}
function token() { return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,"0")).join("") }
function snapshot(d, recipient, mode) {
  const items = Array.isArray(d.line_items) ? d.line_items.slice(0,100).map(x=>({
    description:String(x.description||"").slice(0,160), quantity:Number(x.quantity||0),
    unit_price_cents:Number(x.unit_price_cents||0)
  })) : [];
  return {
    number:d.number, type:d.document_type, business_name:d.business_name,
    business_gst_number:d.business_gst_number||"", customer_name:d.customer_name,
    customer_email:recipient || d.customer_email || "", description:d.description, due_date:d.due_date,
    created_at:d.created_at, line_items:items, discount_cents:Number(d.discount_cents||0),
    subtotal_cents:d.subtotal_cents==null?null:Number(d.subtotal_cents),
    gst_cents:d.gst_cents==null?null:Number(d.gst_cents),
    amount_cents:Number(d.amount_cents), gst_treatment:d.gst_treatment,
    status: mode==="send"?(d.document_type==="quote"?"Sent":"Unpaid"):d.status
  };
}
function emailHtml(doc, link) {
  const quote=doc.type==="quote", subject=quote?"quote":"invoice";
  return '<!doctype html><html><body style="margin:0;background:#f5f8f5;padding:34px 12px;font-family:Arial,sans-serif;color:#17372a">'+
  '<main style="max-width:560px;margin:auto;background:white;border:1px solid #e1e9e2;border-radius:16px;overflow:hidden">'+
  '<div style="background:#102a25;color:#fff;padding:24px 30px"><strong style="font-size:20px">JobFlow</strong><span style="color:#9bddb8"> by Ezysouth</span></div>'+
  '<div style="padding:32px 30px"><p style="font-size:14px;color:#688071">Hello '+e(doc.customer_name)+',</p>'+
  '<h1 style="font-size:24px;line-height:1.25">Your '+subject+' from '+e(doc.business_name)+'</h1>'+
  '<p style="line-height:1.65;color:#516b5b">'+e(doc.business_name)+' has shared '+(quote?'a quote':'an invoice')+' for your review.</p>'+
  '<div style="padding:19px;border:1px solid #e3eae3;border-radius:10px;margin:24px 0">'+
  '<small style="color:#72857b">'+e(doc.number)+'</small><p style="font-size:25px;font-weight:800;margin:5px 0">'+usd(doc.amount_cents)+'</p></div>'+
  '<a href="'+e(link)+'" style="background:#147a4f;color:white;display:inline-block;border-radius:10px;text-decoration:none;font-weight:bold;padding:15px 21px">View '+(quote?'quote':'invoice')+' securely →</a>'+
  '<p style="color:#6c8274;font-size:12px;margin-top:24px;line-height:1.6">This private link expires in 14 days. Anyone with the link can view the document. If you weren’t expecting it, contact the business directly.</p></div></main>'+
  '<p style="text-align:center;color:#809188;font-size:12px">Powered by JobFlow by Ezysouth</p></body></html>';
}
async function owner(req) {
  const match=/^Bearer (.+)$/i.exec(req.headers.get("authorization")||"");
  if(!match) return null;
  const {data,error}=await anon.auth.getUser(match[1]);
  return !error?data.user:null;
}
async function ownedClient(req) {
  const bearer=req.headers.get("authorization");
  return createClient(SUPABASE_PROJECT_URL, PUBLIC_KEY, {global:{headers:{Authorization: bearer||""}},auth:{persistSession:false,autoRefreshToken:false}});
}
Deno.serve(async req => {
  try {
    if(req.method==="OPTIONS") return new Response(null,{status:204,headers:headers(req)});
    if(!SUPABASE_PROJECT_URL||!SERVICE_KEY||!PUBLIC_KEY) return json(req,{error:"Document service is not configured."},503);
    const url=new URL(req.url);
    if(req.method==="GET"){
      if(url.searchParams.get("capabilities")==="1")return json(req,{emailEnabled:emailReady,secureLinks:true});
      const supplied=url.searchParams.get("token")||"";
      if(!/^[a-f0-9]{64}$/.test(supplied))return json(req,{error:"Invalid document link."},400);
      const digest=await hash(supplied);
      const {data:d,error}=await service.from("jobflow_document_deliveries")
        .select("id,status,revoked_at,expires_at,document_snapshot,created_at,opened_at")
        .eq("token_hash",digest).maybeSingle();
      if(error)throw error;
      if(!d||d.revoked_at||d.status==="failed"||d.status==="pending"||Date.parse(d.expires_at)<=Date.now())
        return json(req,{error:"This document link is no longer available. Please contact the business for a new one."},410);
      if(!d.opened_at) {
        // Best effort audit: does not block successful viewing.
        await service.from("jobflow_document_deliveries").update({opened_at:iso()}).eq("id",d.id).is("opened_at",null);
      }
      return json(req,{document:d.document_snapshot,created_at:d.created_at,expires_at:d.expires_at});
    }
    if(req.method!=="POST")return json(req,{error:"Unsupported request"},405);
    if(req.headers.get("origin")!==ORIGIN)return json(req,{error:"Origin not allowed"},403);
    const user=await owner(req);
    if(!user)return json(req,{error:"Sign in to JobFlow first."},401);
    let body;
    try{body=await req.json()}catch{return json(req,{error:"Invalid request."},400)}
    const action=String(body?.action||"");
    if(action==="revoke"){
      if(!/^[a-f0-9-]{36}$/i.test(String(body.deliveryId||"")))return json(req,{error:"Invalid delivery ID."},400);
      const {data,error}=await service.from("jobflow_document_deliveries")
        .update({revoked_at:iso()}).eq("id",body.deliveryId).eq("owner_id",user.id)
        .is("revoked_at",null).select("id");
      if(error)throw error;
      return data?.length?json(req,{revoked:true}):json(req,{error:"Link not found or already revoked."},404);
    }
    if(action!=="prepare"&&action!=="send")return json(req,{error:"Unsupported action."},400);
    if(!/^[a-f0-9-]{36}$/i.test(String(body.documentId||"")))return json(req,{error:"Invalid document ID."},400);
    if(action==="send"&&!emailReady)return json(req,{error:"Direct email is not configured. Use a secure link or your own email app until the sending domain is connected.",code:"EMAIL_NOT_CONFIGURED"},503);
    const email=String(body.email||"").trim().toLowerCase();
    // A private link can be copied without a recipient email. Direct email needs one.
    if((email||action==="send")&&(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return json(req,{error:"Enter a valid customer email address before sending."},400);
    const db=await ownedClient(req);
    const {data:d,error:docError}=await db.from("jobflow_documents").select("*")
      .eq("owner_id",user.id).eq("id",body.documentId).maybeSingle();
    if(docError)throw docError;
    if(!d)return json(req,{error:"Document not found."},404);
    if(!Number.isFinite(Number(d.amount_cents))||Number(d.amount_cents)<=0)return json(req,{error:"Complete the document pricing before sharing."},422);
    if(d.gst_treatment==="unspecified")return json(req,{error:"Choose the GST treatment before sharing."},422);
    if(["included","exclusive"].includes(d.gst_treatment)&&!String(d.business_gst_number||"").trim())return json(req,{error:"Enter your GST number before sharing a GST-charging document."},422);
    if(action==="send"&&d.status==="Void")return json(req,{error:"Cannot send a void invoice."},422);
    const since=new Date(Date.now()-3600000).toISOString();
    const {count,error:limitError}=await service.from("jobflow_document_deliveries")
      .select("id",{head:true,count:"exact"}).eq("owner_id",user.id).gte("created_at",since);
    if(limitError)throw limitError;
    if((count||0)>=30)return json(req,{error:"Too many sharing attempts. Try again later."},429);
    const {count:docCount,error:docLimitError}=await service.from("jobflow_document_deliveries")
      .select("id",{head:true,count:"exact"}).eq("owner_id",user.id).eq("document_id",d.id).gte("created_at",since);
    if(docLimitError)throw docLimitError;
    if((docCount||0)>=8)return json(req,{error:"Too many links for this document. Try again later."},429);
    const access=token(),tokenHash=await hash(access);
    const expires=new Date(Date.now()+14*86400000).toISOString();
    const info=snapshot(d,email,action);
    const link=VIEW_BASE+"?token="+access;
    const {data:record,error:insertError}=await service.from("jobflow_document_deliveries").insert({
      owner_id:user.id,document_id:d.id,recipient_email:email||null,
      token_hash:tokenHash,document_snapshot:info,status:action==="send"?"pending":"prepared",
      expires_at:expires
    }).select("id").single();
    if(insertError)throw insertError;
    if(action==="prepare")return json(req,{link,deliveryId:record.id,expires_at:expires,status:"prepared"});
    const sendResponse=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json","Idempotency-Key":"jobflow-"+record.id},
      body:JSON.stringify({
        from:SENDER,to:[email],
        subject:(d.document_type==="quote"?"Your quote":"Your invoice")+" "+d.number+" from "+d.business_name,
        html:emailHtml(info,link)
      })
    });
    const provider=await sendResponse.json().catch(()=>({}));
    if(!sendResponse.ok||!provider.id){
      await service.from("jobflow_document_deliveries").update({status:"failed",revoked_at:iso()}).eq("id",record.id);
      return json(req,{error:"Email provider could not accept this message. No successful delivery was recorded. Verify your sender settings before retrying."},502);
    }
    await service.from("jobflow_document_deliveries").update({
      status:"sent",sent_at:iso(),provider_message_id:String(provider.id).slice(0,150)
    }).eq("id",record.id);
    let statusWarning=null;
    const next=d.document_type==="quote"?"Sent":"Unpaid";
    if(d.status==="Draft"){
      const {error:statusError}=await db.from("jobflow_documents")
        .update({status:next,updated_at:iso()}).eq("id",d.id).eq("owner_id",user.id).eq("status","Draft").select("id");
      if(statusError)statusWarning="Email accepted but document status could not be updated. Refresh JobFlow and check the record.";
    }
    return json(req,{status:"sent",deliveryId:record.id,recipient:email,providerMessageId:provider.id,warning:statusWarning});
  }catch(error){
    // Suppress internal error details from the client.
    console.error("jobflow delivery server failure",error instanceof Error?error.name:"unknown");
    return json(req,{error:"Document sharing is temporarily unavailable. Please try again."},500);
  }
});
