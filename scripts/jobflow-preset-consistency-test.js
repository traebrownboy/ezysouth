'use strict';
// Staging-only zero-dependency regression test.
// Guarantees all named styles share Coastal Clean geometry and export parity.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'..','netlify-preview','web.html'),'utf8');
let passed=0;
function test(label,fn){fn();passed++;console.log('PASS '+label)}
const ids=['coastal','studio','trade','midnight','landscape','automotive','professional'];
function extract(name,next){
 const i=src.indexOf(name),j=src.indexOf(next,i+name.length);
 assert.ok(i>=0&&j>i,'Missing '+name+' or '+next);
 return src.slice(i,j);
}
const defs=extract('const coastalPresetStructure=','const designDefaults=');
const vmContext={};
vm.runInNewContext(defs+';globalThis.__spec={base:coastalPresetStructure,presets:premiumPresets}',vmContext,{timeout:1500});
const {base,presets}=vmContext.__spec;
const fields=['layout','hero','surface','spacing','serviceStyle','navStyle'];
test('all seven named presets exist',()=>{
 assert.deepEqual(Object.keys(presets).sort(),ids.slice().sort());
});
test('Coastal Clean is the reliable default',()=>{
 for(const [k,v] of Object.entries({layout:'friendly',hero:'standard',surface:'soft',spacing:'balanced',serviceStyle:'cards',navStyle:'clean'}))assert.equal(base[k],v);
 assert.equal(presets.coastal.color,'#207b67');
 assert.ok(src.includes("const designDefaults={...coastalPresetStructure"));
});
test('all styles use the same geometry and components',()=>{
 for(const id of ids){
  for(const key of fields)assert.equal(presets[id][key],base[key],id+' diverged on '+key);
  assert.notEqual(presets[id].hero,'split');
  assert.notEqual(presets[id].surface,'sharp');
  assert.notEqual(presets[id].serviceStyle,'list');
 }
});
test('styles retain their intended personalities',()=>{
 assert.equal(presets.coastal.font,'modern');
 assert.equal(presets.studio.font,'editorial');
 assert.equal(presets.trade.font,'modern');
 assert.equal(presets.midnight.font,'editorial');
 assert.equal(new Set(ids.map(x=>presets[x].color)).size,ids.length);
});
test('existing named presets are harmonised on render, custom stays independent',()=>{
 const body=extract('function renderDesignSite(){','function renderDesign(){');
 assert.ok(body.includes('Object.prototype.hasOwnProperty.call(premiumPresets,design.preset)'));
 assert.ok(body.includes('Object.assign(design,coastalPresetStructure'));
 assert.ok(body.includes("site.classList.add('preset-'+design.preset)"));
 assert.ok(body.includes("site.classList.add('preset-'+design.preset)"),'All named presets must be applied dynamically');
 assert.ok(src.includes("design.preset='custom'"));
});
test('guided and design-studio pickers support all seven presets',()=>{
 for(const id of ids)assert.ok(src.includes('data-template="'+id+'"'),'Missing '+id+' in Design Studio');
 assert.ok(src.includes("data-v56-template"));
 assert.ok(src.includes('const presets=['));
 assert.ok(src.includes("existing.click();drawTemplates();updatePreview()"));
});
test('all seven use the same safe hero and service/card geometry',()=>{
 const shared='.site:is('+ids.map(id=>'.preset-'+id).join(',')+')';
 assert.ok(src.includes(shared),'All seven styles must share base page geometry');
 for(const id of ids){
  assert.ok(src.includes('.site.preset-'+id+'{'),'Missing named style palette '+id);
 }
 for(const name of ['hero','site-nav','site-cta','site-section','service-list','service','review-card','pro-footer']){
  assert.ok(src.includes('.'+name),'Missing shared layout component '+name);
 }
 assert.ok(src.includes('@media(max-width:640px){'));
});
test('mobile and desktop preview + exported site use same renderer and CSS',()=>{
 assert.ok(src.includes("renderDesignSite();renderDesignPreview()"));
 assert.ok(src.includes("const clone=$('site').cloneNode(true)"));
 assert.ok(src.includes("document.querySelector('style').textContent"));
 assert.ok(src.includes("const originalExport=exportSite"));
 assert.ok(src.includes("exportSite=function(){let html=originalExport()"));
});
test('user data and photos are not reset when changing styles',()=>{
 const change=extract("document.querySelectorAll('[data-template]').forEach(button", "function renderDesignPreview()");
 assert.ok(change.includes('Object.assign(design,chosen,{preset})'));
 assert.ok(change.includes("data.color=chosen.color"));
 assert.ok(!change.includes('data={}'));
 assert.ok(!change.includes('uploadedPhotos=[]'));
 assert.ok(!change.includes('comparisons=[]'));
});
console.log('\n'+passed+' Coastal Clean consistency tests passed');
