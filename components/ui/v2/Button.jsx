'use client';

// ─── Variant styles ───────────────────────────────────────────────────────────
var VARIANTS = {
  primary:   'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-sm hover:shadow',
  secondary: 'bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-300 shadow-xs',
  ghost:     'hover:bg-gray-100 active:bg-gray-200 text-gray-600',
  danger:    'bg-danger-600 hover:bg-danger-700 active:bg-danger-800 text-white shadow-sm',
  success:   'bg-success-600 hover:bg-success-700 active:bg-success-800 text-white shadow-sm',
  outline:   'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100',
  warning:   'bg-warning-500 hover:bg-warning-600 active:bg-warning-700 text-white shadow-sm',
};

// ─── Size styles ─────────────────────────────────────────────────────────────
var SIZES = {
  xs:   'h-7 px-2.5 text-xs rounded-md gap-1',
  sm:   'h-8 px-3 text-sm rounded-lg gap-1.5',
  md:   'h-9 px-4 text-sm rounded-lg gap-2',
  lg:   'h-11 px-5 text-base rounded-xl gap-2',
  xl:   'h-12 px-6 text-base rounded-xl gap-2.5',
  icon: 'h-9 w-9 rounded-lg',
};

// ─── Loading spinner ─────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Button component ─────────────────────────────────────────────────────────
var BASE = 'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary-500 ' +
  'disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap';

export default function Button({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  fullWidth = false,
  children,
  className = '',
  type = 'button',
  ...props
}) {
  var v = VARIANTS[variant] || VARIANTS.primary;
  var s = SIZES[size]       || SIZES.md;
  var w = fullWidth ? ' w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={BASE + ' ' + v + ' ' + s + w + (className ? ' ' + className : '')}
      {...props}
    >
      {loading ? <LoadingSpinner /> : null}
      {children}
    </button>
  );
}
