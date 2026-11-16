import React from 'react';
import { motion } from 'framer-motion';
import { Trade } from '../../types/trading';
import { CapitalGrowthChart } from './CapitalGrowthChart';
import { MonthlyPnLHeatmap } from './MonthlyPnLHeatmap';
import { AssetPerformanceChart } from './AssetPerformanceChart';

interface PerformanceChartsProps {
  trades: Trade[];
  initialCapital: number;
}

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ trades, initialCapital }) => {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <CapitalGrowthChart trades={trades} initialCapital={initialCapital} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyPnLHeatmap trades={trades} />
        <AssetPerformanceChart trades={trades} />
      </div>
    </motion.div>
  );
};

export default PerformanceCharts;
