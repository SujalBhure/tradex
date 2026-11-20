import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Calendar, Trash2, X, PlusCircle, FileDown, RotateCcw, Upload, Zap, Layers } from 'lucide-react';
import { JournalFilterStatus, Trade, TradingSetup } from '../../types/trading';
import { formatCurrency, formatPercentage } from '../../utils/tradingCalculations';

interface TradeHistoryToolbarProps {
  trades: Trade[];
  filterStatus: JournalFilterStatus;
  setFilterStatus: (status: JournalFilterStatus) => void;
  filterDate: { start: string; end: string };
  setFilterDate: (date: { start: string; end: string }) => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  onImportCsv: (file: File) => Promise<void> | void;
  onAddTradeClick: () => void;
  onResetJournalClick: () => void;
  onOpenDeltaSync?: () => void;
  sortOrder?: 'newest' | 'oldest';
  setSortOrder?: (order: 'newest' | 'oldest') => void;
  setups?: TradingSetup[];
  onOpenManageSetups?: () => void;
}

interface DateInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  onClear?: () => void;
}

const DateInput: React.FC<DateInputProps> = ({ value, onChange, label, onClear }) => {
  const isStart = label.toLowerCase().includes('start');
  const displayLabel = isStart ? 'Start:' : 'End:';

  return (
    <div className="flex items-center gap-1.5 bg-[#121820] hover:bg-[#161f28] px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-emerald-500/30 transition-all group">
      <span className="text-xs font-semibold text-slate-400 select-none shrink-0 tracking-wide">
        {displayLabel}
      </span>
      <input
        type="date"
        value={value}
        onChange={onChange}
        style={{ colorScheme: 'dark' }}
        className="bg-transparent text-xs sm:text-sm text-text-primary focus:outline-none cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
          title={`Clear ${label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export const TradeHistoryToolbar: React.FC<TradeHistoryToolbarProps> = ({
  trades,
  filterStatus,
  setFilterStatus,
  filterDate,
  setFilterDate,
  selectedCount,
  onDeleteSelected,
  onImportCsv,
  onAddTradeClick,
  onResetJournalClick,
  onOpenDeltaSync,
  sortOrder,
  setSortOrder,
  setups,
  onOpenManageSetups,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusOptions: JournalFilterStatus[] = ['all', 'open', 'closed'];

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setFilterDate({ ...filterDate, [field]: value });
  };

  const isFilterActive = filterStatus !== 'all' || filterDate.start || filterDate.end;

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterDate({ start: '', end: '' });
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const XLSX = await import('xlsx');

      const dataToExport = trades.map(trade => ({
        'Symbol': trade.symbol,
        'Side': trade.side,
        'Setup': trade.setup || 'Unassigned',
        'Status': trade.status,
        'Lots': trade.lots.toFixed(4),
        'Quantity': trade.quantity.toFixed(4),
        'Entry Price': formatCurrency(trade.entryPrice, 2),
        'Exit Price': trade.exitPrice ? formatCurrency(trade.exitPrice, 2) : 'N/A',
        'Entry Date': new Date(trade.openedAt).toLocaleString('en-US'),
        'Exit Date': trade.closedAt ? new Date(trade.closedAt).toLocaleString('en-US') : 'N/A',
        'Leverage': `${trade.leverage}x`,
        'Capital Used': formatCurrency(trade.capitalUsed),
        'Net P&L': trade.netPnl ? formatCurrency(trade.netPnl) : 'N/A',
        'ROI (%)': trade.roi ? formatPercentage(trade.roi, 2) : 'N/A',
        'Fees': formatCurrency(trade.fees),
        'Stop Loss': trade.stopLoss ? formatCurrency(trade.stopLoss, 2) : 'N/A',
        'Target': trade.target ? formatCurrency(trade.target, 2) : 'N/A',
        'Notes': trade.notes || '',
        'Trade Group ID': trade.tradeGroupId,
      }));

      const worksheet = XLSX.utils.json_to_sheet([]);

      XLSX.utils.sheet_add_aoa(worksheet, [['TradeX Trading Journal']], { origin: 'A1' });

      const headers = Object.keys(dataToExport[0] || {});
      XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A3' });

      XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A4', skipHeader: true });

      const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFFFF' } }, fill: { fgColor: { rgb: 'FF111111' } } };
      headers.forEach((h, i) => {
        const cellRef = XLSX.utils.encode_cell({ c: i, r: 2 });
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = headerStyle;
        }
      });

      const colWidths = headers.map(header => ({
        wch: Math.max(header.length, ...dataToExport.map(row => row[header as keyof typeof row]?.toString().length || 0)) + 2
      }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'TradeX Journal');
      XLSX.writeFile(workbook, 'TradeX_Journal_Export.xlsx');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      await onImportCsv(file);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-background-light/20 border-b border-border">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportFileChange}
      />
      <div className="flex-1 min-w-0">
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center flex-wrap gap-3"
            >
              <span className="text-sm text-primary font-medium">{selectedCount} selected</span>
              <button
                onClick={onDeleteSelected}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-danger rounded-lg hover:bg-danger-dark transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="w-full xl:w-auto flex items-center justify-between xl:justify-end gap-x-4 gap-y-3 flex-wrap">
        <div className="flex items-center justify-start gap-x-3 gap-y-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-text-muted shrink-0" />
            <div className="flex items-center bg-background-light p-1 rounded-lg min-w-max">
              {statusOptions.map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    filterStatus === status
                      ? 'bg-primary text-black font-semibold'
                      : 'text-text-secondary hover:bg-white/5'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
            <DateInput
              value={filterDate.start}
              onChange={(e) => handleDateChange('start', e.target.value)}
              label="Start Date"
              onClear={() => handleDateChange('start', '')}
            />
            <span className="text-text-muted hidden sm:inline">-</span>
            <DateInput
              value={filterDate.end}
              onChange={(e) => handleDateChange('end', e.target.value)}
              label="End Date"
              onClear={() => handleDateChange('end', '')}
            />
          </div>

          <AnimatePresence>
            {isFilterActive && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
              >
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors whitespace-nowrap"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap ml-auto xl:ml-0">
          <motion.button
              onClick={onResetJournalClick}
              className="bg-danger/10 hover:bg-danger/20 text-danger font-semibold py-2 px-3 sm:px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Reset</span>
          </motion.button>
          <motion.button
            onClick={handleImportClick}
            disabled={isImporting}
            className="bg-background-light hover:bg-white/10 text-text-secondary font-semibold py-2 px-3 sm:px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5 disabled:opacity-60"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Upload className="w-4 h-4" />
            <span className="text-xs sm:text-sm">{isImporting ? 'Importing...' : 'Import'}</span>
          </motion.button>
          <motion.button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-background-light hover:bg-white/10 text-text-secondary font-semibold py-2 px-3 sm:px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <FileDown className="w-4 h-4" />
              <span className="text-xs sm:text-sm">{isExporting ? 'Exporting...' : 'Export'}</span>
          </motion.button>
          {onOpenDeltaSync && (
            <motion.button
              onClick={onOpenDeltaSync}
              className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold py-2 px-3 sm:px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              title="Sync trades automatically from Delta Exchange India"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-xs sm:text-sm">Delta Sync</span>
            </motion.button>
          )}
          {onOpenManageSetups && (
            <motion.button
              onClick={onOpenManageSetups}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold py-2 px-3 sm:px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              title="Manage Trading Setups"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-xs sm:text-sm">Setups</span>
            </motion.button>
          )}
          <motion.button
              onClick={onAddTradeClick}
              className="bg-primary hover:bg-primary-600 text-black font-semibold py-2 px-3 sm:px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Add Trade</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
