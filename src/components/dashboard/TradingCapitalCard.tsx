import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit3, DollarSign } from 'lucide-react';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { parseMoneyToCents, centsToNumber } from '../../utils/money';
import { SpotlightCard } from '../ui/reactbits';

interface TradingCapitalCardProps {
  capital: number;
  onCapitalUpdate: (newCapital: number) => void;
  totalPnL: number;
}

export const TradingCapitalCard: React.FC<TradingCapitalCardProps> = ({
  capital,
  onCapitalUpdate,
  totalPnL,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempCapital, setTempCapital] = useState('');

  const currentCapital = (capital ?? 0) + (totalPnL ?? 0);
  const pnlColor =
    totalPnL > 0 ? 'text-success' : totalPnL < 0 ? 'text-danger' : 'text-primary';

  const handleEditClick = () => {
    setTempCapital(String(capital ?? 0));
    setIsEditing(true);
  };

  const handleSave = () => {
    const cents = parseMoneyToCents(tempCapital);
    const newCapital = centsToNumber(cents);

    if (Number.isFinite(newCapital) && newCapital >= 0) {
      onCapitalUpdate(newCapital);
      setIsEditing(false);
    } else {
      toast.error('Please enter a valid capital amount.');
    }
  };

  const handleCancel = () => setIsEditing(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempCapital(e.target.value);
  };

  return (
    <motion.div
      className="relative w-full"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <SpotlightCard
        spotlightColor="rgba(0, 255, 136, 0.16)"
        className="glass-card p-5 sm:p-7 lg:p-8 border border-white/10 shadow-2xl backdrop-blur-xl w-full overflow-hidden relative"
      >
        <div className="relative z-10 w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/25">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </div>
              <div>
                <p className="text-text-secondary text-xs sm:text-sm font-semibold">Current Capital</p>
                <p className="text-text-muted text-[10px] sm:text-xs">Initial Capital + Total P&L</p>
              </div>
            </div>

            {!isEditing && (
              <motion.button
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                onClick={handleEditClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Edit3 className="w-4 h-4 text-text-secondary" />
              </motion.button>
            )}
          </div>

          <div className="text-center py-2 sm:py-4">
            {isEditing ? (
              <motion.div
                className="flex flex-col space-y-4 items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-xs sm:text-sm text-text-muted mb-1">Edit Initial Capital</p>
                <input
                  type="text"
                  inputMode="decimal"
                  value={tempCapital}
                  onChange={handleInputChange}
                  className="text-2xl sm:text-4xl font-bold text-center bg-transparent border-b-2 border-primary focus:outline-none text-text-primary w-full max-w-xs"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="e.g. 1000"
                />
                <div className="flex space-x-2 justify-center pt-2">
                  <button className="primary-button px-4 py-2 text-sm" onClick={handleSave}>
                    Save
                  </button>
                  <button className="secondary-button px-4 py-2 text-sm" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className={clsx('font-bold transition-colors duration-300 w-full', pnlColor)}>
                <AnimatedNumber
                    value={currentCapital}
                    formatter={() => ''}
                    children={(animatedValue) => (
                      <div className="flex flex-col items-center justify-center min-h-[5rem] py-1">
                          <CurrencyDisplay 
                            value={animatedValue} 
                            className="text-3xl sm:text-5xl lg:text-6xl justify-center font-extrabold tracking-tight" 
                            inrContainerClassName="flex-col items-center mt-1"
                          />
                      </div>
                    )}
                  />
              </div>
            )}
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
};



