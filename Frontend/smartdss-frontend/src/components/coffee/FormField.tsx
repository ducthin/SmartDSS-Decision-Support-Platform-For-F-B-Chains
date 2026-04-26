import type { ChangeEventHandler, HTMLInputTypeAttribute } from 'react';
import { cn } from '@/utils/cn';

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  className?: string;
  fieldClassName?: string;
}

const baseFieldStyles =
  'w-full rounded-xl border border-[rgba(111,78,55,0.18)] bg-white/95 px-3.5 py-2.5 text-sm text-[var(--coffee-dark)] outline-none transition-all duration-300 ease-in-out placeholder:text-[rgba(62,42,31,0.5)] focus:border-[var(--coffee-accent)] focus:ring-4 focus:ring-[rgba(228,172,92,0.2)]';

export default function FormField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  multiline = false,
  rows = 4,
  required = false,
  className,
  fieldClassName,
}: FormFieldProps) {
  return (
    <label htmlFor={id} className={cn('block space-y-1.5', className)}>
      <span className="text-sm font-medium text-inherit">
        {label}
        {required ? ' *' : ''}
      </span>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          required={required}
          className={cn(baseFieldStyles, 'resize-none', fieldClassName)}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={cn(baseFieldStyles, fieldClassName)}
        />
      )}
    </label>
  );
}
