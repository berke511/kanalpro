'use client';

// ─── Base Skeleton ────────────────────────────────────────────────────────────
export default function Skeleton({
  className = '',
  height    = 'h-4',
  width     = 'w-full',
  rounded   = 'rounded',
  ...props
}) {
  return (
    <div
      className={'skeleton ' + height + ' ' + width + ' ' + rounded + (className ? ' ' + className : '')}
      role="status"
      aria-label="Laedt..."
      {...props}
    />
  );
}

// ─── SkeletonLine ─────────────────────────────────────────────────────────────
var WIDTHS = {
  full: 'w-full',
  '3/4': 'w-3/4',
  '2/3': 'w-2/3',
  '1/2': 'w-1/2',
  '1/3': 'w-1/3',
  '1/4': 'w-1/4',
};

export function SkeletonLine({ width = 'full', className = '' }) {
  var w = WIDTHS[width] || WIDTHS.full;
  return (
    <div className={'skeleton h-4 rounded ' + w + (className ? ' ' + className : '')} />
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────
export function SkeletonCard({ lines = 3, className = '' }) {
  var extra = lines > 2 ? lines - 2 : 0;
  return (
    <div
      className={'rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3 ' + className}
      role="status"
      aria-label="Laedt..."
    >
      <SkeletonLine width="1/2" />
      <SkeletonLine />
      {Array.from({ length: extra }).map(function(_, i) {
        return <SkeletonLine key={i} width="3/4" />;
      })}
    </div>
  );
}

// ─── SkeletonTable ────────────────────────────────────────────────────────────
export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div
      className={'rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden ' + className}
      role="status"
      aria-label="Laedt..."
    >
      {/* Header */}
      <div className="flex gap-4 bg-gray-50/80 px-4 py-3 border-b border-gray-200">
        {Array.from({ length: cols }).map(function(_, i) {
          return <div key={i} className="skeleton h-3 rounded flex-1" />;
        })}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map(function(_, ri) {
        return (
          <div key={ri} className="flex gap-4 px-4 py-3.5 border-b border-gray-100 last:border-0">
            {Array.from({ length: cols }).map(function(_, ci) {
              return (
                <div
                  key={ci}
                  className={'skeleton h-3 rounded flex-1' + (ci !== 0 ? ' opacity-70' : '')}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── SkeletonKpiGrid ──────────────────────────────────────────────────────────
export function SkeletonKpiGrid({ count = 4, className = '' }) {
  return (
    <div
      className={'grid grid-cols-2 gap-4 sm:grid-cols-4 ' + className}
      role="status"
      aria-label="Laedt..."
    >
      {Array.from({ length: count }).map(function(_, i) {
        return (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-8 w-24 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        );
      })}
    </div>
  );
}
