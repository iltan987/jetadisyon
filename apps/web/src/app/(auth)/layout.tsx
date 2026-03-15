import { redirect } from 'next/navigation';

import { getUser } from '@/lib/supabase/server';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getUser();

  if (user) {
    redirect('/');
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
