-- Isolated, disposable-ish published website HTML storage for EzySouth staging.
-- NOT for production use. Edge Functions authenticate owners for writes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ezysouth-staging-published','ezysouth-staging-published',false,5242880,array['text/html']::text[])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['text/html']::text[];
-- No authenticated or anonymous client policy: only backend can read or write.
