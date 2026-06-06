-- Fix: "Database error creating new user" in Supabase Auth
-- Run this in Supabase SQL Editor if user signup/dashboard creation fails.

-- 1. Drop old trigger (safe if missing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Replace with robust profile creation (handles null email, invalid role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val public.user_role := 'staff';
  user_email TEXT;
  user_name TEXT;
BEGIN
  user_email := COALESCE(
    NULLIF(TRIM(NEW.email), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'email'), ''),
    NEW.id::text || '@users.local'
  );

  user_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(user_email, '@', 1)
  );

  IF NEW.raw_user_meta_data->>'role' IN ('admin', 'staff') THEN
    user_role_val := (NEW.raw_user_meta_data->>'role')::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, user_email, user_name, user_role_val)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- 3. Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Grants required for Auth to run the trigger (Supabase)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- 5. Allow profile row creation (trigger + service role)
DROP POLICY IF EXISTS "Service role insert profiles" ON public.profiles;
CREATE POLICY "Service role insert profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- 6. Backfill profiles for users created before this fix
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  COALESCE(NULLIF(TRIM(u.email), ''), u.id::text || '@users.local'),
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    split_part(COALESCE(u.email, u.id::text), '@', 1)
  ),
  'staff'::public.user_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;
