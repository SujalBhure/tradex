import React, { createContext, useContext } from 'react';
import { MarketType } from '../utils/market';

interface ExchangeRateContextValue {
  usdToInrRate: number;
  market: MarketType;
}

const ExchangeRateContext = createContext<ExchangeRateContextValue>({
  usdToInrRate: 85.7,
  market: 'crypto',
});

export const ExchangeRateProvider: React.FC<{
  usdToInrRate: number;
  market: MarketType;
  children: React.ReactNode;
}> = ({ usdToInrRate, market, children }) => {
  return (
    <ExchangeRateContext.Provider value={{ usdToInrRate, market }}>
      {children}
    </ExchangeRateContext.Provider>
  );
};

export const useExchangeRate = (): ExchangeRateContextValue => {
  return useContext(ExchangeRateContext);
};
