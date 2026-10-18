'use strict';
// Static, dependency-free regression checks for the isolated Netlify preview.
// Run: node scripts/jobflow-preview-smoke.js
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files={
  home:read('netlify-preview/index.html'),
  web:read('netlify-preview/web.html'),
  job:read('netlify-preview/jobflow.html')
};
const tests=[];
function check(name,run){try{run();tests.push({name,ok:true});console.log('PASS '+name)}catch(e){tests.push({name,ok:false});console.error('FAIL '+name+': '+e.message)}}
const contains=(doc,fragment)=>assert.ok(doc.includes(fragment),'Expected '+JSON.stringify(fragment));
check('home has both named products',()=>{
 contains(files.home,'EzySouth Web');
 contains(files.home,'JobFlow');
 contains(files.home,'href="./web.html"');
 contains(files.home,'href="./jobflow.html"');
});
check('both apps return to homepage and each other',()=>{
 contains(files.web,'href="./index.html"');
 contains(files.web,'href="./jobflow.html"');
 contains(files.job,'href="./index.html"');
 contains(files.job,'href="./web.html"');
 contains(files.web,'Return to homepage');
 contains(files.job,'Return to homepage');
});
check('staging app isolation (no production Supabase project)',()=>{
 for(const html of [files.web,files.job]){
  contains(html,'https://anldjuaqlpowwodlphqf.supabase.co');
  assert.ok(!html.includes('ezcmfbaoivdwkgayznbt'),'Production Supabase project leaked');
  assert.ok(!html.includes('sb_secret_'),'Secret key must not be in browser');
  contains(html,'STAGING');
 }
});
check('working features preserved',()=>{
 contains(files.web,'Save current website to cloud');
 contains(files.web,'enable-live-jobflow');
 contains(files.web,'jobflow-showcase-refresh');
 contains(files.job,'demo-enquiry');
 contains(files.job,'jobflow-demo-enquiry');
 contains(files.job,'Send to Website');
});
check('photo approval, resizing, CORS and 4-image support',()=>{
 contains(files.job,'feature-photo-input');
 contains(files.job,'feature-confirm');
 contains(files.job,'compressProjectImage');
 contains(files.job,"const PHOTO_BUCKET='jobflow-portfolio'");
 contains(files.job,'file.size>18*1024*1024');
 contains(files.job,'newPhotoFiles.length>4');
 contains(files.web,'image_paths');
 contains(files.web,'portfolio-preview-images');
 contains(files.job,'img-src \'self\' data: blob: https://anldjuaqlpowwodlphqf.supabase.co');
});
check('publishing remains disabled in isolated staging',()=>{
 contains(files.web,'Publishing disabled in staging.');
 contains(files.web,'#ezysouth-publish-panel,#ezy-advanced-publishing{display:none!important}');
 const config=read('netlify.toml');
 contains(config,'publish = "netlify-preview"');
 assert.ok(!config.includes('build-production.js'),'Wrong Netlify config');
});
check('security migrations are present',()=>{
 const migration=read('database/migrations/20261018_jobflow_photos.sql');
 contains(migration,'jobflow_portfolio_insert_owned_websites');
 contains(migration,'jobflow_portfolio_delete_own');
 contains(migration,'storage.foldername(storage.objects.name)');
 contains(migration,'cardinality(image_paths) <= 4');
 const tests=read('database/tests/jobflow_photos_rls.sql');
 contains(tests,'ROLLBACK;');
});
check('HTML links point to actual preview files',()=>{
 for(const [key,html] of Object.entries(files)){
  for(const [,file] of html.matchAll(/href="\.\/(index\.html|web\.html|jobflow\.html)"/g)){
   assert.ok(fs.existsSync(path.join(root,'netlify-preview',file)),key+': missing '+file);
  }
 }
});
check('all inline application scripts compile as JavaScript',()=>{
 for(const [page,html] of Object.entries(files)){
  let i=0;
  for(const [,contents] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
   if(!contents.trim())continue;
   new vm.Script(contents,{filename:page+'-inline-'+(++i)+'.js'});
  }
  if(page!=='home')assert.ok(i>=1,page+' missing app JS');
 }
});
const failures=tests.filter(t=>!t.ok);
console.log('\n'+(tests.length-failures.length)+'/'+tests.length+' checks passed');
if(failures.length)process.exitCode=1;
