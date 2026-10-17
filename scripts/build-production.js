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
html=html.replace('</head>','<style id="ezy-v7-style">'+css+'</style>\n</head>');
const bodyClose=html.lastIndexOf('</body>');
if(bodyClose<0)throw new Error('EzySouth build failed: real closing </body> not found');
html=html.slice(0,bodyClose)+'<script id="ezy-v7-growth-core">'+core+'</script>\n<script id="ezy-v7-jobflow">'+jobflow+'</script>\n'+html.slice(bodyClose);
html=html.replaceAll('V6.5.1 · Public Beta','V7.0 · Growth Loop Beta').replace('EzySouth Web V6.5 Guided Launch','EzySouth Web V7.0 Growth Loop');
const out=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);console.log('EzySouth V7 build complete:',Buffer.byteLength(html),'bytes');
