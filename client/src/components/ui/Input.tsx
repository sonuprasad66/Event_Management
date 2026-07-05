import type { HTMLInputTypeAttribute, InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  size?: 'sm' | 'md';
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  className = '',
  id,
  size = 'md',
  type,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-') || undefined;
  const inputType: HTMLInputTypeAttribute | undefined = type;
  const paddingClass = leftIcon ? 'pl-10' : 'pl-3';
  const sizeClass = size === 'sm' ? 'py-1.5 text-sm' : 'py-2 text-sm';

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          type={inputType}
          className={`w-full rounded-lg border pr-3 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${paddingClass} ${sizeClass} ${error ? 'border-red-400 focus:ring-red-500' : 'border-gray-300'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="text-xs text-gray-500">{helperText}</p>}
    </div>
  );
}
