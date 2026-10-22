'use strict';
// Cloudflare Pages static deployment guard for the separate Ezysouth JobFlow Test playground.
// This intentionally deploys NO Netlify site and executes NO Supabase migrations or writes.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const EXPECTED_BRANCH='development/jobflow-test-preview';
if (process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH!==EXPECTED_BRANCH)
  throw Error('Refusing Cloudflare Pages deployment from '+process.env.CF_PAGES_BRANCH+'. Expected only '+EXPECTED_BRANCH+'.');
execFileSync(process.execPath,['scripts/jobflow-release-preflight.js'],{stdio:'inherit'});
const dir=path.resolve('netlify-preview');
for (const asset of ['index.html','login.html','web.html','jobflow.html','jobflow-schedule.html','jobflow-documents.html','jobflow-search.js','_headers','robots.txt']){
  if (!fs.statSync(path.join(dir,asset)).isFile())throw Error('Missing Cloudflare playground asset '+asset);
}
const headers=fs.readFileSync(path.join(dir,'_headers'),'utf8');
if (!/X-Robots-Tag:\s*noindex/i.test(headers))throw Error('Preview must remain noindex');
console.log('Cloudflare Pages build ready. Serve static output directory: netlify-preview');
console.log('This build does not touch production or Netlify. Use test accounts and fictional customers only.');
