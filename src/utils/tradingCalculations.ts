import { Trade, LotSizes, PositionCalculation } from '../types/trading';
import { deltaExchange } from '../lib/deltaExchange';

export const LOT_SIZES: LotSizes = {
  BTC: 0.001,
  ETH: 0.01,
  SOL: 1,
  XAUTUSD: 0.001,
  XAUT: 0.001,
  SILVER: 0.1,
  // Backward compatibility & aliases
  XAUUSD: 0.001,
  GOLD: 0.001,
  'BTC/USDT': 0.001,
  'ETH/USDT': 0.01,
  'SOL/USDT': 1,
  'XAUT/USDT': 0.001,
  'XAUT/USD': 0.001,
  'XAU/USD': 0.001,
  'GOLD/USDT': 0.001,
  'SILVER/USDT': 0.1,
};

/**
 * Retrieves the exact lot size / contract multiplier (e.g. 1 lot = X qty) for any symbol.
 * 1. Checks dynamic Delta Exchange live product specifications (covers all 1,160+ active crypto perps & futures).
 * 2. Checks local LOT_SIZES map for configured defaults & aliases.
 * 3. Applies intelligent heuristics for Gold, Silver, BTC, ETH, SOL, or custom assets.
 */
export const getLotSize = (symbol: string): number => {
  if (!symbol) return 1;
  const upper = symbol.toUpperCase().trim();

  // 1. Live dynamic product contract conversion from Delta Exchange India
  const deltaContractVal = deltaExchange.getContractValue(upper);
  if (deltaContractVal !== undefined && deltaContractVal > 0) {
    return deltaContractVal;
  }

  // 2. Direct match in local LOT_SIZES table
  if (LOT_SIZES[upper] !== undefined) {
    return LOT_SIZES[upper];
  }

  // 3. Clean common delimiters (e.g. "XAUT/USD" -> "XAUTUSD", "BTC/USDT" -> "BTCUSDT")
  const clean = upper.replace(/[\/\-_]/g, '');
  if (LOT_SIZES[clean] !== undefined) {
    return LOT_SIZES[clean];
  }

  // 4. Base asset matching heuristics
  if (upper.startsWith('XAUT') || upper.startsWith('XAU') || upper.startsWith('GOLD')) {
    return 0.001; // 1 lot = 0.001 oz / qty
  }
  if (upper.startsWith('BTC')) {
    return 0.001; // 1 lot = 0.001 BTC
  }
  if (upper.startsWith('ETH')) {
    return 0.01; // 1 lot = 0.01 ETH
  }
  if (upper.startsWith('SILVER') || upper.startsWith('XAG')) {
    return 0.1; // 1 lot = 0.1 oz
  }
  if (upper.startsWith('SOL') || upper.startsWith('XRP')) {
    return 1;
  }

  return 1;
};

export const TOTAL_FEE_RATE = 0.001; // 0.1%
export const GST_RATE = 0.18; // 18%
export const USD_TO_INR_RATE = 85.7;

// Helper to convert camelCase to snake_case for Supabase
export const toSnakeCase = (obj: any) => {
  const newObj: any = {};
  for (const key in obj) {
    if (obj[key] === undefined) continue;
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = obj[key];
  }
  return newObj;
};

// Helper to convert snake_case from Supabase to camelCase
export const toCamelCase = (obj: any) => {
  const newObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj;
};


export const calculateQuantity = (lots: number, symbol: string): number => {
  const lotSize = getLotSize(symbol);
  return lots * lotSize;
};

export const calculateCapitalUsed = (
  quantity: number,
  entryPrice: number,
  leverage: number
): number => {
  if (leverage === 0) return 0;
  return (quantity * entryPrice) / leverage;
};

export const calculateMargin = (
  quantity: number,
  entryPrice: number,
  leverage: number
): number => {
  if (leverage === 0) return 0;
  return (quantity * entryPrice) / leverage;
};

export const calculateFees = (
  quantity: number,
  entryPrice: number
): number => {
  const notionalValue = quantity * entryPrice;
  const baseFee = notionalValue * TOTAL_FEE_RATE;
  const gstOnFee = baseFee * GST_RATE;
  return baseFee + gstOnFee;
};

export const calculatePnL = (
  trade: Partial<Trade>,
  exitPrice?: number
): { grossPnl: number; netPnl: number; roi: number } => {
  const currentExitPrice = exitPrice || trade.exitPrice || trade.entryPrice;
  if (!trade.quantity || !trade.entryPrice || !trade.margin || trade.margin === 0) {
    return { grossPnl: 0, netPnl: 0, roi: 0 };
  }

  let grossPnl: number;
  if (trade.side === 'long') {
    grossPnl = (currentExitPrice - trade.entryPrice) * trade.quantity;
  } else {
    grossPnl = (trade.entryPrice - currentExitPrice) * trade.quantity;
  }

  // FIX: Per user request, Net P&L should reflect the gross profit/loss without fee deduction for display clarity.
  // Fees are still tracked separately on the trade object.
  const netPnl = grossPnl;
  const roi = (netPnl / trade.margin) * 100;

  return { grossPnl, netPnl, roi };
};

export const calculateRiskRewardRatio = (trade: Partial<Trade>): number => {
  // Use exitPrice for realized R:R, fallback to target for potential R:R
  const finalPrice = trade.exitPrice || trade.target;

  if (!trade.entryPrice || !trade.stopLoss || !finalPrice || trade.entryPrice === trade.stopLoss) {
    return 0;
  }

  let potentialProfit, potentialLoss;

  if (trade.side === 'long') {
    potentialProfit = finalPrice - trade.entryPrice;
    potentialLoss = trade.entryPrice - trade.stopLoss;
  } else { // short
    potentialProfit = trade.entryPrice - finalPrice;
    potentialLoss = trade.stopLoss - trade.entryPrice;
  }

  // Ensure loss is positive and non-zero
  if (potentialLoss <= 0) {
    return 0;
  }

  return potentialProfit / potentialLoss;
};


export const calculateLiquidationPrice = (
  entryPrice: number,
  leverage: number,
  side: 'long' | 'short'
): number => {
  const marginRatio = 1 / leverage;
  const maintenanceMargin = 0.005; // 0.5% maintenance margin

  if (side === 'long') {
    return entryPrice * (1 - marginRatio + maintenanceMargin);
  } else {
    return entryPrice * (1 + marginRatio - maintenanceMargin);
  }
};

export const calculatePositionSize = (
  capitalRisk: number,
  riskPercentage: number,
  entryPrice: number,
  stopLoss: number,
  symbol: string
): { lots: number; quantity: number; riskAmount: number } => {
  const riskAmount = (capitalRisk * riskPercentage) / 100;
  const priceRisk = Math.abs(entryPrice - stopLoss);
  const lotSize = getLotSize(symbol);

  if (priceRisk === 0) {
    return { lots: 0, quantity: 0, riskAmount };
  }

  const quantity = riskAmount / priceRisk;
  const lots = quantity / lotSize;

  return { lots, quantity, riskAmount };
};

export const validateTradeInputs = (trade: Partial<Trade>): string[] => {
  const errors: string[] = [];

  if (!trade.symbol) errors.push('Symbol is required');
  if (!trade.entryPrice || trade.entryPrice <= 0) errors.push('Entry price must be greater than 0');
  if (!trade.lots || trade.lots <= 0) errors.push('Lots must be greater than 0');
  if (!trade.leverage || trade.leverage < 1 || trade.leverage > 200) {
    errors.push('Leverage must be between 1 and 200');
  }

  return errors;
};

export const formatCurrency = (amount: number, decimals: number = 2): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safeAmount);
};

export const formatInr = (amount: number): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(decimals)}%`;
};

export const formatNumber = (value: number, decimals: number = 4): string => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

