'use client';
// KanalPro Design System — PX-008
// Alle Komponenten sind projektweit standardisiert

import { X } from 'lucide-react';

// ===== DESIGN TOKENS =====

export const COLORS = {
  primary: 'blue',
  danger: 'red',
  success: 'green',
  warning: 'amber',
  info: 'blue',
};

export const STATUS_COLORS = {
  offen: 'yellow',
  in_bearbeitung: 'blue',
  abgeschlossen: 'green',
};

export const PRIORITAET_COLORS = {
  notfall: 'red',
  hoch: 'orange',
  normal: 'blue',
  niedrig: 'gray',
};

// ===== BUTTONS =====

export function PrimaryButton({ children, onClick, disabled, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, onClick, disabled, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 bg-transparent hover:bg-gray-100 text-gray-600 text-sm font-medium rounded-lg transition min-h-[40px] dark:hover:bg-gray-800 dark:text-gray-400 ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, onClick, label, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition min-h-[40px] min-w-[40px] flex items-center justify-center dark:hover:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-300 ${className}`}
    >
      <Icon size={16} />
    </button>
  );
}

// ===== CARDS =====

export function Card({ children, className = '', hover = false }) {
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm ${hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function KpiCard({ label, value, icon: Icon, trend, color = 'blue', loading = false }) {
  const colorMap = {
    blue:    'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green:   'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    yellow:  'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    amber:   'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red:     'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    orange:  'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    gray:    'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3">
      {Icon && (
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color] ?? colorMap.blue}`}>
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0">
        {trend != null && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full block mb-1 w-fit ${trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
        <div className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
          {loading
            ? <span className="inline-block w-7 h-6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            : value}
        </div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{label}</div>
      </div>
    </div>
  );
}

export function InfoCard({ title, children }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
      {title && <p className="font-semibold mb-1">{title}</p>}
      {children}
    </div>
  );
}

export function WarningCard({ title, children }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
      {title && <p className="font-semibold mb-1">{title}</p>}
      {children}
    </div>
  );
}

export function SuccessCard({ title, children }) {
  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg px-4 py-3 text-sm text-green-700 dark:text-green-400">
      {title && <p className="font-semibold mb-1">{title}</p>}
      {children}
    </div>
  );
}

// ===== BADGES =====

export function StatusBadge({ status }) {
  const cfg = {
    offen:         'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    in_bearbeitung:'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    abgeschlossen: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };
  const label = {
    offen:         'Offen',
    in_bearbeitung:'In Bearbeitung',
    abgeschlossen: 'Abgeschlossen',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {label[status] ?? status}
    </span>
  );
}

export function PrioritaetBadge({ prioritaet }) {
  const cfg = {
    notfall: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    hoch:    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    normal:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    niedrig: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  };
  const label = {
    notfall: 'Notfall',
    hoch:    'Hoch',
    normal:  'Normal',
    niedrig: 'Niedrig',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg[prioritaet] ?? 'bg-gray-100 text-gray-700'}`}>
      {label[prioritaet] ?? prioritaet}
    </span>
  );
}

export function RechnungBadge({ status }) {
  const cfg = {
    offen:       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    bezahlt:     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    ueberfaellig:'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  const label = {
    offen:       'Offen',
    bezahlt:     'Bezahlt',
    ueberfaellig:'Überfällig',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {label[status] ?? status}
    </span>
  );
}

export function NotdienstBadge() {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
      Notdienst
    </span>
  );
}

export function SuccessBadge({ label }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
      {label}
    </span>
  );
}

export function WarningBadge({ label }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
      {label}
    </span>
  );
}

// ===== FORMULAR =====

export function FormInput({ label, id, type = 'text', value, onChange, placeholder, required = false, disabled = false }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
      />
    </div>
  );
}

export function FormSelect({ label, id, value, onChange, options = [], required = false }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function FormTextarea({ label, id, value, onChange, placeholder, rows = 4 }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
      />
    </div>
  );
}

export function FormCheckbox({ label, id, checked, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label && (
        <label htmlFor={id} className="text-sm text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
    </div>
  );
}

// ===== TABELLE =====

export function Table({ headers = [], children, stickyHeader = false }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {headers.length > 0 && (
            <thead className={`border-b border-gray-100 dark:border-gray-600 ${stickyHeader ? 'sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-gray-50 dark:bg-gray-700'}`}>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TableRow({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`group transition-colors ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '' }) {
  return (
    <td className={`px-5 py-3 text-gray-500 dark:text-gray-400 ${className}`}>
      {children}
    </td>
  );
}

// ===== EMPTY STATE =====

export function EmptyState({ icon: Icon, title, description, action, actionLabel }) {
  return (
    <div className="text-center py-12">
      {Icon && (
        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon size={24} className="text-gray-300 dark:text-gray-600" />
        </div>
      )}
      {title && <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</p>}
      {description && <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">{description}</p>}
      {action && actionLabel && (
        <button
          type="button"
          onClick={action}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ===== MODAL =====

export function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-auto z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== FILTER BAR =====

export function FilterBar({ children }) {
  return (
    <div className="flex flex-wrap gap-2">
      {children}
    </div>
  );
}

export function FilterButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition min-h-[32px] ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

export function FilterSelect({ label, value, onChange, options = [] }) {
  return (
    <select
      value={value}
      onChange={onChange}
      aria-label={label}
      className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ===== PAGE LAYOUT =====

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageSection({ title, children }) {
  return (
    <section>
      {title && (
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          {title}
        </p>
      )}
      {children}
    </section>
  );
}
