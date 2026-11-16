import React, { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDown, MoreVertical, Edit, Trash2, XCircle, TrendingUp, TrendingDown, Image as ImageIcon } from 'lucide-react';
import { Trade } from '../../types/trading';
import { formatCurrency, formatPercentage } from '../../utils/tradingCalculations';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { clsx } from 'clsx';
import { CryptoIcon } from '../ui/CryptoIcon';
import { CustomCheckbox } from '../ui/CustomCheckbox';

export type GroupPosition = 'start' | 'middle' | 'end' | 'single';

interface TradeRowProps {
  trade: Trade;
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
  onClose: (trade: Trade) => void;
  isSelected: boolean;
  onSelect: (tradeId: string) => void;
  groupPosition: GroupPosition;
}

export const TradeRow: React.FC<TradeRowProps> = ({ trade, onEdit, onDelete, onClose, isSelected, onSelect, groupPosition }) => {
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
    <>
      <motion.tr
        className="border-b border-border hover:bg-primary/5 transition-colors duration-200"
        variants={{
          hidden: { opacity: 0, y: -10 },
          visible: { opacity: 1, y: 0 },
        }}
        style={{ overflow: 'visible' }}
      >
        <td className="px-2 py-3.5 lg:py-4 w-6 align-middle relative">
          {groupPosition === 'start' && <div className="absolute left-1/2 -translate-x-1/2 top-1/2 h-1/2 w-px bg-text-secondary" />}
          {groupPosition === 'middle' && <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-px bg-text-secondary" />}
          {groupPosition === 'end' && <div className="absolute left-1/2 -translate-x-1/2 bottom-1/2 h-1/2 w-px bg-text-secondary" />}
          
          {groupPosition !== 'single' && <div className="absolute left-1/2 top-1/2 h-px w-2 bg-text-secondary" />}
        </td>
        <td className="px-2 py-3.5 lg:py-4 w-6">
          <CustomCheckbox
            id={`select-${trade.id}`}
            isChecked={isSelected}
            onChange={() => onSelect(trade.id)}
          />
        </td>
        <td className="px-3 lg:px-5 py-3.5 lg:py-4 font-medium text-text-primary whitespace-nowrap cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center space-x-3">
            <CryptoIcon symbol={trade.symbol} size={32} />
            <span className="font-semibold text-base">{trade.symbol}</span>
          </div>
        </td>
        <td className="px-3 lg:px-5 py-3.5 lg:py-4 cursor-pointer whitespace-nowrap" onClick={() => setIsExpanded(!isExpanded)}>
          <div className={clsx('flex items-center gap-1.5 w-fit px-2.5 py-1 text-xs font-medium rounded-full', {
              'bg-success/10 text-success': trade.side === 'long',
              'bg-danger/10 text-danger': trade.side === 'short',
              'bg-background-light text-text-muted': !trade.side,
            })}>
            {trade.side === 'long' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{(trade.side || 'N/A').toUpperCase()}</span>
          </div>
        </td>
        <td className="px-3 lg:px-5 py-3.5 lg:py-4 cursor-pointer whitespace-nowrap" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="font-medium text-sm sm:text-base">{(trade.lots ?? 0).toFixed(4)}</div>
          <div className="text-xs text-text-muted">lots</div>
        </td>
        <td className="px-3 lg:px-5 py-3.5 lg:py-4 cursor-pointer whitespace-nowrap" onClick={() => setIsExpanded(!isExpanded)}>
          <CurrencyDisplay value={trade.entryPrice} decimals={2} className="text-sm sm:text-base font-medium" />
        </td>
        <td className="px-3 lg:px-5 py-3.5 lg:py-4 cursor-pointer whitespace-nowrap" onClick={() => setIsExpanded(!isExpanded)}>
          {trade.exitPrice ? <CurrencyDisplay value={trade.exitPrice} decimals={2} className="text-sm sm:text-base font-medium" /> : <span className="text-text-secondary">-</span>}
        </td>
        <td className={clsx('px-3 lg:px-5 py-3.5 lg:py-4 font-medium cursor-pointer whitespace-nowrap', {
          'text-success': isWin,
          'text-danger': isLoss,
          'text-text-secondary': trade.status === 'open',
        })} onClick={() => setIsExpanded(!isExpanded)}>
          <div className="font-bold text-sm sm:text-base">{trade.status === 'closed' ? <CurrencyDisplay value={trade.netPnl || 0} /> : '-'}</div>
          {trade.status === 'closed' && (
            <div className="text-xs">{formatPercentage(trade.roi || 0)}</div>
          )}
        </td>
        <td className="px-3 lg:px-5 py-3.5 lg:py-4 whitespace-nowrap cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="text-sm font-medium">{formatDate(trade.openedAt)}</div>
          <div className="text-xs text-text-muted">{formatTime(trade.openedAt)}</div>
        </td>
        <td className="px-3 lg:px-5 py-3.5 lg:py-4 text-center cursor-pointer whitespace-nowrap" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center justify-center gap-1.5">
            <span className={clsx('px-2.5 py-1 text-xs font-medium rounded-full min-w-[64px] text-center', {
              'bg-success/10 text-success': trade.status === 'closed',
              'bg-primary/10 text-primary': trade.status === 'open',
              'bg-background-light text-text-muted': !trade.status,
            })}>
              {(trade.status || 'N/A').toUpperCase()}
            </span>
            {isPartial && (
              <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-background-light text-text-muted">
                Partial
              </span>
            )}
          </div>
        </td>
        <td className="px-3 lg:px-5 py-3.5 lg:py-4 text-center relative">
          <div>
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
                <Menu.Items className="actions-menu absolute right-0 mt-2 w-40 origin-top-right divide-y divide-border rounded-md shadow-2xl z-30">
                  <div className="px-1 py-1">
                    {trade.status === 'open' && (
                      <Menu.Item>
                        <button
                          onClick={(e) => handleActionClick(e, () => onClose(trade))}
                          className="group flex w-full items-center rounded-md px-2 py-2 text-sm transition-all duration-200 text-text-primary data-[active]:bg-primary/20 data-[active]:translate-x-1"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Close Trade
                        </button>
                      </Menu.Item>
                    )}
                    <Menu.Item>
                      <button
                        onClick={(e) => handleActionClick(e, () => onEdit(trade))}
                        className="group flex w-full items-center rounded-md px-2 py-2 text-sm transition-all duration-200 text-text-primary data-[active]:bg-primary/20 data-[active]:translate-x-1"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </button>
                    </Menu.Item>
                  </div>
                  <div className="px-1 py-1">
                    <Menu.Item>
                      <button
                        onClick={(e) => handleActionClick(e, () => onDelete(trade))}
                        className="group flex w-full items-center rounded-md px-2 py-2 text-sm transition-all duration-200 text-danger data-[active]:bg-danger/20"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </button>
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </td>
        <td className="px-3 lg:px-4 py-3.5 lg:py-4 text-right cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </motion.div>
        </td>
      </motion.tr>
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={12} className="p-0">
              <motion.div
                className="overflow-hidden"
                initial={{ maxHeight: 0, opacity: 0 }}
                animate={{ maxHeight: '500px', opacity: 1 }}
                exit={{ maxHeight: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="bg-background-light/70 p-4 sm:p-6 border-b border-border/40">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 text-sm">
                    <div>
                      <p className="text-text-muted">Lots</p>
                      <p className="font-medium">{(trade.lots ?? 0).toFixed(4)}</p>
                    </div>
                     <div>
                      <p className="text-text-muted">Quantity</p>
                      <p className="font-medium">{(trade.quantity ?? 0).toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-text-muted">Leverage</p>
                      <p className="font-medium">{trade.leverage}x</p>
                    </div>
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
                    <div>
                      <p className="text-text-muted">R:R Ratio</p>
                      <p className="font-medium">{trade.riskRewardRatio && trade.riskRewardRatio > 0 ? `1:${trade.riskRewardRatio.toFixed(1)}` : 'N/A'}</p>
                    </div>
                     {trade.screenshotUrl && (
                       <div className="col-span-full mt-2">
                          <p className="text-text-muted mb-1">Screenshot</p>
                          <a href={trade.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> View Image
                          </a>
                       </div>
                    )}
                     {trade.notes && (
                       <div className="col-span-full mt-2">
                          <p className="text-text-muted">Notes</p>
                          <p className="text-text-primary whitespace-pre-wrap font-medium">{trade.notes}</p>
                       </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
};
