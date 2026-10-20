-- A subquery referencing w.name would refer to the website row, not the
-- enclosing storage.objects record. Explicitly qualify the object path.
drop policy if exists "jobflow_portfolio_insert_owned_websites" on storage.objects;
drop policy if exists "jobflow_portfolio_select_own" on storage.objects;
drop policy if exists "jobflow_portfolio_delete_own" on storage.objects;

create policy "jobflow_portfolio_insert_owned_websites"
on storage.objects for insert to authenticated
with check (
  bucket_id='jobflow-portfolio'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (
    select 1 from public.websites w
    where w.id::text=(storage.foldername(storage.objects.name))[2]
      and w.owner_id=(select auth.uid())
  )
);
create policy "jobflow_portfolio_select_own"
on storage.objects for select to authenticated
using (
  bucket_id='jobflow-portfolio'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (
    select 1 from public.websites w
    where w.id::text=(storage.foldername(storage.objects.name))[2]
      and w.owner_id=(select auth.uid())
  )
);
create policy "jobflow_portfolio_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id='jobflow-portfolio'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (
    select 1 from public.websites w
    where w.id::text=(storage.foldername(storage.objects.name))[2]
      and w.owner_id=(select auth.uid())
  )
);
