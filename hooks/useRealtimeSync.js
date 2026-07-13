'use client';
// hooks/useRealtimeSync.js
// OS-003 Live Sync Engine — React Hook

import { useEffect, useRef, useState, useCallback } from 'react';
import supabase from '@/lib/supabase';
import { createRealtimeSubscription, createPollingFallback } from '@/lib/realtimeEngine';

/**
 * React hook that manages a Supabase Realtime subscription for a company.
 * Automatically falls back to 60-second polling when the channel goes offline.
 * Cleans up on unmount — no memory leaks.
 *
 * @param {string|null} companyId  Company/user UUID — subscription is skipped when null
 * @param {function}    onUpdate   Called on any realtime event or polling tick
 * @returns {{ connectionStatus: 'connected'|'connecting'|'offline'|'reconnecting', reconnect: function }}
 */
export function useRealtimeSync(companyId, onUpdate) {
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const subRef    = useRef(null);
  const pollFbRef = useRef(null);
  const pollIdRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollIdRef.current !== null && pollFbRef.current) {
      pollFbRef.current.stop(pollIdRef.current);
      pollIdRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollIdRef.current !== null) return;
    const fb = createPollingFallback(() => {
      onUpdateRef.current?.({ table: null, eventType: 'POLL', new: null, old: null });
    }, 60000);
    pollFbRef.current = fb;
    pollIdRef.current = fb.start();
  }, []);

  const connect = useCallback(() => {
    if (!companyId) return;
    if (subRef.current) {
      subRef.current.unsubscribe();
      subRef.current = null;
    }
    stopPolling();
    setConnectionStatus('connecting');
    const sub = createRealtimeSubscription(
      supabase,
      companyId,
      (event) => onUpdateRef.current?.(event),
      (status, err) => {
        if (err) console.error('[RealtimeSync] Channel error:', err);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          stopPolling();
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('reconnecting');
          startPolling();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('offline');
          startPolling();
        }
      }
    );
    subRef.current = sub;
  }, [companyId, stopPolling, startPolling]);

  useEffect(() => {
    if (!companyId) return;
    connect();
    return () => {
      subRef.current?.unsubscribe();
      subRef.current = null;
      stopPolling();
    };
  }, [companyId, connect, stopPolling]);

  const reconnect = useCallback(() => {
    setConnectionStatus('reconnecting');
    connect();
  }, [connect]);

  return { connectionStatus, reconnect };
}
