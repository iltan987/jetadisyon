-- Migration: create_core_auth_schema
-- Story 1.1: Project Infrastructure & Admin Login
-- Creates core tables, RLS policies, and custom access token hook

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'tenant_owner', 'tenant_staff');

-- 2. Create tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  license_status text NOT NULL DEFAULT 'trial',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

-- 4. Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Indexes on foreign keys
CREATE INDEX idx_user_roles_tenant_id ON public.user_roles (tenant_id);
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs (actor_id);

-- 6. Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: admin full access (using subquery for per-query eval, not per-row)
CREATE POLICY policy_tenants_all_admin ON public.tenants
  FOR ALL USING (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

CREATE POLICY policy_user_roles_all_admin ON public.user_roles
  FOR ALL USING (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

CREATE POLICY policy_audit_logs_insert_authenticated ON public.audit_logs
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY policy_audit_logs_select_admin ON public.audit_logs
  FOR SELECT USING (((select auth.jwt()) -> 'app_metadata'::text ->> 'user_role'::text) = 'admin');

-- 7. Custom Access Token Hook
-- Injects user_role and tenant_id into JWT claims from user_roles table
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

  -- Look up role and tenant_id from user_roles table
  SELECT ur.role, ur.tenant_id INTO user_role, user_tenant_id
  FROM public.user_roles ur
  WHERE ur.user_id = (event ->> 'user_id')::uuid
  LIMIT 1;

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

-- 8. Grants for supabase_auth_admin (required for auth hooks to work)
-- See: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

GRANT ALL ON TABLE public.user_roles TO supabase_auth_admin;
REVOKE ALL ON TABLE public.user_roles FROM authenticated, anon, public;

-- Allow auth hook to read user_roles through RLS
CREATE POLICY policy_user_roles_auth_admin_read ON public.user_roles
  AS PERMISSIVE FOR SELECT
  TO supabase_auth_admin
  USING (true);
