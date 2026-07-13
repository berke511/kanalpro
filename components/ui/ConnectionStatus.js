'use client';
// components/ui/ConnectionStatus.js
// OS-003 Live Sync Engine — Connection Status Indicator for Dashboard Topbar

import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Compact connection status indicator for the dashboard topbar.
 * Minimized (green dot only) when connected; expands to show status + action when degraded.
 *
 * @param {{ status: 'connected'|'connecting'|'offline'|'reconnecting', onReconnect: function }} props
 */
export default function ConnectionStatus({ status, onReconnect }) {
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
      {onReconnect && (
        <button
          type="button"
          onClick={onReconnect}
          aria-label="Erneut verbinden"
          className="ml-1 p-0.5 rounded hover:bg-red-100 transition focus:outline-none focus:ring-1 focus:ring-red-400"
        >
          <RefreshCw size={11} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
