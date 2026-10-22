'use strict';
// Non-destructive check that the right Ezysouth JobFlow Test files are ready.
// Does not publish or change data in Netlify, Supabase or any live service.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),site=path.join(root,'netlify-preview');
const routes=['index.html','login.html','web.html','jobflow.html','jobflow-schedule.html','jobflow-documents.html','published.html'];
function file(name){return fs.readFileSync(path.join(site,name),'utf8')}
const netlify=fs.readFileSync(path.join(root,'netlify.toml'),'utf8');
assert.match(netlify,/publish\s*=\s*"netlify-preview"/,'Netlify must point at the isolated JobFlow Test folder');
assert.match(netlify,/NODE_ENV\s*=\s*"test"/,'Test environment must stay explicitly labeled');
const listing=fs.readdirSync(site,{withFileTypes:true}).filter(x=>x.isFile()).map(x=>x.name);
for(const name of routes){
 assert(listing.includes(name),'Missing staging route '+name);
 const html=file(name);
 assert.match(html,/<html\b/i,'Invalid HTML: '+name);
 // Staging sets global X-Robots-Tag through Netlify _headers, checked below.

}
for(const name of ['jobflow-search.js','jobflow-view.html','jobflow-delivery.js','jobflow-schedule.html']){
 assert(listing.includes(name),'Missing expected asset '+name);
}
const siteText=listing.filter(x=>/\.(?:html|js|css|txt)$/.test(x)).map(file).join('\n');
assert(!siteText.includes('https://ezcmfbaoivdwkgayznbt.supabase.co'),'Production Supabase URL found in staging bundle');
assert(!/sb_secret_[a-zA-Z0-9]|(?:NETLIFY_AUTH_TOKEN|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*["'][^\s]+/i.test(siteText),'Potential private backend credential in bundled files');
for(const name of ['web.html','jobflow.html','jobflow-schedule.html','jobflow-documents.html','login.html']){
 assert(file(name).includes('anldjuaqlpowwodlphqf.supabase.co'),'Wrong staging backend for '+name);
}
assert(file('jobflow-schedule.html').includes('src="./jobflow-search.js"'),'Job search integration missing');
assert(listing.includes('_headers'),'Missing preview security headers');
assert(listing.includes('robots.txt'),'Missing staging robots rules');
assert.match(file('_headers'),/\/\*[\s\S]*X-Robots-Tag:\s*noindex/i,'All staging pages must have the global noindex header');
assert.match(file('robots.txt'),/User-agent:\s*\*[\s\S]*Disallow:\s*\//i,'Staging robots.txt must block crawlers');
console.log('Release package checked: '+routes.length+' staging pages and '+listing.length+' root files. No production database URL found.');
const manifest={project:'Ezysouth JobFlow Test',branch:'development/jobflow-test-preview',target:'ezysouth-jobflow-test staging ONLY',files:listing.map(name=>{const bytes=fs.readFileSync(path.join(site,name));return {name,size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}})};
fs.mkdirSync(path.join(root,'release-check'),{recursive:true});
fs.writeFileSync(path.join(root,'release-check','manifest.json'),JSON.stringify(manifest,null,2));
