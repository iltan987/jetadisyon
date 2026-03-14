import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { TenantNav } from './_components/tenant-nav';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
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
