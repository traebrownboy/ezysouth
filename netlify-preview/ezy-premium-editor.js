/* Ezysouth Web premium inline editor. Staging branch only.
 * Changes are applied to the existing data/design models and standard save/export workflow.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const dialog=$('ezy-inline-dialog'),form=$('ezy-inline-form'),fields=$('ezy-inline-fields');
if(!dialog||!form||!$('site'))return;
window.ezyPremiumInlineEditor=true;
let currentField=null,previousFocus=null,photoTarget=null;
const allowed={
 name:{label:'Business name',title:'Your business name',limit:120},
 headline:{label:'Headline',title:'Edit your headline',limit:150},
 description:{label:'Business introduction',title:'Your introduction',limit:1800,multi:true},
 location:{label:'Service area',title:'Where you work',limit:200},
 services:{label:'Services · one per line',title:'What you offer',limit:3000,multi:true},
 contact:{label:'Phone and email',title:'Contact information',dual:true},
 cta:{label:'Button text',title:'Your call to action',limit:80},
 reviews:{label:'Customer reviews · Review | Name per line',title:'Customer testimonials',limit:3000,multi:true},
 trust:{label:'Real credentials · one per line',title:'Why choose you',limit:1800,multi:true},
 photos:{label:'Work photos',title:'Manage your images',photos:true}
};
const targets=[
 ['[id$="pv-name"]','name'],
 ['[id$="pv-heading"]','headline'],
 ['[id$="pv-desc"]','description'],
 ['[id$="pv-location"]','location'],
 ['[id$="pv-services"]','services'],
 ['#customer-services h2','services'],
 ['[id$="pv-contact-details"]','contact'],
 ['.hero .site-cta','cta'],
 ['.customer-hero-photo','photos'],
 ['#customer-work .gallery-grid','photos'],
 ['#customer-work h2','photos'],
 ['#customer-reviews h2','reviews'],
 ['#customer-reviews .review-grid','reviews'],
 ['.trust-section h2','trust'],
 ['.trust-section .trust-grid','trust']
];
function decorate(site){
 if(!site)return;
 site.classList.add('ezy-live-edit');
 for(const [selector,key] of targets){
  site.querySelectorAll(selector).forEach(node=>{
   node.dataset.ezyInline=key;
   node.title='Click to edit '+allowed[key].label.toLowerCase();
   if(!node.matches('a,button,input,textarea,select')){
    node.setAttribute('tabindex','0');
    node.setAttribute('role','button');
    node.setAttribute('aria-label','Edit '+allowed[key].label);
   }
  });
 }
}
// Annotate dynamic sections once the existing renderer finishes creating them.
const priorRenderDesignSite=renderDesignSite;
renderDesignSite=function(...args){
 const result=priorRenderDesignSite.apply(this,args);
 decorate($('site'));
 // Guided preview is a clone, so redraw it when content changes on step 3.
 const guided=document.querySelector('[data-v56-panel="2"].active');
 if(guided&&$('v56-live-preview')){
  $('v56-live-preview').replaceChildren(customerPreviewClone('v56-live-preview'));
 }
 return result;
};
const priorPreviewClone=customerPreviewClone;
customerPreviewClone=function(id){
 decorate($('site'));
 const clone=priorPreviewClone(id);
 decorate(clone);
 return clone;
};
// Old code creates previews before this script runs. Upgrade those too.
decorate($('site'));
for(const id of ['v56-live-preview','design-preview','chat-preview']){
 $(id)?.querySelectorAll('.site').forEach(decorate);
}
// Turn on the existing desktop click-to-edit toggle. User can still turn it off.
if($('direct-edit')&&!editEnabled)$('direct-edit').click();
function close(){
 dialog.hidden=true;
 currentField=null;photoTarget=null;
 fields.replaceChildren();
 $('ezy-inline-status').textContent='';
 if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 previousFocus=null;
}
function fieldRow(name,value,multi=false,limit=200){
 const wrap=document.createElement('div');
 wrap.className='field';
 const label=document.createElement('label');
 label.setAttribute('for','ezy-in-'+name);
 label.textContent=name==='phone'?'Phone number':name==='email'?'Email address':allowed[name]?.label||name;
 const el=document.createElement(multi?'textarea':'input');
 el.id='ezy-in-'+name;
 el.name=name;
 el.maxLength=limit;
 el.value=value||'';
 el.autocomplete='off';
 if(multi)el.rows=6;
 if(name==='email')el.type='email';
 wrap.append(label,el);
 if(name==='services'||name==='reviews'||name==='trust'){
  const hint=document.createElement('p');
  hint.className='ezy-inline-hint';
  hint.textContent=name==='reviews'?'Use only real approved reviews. Example: Excellent service | Jamie':name==='trust'?'Only include genuine credentials and guarantees.':'One service per line. These appear as cards or rows, depending on your layout.';
  wrap.append(hint);
 }
 return wrap;
}
function open(key,source,clicked=source){
 const config=allowed[key];if(!config)return;
 previousFocus=source||document.activeElement;
 currentField=key;
 photoTarget=null;
 if(key==='photos'){
  const image=clicked?.closest?.('.gallery-grid img');
  if(image){
   const peers=Array.from(image.closest('.gallery-grid')?.querySelectorAll('img')||[]);
   photoTarget={index:peers.indexOf(image),url:image.currentSrc||image.src||''};
  }else if(clicked?.closest?.('.customer-hero-photo')){
   photoTarget={index:0,url:''};
  }
  $('ezy-inline-replace').hidden=!photoTarget;
 }
 $('ezy-inline-title').textContent=config.title;
 $('ezy-inline-status').textContent='';
 fields.replaceChildren();
 const isPhoto=!!config.photos;
 form.hidden=isPhoto;
 $('ezy-inline-photo-actions').hidden=!isPhoto;
 if(!isPhoto){
  if(config.dual){
   fields.append(fieldRow('phone',data.phone||'',false,100));
   fields.append(fieldRow('email',data.email||'',false,200));
  }else{
   const value=key==='cta'?design.cta:key==='reviews'?design.reviews:key==='trust'?design.trust:key==='headline'?(data.headline||heading()):data[key];
   fields.append(fieldRow(key,value||'',!!config.multi,config.limit));
  }
 }
 dialog.hidden=false;
 (fields.querySelector('input,textarea')||$('ezy-inline-upload')).focus();
}
function changed(key,value){
 if(['cta','reviews','trust'].includes(key))design[key]=value;
 else data[key]=value;
}
function persistAndRender(){
 // Design and business information go through the same persistence as existing fields.
 save();
 try{localStorage.setItem('launchpad-v4-design',JSON.stringify(design))}
 catch(err){$('edit-hint').textContent='Browser storage is unavailable. Save the website to the cloud before leaving.'}
 render();
 renderDesignPreview();
 const guided=$('v56-live-preview');
 if(guided&&document.querySelector('[data-v56-panel="2"].active')){
  guided.replaceChildren(customerPreviewClone('v56-live-preview'));
 }
 if($('design-cta'))$('design-cta').value=design.cta||'';
 if($('design-reviews'))$('design-reviews').value=design.reviews||'';
 if($('design-trust'))$('design-trust').value=design.trust||'';
}
form.addEventListener('submit',event=>{
 event.preventDefault();
 if(!currentField)return;
 const k=currentField;
 const entry=name=>fields.querySelector('[name="'+name+'"]')?.value.trim()||'';
 if(k==='contact'){
  const email=entry('email');
  if(email&&!fields.querySelector('[name="email"]').checkValidity()){
   $('ezy-inline-status').textContent='Please enter a valid email address.';return;
  }
  changed('phone',entry('phone'));changed('email',email);
 }else{
  const value=entry(k);
  if(['name','headline','cta'].includes(k)&&!value){
   $('ezy-inline-status').textContent='Please enter some text before saving.';return;
  }
  changed(k,value);
 }
 try{persistAndRender();close()}
 catch(err){$('ezy-inline-status').textContent='Could not save: '+(err.message||String(err))}
});
$('ezy-inline-close').addEventListener('click',close);
$('ezy-inline-cancel').addEventListener('click',close);
dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!dialog.hidden){event.preventDefault();close();return}
 if(dialog.hidden)return;
 if(event.key==='Enter'&&!event.shiftKey&&event.target.matches('input')){
  event.preventDefault();form.requestSubmit();
 }
});
$('ezy-inline-replace').addEventListener('click',()=>{
 if(photoTarget)$('ezy-inline-replace-file').click();
});
$('ezy-inline-replace-file').addEventListener('change',async event=>{
 const file=event.target.files?.[0];
 event.target.value='';
 if(!file||!photoTarget)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>16*1024*1024){
  $('ezy-inline-status').textContent='Choose a JPG, PNG or WebP image under 16 MB.';return;
 }
 const button=$('ezy-inline-replace');
 button.disabled=true;
 const previous=uploadedPhotos.slice(),previousLinks=design.photos;
 const selection={...photoTarget};
 try{
  const resized=await resizePhoto(file);
  if(selection.index>=0&&selection.index<uploadedPhotos.length){
   uploadedPhotos[selection.index]=resized;
  }else{
   // An external image lives in the URL list; remove its URL and use the uploaded replacement.
   const links=design.photos.split('\n').map(v=>v.trim()).filter(Boolean);
   const externalIndex=selection.index-uploadedPhotos.length;
   if(externalIndex>=0&&externalIndex<links.length){
    links.splice(externalIndex,1);
    design.photos=links.join('\n');
   }
   if(uploadedPhotos.length>=12)throw Error('Your gallery is full. Remove an image before replacing this one.');
   uploadedPhotos.unshift(resized);
  }
  await savePhotos();
  try{localStorage.setItem('launchpad-v4-design',JSON.stringify(design))}catch(err){}
  refreshPhotos();
  $('photo-status').textContent='✓ Photo replaced and saved on this device.';
  close();
 }catch(err){
  uploadedPhotos=previous;design.photos=previousLinks;
  $('ezy-inline-status').textContent='Photo replacement failed: '+(err.message||String(err));
 }finally{button.disabled=false}
});
$('ezy-inline-upload').addEventListener('click',()=>{
 close();
 const upload=$('photo-upload');
 if(upload)upload.click();
});
$('ezy-inline-gallery').addEventListener('click',()=>{
 close();
 const button=document.querySelector('nav button[data-tab="design"]');
 button?.click();
 const upload=$('photo-upload');
 upload?.scrollIntoView({behavior:'smooth',block:'center'});
});
// Dynamic cloned previews all delegate to the existing page, so no stale click handlers.
function handleClick(event,root){
 if(root.id==='site'&&!editEnabled)return;
 const node=event.target.closest('[data-ezy-inline]');
 if(!node||!root.contains(node))return;
 if(!allowed[node.dataset.ezyInline])return;
 event.preventDefault();
 event.stopPropagation();
 open(node.dataset.ezyInline,node,event.target);
}
const roots=[$('site'),$('v56-live-preview'),$('design-preview')].filter(Boolean);
for(const root of roots){
 root.addEventListener('click',event=>handleClick(event,root));
 root.addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;
  const node=event.target.closest('[data-ezy-inline]');
  if(!node||!root.contains(node))return;
  event.preventDefault();
  event.stopPropagation();
  open(node.dataset.ezyInline,node,event.target);
 });
}
// Keep the existing guided three-step layout library up to date when opening the preview.
// The rendering function already rebuilds chosen layout from a shared site model.
const hub=$('v56-hub');
if(hub)hub.addEventListener('click',event=>{
 if(!event.target.closest('[data-v56-next],[data-v56-step],[data-v56-template]'))return;
 queueMicrotask(()=>{
  const step3=document.querySelector('[data-v56-panel="2"].active');
  if(step3&&$('v56-live-preview'))$('v56-live-preview').replaceChildren(customerPreviewClone('v56-live-preview'));
 });
});
})();
