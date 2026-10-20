'use strict';
// Run with Playwright installed; optionally set CHROME_PATH to a local Chromium.
// Exercises actual srcdoc frames: native fragment URLs inherit their parent's URL.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({reducedMotion:'reduce'});
  const builder=await context.newPage();
  await builder.route('https://**/*',r=>r.abort());
  await builder.route('http://builder.test/**',r=>r.fulfill({contentType:'text/html',body:read('netlify-preview/web.html')}));
  await builder.goto('http://builder.test/web.html');
  await builder.evaluate(()=>{
   Object.assign(data,{name:'Navigation Test',location:'Southland',services:'House washing\nGarden care',phone:'0211234567'});
   const canvas=document.createElement('canvas');canvas.width=10;canvas.height=10;
   uploadedPhotos=[{data:canvas.toDataURL(),name:'Test work'}];render();
  });
  const current=await builder.evaluate(()=>exportSite());
  // An existing saved export without any navigation script must also work.
  const legacy=current.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  let clicks=0;
  for(const width of [390,1440]){
   await builder.setViewportSize({width,height:844});
   await builder.evaluate(()=>openCustomerPreview());
   const modal=builder.frameLocator('#customer-frame');
   for(const label of ['Services','Our work','Get a quote']){
    const link=modal.locator('.customer-links').getByRole('link',{name:label,exact:true});
    const href=await link.getAttribute('href');await link.click();
    await builder.frames().find(f=>f.parentFrame()).waitForFunction(h=>{const r=document.querySelector(h).getBoundingClientRect();return r.top<innerHeight&&r.bottom>0},href);
    clicks++;
   }
   await builder.locator('#close-customer').click();
   for(const [kind,html] of [['current',current],['legacy',legacy]]){
    const viewer=await context.newPage();await viewer.setViewportSize({width,height:844});
    const errors=[];viewer.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await viewer.route('http://viewer.test/**',r=>r.fulfill({contentType:'text/html',body:read('netlify-preview/published.html')}));
    await viewer.route('https://anldjuaqlpowwodlphqf.supabase.co/**',r=>r.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({status:'live',html})}));
    await viewer.goto('http://viewer.test/published.html?site=11111111-1111-4111-8111-111111111111');
    const frame=viewer.frameLocator('#page-frame');
    for(const label of ['Services','Our work','Get a quote']){
     const link=frame.locator('.customer-links').getByRole('link',{name:label,exact:true});
     const href=await link.getAttribute('href');await link.click();
     const child=viewer.frames().find(f=>f.parentFrame());
     await child.waitForFunction(h=>{const r=document.querySelector(h).getBoundingClientRect();return r.top<innerHeight&&r.bottom>0},href);
     assert.equal(child.url(),'about:srcdoc',kind+' must scroll without navigating the iframe');
     assert.equal(await child.evaluate(()=>{try{return parent.document===document}catch{return false}}),false,'Published frame must remain isolated from the app');
     clicks++;
    }
    assert.deepEqual(errors,[],kind+' CSP errors');await viewer.close();
   }
  }
  console.log('PASS '+clicks+' section-link clicks in customer modal and published sandbox, including existing saved exports at phone and desktop sizes.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
