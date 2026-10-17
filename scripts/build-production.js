const fs=require('fs');
const path=require('path');
const root=process.cwd();
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const anchor of ['</head>','</body>','function exportSite()','id="live-leads-list"'])if(!html.includes(anchor))throw new Error('EzySouth build failed: missing '+anchor);
const css=fs.readFileSync(path.join(root,'scripts','v7-growth.css'),'utf8');
const core=fs.readFileSync(path.join(root,'scripts','v7-growth-core.js'),'utf8');
const jobflow=fs.readFileSync(path.join(root,'scripts','v7-jobflow.js'),'utf8');
// V7 promotes Completed to a real JobFlow status in both demo and live renderers.
html=html.replaceAll("['New','Quote needed','Quote sent','Won','Lost']","['New','Quote needed','Quote sent','Won','Completed','Lost']");
// Keep preset structure conservative and proven. Coastal Clean stays the reference; the others change mood without stacking too many extreme options.
const oldPresets="const premiumPresets={coastal:{layout:'friendly',hero:'standard',font:'modern',surface:'soft',spacing:'balanced',serviceStyle:'cards',navStyle:'clean',color:'#207b67'},studio:{layout:'premium',hero:'split',font:'editorial',surface:'sharp',spacing:'airy',serviceStyle:'list',navStyle:'clean',color:'#4b6455'},trade:{layout:'trades',hero:'standard',font:'strong',surface:'sharp',spacing:'compact',serviceStyle:'icons',navStyle:'dark',color:'#c2642a'},midnight:{layout:'luxury',hero:'split',font:'editorial',surface:'soft',spacing:'airy',serviceStyle:'cards',navStyle:'dark',color:'#b59a66'}};";
const newPresets="const premiumPresets={coastal:{layout:'friendly',hero:'standard',font:'modern',surface:'soft',spacing:'balanced',serviceStyle:'cards',navStyle:'clean',color:'#207b67'},studio:{layout:'minimal',hero:'standard',font:'editorial',surface:'sharp',spacing:'balanced',serviceStyle:'cards',navStyle:'clean',color:'#4f6258'},trade:{layout:'trades',hero:'standard',font:'modern',surface:'sharp',spacing:'balanced',serviceStyle:'cards',navStyle:'dark',color:'#c2642a'},midnight:{layout:'luxury',hero:'standard',font:'editorial',surface:'soft',spacing:'balanced',serviceStyle:'cards',navStyle:'dark',color:'#b59a66'}};";
if(!html.includes(oldPresets))throw new Error('EzySouth build failed: preset definition changed unexpectedly');
html=html.replace(oldPresets,newPresets);
// Export every customer-site style block, including V7 polish, instead of only the first legacy style tag.
html=html.replace("document.querySelector('style').textContent","[...document.querySelectorAll('style')].map(s=>s.textContent).join('\\n')");
html=html.replace('</head>','<style id="ezy-v7-style">'+css+'</style>\n</head>');
const bodyClose=html.lastIndexOf('</body>');
if(bodyClose<0)throw new Error('EzySouth build failed: real closing </body> not found');
html=html.slice(0,bodyClose)+'<script id="ezy-v7-growth-core">'+core+'</script>\n<script id="ezy-v7-jobflow">'+jobflow+'</script>\n'+html.slice(bodyClose);
html=html.replaceAll('V6.5.1 · Public Beta','V7.0 · Growth Loop Beta').replace('EzySouth Web V6.5 Guided Launch','EzySouth Web V7.0 Growth Loop');
const out=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);console.log('EzySouth V7 build complete:',Buffer.byteLength(html),'bytes');
