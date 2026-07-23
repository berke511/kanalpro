'use client';

// ─── ErrorState component ─────────────────────────────────────────────────────
// Use inside Card.Content or Page.Content to show error conditions.
//
// Props:
//   title      — Error heading (optional)
//   message    — Error detail text (optional)
//   onRetry    — Retry callback (optional)
//   retryLabel — CTA label for retry button (optional)
//   className  — Extra wrapper classes (optional)

export default function ErrorState({
  title      = 'Fehler beim Laden',
  message    = 'Die Daten konnten nicht geladen werden. Bitte versuche es erneut.',
  onRetry,
  retryLabel = 'Erneut versuchen',
  className  = '',
}) {
  return (
    <div
      className={'flex flex-col items-center justify-center py-12 px-8 text-center animate-fade-in ' + className}
      role="alert"
    >
      {/* Icon */}
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
        <svg
          className="h-7 w-7 text-red-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <h3 className="text-base font-semibold text-gray-900">{title}</h3>

      <p className="mt-1.5 max-w-sm text-sm text-gray-500 leading-relaxed">
        {message}
      </p>

      {onRetry ? (
        <button
          onClick={onRetry}
          className={
            'mt-5 inline-flex items-center rounded-lg border border-gray-300 bg-white ' +
            'px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ' +
            'hover:bg-gray-50 active:bg-gray-100 ' +
            'transition-all duration-150 ' +
            'focus-visible:outline-none focus-visible:ring-2 ' +
            'focus-visible:ring-primary-500 focus-visible:ring-offset-1'
          }
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
