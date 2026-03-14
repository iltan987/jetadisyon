import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data } = await supabase.auth.getClaims();
  const userRole = data?.claims.app_metadata?.user_role;

  if (userRole === 'admin') {
    redirect('/admin/overview');
  }

  redirect('/dashboard');
}
