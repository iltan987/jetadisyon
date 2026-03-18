import { redirect } from 'next/navigation';

import { getClaims } from '@/lib/supabase/server';

export default async function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { claims } = await getClaims();

  if (!claims) {
    redirect('/login');
  }

  // Only allow sessions established via recovery link (OTP).
  // Supabase JWT amr claim is AMREntry[] | string[] (RFC-8176 allows both).
  const amr = claims.amr as Array<{ method: string } | string> | undefined;
  const hasRecoverySession =
    Array.isArray(amr) &&
    amr.some((entry) =>
      typeof entry === 'string' ? entry === 'otp' : entry.method === 'otp',
    );
  if (!hasRecoverySession) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
