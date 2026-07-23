'use client';

// ─── State classes ────────────────────────────────────────────────────────────
var BASE = 'block w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-offset-0';

var STATES = {
  default:  'border-gray-300 bg-white text-gray-900 placeholder-gray-400 ' +
            'hover:border-gray-400 focus:border-primary-500 focus:ring-primary-500/20',
  error:    'border-red-400 bg-white text-red-900 placeholder-red-300 ' +
            'focus:border-red-500 focus:ring-red-500/20',
  disabled: 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed',
};

// ─── Input component ─────────────────────────────────────────────────────────
export default function Input({
  label,
  placeholder,
  helperText,
  error,
  required     = false,
  disabled     = false,
  id,
  className    = '',
  inputClassName = '',
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
      <input
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={BASE + ' ' + state + (inputClassName ? ' ' + inputClassName : '')}
        {...props}
      />
      {(helperText || error) && (
        <p className={'text-xs ' + (error ? 'text-red-600' : 'text-gray-500')}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}
