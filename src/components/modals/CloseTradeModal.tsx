import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { XCircle, X } from 'lucide-react';
import { Trade } from '../../types/trading';
import toast from 'react-hot-toast';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { FormInput } from '../ui/FormInput';
import { LOT_SIZES, getLotSize } from '../../utils/tradingCalculations';

interface CloseTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClose: (tradeId: string, exitPrice: number, partialCloseData?: { lots: number; quantity: number }) => void;
  trade: Trade;
}

type CloseTradeFormData = {
  exitPrice: string;
  lotsToClose: string;
  quantityToClose: string;
};

export const CloseTradeModal: React.FC<CloseTradeModalProps> = ({ isOpen, onClose, onConfirmClose, trade }) => {
  const [isPartialClose, setIsPartialClose] = useState(false);
  const lastEditedField = useRef<'lots' | 'quantity' | null>(null);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<CloseTradeFormData>({
    defaultValues: { exitPrice: '', lotsToClose: '', quantityToClose: '' }
  });

  useEffect(() => {
    if (isOpen) {
      reset({ exitPrice: '', lotsToClose: '', quantityToClose: '' });
      setIsPartialClose(false);
    }
  }, [isOpen, reset]);

  const allWatchedFields = watch();

  useEffect(() => {
    if (!isPartialClose) return;

    const { lotsToClose, quantityToClose } = allWatchedFields;
    const lotSize = getLotSize(trade.symbol);

    if (lastEditedField.current === 'lots') {
      const lotsNum = parseFloat(lotsToClose || '0');
      const newQuantity = lotsNum * lotSize;
      setValue('quantityToClose', newQuantity.toString(), { shouldValidate: true });
    } else if (lastEditedField.current === 'quantity') {
      const quantityNum = parseFloat(quantityToClose || '0');
      if (lotSize > 0) {
        const newLots = quantityNum / lotSize;
        setValue('lotsToClose', newLots.toString(), { shouldValidate: true });
      }
    }
  }, [isPartialClose, allWatchedFields.lotsToClose, allWatchedFields.quantityToClose, setValue, trade.symbol]);

  if (!isOpen) return null;

  const onSubmit = (data: CloseTradeFormData) => {
    const exitPriceNum = parseFloat(data.exitPrice);
    if (isNaN(exitPriceNum) || exitPriceNum <= 0) {
      toast.error('Please enter a valid exit price.');
      return;
    }

    if (isPartialClose) {
      const lotsToClose = parseFloat(data.lotsToClose);
      const quantityToClose = parseFloat(data.quantityToClose);
      if (isNaN(lotsToClose) || lotsToClose <= 0 || lotsToClose > trade.lots) {
        toast.error('Invalid lots to close. Must be positive and less than the open position.');
        return;
      }
      onConfirmClose(trade.id, exitPriceNum, { lots: lotsToClose, quantity: quantityToClose });
      toast.success('Trade partially closed!');
    } else {
      onConfirmClose(trade.id, exitPriceNum);
      toast.success('Trade fully closed!');
    }
  };
  
  const handleFocus = useCallback((fieldName: 'lots' | 'quantity') => {
    lastEditedField.current = fieldName;
  }, []);

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
      <motion.div
        className="modal-content p-8 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">Close Trade</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        
        <p className="text-text-secondary mb-4">
          You are closing a <strong>{trade.side.toUpperCase()}</strong> position for <strong>{trade.symbol}</strong>.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <ToggleSwitch label="Partial Close" enabled={isPartialClose} setEnabled={setIsPartialClose} />
          
          <FormInput
            name="exitPrice"
            label="Exit Price"
            control={control}
            errors={errors}
            rules={{ required: 'Exit price is required', min: { value: 0.00000001, message: 'Price must be positive' } }}
            placeholder="Enter the final exit price"
          />

          <AnimatePresence>
            {isPartialClose && (
              <motion.div
                className="space-y-4"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-xs text-text-muted">Enter how much of the position you want to close.</p>
                <FormInput
                  name="lotsToClose"
                  label="Lots to Close"
                  control={control}
                  errors={errors}
                  onFocus={() => handleFocus('lots')}
                  rules={{ required: 'This field is required', max: { value: trade.lots, message: `Max: ${trade.lots}` } }}
                  placeholder={`Max ${trade.lots}`}
                />
                <FormInput
                  name="quantityToClose"
                  label="Quantity to Close"
                  control={control}
                  errors={errors}
                  onFocus={() => handleFocus('quantity')}
                  rules={{ required: 'This field is required', max: { value: trade.quantity, message: `Max: ${trade.quantity}` } }}
                  placeholder={`Max ${trade.quantity}`}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="secondary-button px-5 py-2.5">
              Cancel
            </button>
            <button type="submit" className="primary-button px-5 py-2.5">
              Confirm & Close
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
