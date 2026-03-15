import { redirect } from 'next/navigation';

import { getClaims } from '@/lib/supabase/server';

import { TenantNav } from './_components/tenant-nav';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { claims } = await getClaims();

  if (!claims) {
    redirect('/login');
  }

  if (claims.must_change_password === true) {
    redirect('/change-password');
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
