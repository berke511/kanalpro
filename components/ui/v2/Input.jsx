'use client';

export default function Input({ label, placeholder, helperText, error, required = false, disabled = false, id, className = '', ...props }) {
  const inputBase = 'block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0';
  const inputState = error
    ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500';
  const disabledClass = disabled ? ' bg-gray-50 cursor-not-allowed opacity-50' : ' bg-white';

  return (
    <div className={'flex flex-col gap-1 ' + className}>
      {label && (
        <label htmlFor={id} className={'text-sm font-medium ' + (error ? 'text-red-700' : 'text-gray-700')}>
          {label}{required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={inputBase + ' ' + inputState + disabledClass}
        {...props}
      />
      {(helperText || error) && (
        <p className={'text-xs ' + (error ? 'text-red-600' : 'text-gray-500')}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}
