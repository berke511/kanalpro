'use client';
// components/providers/RealtimeSyncProvider.js
// OS-003-A Live Sync Engine — Zentraler React Context Provider

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import supabase from '@/lib/supabase';
import { createRealtimeSubscription, createPollingFallback } from '@/lib/realtimeEngine';

const RealtimeSyncContext = createContext({
  companyId: null,
  connectionStatus: 'connecting',
  reconnect: () => {},
  lastEvent: null,
  subscribeWorkspace: () => {},
  unsubscribeWorkspace: () => {},
});

export function useRealtimeContext() {
  return useContext(RealtimeSyncContext);
}

export default function RealtimeSyncProvider({ children }) {
  const [companyId, setCompanyId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastEvent, setLastEvent] = useState(null);

  const subRef = useRef(null);
  const pollFbRef = useRef(null);
  const pollIdRef = useRef(null);
  const throttleTimerRef = useRef(null);
  const workspaceRegistryRef = useRef(new Map());

  // Resolve companyId via company_members — NIEMALS user.id als company_id verwenden
  useEffect(() => {
    async function resolveCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (data?.company_id) setCompanyId(data.company_id);
    }
    resolveCompany();
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIdRef.current !== null && pollFbRef.current) {
      pollFbRef.current.stop(pollIdRef.current);
      pollIdRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollIdRef.current !== null) return;
    const fb = createPollingFallback(() => {
      for (const cb of workspaceRegistryRef.current.values()) {
        cb({ table: null, eventType: 'POLL', new: null, old: null });
      }
    }, 60000);
    pollFbRef.current = fb;
    pollIdRef.current = fb.start();
  }, []);

  const dispatchToWorkspaces = useCallback((event) => {
    // Debounce: Events innerhalb 5 Sekunden buendeln
    if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    throttleTimerRef.current = setTimeout(() => {
      setLastEvent(event);
      for (const cb of workspaceRegistryRef.current.values()) {
        cb(event);
      }
    }, 5000);
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
      (event) => dispatchToWorkspaces(event),
      (status, err) => {
        if (err) console.error('[RealtimeSyncProvider] Channel error:', err);
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
  }, [companyId, stopPolling, startPolling, dispatchToWorkspaces]);

  useEffect(() => {
    if (!companyId) return;
    connect();
    return () => {
      subRef.current?.unsubscribe();
      subRef.current = null;
      stopPolling();
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, [companyId, connect, stopPolling]);

  const reconnect = useCallback(() => {
    setConnectionStatus('reconnecting');
    connect();
  }, [connect]);

  const subscribeWorkspace = useCallback((workspaceId, callback) => {
    workspaceRegistryRef.current.set(workspaceId, callback);
  }, []);

  const unsubscribeWorkspace = useCallback((workspaceId) => {
    workspaceRegistryRef.current.delete(workspaceId);
  }, []);

  return (
    <RealtimeSyncContext.Provider value={{
      companyId,
      connectionStatus,
      reconnect,
      lastEvent,
      subscribeWorkspace,
      unsubscribeWorkspace,
    }}>
      {children}
    </RealtimeSyncContext.Provider>
  );
}
