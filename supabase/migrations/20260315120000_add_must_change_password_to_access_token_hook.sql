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
  user_role public.app_role;
  user_tenant_id uuid;
  must_change boolean;
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

  -- Inject must_change_password only when true
  must_change := (claims -> 'user_metadata' ->> 'must_change_password')::boolean;
  IF must_change IS TRUE THEN
    claims := jsonb_set(claims, '{must_change_password}', 'true'::jsonb);
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
