/* EzySouth JobFlow — safe, read-only search across the jobs already loaded for the signed-in owner.
   No extra API requests, no changes to stored customer records. */
(function(root){
  'use strict';
  const clean = value => String(value ?? '').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en-NZ').trim();
  function searchJobs(records, query){
    const words = clean(query).split(/\s+/).filter(Boolean).slice(0,12);
    if (!words.length || !Array.isArray(records)) return [];
    return records.filter(job => {
      if(!job || typeof job!=='object')return false;
      const searchable = [
        job.id, job.title, job.customer_name, job.customer_contact, job.location,
        job.assignee, job.notes, job.status, job.source_quote_id,
        job.deleted_at?'trash deleted':'',
        job.archived_at?'archived':'',
        job.status==='Completed'?'finished done':''
      ].map(clean).join(' ');
      return words.every(word => searchable.includes(word));
    });
  }
  const api=Object.freeze({searchJobs});
  root.EzyJobSearch=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
