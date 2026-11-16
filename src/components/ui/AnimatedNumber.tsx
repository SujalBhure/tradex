import React from 'react';
import { motion } from 'framer-motion';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  duration?: number;
  formatter?: (value: number) => string;
  children?: (animatedValue: number) => React.ReactNode;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className,
  duration = 1000,
  formatter = (val) => val.toFixed(2),
  children,
}) => {
  const animatedValue = useAnimatedCounter(value, duration);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {children ? children(animatedValue) : formatter(animatedValue)}
    </motion.span>
  );
};
