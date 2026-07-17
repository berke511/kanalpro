'use client';
// KanalPro Design System â PX-010 Premium Audit
// Alle Komponenten sind projektweit standardisiert

import { X, Search } from 'lucide-react';

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
      className={`inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
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
      className={`inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
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
      className={`inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${className}`}
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
      className={`inline-flex items-center justify-center px-4 py-2 bg-transparent hover:bg-gray-100 text-gray-600 text-sm font-medium rounded-lg transition-colors min-h-[44px] dark:hover:bg-gray-800 dark:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
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
      className={`p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center dark:hover:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
    >
      <Icon size={16} />
    </button>
  );
}

// ===== CARDS =====

export function Card({ children, className = '', hover = false }) {
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm transition-all duration-200 ${hover ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''} ${className}`}>
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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 flex items-center gap-3 transition-all duration-200">
      {Icon && (
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color] ?? colorMap.blue}`}>
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0">
        {trend != null && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full block mb-1 w-fit ${trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {trend >= 0 ? 'â' : 'â'} {Math.abs(trend)}%
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
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
      {title && <p className="font-semibold mb-1">{title}</p>}
      {children}
    </div>
  );
}

export function WarningCard({ title, children }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
      {title && <p className="font-semibold mb-1">{title}</p>}
      {children}
    </div>
  );
}

export function SuccessCard({ title, children }) {
  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-400">
      {title && <p className="font-semibold mb-1">{title}</p>}
      {children}
    </div>
  );
}

// ===== BADGES =====

export function StatusBadge({ status }) {
  const cfg = {
    offen:          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    in_bearbeitung: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    abgeschlossen:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };
  const label = {
    offen:          'Offen',
    in_bearbeitung: 'In Bearbeitung',
    abgeschlossen:  'Abgeschlossen',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg[status] ?? 'bg-gray-100 text-gray-700'}`}>
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg[prioritaet] ?? 'bg-gray-100 text-gray-700'}`}>
      {label[prioritaet] ?? prioritaet}
    </span>
  );
}

export function RechnungBadge({ status }) {
  const cfg = {
    offen:        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    bezahlt:      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    ueberfaellig: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  const label = {
    offen:        'Offen',
    bezahlt:      'Bezahlt',
    ueberfaellig: 'ÃberfÃ¤llig',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg[status] ?? 'bg-gray-100 text-gray-700'}`}>
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
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
      {label}
    </span>
  );
}

export function WarningBadge({ label }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
      {label}
    </span>
  );
}

// ===== FORMULAR =====

export function FormInput({ label, id, type = 'text', value, onChange, placeholder, required = false, disabled = false }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
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
        className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      />
    </div>
  );
}

export function FormSelect({ label, id, value, onChange, options = [], required = false }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
        <label htmlFor={id} className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
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

export function Table({ headers = [], children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {headers.length > 0 && (
            <thead className="sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-700 z-10">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
    <td className={`px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 ${className}`}>
      {children}
    </td>
  );
}


export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50">
                {Array.from({ length: cols }).map((__, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" style={{ width: j === 0 ? '60%' : j === cols - 1 ? '30%' : '80%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TableCheckbox({ checked, onChange, indeterminate = false, ariaLabel = 'Zeile auswaehlen' }) {
  function setRef(el) {
    if (el) el.indeterminate = indeterminate;
  }
  return (
    <input
      ref={setRef}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
    />
  );
}

export function TableActions({ children }) {
  return (
    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
      {children}
    </div>
  );
}

// ===== EMPTY STATE =====

export function EmptyState({ icon: Icon, title, description, action, actionLabel }) {
  return (
    <div className="text-center py-16">
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
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-auto z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
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
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
        active
          ? 'bg-blue-600 text-white'
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
      className="h-9 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
        <p className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
          {title}
        </p>
      )}
      {children}
    </section>
  );
}


// ===== NEUE DESIGN SYSTEM KOMPONENTEN (XS-004A) =====

export function SearchInput({ placeholder = 'Suchen...', value, onChange, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
      />
    </div>
  );
}

export function FilterPill({ children, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer border ${
        active
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

export function AvatarCircle({ name = '', size = 'md', color = 'blue' }) {
  const initials = name.trim().slice(0, 2).toUpperCase() || '?';
  const sizeClasses = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <div className={`rounded-full flex items-center justify-center font-medium flex-shrink-0 ${sizeClasses[size]} ${colorClasses[color] || colorClasses.blue}`}>
      {initials}
    </div>
  );
}

export function TypeBadge({ type = '', label }) {
  const displayLabel = label || type;
  const isCompany = ['firma', 'unternehmen', 'company'].includes(type?.toLowerCase());
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
      isCompany
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-gray-50 text-gray-700 border-gray-200'
    }`}>
      {displayLabel}
    </span>
  );
}

export function ActionCell({ children }) {
  return (
    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      {children}
    </div>
  );
}

export function LoadingRow({ columns = 4 }) {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: i === 0 ? '60%' : i === columns - 1 ? '30%' : '80%' }} />
        </td>
      ))}
    </tr>
  );
}

export function LoadingCard() {
  return (
    <div className="rounded-xl border border-gray-100 p-4 mb-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
        </div>
        <div className="w-16 h-5 bg-gray-100 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export function SectionTitle({ children, className = '' }) {
  return (
    <h2 className={`text-base font-semibold text-gray-900 mb-4 ${className}`}>
      {children}
    </h2>
  );
}

export function StatHeader({ title, value, subtitle, icon: Icon, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="rounded-xl border border-gray-100 shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${colorMap[color] || colorMap.blue}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}


// ─── Ergänzte Exporte (P0-001) ───────────────────────────────────────────────

export function FormSection({ title, description, children, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="pb-2 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function SuccessBanner({ message, children, onClose, className = '' }) {
  const text = message || children;
  if (!text) return null;
  return (
    <div className={`bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3 ${className}`}>
      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <p className="text-sm text-green-700 flex-1">{text}</p>
      {onClose && (
        <button onClick={onClose} className="text-green-400 hover:text-green-600 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function FormError({ message, children, className = '' }) {
  const text = message || children;
  if (!text) return null;
  return (
    <div className={`bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3 ${className}`}>
      <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <p className="text-sm text-red-700">{text}</p>
    </div>
  );
}

export function FormFooter({ children, className = '' }) {
  return (
    <div className={`flex items-center gap-3 pt-5 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

export function MobileCommandBar({ actions = [], children, className = '' }) {
  return (
    <div className={`fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2 z-50 md:hidden ${className}`}>
      {children
        ? children
        : actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition disabled:opacity-60 ${
                action.primary
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {action.label}
            </button>
          ))}
    </div>
  );
}
