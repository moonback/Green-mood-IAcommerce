type BrowserSentry = {
  captureException: (error: unknown, context?: unknown) => void;
  captureMessage?: (message: string, context?: unknown) => void;
};

function getGlobalSentry(): BrowserSentry | null {
  const maybeSentry = (window as Window & { Sentry?: BrowserSentry }).Sentry;
  return maybeSentry ?? null;
}

export function initMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  window.addEventListener('error', (event) => {
    getGlobalSentry()?.captureException(event.error ?? new Error(event.message), {
      tags: { source: 'window.error' },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    getGlobalSentry()?.captureException(event.reason, {
      tags: { source: 'window.unhandledrejection' },
    });
  });

  getGlobalSentry()?.captureMessage?.('Monitoring initialized', {
    level: 'info',
    extra: { dsnConfigured: true },
  });
}
