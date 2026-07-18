'use client';

const variants = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export default function Badge({ variant = 'default', size = 'sm', children, className = '', ...props }) {
  const v = variants[variant] || variants.default;
  const s = sizes[size] || sizes.sm;
  return (
    <span className={'inline-flex items-center rounded-full font-medium ' + v + ' ' + s + ' ' + className} {...props}>
      {children}
    </span>
  );
}
