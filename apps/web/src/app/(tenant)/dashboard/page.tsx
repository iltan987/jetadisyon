import { Card, CardContent } from '@repo/ui/components/ui/card';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <Card>
        <CardContent className="flex min-h-75 items-center justify-center">
          <p className="text-muted-foreground text-lg">Henüz sipariş yok</p>
        </CardContent>
      </Card>
    </div>
  );
}
