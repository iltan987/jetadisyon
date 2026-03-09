import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // redirect(user ? '/admin/overview' : '/login');

  // For testing purposes, we'll just return the user object for now
  return (
    <div>
      <h1>Welcome to the Jet Adisyon Admin Panel</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}
