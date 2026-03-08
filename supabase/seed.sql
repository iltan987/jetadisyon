-- Seed: Admin user for development
-- Email: admin@jetadisyon.com / Password: Admin123!
--
-- This replicates what GoTrue creates when using Dashboard → Add User.
-- For production, create admin users via the Supabase dashboard or admin API.

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Only seed if the admin user doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@jetadisyon.com') THEN
    new_user_id := gen_random_uuid();

    -- Create user (matches GoTrue's internal format)
    -- GoTrue expects empty strings (not NULL) for varchar/text columns
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_sso_user, is_anonymous,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone, phone_change, phone_change_token,
      reauthentication_token,
      created_at, updated_at
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@jetadisyon.com',
      crypt('Admin123!', gen_salt('bf', 10)),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"email_verified": true}'::jsonb,
      false,
      false,
      '', '',
      '', '', '',
      '', '', '',
      '',
      now(),
      now()
    );

    -- Create email identity (required for email/password login)
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      new_user_id::text,
      'email',
      jsonb_build_object(
        'sub', new_user_id::text,
        'email', 'admin@jetadisyon.com',
        'email_verified', false,
        'phone_verified', false
      ),
      now(),
      now(),
      now()
    );

    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin'::public.app_role);

    RAISE NOTICE 'Admin user created: admin@jetadisyon.com';
  ELSE
    RAISE NOTICE 'Admin user already exists, skipping seed';
  END IF;
END;
$$;
