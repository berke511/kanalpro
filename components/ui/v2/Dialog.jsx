'use client';

function Dialog({ open, onClose, children, className = '' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className={'relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl ' + className}>
        {children}
      </div>
    </div>
  );
}
function DialogHeader({ children, className = '', ...props }) {
  return <div className={'px-6 pt-6 pb-0 ' + className} {...props}>{children}</div>;
}
function DialogTitle({ children, className = '', ...props }) {
  return <h2 className={'text-lg font-semibold text-gray-900 ' + className} {...props}>{children}</h2>;
}
function DialogDescription({ children, className = '', ...props }) {
  return <p className={'mt-1 text-sm text-gray-500 ' + className} {...props}>{children}</p>;
}
function DialogContent({ children, className = '', ...props }) {
  return <div className={'px-6 py-4 ' + className} {...props}>{children}</div>;
}
function DialogFooter({ children, className = '', ...props }) {
  return <div className={'flex items-center justify-end gap-3 px-6 pb-6 ' + className} {...props}>{children}</div>;
}

Dialog.Header = DialogHeader;
Dialog.Title = DialogTitle;
Dialog.Description = DialogDescription;
Dialog.Content = DialogContent;
Dialog.Footer = DialogFooter;

export default Dialog;
