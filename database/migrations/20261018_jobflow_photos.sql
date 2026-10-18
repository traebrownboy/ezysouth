-- EzySouth / JobFlow staging: approved completed-work photographs.
-- Public bucket: only upload images with permission to publish; never store private
-- customer photos here. Object read access is public by design, but all mutations
-- are authenticated and scoped to the owner's website.
alter table public.jobflow_showcases
  add column if not exists image_paths text[] not null default '{}'::text[];

alter table public.jobflow_showcases
  add constraint jobflow_showcases_image_limit
  check (cardinality(image_paths) <= 4);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'jobflow-portfolio','jobflow-portfolio',true,3145728,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Images live at user_uuid/website_uuid/random_filename.jpg.
-- Storage metadata writes must never cross business / website boundaries.
create policy "jobflow_portfolio_insert_owned_websites"
on storage.objects for insert to authenticated
with check (
  bucket_id='jobflow-portfolio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.websites w
    where w.id::text=(storage.foldername(name))[2]
      and w.owner_id=(select auth.uid())
  )
);

create policy "jobflow_portfolio_select_own"
on storage.objects for select to authenticated
using (
  bucket_id='jobflow-portfolio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.websites w
    where w.id::text=(storage.foldername(name))[2]
      and w.owner_id=(select auth.uid())
  )
);

create policy "jobflow_portfolio_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id='jobflow-portfolio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.websites w
    where w.id::text=(storage.foldername(name))[2]
      and w.owner_id=(select auth.uid())
  )
);
