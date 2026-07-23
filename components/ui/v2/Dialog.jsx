'use client';

import { useEffect } from 'react';

// ─── Size map ─────────────────────────────────────────────────────────────────
var SIZES = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-xl',
  '2xl': 'max-w-2xl',
};

// ─── Dialog ───────────────────────────────────────────────────────────────────
function Dialog({ open, onClose, children, className = '', size = 'md' }) {
  // Escape key + body scroll lock
  useEffect(function() {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape' && onClose) onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return function() {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  var sizeClass = SIZES[size] || SIZES.md;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={
          'relative z-10 w-full ' +
          sizeClass +
          ' rounded-2xl bg-white shadow-xl animate-scale-in' +
          (className ? ' ' + className : '')
        }
      >
        {children}
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────
function DialogHeader({ children, className = '', ...props }) {
  return (
    <div className={'px-6 pt-6 pb-2 ' + className} {...props}>
      {children}
    </div>
  );
}

function DialogTitle({ children, className = '', ...props }) {
  return (
    <h2 className={'text-lg font-semibold text-gray-900 ' + className} {...props}>
      {children}
    </h2>
  );
}

function DialogDescription({ children, className = '', ...props }) {
  return (
    <p className={'mt-1 text-sm text-gray-500 leading-relaxed ' + className} {...props}>
      {children}
    </p>
  );
}

function DialogContent({ children, className = '', ...props }) {
  return (
    <div className={'px-6 py-4 ' + className} {...props}>
      {children}
    </div>
  );
}

function DialogFooter({ children, className = '', ...props }) {
  return (
    <div
      className={'flex items-center justify-end gap-3 px-6 pb-6 pt-2 ' + className}
      {...props}
    >
      {children}
    </div>
  );
}

Dialog.Header      = DialogHeader;
Dialog.Title       = DialogTitle;
Dialog.Description = DialogDescription;
Dialog.Content     = DialogContent;
Dialog.Footer      = DialogFooter;

export default Dialog;
