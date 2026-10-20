-- JOBFLOW STAGING-ONLY SECURITY REGRESSION TEST
-- Execute only against an isolated Supabase STAGING branch after applying schema.
-- All fabricated test users/rows roll back, even when the checks pass.
BEGIN;
-- Two synthetic accounts and independently owned websites.
INSERT INTO auth.users(id,email) VALUES
 ('a1111111-1111-4111-8111-111111111111','jobflow-staging-a@example.invalid'),
 ('b2222222-2222-4222-8222-222222222222','jobflow-staging-b@example.invalid');

INSERT INTO public.websites(id,owner_id,name,content) VALUES
 ('a3333333-3333-4333-8333-333333333333','a1111111-1111-4111-8111-111111111111','Staging Site A','{}'::jsonb),
 ('b4444444-4444-4444-8444-444444444444','b2222222-2222-4222-8222-222222222222','Staging Site B','{}'::jsonb);

INSERT INTO public.enquiries(id,website_id,customer_name,customer_contact,message,status) VALUES
 ('a5555555-5555-4555-8555-555555555555','a3333333-3333-4333-8333-333333333333','Synthetic A1','private-a@example.invalid','Completed fictional fence project', 'Completed'),
 ('a6666666-6666-4666-8666-666666666666','a3333333-3333-4333-8333-333333333333','Synthetic A2','private-a2@example.invalid','Unfinished fictional painting project', 'New'),
 ('b7777777-7777-4777-8777-777777777777','b4444444-4444-4444-8444-444444444444','Synthetic B1','private-b@example.invalid','Completed fictional roof project', 'Completed'),
 ('b8888888-8888-4888-8888-888888888888','b4444444-4444-4444-8444-444444444444','Synthetic B2','private-b2@example.invalid','Another completed fictional roof project', 'Completed');

INSERT INTO public.jobflow_businesses(id,owner_id,name,location) VALUES
 ('a8888888-8888-4888-8888-888888888888','a1111111-1111-4111-8111-111111111111','Stage Business A','Southland'),
 ('b9999999-9999-4999-8999-999999999999','b2222222-2222-4222-8222-222222222222','Stage Business B','Canterbury');

INSERT INTO public.jobflow_customers(id,business_id,name,contact) VALUES
 ('c1111111-1111-4111-8111-111111111111','a8888888-8888-4888-8888-888888888888','Business A Customer','fake-a@example.invalid'),
 ('c2222222-2222-4222-8222-222222222222','b9999999-9999-4999-8999-999999999999','Business B Customer','fake-b@example.invalid');

INSERT INTO public.jobflow_jobs(id,business_id,customer_id,title,notes) VALUES
 ('d1111111-1111-4111-8111-111111111111','a8888888-8888-4888-8888-888888888888','c1111111-1111-4111-8111-111111111111','Fence rebuild','Fictional'),
 ('d2222222-2222-4222-8222-222222222222','b9999999-9999-4999-8999-999999999999','c2222222-2222-4222-8222-222222222222','Roof inspection','Fictional');

-- Trusted staging setup adds showcase for the second owner too.
INSERT INTO public.jobflow_showcases(website_id,enquiry_id,title,summary)
 VALUES('b4444444-4444-4444-8444-444444444444','b7777777-7777-4777-8777-777777777777',
 'B Roof Example','An approved, fictional public project summary only.');

-- Exercise RLS as the first signed-in user, not as a privileged DB owner.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);

DO $checks$
DECLARE
 denied BOOLEAN;
 affected INT;
BEGIN
 IF (SELECT COUNT(*) FROM public.websites) <> 1 THEN
   RAISE EXCEPTION 'FAIL: account A sees another owner''s websites';
 END IF;
 IF (SELECT COUNT(*) FROM public.enquiries) <> 2 THEN
   RAISE EXCEPTION 'FAIL: account A sees another owner''s enquiries';
 END IF;
 IF (SELECT COUNT(*) FROM public.jobflow_businesses) <> 1 OR
    (SELECT COUNT(*) FROM public.jobflow_customers) <> 1 OR
    (SELECT COUNT(*) FROM public.jobflow_jobs) <> 1 THEN
   RAISE EXCEPTION 'FAIL: tenant isolation for business/customer/jobs';
 END IF;
 IF (SELECT COUNT(*) FROM public.jobflow_showcases) <> 0 THEN
   RAISE EXCEPTION 'FAIL: account A sees another owner''s showcase';
 END IF;

 -- Only completed enquiries owned by the currently signed-in owner are featureable.
 INSERT INTO public.jobflow_showcases(website_id,enquiry_id,title,summary)
 VALUES('a3333333-3333-4333-8333-333333333333','a5555555-5555-4555-8555-555555555555',
   'Fence Restoration','Completed fictional fence restoration in Southland.');
 IF (SELECT COUNT(*) FROM public.jobflow_showcases) <> 1 THEN
   RAISE EXCEPTION 'FAIL: owner cannot create valid approved project';
 END IF;

 denied:=false;
 BEGIN
   INSERT INTO public.jobflow_showcases(website_id,enquiry_id,title,summary)
   VALUES('a3333333-3333-4333-8333-333333333333','a6666666-6666-4666-8666-666666666666',
      'Unfinished Job','This fictional job is still new and must be rejected.');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: incomplete enquiry was featured'; END IF;

 denied:=false;
 BEGIN
   INSERT INTO public.jobflow_showcases(website_id,enquiry_id,title,summary)
   VALUES('b4444444-4444-4444-8444-444444444444','b8888888-8888-4888-8888-888888888888',
      'Someone Else Work','Account A must not be allowed to feature another tenant.');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: cross-owner showcase inserted'; END IF;

 UPDATE public.jobflow_businesses SET name='STOLEN' WHERE id='b9999999-9999-4999-8999-999999999999';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'FAIL: other tenant business update allowed'; END IF;
 DELETE FROM public.jobflow_jobs WHERE id='d2222222-2222-4222-8222-222222222222';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'FAIL: other tenant job deletion allowed'; END IF;
 DELETE FROM public.jobflow_showcases WHERE website_id='b4444444-4444-4444-8444-444444444444';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'FAIL: other tenant showcase deletion allowed'; END IF;

 -- Must not pair an A business with a B customer.
 denied:=false;
 BEGIN
   INSERT INTO public.jobflow_jobs(business_id,customer_id,title)
    VALUES('a8888888-8888-4888-8888-888888888888','c2222222-2222-4222-8222-222222222222','Cross tenant job');
 EXCEPTION WHEN foreign_key_violation THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: customer linked to another business'; END IF;
END $checks$;

RESET ROLE;
SET LOCAL ROLE anon;
DO $anon$
DECLARE denied BOOLEAN:=false;
BEGIN
  BEGIN PERFORM COUNT(*) FROM public.jobflow_businesses;
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'FAIL: anonymous role can query private business records'; END IF;
END $anon$;
RESET ROLE;

SELECT 'PASS: owner isolation, incomplete share rejection, cross-tenant FKs, anonymous restrictions' AS staging_rls_result;
ROLLBACK;
