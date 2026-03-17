import { redirect } from 'next/navigation';

import { getClaims } from '@/lib/supabase/server';

export default async function Home() {
  const { claims } = await getClaims();

  if (!claims) {
    redirect('/login');
  }

  if (claims.app_metadata?.system_role === 'admin') {
    redirect('/admin/overview');
  }

  redirect('/dashboard');
}
