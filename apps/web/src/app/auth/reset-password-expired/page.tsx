import Link from 'next/link';

import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';

export default function ResetPasswordExpiredPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Bağlantı Geçersiz</CardTitle>
            <CardDescription>
              Şifre sıfırlama bağlantısının süresi dolmuş veya geçersiz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Yeni bir şifre sıfırlama bağlantısı talep edebilirsiniz.
            </p>
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href="/forgot-password" />}
            >
              Yeni Bağlantı İste
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
