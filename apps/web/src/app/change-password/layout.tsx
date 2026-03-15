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

  // Only allow access when forced password change is required
  if (claims.must_change_password !== true) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
