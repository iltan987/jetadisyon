import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { clientEnv } from '@/lib/env/client';

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');

  if (!tokenHash || type !== 'invite') {
    const errorUrl = new URL('/auth/invite-expired', request.url);
    return NextResponse.redirect(errorUrl);
  }

  // Critical: Route Handler cookie pattern.
  // Create redirect response first, then wire Supabase client cookies to it.
  // Do NOT use createClient() from server.ts — next/headers cookies don't
  // propagate to redirect responses in Route Handlers.
  const redirectUrl = new URL('/set-password', request.url);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'invite',
  });

  if (error) {
    const errorUrl = new URL('/auth/invite-expired', request.url);
    return NextResponse.redirect(errorUrl);
  }

  // Session cookies are set on the response by the SSR client
  return response;
}
