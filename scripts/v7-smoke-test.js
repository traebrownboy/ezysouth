const fs=require('fs');
const {JSDOM}=require('jsdom');

function assert(ok,msg){if(!ok)throw new Error(msg)}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}

(async()=>{
  const html=fs.readFileSync('dist/index.html','utf8');
  const prompts=['Bathroom renovation','Invercargill','Completed bathroom renovation with a clean finish.'];
  assert(html.includes("['New','Quote needed','Quote sent','Won','Completed','Lost']"),'Completed is not a native JobFlow status in the production build');
  const dom=new JSDOM(html,{
    url:'https://preview.test/',
    runScripts:'dangerously',
    pretendToBeVisual:true,
    beforeParse(window){
      window.alert=()=>{};
      window.confirm=()=>false;
      window.prompt=()=>prompts.shift()??'';
      window.open=()=>null;
      window.CSS=window.CSS||{};
      window.CSS.escape=window.CSS.escape||((s)=>String(s).replace(/[^a-zA-Z0-9_-]/g,'\\$&'));
      window.requestAnimationFrame=window.requestAnimationFrame||((cb)=>setTimeout(()=>cb(Date.now()),0));
      window.cancelAnimationFrame=window.cancelAnimationFrame||clearTimeout;
      window.HTMLElement.prototype.scrollIntoView=function(){};
    }
  });
  const w=dom.window;
  await wait(700);

  assert(w.EzyGrowth?.VERSION==='7.0','Growth Loop core did not initialise');
  assert(w.document.getElementById('ezy-growth-panel'),'Growth Loop panel missing');

  const live=w.document.getElementById('live-leads-list');
  const fake=w.document.createElement('div');
  fake.className='lead';fake.innerHTML='<select><option>New</option></select>';
  live.replaceChildren(fake);
  await wait(30);
  assert([...fake.querySelector('select').options].some(o=>o.value==='Completed'),'Completed status was not available in JobFlow');

  const service=w.document.getElementById('services');
  service.value='Bathroom renovations\nHot water cylinders';
  service.dispatchEvent(new w.Event('input',{bubbles:true}));
  w.ezyLiveSiteId='11111111-1111-4111-8111-111111111111';

  let exported=w.exportSite();
  let out=new JSDOM(exported).window.document;
  assert(out.querySelector('#ezysouth-quote'),'QuoteFlow form missing from export');
  assert(out.querySelector('[name="service"]'),'QuoteFlow service selector missing');
  assert(out.querySelector('[name="job_area"]'),'QuoteFlow area field missing');
  assert(out.querySelector('[name="urgency"]'),'QuoteFlow urgency field missing');
  assert(out.querySelector('[name="preferred_date"]'),'QuoteFlow preferred-date field missing');
  assert([...out.querySelectorAll('[name="service"] option')].some(o=>o.textContent==='Bathroom renovations'),'Business services were not added to QuoteFlow');

  await w.EzyGrowth.addWebsiteProject(
    {id:'smoke-1',customer_name:'PRIVATE CUSTOMER',customer_contact:'021 SECRET'},
    {service:'Bathroom renovation',area:'Invercargill',details:'Completed work'}
  );
  exported=w.exportSite();
  out=new JSDOM(exported).window.document;
  assert(out.querySelector('.ezy-project-section'),'Recent Projects section missing after completed job approval');
  assert(out.body.textContent.includes('Bathroom renovation'),'Approved project title missing');
  assert(!exported.includes('PRIVATE CUSTOMER'),'Customer name leaked into public website');
  assert(!exported.includes('021 SECRET'),'Customer contact leaked into public website');

  console.log('V7 smoke test passed: native Completed status, QuoteFlow, project proof and privacy checks OK');
  dom.window.close();
})().catch(err=>{console.error(err.stack||err);process.exit(1)});
