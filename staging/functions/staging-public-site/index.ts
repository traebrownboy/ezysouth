// EzySouth STAGING ONLY: public preview serving through an isolated Supabase
// Edge Function origin. Never grants browser clients access to private files.
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
const PROJECT='https://anldjuaqlpowwodlphqf.supabase.co';
const BUCKET='ezysouth-staging-published';
const STAGING_HOST='staging-edge-hosted';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function secretKey():string|undefined{
 const direct=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(direct)return direct;
 try{const o=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');return o.default||Object.values(o)[0] as string;}
 catch{return undefined;}
}
const secureHeaders={
 'Content-Type':'text/html; charset=utf-8',
 'Cache-Control':'no-store,max-age=0',
 'X-Robots-Tag':'noindex,nofollow,noarchive',
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Referrer-Policy':'no-referrer',
 'Permissions-Policy':'camera=(),microphone=(),geolocation=()',
 // User-created HTML is untrusted. CSP sandbox forces an opaque origin,
 // preventing it from reading cookies/localStorage of Supabase API origin.
 // HTTPS photos from the portfolio bucket and staging enquiry API are allowed.
 'Content-Security-Policy':"sandbox allow-scripts allow-forms allow-popups; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: data: blob:; connect-src https://anldjuaqlpowwodlphqf.supabase.co; font-src https: data:; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"
};
function page(title:string,message:string,status=200){
 return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+title+'</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eef5f0;color:#204631;font:16px system-ui;padding:20px;box-sizing:border-box}.box{max-width:580px;background:#fff;border:1px solid #d5e5da;border-radius:20px;padding:36px;box-shadow:0 14px 35px #173f2620;text-align:center}h1{font-size:clamp(24px,5vw,36px);margin:0 0 15px}p{line-height:1.6;margin:0;color:#617768}</style><main class="box"><h1>'+title+'</h1><p>'+message+'</p></main></html>',{status,headers:secureHeaders});
}
// Supabase Edge Functions intentionally serve HTML as text/plain on their
// API origin. Always navigate visitors to the Netlify HTML viewer instead.
// The viewer's sandboxed srcdoc frame isolates untrusted website JS from
// EzySouth account sessions and other apps hosted on that origin.
const VIEWER='https://ezysouth-jobflow-test.netlify.app/published.html';
const jsonHeaders={
 'Content-Type':'application/json; charset=utf-8',
 'Access-Control-Allow-Origin':'*',
 'Access-Control-Allow-Methods':'GET, HEAD',
 'Cache-Control':'no-store, max-age=0',
 'X-Content-Type-Options':'nosniff',
 'X-Robots-Tag':'noindex,nofollow,noarchive'
};
function rawResult(data:Record<string,unknown>,status=200){
 return new Response(JSON.stringify(data),{status,headers:jsonHeaders});
}
Deno.serve(async req=>{
 if(req.method!=='GET'&&req.method!=='HEAD')return page('Method not allowed','This preview address is read-only.',405);
 const u=new URL(req.url);
 const raw=u.searchParams.get('raw')==='1';
 const problem=(title:string,message:string,status:number)=>{
  if(raw)return rawResult({status:status===404?'missing':'error',message},status);
  return page(title,message,status);
 };
 if(Deno.env.get('SUPABASE_URL')!==PROJECT)return problem('Preview unavailable','The staging publisher is not configured.',503);
 const id=u.pathname.split('/').filter(Boolean).pop()||'';
 if(!UUID.test(id))return problem('Preview not found','Check the address you were given.',404);
 const key=secretKey();if(!key)return problem('Preview unavailable','The staging website service is temporarily unavailable.',503);
 const db=createClient(PROJECT,key,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:deployment,error:queryError}=await db.from('website_deployments')
   .select('publish_status,netlify_site_id')
   .eq('website_id',id).maybeSingle();
  if(queryError)return problem('Preview temporarily unavailable','Try again in a moment.',503);
  if(!deployment||deployment.netlify_site_id!==STAGING_HOST+':'+id)return problem('Preview not found','This site has not been published.',404);

  // Preserve the existing public_url exactly. Redirect its GET request to
  // a rendered webpage rather than showing raw HTML source on iPhone Safari.
  if(!raw){
   return new Response(null,{status:302,headers:{
    'Location':VIEWER+'?site='+encodeURIComponent(id),
    'Cache-Control':'no-store, max-age=0',
    'X-Robots-Tag':'noindex,nofollow,noarchive',
    'Referrer-Policy':'no-referrer'
   }});
  }
  if(deployment.publish_status==='unpublished')
   return rawResult({status:'unpublished',message:'This website is temporarily offline.'},409);
  if(deployment.publish_status==='removed')
   return rawResult({status:'removed',message:'This preview was removed by its owner.'},409);
  if(deployment.publish_status!=='live')
   return rawResult({status:'draft',message:'This website is still publishing.'},409);

  const {data,error:downloadError}=await db.storage.from(BUCKET).download(id+'/index.html');
  if(downloadError||!data)return rawResult({status:'error',message:'The published content could not be loaded.'},503);
  const html=await data.text();
  if(!/^\s*<!doctype html>/i.test(html))
   return rawResult({status:'error',message:'The saved website export is invalid.'},503);
  // HTML is a transport payload. The viewer inserts it ONLY into an iframe
  // sandbox without allow-same-origin, never into the parent DOM.
  if(req.method==='HEAD')return new Response(null,{status:200,headers:jsonHeaders});
  return rawResult({status:'live',html});
 }catch(error){
  console.error('Staging published site serving error',error instanceof Error?error.message:'unexpected');
  return problem('Preview unavailable','The test website cannot be opened right now.',503);
 }
});
