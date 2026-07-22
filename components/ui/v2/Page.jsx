'use client';

function Page({ children, className, ...props }) {
  const cn = 'min-h-screen p-4 sm:p-6' + (className ? ' ' + className : '');
  return (
    <div className={cn} {...props}>
      {children}
    </div>
  );
}

function PageHeader({ children, className, ...props }) {
  const cn = 'mb-6' + (className ? ' ' + className : '');
  return (
    <div className={cn} {...props}>
      {children}
    </div>
  );
}

function PageTitle({ children, className, ...props }) {
  const cn = 'text-2xl font-semibold tracking-tight' + (className ? ' ' + className : '');
  return (
    <h1 className={cn} {...props}>
      {children}
    </h1>
  );
}

function PageDescription({ children, className, ...props }) {
  const cn = 'mt-1 text-sm text-gray-500' + (className ? ' ' + className : '');
  return (
    <p className={cn} {...props}>
      {children}
    </p>
  );
}

function PageContent({ children, className, ...props }) {
  const cn = 'space-y-4' + (className ? ' ' + className : '');
  return (
    <div className={cn} {...props}>
      {children}
    </div>
  );
}

Page.Header = PageHeader;
Page.Title = PageTitle;
Page.Description = PageDescription;
Page.Content = PageContent;

export default Page;
