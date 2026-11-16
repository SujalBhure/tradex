import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { SpotlightCard } from './reactbits';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  spotlightColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hover = false,
  onClick,
  spotlightColor = 'rgba(0, 255, 136, 0.12)',
}) => {
  return (
    <motion.div
      className={clsx(
        hover && 'cursor-pointer',
        className
      )}
      whileHover={hover ? { y: -2, scale: 1.01 } : undefined}
      whileTap={hover ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={onClick}
    >
      <SpotlightCard
        spotlightColor={spotlightColor}
        className={clsx('glass-card p-5 sm:p-6 border border-white/10 rounded-2xl shadow-xl backdrop-blur-xl', className)}
      >
        <div className="relative z-10 w-full">
          {children}
        </div>
      </SpotlightCard>
    </motion.div>
  );
};



