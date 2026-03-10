'use client';

import {
  ActivityIcon,
  BuildingIcon,
  KeyIcon,
  LayoutDashboardIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@repo/ui/components/ui/sidebar';

const navItems = [
  { title: 'Genel Bakış', href: '/admin/overview', icon: LayoutDashboardIcon },
  { title: 'İşletmeler', href: '/admin/tenants', icon: BuildingIcon },
  { title: 'Lisanslar', href: '/admin/licenses', icon: KeyIcon },
  { title: 'Tanılama', href: '/admin/diagnostics', icon: ActivityIcon },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <span className="text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
          JetAdisyon
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Yönetim</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
