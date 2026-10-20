/* Ezysouth JobFlow staging secure sharing UI */
(()=>{
'use strict';
const PROJECT_URL='https://anldjuaqlpowwodlphqf.supabase.co';
const KEY='sb_publishable_VMqyyOF5j2vNL4vOtW1_Og_w_wfUyKt';
const API=PROJECT_URL+'/functions/v1/jobflow-document-delivery';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=c=>new Intl.NumberFormat('en-NZ',{style:'currency',currency:'NZD'}).format(Number(c||0)/100);
const client=window.supabase?.createClient(PROJECT_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let current=null,user=null,link='',emailEnabled=false,busy=false,loadSequence=0;
const modal=$('share-modal');
if(!modal||!client)return;
function message(text,error=false){$('share-message').textContent=text;$('share-message').style.color=error?'#a33a31':'#246245'}
function close(){if(busy)return;loadSequence++;modal.hidden=true;current=null;link='';$('share-result').hidden=true;message('')}
async function request(action,options){
 const {data:{session},error}=await client.auth.getSession();
 if(error||!session?.access_token)throw Error('Sign in to JobFlow to share this document.');
 const response=await fetch(API,{method:'POST',
  headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':KEY},
  body:JSON.stringify({action,...options})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'The sharing service could not complete your request.');
 return data;
}
async function loadHistory(){
 if(!current||!user)return;
 const {data,error}=await client.from('jobflow_document_deliveries')
  .select('id,recipient_email,status,created_at,expires_at,revoked_at,opened_at,quote_response,quote_response_name,quote_responded_at')
  .eq('owner_id',user.id).eq('document_id',current.id).order('created_at',{ascending:false}).limit(25);
 if(error)throw error;
 $('share-history').innerHTML=!data?.length?'<p class="share-helper">No sharing history yet.</p>':data.map(d=>{
  const revoked=!!d.revoked_at,expired=new Date(d.expires_at).getTime()<Date.now();
  const label=d.quote_response?'Quote '+d.quote_response.toLowerCase():revoked?'Revoked':expired?'Expired':d.status==='sent'?'Email accepted':d.status==='prepared'?'Link created':d.status==='pending'?'Sending…':'Failed';
  const right=!revoked&&!expired&&['sent','prepared'].includes(d.status)?'<button class="mini" data-revoke="'+esc(d.id)+'" type="button">Revoke</button>':'';
  return '<div class="share-row"><div><strong>'+esc(label)+'</strong> · '+esc(d.recipient_email||'Copyable link')+
   '<small>'+esc(d.quote_response_name&&d.quote_response?d.quote_response_name+' · ':'')+esc(d.quote_responded_at?new Date(d.quote_responded_at).toLocaleString('en-NZ'):new Date(d.created_at).toLocaleString('en-NZ'))+(d.opened_at?' · Opened':'')+'</small></div>'+right+'</div>';
 }).join('');
}
async function perform(action){
 if(!current||busy)return;
 const email=$('share-email').value.trim();
 if((action==='send'||email!=='')&&(!email||!$('share-email').checkValidity())){message('Enter a valid customer email for email delivery, or clear the field to create a link.',true);$('share-email').focus();return}
 if(action==='send'&&!confirm('Send '+current.number+' to '+email+'? This sends a real email.'))return;
 busy=true;$('share-prepare').disabled=true;$('share-send').disabled=true;
 message(action==='send'?'Submitting email…':'Creating private link…');
 try{
  const data=await request(action,{documentId:current.id,email});
  if(action==='prepare'){
   link=data.link;
   $('share-link').value=link;
   $('share-preview').href=link;
   const subject=(current.document_type==='quote'?'Quote ':'Invoice ')+current.number+' from '+current.business_name;
   const body='Hello '+current.customer_name+',\n\n'+current.business_name+' has shared '+(current.document_type==='quote'?'a quote':'an invoice')+' for you to review.\n\nYour private document link:\n'+link+'\n\nThis link expires in 14 days.\n\nKind regards,\n'+current.business_name;
   $('share-mailto').href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
   $('share-result').hidden=false;
   message('Link created. Copy it or open your email app. JobFlow has not sent an email.');
  }else{
   message('Email accepted for sending to '+email+'.'+(data.warning?' '+data.warning:''));
   window.dispatchEvent(new Event('jobflow:deliverySent'));
  }
  await loadHistory();
 }catch(err){message(err?.message||'Sharing failed.',true)}
 finally{busy=false;$('share-prepare').disabled=false;$('share-send').disabled=false}
}
window.jobflowShare=async id=>{
 const sequence=++loadSequence;
 // Show the modal immediately on click, before doing any network request.
 modal.hidden=false;current=null;link='';
 $('share-result').hidden=true;
 $('share-title').textContent='Share document';
 $('share-subtitle').textContent='Loading document details…';
 $('share-email').value='';
 $('share-prepare').disabled=true;
 $('share-send').hidden=true;
 $('share-edit').hidden=true;
 $('share-history').innerHTML='<p class="share-helper">Loading sharing history…</p>';
 message('Checking your document…');
 try{
  const {data:{user:account},error:authError}=await client.auth.getUser();
  if(sequence!==loadSequence||modal.hidden)return;
  if(authError||!account)throw Error('Sign in to JobFlow again to share this document.');
  user=account;
  const {data:doc,error}=await client.from('jobflow_documents').select('*').eq('owner_id',user.id).eq('id',id).single();
  if(sequence!==loadSequence||modal.hidden)return;
  if(error||!doc)throw Error('The document could not be found. Refresh your JobFlow documents and try again.');
  current=doc;
  $('share-title').textContent='Share '+(doc.document_type==='quote'?'quote':'invoice');
  $('share-subtitle').textContent=doc.number+' · '+doc.customer_name+(Number(doc.amount_cents)>0?' · '+money(doc.amount_cents):'');
  $('share-email').value=doc.customer_email||'';
  $('share-send').hidden=!emailEnabled;
  $('share-connection').textContent=emailEnabled?'Email delivery is connected. Send directly or copy a private link.':'Direct email is not connected yet. Create a private link, then copy it or use your email app.';
  const issue=!Number.isFinite(Number(doc.amount_cents))||Number(doc.amount_cents)<=0?'Set the document price before sharing.':
   doc.gst_treatment==='unspecified'?'Choose the GST treatment in the quote editor before sharing.':
   ['included','exclusive'].includes(doc.gst_treatment)&&!doc.business_gst_number?'Enter your business GST number in the quote editor before sharing.':
   doc.status==='Void'?'This document is void and cannot be shared.':'';
  $('share-prepare').disabled=!!issue;
  $('share-send').disabled=!!issue;
  $('share-edit').hidden=!issue||!(doc.status==='Draft'||(doc.document_type==='quote'&&doc.status==='Sent'&&doc.source_enquiry_id&&doc.amount_cents===null));
  message(issue||'Document ready. Choose Create secure link. A customer email is optional for copying the link.',!!issue);
  try{await loadHistory()}catch(historyError){message((issue?issue+'\n':'')+'Sharing history unavailable: '+historyError.message,!!issue)}
  if(!issue)$('share-email').focus();
 }catch(err){
  if(sequence!==loadSequence||modal.hidden)return;
  $('share-subtitle').textContent='';
  $('share-history').textContent='';
  message(err?.message||'Could not load the document for sharing.',true);
 }
};
$('share-prepare').addEventListener('click',()=>void perform('prepare'));
$('share-send').addEventListener('click',()=>void perform('send'));
$('share-close').addEventListener('click',close);
$('share-edit').addEventListener('click',()=>{
 if(!current)return;
 const id=current.id;
 close();
 const editButton=[...document.querySelectorAll('#records button[data-action="edit"]')].find(button=>button.dataset.id===id);
 if(editButton){editButton.click()}else{const top=document.getElementById('message');if(top){top.textContent='This document cannot be edited in its current status.';top.scrollIntoView({block:'center',behavior:'smooth'})}}
});
modal.addEventListener('click',e=>{if(e.target===modal)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
$('share-copy').addEventListener('click',async()=>{
 if(!link)return;
 try{await navigator.clipboard.writeText(link);message('Secure link copied.')}
 catch(e){$('share-link').focus();$('share-link').select();message('Link selected. Use Copy in your device’s menu.')}
});
$('share-history').addEventListener('click',e=>{
 const b=e.target.closest('button[data-revoke]');if(!b||busy)return;
 if(!confirm('Revoke this link? Anyone with it will lose access.'))return;
 busy=true;
 void (async()=>{
  try{await request('revoke',{deliveryId:b.dataset.revoke});link='';$('share-result').hidden=true;await loadHistory();message('Link revoked.')}
  catch(err){message(err?.message||'Revocation failed.',true)}
  finally{busy=false}
 })();
});
// Keep the owner-facing share history fresh while the panel is open.
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&current&&!busy)void loadHistory().catch(()=>{})});
fetch(API+'?capabilities=1',{cache:'no-store'})
.then(async r=>{const d=await r.json();emailEnabled=r.ok&&d.emailEnabled===true;if(current&&!modal.hidden)$('share-send').hidden=!emailEnabled})
.catch(()=>{emailEnabled=false});
})();
