// Run: node --test tests/web-template-geometry.test.cjs
// Every named visual style must obey Coastal Clean's proven layout contract.
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const html=readFileSync(resolve(__dirname,'../netlify-preview/web.html'),'utf8');
const editor=readFileSync(resolve(__dirname,'../netlify-preview/ezy-premium-editor.js'),'utf8');
const css=html.split('<style>')[1]?.split('</style>')[0];
const from=html.indexOf('const coastalPresetStructure='),to=html.indexOf('const designDefaults=',from);
assert.ok(css&&from>=0&&to>from,'Missing design schema or CSS');
const {coastalPresetStructure,premiumPresets}=new Function(html.slice(from,to)+'return {coastalPresetStructure,premiumPresets}')();
const names=['coastal','studio','trade','midnight','landscape','automotive','professional'];
const fields=['layout','hero','surface','spacing','serviceStyle','navStyle'];
const shared='.site:is('+names.map(n=>'.preset-'+n).join(',')+')';

test('all named styles share Coastal Clean layout geometry',()=>{
 assert.deepEqual(Object.keys(premiumPresets),names);
 for(const name of names)for(const key of fields){
  assert.equal(premiumPresets[name][key],coastalPresetStructure[key],name+' '+key);
 }
});
test('service cards, hero, navigation and footer use one common CSS',()=>{
 for(const part of [' .site-nav',' .hero',' .service-list',' .service',' .pro-footer']){
  assert.ok(css.includes(shared+part),'Missing shared CSS for '+part);
 }
 assert.ok(css.includes('.site .hero.has-customer-photo{display:grid!important;grid-template-columns:1fr 1fr'));
 assert.ok(css.includes('@container(max-width:680px){.site .hero.has-customer-photo{grid-template-columns:1fr!important'));
 assert.ok(css.includes('@container(max-width:390px)'));
});
test('visual themes cannot override size or layout',()=>{
 const segment=css.split('/* EzySouth Web: seven visual themes')[1]?.split('/* Template thumbnails')[0];
 assert.ok(segment);
 assert.doesNotMatch(segment,/(?:^|[;{\n])\s*(?:display|width|min-width|max-width|height|min-height|max-height|padding|margin|gap|grid-template|grid-row|grid-column|flex|position|aspect-ratio|overflow|transform|align-items|justify-content)\s*:/m);
 for(const n of names)assert.ok(segment.includes('.site.preset-'+n+' .hero{'));
});
test('saved designs keep content and custom advanced layouts remain available',()=>{
 assert.ok(html.includes('Object.assign(design,coastalPresetStructure);'));
 assert.ok(html.includes("if(Object.prototype.hasOwnProperty.call(premiumPresets,design.preset))"));
 assert.ok(html.includes("design.preset='custom'"));
 assert.ok(html.includes('const content={data:structuredClone(data),design:structuredClone(design)'));
});
test('click-to-edit still connects to saved site and is stripped from export',()=>{
 assert.ok(html.includes('src="./ezy-premium-editor.js?v=2"'));
 assert.ok(editor.includes('window.ezyPremiumInlineEditor=true'));
 assert.ok(html.includes("clone.classList.remove('editable-preview','ezy-live-edit')"));
 assert.ok(html.includes("removeAttribute('data-ezy-inline')"));
 assert.ok(html.includes('function exportSite()'));
});
