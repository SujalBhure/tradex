import * as XLSX from 'xlsx';
import { Trade } from '../types/trading';
import { TradingNote, SelfJournalEntry } from '../types/aiJournal';
import {
  calculateRiskRewardRatio,
  calculateQuantity,
  calculateMargin,
  calculateFees,
  calculatePnL,
  LOT_SIZES,
  getLotSize,
} from './tradingCalculations';

export interface ExportDataParams {
  trades: Trade[];
  capital: number;
  notes?: TradingNote[];
  selfJournal?: SelfJournalEntry[];
  userEmail?: string | null;
}

/**
 * Exports complete TradeX journal to a multi-sheet Microsoft Excel (.xlsx) workbook.
 */
export function exportToExcelWorkbook({ trades, capital, notes = [], selfJournal = [], userEmail }: ExportDataParams) {
  const wb = XLSX.utils.book_new();

  // 1. Trades Sheet
  const tradesData = trades.map((t, idx) => ({
    '#': idx + 1,
    'Symbol': t.symbol,
    'Side': t.side.toUpperCase(),
    'Status': t.status.toUpperCase(),
    'Lots': t.lots,
    'Quantity': t.quantity,
    'Entry Price ($)': t.entryPrice,
    'Exit Price ($)': t.exitPrice ?? '',
    'Stop Loss ($)': t.stopLoss ?? '',
    'Target ($)': t.target ?? '',
    'Leverage': `${t.leverage}x`,
    'Capital Used ($)': t.capitalUsed,
    'Margin ($)': t.margin,
    'Fees ($)': t.fees,
    'Gross P&L ($)': t.grossPnl ?? '',
    'Net P&L ($)': t.netPnl ?? '',
    'ROI (%)': t.roi ? `${t.roi.toFixed(2)}%` : '',
    'R:R Ratio': t.riskRewardRatio ? `1:${t.riskRewardRatio.toFixed(2)}` : '',
    'Open Date': t.openedAt ? new Date(t.openedAt).toLocaleString() : '',
    'Close Date': t.closedAt ? new Date(t.closedAt).toLocaleString() : '',
    'Notes': t.notes ?? '',
    'Trade ID': t.id,
  }));

  const wsTrades = XLSX.utils.json_to_sheet(tradesData);
  XLSX.utils.book_append_sheet(wb, wsTrades, 'Trades');

  // 2. Summary Sheet
  const totalTrades = trades.length;
  const closedTrades = trades.filter((t) => t.status === 'closed');
  const winningTrades = closedTrades.filter((t) => (t.netPnl ?? 0) > 0);
  const losingTrades = closedTrades.filter((t) => (t.netPnl ?? 0) < 0);
  const totalNetPnl = closedTrades.reduce((acc, t) => acc + (t.netPnl ?? 0), 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  const totalFees = trades.reduce((acc, t) => acc + (t.fees ?? 0), 0);

  const summaryData = [
    { 'Metric': 'Account / User', 'Value': userEmail || 'Trader' },
    { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() },
    { 'Metric': 'Current Trading Capital ($)', 'Value': capital },
    { 'Metric': 'Total Trades', 'Value': totalTrades },
    { 'Metric': 'Closed Trades', 'Value': closedTrades.length },
    { 'Metric': 'Winning Trades', 'Value': winningTrades.length },
    { 'Metric': 'Losing Trades', 'Value': losingTrades.length },
    { 'Metric': 'Win Rate (%)', 'Value': `${winRate.toFixed(2)}%` },
    { 'Metric': 'Total Realized Net P&L ($)', 'Value': totalNetPnl.toFixed(2) },
    { 'Metric': 'Total Trading Fees Paid ($)', 'Value': totalFees.toFixed(2) },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary & Metrics');

  // 3. Notes Sheet
  if (notes.length > 0) {
    const notesData = notes.map((n) => ({
      'Title': n.title,
      'Category': n.category,
      'Content': n.content,
      'Symbol': n.symbol || '',
      'Tags': Array.isArray(n.tags) ? n.tags.join(', ') : '',
      'Pinned': n.isPinned ? 'YES' : 'NO',
      'Date': n.date,
    }));
    const wsNotes = XLSX.utils.json_to_sheet(notesData);
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Trading Notes');
  }

  // 4. Self Journal Sheet
  if (selfJournal.length > 0) {
    const sjData = selfJournal.map((s) => ({
      'Date': s.date,
      'Mood': s.mood,
      'Discipline (1-10)': s.disciplineRating,
      'Market Conditions': s.marketConditions || '',
      'Wins': s.wins || '',
      'Mistakes': s.mistakes || '',
      'Lessons': s.lessons || '',
      'Notes': s.notes || '',
    }));
    const wsSJ = XLSX.utils.json_to_sheet(sjData);
    XLSX.utils.book_append_sheet(wb, wsSJ, 'Self Journal');
  }

  // Trigger browser download
  const filename = `TradeX_Journal_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Universal parser for .xlsx, .xls, and .csv files.
 */
export async function parseExcelOrCsvFile(file: File, userId: string): Promise<Trade[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', raw: false });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Workbook contains no sheets.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  if (!rows || rows.length === 0) {
    throw new Error('File has no data rows.');
  }

  const parseNumber = (val: unknown): number => {
    if (typeof val === 'number') return Number.isFinite(val) ? val : NaN;
    if (!val) return NaN;
    const str = String(val).replace(/[$,₹]/g, '').trim();
    const num = Number(str);
    return Number.isFinite(num) ? num : NaN;
  };

  const pick = (row: Record<string, unknown>, keys: string[]): unknown => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
        return row[key];
      }
    }
    return undefined;
  };

  const trades: Trade[] = [];

  for (const row of rows) {
    const symbolRaw = String(pick(row, ['Symbol', 'symbol', 'Contract', 'contract', 'Asset']) || '').toUpperCase().trim();
    if (!symbolRaw) continue;

    const sideRaw = String(pick(row, ['Side', 'side', 'Type', 'type']) || '').toLowerCase().trim();
    const side: 'long' | 'short' = /sell|short/.test(sideRaw) ? 'short' : 'long';

    const entryPrice = parseNumber(pick(row, ['Entry Price', 'Entry Price ($)', 'entry_price', 'entryPrice', 'Exec Price']));
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) continue;

    const exitPriceRaw = parseNumber(pick(row, ['Exit Price', 'Exit Price ($)', 'exit_price', 'exitPrice']));
    const exitPrice = Number.isFinite(exitPriceRaw) && exitPriceRaw > 0 ? exitPriceRaw : undefined;

    const statusRaw = String(pick(row, ['Status', 'status']) || '').toLowerCase();
    const status: 'open' | 'closed' = statusRaw.includes('closed') || !!exitPrice ? 'closed' : 'open';

    const lotsRaw = parseNumber(pick(row, ['Lots', 'lot_size', 'lots', 'Qty', 'qty']));
    const qtyRaw = parseNumber(pick(row, ['Quantity', 'quantity']));
    let lots = Number.isFinite(lotsRaw) && lotsRaw > 0 ? lotsRaw : 1;
    let quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : NaN;

    if (!Number.isFinite(quantity)) {
      quantity = calculateQuantity(lots, symbolRaw);
    } else if (!Number.isFinite(lotsRaw)) {
      const lotSize = getLotSize(symbolRaw);
      lots = quantity / lotSize;
    }

    const leverageRaw = parseNumber(pick(row, ['Leverage', 'leverage']));
    const leverage = Number.isFinite(leverageRaw) && leverageRaw > 0 ? Math.round(leverageRaw) : 25;

    const marginRaw = parseNumber(pick(row, ['Margin', 'Capital Used', 'capital_used', 'margin']));
    const margin = Number.isFinite(marginRaw) && marginRaw > 0 ? marginRaw : calculateMargin(quantity, entryPrice, leverage);

    const feesRaw = parseNumber(pick(row, ['Fees', 'Trading Fees', 'fees']));
    const fees = Number.isFinite(feesRaw) && feesRaw >= 0 ? feesRaw : calculateFees(quantity, entryPrice);

    const stopLossRaw = parseNumber(pick(row, ['Stop Loss', 'Stop Loss ($)', 'stop_loss', 'stopLoss']));
    const targetRaw = parseNumber(pick(row, ['Target', 'Target ($)', 'target']));

    const openDateRaw = pick(row, ['Open Date', 'Opened At', 'Time', 'Date', 'Entry Date', 'opened_at']);
    const openedAt = openDateRaw ? new Date(String(openDateRaw)).toISOString() : new Date().toISOString();

    const closeDateRaw = pick(row, ['Close Date', 'Closed At', 'Exit Date', 'closed_at']);
    const closedAt = closeDateRaw ? new Date(String(closeDateRaw)).toISOString() : (status === 'closed' ? new Date().toISOString() : undefined);

    const notes = String(pick(row, ['Notes', 'notes', 'Explanation']) || '').trim() || undefined;

    const tradeId = crypto.randomUUID();
    const newTrade: Trade = {
      id: tradeId,
      tradeGroupId: tradeId,
      userId,
      symbol: symbolRaw,
      side,
      lots,
      quantity,
      entryPrice,
      exitPrice,
      leverage,
      capitalUsed: margin,
      margin,
      fees,
      status,
      openedAt,
      closedAt,
      stopLoss: Number.isFinite(stopLossRaw) && stopLossRaw > 0 ? stopLossRaw : undefined,
      target: Number.isFinite(targetRaw) && targetRaw > 0 ? targetRaw : undefined,
      notes,
      riskRewardRatio: 0,
    };

    if (status === 'closed' && exitPrice) {
      const pnl = calculatePnL(newTrade, exitPrice);
      newTrade.grossPnl = pnl.grossPnl;
      newTrade.netPnl = pnl.netPnl;
      newTrade.roi = pnl.roi;
    }

    newTrade.riskRewardRatio = calculateRiskRewardRatio(newTrade);
    trades.push(newTrade);
  }

  return trades;
}
