(function(){
  'use strict';
  const VERSION='7.0';
  const SUPABASE_URL='https://ezcmfbaoivdwkgayznbt.supabase.co';
  const SUPABASE_KEY='sb_publishable_f4Pl6Lxlre4k1kV1G6dRLg_RGuYOY03';
  const LOCAL_KEY='ezysouth-v7-showcase';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let showcase=[];
  let loadedCloudId=null;
  let growthClient=null;
  try{showcase=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]');if(!Array.isArray(showcase))showcase=[]}catch(e){showcase=[]}
  try{if(window.supabase?.createClient)growthClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}})}catch(e){console.warn('Growth Loop cloud client unavailable',e)}

  function persistLocal(){try{localStorage.setItem(LOCAL_KEY,JSON.stringify(showcase))}catch(e){console.warn('Showcase local save failed',e)}}
  function parseQuote(message){
    const result={};
    String(message||'').split(/\n+/).forEach(line=>{const m=line.match(/^([^:]{2,30}):\s*(.*)$/);if(m)result[m[1].trim().toLowerCase()]=m[2].trim()});
    return result;
  }
  function projectSection(){
    const section=document.createElement('section');section.className='site-section v4-section ezy-project-section';
    const h=document.createElement('h2');h.textContent='Recent projects';section.appendChild(h);
    const grid=document.createElement('div');grid.className='ezy-project-grid';
    showcase.slice(0,12).forEach(p=>{
      const card=document.createElement('article');card.className='ezy-project-card';
      if(p.image){const img=document.createElement('img');img.src=p.image;img.alt=p.title||'Completed project';img.loading='lazy';card.appendChild(img)}
      const copy=document.createElement('div');copy.className='ezy-project-copy';
      if(p.location){const loc=document.createElement('div');loc.className='ezy-project-location';loc.textContent=p.location;copy.appendChild(loc)}
      const title=document.createElement('h3');title.textContent=p.title||'Completed project';copy.appendChild(title);
      if(p.description){const desc=document.createElement('p');desc.textContent=p.description;copy.appendChild(desc)}
      card.appendChild(copy);grid.appendChild(card);
    });
    section.appendChild(grid);return section;
  }
  function drawShowcase(){
    const site=$('site');if(!site)return;
    site.querySelectorAll('.ezy-project-section').forEach(x=>x.remove());
    if(!showcase.length)return;
    const contact=site.querySelector('#pv-contact');const section=projectSection();
    if(contact)site.insertBefore(section,contact);else site.appendChild(section);
  }
  function refreshEverywhere(){
    drawShowcase();
    try{renderDesignPreview?.()}catch(e){}
    try{renderChatPreview?.()}catch(e){}
    drawShowcaseManager();
  }
  if(typeof renderDesignSite==='function'){
    const previous=renderDesignSite;
    renderDesignSite=function(){previous.apply(this,arguments);drawShowcase()};
  }

  function ensureDesignManager(){
    if($('ezy-showcase-manager'))return;
    const design=$('design');if(!design)return;
    const panel=document.createElement('section');panel.id='ezy-showcase-manager';panel.className='v56-tool';
    panel.innerHTML='<h3>✨ JobFlow website projects</h3><p class="muted">Completed jobs you approve can become project proof on your website. Customer names and contact details are never published automatically.</p><div id="ezy-showcase-list" class="ezy-showcase-list"></div><p id="ezy-showcase-status" class="muted"></p>';
    design.insertBefore(panel,design.firstChild);
  }
  function drawShowcaseManager(){
    ensureDesignManager();const box=$('ezy-showcase-list');if(!box)return;box.replaceChildren();
    if(!showcase.length){box.textContent='No completed jobs added to the website yet.';return}
    showcase.forEach((p,i)=>{
      const row=document.createElement('div');row.className='ezy-showcase-row';
      const info=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=p.title||'Completed project';small.textContent=p.location||'No public location';info.append(strong,small);
      const actions=document.createElement('div');actions.className='actions';actions.style.margin='0';
      const remove=document.createElement('button');remove.className='btn secondary';remove.textContent='Remove';remove.onclick=async()=>{if(!confirm('Remove this project from the website?'))return;showcase.splice(i,1);persistLocal();refreshEverywhere();await saveShowcaseToCloud()};
      actions.append(remove);row.append(info,actions);box.append(row);
    });
  }

  async function getSession(){if(!growthClient)return null;const {data,error}=await growthClient.auth.getSession();if(error)return null;return data?.session||null}
  async function loadShowcaseFromCloud(force=false){
    const id=window.ezyCloudId;if(!id||!growthClient)return;
    if(!force&&loadedCloudId===id)return;
    const session=await getSession();if(!session)return;
    const {data:record,error}=await growthClient.from('websites').select('content').eq('id',id).maybeSingle();if(error||!record)return;
    const remote=record.content?.showcaseProjects;showcase=Array.isArray(remote)?remote:[];loadedCloudId=id;persistLocal();refreshEverywhere();
  }
  async function saveShowcaseToCloud(){
    const id=window.ezyCloudId;if(!id||!growthClient)return;
    const session=await getSession();if(!session)return;
    const {data:record,error}=await growthClient.from('websites').select('content').eq('id',id).maybeSingle();if(error||!record)return;
    const content={...(record.content||{}),showcaseProjects:showcase};
    const {error:updateError}=await growthClient.from('websites').update({content,updated_at:new Date().toISOString()}).eq('id',id);
    if(updateError)console.warn('Showcase cloud save failed',updateError.message);else loadedCloudId=id;
  }
  window.addEventListener('ezy:state',()=>setTimeout(()=>loadShowcaseFromCloud(),180));

  function wrapCloudButton(id){
    const btn=$(id);if(!btn||btn.dataset.ezyV7Wrapped)return;btn.dataset.ezyV7Wrapped='1';const original=btn.onclick;if(typeof original!=='function')return;
    btn.onclick=async function(e){const result=await original.call(this,e);await saveShowcaseToCloud();return result};
  }
  ['cloud-save','cloud-new','ezysouth-oneclick'].forEach(wrapCloudButton);
  const newBtn=$('project-new');if(newBtn&&typeof newBtn.onclick==='function'){
    const oldNew=newBtn.onclick;newBtn.onclick=async function(e){const result=await oldNew.call(this,e);if(!window.ezyCloudId){showcase=[];loadedCloudId=null;persistLocal();refreshEverywhere()}return result};
  }

  function quoteFlowHtml(){
    const services=String(data?.services||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,30);
    const options=['<option value="">Choose a service</option>'].concat(services.map(s=>'<option>'+esc(s)+'</option>')).join('');
    return '<section id="ezysouth-quote" style="max-width:760px;margin:32px auto;padding:clamp(20px,4vw,34px);border:1px solid #dce3e7;border-radius:20px;background:#fff;box-shadow:0 14px 40px #10203010">'+
      '<div style="display:inline-block;padding:5px 9px;border-radius:999px;background:#e7f7ed;color:#286346;font-size:11px;font-weight:850;letter-spacing:.05em">QUOTEFLOW</div><h2 style="margin:10px 0 6px">Tell us about your job</h2><p style="color:#64748b;margin-top:0">A few useful details now means a faster, more accurate reply.</p>'+
      '<form id="ezysouth-enquiry"><label>What do you need?<select name="service" required style="display:block;width:100%;padding:12px;margin:8px 0 16px">'+options+'</select></label>'+
      '<label>Where is the job?<input name="job_area" maxlength="160" required placeholder="Suburb, town or area" style="display:block;width:100%;padding:12px;margin:8px 0 16px"></label>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px"><label>How urgent is it?<select name="urgency" required style="display:block;width:100%;padding:12px;margin:8px 0 16px"><option value="">Choose urgency</option><option>Emergency / ASAP</option><option>Within a few days</option><option>Within 1–2 weeks</option><option>Flexible</option></select></label><label>Preferred date (optional)<input name="preferred_date" type="date" style="display:block;width:100%;padding:12px;margin:8px 0 16px"></label></div>'+
      '<label>Your name<input name="customer_name" maxlength="120" required style="display:block;width:100%;padding:12px;margin:8px 0 16px"></label><label>Email or phone<input name="customer_contact" maxlength="200" minlength="3" required style="display:block;width:100%;padding:12px;margin:8px 0 16px"></label><label>Anything else we should know?<textarea name="details" minlength="5" maxlength="2200" required placeholder="Size of the job, access, measurements, what has happened, or anything else useful" style="display:block;width:100%;padding:12px;margin:8px 0 16px;min-height:120px"></textarea></label><p style="font-size:12px;color:#718096">Need to send photos? Mention them here and the business can ask for them when they reply. Customer photo upload is coming in a later QuoteFlow update.</p><div style="position:absolute;left:-10000px" aria-hidden="true"><label>Leave blank<input name="company_website" tabindex="-1" autocomplete="off"></label></div><button type="submit" style="padding:14px 24px;background:#183d50;color:white;border:0;border-radius:10px;font-weight:800">Send job request</button><p id="ezysouth-enquiry-status" role="status" style="min-height:20px"></p></form></section>';
  }
  function quoteFlowScript(siteId){
    return '(function(){const f=document.getElementById("ezysouth-enquiry"),out=document.getElementById("ezysouth-enquiry-status");if(!f)return;f.addEventListener("submit",async e=>{e.preventDefault();const b=f.querySelector("button");b.disabled=true;out.textContent="Sending…";const message=["Service: "+f.elements.service.value,"Area: "+f.elements.job_area.value,"Urgency: "+f.elements.urgency.value,f.elements.preferred_date.value?"Preferred date: "+f.elements.preferred_date.value:"","Details: "+f.elements.details.value.trim()].filter(Boolean).join("\\n");const body={website_id:'+JSON.stringify(siteId)+',customer_name:f.elements.customer_name.value.trim(),customer_contact:f.elements.customer_contact.value.trim(),message,company_website:f.elements.company_website.value.trim()};try{const r=await fetch("https://ezcmfbaoivdwkgayznbt.supabase.co/functions/v1/submit-enquiry",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"omit",body:JSON.stringify(body)});const result=await r.json().catch(()=>({}));if(!r.ok)throw Error(result.error||"Could not send your job request. Please contact the business directly.");f.reset();out.textContent=result.message||"Thanks! Your job request was sent."}catch(err){out.textContent=err.message||"Could not send your job request. Please contact the business directly."}finally{b.disabled=false}})})();';
  }
  if(typeof exportSite==='function'){
    const oldExport=exportSite;
    exportSite=function(){
      drawShowcase();let html=oldExport.apply(this,arguments);if(!window.ezyLiveSiteId)return html;
      try{
        const doc=new DOMParser().parseFromString(html,'text/html');const old=doc.getElementById('ezysouth-quote');if(!old)return html;
        [...doc.querySelectorAll('script')].filter(s=>s.textContent.includes('/functions/v1/submit-enquiry')).forEach(s=>s.remove());
        const holder=doc.createElement('div');holder.innerHTML=quoteFlowHtml();const fresh=holder.firstElementChild;old.replaceWith(fresh);
        const script=doc.createElement('script');script.textContent=quoteFlowScript(window.ezyLiveSiteId);fresh.insertAdjacentElement('afterend',script);
        return '<!doctype html>'+doc.documentElement.outerHTML;
      }catch(e){console.warn('QuoteFlow export fallback',e);return html}
    };
  }

  async function addWebsiteProject(item,details){
    if(showcase.some(p=>p.sourceEnquiryId===item.id)&&!confirm('This completed job is already on the website. Add another project card from it?'))return false;
    const title=prompt('Public project title',details.service||'Completed project');if(title===null)return false;
    const location=prompt('Public location (do not enter a private street address)',details.area||data?.location||'');if(location===null)return false;
    const initial=details.details||'Completed for a local customer.';const description=prompt('Short public description',initial);if(description===null)return false;
    const usePhoto=confirm('Add a work photo to this project? Choose OK to select one, or Cancel to publish the project without a photo.');let image='';
    if(usePhoto){
      const input=document.createElement('input');input.type='file';input.accept='image/*';input.style.display='none';document.body.appendChild(input);
      image=await new Promise(resolve=>{let settled=false;const done=v=>{if(settled)return;settled=true;input.remove();resolve(v)};input.onchange=async()=>{try{const f=input.files?.[0];if(!f){done('');return}if(typeof resizePhoto==='function'){const p=await resizePhoto(f);done(p.data||'')}else{const reader=new FileReader();reader.onload=()=>done(String(reader.result||''));reader.onerror=()=>done('');reader.readAsDataURL(f)}}catch(e){done('')}};input.click();setTimeout(()=>done(''),60000)});
    }
    showcase.unshift({id:'job-'+item.id+'-'+Date.now(),title:(title.trim()||'Completed project').slice(0,100),location:location.trim().slice(0,120),description:description.trim().slice(0,700),image,createdAt:Date.now(),sourceEnquiryId:item.id});
    showcase=showcase.slice(0,12);persistLocal();refreshEverywhere();await saveShowcaseToCloud();return true;
  }

  window.EzyGrowth={VERSION,client:growthClient,getSession,parseQuote,addWebsiteProject,loadShowcaseFromCloud,saveShowcaseToCloud,refreshEverywhere};
  setTimeout(()=>{refreshEverywhere();loadShowcaseFromCloud(true)},500);
  console.info('EzySouth V'+VERSION+' Growth Loop core active');
})();
