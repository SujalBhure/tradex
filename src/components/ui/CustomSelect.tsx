import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
  label: string;
  options: { value: string | number; label: string }[];
  value: string | number;
  onChange: (value: string | number) => void;
  name: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ label, options, value, onChange, name }) => {
  return (
    <div>
      <Listbox value={value} onChange={onChange} name={name}>
        <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-default rounded-lg bg-[#1C1C2E] py-2.5 pl-3 pr-10 text-left border border-border focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors">
            <span className="block truncate text-text-primary">
              {options.find(opt => opt.value === value)?.label || ''}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="symbol-dropdown-menu dropdown-scrollable absolute mt-1 max-h-44 w-full overflow-x-hidden overflow-y-scroll rounded-md py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {options.map((option, optionIdx) => (
                <Listbox.Option
                  key={optionIdx}
                  className="relative cursor-default select-none py-2 px-4 transition-all duration-200 text-text-secondary data-[active]:bg-primary/20 data-[active]:text-text-primary data-[active]:translate-x-1"
                  value={option.value}
                >
                  <span className="block truncate data-[selected]:font-medium data-[selected]:text-text-primary">
                    {option.label}
                  </span>
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};
