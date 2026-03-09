import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminSidebar } from './_components/admin-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@repo/ui/components/ui/sidebar';
import { Separator } from '@repo/ui/components/ui/separator';

export default async function AdminLayout({
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

  // Role is injected into JWT by custom_access_token_hook, not stored in raw_app_meta_data.
  // Use getClaims() to read the actual JWT claims.
  const { data } = await supabase.auth.getClaims();
  const userRole = data?.claims?.app_metadata?.user_role;

  if (userRole !== 'admin') {
    redirect('/');
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4!" />
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
