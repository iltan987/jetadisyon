-- Seed: Admin user for development
-- Email: admin0@jetadisyon.com / Password: Admin0123!
--
-- Seed: Test tenant owner user
-- Email: tenant_owner0@jetadisyon.com / Password: TenantOwner0123!
--
-- Seed: Test tenant staff user
-- Email: tenant_staff0@jetadisyon.com / Password: TenantStaff0123!
--
-- This replicates what GoTrue creates when using Dashboard → Add User.
-- For production, create admin users via the Supabase dashboard or admin API.

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Only seed if the admin user doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin0@jetadisyon.com') THEN
    new_user_id := gen_random_uuid();

    -- Create user (matches GoTrue's internal format)
    INSERT INTO auth.users (
      "instance_id", "id", "aud", "role", "email", "encrypted_password",
      "email_confirmed_at", "invited_at", "confirmation_token",
      "confirmation_sent_at", "recovery_token", "recovery_sent_at",
      "email_change_token_new", "email_change", "email_change_sent_at",
      "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data",
      "is_super_admin", "created_at", "updated_at", "phone_confirmed_at",
      "phone_change_sent_at", "banned_until", "reauthentication_sent_at",
      "deleted_at"
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'admin0@jetadisyon.com',
      crypt('Admin0123!', gen_salt('bf', 10)),
      now(),
      null,
      '',
      null,
      '',
      null,
      '',
      '',
      null,
      null,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"email_verified": true}'::jsonb,
      null,
      now(),
      now(),
      null,
      null,
      null,
      null,
      null
    );

    -- Create email identity (required for email/password login)
    INSERT INTO auth.identities (
      "provider_id", "user_id", "identity_data", "provider",
      "last_sign_in_at", "created_at", "updated_at", "id"
    ) VALUES (
      new_user_id::text,
      new_user_id,
      jsonb_build_object(
        'sub', new_user_id::text,
        'email', 'admin0@jetadisyon.com',
        'email_verified', false,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now(),
      gen_random_uuid()
    );

    -- Admin profile: role admin, no tenant membership
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new_user_id, 'Admin User', 'admin'::public.system_role);

    RAISE NOTICE 'Admin user created: admin0@jetadisyon.com';
  ELSE
    RAISE NOTICE 'Admin user already exists, skipping seed';
  END IF;
END;
$$;

DO $$
DECLARE
  tenant_id uuid;
  tenant_owner_user_id uuid;
  tenant_staff_user_id uuid;
BEGIN
  -- Create a test tenant if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE name = 'Test Tenant 0') THEN
    INSERT INTO public.tenants (id, name, contact_phone, status, license_status)
    VALUES (gen_random_uuid(), 'Test Tenant 0', '+905551234567', 'active', 'trial')
    RETURNING id INTO tenant_id;
    RAISE NOTICE 'Test tenant created';
  ELSE
    SELECT id INTO tenant_id FROM public.tenants WHERE name = 'Test Tenant 0';
    RAISE NOTICE 'Test tenant already exists, skipping creation';
  END IF;

  -- Only seed if the tenant owner user doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tenant_owner0@jetadisyon.com') THEN
    tenant_owner_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      "instance_id", "id", "aud", "role", "email", "encrypted_password",
      "email_confirmed_at", "invited_at", "confirmation_token",
      "confirmation_sent_at", "recovery_token", "recovery_sent_at",
      "email_change_token_new", "email_change", "email_change_sent_at",
      "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data",
      "is_super_admin", "created_at", "updated_at", "phone_confirmed_at",
      "phone_change_sent_at", "banned_until", "reauthentication_sent_at",
      "deleted_at"
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      tenant_owner_user_id,
      'authenticated',
      'authenticated',
      'tenant_owner0@jetadisyon.com',
      crypt('TenantOwner0123!', gen_salt('bf', 10)),
      now(),
      null,
      '',
      null,
      '',
      null,
      '',
      '',
      null,
      null,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"email_verified": true}'::jsonb,
      null,
      now(),
      now(),
      null,
      null,
      null,
      null,
      null
    );

    INSERT INTO auth.identities (
      "provider_id", "user_id", "identity_data", "provider",
      "last_sign_in_at", "created_at", "updated_at", "id"
    ) VALUES (
      tenant_owner_user_id::text,
      tenant_owner_user_id,
      jsonb_build_object(
        'sub', tenant_owner_user_id::text,
        'email', 'tenant_owner0@jetadisyon.com',
        'email_verified', false,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now(),
      gen_random_uuid()
    );

    -- Tenant owner: profile with role + tenant membership
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (tenant_owner_user_id, 'Test Owner', 'user'::public.system_role);

    INSERT INTO public.tenant_memberships (user_id, tenant_id, role)
    VALUES (tenant_owner_user_id, tenant_id, 'owner'::public.tenant_role);

    RAISE NOTICE 'Tenant owner user created: tenant_owner0@jetadisyon.com';
  ELSE
    RAISE NOTICE 'Tenant owner user already exists, skipping seed';
  END IF;

  -- Only seed if the tenant staff user doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tenant_staff0@jetadisyon.com') THEN
    tenant_staff_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      "instance_id", "id", "aud", "role", "email", "encrypted_password",
      "email_confirmed_at", "invited_at", "confirmation_token",
      "confirmation_sent_at", "recovery_token", "recovery_sent_at",
      "email_change_token_new", "email_change", "email_change_sent_at",
      "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data",
      "is_super_admin", "created_at", "updated_at", "phone_confirmed_at",
      "phone_change_sent_at", "banned_until", "reauthentication_sent_at",
      "deleted_at"
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      tenant_staff_user_id,
      'authenticated',
      'authenticated',
      'tenant_staff0@jetadisyon.com',
      crypt('TenantStaff0123!', gen_salt('bf', 10)),
      now(),
      null,
      '',
      null,
      '',
      null,
      '',
      '',
      null,
      null,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"email_verified": true}'::jsonb,
      null,
      now(),
      now(),
      null,
      null,
      null,
      null,
      null
    );

    INSERT INTO auth.identities (
      "provider_id", "user_id", "identity_data", "provider",
      "last_sign_in_at", "created_at", "updated_at", "id"
    ) VALUES (
      tenant_staff_user_id::text,
      tenant_staff_user_id,
      jsonb_build_object(
        'sub', tenant_staff_user_id::text,
        'email', 'tenant_staff0@jetadisyon.com',
        'email_verified', false,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now(),
      gen_random_uuid()
    );

    -- Tenant staff: profile with role + tenant membership
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (tenant_staff_user_id, 'Test Staff', 'user'::public.system_role);

    INSERT INTO public.tenant_memberships (user_id, tenant_id, role)
    VALUES (tenant_staff_user_id, tenant_id, 'staff'::public.tenant_role);

    RAISE NOTICE 'Tenant staff user created: tenant_staff0@jetadisyon.com';
  ELSE
    RAISE NOTICE 'Tenant staff user already exists, skipping seed';
  END IF;
END;
$$;
