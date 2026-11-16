export type MarketType = 'crypto';

export const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XAUTUSD', 'SILVER'] as const;

export const getSymbolsForMarket = (_market?: MarketType): string[] => [...CRYPTO_SYMBOLS];

export const isSymbolInMarket = (_symbol: string, _market?: MarketType): boolean => true;
