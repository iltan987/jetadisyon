import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Separator } from '@repo/ui/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@repo/ui/components/ui/sidebar';

import { getClaims } from '@/lib/supabase/server';

import { AdminSidebar } from './_components/admin-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { claims } = await getClaims();

  if (!claims) {
    redirect('/login');
  }

  if (claims.app_metadata?.system_role !== 'admin') {
    redirect('/');
  }

  const cookieStore = await cookies();
  const sidebarState = cookieStore.get('sidebar_state')?.value;
  const defaultOpen = sidebarState !== 'false';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
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
