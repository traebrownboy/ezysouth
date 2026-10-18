-- Additive JobFlow -> EzySouth Web completed-work handoff.
-- Review and apply as a migration BEFORE deploying jobflow.html or the updated builder.
-- No existing enquiries, websites or deployments are modified.
create table public.jobflow_showcases (
 id uuid primary key default gen_random_uuid(),
 website_id uuid not null references public.websites(id) on delete cascade,
 enquiry_id uuid not null unique references public.enquiries(id) on delete cascade,
 title text not null check (char_length(trim(title)) between 4 and 100),
 summary text not null check (char_length(trim(summary)) between 10 and 600),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index jobflow_showcases_website_idx on public.jobflow_showcases (website_id,created_at desc);
alter table public.jobflow_showcases enable row level security;
-- Read and deletion are allowed only for the website owner.
create policy jobflow_showcases_select_own on public.jobflow_showcases
 for select to authenticated
 using (exists (select 1 from public.websites w where w.id=website_id and w.owner_id=(select auth.uid())));
create policy jobflow_showcases_delete_own on public.jobflow_showcases
 for delete to authenticated
 using (exists (select 1 from public.websites w where w.id=website_id and w.owner_id=(select auth.uid())));
-- Only a completed enquiry from the SAME website can be sent for showcasing.
create policy jobflow_showcases_insert_completed on public.jobflow_showcases
 for insert to authenticated
 with check (
   exists (select 1 from public.websites w where w.id=website_id and w.owner_id=(select auth.uid()))
   and exists (select 1 from public.enquiries e where e.id=enquiry_id and e.website_id=website_id and e.status='Completed')
 );
create policy jobflow_showcases_update_completed on public.jobflow_showcases
 for update to authenticated
 using (exists (select 1 from public.websites w where w.id=website_id and w.owner_id=(select auth.uid())))
 with check (
   exists (select 1 from public.websites w where w.id=website_id and w.owner_id=(select auth.uid()))
   and exists (select 1 from public.enquiries e where e.id=enquiry_id and e.website_id=website_id and e.status='Completed')
 );
-- Authenticated owner queries are still row-filtered by the policies above.
revoke all on public.jobflow_showcases from anon;
grant select,insert,update,delete on public.jobflow_showcases to authenticated;
comment on table public.jobflow_showcases is 'Curated public-facing descriptions only; never copy customer name/contact/original enquiry messages here.';
