'use client';

// ─── Trend directions ─────────────────────────────────────────────────────────
var TREND_STYLES = {
  up:      'text-emerald-600 bg-emerald-50 border border-emerald-200',
  down:    'text-rose-600   bg-rose-50   border border-rose-200',
  neutral: 'text-gray-500   bg-gray-100  border border-gray-200',
};

// ─── Trend arrow icons ────────────────────────────────────────────────────────
function TrendArrow({ direction }) {
  if (direction === 'up') {
    return (
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M6 2 10 7H8v3H4V7H2z" />
      </svg>
    );
  }
  if (direction === 'down') {
    return (
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M6 10 2 5h2V2h4v3h2z" />
      </svg>
    );
  }
  return (
    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <rect x="2" y="5" width="8" height="2" />
    </svg>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function KpiCardSkeleton({ className }) {
  return (
    <div className={'rounded-xl border border-gray-200 bg-white p-5 shadow-sm ' + (className || '')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-8 w-28 rounded" />
        </div>
        <div className="skeleton h-10 w-10 rounded-xl flex-shrink-0" />
      </div>
      <div className="mt-4 skeleton h-4 w-24 rounded" />
    </div>
  );
}

// ─── KpiCard component ────────────────────────────────────────────────────────
export default function KpiCard({
  title,
  value,
  unit,
  trend,
  trendLabel,
  icon: Icon,
  iconColor = 'text-primary-600',
  iconBg    = 'bg-primary-50',
  loading   = false,
  className = '',
  onClick,
  ...props
}) {
  if (loading) {
    return <KpiCardSkeleton className={className} />;
  }

  var trendDir   = trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral';
  var trendStyle = TREND_STYLES[trendDir];
  var interactive = (onClick)
    ? ' transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
    : '';

  return (
    <div
      className={'rounded-xl border border-gray-200 bg-white p-5 shadow-sm ' + interactive + (className ? ' ' + className : '')}
      onClick={onClick}
      {...props}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 truncate">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums text-gray-900 tracking-tight">
              {value !== null && value !== undefined ? value : '—'}
            </span>
            {unit ? (
              <span className="text-sm font-medium text-gray-500">{unit}</span>
            ) : null}
          </div>
        </div>
        {Icon ? (
          <div className={'flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ' + iconBg}>
            <Icon className={'h-5 w-5 ' + iconColor} aria-hidden="true" />
          </div>
        ) : null}
      </div>

      {/* Bottom row: trend badge + label */}
      {(trend !== undefined && trend !== null) || trendLabel ? (
        <div className="mt-3 flex items-center gap-2">
          {trend !== undefined && trend !== null ? (
            <span className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ' + trendStyle}>
              <TrendArrow direction={trendDir} />
              {Math.abs(trend)}%
            </span>
          ) : null}
          {trendLabel ? (
            <span className="text-xs text-gray-500">{trendLabel}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
