'use client';

// ─── Page wrapper ─────────────────────────────────────────────────────────────
function Page({ children, className = '', ...props }) {
  return (
    <div className={'min-h-screen ' + className} {...props}>
      {children}
    </div>
  );
}

// ─── Page.Header ─────────────────────────────────────────────────────────────
function PageHeader({ children, className = '', ...props }) {
  return (
    <div className={'mb-6 ' + className} {...props}>
      {children}
    </div>
  );
}

// ─── Page.Title ──────────────────────────────────────────────────────────────
function PageTitle({ children, className = '', ...props }) {
  return (
    <h1
      className={'text-2xl font-semibold tracking-tight text-gray-900 ' + className}
      {...props}
    >
      {children}
    </h1>
  );
}

// ─── Page.Description ────────────────────────────────────────────────────────
function PageDescription({ children, className = '', ...props }) {
  return (
    <p className={'mt-1 text-sm text-gray-500 leading-relaxed ' + className} {...props}>
      {children}
    </p>
  );
}

// ─── Page.Content ────────────────────────────────────────────────────────────
function PageContent({ children, className = '', ...props }) {
  return (
    <div className={'space-y-5 ' + className} {...props}>
      {children}
    </div>
  );
}

Page.Header      = PageHeader;
Page.Title       = PageTitle;
Page.Description = PageDescription;
Page.Content     = PageContent;

export default Page;
