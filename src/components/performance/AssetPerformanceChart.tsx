import React, { useMemo } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Trade } from '../../types/trading';
import { formatCurrency } from '../../utils/tradingCalculations';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { motion } from 'framer-motion';
import { CryptoLogo } from '../ui/CryptoLogo';
import { BarChart2 } from 'lucide-react';

interface AssetPerformanceChartProps {
  trades: Trade[];
}

export const AssetPerformanceChart: React.FC<AssetPerformanceChartProps> = ({ trades }) => {
  const assetPnl = useMemo(() => {
    const pnlByAsset: { [key: string]: number } = {};
    trades.forEach(trade => {
      if (trade.status === 'closed') {
        pnlByAsset[trade.symbol] = (pnlByAsset[trade.symbol] || 0) + (trade.netPnl || 0);
      }
    });
    
    const totalPnl = Object.values(pnlByAsset).reduce((sum, pnl) => sum + Math.abs(pnl), 0);
    
    return Object.entries(pnlByAsset)
      .map(([symbol, pnl]) => ({
        symbol,
        pnl,
        percentage: totalPnl > 0 ? (Math.abs(pnl) / totalPnl) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const getBarColor = (symbol: string) => {
    if (symbol.includes('BTC')) return 'bg-[#F7931A]';
    if (symbol.includes('ETH')) return 'bg-[#627EEA]';
    if (symbol.includes('SOL')) return 'solana-gradient';
    return 'bg-gray-500';
  };

  return (
    <GlassCard>
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <BarChart2 className="text-primary" />
        Asset Performance
      </h3>
      <div className="space-y-4">
        {assetPnl.length > 0 ? assetPnl.map((asset, index) => (
          <div key={asset.symbol} className="text-sm">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <CryptoLogo symbol={asset.symbol} size={16} />
                <span className="font-medium text-text-primary">{asset.symbol}</span>
              </div>
              <CurrencyDisplay value={asset.pnl} className={`font-semibold justify-end ${asset.pnl >= 0 ? 'text-success' : 'text-danger'}`} />
            </div>
            <div className="w-full bg-background-light rounded-full h-2.5">
                <motion.div
                    className={`h-2.5 rounded-full ${getBarColor(asset.symbol)}`}
                    style={{ 
                        width: `${asset.percentage}%`,
                        background: asset.symbol.includes('SOL') ? 'linear-gradient(to right, #9945FF, #14F195)' : undefined
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${asset.percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                />
            </div>
          </div>
        )) : (
            <p className="text-sm text-text-muted text-center py-8">No closed trades to analyze.</p>
        )}
      </div>
       <style>{`.solana-gradient { background: linear-gradient(to right, #9945FF, #14F195); }`}</style>
    </GlassCard>
  );
};
