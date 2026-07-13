// lib/realtimeEngine.js
// OS-003 Live Sync Engine — KanalPro
// Shared utility — no 'use client'. Works in both Server Components and client hooks.

/**
 * Tables monitored by the Live Sync Engine.
 * All must have a company_id column for row-level filtering.
 */
export const REALTIME_TABLES = [
  'auftraege',
  'kunden',
  'angebote',
  'rechnungen',
  'fahrzeuge',
  'company_members',
];

/**
 * Creates a Supabase Realtime subscription for a company.
 * Registers one channel: `company-${companyId}`.
 * Monitors all REALTIME_TABLES via postgres_changes with company_id filter.
 *
 * @param {object}    supabaseClient  Supabase client instance
 * @param {string}    companyId       Company/user UUID for filtering
 * @param {function}  onEvent         Callback: ({ table, eventType, new, old }) => void
 * @param {function}  [onStatus]      Optional: (status: string, err?: Error) => void
 * @returns {{ channel: object, unsubscribe: function }}
 */
export function createRealtimeSubscription(supabaseClient, companyId, onEvent, onStatus) {
  const channelName = `company-${companyId}`;
  let channel = supabaseClient.channel(channelName);

  for (const table of REALTIME_TABLES) {
    channel = channel.on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table,
        filter: `company_id=eq.${companyId}`,
      },
      (payload) => {
        onEvent({
          table,
          eventType: payload.eventType,
          new:       payload.new  ?? null,
          old:       payload.old  ?? null,
        });
      }
    );
  }

  channel.subscribe(onStatus ?? null);

  return {
    channel,
    unsubscribe: () => supabaseClient.removeChannel(channel),
  };
}

/**
 * Creates a polling fallback for when Realtime is unavailable.
 *
 * @param {function}  callback    Function to call on each poll tick
 * @param {number}    intervalMs  Poll interval in ms (default: 60000)
 * @returns {{ start: function, stop: function }}
 */
export function createPollingFallback(callback, intervalMs = 60000) {
  return {
    start: () => setInterval(callback, intervalMs),
    stop:  (intervalId) => clearInterval(intervalId),
  };
}
