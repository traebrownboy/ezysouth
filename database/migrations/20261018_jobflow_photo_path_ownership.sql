-- Staging hardening: only allow portfolio images under this signed-in
-- user's own website path. Approved images are public-read, but no business
-- can attach a photo path under a different business / website namespace.
alter policy jobflow_showcases_insert_completed on public.jobflow_showcases
 with check (
   exists (select 1 from public.websites w where w.id=website_id and w.owner_id=(select auth.uid()))
   and exists (select 1 from public.enquiries e where e.id=enquiry_id and e.website_id=website_id and e.status='Completed')
   and not exists (
     select 1 from unnest(image_paths) as photo(path)
     where photo.path !~ (
       '^' || (select auth.uid())::text || '/' || website_id::text ||
       '/[a-f0-9-]{36}[.]jpg$'
     )
   )
 );
alter policy jobflow_showcases_update_completed on public.jobflow_showcases
 using (exists (select 1 from public.websites w where w.id=website_id and w.owner_id=(select auth.uid())))
 with check (
   exists (select 1 from public.websites w where w.id=website_id and w.owner_id=(select auth.uid()))
   and exists (select 1 from public.enquiries e where e.id=enquiry_id and e.website_id=website_id and e.status='Completed')
   and not exists (
     select 1 from unnest(image_paths) as photo(path)
     where photo.path !~ (
       '^' || (select auth.uid())::text || '/' || website_id::text ||
       '/[a-f0-9-]{36}[.]jpg$'
     )
   )
 );
