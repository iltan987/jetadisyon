-- Add must_change_password to JWT claims via custom_access_token_hook.
-- Only injected as a top-level claim when true; omitted otherwise.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  v_system_role text;
  v_tenant_role text;
  v_tenant_id uuid;
  must_change boolean;
BEGIN
  claims := event -> 'claims';

  -- 1. Read system role from profiles (always present for valid users)
  SELECT p.role::text INTO v_system_role
  FROM public.profiles p
  WHERE p.id = (event ->> 'user_id')::uuid;

  -- 2. Read tenant membership (if exists)
  SELECT tm.role::text, tm.tenant_id
  INTO v_tenant_role, v_tenant_id
  FROM public.tenant_memberships tm
  WHERE tm.user_id = (event ->> 'user_id')::uuid
  ORDER BY tm.created_at ASC
  LIMIT 1;

  -- 3. Inject both roles into app_metadata
  IF v_system_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata}',
      COALESCE(claims -> 'app_metadata', '{}'::jsonb) ||
      jsonb_build_object(
        'system_role', v_system_role,
        'tenant_role', v_tenant_role,
        'tenant_id', v_tenant_id
      )
    );
  END IF;

  -- Inject must_change_password only when true
  must_change := (claims -> 'user_metadata' ->> 'must_change_password')::boolean;
  IF must_change IS TRUE THEN
    claims := jsonb_set(claims, '{must_change_password}', 'true'::jsonb);
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
