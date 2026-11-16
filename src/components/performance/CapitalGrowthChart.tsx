import React, { useCallback, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '../ui/GlassCard';
import { Trade } from '../../types/trading';
import { formatCurrency } from '../../utils/tradingCalculations';
import { PieChart, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

type TimeRange = '7D' | '1M' | '6M' | '1Y' | 'ALL';

interface CapitalGrowthChartProps {
  trades: Trade[];
  initialCapital: number;
}

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-sm">
        <p className="label text-text-secondary">{`${label}`}</p>
        <p className="intro text-text-primary font-bold">{`Capital: ${formatter(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};

export const CapitalGrowthChart: React.FC<CapitalGrowthChartProps> = ({ trades, initialCapital }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');

  const formatByMarket = useCallback(
    (value: number, decimals = 0) => formatCurrency(value, decimals),
    []
  );

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;
    
    switch (timeRange) {
      case '7D':
        startDate = new Date(new Date().setDate(now.getDate() - 7));
        break;
      case '1M':
        startDate = new Date(new Date().setMonth(now.getMonth() - 1));
        break;
      case '6M':
        startDate = new Date(new Date().setMonth(now.getMonth() - 6));
        break;
      case '1Y':
        startDate = new Date(new Date().setFullYear(now.getFullYear() - 1));
        break;
      case 'ALL':
      default:
        startDate = null;
        break;
    }

    const filteredTrades = trades.filter(t => 
      t.status === 'closed' && t.closedAt && (!startDate || new Date(t.closedAt) >= startDate)
    );

    let startingCapitalForRange = initialCapital;
    trades
      .filter(t => t.status === 'closed' && t.closedAt && startDate && new Date(t.closedAt) < startDate)
      .sort((a, b) => new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime())
      .forEach(trade => {
        startingCapitalForRange += trade.netPnl || 0;
      });

    const sortedTrades = filteredTrades.sort((a, b) => new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime());

    let runningCapital = startingCapitalForRange;
    const data = [{ 
      date: startDate ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (trades.length > 0 ? new Date(trades[trades.length-1].openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Start'), 
      capital: startingCapitalForRange 
    }];

    sortedTrades.forEach(trade => {
      runningCapital += trade.netPnl || 0;
      data.push({
        date: new Date(trade.closedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        capital: runningCapital,
      });
    });

    if (data.length === 1) {
        data.push({
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            capital: data[0].capital
        });
    }

    return data;
  }, [trades, initialCapital, timeRange]);

  const timeRanges: TimeRange[] = ['7D', '1M', '6M', '1Y', 'ALL'];

  return (
    <GlassCard>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <TrendingUp className="text-primary" />
          Capital Growth
        </h3>
        <div className="flex items-center bg-background-light p-1 rounded-lg">
          {timeRanges.map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={clsx(
                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                timeRange === range
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-white/5'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      {chartData.length > 1 ? (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
              <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} interval="auto" />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={62} tickFormatter={(value) => formatByMarket(value as number, 0)} domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip content={<CustomTooltip formatter={(value: number) => formatByMarket(value, 2)} />} />
              <Area type="monotone" dataKey="capital" stroke="#00FF88" strokeWidth={2} fill="url(#colorCapital)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-72 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-background-card rounded-2xl flex items-center justify-center mb-4">
              <PieChart className="w-8 h-8 text-text-muted" />
          </div>
          <h4 className="text-lg font-semibold text-text-primary">Not Enough Data</h4>
          <p className="text-text-secondary max-w-sm">
            Close some trades in this time range to see your capital growth.
          </p>
        </div>
      )}
    </GlassCard>
  );
};
