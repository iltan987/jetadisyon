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
  const userRole = data?.claims?.app_metadata?.user_role;

  if (userRole === 'admin') {
    redirect('/admin/overview');
  }

  // Non-admin authenticated users: no dashboard yet
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">
        Panele erişiminiz henüz hazır değil.
      </p>
    </div>
  );
}
