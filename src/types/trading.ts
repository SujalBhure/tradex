export interface Trade {
  id: string;
  tradeGroupId: string;
  symbol: string;
  side: 'long' | 'short';
  lots: number;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  leverage: number;
  capitalUsed: number;
  margin: number;
  fees: number;
  grossPnl?: number;
  netPnl?: number;
  roi?: number;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
  notes?: string;
  tags?: string[];
  stopLoss?: number;
  target?: number;
  riskRewardRatio?: number;
  screenshotUrl?: string;
}

export interface TradingMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  totalFees: number;
  avgWin: number;
  avgLoss: number;
  avgRiskRewardRatio: number;
  rFactor: number;
  profitFactor: number;
  sharpeRatio: number;
  winStreak: number;
  losingStreak: number;
  // Growth & Daily Extremes
  weekOverWeekGrowth: number;
  thisWeekPnL: number;
  lastWeekPnL: number;
  monthOverMonthGrowth: number;
  thisMonthPnL: number;
  lastMonthPnL: number;
  bestDayProfit: number;
  bestDayDate: string;
  worstDayProfit: number;
  worstDayDate: string;
  capitalGrowthPercent: number;
}

export interface LotSizes {
  [key: string]: number;
}

export type JournalFilterStatus = 'all' | 'open' | 'closed';

export interface PositionCalculation {
  symbol: string;
  capitalRisk: number;
  riskPercentage: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  leverage: number;
  lots: number;
  quantity: number;
  margin: number;
  liquidationPrice: number;
  riskRewardRatio: number;
  maxLoss: number;
  maxProfit: number;
  fees: number;
}
