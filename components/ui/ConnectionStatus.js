'use client';
// components/ui/ConnectionStatus.js
// OS-003-A Live Sync Engine — Self-contained Connection Status Indicator

import { WifiOff, RefreshCw } from 'lucide-react';
import { useRealtimeContext } from '@/components/providers/RealtimeSyncProvider';

/**
 * Compact connection status indicator for the dashboard topbar.
 * Self-contained: reads status and reconnect directly from RealtimeSyncContext.
 * No props required.
 */
export default function ConnectionStatus() {
  const { connectionStatus: status, reconnect } = useRealtimeContext();

  if (status === 'connected') {
    return (
      <div
        title="Live — Echtzeit-Verbindung aktiv"
        aria-label="Verbunden"
        className="flex items-center justify-center w-5 h-5"
      >
        <span className="w-2 h-2 rounded-full bg-green-500" />
      </div>
    );
  }

  if (status === 'connecting' || status === 'reconnecting') {
    return (
      <div
        aria-live="polite"
        aria-label="Verbinde…"
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 text-xs text-amber-600"
      >
        <RefreshCw size={12} className="animate-spin shrink-0" aria-hidden="true" />
        <span>Verbinde…</span>
      </div>
    );
  }

  // offline
  return (
    <div
      aria-live="assertive"
      aria-label="Keine Verbindung"
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 text-xs text-red-600"
    >
      <WifiOff size={12} className="shrink-0" aria-hidden="true" />
      <span>Offline</span>
      <button
        type="button"
        onClick={reconnect}
        aria-label="Erneut verbinden"
        className="ml-1 p-0.5 rounded hover:bg-red-100 transition focus:outline-none focus:ring-1 focus:ring-red-400"
      >
        <RefreshCw size={11} aria-hidden="true" />
      </button>
    </div>
  );
}
