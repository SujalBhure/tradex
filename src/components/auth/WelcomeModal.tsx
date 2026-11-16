import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, X } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatCurrency } from '../../utils/tradingCalculations';

interface WelcomeModalProps {
  isOpen: boolean;
  onComplete: (capital: number) => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onComplete }) => {
  const [capital, setCapital] = useState('1000');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const capitalAmount = parseFloat(capital);
    
    if (isNaN(capitalAmount) || capitalAmount <= 0) {
      return;
    }

    setLoading(true);
    try {
      onComplete(capitalAmount);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        className="glass-card p-8 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-black" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Welcome to TradeX!
          </h2>
          <p className="text-text-secondary">
            Let's set up your initial trading capital to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Initial Trading Capital
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-text-secondary">$</span>
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-background-card border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text-primary transition-all duration-200"
                placeholder="1000"
                min="1"
                step="0.01"
                required
              />
            </div>
            <p className="mt-2 text-xs text-text-muted">
              This will be your available capital for trading calculations
            </p>
          </div>

          <div className="bg-background-light p-4 rounded-xl">
            <p className="text-sm text-text-secondary">
              Preview: {formatCurrency(parseFloat(capital) || 0, 0)} available for trading
            </p>
          </div>

          <motion.button
            type="submit"
            disabled={loading || !capital || parseFloat(capital) <= 0}
            className="w-full bg-primary hover:bg-primary-600 disabled:bg-primary/50 text-black font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center"
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <LoadingSpinner size="sm" className="text-black" />
            ) : (
              'Get Started'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
