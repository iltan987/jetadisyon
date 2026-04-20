import { useTranslation } from '@repo/i18n';
import { Button } from '@repo/ui/components/shadcn/button';

import { useManualReviewQueue } from '../../hooks/useManualReviewQueue';

function formatCountdown(expiresAt: number): string {
  const remaining = Math.max(0, expiresAt - Date.now());
  const secs = Math.floor(remaining / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function ManualReviewQueuePage() {
  const { t } = useTranslation();
  const { queue, acceptOrder } = useManualReviewQueue();

  if (queue.length === 0) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">{t('queue.empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">{t('queue.title')}</h1>
      <div className="flex flex-col gap-3">
        {queue.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs text-muted-foreground">
                {entry.platform_order_id}
              </span>
              <span>
                {t('queue.platform')}: <strong>{entry.platform_id}</strong>
              </span>
              <span>
                {t('queue.total')}:{' '}
                <strong>₺{entry.total_value.toFixed(2)}</strong>
              </span>
              <span className="text-xs text-muted-foreground">
                {t('queue.received_at')}: {formatTime(entry.received_at)}
              </span>
              <span className="font-mono text-xs text-destructive">
                {t('queue.expires_in')}: {formatCountdown(entry.expires_at)}
              </span>
            </div>
            <Button onClick={() => void acceptOrder(entry.id)}>
              {t('queue.accept')}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
