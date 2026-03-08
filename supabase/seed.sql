-- Seed: Admin user for development
-- Email: admin@jetadisyon.com / Password: Admin123!
--
-- This seed creates the admin user in auth.users and assigns the admin role.
-- For self-hosted Supabase, this runs after migrations via `supabase db reset`.
--
-- NOTE: The password hash below is for 'Admin123!' using bcrypt.
-- In production, create admin users via the Supabase dashboard or admin API.

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
  '00000000-0000-0000-0000-000000000001',
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
) ON CONFLICT (id) DO NOTHING;

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT DO NOTHING;
