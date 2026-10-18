-- JobFlow FREE integration test harness for disposable PostgreSQL CI database.
-- DO NOT run this on an existing customer database.
-- Mirrors only the baseline Supabase auth, websites and enquiries contracts needed
-- to validate the new four-table RLS/foreign-key migration in isolation.

DO $roles$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
END $roles$;

CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT USAGE ON SCHEMA public TO authenticated, anon;

CREATE TABLE auth.users(
 id uuid PRIMARY KEY,
 email text
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $func$
 SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$func$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

CREATE TABLE public.websites(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL,
 content jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 accepting_enquiries boolean NOT NULL DEFAULT true
);
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
CREATE POLICY websites_select_own ON public.websites FOR SELECT TO authenticated
 USING (owner_id=(SELECT auth.uid()));
CREATE POLICY websites_update_own ON public.websites FOR UPDATE TO authenticated
 USING (owner_id=(SELECT auth.uid())) WITH CHECK (owner_id=(SELECT auth.uid()));
GRANT SELECT,UPDATE ON public.websites TO authenticated;

CREATE TABLE public.enquiries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
 customer_name text NOT NULL,
 customer_contact text NOT NULL,
 message text NOT NULL,
 status text NOT NULL DEFAULT 'New'
  CHECK (status IN ('New','Quote needed','Quote sent','Won','Completed','Lost')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY enquiries_select_own ON public.enquiries FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.websites w WHERE w.id=website_id AND w.owner_id=(SELECT auth.uid())));
CREATE POLICY enquiries_update_own ON public.enquiries FOR UPDATE TO authenticated
 USING (EXISTS (SELECT 1 FROM public.websites w WHERE w.id=website_id AND w.owner_id=(SELECT auth.uid())))
 WITH CHECK (EXISTS (SELECT 1 FROM public.websites w WHERE w.id=website_id AND w.owner_id=(SELECT auth.uid())));
GRANT SELECT,UPDATE ON public.enquiries TO authenticated;

-- The candidate schema in ../migrations/20261018_jobflow_showcases.sql now runs.
