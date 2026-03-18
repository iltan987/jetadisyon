'use client';

import { CheckIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@repo/ui/components/ui/dropdown-menu';

const THEME_OPTIONS = [
  ['light', 'Açık'],
  ['dark', 'Koyu'],
  ['system', 'Sistem'],
] as const;

export function ThemeSubmenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <SunIcon className="dark:hidden" />
        <MoonIcon className="hidden dark:block" />
        Tema
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {THEME_OPTIONS.map(([value, label]) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
            {label}
            {theme === value && <CheckIcon className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
