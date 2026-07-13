'use client';
// components/ui/CommandPalette.js
// OS-004 Command Palette — UI Component

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, SearchX,
  PlusCircle, LayoutDashboard, CreditCard, Map,
  User, Wrench, Users, FileText, FileCheck, Truck, Clock,
} from 'lucide-react';
import supabase from '@/lib/supabase';
import { searchAll, getGlobalActions } from '@/lib/searchEngine';
import { useCommandPaletteContext } from '@/hooks/useCommandPalette';

const ICONS = {
  Search, X, SearchX,
  PlusCircle, LayoutDashboard, CreditCard, Map,
  User, Wrench, Users, FileText, FileCheck, Truck, Clock,
};

function DynIcon({ name, size = 20, className = '' }) {
  const Icon = ICONS[name];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}

function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    const cat = item.category ?? 'SONSTIGE';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(item);
  }
  return groups;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function CommandPalette({ companyId }) {
  const router = useRouter();
  const {
    isOpen,
    query,
    setQuery,
    results,
    setResults,
    selectedIndex,
    setSelectedIndex,
    history,
    addToHistory,
    close,
  } = useCommandPaletteContext();

  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  const handleQueryChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(0);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setResults([...history, ...getGlobalActions()]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        let cId = companyId;
        if (!cId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { setLoading(false); return; }
          const { data: mem } = await supabase
            .from('company_members')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
          cId = mem?.company_id;
        }
        if (!cId) { setLoading(false); return; }
        const r = await searchAll(supabase, cId, val);
        setResults(r);
      } catch (err) {
        console.error('[CommandPalette] search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, [companyId, history, setQuery, setResults, setSelectedIndex]);

  const flatResults = useMemo(() => results, [results]);

  const navigateTo = useCallback((item) => {
    addToHistory(item);
    close();
    router.push(item.link);
  }, [addToHistory, close, router]);

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter': {
        e.preventDefault();
        const item = flatResults[selectedIndex];
        if (item) navigateTo(item);
        break;
      }
      case 'Escape':
        close();
        break;
      case 'Tab': {
        e.preventDefault();
        const groups = groupByCategory(flatResults);
        let cumIdx = 0;
        for (const items of groups.values()) {
          if (cumIdx + items.length > selectedIndex) {
            const next = cumIdx + items.length;
            setSelectedIndex(next < flatResults.length ? next : 0);
            break;
          }
          cumIdx += items.length;
        }
        break;
      }
      default:
        break;
    }
  }, [flatResults, selectedIndex, setSelectedIndex, navigateTo, close]);

  if (!isOpen) return null;

  let _idx = 0;
  const indexedGroups = [...groupByCategory(flatResults).entries()].map(([cat, items]) => ({
    cat,
    items: items.map(item => ({ ...item, _flatIdx: _idx++ })),
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div
        className="relative max-w-2xl w-full mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Suchen oder Befehl eingeben..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            autoComplete="off"
            spellCheck="false"
            aria-label="Suche"
          />
          {query ? (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([...history, ...getGlobalActions()]); setSelectedIndex(0); }}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              aria-label="Suche leeren"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              Esc
            </kbd>
          )}
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto" role="listbox">
          {loading ? (
            <div className="py-2">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : query.length > 0 && flatResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                <SearchX size={22} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Keine Ergebnisse</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Keine Treffer für &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <div className="py-2">
              {indexedGroups.map(({ cat, items }) => (
                <div key={cat}>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {cat}
                  </p>
                  {items.map(item => {
                    const isSelected = item._flatIdx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        data-idx={item._flatIdx}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => navigateTo(item)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                          isSelected
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <DynIcon
                            name={item.icon}
                            size={16}
                            className={isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${
                            isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        {item.badge && (
                          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${item.badgeColor ?? 'bg-gray-100 text-gray-700'}`}>
                            {item.badge}
                          </span>
                        )}
                        {item.shortcut && (
                          <kbd className="shrink-0 hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 border border-gray-200 dark:border-gray-700">↑↓</kbd>
              navigieren
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 border border-gray-200 dark:border-gray-700">↵</kbd>
              öffnen
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 border border-gray-200 dark:border-gray-700">Tab</kbd>
              Kategorie
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {flatResults.length > 0 && `${flatResults.length} Ergebnis${flatResults.length !== 1 ? 'se' : ''}`}
          </span>
        </div>
      </div>
    </div>
  );
}
