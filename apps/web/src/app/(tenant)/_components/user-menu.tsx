'use client';

import { ChevronDownIcon, LockKeyholeIcon, LogOutIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';

import { ThemeSubmenu } from '@/components/theme-submenu';
import { useAuth } from '@/hooks/use-auth';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
        <span className="max-w-40 truncate text-sm">{user?.email}</span>
        <ChevronDownIcon className="ml-1 h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <p className="text-muted-foreground truncate text-sm">
              {user?.email}
            </p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ThemeSubmenu />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/change-password')}>
          <LockKeyholeIcon className="mr-2 h-4 w-4" />
          Şifremi Değiştir
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut} variant="destructive">
          <LogOutIcon className="mr-2 h-4 w-4" />
          Çıkış Yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
