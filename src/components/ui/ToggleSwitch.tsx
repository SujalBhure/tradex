import React from 'react';
import { motion } from 'framer-motion';

interface ToggleSwitchProps {
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, enabled, setEnabled }) => {
  const spring = {
    type: 'spring',
    stiffness: 700,
    damping: 30,
  };

  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-text-secondary">{label}</label>
      <div
        className={`flex items-center w-12 h-7 rounded-full p-1 cursor-pointer transition-colors duration-200 ${
          enabled ? 'bg-primary justify-end' : 'bg-background-light justify-start'
        }`}
        onClick={() => setEnabled(!enabled)}
      >
        <motion.div
          className="w-5 h-5 bg-white rounded-full shadow-md"
          layout
          transition={spring}
        />
      </div>
    </div>
  );
};
