'use client';

import { ChevronDown } from 'lucide-react';

// ─── State classes ────────────────────────────────────────────────────────────
var BASE = 'block w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-150 ' +
  'appearance-none cursor-pointer pr-10 ' +
  'focus:outline-none focus:ring-2 focus:ring-offset-0';

var STATES = {
  default:  'border-gray-300 bg-white text-gray-900 hover:border-gray-400 ' +
            'focus:border-primary-500 focus:ring-primary-500/20',
  error:    'border-red-400 bg-white text-red-900 ' +
            'focus:border-red-500 focus:ring-red-500/20',
  disabled: 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed',
};

// ─── Select component ─────────────────────────────────────────────────────────
export default function Select({
  label,
  helperText,
  error,
  required     = false,
  disabled     = false,
  id,
  className    = '',
  children,
  placeholder,
  ...props
}) {
  var state = disabled ? STATES.disabled : (error ? STATES.error : STATES.default);

  return (
    <div className={'flex flex-col gap-1.5 ' + className}>
      {label && (
        <label
          htmlFor={id}
          className={'text-sm font-medium ' + (error ? 'text-red-700' : 'text-gray-700')}
        >
          {label}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
          )}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          disabled={disabled}
          className={BASE + ' ' + state}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>{placeholder}</option>
          )}
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          aria-hidden="true"
        />
      </div>
      {(helperText || error) && (
        <p className={'text-xs ' + (error ? 'text-red-600' : 'text-gray-500')}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}
