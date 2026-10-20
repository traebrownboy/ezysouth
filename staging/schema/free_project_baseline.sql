-- EzySouth / JobFlow staging-only baseline.
-- Target: pre-existing UNUSED/free Supabase project anldjuaqlpowwodlphqf.
-- NEVER execute on the live EzySouth project (ezcmfbaoivdwkgayznbt).
-- This recreates the minimum cloud, enquiry, publishing lookup and rate limit schema
-- for the staged JobFlow and EzySouth Website Builder, without copying any user data.

create table public.websites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 150),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  accepting_enquiries boolean not null default false
);
create index staging_websites_owner on public.websites(owner_id, updated_at desc);
alter table public.websites enable row level security;
create policy "owners read websites" on public.websites for select to authenticated
  using (owner_id=(select auth.uid()));
create policy "owners insert websites" on public.websites for insert to authenticated
  with check (owner_id=(select auth.uid()));
create policy "owners update websites" on public.websites for update to authenticated
  using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy "owners delete websites" on public.websites for delete to authenticated
  using (owner_id=(select auth.uid()));
revoke all on public.websites from anon;
grant select,insert,update,delete on public.websites to authenticated;

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_contact text not null check (char_length(customer_contact) between 3 and 200),
  message text not null check (char_length(message) between 5 and 3000),
  status text not null default 'New'
    check (status in ('New','Quote needed','Quote sent','Won','Completed','Lost')),
  created_at timestamptz not null default now()
);
create index staging_enquiries_website_date on public.enquiries (website_id,created_at desc);
alter table public.enquiries enable row level security;
create policy "owners view enquiries" on public.enquiries for select to authenticated
 using (exists (select 1 from public.websites w where w.id=enquiries.website_id and w.owner_id=(select auth.uid())));
create policy "owners update enquiries" on public.enquiries for update to authenticated
 using (exists (select 1 from public.websites w where w.id=enquiries.website_id and w.owner_id=(select auth.uid())))
 with check (exists (select 1 from public.websites w where w.id=enquiries.website_id and w.owner_id=(select auth.uid())));
create policy "owners delete enquiries" on public.enquiries for delete to authenticated
 using (exists (select 1 from public.websites w where w.id=enquiries.website_id and w.owner_id=(select auth.uid())));
revoke all on public.enquiries from anon;
grant select,update,delete on public.enquiries to authenticated;
-- Intentionally NO authenticated insert on public.enquiries:
-- public form submissions must pass through the validated Edge Function.

create table public.builder_state(
  owner_id uuid primary key references auth.users(id) on delete cascade,
  active_website_id uuid references public.websites(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.builder_state enable row level security;
create policy builder_state_select_own on public.builder_state for select to authenticated
 using (owner_id=(select auth.uid()));
create policy builder_state_insert_own on public.builder_state for insert to authenticated
 with check (owner_id=(select auth.uid()) and
   (active_website_id is null or exists
    (select 1 from public.websites w where w.id=active_website_id and w.owner_id=(select auth.uid()))));
create policy builder_state_update_own on public.builder_state for update to authenticated
 using (owner_id=(select auth.uid()))
 with check (owner_id=(select auth.uid()) and
   (active_website_id is null or exists
    (select 1 from public.websites w where w.id=active_website_id and w.owner_id=(select auth.uid()))));
revoke all on public.builder_state from anon;
grant select,insert,update,delete on public.builder_state to authenticated;

-- Service-only metadata mirrors production. Staging publishing remains disabled.
create table public.website_deployments(
  website_id uuid primary key references public.websites(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  netlify_site_id text not null unique,
  public_url text not null,
  deploy_id text,
  updated_at timestamptz not null default now(),
  site_slug text,
  publish_status text not null default 'draft'
   check (publish_status in ('draft','publishing','live','error','unpublished','removed')),
  last_published_at timestamptz,
  last_error text
);
alter table public.website_deployments enable row level security;
revoke all on public.website_deployments from anon, authenticated;

create table public.enquiry_rate_limits(
  id bigint generated by default as identity primary key,
  website_id uuid not null references public.websites(id) on delete cascade,
  client_hash text not null check (char_length(client_hash)=64),
  created_at timestamptz not null default now()
);
create index staging_enquiry_rate_idx on public.enquiry_rate_limits(website_id,client_hash,created_at desc);
alter table public.enquiry_rate_limits enable row level security;
revoke all on public.enquiry_rate_limits from anon, authenticated;

comment on table public.website_deployments is 'Staging only. Publishing disabled; fake approved test URLs may be used to validate public form security.';
