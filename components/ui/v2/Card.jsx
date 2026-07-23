'use client';

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, className = '', interactive = false, onClick, ...props }) {
  var base = 'rounded-xl border border-gray-200 bg-white shadow-sm';
  var hover = (interactive || onClick)
    ? ' transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
    : '';
  return (
    <div
      className={base + hover + (className ? ' ' + className : '')}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Card.Header ─────────────────────────────────────────────────────────────
function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={'flex flex-col gap-1 px-6 pt-5 pb-0 ' + className} {...props}>
      {children}
    </div>
  );
}

// ─── Card.Title ──────────────────────────────────────────────────────────────
function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={'text-base font-semibold leading-tight text-gray-900 ' + className} {...props}>
      {children}
    </h3>
  );
}

// ─── Card.Description ────────────────────────────────────────────────────────
function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={'text-sm text-gray-500 leading-relaxed ' + className} {...props}>
      {children}
    </p>
  );
}

// ─── Card.Content ────────────────────────────────────────────────────────────
function CardContent({ children, className = '', ...props }) {
  return (
    <div className={'px-6 py-5 ' + className} {...props}>
      {children}
    </div>
  );
}

// ─── Card.Footer ─────────────────────────────────────────────────────────────
function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={'flex items-center px-6 py-4 border-t border-gray-100 ' + className} {...props}>
      {children}
    </div>
  );
}

Card.Header      = CardHeader;
Card.Title       = CardTitle;
Card.Description = CardDescription;
Card.Content     = CardContent;
Card.Footer      = CardFooter;

export default Card;
