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
Deno.serve(async req=>{
 if(req.method!=='GET'&&req.method!=='HEAD')return page('Method not allowed','This preview address is read-only.',405);
 if(Deno.env.get('SUPABASE_URL')!==PROJECT)return page('Preview unavailable','The staging publisher is not configured.',503);
 const id=new URL(req.url).pathname.split('/').filter(Boolean).pop()||'';
 if(!UUID.test(id))return page('Preview not found','Check the address you were given.',404);
 const key=secretKey();if(!key)return page('Preview unavailable','The staging website service is temporarily unavailable.',503);
 const db=createClient(PROJECT,key,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:deployment,error:queryError}=await db.from('website_deployments')
    .select('publish_status,netlify_site_id')
    .eq('website_id',id).maybeSingle();
  if(queryError)return page('Preview temporarily unavailable','Try again in a moment.',503);
  if(!deployment||deployment.netlify_site_id!==STAGING_HOST+':'+id)return page('Preview not found','This site has not been published.',404);
  if(deployment.publish_status==='unpublished')return page('Website temporarily offline','The original address is reserved. The owner may publish it again.');
  if(deployment.publish_status==='removed')return page('Website removed','This preview has been taken offline. Its address is reserved.');
  if(deployment.publish_status!=='live')return page('Website is updating','Try again in a moment.',503);
  const {data,error:downloadError}=await db.storage.from(BUCKET).download(id+'/index.html');
  if(downloadError||!data)return page('Preview unavailable','The published content could not be loaded.',503);
  const html=await data.text();
  if(!/^\s*<!doctype html>/i.test(html))return page('Preview unavailable','The saved website export is invalid.',503);
  // Permanent visual staging warning. This is a public *test* page, not the
  // production EzySouth service. Never imply the domain is a customer site.
  const banner='<div role="status" style="position:relative;z-index:2147483647;padding:10px 16px;background:#213f30;color:#fff;text-align:center;font:700 12px system-ui;letter-spacing:.05em">🧪 EZYSOUTH PRIVATE BETA PREVIEW · TEST DETAILS ONLY</div>';
  const served=html.replace(/<body(\s[^>]*)?>/i,m=>m+banner);
  if(req.method==='HEAD')return new Response(null,{status:200,headers:secureHeaders});
  return new Response(served,{status:200,headers:secureHeaders});
 }catch(e){
  console.error('Staging published site serving error',e instanceof Error?e.message:'unexpected');
  return page('Preview unavailable','The test website cannot be opened right now.',503);
 }
});
