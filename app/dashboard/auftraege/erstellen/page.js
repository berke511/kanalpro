'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

/* ─────────────────────────────────────────────────────────────
   Konstanten
───────────────────────────────────────────────────────────── */
const AUFTRAGSARTEN = [
  'Rohrreinigung',
  'TV-Inspektion',
  'Dichtheitsprüfung',
  'Notdienst',
  'Wartung',
  'Sanierung',
  'Sonstiges',
];

function genNummer() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(10000 + Math.random() * 90000));
  return `AUF-${year}-${rand}`;
}

/* ─────────────────────────────────────────────────────────────
   Hilfskomponenten
───────────────────────────────────────────────────────────── */
function Svg({ d, cls = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function Label({ htmlFor, required, children }) {
  return (
    <label htmlFor={htmlFor}
      className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
      <Svg d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" cls="w-3 h-3 shrink-0" />
      {msg}
    </p>
  );
}

function inp(extra = '') {
  return `w-full px-3 py-2.5 border rounded-xl text-sm text-gray-900 placeholder-gray-300
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white ${extra}`;
}