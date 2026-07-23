'use client';

// ─── Variant map ──────────────────────────────────────────────────────────────
var VARIANTS = {
  default: 'bg-gray-100 text-gray-700 border border-gray-200',
  success: 'bg-green-50  text-green-700  border border-green-200',
  warning: 'bg-amber-50  text-amber-700  border border-amber-200',
  danger:  'bg-rose-50   text-rose-700   border border-rose-200',
  info:    'bg-blue-50   text-blue-700   border border-blue-200',
  primary: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
};

// ─── Size map ─────────────────────────────────────────────────────────────────
var SIZES = {
  xs: 'px-1.5 py-0   text-xs',
  sm: 'px-2   py-0.5 text-xs',
  md: 'px-2.5 py-1   text-sm',
};

// ─── Dot color map ───────────────────────────────────────────────────────────
var DOT_COLORS = {
  default: 'bg-gray-400',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger:  'bg-rose-500',
  info:    'bg-blue-500',
  primary: 'bg-indigo-500',
};

// ─── Badge component ─────────────────────────────────────────────────────────
export default function Badge({
  variant   = 'default',
  size      = 'sm',
  dot       = false,
  children,
  className = '',
  ...props
}) {
  var v = VARIANTS[variant]   || VARIANTS.default;
  var s = SIZES[size]         || SIZES.sm;
  var d = DOT_COLORS[variant] || DOT_COLORS.default;

  return (
    <span
      className={'inline-flex items-center gap-1.5 rounded-full font-medium ' + v + ' ' + s + (className ? ' ' + className : '')}
      {...props}
    >
      {dot ? (
        <span className={'h-1.5 w-1.5 rounded-full flex-shrink-0 ' + d} aria-hidden="true" />
      ) : null}
      {children}
    </span>
  );
}
