import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getClaims } from '@/lib/supabase/server';

import { TenantNav } from './_components/tenant-nav';

const STAFF_RESTRICTED_PATHS = ['/analytics', '/settings'];

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { claims } = await getClaims();

  if (!claims) {
    redirect('/login');
  }

  if (claims.invitation_pending === true) {
    redirect('/set-password');
  }

  if (claims.must_change_password === true) {
    redirect('/change-password');
  }

  // Authoritative guard: staff/employee cannot access analytics or settings
  const tenantRole = claims.app_metadata?.tenant_role;
  if (tenantRole === 'staff' || tenantRole === 'employee') {
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') ?? '';
    if (STAFF_RESTRICTED_PATHS.some((path) => pathname.startsWith(path))) {
      redirect('/dashboard');
    }
  }

  return (
    <div className="min-h-screen">
      <TenantNav />
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
