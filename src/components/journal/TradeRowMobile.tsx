import React, { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDown, MoreVertical, Edit, Trash2, XCircle, TrendingUp, TrendingDown, Image as ImageIcon } from 'lucide-react';
import { Trade, TradingSetup } from '../../types/trading';
import { formatCurrency, formatPercentage } from '../../utils/tradingCalculations';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { clsx } from 'clsx';
import { CryptoIcon } from '../ui/CryptoIcon';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { GlassCard } from '../ui/GlassCard';
import { SetupBadge } from './SetupBadge';

interface TradeRowMobileProps {
  trade: Trade;
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
  onClose: (trade: Trade) => void;
  isSelected: boolean;
  onSelect: (tradeId: string) => void;
  setups?: TradingSetup[];
  onUpdateTradeSetup?: (tradeId: string, setup: string) => void;
  onOpenManageSetups?: () => void;
  onAddNewSetup?: (name: string) => TradingSetup;
}

export const TradeRowMobile: React.FC<TradeRowMobileProps> = ({
  trade,
  onEdit,
  onDelete,
  onClose,
  isSelected,
  onSelect,
  setups,
  onUpdateTradeSetup,
  onOpenManageSetups,
  onAddNewSetup,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isWin = trade.status === 'closed' && (trade.netPnl || 0) > 0;
  const isLoss = trade.status === 'closed' && (trade.netPnl || 0) < 0;
  const isPartial = Boolean(
    trade.tags?.includes('Partial Exit') ||
    trade.tags?.includes('Partial') ||
    (trade.notes && trade.notes.toLowerCase().includes('partial exit'))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <GlassCard className="p-4">
      {/* Top Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <CustomCheckbox id={`mobile-select-${trade.id}`} isChecked={isSelected} onChange={() => onSelect(trade.id)} />
          <div className="flex items-center gap-3">
            <CryptoIcon symbol={trade.symbol} size={32} />
            <div>
              <p className="font-semibold text-text-primary">{trade.symbol}</p>
              <div className={clsx('flex items-center gap-1 text-xs font-medium rounded-full w-fit', {
                  'text-success': trade.side === 'long',
                  'text-danger': trade.side === 'short',
                  'text-text-muted': !trade.side,
                })}>
                {trade.side === 'long' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{(trade.side ? trade.side.toUpperCase() : 'N/A')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className={clsx('px-2 py-1 text-xs font-medium rounded-full w-16 text-center', {
                  'bg-success/10 text-success': trade.status === 'closed',
                  'bg-primary/10 text-primary': trade.status === 'open',
                  'bg-background-light text-text-muted': !trade.status,
              })}>
                  {(trade.status || 'N/A').toUpperCase()}
              </span>
              {isPartial && (
                <span className="mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-background-light text-text-muted">
                  Partial
                </span>
              )}
            </div>
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button onClick={(e) => e.stopPropagation()} className="p-1 rounded-full hover:bg-white/10 text-text-secondary">
                  <MoreVertical className="w-5 h-5" />
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-40 origin-top-right divide-y divide-border rounded-md bg-[#1C1C2E] border border-border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                  <div className="px-1 py-1">
                    {trade.status === 'open' && (
                      <Menu.Item>
                        {({ active }) => (
                          <button onClick={(e) => handleActionClick(e, () => onClose(trade))} className={`${active ? 'bg-primary text-white' : 'text-text-primary'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                            <XCircle className="mr-2 h-4 w-4" /> Close Trade
                          </button>
                        )}
                      </Menu.Item>
                    )}
                    <Menu.Item>
                      {({ active }) => (
                        <button onClick={(e) => handleActionClick(e, () => onEdit(trade))} className={`${active ? 'bg-primary text-white' : 'text-text-primary'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                  <div className="px-1 py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button onClick={(e) => handleActionClick(e, () => onDelete(trade))} className={`${active ? 'bg-danger text-white' : 'text-danger'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
        </div>
      </div>

      {/* Setup Row */}
      <div className="flex items-center justify-between py-2 px-1 mb-3 border-y border-white/5">
        <span className="text-xs text-text-muted font-medium">Trading Setup</span>
        <SetupBadge
          currentSetup={trade.setup}
          setups={setups || []}
          onSelectSetup={(newSetup) => onUpdateTradeSetup?.(trade.id, newSetup)}
          onOpenManageSetups={onOpenManageSetups}
          onAddNewSetup={onAddNewSetup}
          size="sm"
        />
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-text-muted">Net P&L</p>
          <div className={clsx('font-bold', { 'text-success': isWin, 'text-danger': isLoss, 'text-text-secondary': trade.status === 'open' })}>
            {trade.status === 'closed' ? <CurrencyDisplay value={trade.netPnl || 0} inrContainerClassName="flex-col items-start" /> : '-'}
          </div>
          {trade.status === 'closed' && <p className="text-xs">{formatPercentage(trade.roi || 0)}</p>}
        </div>
        <div className="text-right">
          <p className="text-text-muted">Entry / Exit</p>
          <CurrencyDisplay value={trade.entryPrice} decimals={2} className="font-medium justify-end" inrContainerClassName="flex-col items-end" />
          {trade.exitPrice ? <CurrencyDisplay value={trade.exitPrice} decimals={2} className="font-medium justify-end" inrContainerClassName="flex-col items-end" /> : <p className="font-medium">-</p>}
        </div>
      </div>
      
      {/* Footer / Expand Button */}
      <div className="border-t border-border pt-3 flex justify-between items-center text-xs text-text-muted">
        <div>
            <p>{formatDate(trade.openedAt)}</p>
            <p>{formatTime(trade.openedAt)}</p>
        </div>
        <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-1">
            Details
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                <ChevronDown className="w-4 h-4" />
            </motion.div>
        </button>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
          >
            <div className="border-t border-border mt-4 pt-4 grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-text-muted">Lots</p><p className="font-medium">{(trade.lots ?? 0).toFixed(4)}</p></div>
                <div><p className="text-text-muted">Quantity</p><p className="font-medium">{(trade.quantity ?? 0).toFixed(4)}</p></div>
                <div><p className="text-text-muted">Leverage</p><p className="font-medium">{trade.leverage}x</p></div>
                <div>
                    <p className="text-text-muted">Total Margin (Inc. Fees)</p>
                    <CurrencyDisplay value={trade.margin + trade.fees} className="font-medium" inrContainerClassName="flex-col items-start" />
                </div>
                <div>
                    <p className="text-text-muted">Stop Loss</p>
                    {trade.stopLoss ? <CurrencyDisplay value={trade.stopLoss} decimals={2} className="font-medium" inrContainerClassName="flex-col items-start" /> : <p className="font-medium">N/A</p>}
                </div>
                <div>
                    <p className="text-text-muted">Target</p>
                    {trade.target ? <CurrencyDisplay value={trade.target} decimals={2} className="font-medium" inrContainerClassName="flex-col items-start" /> : <p className="font-medium">N/A</p>}
                </div>
                <div><p className="text-text-muted">R:R Ratio</p><p className="font-medium">{trade.riskRewardRatio && trade.riskRewardRatio > 0 ? `1:${trade.riskRewardRatio.toFixed(1)}` : 'N/A'}</p></div>
                {trade.screenshotUrl && (
                    <div className="col-span-2 mt-2">
                        <p className="text-text-muted mb-1">Screenshot</p>
                        <a href={trade.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> View Image
                        </a>
                    </div>
                )}
                {trade.notes && <div className="col-span-2 mt-2"><p className="text-text-muted">Notes</p><p className="text-text-primary whitespace-pre-wrap font-medium">{trade.notes}</p></div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};
