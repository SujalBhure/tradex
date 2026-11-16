import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Trade } from '../../types/trading';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { CryptoLogo } from '../ui/CryptoLogo';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  FileText
} from 'lucide-react';
import { clsx } from 'clsx';

interface MonthlyPnLHeatmapProps {
  trades: Trade[];
}

type ViewLevel = 'year' | 'month' | 'day';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MonthlyPnLHeatmap: React.FC<MonthlyPnLHeatmapProps> = ({ trades }) => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('year');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Derive all unique years from trades, defaulting to current year
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    trades.forEach((t) => {
      if (t.closedAt) {
        const y = new Date(t.closedAt).getFullYear();
        if (Number.isFinite(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [trades]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const tradeYears = trades
      .filter((t) => t.closedAt && t.status === 'closed')
      .map((t) => new Date(t.closedAt!).getFullYear())
      .filter((y) => Number.isFinite(y));
    return tradeYears.length > 0 ? Math.max(...tradeYears) : new Date().getFullYear();
  });

  // Filter closed trades for the selected year
  const yearTrades = useMemo(() => {
    return trades.filter((t) => {
      if (t.status !== 'closed' || !t.closedAt) return false;
      const d = new Date(t.closedAt);
      return d.getFullYear() === selectedYear;
    });
  }, [trades, selectedYear]);

  // Monthly stats for the year view (12 months)
  const monthlyStats = useMemo(() => {
    const stats = Array.from({ length: 12 }, () => ({
      pnl: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
    }));

    yearTrades.forEach((trade) => {
      const monthIndex = new Date(trade.closedAt!).getMonth();
      const pnl = trade.netPnl || 0;
      stats[monthIndex].pnl += pnl;
      stats[monthIndex].totalTrades += 1;
      if (pnl > 0) stats[monthIndex].winningTrades += 1;
      else if (pnl < 0) stats[monthIndex].losingTrades += 1;
    });

    return stats;
  }, [yearTrades]);

  // Trades for the selected month
  const monthTrades = useMemo(() => {
    return yearTrades.filter((t) => new Date(t.closedAt!).getMonth() === selectedMonth);
  }, [yearTrades, selectedMonth]);

  // Daily stats for the calendar grid of the selected month
  const calendarData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    // Weekday of 1st day (0=Sunday, 1=Monday ... 6=Saturday) -> convert to Mon=0 ... Sun=6
    const firstDayWeekday = (new Date(selectedYear, selectedMonth, 1).getDay() + 6) % 7;

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dayTrades = monthTrades.filter((t) => new Date(t.closedAt!).getDate() === dayNum);
      const pnl = dayTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
      const wins = dayTrades.filter((t) => (t.netPnl || 0) > 0).length;
      const losses = dayTrades.filter((t) => (t.netPnl || 0) < 0).length;

      return {
        dayNum,
        trades: dayTrades,
        pnl,
        hasTrades: dayTrades.length > 0,
        tradeCount: dayTrades.length,
        wins,
        losses,
      };
    });

    return {
      daysInMonth,
      firstDayWeekday,
      days,
    };
  }, [selectedYear, selectedMonth, monthTrades]);

  // Trades for the selected specific day
  const dayTrades = useMemo(() => {
    if (selectedDay === null) return [];
    return monthTrades.filter((t) => new Date(t.closedAt!).getDate() === selectedDay);
  }, [monthTrades, selectedDay]);

  const dayTotalPnl = useMemo(() => {
    return dayTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
  }, [dayTrades]);

  // Color helper
  const getPnlStyle = (pnl: number, hasTrades: boolean) => {
    if (!hasTrades) {
      return 'bg-white/[0.02] border-white/5 text-text-muted';
    }
    if (pnl > 0) {
      return 'bg-success/15 border-success/30 text-success hover:bg-success/25 hover:border-success/50';
    }
    if (pnl < 0) {
      return 'bg-danger/15 border-danger/30 text-danger hover:bg-danger/25 hover:border-danger/50';
    }
    return 'bg-white/10 border-white/15 text-text-primary hover:bg-white/15';
  };

  const handleMonthClick = (monthIdx: number) => {
    setSelectedMonth(monthIdx);
    setViewLevel('month');
  };

  const handleDayClick = (dayNum: number, hasTrades: boolean) => {
    if (!hasTrades) return;
    setSelectedDay(dayNum);
    setViewLevel('day');
  };

  const monthSummary = monthlyStats[selectedMonth] || { pnl: 0, totalTrades: 0, winningTrades: 0, losingTrades: 0 };
  const monthWinRate = monthSummary.totalTrades > 0
    ? Math.round((monthSummary.winningTrades / monthSummary.totalTrades) * 100)
    : 0;

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, scale: 0.97, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 1.03, y: -8, transition: { duration: 0.18, ease: 'easeIn' } },
  };

  return (
    <GlassCard className="overflow-hidden min-h-[400px] flex flex-col justify-between">
      <AnimatePresence mode="wait" initial={false}>
        {/* ===================== LEVEL 1: YEAR OVERVIEW (12 MONTHS) ===================== */}
        {viewLevel === 'year' && (
          <motion.div
            key="year-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-text-primary leading-tight">
                    Monthly P&L
                  </h3>
                  <p className="text-xs text-text-muted">
                    Click any month to deep-dive into daily breakdown
                  </p>
                </div>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-1">
                {availableYears.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const currIdx = availableYears.indexOf(selectedYear);
                      if (currIdx < availableYears.length - 1) {
                        setSelectedYear(availableYears[currIdx + 1]);
                      }
                    }}
                    disabled={availableYears.indexOf(selectedYear) >= availableYears.length - 1}
                    className="p-1 text-text-secondary hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <span className="text-xs font-semibold px-2 text-primary">{selectedYear}</span>
                {availableYears.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const currIdx = availableYears.indexOf(selectedYear);
                      if (currIdx > 0) {
                        setSelectedYear(availableYears[currIdx - 1]);
                      }
                    }}
                    disabled={availableYears.indexOf(selectedYear) <= 0}
                    className="p-1 text-text-secondary hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 12-Month Heatmap Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
              {MONTH_ABBR.map((month, index) => {
                const stat = monthlyStats[index];
                const hasTrades = stat.totalTrades > 0;
                const style = getPnlStyle(stat.pnl, hasTrades);

                return (
                  <motion.button
                    key={month}
                    type="button"
                    onClick={() => handleMonthClick(index)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={clsx(
                      'p-2.5 sm:p-3 rounded-xl border text-center transition-all duration-200 relative group text-left flex flex-col justify-between min-h-[78px]',
                      style,
                      'hover:shadow-lg hover:shadow-black/40'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs sm:text-sm font-bold">{month}</span>
                      {hasTrades && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-text-secondary border border-white/10 font-mono">
                          {stat.totalTrades}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <CurrencyDisplay
                        value={stat.pnl}
                        className="text-xs sm:text-sm font-semibold justify-start truncate"
                        inrContainerClassName="flex-col items-start"
                      />
                      <span className="text-[10px] text-text-muted group-hover:text-primary transition-colors block mt-0.5">
                        {hasTrades ? `${stat.winningTrades}W - ${stat.losingTrades}L` : 'No trades'}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ===================== LEVEL 2: MONTH CALENDAR DEEP-DIVE ===================== */}
        {viewLevel === 'month' && (
          <motion.div
            key="month-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col"
          >
            {/* Navigation Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewLevel('year')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white text-xs font-medium transition-colors border border-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>All Months</span>
                </button>
                <div className="h-4 w-px bg-white/15" />
                <h3 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
                  <span>{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
                </h3>
              </div>

              {/* Month Quick Nav & Summary Badge */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 text-xs bg-black/40 border border-white/10 rounded-lg px-2.5 py-1">
                  <span className="text-text-muted">Month P&L:</span>
                  <CurrencyDisplay
                    value={monthSummary.pnl}
                    className="font-bold text-xs"
                    inrContainerClassName="flex-col items-start"
                  />
                  <span className="text-text-muted">|</span>
                  <span className="text-text-secondary">{monthSummary.totalTrades} trades</span>
                  <span className="text-text-muted">|</span>
                  <span className={monthWinRate >= 50 ? 'text-success font-medium' : 'text-danger font-medium'}>
                    {monthWinRate}% WR
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMonth((prev) => (prev > 0 ? prev - 1 : 11))}
                    title="Previous Month"
                    className="p-1 text-text-secondary hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMonth((prev) => (prev < 11 ? prev + 1 : 0))}
                    title="Next Month"
                    className="p-1 text-text-secondary hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Weekday Labels Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-1.5">
              {WEEKDAY_NAMES.map((day) => (
                <div key={day} className="text-[11px] font-semibold text-text-muted py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1">
              {/* Empty leading tiles */}
              {Array.from({ length: calendarData.firstDayWeekday }).map((_, i) => (
                <div key={`blank-${i}`} className="min-h-[50px] sm:min-h-[58px] opacity-10 rounded-lg bg-white/[0.01]" />
              ))}

              {/* Day Tiles */}
              {calendarData.days.map((day) => {
                const style = getPnlStyle(day.pnl, day.hasTrades);

                return (
                  <motion.button
                    key={`day-${day.dayNum}`}
                    type="button"
                    onClick={() => handleDayClick(day.dayNum, day.hasTrades)}
                    disabled={!day.hasTrades}
                    whileHover={day.hasTrades ? { scale: 1.04 } : {}}
                    whileTap={day.hasTrades ? { scale: 0.96 } : {}}
                    className={clsx(
                      'p-1 sm:p-1.5 rounded-lg border flex flex-col justify-between text-left transition-all duration-150 min-h-[52px] sm:min-h-[62px]',
                      style,
                      day.hasTrades ? 'cursor-pointer hover:shadow-lg' : 'cursor-default opacity-40'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] sm:text-xs font-bold font-mono text-text-primary">
                        {day.dayNum}
                      </span>
                      {day.hasTrades && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>

                    {day.hasTrades ? (
                      <div className="mt-1">
                        <CurrencyDisplay
                          value={day.pnl}
                          className="text-[10px] sm:text-xs font-bold justify-start truncate leading-tight"
                          inrContainerClassName="flex-col items-start"
                        />
                        <span className="text-[9px] text-text-secondary leading-tight hidden sm:block">
                          {day.tradeCount} trade{day.tradeCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-text-muted/40 font-mono">-</div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-text-muted">
              <span>💡 Click on any active green/red day to view that day&apos;s trade logs</span>
              <span className="text-primary font-medium">{monthTrades.length} closed trades in {MONTH_ABBR[selectedMonth]}</span>
            </div>
          </motion.div>
        )}

        {/* ===================== LEVEL 3: DAY TRADE LOGS ===================== */}
        {viewLevel === 'day' && (
          <motion.div
            key="day-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col"
          >
            {/* Navigation Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewLevel('month')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white text-xs font-medium transition-colors border border-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to {MONTH_ABBR[selectedMonth]}</span>
                </button>
                <div className="h-4 w-px bg-white/15" />
                <h3 className="text-base sm:text-lg font-bold text-text-primary">
                  {MONTH_NAMES[selectedMonth]} {selectedDay}, {selectedYear}
                </h3>
              </div>

              {/* Day summary chips */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs bg-black/40 border border-white/10 rounded-lg px-2.5 py-1">
                  <span className="text-text-muted">Day P&L:</span>
                  <CurrencyDisplay
                    value={dayTotalPnl}
                    className="font-bold text-xs"
                    inrContainerClassName="flex-col items-start"
                  />
                  <span className="text-text-muted">|</span>
                  <span className="text-text-secondary">{dayTrades.length} trade{dayTrades.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* List of Trades for Selected Day */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {dayTrades.length === 0 ? (
                <div className="py-12 text-center text-text-muted">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-text-muted/40" />
                  <p className="text-sm">No closed trades recorded on this date.</p>
                </div>
              ) : (
                dayTrades.map((trade, idx) => {
                  const isProfit = (trade.netPnl || 0) >= 0;
                  const tradeTime = trade.closedAt
                    ? new Date(trade.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : undefined;

                  return (
                    <motion.div
                      key={trade.id || idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition-all"
                    >
                      {/* Top Row: Symbol, Side, Net P&L */}
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2 pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <CryptoLogo symbol={trade.symbol} size={22} />
                          <span className="font-bold text-sm text-text-primary">{trade.symbol}</span>
                          <span
                            className={clsx(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase',
                              trade.side === 'long'
                                ? 'bg-success/20 text-success border border-success/30'
                                : 'bg-danger/20 text-danger border border-danger/30'
                            )}
                          >
                            {trade.side}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted bg-white/5 px-1.5 py-0.5 rounded">
                            {trade.leverage}x
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <CurrencyDisplay
                              value={trade.netPnl || 0}
                              className={clsx(
                                'text-sm font-bold justify-end',
                                isProfit ? 'text-success' : 'text-danger'
                              )}
                              inrContainerClassName="flex-col items-end"
                            />
                            {typeof trade.roi === 'number' && (
                              <span
                                className={clsx(
                                  'text-[10px] font-mono block',
                                  trade.roi >= 0 ? 'text-success/80' : 'text-danger/80'
                                )}
                              >
                                {trade.roi >= 0 ? '+' : ''}
                                {trade.roi.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Trade Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-text-muted text-[10px] block">Entry Price</span>
                          <span className="font-medium text-text-secondary">${trade.entryPrice.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-text-muted text-[10px] block">Exit Price</span>
                          <span className="font-medium text-text-secondary">
                            {trade.exitPrice ? `$${trade.exitPrice.toLocaleString()}` : 'Market'}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-muted text-[10px] block">Lots / Quantity</span>
                          <span className="font-medium text-text-secondary">
                            {trade.lots} lots ({trade.quantity})
                          </span>
                        </div>
                        <div>
                          <span className="text-text-muted text-[10px] block">Time Closed</span>
                          <span className="font-medium text-text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3 text-text-muted" />
                            {tradeTime || 'Closed'}
                          </span>
                        </div>
                      </div>

                      {/* Optional Notes */}
                      {trade.notes && (
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-1.5 text-xs text-text-muted italic bg-white/[0.02] p-2 rounded-lg">
                          <FileText className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span>&ldquo;{trade.notes}&rdquo;</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};
