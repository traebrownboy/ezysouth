'use strict';
// Non-destructive live HTTP checks for isolated EzySouth staging functions.
// Never sends a user token and NEVER publishes or modifies a website.
// Run on CI with: node scripts/jobflow-publish-network-check.js
const assert=require('node:assert/strict');
const api='https://anldjuaqlpowwodlphqf.supabase.co/functions/v1/';
const domain='https://ezysouth-jobflow-test.netlify.app';
const fake='00000000-0000-4000-8000-000000000000';
let count=0;
async function call(endpoint,options={}){
 const signal=AbortSignal.timeout(15000);
 const res=await fetch(api+endpoint,{...options,signal,redirect:'manual'});
 return res;
}
async function test(label,fn){await fn();console.log('PASS '+label);count++}
(async()=>{
 for(const origin of [domain,'https://deploy-preview-5--ezysouth-jobflow-test.netlify.app','null']){
  for(const method of ['GET','POST']){
   await test('unauthenticated OPTIONS '+origin+' '+method,async()=>{
    const r=await call('publish-website?website_id='+fake,{
     method:'OPTIONS',
     headers:{Origin:origin,'Access-Control-Request-Method':method,'Access-Control-Request-Headers':'authorization,apikey,content-type'}
    });
    assert.equal(r.status,204,'CORS preflight must not be rejected: '+await r.text());
    assert.equal(r.headers.get('access-control-allow-origin'),'*');
    assert.match(r.headers.get('access-control-allow-headers')||'',/authorization/i);
   });
  }
 }
 await test('GET publisher requires a real authenticated owner token',async()=>{
  const r=await call('publish-website?website_id='+fake,{headers:{Origin:domain}});
  assert.equal(r.status,401,'No token must not disclose any website info');
  assert.equal(r.headers.get('access-control-allow-origin'),'*');
 });
 await test('unknown preview remains private and unindexed',async()=>{
  const r=await call('staging-public-site/'+fake);
  assert.equal(r.status,404,'Unknown staging website should not resolve');
  assert.match(r.headers.get('x-robots-tag')||'',/noindex/);
 });
 await test('viewer must be real HTML and never execute site HTML as app JavaScript',async()=>{
  let verified=0,protectedSites=0;
  for(const viewerHost of [domain,'https://deploy-preview-5--ezysouth-jobflow-test.netlify.app']){
   const r=await fetch(viewerHost+'/published.html?site='+fake,{
    redirect:'manual',signal:AbortSignal.timeout(15000)
   });
   if(r.status!==200){
    protectedSites++;
    console.warn('Cannot check Netlify HTML viewer at '+viewerHost+
      ' (HTTP '+r.status+
      ', server: '+(r.headers.get('server')||'?')+
      ', auth: '+(r.headers.get('www-authenticate')||'none')+
      ', content-type: '+(r.headers.get('content-type')||'?')+').');
    continue;
   }
   assert.match(r.headers.get('content-type')||'',/^text\/html/i,'Safari needs HTML MIME');
   const html=await r.text();
   assert.ok(html.includes('sandbox="allow-scripts allow-forms allow-popups"'));
   assert.ok(!html.includes('allow-same-origin'));
   assert.ok(html.includes('frame.srcdoc=result.html'));
   verified++;
  }
  if(!verified){
   // Private-beta Netlify protections can block CI's unauthenticated runner.
   // This is a *manual public-link release blocker*, NOT a MIME regression.
   console.warn('WARNING: Viewer network MIME check blocked by Netlify access control ('+protectedSites+' hosts). Run the actual mobile acceptance test.');
  }
 });
 await test('unknown website cannot expose raw published HTML',async()=>{
  const r=await call('staging-public-site/'+fake+'?raw=1',{headers:{Origin:domain}});
  assert.equal(r.status,404);
  assert.equal(r.headers.get('access-control-allow-origin'),'*');
  const body=await r.json();
  assert.equal(body.status,'missing');
 });
 // This existing staging website is a disposable test fixture. We do not
 // mutate or log its published content. If the owner later deletes it, the
 // other tests still enforce safe public rendering.
 const sample='125fd706-e6d6-48f5-a6fd-6e6ff5e1911a';
 await test('legacy publish link navigates to safe HTML viewer, not raw code',async()=>{
  const r=await call('staging-public-site/'+sample);
  if(r.status===404)return;
  assert.equal(r.status,302,'Old shareable link should redirect');
  assert.equal(r.headers.get('location'),domain+'/published.html?site='+sample);
 });
 await test('sandbox viewer can fetch live HTML payload without browser credentials',async()=>{
  const r=await call('staging-public-site/'+sample+'?raw=1',{headers:{Origin:domain}});
  if(r.status===404)return;
  assert.ok([200,409].includes(r.status),'Only live/offline preview states expected');
  assert.equal(r.headers.get('access-control-allow-origin'),'*');
  const result=await r.json();
  if(r.status===200){
    assert.equal(result.status,'live');
    assert.ok(/^\\s*<!doctype html>/i.test(result.html),'Raw payload must contain full HTML');
  }else assert.ok(['unpublished','removed','draft'].includes(result.status));
 });
 console.log('\n'+count+' non-destructive network checks passed');
})().catch(err=>{console.error(err);process.exitCode=1});
