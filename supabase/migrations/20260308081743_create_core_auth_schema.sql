-- Migration: create_core_auth_schema
-- Story 1.1: Project Infrastructure & Admin Login
-- Story 1.2: Tenant Creation & Owner Account Setup (schema restructure)
-- Creates core tables, RLS policies, and custom access token hook

-- 1. Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'tenant_owner', 'tenant_staff');
CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'inactive');
CREATE TYPE public.tenant_license_status AS ENUM ('trial', 'active', 'expired', 'cancelled');

-- 2. Create tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_phone text,
  status public.tenant_status NOT NULL DEFAULT 'active',
  license_status public.tenant_license_status NOT NULL DEFAULT 'trial',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create profiles table (1:1 with auth.users — structured user data)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create tenant_memberships table (1:N — one user can belong to multiple tenants)
CREATE TABLE public.tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_memberships_user_tenant_key UNIQUE (user_id, tenant_id)
);

-- 5. Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Indexes on foreign keys and frequently queried columns
CREATE INDEX idx_tenant_memberships_user_id ON public.tenant_memberships (user_id);
CREATE INDEX idx_tenant_memberships_tenant_id ON public.tenant_memberships (tenant_id);
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX idx_profiles_role ON public.profiles (role);

-- 7. Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies

-- tenants: combined SELECT (admin OR member)
CREATE POLICY policy_tenants_select ON public.tenants
  FOR SELECT USING (
    ((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin'
    OR id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = (select auth.uid()))
  );

-- tenants: admin-only INSERT/UPDATE/DELETE
CREATE POLICY policy_tenants_insert_admin ON public.tenants
  FOR INSERT WITH CHECK (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

CREATE POLICY policy_tenants_update_admin ON public.tenants
  FOR UPDATE USING (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

CREATE POLICY policy_tenants_delete_admin ON public.tenants
  FOR DELETE USING (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

-- profiles: combined SELECT (admin OR own row)
CREATE POLICY policy_profiles_select ON public.profiles
  FOR SELECT USING (
    ((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin'
    OR id = (select auth.uid())
  );

-- profiles: admin-only INSERT/UPDATE/DELETE
CREATE POLICY policy_profiles_insert_admin ON public.profiles
  FOR INSERT WITH CHECK (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

CREATE POLICY policy_profiles_update_admin ON public.profiles
  FOR UPDATE USING (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

CREATE POLICY policy_profiles_delete_admin ON public.profiles
  FOR DELETE USING (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

-- tenant_memberships: combined SELECT (admin OR own rows)
CREATE POLICY policy_tenant_memberships_select ON public.tenant_memberships
  FOR SELECT USING (
    ((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin'
    OR user_id = (select auth.uid())
  );

-- tenant_memberships: admin-only INSERT/UPDATE/DELETE
CREATE POLICY policy_tenant_memberships_insert_admin ON public.tenant_memberships
  FOR INSERT WITH CHECK (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

CREATE POLICY policy_tenant_memberships_update_admin ON public.tenant_memberships
  FOR UPDATE USING (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

CREATE POLICY policy_tenant_memberships_delete_admin ON public.tenant_memberships
  FOR DELETE USING (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

-- audit_logs: authenticated users can INSERT
CREATE POLICY policy_audit_logs_insert_authenticated ON public.audit_logs
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

-- audit_logs: admin can SELECT
CREATE POLICY policy_audit_logs_select_admin ON public.audit_logs
  FOR SELECT USING (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

-- 10. Custom Access Token Hook
-- Injects user_role and tenant_id into JWT claims from profiles + tenant_memberships
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  user_role public.app_role;
  user_tenant_id uuid;
BEGIN
  claims := event -> 'claims';

  -- Look up role from profiles table
  SELECT p.role INTO user_role
  FROM public.profiles p
  WHERE p.id = (event ->> 'user_id')::uuid;

  -- Look up tenant_id from tenant_memberships table
  SELECT tm.tenant_id INTO user_tenant_id
  FROM public.tenant_memberships tm
  WHERE tm.user_id = (event ->> 'user_id')::uuid
  LIMIT 1;  -- picks first tenant for now; tenant switching is a future feature

  -- Inject into app_metadata claims
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata}',
      COALESCE(claims -> 'app_metadata', '{}'::jsonb) ||
      jsonb_build_object('user_role', user_role::text, 'tenant_id', user_tenant_id)
    );
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- 11. Grants for supabase_auth_admin (required for auth hooks to work)
-- See: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;
REVOKE ALL ON TABLE public.profiles FROM authenticated, anon, public;

GRANT ALL ON TABLE public.tenant_memberships TO supabase_auth_admin;
REVOKE ALL ON TABLE public.tenant_memberships FROM authenticated, anon, public;

-- Allow auth hook to read profiles through RLS
CREATE POLICY policy_profiles_auth_admin_read ON public.profiles
  AS PERMISSIVE FOR SELECT
  TO supabase_auth_admin
  USING (true);

-- Allow auth hook to read tenant_memberships through RLS
CREATE POLICY policy_tenant_memberships_auth_admin_read ON public.tenant_memberships
  AS PERMISSIVE FOR SELECT
  TO supabase_auth_admin
  USING (true);
