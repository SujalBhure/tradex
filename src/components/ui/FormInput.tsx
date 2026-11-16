import React from 'react';
import { Controller } from 'react-hook-form';
import { LucideIcon } from 'lucide-react';

interface FormInputProps {
  name: string;
  label: string;
  control: any;
  errors: any;
  type?: string;
  placeholder?: string;
  icon?: LucideIcon;
  onFocus?: () => void;
  rules?: any;
}

export const FormInput: React.FC<FormInputProps> = ({
  name,
  label,
  control,
  errors,
  type = 'text',
  placeholder,
  icon: Icon,
  onFocus,
  rules = {},
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />}
        <Controller
          name={name}
          control={control}
          rules={rules}
          render={({ field }) => (
            <input
              {...field}
              type={type}
              placeholder={placeholder}
              step="any"
              onFocus={onFocus}
              style={type === 'date' || type === 'time' ? { colorScheme: 'dark' } : undefined}
              className={`w-full py-2.5 bg-[#1C1C2E] border ${errors[name] ? 'border-danger shadow-[0_0_0_1px_#FF4444]' : 'border-border'} rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-primary transition-all duration-200 ${Icon ? 'pl-9' : 'pl-4'} ${type === 'date' || type === 'time' ? '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100' : ''}`}
            />
          )}
        />
      </div>
      {errors[name] && <p className="mt-1 text-sm text-danger">{errors[name]?.message as string}</p>}
    </div>
  );
};
