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
 console.log('\n'+count+' non-destructive network checks passed');
})().catch(err=>{console.error(err);process.exitCode=1});
