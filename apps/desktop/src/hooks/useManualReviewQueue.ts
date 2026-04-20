import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState } from 'react';

export interface ManualReviewEntry {
  id: string;
  platform_order_id: string;
  platform_id: string;
  items_json: string;
  total_value: number;
  received_at: number;
  expires_at: number;
}

export function useManualReviewQueue() {
  const [queue, setQueue] = useState<ManualReviewEntry[]>([]);

  const refreshQueue = useCallback(() => {
    invoke<ManualReviewEntry[]>('list_queue')
      .then(setQueue)
      .catch(console.error);
  }, []);

  const acceptOrder = useCallback(
    (id: string) => {
      invoke('remove_from_queue', { id })
        .then(refreshQueue)
        .catch(console.error);
    },
    [refreshQueue],
  );

  useEffect(() => {
    refreshQueue();
    const interval = setInterval(refreshQueue, 5000);
    return () => clearInterval(interval);
  }, [refreshQueue]);

  return { queue, acceptOrder, refreshQueue };
}
