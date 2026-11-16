import React, { useMemo } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Trade } from '../../types/trading';
import { Clock } from 'lucide-react';

interface TradeTimeHeatmapProps {
  trades: Trade[];
}

export const TradeTimeHeatmap: React.FC<TradeTimeHeatmapProps> = ({ trades }) => {
  const heatmapData = useMemo(() => {
    const grid = Array(7).fill(0).map(() => Array(24).fill(0));
    trades.forEach(trade => {
      const date = new Date(trade.openedAt);
      const day = date.getDay(); // Sunday - 0, Saturday - 6
      const hour = date.getHours();
      grid[day][hour]++;
    });
    return grid;
  }, [trades]);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxActivity = Math.max(...heatmapData.flat());

  return (
    <GlassCard>
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Clock className="text-primary" />
        Trading Activity
      </h3>
      <div className="flex gap-3">
        <div className="flex flex-col justify-between text-xs text-text-muted">
          {days.map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-24 gap-1 flex-grow">
          {heatmapData.flat().map((activity, index) => {
            const opacity = maxActivity > 0 ? Math.min(activity / maxActivity, 1) : 0;
            return (
              <div
                key={index}
                className="w-full aspect-square rounded-[2px] bg-primary"
                style={{ opacity }}
                title={`Activity: ${activity}`}
              />
            );
          })}
        </div>
      </div>
      <div className="flex justify-between text-xs text-text-muted mt-1 ml-[36px]">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
      </div>
    </GlassCard>
  );
};
