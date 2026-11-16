import React from 'react';

interface FormSelectProps {
  name: string;
  label: string;
  register: any;
  errors: any;
  children: React.ReactNode;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  name,
  label,
  register,
  errors,
  children,
  onChange,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
      <select
        {...register(name)}
        onChange={onChange}
        className="w-full px-4 py-2.5 bg-[#1C1C2E] border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-primary transition-all duration-200 appearance-none bg-no-repeat bg-right"
        style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239CA3AF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
      >
        {children}
      </select>
      {errors[name] && <p className="mt-1 text-sm text-danger">{errors[name]?.message as string}</p>}
    </div>
  );
};
