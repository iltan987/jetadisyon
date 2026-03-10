import '@repo/ui/globals.css';

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { Toaster } from '@repo/ui/components/ui/sonner';
import { TooltipProvider } from '@repo/ui/components/ui/tooltip';

import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'JetAdisyon',
  description: 'Order management for food businesses on delivery marketplaces',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
