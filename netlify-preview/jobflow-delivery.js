/* Ezysouth JobFlow staging secure sharing UI */
(()=>{
'use strict';
const URL='https://anldjuaqlpowwodlphqf.supabase.co';
const KEY='sb_publishable_VMqyyOF5j2vNL4vOtW1_Og_w_wfUyKt';
const API=URL+'/functions/v1/jobflow-document-delivery';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=c=>new Intl.NumberFormat('en-NZ',{style:'currency',currency:'NZD'}).format(Number(c||0)/100);
const client=window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let current=null,user=null,link='',emailEnabled=false,busy=false;
const modal=$('share-modal');
if(!modal||!client)return;
function message(text,error=false){$('share-message').textContent=text;$('share-message').style.color=error?'#a33a31':'#246245'}
function close(){if(busy)return;modal.hidden=true;current=null;link='';$('share-result').hidden=true;message('')}
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
  .select('id,recipient_email,status,created_at,expires_at,revoked_at,opened_at')
  .eq('owner_id',user.id).eq('document_id',current.id).order('created_at',{ascending:false}).limit(25);
 if(error)throw error;
 $('share-history').innerHTML=!data?.length?'<p class="share-helper">No sharing history yet.</p>':data.map(d=>{
  const revoked=!!d.revoked_at,expired=new Date(d.expires_at).getTime()<Date.now();
  const label=revoked?'Revoked':expired?'Expired':d.status==='sent'?'Email accepted':d.status==='prepared'?'Link created':d.status==='pending'?'Sending…':'Failed';
  const right=!revoked&&!expired&&['sent','prepared'].includes(d.status)?'<button class="mini" data-revoke="'+esc(d.id)+'" type="button">Revoke</button>':'';
  return '<div class="share-row"><div><strong>'+esc(label)+'</strong> · '+esc(d.recipient_email)+
   '<small>'+esc(new Date(d.created_at).toLocaleString('en-NZ'))+(d.opened_at?' · Opened':'')+'</small></div>'+right+'</div>';
 }).join('');
}
async function perform(action){
 if(!current||busy)return;
 const email=$('share-email').value.trim();
 if(!email||!$('share-email').checkValidity()){message('Enter a valid customer email address.',true);$('share-email').focus();return}
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
 try{
  const {data:{user:account},error:authError}=await client.auth.getUser();
  if(authError||!account)throw Error('Sign in to JobFlow first.');
  user=account;
  const {data:doc,error}=await client.from('jobflow_documents').select('*').eq('owner_id',user.id).eq('id',id).single();
  if(error||!doc)throw Error('The document could not be found.');
  if(!Number.isFinite(Number(doc.amount_cents))||Number(doc.amount_cents)<=0)throw Error('Complete pricing before sharing this document.');
  if(doc.gst_treatment==='unspecified')throw Error('Choose the GST treatment first.');
  if(['included','exclusive'].includes(doc.gst_treatment)&&!doc.business_gst_number)throw Error('Enter the business GST number first.');
  current=doc;link='';
  $('share-title').textContent='Share '+(doc.document_type==='quote'?'quote':'invoice');
  $('share-subtitle').textContent=doc.number+' · '+doc.customer_name+' · '+money(doc.amount_cents);
  $('share-email').value=doc.customer_email||'';
  $('share-result').hidden=true;message('');modal.hidden=false;
  $('share-send').hidden=!emailEnabled;
  $('share-connection').textContent=emailEnabled?'Email delivery is connected. Send directly or share a private link.':'Direct email requires a verified sending domain. Secure links and your own email app are ready.';
  try{await loadHistory()}catch(error){message('Sharing history unavailable: '+error.message,true)}
  $('share-email').focus();
 }catch(err){
  const box=$('message');if(box){box.textContent=err?.message||'Sharing could not be opened.';}
 }
};
$('share-prepare').addEventListener('click',()=>void perform('prepare'));
$('share-send').addEventListener('click',()=>void perform('send'));
$('share-close').addEventListener('click',close);
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
fetch(API+'?capabilities=1',{cache:'no-store'})
.then(async r=>{const d=await r.json();emailEnabled=r.ok&&d.emailEnabled===true})
.catch(()=>{emailEnabled=false});
})();
