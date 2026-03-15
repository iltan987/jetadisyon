'use client';

import {
  BarChart3Icon,
  LayoutDashboardIcon,
  LogOutIcon,
  SettingsIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@repo/ui/components/ui/button';
import { Separator } from '@repo/ui/components/ui/separator';

import { useAuth } from '@/hooks/use-auth';

const allNavItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboardIcon },
  {
    title: 'Analitik',
    href: '/analytics',
    icon: BarChart3Icon,
    roles: ['tenant_owner'],
  },
  {
    title: 'Ayarlar',
    href: '/settings',
    icon: SettingsIcon,
    roles: ['tenant_owner'],
  },
];

export function TenantNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const navItems = allNavItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role)),
  );

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-6">
        <span className="text-lg font-bold tracking-tight">JetAdisyon</span>
        <Separator orientation="vertical" className="h-6!" />
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Button
                key={item.href}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                nativeButton={false}
                render={<Link href={item.href} />}
              >
                <item.icon className="mr-1.5 h-4 w-4" />
                {item.title}
              </Button>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user && (
            <span className="text-muted-foreground text-sm">{user.email}</span>
          )}
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOutIcon className="mr-1.5 h-4 w-4" />
            Çıkış
          </Button>
        </div>
      </div>
    </header>
  );
}
