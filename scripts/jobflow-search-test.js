'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {searchJobs}=require('../netlify-preview/jobflow-search.js');
const jobs=[
  {id:'12345678-1111-1111-1111-000000000001',title:'Replace boundary fence',customer_name:'Aroha Patel',customer_contact:'021 555 012',location:'Bluff',notes:'Timber fence',status:'Scheduled',created_at:'2026-10-20'},
  {id:'abcd1234-2222-2222-2222-000000000002',title:'Kitchen fitout',customer_name:'Jamie Brown',location:'Invercargill',status:'Completed',completed_at:'2026-10-18',archived_at:'2026-10-19'},
  {id:'feed5678-3333-3333-3333-000000000003',title:'Painting',customer_name:'Mereana Rāwiri',location:'Winton',status:'Cancelled',deleted_at:'2026-10-17',source_quote_id:'quote-6655'}
];
const ids=q=>searchJobs(jobs,q).map(j=>j.id.slice(0,8));
assert.deepEqual(ids('aroha'),['12345678'],'Customer names must be searchable');
assert.deepEqual(ids('PATEL bluff'),['12345678'],'Search must combine independent terms');
assert.deepEqual(ids('boundary fence'),['12345678'],'Job titles must be searchable');
assert.deepEqual(ids('021 555'),['12345678'],'Contact details must be searchable');
assert.deepEqual(ids('archived Jamie'),['abcd1234'],'Archived completed jobs must remain searchable');
assert.deepEqual(ids('completed'),['abcd1234'],'Completed status must be searchable');
assert.deepEqual(ids('trash'),['feed5678'],'Trash must remain searchable');
assert.deepEqual(ids('rawiri'),['feed5678'],'Search must handle Māori macrons');
assert.deepEqual(ids('quote-6655'),['feed5678'],'Linked quote refs must be searchable');
assert.deepEqual(ids('abcd1234'),['abcd1234'],'Stable job reference must be searchable');
assert.deepEqual(ids('does not exist'),[],'Unmatched search must be empty');
assert.deepEqual(searchJobs(jobs,'  '),[],'Blank search must be empty (existing calendar remains visible)');
assert.deepEqual(searchJobs(null,'x'),[],'No records is safe');
const html=fs.readFileSync(path.join(__dirname,'..','netlify-preview','jobflow-schedule.html'),'utf8');
for(const needle of ['src="./jobflow-search.js"','id="job-search"','id="job-search-clear"','function renderSearch(query)','if(query){renderSearch(query);return}',"$('job-search').addEventListener('input',render)"]){
 assert(html.includes(needle),'JobFlow schedule missing search hook: '+needle);
}
assert(html.indexOf('src="./jobflow-search.js"')<html.indexOf('function renderSearch(query)'),'Search module must load before the schedule logic');
console.log('JobFlow search tests passed: customer, job, contact, address, archive, Trash, linked references and integration.');
