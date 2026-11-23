import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, Calendar, Clock, Shield, Target as TargetIcon, Info, UploadCloud, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { FormInput } from '../ui/FormInput';
import { CustomSelect } from '../ui/CustomSelect';
import { CryptoSelect } from '../ui/CryptoSelect';
import { ToggleSwitch } from '../ui/ToggleSwitch';
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

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrade: (trade: Omit<Trade, 'id' | 'tradeGroupId'>) => void;
  market: MarketType;
  setups?: TradingSetup[];
  onAddNewSetup?: (name: string) => TradingSetup;
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
const DEFAULT_FEE_PERCENT = Number(((TOTAL_FEE_RATE * (1 + GST_RATE)) * 100).toFixed(3));

export const AddTradeModal: React.FC<AddTradeModalProps> = ({
  isOpen,
  onClose,
  onAddTrade,
  market,
  setups,
  onAddNewSetup,
}) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedSetup, setSelectedSetup] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [includeFees, setIncludeFees] = useState(true);
  const [feePercent, setFeePercent] = useState(DEFAULT_FEE_PERCENT.toString());
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
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      symbol: symbolOptions[0] || 'BTC',
      otherSymbolName: '',
      side: 'long',
      lots: '',
      quantity: '',
      marginUsed: '',
      entryPrice: '',
      leverage: 25,
      stopLoss: '',
      target: '',
      exitPrice: '',
    },
  });

  const { lots, quantity, entryPrice, leverage, symbol, side, stopLoss, target, marginUsed, otherSymbolName } = watch();
  const isOtherSymbol = symbol === 'OTHER';

  useEffect(() => {
    if (!symbolOptions.includes(symbol)) {
      setValue('symbol', symbolOptions[0] || 'BTC', { shouldValidate: true });
    }
  }, [symbol, symbolOptions, setValue]);

  const calculateFeeFromPercent = useCallback((qty: number, price: number) => {
    if (!includeFees) return 0;
    const parsedFeePercent = Number.parseFloat(feePercent);
    const safeFeePercent = Number.isFinite(parsedFeePercent) ? Math.max(parsedFeePercent, 0) : 0;
    return qty * price * (safeFeePercent / 100);
  }, [includeFees, feePercent]);

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
          fees: calculateFeeFromPercent(effectiveQuantity, finalEntryPrice),
        });
    } else {
        setPositionDetails({ potentialProfit: 0, potentialLoss: 0, margin: 0, fees: 0 });
    }
      }, [lots, quantity, entryPrice, leverage, symbol, side, stopLoss, target, marginUsed, setValue, watch, calculateFeeFromPercent, isOtherSymbol]);
const onSubmit = async (data: TradeFormData) => {
  setLoading(true);

  try {
    let screenshotUrl: string | undefined = undefined;

    // Convert and compress screenshot if present
    if (screenshotFile) {
      try {
        screenshotUrl = await compressScreenshot(screenshotFile);
      } catch (uploadError) {
        console.error('Screenshot processing error:', uploadError);
        toast.error('Failed to process screenshot');
      }
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
      toast.error('Enter a custom asset name for OTHER.');
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
    const fees = calculateFeeFromPercent(resolvedQuantity, entryPriceNum);

    const tradeData: Omit<Trade, 'id' | 'tradeGroupId' | 'riskRewardRatio'> = {
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
      fees: fees,
      status: exitPriceNum ? 'closed' : 'open',
      openedAt,
      closedAt: exitPriceNum ? new Date().toISOString() : undefined,
      notes: notes || undefined,
      screenshotUrl,
      setup: selectedSetup.trim() || undefined,
    };

    if (tradeData.status === 'closed' && tradeData.exitPrice) {
      const pnl = calculatePnL(tradeData as any, tradeData.exitPrice);
      tradeData.grossPnl = pnl.grossPnl;
      tradeData.netPnl = pnl.netPnl;
      tradeData.roi = pnl.roi;
    }

    await onAddTrade(tradeData);
    
    reset();
    setNotes('');
    setSelectedSetup('');
    setScreenshotFile(null);
    setIncludeFees(true);
    setFeePercent(DEFAULT_FEE_PERCENT.toString());
    onClose();
    toast.success('Trade added successfully!');
  } catch (error) {
    toast.error('Failed to add trade. Please check your inputs.');
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
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">Add New Trade</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <form id="add-trade-form" onSubmit={handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
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
                
                <FormInput name="entryPrice" label="Entry Price" placeholder="0.00" control={control} errors={errors} rules={{ required: 'Entry Price is required', min: { value: 0.00000001, message: 'Must be positive' } }} />

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
                    <FormInput name="lots" label="Lot Size" placeholder="0.0" control={control} errors={errors} onFocus={() => handleFocus('lots')} rules={{ required: 'This field is required', min: { value: 0.00000001, message: 'Must be positive' } }} />
                    <FormInput name="quantity" label="Quantity" placeholder="0.0" control={control} errors={errors} onFocus={() => handleFocus('quantity')} rules={{ required: 'This field is required', min: { value: 0.00000001, message: 'Must be positive' } }} />
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

                <div className="bg-background p-3 rounded-lg border border-border space-y-3">
                  <ToggleSwitch
                    label="Include Fees"
                    enabled={includeFees}
                    setEnabled={setIncludeFees}
                  />
                  {includeFees && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">Fee % Deducted</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={feePercent}
                        onChange={(e) => setFeePercent(e.target.value)}
                        placeholder="0.118"
                        className="w-full py-2.5 px-4 bg-[#1C1C2E] border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-primary transition-all duration-200"
                      />
                    </div>
                  )}
                </div>
                
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
                      <CurrencyDisplay value={positionDetails.margin + positionDetails.fees} className="text-text-primary font-bold text-lg justify-end" inrContainerClassName="flex-col items-end"/>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Potential Profit</span>
                      <CurrencyDisplay value={positionDetails.potentialProfit} className="text-success font-medium justify-end" inrContainerClassName="flex-col items-end"/>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Potential Loss</span>
                      <CurrencyDisplay value={Math.abs(positionDetails.potentialLoss)} className="text-danger font-medium justify-end" inrContainerClassName="flex-col items-end"/>
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
                    rows={3}
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
                      onChange={(e) => setScreenshotFile(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                    />
                    {!screenshotFile ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex justify-center items-center gap-2 px-4 py-6 border-2 border-border border-dashed rounded-lg text-text-secondary hover:border-primary hover:text-primary transition-colors"
                      >
                        <UploadCloud className="w-5 h-5" />
                        <span>Click to upload a screenshot</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-background-light rounded-lg">
                        <span className="text-sm text-text-primary truncate">{screenshotFile.name}</span>
                        <button type="button" onClick={() => setScreenshotFile(null)} className="p-1 text-danger hover:bg-danger/10 rounded-full">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-border flex justify-end space-x-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="secondary-button px-5 py-2.5">Cancel</button>
            <button type="submit" disabled={!isValid || isSubmitting} className="primary-button px-5 py-2.5 flex items-center gap-2">
              {loading && <LoadingSpinner size="sm" />}
              Add Trade
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
