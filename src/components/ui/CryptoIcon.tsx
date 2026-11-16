import React from 'react';
import { CryptoLogo } from './CryptoLogo';

interface CryptoIconProps {
  symbol: string;
  size?: number;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({ symbol, size = 24 }) => {
  return <CryptoLogo symbol={symbol} size={size} />;
};
