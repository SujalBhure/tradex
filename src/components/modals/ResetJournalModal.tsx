import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ResetJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const ResetJournalModal: React.FC<ResetJournalModalProps> = ({ isOpen, onClose, onConfirmReset }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
      <motion.div
        className="modal-content p-8 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-danger rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">Reset Journal</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        
        <p className="text-text-secondary mb-6">
          Are you sure you want to permanently delete all trades from your journal? This action cannot be undone.
        </p>

        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="secondary-button px-5 py-2.5">
            Cancel
          </button>
          <button onClick={onConfirmReset} className="px-5 py-2.5 bg-danger rounded-lg text-sm font-semibold text-white hover:bg-danger-dark transition-colors">
            Confirm Reset
          </button>
        </div>
      </motion.div>
    </div>
  );
};
