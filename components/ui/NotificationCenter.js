'use client';
// components/ui/NotificationCenter.js
// OS-002 Notification Center — KanalPro

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import { getNotifications, groupNotifications } from '@/lib/notificationEngine';

// Icon registry
const ICON_MAP = {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
};

// Helpers
function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m    = Math.floor(diff / 60000);
  const h    = Math.floor(m / 60);
  const d    = Math.floor(h / 24);
  if (m <  1) return 'gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  if (h < 24) return `vor ${h}h`;
  if (d <  7) return `vor ${d}d`;
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

// Single notification row
function NotificationItem({ item, onClose }) {
  const IconComponent = ICON_MAP[item.icon] ?? Info;

  return (
    <Link
      href={item.link ?? '#'}
      onClick={onClose}
      className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.bgColor}`}>
        <IconComponent size={14} className={item.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 leading-tight">{item.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{item.message}</p>
      </div>
      <span className="text-[10px] text-gray-400 shrink-0 mt-0.5 whitespace-nowrap">
        {relativeTime(item.timestamp)}
      </span>
    </Link>
  );
}

// Group header + items
function NotificationGroup({ label, items, onClose }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 py-2 bg-gray-50 border-y border-gray-100 first:border-t-0">
        {label}
      </p>
      {items.map(item => (
        <div
          key={item.id}
          role={item.priority === 'critical' ? 'alert' : undefined}
          aria-live={item.priority === 'critical' ? 'assertive' : undefined}
        >
          <NotificationItem item={item} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

// Skeleton loader
function NotificationSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-2.5 bg-gray-100 rounded animate-pulse w-2/3" />
            <div className="h-2.5 bg-gray-100 rounded animate-pulse w-full" />
            <div className="h-2.5 bg-gray-100 rounded animate-pulse w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state
function NotificationEmpty() {
  return (
    <div className="py-12 text-center">
      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <Bell size={18} className="text-gray-300" />
      </div>
      <p className="text-sm font-semibold text-gray-700">Alles im grünen Bereich</p>
      <p className="text-xs text-gray-400 mt-1">Keine neuen Benachrichtigungen</p>
    </div>
  );
}

// Main Component
export default function NotificationCenter({ companyId }) {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [badgeCount,    setBadgeCount]    = useState(0);
  const dropdownRef                        = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await getNotifications(supabase, companyId, { limit: 50 });
      setNotifications(data);
      setBadgeCount(
        data.filter(n => n.priority === 'critical' || n.priority === 'warning').length
      );
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const grouped   = groupNotifications(notifications);
  const hasAny    = notifications.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>

      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Benachrichtigungen öffnen"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      >
        <Bell size={18} />
        {badgeCount > 0 && (
          <span
            aria-label={`${badgeCount} Benachrichtigungen`}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-[3px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Benachrichtigungen"
          className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">
              Benachrichtigungen
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Panel schließen"
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X size={14} />
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <NotificationSkeleton />
            ) : !hasAny ? (
              <NotificationEmpty />
            ) : (
              <>
                <NotificationGroup label="Heute"   items={grouped.heute}   onClose={() => setOpen(false)} />
                <NotificationGroup label="Gestern" items={grouped.gestern} onClose={() => setOpen(false)} />
                <NotificationGroup label="Älter"   items={grouped.aelter}  onClose={() => setOpen(false)} />
              </>
            )}
          </div>

          {hasAny && !loading && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-[11px] text-gray-400 text-center">
                {notifications.length}&nbsp;
                Benachrichtigung{notifications.length !== 1 ? 'en' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
