import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  TrendingUp,
  TrendingDown,
  Layers,
  HelpCircle,
  ArrowUpDown,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Info,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { Trade, TradingSetup, SetupExpectancyMetric } from '../../types/trading';
import { calculateSetupExpectancy } from '../../utils/setupCalculations';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { formatCurrency, formatPercentage } from '../../utils/tradingCalculations';
import { GlassCard } from '../ui/GlassCard';

interface SetupExpectancyTrackerProps {
  trades: Trade[];
  customSetups?: TradingSetup[];
  onOpenManageSetups?: () => void;
  onNavigateToJournal?: () => void;
}

type SortField = 'expectancy' | 'winRate' | 'totalPnL' | 'totalTrades';

export const SetupExpectancyTracker: React.FC<SetupExpectancyTrackerProps> = ({
  trades,
  customSetups,
  onOpenManageSetups,
  onNavigateToJournal,
}) => {
  const [sortField, setSortField] = useState<SortField>('expectancy');
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  const {
    metrics,
    bestSetup,
    overallExpectancy,
    totalCategorizedTrades,
    totalUntaggedTrades,
  } = useMemo(() => {
    return calculateSetupExpectancy(trades, customSetups);
  }, [trades, customSetups]);

  const sortedMetrics = useMemo(() => {
    const list = [...metrics];
    return list.sort((a, b) => {
      // Unassigned always stays at bottom if present
      if (a.setup === 'Unassigned') return 1;
      if (b.setup === 'Unassigned') return -1;

      // Closed trades count check
      if (sortField === 'expectancy') {
        if (a.closedTrades > 0 && b.closedTrades === 0) return -1;
        if (a.closedTrades === 0 && b.closedTrades > 0) return 1;
        return b.expectancy - a.expectancy;
      }
      if (sortField === 'winRate') {
        if (a.closedTrades > 0 && b.closedTrades === 0) return -1;
        if (a.closedTrades === 0 && b.closedTrades > 0) return 1;
        return b.winRate - a.winRate;
      }
      if (sortField === 'totalPnL') {
        return b.totalPnL - a.totalPnL;
      }
      if (sortField === 'totalTrades') {
        return b.totalTrades - a.totalTrades;
      }
      return 0;
    });
  }, [metrics, sortField]);

  const totalClosedTrades = useMemo(() => {
    return trades.filter((t) => t.status === 'closed' && typeof t.netPnl === 'number').length;
  }, [trades]);

  const coveragePercent = totalClosedTrades > 0
    ? Math.round(((totalClosedTrades - totalUntaggedTrades) / totalClosedTrades) * 100)
    : 0;

  return (
    <GlassCard className="p-6 overflow-hidden relative">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Setup Expectancy Tracker
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  Formula Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculate mathematical edge per trading setup to know what actually makes money
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Formula Pill */}
          <button
            type="button"
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-emerald-500/30 text-xs text-slate-300 hover:text-white transition-all group"
            title="View mathematical expectancy formula"
          >
            <span className="text-emerald-400 font-semibold font-mono">
              E = (Win% × Avg Win) - (Loss% × Avg Loss)
            </span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </button>

          {onOpenManageSetups && (
            <button
              type="button"
              onClick={onOpenManageSetups}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-white transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-slate-300" />
              Manage Setups
            </button>
          )}
        </div>
      </div>

      {/* Formula Explanation Popover / Banner */}
      <AnimatePresence>
        {showFormulaInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#111927] to-[#0f172a] border border-emerald-500/30 text-xs text-slate-300 space-y-2 overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <Info className="w-4 h-4 text-emerald-400" />
                <span>How Trade Expectancy Works</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaInfo(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p>
              Expectancy tells you the <strong className="text-white">average dollar return you can expect per trade</strong> taking this specific setup.
            </p>
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-emerald-300">
              Expectancy = (Win Rate × Average Win) − (Loss Rate × Average Loss)
            </div>
            <p className="text-slate-400 text-[11px]">
              • If Expectancy &gt; $0: You have a verified positive edge. Scale this setup!<br />
              • If Expectancy &lt; $0: The setup leaks capital long-term even if it has a high win rate.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Untagged Trades Alert Banner */}
      {totalUntaggedTrades > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You have <strong className="text-white">{totalUntaggedTrades} trade(s)</strong> without an assigned setup. Tag them to unlock complete statistical accuracy!
            </span>
          </div>
          {onNavigateToJournal && (
            <button
              type="button"
              onClick={onNavigateToJournal}
              className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-semibold transition-all shrink-0 self-start sm:self-center"
            >
              Tag Trades in Journal <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Top Highlight KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {/* Top Edge Setup */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Top Performing Setup</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          {bestSetup ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: bestSetup.color }}
                />
                <h4 className="text-base font-bold text-white truncate">{bestSetup.setup}</h4>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  +${bestSetup.expectancy.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400">/ trade</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {bestSetup.winRate.toFixed(1)}% win rate across {bestSetup.closedTrades} closed trade(s)
              </p>
            </div>
          ) : (
            <div className="py-2 text-xs text-slate-500">
              Tag closed trades with setups to reveal your #1 highest-expectancy setup!
            </div>
          )}
        </div>

        {/* Portfolio Average Expectancy */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Portfolio Avg Expectancy</span>
            {overallExpectancy >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className={`text-xl font-extrabold font-mono ${
                overallExpectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {overallExpectancy >= 0 ? `+$${overallExpectancy.toFixed(2)}` : `-$${Math.abs(overallExpectancy).toFixed(2)}`}
            </span>
            <span className="text-xs text-slate-400">/ trade</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Weighted return across all categorized setups
          </p>
        </div>

        {/* Setup Categorization Coverage */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Setup Coverage</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xl font-extrabold text-white font-mono">
              {coveragePercent}%
            </span>
            <span className="text-xs text-slate-400">
              ({totalCategorizedTrades}/{trades.length} trades)
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
        </div>

        {/* Total Active Setups */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Setups</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xl font-extrabold text-white font-mono">
              {metrics.filter((m) => m.setup !== 'Unassigned' && m.totalTrades > 0).length}
            </span>
            <span className="text-xs text-slate-400">
              in library ({metrics.filter((m) => m.setup !== 'Unassigned').length} total)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Click any trade's setup pill in the journal to assign
          </p>
        </div>
      </div>

      {/* Sort Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2 text-xs">
        <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
          SETUPS PERFORMANCE BREAKDOWN ({sortedMetrics.length})
        </span>

        <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-lg border border-white/10">
          <span className="text-slate-400 px-2 flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" /> Sort:
          </span>
          {(
            [
              { id: 'expectancy', label: 'Expectancy' },
              { id: 'winRate', label: 'Win Rate' },
              { id: 'totalPnL', label: 'Net P&L' },
              { id: 'totalTrades', label: 'Trades' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSortField(s.id)}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                sortField === s.id
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Setups Performance Table (Desktop) */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin rounded-xl border border-white/10 bg-[#0d121a]">
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="uppercase tracking-wider text-[11px] text-slate-400 bg-white/[0.02] border-b border-white/10">
            <tr>
              <th className="px-4 py-3 font-semibold">Setup</th>
              <th className="px-4 py-3 font-semibold">Expectancy / Trade</th>
              <th className="px-4 py-3 font-semibold">Formula Breakdown</th>
              <th className="px-4 py-3 font-semibold">Win Rate</th>
              <th className="px-4 py-3 font-semibold">Avg Win / Loss</th>
              <th className="px-4 py-3 font-semibold">Net Realized P&L</th>
              <th className="px-4 py-3 font-semibold">Trades</th>
              <th className="px-4 py-3 font-semibold">Edge Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedMetrics.map((metric) => {
              const isPositive = metric.expectancy > 0;
              const isNegative = metric.expectancy < 0;
              const hasClosed = metric.closedTrades > 0;

              return (
                <tr
                  key={metric.setup}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Setup Name & Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: metric.color }}
                      />
                      <span className="font-bold text-white text-sm">
                        {metric.setup}
                      </span>
                    </div>
                  </td>

                  {/* Expectancy Metric (Hero) */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {hasClosed ? (
                      <div className="flex flex-col">
                        <span
                          className={`text-base font-extrabold font-mono ${
                            isPositive
                              ? 'text-emerald-400'
                              : isNegative
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {isPositive ? `+$${metric.expectancy.toFixed(2)}` : isNegative ? `-$${Math.abs(metric.expectancy).toFixed(2)}` : '$0.00'}
                        </span>
                        <span className="text-[10px] text-slate-400">per trade</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">No closed trades</span>
                    )}
                  </td>

                  {/* Formula Breakdown */}
                  <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-300">
                    {hasClosed ? (
                      <div className="bg-black/40 px-2 py-1 rounded-md border border-white/5 inline-block">
                        <span className="text-emerald-400 font-semibold">
                          ({metric.winRate.toFixed(0)}% × ${metric.avgWin.toFixed(1)})
                        </span>
                        {' − '}
                        <span className="text-rose-400 font-semibold">
                          ({metric.lossRate.toFixed(0)}% × ${metric.avgLoss.toFixed(1)})
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* Win Rate with Bar */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {hasClosed ? (
                      <div className="w-28 space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-200">
                          <span>{metric.winRate.toFixed(1)}%</span>
                          <span className="text-slate-400 text-[10px] font-normal">
                            {metric.winningTrades}W / {metric.losingTrades}L
                          </span>
                        </div>
                        <div className="w-full bg-rose-500/30 h-1.5 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{ width: `${metric.winRate}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* Avg Win vs Avg Loss */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {hasClosed ? (
                      <div className="flex flex-col text-[11px]">
                        <span className="text-emerald-400 font-medium font-mono">
                          Win: +${metric.avgWin.toFixed(2)}
                        </span>
                        <span className="text-rose-400 font-medium font-mono">
                          Loss: -${metric.avgLoss.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* Net Realized P&L */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {hasClosed ? (
                      <div className="font-bold text-sm">
                        <CurrencyDisplay value={metric.totalPnL} decimals={2} />
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* Trades Count */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-white/[0.05] font-semibold text-white">
                        {metric.totalTrades}
                      </span>
                      {metric.openTrades > 0 && (
                        <span className="text-[10px] text-amber-400">
                          ({metric.openTrades} open)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Edge Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {!hasClosed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.04] text-slate-400">
                        Untraded
                      </span>
                    ) : metric.edge === 'strong_positive' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        ★ Strong Edge
                      </span>
                    ) : metric.edge === 'positive' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Positive Edge
                      </span>
                    ) : metric.edge === 'negative' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        Negative Edge
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400">
                        Break-Even
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Setups Performance Cards (md:hidden) */}
      <div className="md:hidden space-y-3">
        {sortedMetrics.map((metric) => {
          const isPositive = metric.expectancy > 0;
          const isNegative = metric.expectancy < 0;
          const hasClosed = metric.closedTrades > 0;

          return (
            <div
              key={metric.setup}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all space-y-3 relative overflow-hidden"
            >
              {/* Card Header: Color, Name, Edge status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span className="font-bold text-white text-sm truncate">
                    {metric.setup}
                  </span>
                </div>
                {!hasClosed ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.04] text-slate-400">
                    Untraded
                  </span>
                ) : metric.edge === 'strong_positive' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    ★ Strong Edge
                  </span>
                ) : metric.edge === 'positive' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Positive Edge
                  </span>
                ) : metric.edge === 'negative' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    Negative Edge
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400">
                    Break-Even
                  </span>
                )}
              </div>

              {/* Expectancy Hero & Net P&L */}
              <div className="flex items-baseline justify-between pt-1 border-t border-white/5">
                <div>
                  <span className="text-[11px] text-slate-400 block">Expectancy / Trade</span>
                  {hasClosed ? (
                    <span
                      className={`text-xl font-extrabold font-mono ${
                        isPositive
                          ? 'text-emerald-400'
                          : isNegative
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {isPositive ? `+$${metric.expectancy.toFixed(2)}` : isNegative ? `-$${Math.abs(metric.expectancy).toFixed(2)}` : '$0.00'}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No closed trades</span>
                  )}
                </div>

                {hasClosed && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Net P&L</span>
                    <div className="font-bold text-sm">
                      <CurrencyDisplay value={metric.totalPnL} decimals={2} />
                    </div>
                  </div>
                )}
              </div>

              {/* Formula representation */}
              {hasClosed && (
                <div className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 font-mono text-[10px] text-slate-300 flex items-center justify-between">
                  <span className="text-emerald-400 font-medium">
                    ({metric.winRate.toFixed(0)}% × ${metric.avgWin.toFixed(1)})
                  </span>
                  <span className="text-slate-500">−</span>
                  <span className="text-rose-400 font-medium">
                    ({metric.lossRate.toFixed(0)}% × ${metric.avgLoss.toFixed(1)})
                  </span>
                </div>
              )}

              {/* Win Rate Bar */}
              {hasClosed && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-200">
                    <span>{metric.winRate.toFixed(1)}% Win Rate</span>
                    <span className="text-slate-400 text-[10px] font-normal">
                      {metric.winningTrades}W / {metric.losingTrades}L
                    </span>
                  </div>
                  <div className="w-full bg-rose-500/30 h-1.5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${metric.winRate}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stats Footer: Avg Win, Avg Loss, Total Trades */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Avg Win</span>
                  <span className="text-emerald-400 font-mono font-medium">
                    {hasClosed ? `+$${metric.avgWin.toFixed(2)}` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Avg Loss</span>
                  <span className="text-rose-400 font-mono font-medium">
                    {hasClosed ? `-$${metric.avgLoss.toFixed(2)}` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Trades</span>
                  <span className="text-white font-medium">
                    {metric.totalTrades}
                    {metric.openTrades > 0 && (
                      <span className="text-amber-400 text-[10px] ml-1">({metric.openTrades} open)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};
