import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface CustomCheckboxProps {
  id: string;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ id, isChecked, onChange }) => {
  return (
    <div
      className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer border-2 transition-colors duration-200 ${
        isChecked ? 'bg-primary border-primary' : 'bg-background-light border-border hover:border-primary/50'
      }`}
      onClick={() => onChange(!isChecked)}
    >
      <AnimatePresence>
        {isChecked && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
      <input
        type="checkbox"
        id={id}
        checked={isChecked}
        onChange={() => {}}
        className="sr-only"
      />
    </div>
  );
};
