-- Seed: Admin user for development
-- Email: admin@jetadisyon.com / Password: Admin123!
--
-- This seed creates the admin user in auth.users and assigns the admin role.
-- For self-hosted Supabase, this runs after migrations via `supabase db reset`.
--
-- NOTE: In production, create admin users via the Supabase dashboard or admin API.

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@jetadisyon.com',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"], "user_role": "admin"}'::jsonb,
  '{}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
) ON CONFLICT (email) WHERE (is_sso_user = false) DO NOTHING;

-- Assign admin role (looks up actual user ID by email)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'admin@jetadisyon.com'
ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;
