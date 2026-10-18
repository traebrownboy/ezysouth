-- Staging-only rollback test for approved photo paths and storage tenant isolation.
-- Assumes database/migrations/20261018_jobflow_photos.sql and its scope fix.
BEGIN;
INSERT INTO auth.users (id,email) VALUES
('f1111111-1111-4111-8111-111111111111','photos-stage-a@example.invalid'),
('f2222222-2222-4222-8222-222222222222','photos-stage-b@example.invalid');
INSERT INTO public.websites (id,owner_id,name,content) VALUES
('f3333333-3333-4333-8333-333333333333','f1111111-1111-4111-8111-111111111111','Photo A','{}'),
('f4444444-4444-4444-8444-444444444444','f2222222-2222-4222-8222-222222222222','Photo B','{}');
INSERT INTO public.enquiries(id,website_id,customer_name,customer_contact,message,status) VALUES
('f5555555-5555-4555-8555-555555555555','f3333333-3333-4333-8333-333333333333','A Demo','stage-a@example.invalid','Synthetic completed job','Completed'),
('f6666666-6666-4666-8666-666666666666','f4444444-4444-4444-8444-444444444444','B Demo','stage-b@example.invalid','Synthetic completed job','Completed');

-- Create synthetic metadata under both tenants before simulating a tenant JWT.
INSERT INTO storage.objects(id,bucket_id,name,owner_id,metadata) VALUES
('f7777777-7777-4777-8777-777777777777','jobflow-portfolio','f1111111-1111-4111-8111-111111111111/f3333333-3333-4333-8333-333333333333/a-test.jpg','f1111111-1111-4111-8111-111111111111','{}'::jsonb),
('f8888888-8888-4888-8888-888888888888','jobflow-portfolio','f2222222-2222-4222-8222-222222222222/f4444444-4444-4444-8444-444444444444/b-test.jpg','f2222222-2222-4222-8222-222222222222','{}'::jsonb);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);

DO $checks$
DECLARE denied BOOLEAN; affected INT;
BEGIN
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id='jobflow-portfolio')<>1 THEN
   RAISE EXCEPTION 'FAIL: account A can see account B private storage metadata';
 END IF;

 INSERT INTO storage.objects(id,bucket_id,name,owner_id,metadata) VALUES
 ('f9999999-9999-4999-8999-999999999999','jobflow-portfolio',
  'f1111111-1111-4111-8111-111111111111/f3333333-3333-4333-8333-333333333333/valid.jpg',
  'f1111111-1111-4111-8111-111111111111','{}'::jsonb);
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id='jobflow-portfolio')<>2 THEN
   RAISE EXCEPTION 'FAIL: owner cannot upload metadata under own website';
 END IF;

 denied:=false;
 BEGIN
  INSERT INTO storage.objects(id,bucket_id,name,owner_id,metadata) VALUES
  ('faaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','jobflow-portfolio',
   'f1111111-1111-4111-8111-111111111111/f4444444-4444-4444-8444-444444444444/wrong-website.jpg',
   'f1111111-1111-4111-8111-111111111111','{}'::jsonb);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: account A uploaded under account B website folder'; END IF;

 denied:=false;
 BEGIN
  INSERT INTO storage.objects(id,bucket_id,name,owner_id,metadata) VALUES
  ('fbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','jobflow-portfolio',
   'f2222222-2222-4222-8222-222222222222/f4444444-4444-4444-8444-444444444444/impersonation.jpg',
   'f2222222-2222-4222-8222-222222222222','{}'::jsonb);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: account A uploaded under account B folder'; END IF;

 DELETE FROM storage.objects WHERE id='f8888888-8888-4888-8888-888888888888';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'FAIL: account A deleted account B photo'; END IF;

 INSERT INTO public.jobflow_showcases(website_id,enquiry_id,title,summary,image_paths) VALUES
 ('f3333333-3333-4333-8333-333333333333','f5555555-5555-4555-8555-555555555555',
 'Approved image demo','Synthetic portfolio demo with one image.',
 ARRAY['f1111111-1111-4111-8111-111111111111/f3333333-3333-4333-8333-333333333333/valid.jpg']);
 IF (SELECT cardinality(image_paths) FROM public.jobflow_showcases WHERE website_id='f3333333-3333-4333-8333-333333333333')<>1 THEN
   RAISE EXCEPTION 'FAIL: approved photo path not persisted';
 END IF;

 denied:=false;
 BEGIN
  UPDATE public.jobflow_showcases SET image_paths=ARRAY['a','b','c','d','e'] WHERE website_id='f3333333-3333-4333-8333-333333333333';
 EXCEPTION WHEN check_violation THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: limit of four images per completed job not enforced'; END IF;
END $checks$;
RESET ROLE;
SELECT 'PASS: storage upload tenant ownership, cross-tenant read/delete, approved photo paths and four-photo limit' AS photos_security_result;
ROLLBACK;