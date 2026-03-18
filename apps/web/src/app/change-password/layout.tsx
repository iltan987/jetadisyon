import { redirect } from 'next/navigation';

import { getClaims } from '@/lib/supabase/server';

export default async function ChangePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { claims } = await getClaims();

  if (!claims) {
    redirect('/login');
  }

  return <>{children}</>;
}
