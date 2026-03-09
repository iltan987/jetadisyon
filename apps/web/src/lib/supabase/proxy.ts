import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
    return NextResponse.redirect(url);
  };

  // /login is only for unauthenticated users
  if (pathname.startsWith('/login') && user) {
    if (user) {
      if (user.app_metadata?.user_role === 'admin') {
        return redirectTo('/admin/overview');
      }
      return redirectTo('/');
    }
    return supabaseResponse;
  }

  // /admin requires an authenticated user with the admin role
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return redirectTo('/login');
    }
    if (user.app_metadata?.user_role !== 'admin') {
      return redirectTo('/');
    }
    return supabaseResponse;
  }

  // All other routes require authentication
  if (!user) {
    return redirectTo('/login');
  }

  return supabaseResponse;
}
