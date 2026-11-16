import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { GlassCard } from '../ui/GlassCard';
import { Trade } from '../../types/trading';
import { DollarSign } from 'lucide-react';

interface PositionSizeChartProps {
  trades: Trade[];
}

const COLORS = ['#A378FF', '#7C3AED', '#5B21B6'];

export const PositionSizeChart: React.FC<PositionSizeChartProps> = ({ trades }) => {
  const { data, totalTrades } = useMemo(() => {
    const originalTrades = trades.filter(t => t.id === t.tradeGroupId);
    const distribution = {
      small: 0,
      medium: 0,
      large: 0,
    };
    originalTrades.forEach(trade => {
      if (trade.capitalUsed < 100) distribution.small++;
      else if (trade.capitalUsed <= 200) distribution.medium++;
      else distribution.large++;
    });

    const chartData = [
      { name: 'Small (<$100)', value: distribution.small },
      { name: 'Medium ($100-200)', value: distribution.medium },
      { name: 'Large (>$200)', value: distribution.large },
    ].filter(d => d.value > 0);
    
    return { data: chartData, totalTrades: originalTrades.length };
  }, [trades]);

  return (
    <GlassCard>
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <DollarSign className="text-primary" />
        Position Size Distribution
      </h3>
      {totalTrades > 0 ? (
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend iconType="circle" formatter={(value, entry) => <span className="text-text-secondary text-sm">{value} ({entry.payload.value})</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-text-primary">{totalTrades}</span>
            <span className="text-sm text-text-muted">Total Trades</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted text-center py-20">No trades to analyze.</p>
      )}
    </GlassCard>
  );
};
