'use client';

var variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 border border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600',
};

var sizes = {
  sm: 'px-3 py-1.5 text-xs min-h-[44px]',
  md: 'px-4 py-2 text-sm min-h-[44px]',
  lg: 'px-5 py-2.5 text-base min-h-[44px]',
};

export default function Button({ children, variant = 'secondary', size = 'md', disabled = false, className = '', ...props }) {
  var v = variants[variant] || variants.secondary;
  var s = sizes[size] || sizes.md;
  var d = disabled ? ' opacity-50 cursor-not-allowed' : '';
  return (
    <button
      disabled={disabled}
      className={'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ' + v + ' ' + s + d + (className ? ' ' + className : '')}
      {...props}
    >
      {children}
    </button>
  );
}
