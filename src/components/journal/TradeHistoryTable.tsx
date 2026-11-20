import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trade, JournalFilterStatus, TradingSetup } from '../../types/trading';
import { TradeRow, GroupPosition } from './TradeRow';
import { TradeHistoryToolbar } from './TradeHistoryToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { TradeRowMobile } from './TradeRowMobile';

interface TradeHistoryTableProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
  onClose: (trade: Trade) => void;
  selectedTradeIds: Set<string>;
  setSelectedTradeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  filterStatus: JournalFilterStatus;
  setFilterStatus: (status: JournalFilterStatus) => void;
  filterDate: { start: string; end: string };
  setFilterDate: (date: { start: string; end: string }) => void;
  onDeleteMultiple: (tradeIds: string[]) => void;
  onImportCsv: (file: File) => Promise<void> | void;
  onAddTradeClick: () => void;
  onResetJournalClick: () => void;
  onOpenDeltaSync?: () => void;
  setups?: TradingSetup[];
  onUpdateTradeSetup?: (tradeId: string, setup: string) => void;
  onOpenManageSetups?: () => void;
  onAddNewSetup?: (name: string) => TradingSetup;
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({ 
  trades, 
  onEdit, 
  onDelete, 
  onClose,
  selectedTradeIds,
  setSelectedTradeIds,
  filterStatus,
  setFilterStatus,
  filterDate,
  setFilterDate,
  onDeleteMultiple,
  onImportCsv,
  onAddTradeClick,
  onResetJournalClick,
  onOpenDeltaSync,
  setups,
  onUpdateTradeSetup,
  onOpenManageSetups,
  onAddNewSetup,
}) => {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const processedTrades = useMemo(() => {
    const filtered = trades
      .filter(trade => {
        if (filterStatus === 'all') return true;
        return trade.status === filterStatus;
      })
      .filter(trade => {
        if (!filterDate.start && !filterDate.end) return true;
        const tradeDate = new Date(trade.openedAt);
        const startDate = filterDate.start ? new Date(filterDate.start) : null;
        const endDate = filterDate.end ? new Date(filterDate.end) : null;
        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        if (startDate && endDate) {
          return tradeDate >= startDate && tradeDate <= endDate;
        }
        if (startDate) {
          return tradeDate >= startDate;
        }
        if (endDate) {
          return tradeDate <= endDate;
        }
        return true;
      });
      
    return filtered.sort((a, b) => {
        const dateA = new Date(a.openedAt).getTime();
        const dateB = new Date(b.openedAt).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  }, [trades, filterStatus, filterDate, sortOrder]);

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedTradeIds(new Set(processedTrades.map(t => t.id)));
    } else {
      setSelectedTradeIds(new Set());
    }
  };

  const handleSelectRow = (tradeId: string) => {
    setSelectedTradeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tradeId)) {
        newSet.delete(tradeId);
      } else {
        newSet.add(tradeId);
      }
      return newSet;
    });
  };

  const headers = [
    'Symbol',
    'Side',
    'Setup',
    'Size',
    'Entry Price',
    'Exit Price',
    'Net P&L',
    'Date',
    'Status',
    'Actions',
  ];

  return (
    <motion.div
      className="glass-card p-0 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <TradeHistoryToolbar
        trades={trades}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterDate={filterDate}
        setFilterDate={setFilterDate}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        selectedCount={selectedTradeIds.size}
        onDeleteSelected={() => onDeleteMultiple(Array.from(selectedTradeIds))}
        onImportCsv={onImportCsv}
        onAddTradeClick={onAddTradeClick}
        onResetJournalClick={onResetJournalClick}
        onOpenDeltaSync={onOpenDeltaSync}
        setups={setups}
        onOpenManageSetups={onOpenManageSetups}
      />
      
      {/* Desktop Table View */}
      <div className="w-full hidden md:block overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[960px] text-sm text-left">
          <thead className="text-xs text-text-secondary uppercase bg-background-light/50 border-b border-border">
            <tr>
              <th scope="col" className="px-2 py-3.5 w-6"></th>
              <th scope="col" className="px-2 py-3.5 w-6">
                 <CustomCheckbox
                    id="select-all"
                    isChecked={selectedTradeIds.size > 0 && selectedTradeIds.size === processedTrades.length}
                    onChange={handleSelectAll}
                  />
              </th>
              {headers.map((header) => (
                <th key={header} scope="col" className="px-3 lg:px-5 py-3.5 whitespace-nowrap">
                  {header}
                </th>
              ))}
              <th scope="col" className="px-3 lg:px-4 py-3.5 w-8">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <motion.tbody
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
            initial="hidden"
            animate="visible"
          >
            {processedTrades.map((trade, index) => {
              const prevTrade = processedTrades[index - 1];
              const nextTrade = processedTrades[index + 1];

              let groupPosition: GroupPosition = 'single';
              const partOfGroup = (prevTrade && prevTrade.tradeGroupId === trade.tradeGroupId) || (nextTrade && nextTrade.tradeGroupId === trade.tradeGroupId);

              if (partOfGroup) {
                const isFirst = !prevTrade || prevTrade.tradeGroupId !== trade.tradeGroupId;
                const isLast = !nextTrade || nextTrade.tradeGroupId !== trade.tradeGroupId;
                if (isFirst) groupPosition = 'start';
                else if (isLast) groupPosition = 'end';
                else groupPosition = 'middle';
              }
              
              return (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onClose={onClose}
                  isSelected={selectedTradeIds.has(trade.id)}
                  onSelect={handleSelectRow}
                  groupPosition={groupPosition}
                  setups={setups}
                  onUpdateTradeSetup={onUpdateTradeSetup}
                  onOpenManageSetups={onOpenManageSetups}
                  onAddNewSetup={onAddNewSetup}
                />
              );
            })}
          </motion.tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden p-4 space-y-4">
        {processedTrades.map((trade) => (
          <TradeRowMobile
            key={trade.id}
            trade={trade}
            onEdit={onEdit}
            onDelete={onDelete}
            onClose={onClose}
            isSelected={selectedTradeIds.has(trade.id)}
            onSelect={handleSelectRow}
            setups={setups}
            onUpdateTradeSetup={onUpdateTradeSetup}
            onOpenManageSetups={onOpenManageSetups}
            onAddNewSetup={onAddNewSetup}
          />
        ))}
      </div>
    </motion.div>
  );
};
