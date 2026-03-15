import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { clientEnv } from '../env/client';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    return NextResponse.redirect(url);
  };

  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    // Don't set ?next= for root — it just role-redirects
    if (pathname !== '/') {
      const returnPath = pathname + request.nextUrl.search;
      url.searchParams.set('next', returnPath);
    }
    return NextResponse.redirect(url);
  };

  // First-pass guard. Server components (layouts/pages) are the authoritative source.

  // /login — let through unconditionally.
  // The auth layout handles redirect-if-authenticated via getUser(),
  // which also covers stale JWTs (deleted/banned user).
  if (pathname.startsWith('/login')) {
    return supabaseResponse;
  }

  // /admin — only authenticated admin
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return redirectToLogin();
    }
    if (user.app_metadata?.user_role !== 'admin') {
      return redirectTo('/');
    }
    return supabaseResponse;
  }

  // All other routes — only authenticated
  if (!user) {
    return redirectToLogin();
  }

  return supabaseResponse;
}
