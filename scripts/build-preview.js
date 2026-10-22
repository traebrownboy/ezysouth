/**
 * Builds the real V7 Ezysouth interface as an isolated demo for Cloudflare Pages.
 * Output ONLY preview-dist/. Production is never deployed by this script.
 */
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
execFileSync(process.execPath, ['scripts/build-production.js'], { stdio: 'inherit' });
let html = fs.readFileSync('dist/index.html', 'utf8');
if (!html.includes('ezy-v7-growth-core') || !html.includes('ezy-v7-jobflow'))
  throw new Error('V7 build is missing expected modules');
// Strip the real cloud SDK and Netlify uploader; replace backend references with a dead hostname.
html = html.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.min.js"></script>', '');
html = html.replace('<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>', '');
html = html.replaceAll('https://ezcmfbaoivdwkgayznbt.supabase.co', 'https://sandbox-disabled.invalid');
html = html.replaceAll('sb_publishable_f4Pl6Lxlre4k1kV1G6dRLg_RGuYOY03', 'PREVIEW_DISABLED');
const script = "(function(){window.ezyDemoSafety=true;window.fetch=function(){return Promise.reject(new Error('Preview only: API requests disabled.'))};window.addEventListener('DOMContentLoaded',function(){var blocked=['ezysouth-oneclick','ezysouth-unpublish','ezysouth-remove-live','netlify-publish','enable-live-jobflow','disable-live-jobflow','cloud-login','cloud-save','cloud-new','cloud-signup','cloud-reset','cloud-logout','load-live-leads'];document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('button,a');if(b&&(blocked.includes(b.id)||(b.href||'').startsWith('https://app.netlify.com'))){e.preventDefault();e.stopImmediatePropagation();alert('Safe demo: live publishing and cloud tools are disabled.')}},true);var d=document.querySelector('#leads details.ezy-advanced');if(d)d.open=true;var r=document.getElementById('ezy-preview-reset');if(r)r.onclick=function(){if(confirm('Clear all data saved in this test preview?')){localStorage.clear();location.reload()}};var f=document.querySelector('.footer');if(f)f.textContent='Ezysouth V7 · Safe preview only'})})();";
const style = "nav [data-tab='cloud'],nav [data-tab='launch'],#ezy-onboarding,#ezy-guide-open,#v56-open-launch,#load-live-leads{display:none!important}#ezy-preview-banner{background:#eaf7f2;color:#164d3b;border-bottom:1px solid #bee1d4;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font:500 13px/1.5 system-ui,sans-serif}#ezy-preview-banner strong{font-weight:800;color:#075b45}#ezy-preview-banner small{display:block;color:#477365}#ezy-preview-reset{padding:8px 12px;border:1px solid #a8d9c5;border-radius:9px;background:white;color:#075b45;font-weight:750;cursor:pointer}@media(max-width:640px){#ezy-preview-banner{padding:10px 13px}nav{gap:4px;padding:9px 10px}nav button{font-size:12px;padding:9px!important}}";
const banner = '<div id="ezy-preview-banner" role="status"><div><strong>🧪 Ezysouth V7 · Development playground</strong><small>Play with sites and demo JobFlow. Nothing here can publish, send customer messages or change real cloud data.</small></div><button id="ezy-preview-reset" type="button">Reset demo</button></div>';
if(!html.includes('</head>')||!html.includes('</nav>'))throw new Error('Missing HTML insertion points');
html=html.replace('</head>','<script id="ezysouth-preview-safety">'+script+'</script><style id="ezysouth-preview-css">'+style+'</style></head>');
html=html.replace('</nav>','</nav>'+banner);
if(html.includes('https://ezcmfbaoivdwkgayznbt.supabase.co')||html.includes('supabase.min.js'))
 throw new Error('Live backend connection remained in preview');
fs.mkdirSync('preview-dist',{recursive:true});
fs.writeFileSync('preview-dist/index.html',html);
fs.writeFileSync('preview-dist/.nojekyll','');
console.log('Safe V7 preview generated in preview-dist:',Buffer.byteLength(html),'bytes');