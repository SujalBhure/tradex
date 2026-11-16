import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatInr } from '../../utils/tradingCalculations';
import { clsx } from 'clsx';
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice';
import { useExchangeRate } from '../../contexts/ExchangeRateContext';

interface CurrencyDisplayProps {
  value: number;
  decimals?: number;
  className?: string;
  inrContainerClassName?: string;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  value,
  decimals = 2,
  className,
  inrContainerClassName,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isTouchDevice = useIsTouchDevice();
  const { usdToInrRate } = useExchangeRate();
  const inrValue = value * usdToInrRate;

  if (isTouchDevice) {
    return (
      <div className={clsx("flex items-baseline", className, inrContainerClassName)}>
        <span>{formatCurrency(value, decimals)}</span>
        <span className="text-text-muted text-xs ml-2">
          ({formatInr(inrValue)})
        </span>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx("relative flex items-center cursor-pointer select-none", className)}
      title={`Hover to see INR (~ ${formatInr(inrValue)})`}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={isHovered ? 'inr' : 'usd'}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="whitespace-nowrap inline-block"
        >
          {isHovered ? formatInr(inrValue) : formatCurrency(value, decimals)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};
