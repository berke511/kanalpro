'use client';
// hooks/useWorkspaceSync.js
// OS-003-A Live Sync Engine — Thin workspace sync hook

import { useEffect, useRef } from 'react';
import { useRealtimeContext } from '@/components/providers/RealtimeSyncProvider';

/**
 * Registriert einen workspace-spezifischen Callback im zentralen RealtimeSyncProvider.
 * Cleanup beim Unmount via unsubscribeWorkspace.
 *
 * @param {string} workspaceId Eindeutige ID des Workspace (z.B. 'executive-center')
 * @param {function} onUpdate Callback bei Realtime-Event oder Poll-Tick
 * @returns {{ connectionStatus: string }}
 */
export function useWorkspaceSync(workspaceId, onUpdate) {
  const { subscribeWorkspace, unsubscribeWorkspace, connectionStatus } = useRealtimeContext();
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    subscribeWorkspace(workspaceId, (event) => onUpdateRef.current?.(event));
    return () => unsubscribeWorkspace(workspaceId);
  }, [workspaceId, subscribeWorkspace, unsubscribeWorkspace]);

  return { connectionStatus };
}
