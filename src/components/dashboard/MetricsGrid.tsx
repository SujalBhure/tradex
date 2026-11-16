import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ClipboardList, 
  Ratio, 
  Flame, 
  ZapOff, 
  PlusCircle, 
  MinusCircle, 
  Award, 
  Scale, 
  CalendarRange, 
  CalendarDays, 
  Trophy, 
  ShieldAlert, 
  Percent, 
  Sparkles 
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { TradingMetrics } from '../../types/trading';
import { formatPercentage } from '../../utils/tradingCalculations';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { useMobileDetection } from '../ui/MagicBento';

interface MetricsGridProps {
  metrics: TradingMetrics;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  
  const metricCards = [
    {
      title: 'Total P&L',
      value: metrics.totalPnL,
      isCurrency: true,
      icon: metrics.totalPnL >= 0 ? TrendingUp : TrendingDown,
      color: metrics.totalPnL >= 0 ? 'text-success' : 'text-danger',
      bgColor: metrics.totalPnL >= 0 ? 'bg-success/10' : 'bg-danger/10',
    },
    {
      title: 'Win Rate',
      value: metrics.winRate,
      formatter: (val: number) => formatPercentage(val),
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'R-Factor',
      value: metrics.rFactor,
      formatter: (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}R`,
      icon: Award,
      color: metrics.rFactor >= 0 ? 'text-success' : 'text-danger',
      bgColor: metrics.rFactor >= 0 ? 'bg-success/10' : 'bg-danger/10',
    },
    {
      title: 'Profit Factor',
      value: metrics.profitFactor,
      formatter: (val: number) => (val >= 99.99 ? '∞' : val.toFixed(2)),
      icon: Scale,
      color: metrics.profitFactor >= 1.2 ? 'text-success' : metrics.profitFactor >= 1 ? 'text-primary' : 'text-danger',
      bgColor: metrics.profitFactor >= 1.2 ? 'bg-success/10' : metrics.profitFactor >= 1 ? 'bg-primary/10' : 'bg-danger/10',
    },
    {
      title: 'Total Trades',
      value: metrics.totalTrades,
      formatter: (val: number) => Math.round(val).toString(),
      icon: ClipboardList,
      color: metrics.totalPnL >= 0 ? 'text-success' : 'text-danger',
      bgColor: metrics.totalPnL >= 0 ? 'bg-success/10' : 'bg-danger/10',
    },
    {
      title: 'Avg. Win',
      value: metrics.avgWin,
      isCurrency: true,
      icon: PlusCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Avg. Loss',
      value: metrics.avgLoss,
      isCurrency: true,
      icon: MinusCircle,
      color: 'text-danger',
      bgColor: 'bg-danger/10',
    },
    {
      title: 'Avg. R:R',
      value: metrics.avgRiskRewardRatio,
      formatter: (val: number) => `${val.toFixed(2)}R`,
      icon: Ratio,
      color: metrics.avgRiskRewardRatio >= 1 ? 'text-success' : 'text-danger',
      bgColor: metrics.avgRiskRewardRatio >= 1 ? 'bg-success/10' : 'bg-danger/10',
    },
    {
      title: 'Win Streak',
      value: metrics.winStreak,
      formatter: (val: number) => Math.round(val).toString(),
      icon: Flame,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Losing Streak',
      value: metrics.losingStreak,
      formatter: (val: number) => Math.round(val).toString(),
      icon: ZapOff,
      color: 'text-danger',
      bgColor: 'bg-danger/10',
    },
  ];

  const growthCards = [
    {
      title: 'Week vs Last Week',
      value: metrics.weekOverWeekGrowth,
      formatter: (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`,
      subtitle: `This: $${Math.round(metrics.thisWeekPnL || 0)} | Last: $${Math.round(metrics.lastWeekPnL || 0)}`,
      icon: CalendarRange,
      color: (metrics.weekOverWeekGrowth || 0) >= 0 ? 'text-success' : 'text-danger',
      bgColor: (metrics.weekOverWeekGrowth || 0) >= 0 ? 'bg-success/10' : 'bg-danger/10',
    },
    {
      title: 'Month vs Last Month',
      value: metrics.monthOverMonthGrowth,
      formatter: (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`,
      subtitle: `This: $${Math.round(metrics.thisMonthPnL || 0)} | Last: $${Math.round(metrics.lastMonthPnL || 0)}`,
      icon: CalendarDays,
      color: (metrics.monthOverMonthGrowth || 0) >= 0 ? 'text-success' : 'text-danger',
      bgColor: (metrics.monthOverMonthGrowth || 0) >= 0 ? 'bg-success/10' : 'bg-danger/10',
    },
    {
      title: 'Capital Growth %',
      value: metrics.capitalGrowthPercent,
      formatter: (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`,
      subtitle: 'Net Account ROI',
      icon: Percent,
      color: (metrics.capitalGrowthPercent || 0) >= 0 ? 'text-success' : 'text-danger',
      bgColor: (metrics.capitalGrowthPercent || 0) >= 0 ? 'bg-success/10' : 'bg-danger/10',
    },
    {
      title: 'Best Day Profit',
      value: metrics.bestDayProfit || 0,
      isCurrency: true,
      subtitle: `Date: ${metrics.bestDayDate || '-'}`,
      icon: Trophy,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Worst Day Profit',
      value: metrics.worstDayProfit || 0,
      isCurrency: true,
      subtitle: `Date: ${metrics.worstDayDate || '-'}`,
      icon: ShieldAlert,
      color: (metrics.worstDayProfit || 0) < 0 ? 'text-danger' : 'text-slate-300',
      bgColor: (metrics.worstDayProfit || 0) < 0 ? 'bg-danger/10' : 'bg-white/5',
    },
  ];

  return (
    <div className="space-y-6" ref={gridRef}>
      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          
          return (
            <motion.div
              key={metric.title}
              initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={isMobile ? { duration: 0 } : { delay: index * 0.03, duration: 0.25 }}
            >
              <GlassCard hover className="text-center !h-full !min-h-0">
                <div className="flex flex-col items-center justify-center h-full p-2">
                  <div className="flex items-center justify-center mb-2 mt-1">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${metric.bgColor} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${metric.color}`} />
                    </div>
                  </div>
                  
                  <h3 className="text-slate-200 text-xs sm:text-sm font-semibold mb-1 truncate w-full">
                    {metric.title}
                  </h3>
                  
                  <div className={`text-base sm:text-xl lg:text-2xl font-bold w-full ${metric.color}`}>
                    {metric.isCurrency ? (
                        <AnimatedNumber
                            value={metric.value}
                            formatter={() => ''}
                            children={(animatedValue) => (
                                <CurrencyDisplay 
                                  value={animatedValue} 
                                  className="justify-center text-base sm:text-xl lg:text-2xl font-bold drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]" 
                                  inrContainerClassName="flex-col items-center"
                                />
                            )}
                        />
                    ) : (
                        <AnimatedNumber
                            value={metric.value}
                            formatter={metric.formatter}
                        />
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Growth & Daily Extremes Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
            Growth Velocity & Daily Extremes
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
          {growthCards.map((metric, index) => {
            const Icon = metric.icon;

            return (
              <motion.div
                key={metric.title}
                initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={isMobile ? { duration: 0 } : { delay: (index + 10) * 0.03, duration: 0.25 }}
                className={index === 4 ? 'col-span-2 md:col-span-1' : ''}
              >
                <GlassCard hover className="text-center !h-full !min-h-0 border border-white/10">
                  <div className="flex flex-col items-center justify-center h-full p-2 sm:p-3">
                    <div className="flex items-center justify-center mb-2 mt-1">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${metric.bgColor} shadow-sm`}>
                        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${metric.color}`} />
                      </div>
                    </div>
                    
                    <h3 className="text-slate-200 text-xs sm:text-sm font-semibold mb-1 truncate w-full">
                      {metric.title}
                    </h3>
                    
                    <div className={`text-base sm:text-xl lg:text-2xl font-bold mb-1 w-full ${metric.color}`}>
                      {metric.isCurrency ? (
                          <AnimatedNumber
                              value={metric.value}
                              formatter={() => ''}
                              children={(animatedValue) => (
                                  <CurrencyDisplay 
                                    value={animatedValue} 
                                    className="justify-center text-base sm:text-xl lg:text-2xl font-bold drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]" 
                                    inrContainerClassName="flex-col items-center"
                                  />
                              )}
                          />
                      ) : (
                          <AnimatedNumber
                              value={metric.value}
                              formatter={metric.formatter}
                          />
                      )}
                    </div>

                    <p className="text-[11px] text-slate-300 truncate w-full font-medium">
                      {metric.subtitle}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

