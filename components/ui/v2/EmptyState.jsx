'use client';

// ─── EmptyState component ─────────────────────────────────────────────────────
// Use inside Table.Body or Card.Content to communicate "nothing here yet".
//
// Props:
//   icon        — Lucide icon component (optional)
//   title       — Main heading (required)
//   description — Supporting text (optional)
//   action      — onClick handler for the CTA button (optional)
//   actionLabel — Label for the CTA button (optional, required when action is set)
//   className   — Extra wrapper classes (optional)

export default function EmptyState({
  icon: Icon,
  title       = 'Keine Eintraege vorhanden',
  description,
  action,
  actionLabel,
  className   = '',
}) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in ' +
        className
      }
    >
      {Icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <Icon className="h-7 w-7 text-gray-400" aria-hidden="true" />
        </div>
      ) : null}

      <h3 className="text-base font-semibold text-gray-900">{title}</h3>

      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-gray-500 leading-relaxed">
          {description}
        </p>
      ) : null}

      {action && actionLabel ? (
        <button
          onClick={action}
          className={
            'mt-5 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 ' +
            'text-sm font-medium text-white shadow-sm ' +
            'hover:bg-primary-700 active:bg-primary-800 ' +
            'transition-all duration-150 ' +
            'focus-visible:outline-none focus-visible:ring-2 ' +
            'focus-visible:ring-primary-500 focus-visible:ring-offset-1'
          }
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
