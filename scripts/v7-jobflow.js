(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  function growth(){return window.EzyGrowth}
  function ensureCompletedOptions(root=document){
    root.querySelectorAll('#live-leads-list select,#lead-list select').forEach(select=>{
      if(![...select.options].some(o=>o.value==='Completed')){const o=document.createElement('option');o.value='Completed';o.textContent='Completed';select.appendChild(o)}
    });
    root.querySelectorAll('#live-leads-list .lead p').forEach(p=>p.style.whiteSpace='pre-line');
  }
  function ensureGrowthPanel(){
    if($('ezy-growth-panel'))return;
    const live=$('live-leads-list');if(!live)return;
    const panel=document.createElement('section');panel.id='ezy-growth-panel';panel.className='ezy-growth-panel';
    panel.innerHTML='<span class="ezy-growth-badge">WEBSITE GROWTH LOOP</span><h3>Turn completed jobs into proof</h3><p class="muted">Mark a JobFlow enquiry as <strong>Completed</strong>, then turn it into a project card for your website. Private customer details stay private.</p><div class="actions"><button class="btn" id="ezy-growth-refresh">Load completed jobs</button></div><div id="ezy-growth-list" class="ezy-growth-grid"></div><p id="ezy-growth-status" class="muted"></p>';
    live.parentNode.appendChild(panel);$('ezy-growth-refresh').onclick=loadCompletedJobs;
  }
  async function loadCompletedJobs(){
    ensureGrowthPanel();const box=$('ezy-growth-list'),status=$('ezy-growth-status'),g=growth();if(!box)return;
    if(!window.ezyCloudId||!g?.client){status.textContent='Sign in and open a cloud website first.';return}
    status.textContent='Loading completed jobs…';const session=await g.getSession();if(!session){status.textContent='Your login is not available yet.';return}
    const {data:rows,error}=await g.client.from('enquiries').select('id,customer_name,customer_contact,message,status,created_at').eq('website_id',window.ezyCloudId).eq('status','Completed').order('created_at',{ascending:false}).limit(100);
    if(error){status.textContent='Could not load completed jobs: '+error.message;return}
    box.replaceChildren();const items=rows||[];if(!items.length){status.textContent='No completed jobs yet. Change a JobFlow enquiry to Completed, then refresh.';return}
    status.textContent=items.length+' completed job'+(items.length===1?'':'s')+' ready to turn into website proof.';
    items.forEach(item=>{
      const details=g.parseQuote(item.message),card=document.createElement('div');card.className='ezy-growth-job';
      const title=document.createElement('strong');title.textContent=(details.service||'Completed job')+(details.area?' · '+details.area:'');
      const p=document.createElement('p');p.textContent=item.message;
      const button=document.createElement('button');button.className='btn';button.textContent='✨ Add this job to my website';
      button.onclick=async()=>{button.disabled=true;try{const added=await g.addWebsiteProject(item,details);if(added)status.textContent='✓ Project added to the website preview. Save and republish when you are happy with it.'}finally{button.disabled=false}};
      card.append(title,p,button);box.append(card);
    });
  }
  const observer=new MutationObserver(()=>ensureCompletedOptions());
  if($('live-leads-list'))observer.observe($('live-leads-list'),{childList:true,subtree:true});
  if($('lead-list'))observer.observe($('lead-list'),{childList:true,subtree:true});
  document.addEventListener('change',e=>{if(e.target?.matches?.('#live-leads-list select')&&e.target.value==='Completed')setTimeout(loadCompletedJobs,900)});
  ensureCompletedOptions();ensureGrowthPanel();
  const leadTab=document.querySelector('nav button[data-tab="leads"]');if(leadTab)leadTab.addEventListener('click',()=>setTimeout(()=>{ensureGrowthPanel();ensureCompletedOptions();loadCompletedJobs()},350));
  console.info('EzySouth V7 JobFlow Growth Loop UI active');
})();
