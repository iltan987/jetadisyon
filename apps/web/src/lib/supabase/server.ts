import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { clientEnv } from '../env/client';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

/**
 * Cached per-request: verifies JWT and returns claims.
 * Cheap when using asymmetric keys (JWKS cached), but still
 * deduplicated across the component tree via React.cache().
 */
export const getClaims = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  return { claims: data?.claims ?? null, error: error ?? null };
});

/**
 * Cached per-request: fetches the full user from the Auth server.
 * Use when you need verified, fresh user data beyond JWT claims.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user ?? null, error: error ?? null };
});
