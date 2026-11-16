import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Trade } from '../../types/trading';
import toast from 'react-hot-toast';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (tradeId: string) => void;
  trade: Trade;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirmDelete, trade }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirmDelete(trade.id);
  };

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
            <h2 className="text-xl font-bold text-text-primary">Delete Trade</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        
        <p className="text-text-secondary mb-6">
          Are you sure you want to permanently delete this trade? This action cannot be undone.
        </p>
        
        <div className="bg-background p-4 rounded-lg border border-border mb-6 text-sm">
          <p><strong>Symbol:</strong> {trade.symbol}</p>
          <p><strong>Side:</strong> {(trade.side || 'N/A').toUpperCase()}</p>
          <p><strong>Entry Date:</strong> {new Date(trade.openedAt).toLocaleString()}</p>
        </div>

        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="secondary-button px-5 py-2.5">
            Cancel
          </button>
          <button onClick={handleConfirm} className="px-5 py-2.5 bg-danger rounded-lg text-sm font-semibold text-white hover:bg-danger-dark transition-colors">
            Confirm Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};
