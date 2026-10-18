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

-- JobFlow standalone business workspace: independent of website creation.
create table public.jobflow_businesses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references auth.users(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 2 and 120),
 location text not null default '' check (char_length(location)<=120),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.jobflow_businesses enable row level security;
create policy jobflow_businesses_select_own on public.jobflow_businesses for select to authenticated
 using (owner_id=(select auth.uid()));
create policy jobflow_businesses_insert_own on public.jobflow_businesses for insert to authenticated
 with check (owner_id=(select auth.uid()));
create policy jobflow_businesses_update_own on public.jobflow_businesses for update to authenticated
 using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy jobflow_businesses_delete_own on public.jobflow_businesses for delete to authenticated
 using (owner_id=(select auth.uid()));
revoke all on public.jobflow_businesses from anon;
grant select,insert,update,delete on public.jobflow_businesses to authenticated;

create table public.jobflow_customers (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.jobflow_businesses(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 2 and 120),
 contact text not null check (char_length(trim(contact)) between 3 and 200),
 created_at timestamptz not null default now(),
 constraint jobflow_customers_business_id_id_key unique(business_id,id)
);
create index jobflow_customers_business_idx on public.jobflow_customers(business_id,created_at desc);
alter table public.jobflow_customers enable row level security;
create policy jobflow_customers_select_own on public.jobflow_customers for select to authenticated
 using (exists (select 1 from public.jobflow_businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy jobflow_customers_insert_own on public.jobflow_customers for insert to authenticated
 with check (exists (select 1 from public.jobflow_businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy jobflow_customers_update_own on public.jobflow_customers for update to authenticated
 using (exists (select 1 from public.jobflow_businesses b where b.id=business_id and b.owner_id=(select auth.uid())))
 with check (exists (select 1 from public.jobflow_businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy jobflow_customers_delete_own on public.jobflow_customers for delete to authenticated
 using (exists (select 1 from public.jobflow_businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
revoke all on public.jobflow_customers from anon;
grant select,insert,update,delete on public.jobflow_customers to authenticated;

create table public.jobflow_jobs (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.jobflow_businesses(id) on delete cascade,
 customer_id uuid not null,
 title text not null check (char_length(trim(title)) between 3 and 160),
 notes text not null default '' check (char_length(notes)<=3000),
 status text not null default 'New' check (status in ('New','Quote needed','Quote sent','Won','Completed','Lost')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint jobflow_jobs_customer_same_business_fkey foreign key(business_id,customer_id)
   references public.jobflow_customers(business_id,id) on delete restrict
);
create index jobflow_jobs_business_idx on public.jobflow_jobs(business_id,created_at desc);
alter table public.jobflow_jobs enable row level security;
create policy jobflow_jobs_select_own on public.jobflow_jobs for select to authenticated
 using (exists (select 1 from public.jobflow_businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy jobflow_jobs_insert_own on public.jobflow_jobs for insert to authenticated
 with check (exists (select 1 from public.jobflow_businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy jobflow_jobs_update_own on public.jobflow_jobs for update to authenticated
 using (exists (select 1 from public.jobflow_businesses b where b.id=business_id and b.owner_id=(select auth.uid())))
 with check (exists (select 1 from public.jobflow_businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy jobflow_jobs_delete_own on public.jobflow_jobs for delete to authenticated
 using (exists (select 1 from public.jobflow_businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
revoke all on public.jobflow_jobs from anon;
grant select,insert,update,delete on public.jobflow_jobs to authenticated;
