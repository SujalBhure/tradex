import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, DollarSign, ShieldCheck, BarChart } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { CryptoSelect } from '../ui/CryptoSelect';
import { CustomSelect } from '../ui/CustomSelect';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { 
  calculateMargin,
  calculatePositionSize,
  formatCurrency,
  formatNumber,
  calculateFees,
} from '../../utils/tradingCalculations';
import { MarketType, getSymbolsForMarket } from '../../utils/market';
import { TrueFocus, ShinyText } from '../ui/reactbits';

interface PositionCalculatorProps {
  initialCapital: number;
  market: MarketType;
}

type Inputs = {
  totalCapital: string;
  riskAmount: string;
  riskPercent: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: string;
  stopLoss: string;
  target: string;
  leverage: number;
};

const LEVERAGE_OPTIONS = [25, 50, 100, 200].map(l => ({ value: l, label: `${l}x` }));
const SIDE_OPTIONS = [
  { value: 'long', label: 'Long' },
  { value: 'short', label: 'Short' },
];


const CalculatorInput = ({ label, name, value, onChange, type = 'number', adornment }: any) => (
  <div>
    <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
    <div className="relative">
      {adornment && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{adornment}</span>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        step="any"
        placeholder="0.00"
        className={`w-full py-2.5 bg-[#1C1C2E] border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-primary transition-all duration-200 ${adornment ? 'pl-8' : 'pl-4'}`}
      />
    </div>
  </div>
);

export const PositionCalculator: React.FC<PositionCalculatorProps> = ({ initialCapital, market }) => {
  const symbols = useMemo(() => getSymbolsForMarket(market), [market]);
  const currencyAdornment = '$';
  const [inputs, setInputs] = useState<Inputs>({
    totalCapital: initialCapital > 0 ? initialCapital.toString() : '',
    riskAmount: '',
    riskPercent: '',
    symbol: symbols[0] || 'BTC',
    side: 'long',
    entryPrice: '',
    stopLoss: '',
    target: '',
    leverage: 25,
  });

  useEffect(() => {
    if (initialCapital > 0) {
      setInputs(prev => ({...prev, totalCapital: initialCapital.toString()}));
    }
  }, [initialCapital]);

  useEffect(() => {
    setInputs((prev) => {
      if (symbols.includes(prev.symbol)) return prev;
      return { ...prev, symbol: symbols[0] || 'BTC' };
    });
  }, [symbols]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setInputs(prev => {
      const newInputs = { ...prev, [name]: value };
      const totalCapital = parseFloat(newInputs.totalCapital) || 0;

      if (name === 'riskAmount') {
        const riskAmount = parseFloat(value) || 0;
        if (totalCapital > 0) {
          const newRiskPercent = (riskAmount / totalCapital) * 100;
          newInputs.riskPercent = isNaN(newRiskPercent) ? '' : newRiskPercent.toFixed(2);
        } else {
          newInputs.riskPercent = '';
        }
      } else if (name === 'riskPercent') {
        const riskPercent = parseFloat(value) || 0;
        const newRiskAmount = (totalCapital * riskPercent) / 100;
        newInputs.riskAmount = isNaN(newRiskAmount) ? '' : newRiskAmount.toFixed(2);
      } else if (name === 'totalCapital' && totalCapital > 0) {
        const riskAmount = parseFloat(newInputs.riskAmount) || 0;
        const newRiskPercent = (riskAmount / totalCapital) * 100;
        newInputs.riskPercent = isNaN(newRiskPercent) ? '' : newRiskPercent.toFixed(2);
      }
      
      return newInputs;
    });
  }, []);

  const handleSymbolChange = (symbol: string) => {
    setInputs(prev => ({ ...prev, symbol }));
  };
  
  const handleLeverageChange = (leverage: number) => {
      setInputs(prev => ({ ...prev, leverage }));
  };

  const handleSideChange = (side: string | number) => {
    if (side === 'long' || side === 'short') {
      setInputs(prev => ({ ...prev, side: side as 'long' | 'short' }));
    }
  };

  const calculations = useMemo(() => {
    const { totalCapital, riskPercent, entryPrice, stopLoss, target, symbol, side, leverage } = inputs;

    const totalCapitalNum = parseFloat(totalCapital) || 0;
    const riskPercentNum = parseFloat(riskPercent) || 0;
    const entryPriceNum = parseFloat(entryPrice) || 0;
    const stopLossNum = parseFloat(stopLoss) || 0;
    const targetNum = parseFloat(target) || 0;
    const leverageNum = parseInt(leverage.toString(), 10) || 1;

    if (totalCapitalNum <= 0 || riskPercentNum <= 0 || entryPriceNum <= 0 || stopLossNum <= 0 || Math.abs(entryPriceNum - stopLossNum) === 0) {
      return { lots: 0, quantity: 0, margin: 0, potentialProfit: 0, potentialLoss: 0, riskRewardRatio: 0, fees: 0 };
    }

    const { lots, quantity, riskAmount } = calculatePositionSize(
      totalCapitalNum,
      riskPercentNum,
      entryPriceNum,
      stopLossNum,
      symbol
    );
    
    const margin = calculateMargin(quantity, entryPriceNum, leverageNum);
    
    let potentialProfit = 0;
    if (targetNum > 0) {
        if (side === 'long') {
            potentialProfit = (targetNum - entryPriceNum) * quantity;
        } else { // short
            potentialProfit = (entryPriceNum - targetNum) * quantity;
        }
    }
    
    const potentialLoss = riskAmount;
    const riskRewardRatio = potentialLoss > 0 ? Math.abs(potentialProfit / potentialLoss) : 0;
    const fees = calculateFees(quantity, entryPriceNum);
    
    return { lots, quantity, margin, potentialProfit, potentialLoss, riskRewardRatio, fees };
  }, [inputs]);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <Calculator className="w-5 h-5 text-black" />
          </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Position Calculator</h1>
              <p className="text-xs text-text-muted">Smart Risk & Margin Allocation Engine</p>
            </div>
        </div>

        <div className="hidden sm:block">
          <TrueFocus
            sentence="Calculate. Execute. Protect."
            className="text-xs font-semibold tracking-wider text-text-secondary"
            borderColor="#00FF88"
            glowColor="rgba(0, 255, 136, 0.3)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          <GlassCard className="!p-4 sm:!p-5">
            <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Account & Risk
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <CalculatorInput label="Total Capital" name="totalCapital" value={inputs.totalCapital} onChange={handleInputChange} adornment={currencyAdornment} />
              <CalculatorInput label="Risk Amount" name="riskAmount" value={inputs.riskAmount} onChange={handleInputChange} adornment={currencyAdornment} />
              <CalculatorInput label="Risk Percent" name="riskPercent" value={inputs.riskPercent} onChange={handleInputChange} adornment="%" />
            </div>
          </GlassCard>
          <GlassCard className="!p-4 sm:!p-5">
            <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <BarChart className="w-5 h-5 text-primary" />
              Market Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
               <div>
                 <CryptoSelect
                    label="Symbol"
                    options={symbols}
                    value={inputs.symbol}
                    onChange={handleSymbolChange}
                  />
              </div>
              <div>
                <CustomSelect
                    label="Side"
                    name="side"
                    options={SIDE_OPTIONS}
                    value={inputs.side}
                    onChange={handleSideChange}
                />
              </div>
              <div className="md:col-span-2">
                <CustomSelect
                    label="Leverage"
                    name="leverage"
                    options={LEVERAGE_OPTIONS}
                    value={inputs.leverage}
                    onChange={handleLeverageChange}
                />
              </div>
              <CalculatorInput label="Entry Price" name="entryPrice" value={inputs.entryPrice} onChange={handleInputChange} adornment={currencyAdornment} />
              <CalculatorInput label="Stop Loss" name="stopLoss" value={inputs.stopLoss} onChange={handleInputChange} adornment={currencyAdornment} />
              <div className="md:col-span-2">
                <CalculatorInput label="Target (Optional)" name="target" value={inputs.target} onChange={handleInputChange} adornment={currencyAdornment} />
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-1">
          <GlassCard className="!p-4 sm:!p-5 sticky top-24">
            <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-3 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-primary" />
              Position Results
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-2">
                <span className="text-text-secondary text-sm shrink-0">Lots</span>
                <span className="text-text-primary font-medium">{formatNumber(calculations.lots, 4)}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-text-secondary text-sm shrink-0">Quantity</span>
                <span className="text-text-primary font-medium">{formatNumber(calculations.quantity, 4)}</span>
              </div>
              <hr className="border-border/50" />
              <div className="flex justify-between items-center gap-2">
                <span className="text-text-secondary text-sm shrink-0">Total Margin (Inc. Fees)</span>
                <CurrencyDisplay value={calculations.margin + calculations.fees} className="text-text-primary font-bold text-base sm:text-lg justify-end" inrContainerClassName="flex-col items-end" />
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-text-secondary text-sm shrink-0">Potential Profit</span>
                <CurrencyDisplay value={calculations.potentialProfit} className="text-success font-medium justify-end" inrContainerClassName="flex-col items-end" />
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-text-secondary text-sm shrink-0">Potential Loss</span>
                <CurrencyDisplay value={calculations.potentialLoss} className="text-danger font-medium justify-end" inrContainerClassName="flex-col items-end" />
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-text-secondary text-sm shrink-0">Risk/Reward Ratio</span>
                <span className="text-text-primary font-medium">1 : {calculations.riskRewardRatio.toFixed(2)}</span>
              </div>
            </div>
             <div className="mt-6 p-3 bg-background-light rounded-lg">
              <p className="text-xs text-gray-400 leading-relaxed">
                Position size is calculated based on your risk parameters to ensure you don't lose more than your specified risk amount.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
};
