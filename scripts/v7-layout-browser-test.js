const fs=require('fs');
const path=require('path');
const puppeteer=require('puppeteer-core');

function assert(ok,msg){if(!ok)throw new Error(msg)}
const chromeCandidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const executablePath=process.env.CHROME_PATH||chromeCandidates.find(fs.existsSync);
if(!executablePath)throw new Error('Chrome/Chromium not found for layout audit');

(async()=>{
  const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-setuid-sandbox']});
  try{
    const builder=await browser.newPage();
    await builder.setViewport({width:1400,height:1000,deviceScaleFactor:1});
    await builder.goto('file://'+path.resolve('dist/index.html'),{waitUntil:'load'});
    await builder.waitForFunction(()=>typeof window.exportSite==='function'&&window.EzyGrowth?.VERSION==='7.0',{timeout:15000});
    await builder.evaluate(()=>{
      const set=(id,value)=>{const el=document.getElementById(id);if(!el)return;el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))};
      set('name','Southland Test Co');set('type','Painting');set('location','Invercargill & Southland');
      set('description','Reliable local work with clear communication and tidy results.');
      set('services','Interior painting\nExterior painting\nFence painting\nCommercial painting');
      set('phone','021 123 4567');set('email','hello@example.co.nz');
      set('design-trust','Locally owned\nFully insured\nFree quotes');
      set('design-reviews','Excellent work and communication. | Jamie\nVery tidy finish. | Morgan');
      set('design-hours','Mon–Fri · 8am–5pm');set('design-cta','Request a quote');
      window.ezyLiveSiteId='11111111-1111-4111-8111-111111111111';
    });

    const customer=await browser.newPage();
    const layouts=['classic','bold','minimal','premium','trades','friendly','luxury'];
    const heroes=['standard','split','photo'];
    const viewports=[{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}];
    let checked=0;

    async function auditExport(exported,label,hero){
      assert(exported.includes('V7 customer-site layout polish'),label+' export missing V7 layout CSS');
      for(const viewport of viewports){
        await customer.setViewport({width:viewport.width,height:viewport.height,deviceScaleFactor:1});
        await customer.setContent(exported,{waitUntil:'load'});
        await customer.evaluate(()=>{
          const site=document.querySelector('.site');
          const sec=document.createElement('section');sec.className='site-section ezy-project-section';
          sec.innerHTML='<h2>Recent projects</h2><div class="ezy-project-grid"><article class="ezy-project-card"><img alt="Tall test image" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%221800%22%3E%3Crect width=%221200%22 height=%221800%22 fill=%22%2399aabb%22/%3E%3C/svg%3E"><div class="ezy-project-copy"><div class="ezy-project-location">Dunedin</div><h3>Interior painting</h3><p>Completed local project.</p></div></article></div>';
          const contact=site.querySelector('#pv-contact');if(contact)site.insertBefore(sec,contact);else site.appendChild(sec);
        });
        await new Promise(r=>setTimeout(r,80));
        const metrics=await customer.evaluate(({hero})=>{
          const doc=document.documentElement,site=document.querySelector('.site'),img=document.querySelector('.ezy-project-card img'),quote=document.querySelector('#ezysouth-quote'),heroEl=document.querySelector('.hero'),h1=heroEl?.querySelector('h1');
          const r=el=>{if(!el)return null;const x=el.getBoundingClientRect();return {x:x.x,y:x.y,width:x.width,height:x.height,right:x.right,bottom:x.bottom}};
          const pseudo=hero==='split'?getComputedStyle(heroEl,'::after'):null;
          return {scrollWidth:doc.scrollWidth,viewport:innerWidth,site:r(site),img:r(img),quote:r(quote),hero:r(heroEl),h1:r(h1),splitPseudoColumn:pseudo?.gridColumnStart||''};
        },{hero});
        assert(metrics.scrollWidth<=metrics.viewport+2,`${label}/${viewport.name} horizontal overflow: ${metrics.scrollWidth}px > ${metrics.viewport}px`);
        assert(metrics.site&&metrics.site.width<=metrics.viewport+2,`${label}/${viewport.name} site wider than viewport: ${metrics.site?.width}px`);
        assert(metrics.img&&metrics.img.width<=metrics.site.width+2,`${label}/${viewport.name} project image wider than site`);
        if(viewport.name==='mobile')assert(metrics.img.height<=300,`${label}/mobile project image too tall: ${metrics.img.height}px`);
        if(viewport.name==='desktop')assert(metrics.img.height<=430,`${label}/desktop project image too tall: ${metrics.img.height}px`);
        if(metrics.quote)assert(metrics.quote.width<=metrics.site.width+2,`${label}/${viewport.name} QuoteFlow wider than site`);
        if(metrics.hero){
          if(viewport.name==='desktop')assert(metrics.hero.height<=760,`${label}/desktop hero too tall: ${metrics.hero.height}px`);
          if(viewport.name==='mobile')assert(metrics.hero.height<=720,`${label}/mobile hero too tall: ${metrics.hero.height}px`);
        }
        if(hero==='split'&&viewport.name==='desktop')assert(metrics.splitPseudoColumn==='2',`${label}/split desktop image is not locked to column 2`);
        checked++;
      }
    }

    for(const layout of layouts){
      for(const hero of heroes){
        const exported=await builder.evaluate(({layout,hero})=>{
          const set=(id,value)=>{const el=document.getElementById(id);if(!el)throw new Error('Missing '+id);el.value=value};
          set('design-layout',layout);set('design-hero',hero);set('design-font','modern');set('design-surface','soft');set('design-service-style','cards');set('design-nav-style','clean');set('design-spacing','balanced');
          document.getElementById('design-apply').click();
          return window.exportSite();
        },{layout,hero});
        await auditExport(exported,`${layout}/${hero}`,hero);
      }
    }

    const presets={
      coastal:{layout:'friendly',hero:'standard',font:'modern',surface:'soft',spacing:'balanced',serviceStyle:'cards',navStyle:'clean'},
      studio:{layout:'minimal',hero:'standard',font:'editorial',surface:'sharp',spacing:'balanced',serviceStyle:'cards',navStyle:'clean'},
      trade:{layout:'trades',hero:'standard',font:'modern',surface:'sharp',spacing:'balanced',serviceStyle:'cards',navStyle:'dark'},
      midnight:{layout:'luxury',hero:'standard',font:'editorial',surface:'soft',spacing:'balanced',serviceStyle:'cards',navStyle:'dark'}
    };
    for(const [preset,expected] of Object.entries(presets)){
      const result=await builder.evaluate(({preset})=>{
        const button=document.querySelector(`[data-template="${preset}"]`);if(!button)throw new Error('Missing preset '+preset);button.click();
        const site=document.getElementById('site');
        return {html:window.exportSite(),classes:[...site.classList],hero:document.getElementById('design-hero').value,font:document.getElementById('design-font').value,surface:document.getElementById('design-surface').value,spacing:document.getElementById('design-spacing').value,serviceStyle:document.getElementById('design-service-style').value,navStyle:document.getElementById('design-nav-style').value};
      },{preset});
      assert(result.classes.includes('layout-'+expected.layout),`${preset} preset wrong layout`);
      assert(result.hero===expected.hero,`${preset} preset wrong hero`);
      assert(result.font===expected.font,`${preset} preset wrong font`);
      assert(result.surface===expected.surface,`${preset} preset wrong surface`);
      assert(result.spacing===expected.spacing,`${preset} preset wrong spacing`);
      assert(result.serviceStyle===expected.serviceStyle,`${preset} preset wrong service style`);
      assert(result.navStyle===expected.navStyle,`${preset} preset wrong nav style`);
      await auditExport(result.html,`preset-${preset}`,expected.hero);
    }

    console.log(`V7 browser layout audit passed: ${checked} layout/preset viewport checks`);
  }finally{await browser.close()}
})().catch(err=>{console.error(err.stack||err);process.exit(1)});
