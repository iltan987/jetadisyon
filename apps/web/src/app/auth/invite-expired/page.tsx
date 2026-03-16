import Link from 'next/link';

import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';

export default function InviteExpiredPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Davet Bağlantısı Geçersiz</CardTitle>
            <CardDescription>
              Bu davet bağlantısının süresi dolmuş veya geçersiz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Yeni bir davet almak için yöneticinize başvurun.
            </p>
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Giriş Sayfasına Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
