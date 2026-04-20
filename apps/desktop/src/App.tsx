import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';

import { Button } from '@repo/ui/components/shadcn/button';

export function App() {
  useEffect(() => {
    invoke('show_window');
  }, []);

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">JetAdisyon</h1>
          <p>Desktop app ready.</p>
          <Button className="mt-2">Button</Button>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
      </div>
    </div>
  );
}
