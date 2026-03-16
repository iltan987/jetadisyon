import { redirect } from 'next/navigation';

import { getClaims } from '@/lib/supabase/server';

export default async function SetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { claims } = await getClaims();

  if (!claims) {
    redirect('/login');
  }

  // Only allow access when invitation is pending
  if (claims.invitation_pending !== true) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
