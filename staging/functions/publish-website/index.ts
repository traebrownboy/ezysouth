// EzySouth STAGING ONLY: stable preview publishing without Netlify credentials.
// Authenticated owner may publish/republish/remove; every URL remains tied
// to the immutable website UUID. Never deploy to the production Supabase project.
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

const PROJECT = 'https://anldjuaqlpowwodlphqf.supabase.co';
const BUCKET = 'ezysouth-staging-published';
const STAGING_HOST = 'staging-edge-hosted';
const MAX_HTML = 5 * 1024 * 1024;
const baseCors = {
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Max-Age': '600',
  'Vary': 'Origin',
};
function validOrigin(raw: string | null) {
  if (!raw) return null;
  try {
    const origin = new URL(raw);
    if (origin.protocol !== 'https:' || origin.origin !== raw) return null;
    return /^(?:ezysouth-jobflow-test|deploy-preview-[0-9]+--ezysouth-jobflow-test)\.netlify\.app$/.test(origin.hostname) ? raw : null;
  } catch { return null; }
}
function secrets(): string | undefined {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (direct) return direct;
  try { const raw = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); return raw.default || Object.values(raw)[0] as string; }
  catch { return undefined; }
}
function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
const publicUrl = (id: string) => PROJECT + '/functions/v1/staging-public-site/' + id;
const filePath = (id: string) => id + '/index.html';
const slugify = (name: string) => name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-+$/g,'').slice(0,48) || 'demo-site';

Deno.serve(async req => {
  const requestOrigin = req.headers.get('origin');
  const accepted = validOrigin(requestOrigin);
  const cors = {...baseCors,...(accepted ? {'Access-Control-Allow-Origin':accepted} : {})};
  const respond = (body: Record<string,unknown>,status=200) => new Response(JSON.stringify(body),{
    status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
  });
  if (requestOrigin&&!accepted) return respond({error:'Only the isolated EzySouth test site can publish.'},403);
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  if(req.method!=='GET'&&req.method!=='POST') return respond({error:'Method not allowed'},405);
  if(Deno.env.get('SUPABASE_URL')!==PROJECT) return respond({error:'Test publisher is not configured for this project.'},503);
  const key=secrets();
  if(!key) return respond({error:'Test publisher storage is unavailable.'},503);
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token) return respond({error:'Sign in to EzySouth first.'},401);
  const db=createClient(PROJECT,key,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const {data:identity,error:authErr}=await db.auth.getUser(token);
    if(authErr||!identity.user)return respond({error:'Session expired. Sign in again.'},401);
    const body=req.method==='POST' ? await req.json().catch(()=>null) : null;
    const id=req.method==='GET'?new URL(req.url).searchParams.get('website_id'):body?.website_id;
    if(!isUuid(id))return respond({error:'Select a valid test cloud website.'},400);
    const {data:site,error:siteErr}=await db.from('websites').select('id,name,owner_id,updated_at').eq('id',id).maybeSingle();
    if(siteErr)return respond({error:'Could not verify this website.'},503);
    if(!site||site.owner_id!==identity.user.id)return respond({error:'Website not found or not yours.'},403);

    const {data:deployed,error:statusErr}=await db.from('website_deployments')
      .select('website_id,owner_id,netlify_site_id,site_slug,public_url,publish_status,last_published_at,last_error')
      .eq('website_id',id).maybeSingle();
    if(statusErr)return respond({error:'Website publishing status unavailable.'},503);
    if(deployed&&(deployed.owner_id!==identity.user.id || deployed.netlify_site_id!==STAGING_HOST))
      return respond({error:'This website uses a different hosting service and cannot be changed from staging.'},409);

    const url=publicUrl(id);
    if(req.method==='GET'){
      if(!deployed)return respond({status:'draft',url:null,site_slug:null,has_unpublished_changes:true,message:'This test website has never been published.'});
      const last=deployed.last_published_at?Date.parse(deployed.last_published_at):0;
      const changed=!!last&&Date.parse(site.updated_at||'')>last+500;
      const status=deployed.publish_status==='live'&&changed?'draft':deployed.publish_status;
      return respond({
        status,url,site_slug:deployed.site_slug,preserved_url:true,last_published_at:deployed.last_published_at,
        has_unpublished_changes:changed,
        message:status==='live'?'Test website is published and up to date.'
          :status==='publishing'?'Test website is publishing.'
          :status==='unpublished'?'Website is offline. Publishing again restores the same address.'
          :status==='removed'?'Site content removed. The same address is reserved.'
          :status==='error'?(deployed.last_error||'Previous publish failed.')
          :status==='draft'?'Website has unsaved publishing changes.':'Test website is not yet published.'
      });
    }

    const action=body?.action||'publish';
    if(!['publish','unpublish','remove'].includes(action))return respond({error:'Unknown publish action.'},400);
    const now=new Date().toISOString();
    if(action==='unpublish'||action==='remove'){
      if(!deployed)return respond({error:'Website has not been published.'},409);
      const next=action==='remove'?'removed':'unpublished';
      const {error:updateErr}=await db.from('website_deployments').update({publish_status:next,last_error:null,updated_at:now}).eq('website_id',id);
      if(updateErr)return respond({error:'Could not take website offline.'},503);
      if(action==='remove')await db.from('websites').update({accepting_enquiries:false}).eq('id',id);
      return respond({status:next,url,site_slug:deployed.site_slug,preserved_url:true,message:'The preview address is reserved.'});
    }
    const html=body?.html;
    if(typeof html!=='string'||!/^\s*<!doctype html>/i.test(html.slice(0,150))||!/<html[\s>]/i.test(html.slice(0,600)))
      return respond({error:'Please generate a valid exported website.'},400);
    const bytes=new TextEncoder().encode(html);
    if(bytes.length>MAX_HTML)return respond({error:'Website export exceeds 5 MB. Reduce embedded photos and try again.'},413);
    if(bytes.length<250)return respond({error:'Website export is unexpectedly small.'},400);

    // Store private HTML. Site URL is based on immutable UUID, never a mutable
    // company name, so republishing does not rename anybody's existing URL.
    const {error:storeErr}=await db.storage.from(BUCKET).upload(filePath(id),bytes,{
      contentType:'text/html',cacheControl:'0',upsert:true
    });
    if(storeErr){console.error('Staging published HTML storage:',storeErr.message);return respond({error:'Could not store website. Nothing was published.'},503);}
    const values={
      website_id:id,owner_id:identity.user.id,netlify_site_id:STAGING_HOST,
      site_slug:deployed?.site_slug||slugify(site.name||'website'),public_url:url,
      publish_status:'live',deploy_id:crypto.randomUUID(),last_published_at:now,last_error:null,updated_at:now
    };
    const q=deployed
      ?db.from('website_deployments').update(values).eq('website_id',id)
      :db.from('website_deployments').insert(values);
    const {error:saveErr}=await q;
    if(saveErr){console.error('Staging deployment save:',saveErr.message);return respond({error:'Site uploaded but status could not be saved. Contact support before retrying.'},503);}
    return respond({
      status:'live',url,site_slug:values.site_slug,preserved_url:true,
      last_published_at:now,state:'ready',message:'Published to the private-beta preview URL.'
    });
  }catch(error){
    console.error('Staging publishing error:',error instanceof Error?error.message:'unexpected');
    return respond({error:'Test publishing could not finish. Please retry after checking your account.'},500);
  }
});
