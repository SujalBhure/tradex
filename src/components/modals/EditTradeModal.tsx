import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Edit, Calendar, Clock, Shield, Target as TargetIcon, Info, UploadCloud, Trash2, Image as ImageIcon } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { FormInput } from '../ui/FormInput';
import { CustomSelect } from '../ui/CustomSelect';
import { CryptoSelect } from '../ui/CryptoSelect';
import { Trade, TradingSetup } from '../../types/trading';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { MarketType, getSymbolsForMarket } from '../../utils/market';
import { compressScreenshot } from '../../utils/imageUtils';
import {
  LOT_SIZES,
  getLotSize,
  calculatePnL,
  formatCurrency,
  calculateFees,
  calculateMargin,
  TOTAL_FEE_RATE,
  GST_RATE,
} from '../../utils/tradingCalculations';

interface EditTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrade: (trade: Trade) => void;
  trade: Trade;
  market: MarketType;
  setups?: TradingSetup[];
}

type TradeFormData = {
  date: string;
  time: string;
  symbol: string;
  otherSymbolName?: string;
  side: 'long' | 'short';
  entryPrice: string;
  lots: string;
  quantity: string;
  marginUsed?: string;
  leverage: number;
  stopLoss?: string;
  target?: string;
  exitPrice?: string;
};

const LEVERAGE_OPTIONS = [25, 50, 100, 200].map(l => ({ value: l, label: `${l}x` }));
const SIDE_OPTIONS = [
  { value: 'long', label: 'Long' },
  { value: 'short', label: 'Short' },
];

export const EditTradeModal: React.FC<EditTradeModalProps> = ({
  isOpen,
  onClose,
  onUpdateTrade,
  trade,
  market,
  setups,
}) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(trade?.notes || '');
  const [selectedSetup, setSelectedSetup] = useState<string>(trade?.setup || '');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [currentScreenshotUrl, setCurrentScreenshotUrl] = useState<string | undefined>(trade.screenshotUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [positionDetails, setPositionDetails] = useState({
    potentialProfit: 0,
    potentialLoss: 0,
    margin: 0,
    fees: 0,
  });

  const lastEditedField = useRef<'lots' | 'quantity' | null>(null);
  const symbolOptions = useMemo(() => [...getSymbolsForMarket(market), 'OTHER'], [market]);

  const {
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors, isValid, isSubmitting },
  } = useForm<TradeFormData>({
    mode: 'onChange',
    shouldUnregister: true,
    defaultValues: {
      date: '',
      time: '',
      symbol: 'BTC',
      otherSymbolName: '',
      side: 'long',
      entryPrice: '',
      lots: '',
      quantity: '',
      marginUsed: '',
      leverage: 25,
      stopLoss: '',
      target: '',
      exitPrice: '',
    }
  });

  useEffect(() => {
    if (trade && isOpen) {
      const entryDate = new Date(trade.openedAt);
      const isKnownSymbol = symbolOptions.includes(trade.symbol);
      reset({
        date: entryDate.toISOString().split('T')[0],
        time: entryDate.toTimeString().slice(0, 5),
        symbol: isKnownSymbol ? trade.symbol : 'OTHER',
        otherSymbolName: isKnownSymbol ? '' : trade.symbol,
        side: trade.side,
        entryPrice: String(trade.entryPrice),
        lots: String(trade.lots),
        quantity: String(trade.quantity),
        marginUsed: String(trade.margin),
        leverage: trade.leverage,
        stopLoss: trade.stopLoss ? String(trade.stopLoss) : '',
        target: trade.target ? String(trade.target) : '',
        exitPrice: trade.exitPrice ? String(trade.exitPrice) : '',
      });
      setNotes(trade.notes || '');
      setSelectedSetup(trade.setup || '');
      setCurrentScreenshotUrl(trade.screenshotUrl);
      setScreenshotFile(null);
    }
  }, [trade, isOpen, reset, symbolOptions]);

  const { lots, quantity, entryPrice, leverage, symbol, side, stopLoss, target, marginUsed } = watch();
  const isOtherSymbol = symbol === 'OTHER';

  useEffect(() => {
    const lotsNum = parseFloat(lots || '0');
    const quantityNum = parseFloat(quantity || '0');
    const marginUsedNum = parseFloat(marginUsed || '0');
    const entryPriceNum = parseFloat(entryPrice || '0');
    const leverageNum = parseInt(leverage?.toString() || '1', 10);
    const lotSize = getLotSize(symbol || 'BTC');

    const source = lastEditedField.current;

    if (!isOtherSymbol && entryPriceNum > 0 && leverageNum > 0 && lotSize > 0) {
      if (source === 'lots') {
        const newQuantity = lotsNum * lotSize;
        setValue('quantity', isNaN(newQuantity) ? '' : newQuantity.toString(), { shouldValidate: true });
      } else if (source === 'quantity') {
        const newLots = quantityNum / lotSize;
        setValue('lots', isNaN(newLots) ? '' : newLots.toString(), { shouldValidate: true });
      } else {
        const currentLots = parseFloat(watch('lots') || '0');
        if (currentLots > 0) {
            const newQuantity = currentLots * lotSize;
            setValue('quantity', newQuantity.toString(), { shouldValidate: true });
        }
      }
    }
    
    const finalQuantity = parseFloat(watch('quantity') || '0');
    const finalEntryPrice = parseFloat(watch('entryPrice') || '0');
    const finalLeverage = parseInt(watch('leverage')?.toString() || '1', 10);
    const stopLossNum = stopLoss ? parseFloat(stopLoss) : 0;
    const targetNum = target ? parseFloat(target) : 0;
    const effectiveQuantity = isOtherSymbol && marginUsedNum > 0 && finalEntryPrice > 0 && finalLeverage > 0
      ? (marginUsedNum * finalLeverage) / finalEntryPrice
      : finalQuantity;
    const effectiveMargin = isOtherSymbol ? marginUsedNum : (effectiveQuantity * finalEntryPrice) / finalLeverage;

    if (effectiveQuantity > 0 && finalEntryPrice > 0 && effectiveMargin > 0) {
        const tempTrade = {
            side: side,
        quantity: effectiveQuantity,
            entryPrice: finalEntryPrice,
        margin: effectiveMargin,
        };
        const profitCalc = targetNum > 0 ? calculatePnL(tempTrade as any, targetNum) : { grossPnl: 0 };
        const lossCalc = stopLossNum > 0 ? calculatePnL(tempTrade as any, stopLossNum) : { grossPnl: 0 };
        
        setPositionDetails({
            potentialProfit: profitCalc.grossPnl,
            potentialLoss: lossCalc.grossPnl,
        margin: effectiveMargin,
        fees: calculateFees(effectiveQuantity, finalEntryPrice),
        });
    } else {
        setPositionDetails({ potentialProfit: 0, potentialLoss: 0, margin: 0, fees: 0 });
    }
    }, [lots, quantity, entryPrice, leverage, symbol, side, stopLoss, target, marginUsed, setValue, watch, isOtherSymbol]);

  const onSubmit = async (data: TradeFormData) => {
    setLoading(true);

    try {
      let finalScreenshotUrl = currentScreenshotUrl;

      if (screenshotFile) {
        try {
          finalScreenshotUrl = await compressScreenshot(screenshotFile);
        } catch (uploadError) {
          console.error('Screenshot processing error:', uploadError);
          toast.error('Failed to process new screenshot.');
        }
      } else if (currentScreenshotUrl === undefined) {
        // User clicked remove on an existing screenshot
        finalScreenshotUrl = undefined;
      }

      const openedAt = new Date(`${data.date}T${data.time}:00`).toISOString();
      const lotsNum = parseFloat(data.lots);
      const quantityNum = parseFloat(data.quantity);
      const marginUsedNum = parseFloat(data.marginUsed || '0');
      const entryPriceNum = parseFloat(data.entryPrice);
      const stopLossNum = data.stopLoss ? parseFloat(data.stopLoss) : undefined;
      const targetNum = data.target ? parseFloat(data.target) : undefined;
      const exitPriceNum = data.exitPrice ? parseFloat(data.exitPrice) : undefined;
      const isOtherTrade = data.symbol === 'OTHER';
      const customSymbol = (data.otherSymbolName || '').trim().toUpperCase();
      const resolvedSymbol = isOtherTrade ? customSymbol : data.symbol;

      if (isOtherTrade && !resolvedSymbol) {
        toast.error('Custom asset name is required for OTHER.');
        setLoading(false);
        return;
      }

      if (isOtherTrade && marginUsedNum <= 0) {
        toast.error('Enter a valid margin used for OTHER.');
        setLoading(false);
        return;
      }

      const margin = isOtherTrade ? marginUsedNum : calculateMargin(quantityNum, entryPriceNum, data.leverage);
      const quantityFromMargin = entryPriceNum > 0 && data.leverage > 0 ? (margin * data.leverage) / entryPriceNum : 0;
      const resolvedQuantity = isOtherTrade ? quantityFromMargin : quantityNum;
      const resolvedLots = isOtherTrade ? 0 : lotsNum;
      const fees = calculateFees(resolvedQuantity, entryPriceNum);

      const updatedTrade: Trade = {
        ...trade,
        symbol: resolvedSymbol,
        side: data.side,
        lots: resolvedLots,
        quantity: resolvedQuantity,
        capitalUsed: margin,
        entryPrice: entryPriceNum,
        stopLoss: stopLossNum,
        target: targetNum,
        exitPrice: exitPriceNum,
        leverage: data.leverage,
        margin: margin,
        status: exitPriceNum ? 'closed' : 'open',
        openedAt,
        closedAt: exitPriceNum ? (trade.closedAt || new Date().toISOString()) : undefined,
        notes: notes || undefined,
        fees: fees,
        screenshotUrl: finalScreenshotUrl,
        setup: selectedSetup.trim() || undefined,
      };

      if (updatedTrade.status === 'closed' && updatedTrade.exitPrice) {
        const pnl = calculatePnL(updatedTrade, updatedTrade.exitPrice);
        updatedTrade.grossPnl = pnl.grossPnl;
        updatedTrade.netPnl = pnl.netPnl;
        updatedTrade.roi = pnl.roi;
      }

      await onUpdateTrade(updatedTrade);
      
      toast.success('Trade updated successfully!');
      onClose();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update trade.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFocus = useCallback((fieldName: 'lots' | 'quantity') => {
    lastEditedField.current = fieldName;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
      <motion.div
        className="modal-content w-full max-w-4xl max-h-[95vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Edit className="w-4 h-4 text-black" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">Edit Trade</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-x-8">
              <div className="md:col-span-3 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput name="date" label="Date" type="date" icon={Calendar} control={control} errors={errors} rules={{ required: 'Date is required' }} />
                  <FormInput name="time" label="Time" type="time" icon={Clock} control={control} errors={errors} rules={{ required: 'Time is required' }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="symbol"
                    control={control}
                    rules={{ required: 'Symbol is required' }}
                    render={({ field }) => (
                      <CryptoSelect
                        label="Symbol"
                        options={symbolOptions}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="side"
                    control={control}
                    render={({ field }) => (
                      <CustomSelect
                        label="Side"
                        name="side"
                        options={SIDE_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                {isOtherSymbol && (
                  <FormInput
                    name="otherSymbolName"
                    label="Custom Asset Name"
                    placeholder="e.g. NAS100"
                    control={control}
                    errors={errors}
                    rules={{ required: 'Custom asset name is required' }}
                  />
                )}
                
                <FormInput name="entryPrice" label="Entry Price" placeholder="0.00" control={control} errors={errors} rules={{ required: 'Entry Price is required' }} />

                {isOtherSymbol ? (
                  <FormInput
                    name="marginUsed"
                    label="Margin Used"
                    placeholder="0.00"
                    control={control}
                    errors={errors}
                    rules={{ required: 'Margin used is required', min: { value: 0.00000001, message: 'Must be positive' } }}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput name="lots" label="Lot Size" placeholder="0.0" control={control} errors={errors} onFocus={() => handleFocus('lots')} rules={{ required: 'This field is required' }} />
                    <FormInput name="quantity" label="Quantity" placeholder="0.0" control={control} errors={errors} onFocus={() => handleFocus('quantity')} rules={{ required: 'This field is required' }} />
                  </div>
                )}

                <Controller
                    name="leverage"
                    control={control}
                    render={({ field }) => (
                        <CustomSelect
                        label="Leverage"
                        name="leverage"
                        options={LEVERAGE_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                        />
                    )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormInput name="stopLoss" label="Stop Loss" placeholder="Optional" icon={Shield} control={control} errors={errors} />
                  <FormInput name="target" label="Target" placeholder="Optional" icon={TargetIcon} control={control} errors={errors} />
                </div>
                <FormInput name="exitPrice" label="Exit Price (if closed)" placeholder="Leave empty for open position" control={control} errors={errors} />
              </div>

              <div className="md:col-span-2 space-y-6 mt-6 md:mt-0">
                <div className="bg-background p-4 rounded-lg border border-border">
                  <h3 className="text-base font-semibold text-text-primary mb-3">Position Details</h3>
                  <div className="space-y-2 text-sm">
                     <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Total Margin (Inc. Fees)</span>
                      <CurrencyDisplay value={positionDetails.margin + positionDetails.fees} className="text-text-primary font-bold text-lg justify-end" inrContainerClassName="flex-col items-end" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Potential Profit</span>
                      <CurrencyDisplay value={positionDetails.potentialProfit} className="text-success font-medium justify-end" inrContainerClassName="flex-col items-end" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Potential Loss</span>
                      <CurrencyDisplay value={Math.abs(positionDetails.potentialLoss)} className="text-danger font-medium justify-end" inrContainerClassName="flex-col items-end" />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-text-secondary">Trading Setup</label>
                    {selectedSetup && (
                      <button
                        type="button"
                        onClick={() => setSelectedSetup('')}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedSetup}
                    onChange={(e) => setSelectedSetup(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Select a setup (Optional)</option>
                    {(setups || []).map((s) => (
                      <option key={s.id || s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Add trading notes, strategy, or market analysis..."
                    className="w-full p-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-primary transition-all duration-200 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Screenshot</label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files ? e.target.files[0] : null;
                        setScreenshotFile(file);
                        if (file) setCurrentScreenshotUrl(URL.createObjectURL(file));
                      }}
                      className="hidden"
                    />
                    {screenshotFile ? (
                       <div className="flex items-center justify-between p-3 bg-background-light rounded-lg">
                        <span className="text-sm text-text-primary truncate">{screenshotFile.name}</span>
                        <button type="button" onClick={() => setScreenshotFile(null)} className="p-1 text-danger hover:bg-danger/10 rounded-full">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : currentScreenshotUrl ? (
                      <div className="flex items-center justify-between p-3 bg-background-light rounded-lg">
                        <a href={currentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2 truncate">
                          <ImageIcon className="w-4 h-4" /> View Current Image
                        </a>
                        <button type="button" onClick={() => { setCurrentScreenshotUrl(undefined); setScreenshotFile(null); }} className="p-1 text-danger hover:bg-danger/10 rounded-full">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex justify-center items-center gap-2 px-4 py-6 border-2 border-border border-dashed rounded-lg text-text-secondary hover:border-primary hover:text-primary transition-colors"
                      >
                        <UploadCloud className="w-5 h-5" />
                        <span>Click to upload a screenshot</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
        
        <div className="p-6 border-t border-border flex justify-end space-x-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="secondary-button px-5 py-2.5">Cancel</button>
          <button type="submit" onClick={handleSubmit(onSubmit)} disabled={!isValid || isSubmitting} className="primary-button px-5 py-2.5 flex items-center gap-2">
            {loading && <LoadingSpinner size="sm" />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};
