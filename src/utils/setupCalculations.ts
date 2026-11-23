import { Trade, TradingSetup, SetupExpectancyMetric } from '../types/trading';

export const SETUP_PALETTE_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#14b8a6', // Teal
  '#84cc16', // Lime
];

export const DEFAULT_TRADING_SETUPS: TradingSetup[] = [
  { id: 'breakout', name: 'Breakout', color: '#10b981', description: 'Price breaking through established support/resistance or consolidation' },
  { id: 'liquidity-sweep', name: 'Liquidity Sweep', color: '#06b6d4', description: 'False breakout trapping breakout traders before reversal' },
  { id: 'fvg-retest', name: 'FVG Retest', color: '#6366f1', description: 'Fair Value Gap fill with institutional re-entry' },
  { id: 'order-block', name: 'Order Block', color: '#8b5cf6', description: 'Institutional supply/demand block mitigation' },
  { id: 'trend-continuation', name: 'Trend Continuation', color: '#3b82f6', description: 'Pullback entry in the direction of the higher timeframe trend' },
  { id: 'supply-demand', name: 'Supply & Demand', color: '#ec4899', description: 'Key zone bounce or rejection on significant structure' },
  { id: 'mean-reversion', name: 'Mean Reversion', color: '#f59e0b', description: 'Overextended price snapping back to VWAP or moving averages' },
  { id: 'sr-bounce', name: 'S/R Bounce', color: '#14b8a6', description: 'Clean technical bounce off horizontal support or resistance' },
];

/**
 * Resolves color for a given setup name against a custom setup library or defaults.
 */
export function getSetupColor(setupName?: string, customSetups?: TradingSetup[]): string {
  if (!setupName) return '#64748b'; // Slate for unassigned
  const list = customSetups && customSetups.length > 0 ? customSetups : DEFAULT_TRADING_SETUPS;
  const match = list.find((s) => s.name.trim().toLowerCase() === setupName.trim().toLowerCase());
  if (match) return match.color;

  // Deterministic color hash for unknown/custom setups without explicit color
  let hash = 0;
  for (let i = 0; i < setupName.length; i++) {
    hash = setupName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SETUP_PALETTE_COLORS.length;
  return SETUP_PALETTE_COLORS[index];
}

/**
 * Calculates Expectancy and performance metrics per setup using the user's formula:
 * Expectancy = (Win% * Avg Win) - (Loss% * Avg Loss)
 *
 * Where:
 * - Win% = winning trades / total closed trades (in decimal form)
 * - Loss% = losing trades / total closed trades (in decimal form)
 * - Avg Win = total winning PnL / winning trades
 * - Avg Loss = |total losing PnL| / losing trades
 */
export function calculateSetupExpectancy(
  trades: Trade[],
  customSetups: TradingSetup[] = DEFAULT_TRADING_SETUPS
): {
  metrics: SetupExpectancyMetric[];
  bestSetup: SetupExpectancyMetric | null;
  overallExpectancy: number;
  totalCategorizedTrades: number;
  totalUntaggedTrades: number;
} {
  if (!trades || trades.length === 0) {
    return {
      metrics: [],
      bestSetup: null,
      overallExpectancy: 0,
      totalCategorizedTrades: 0,
      totalUntaggedTrades: 0,
    };
  }

  // Map normalized lowercase name to canonical setup name from custom setups
  const canonicalMap = new Map<string, string>();
  for (const s of customSetups) {
    canonicalMap.set(s.name.trim().toLowerCase(), s.name.trim());
  }

  // Group trades by setup name (trimmed, canonicalized against user setups)
  const groups = new Map<string, Trade[]>();
  let totalCategorizedTrades = 0;
  let totalUntaggedTrades = 0;

  for (const trade of trades) {
    const rawSetup = trade.setup?.trim();
    if (rawSetup) {
      totalCategorizedTrades++;
      const lower = rawSetup.toLowerCase();
      const canonicalName = canonicalMap.get(lower) || rawSetup;
      const current = groups.get(canonicalName) || [];
      current.push(trade);
      groups.set(canonicalName, current);
    } else {
      totalUntaggedTrades++;
      const current = groups.get('Unassigned') || [];
      current.push(trade);
      groups.set('Unassigned', current);
    }
  }

  // Also ensure all configured custom setups (even with 0 trades) are present in the list
  // so the user sees all their created setups ready to be traded
  for (const setup of customSetups) {
    if (!groups.has(setup.name.trim())) {
      groups.set(setup.name.trim(), []);
    }
  }

  const metrics: SetupExpectancyMetric[] = [];

  groups.forEach((tradeList, setupName) => {
    const isUnassigned = setupName === 'Unassigned';
    const totalTrades = tradeList.length;
    const closedTrades = tradeList.filter(
      (t) => t.status === 'closed' && typeof t.netPnl === 'number'
    );
    const openTrades = tradeList.filter((t) => t.status === 'open');

    const winningTrades = closedTrades.filter((t) => (t.netPnl || 0) > 0);
    const losingTrades = closedTrades.filter((t) => (t.netPnl || 0) < 0);
    const breakEvenTrades = closedTrades.filter((t) => (t.netPnl || 0) === 0);

    const closedCount = closedTrades.length;
    const winCount = winningTrades.length;
    const lossCount = losingTrades.length;
    const beCount = breakEvenTrades.length;

    // Rates in decimal form for mathematical formula
    const winRateDecimal = closedCount > 0 ? winCount / closedCount : 0;
    const lossRateDecimal = closedCount > 0 ? lossCount / closedCount : 0;

    // Rates in percentage (0 - 100)
    const winRate = winRateDecimal * 100;
    const lossRate = lossRateDecimal * 100;

    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0));
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);

    const avgWin = winCount > 0 ? grossProfit / winCount : 0;
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;

    // EXACT USER FORMULA: Expectancy = (Win% * Avg Win) - (Loss% * Avg Loss)
    const expectancy = (winRateDecimal * avgWin) - (lossRateDecimal * avgLoss);

    const expectancyRatio = avgLoss > 0 ? expectancy / avgLoss : (expectancy > 0 ? 1 : 0);
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);

    // Edge Classification
    let edge: 'strong_positive' | 'positive' | 'neutral' | 'negative' = 'neutral';
    if (closedCount >= 2) {
      if (expectancy > 25 || (expectancy > 0 && winRate >= 60 && profitFactor >= 2)) {
        edge = 'strong_positive';
      } else if (expectancy > 0) {
        edge = 'positive';
      } else if (expectancy < 0) {
        edge = 'negative';
      }
    } else if (expectancy > 0) {
      edge = 'positive';
    } else if (expectancy < 0) {
      edge = 'negative';
    }

    const color = isUnassigned ? '#64748b' : getSetupColor(setupName, customSetups);

    metrics.push({
      setup: setupName,
      color,
      totalTrades,
      closedTrades: closedCount,
      openTrades: openTrades.length,
      winningTrades: winCount,
      losingTrades: lossCount,
      breakEvenTrades: beCount,
      winRate,
      lossRate,
      winRateDecimal,
      lossRateDecimal,
      avgWin,
      avgLoss,
      expectancy,
      expectancyRatio,
      totalPnL,
      profitFactor,
      grossProfit,
      grossLoss,
      edge,
    });
  });

  // Sort: Put setups with trades first, ordered by Expectancy descending, Unassigned at bottom
  metrics.sort((a, b) => {
    if (a.setup === 'Unassigned') return 1;
    if (b.setup === 'Unassigned') return -1;
    if (a.closedTrades > 0 && b.closedTrades === 0) return -1;
    if (a.closedTrades === 0 && b.closedTrades > 0) return 1;
    return b.expectancy - a.expectancy;
  });

  // Identify top/best setup among categorized ones with closed trades
  const categorizedWithTrades = metrics.filter(
    (m) => m.setup !== 'Unassigned' && m.closedTrades > 0
  );

  const bestSetup = categorizedWithTrades.length > 0
    ? [...categorizedWithTrades].sort((a, b) => b.expectancy - a.expectancy)[0]
    : null;

  // Calculate weighted overall expectancy across all categorized closed trades
  const totalCategorizedClosed = categorizedWithTrades.reduce((acc, m) => acc + m.closedTrades, 0);
  const overallExpectancy = totalCategorizedClosed > 0
    ? categorizedWithTrades.reduce((sum, m) => sum + (m.expectancy * m.closedTrades), 0) / totalCategorizedClosed
    : 0;

  return {
    metrics,
    bestSetup,
    overallExpectancy,
    totalCategorizedTrades,
    totalUntaggedTrades,
  };
}

/**
 * Auto-heals setup library by extracting any setup tags present on trades
 * that are missing from the setups list, ensuring custom setups can never disappear.
 */
export function healSetupsFromTrades(
  existingSetups: TradingSetup[],
  trades: Trade[]
): { healedSetups: TradingSetup[]; addedCount: number } {
  const current = existingSetups && existingSetups.length > 0 ? [...existingSetups] : [...DEFAULT_TRADING_SETUPS];
  const knownNames = new Set(current.map((s) => s.name.trim().toLowerCase()));
  let addedCount = 0;

  for (const t of trades) {
    if (t.setup && t.setup.trim()) {
      const trimmed = t.setup.trim();
      if (!knownNames.has(trimmed.toLowerCase())) {
        knownNames.add(trimmed.toLowerCase());
        const colorIdx = current.length % SETUP_PALETTE_COLORS.length;
        current.push({
          id: `setup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: trimmed,
          color: SETUP_PALETTE_COLORS[colorIdx],
        });
        addedCount++;
      }
    }
  }

  return { healedSetups: current, addedCount };
}
