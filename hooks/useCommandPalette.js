'use client';
// hooks/useCommandPalette.js
// OS-004 Command Palette — Global State & Context

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getGlobalActions } from '@/lib/searchEngine';

const HISTORY_KEY = 'kanalpro-command-history';
const MAX_HISTORY = 10;

function loadHistory() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveHistory(items) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {}
}

const CommandPaletteContext = createContext({
  isOpen: false,
  query: '',
  setQuery: () => {},
  results: [],
  setResults: () => {},
  selectedIndex: 0,
  setSelectedIndex: () => {},
  history: [],
  addToHistory: () => {},
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function CommandPaletteProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState([]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
  }, []);

  const open = useCallback(() => {
    const h = loadHistory();
    setHistory(h);
    setQuery('');
    setResults([...h, ...getGlobalActions()]);
    setSelectedIndex(0);
    setIsOpen(true);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      if (prev) {
        setQuery('');
        setResults([]);
        setSelectedIndex(0);
        return false;
      }
      const h = loadHistory();
      setHistory(h);
      setQuery('');
      setResults([...h, ...getGlobalActions()]);
      setSelectedIndex(0);
      return true;
    });
  }, []);

  const addToHistory = useCallback((item) => {
    const current = loadHistory();
    const deduped = current.filter(h => h.id !== item.id);
    const updated = [item, ...deduped].slice(0, MAX_HISTORY);
    saveHistory(updated);
    setHistory(updated);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key === 'k') {
        e.preventDefault();
        toggle();
        return;
      }
      if (e.key === 'Escape') {
        setIsOpen(prev => {
          if (prev) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            return false;
          }
          return prev;
        });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return (
    <CommandPaletteContext.Provider value={{
      isOpen,
      query,
      setQuery,
      results,
      setResults,
      selectedIndex,
      setSelectedIndex,
      history,
      addToHistory,
      open,
      close,
      toggle,
    }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const { isOpen, open, close, toggle } = useContext(CommandPaletteContext);
  return { isOpen, open, close, toggle };
}

export function useCommandPaletteContext() {
  return useContext(CommandPaletteContext);
}
