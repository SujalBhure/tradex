import React from 'react';

interface CryptoLogoProps {
  symbol: string;
  size?: number;
  className?: string;
}

export const CryptoLogo: React.FC<CryptoLogoProps> = ({ symbol, size = 24, className }) => {
  const renderLogo = () => {
    const props = { width: size, height: size, className };
    const sym = (symbol || '').toUpperCase();

    if (sym.includes('BTC')) {
      return (
        <svg {...props} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#F7931A"/>
          <path d="M23.189 14.02C23.503 11.924 21.906 10.797 19.724 10.045L20.432 7.205L18.704 6.775L18.014 9.54C17.56 9.426 17.094 9.312 16.629 9.2L17.324 6.417L15.596 5.987L14.888 8.826C14.512 8.74 14.142 8.656 13.784 8.576L13.786 8.567L11.402 8.002L10.942 9.848C10.942 9.848 12.225 10.142 12.198 10.154C12.898 10.329 13.024 10.792 13.003 11.158L12.197 14.393C12.245 14.405 12.305 14.435 12.375 14.492L12.192 14.447L11.062 18.979C10.976 19.191 10.759 19.51 10.269 19.39C10.287 19.415 8.994 19.077 8.994 19.077L8.064 22.939L10.314 23.5C10.732 23.605 11.142 23.715 11.549 23.818L10.834 26.69L12.561 27.12L13.269 24.28C13.741 24.407 14.201 24.525 14.656 24.642L13.95 27.47L15.678 27.9L16.393 25.034C19.341 25.592 21.557 25.367 22.49 23.037C23.242 20.891 22.45 19.652 20.9 18.86C22.03 18.6 22.88 17.857 23.107 16.319L23.189 14.02Z" fill="white"/>
        </svg>
      );
    }
    if (sym.includes('ETH')) {
      return (
        <svg {...props} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 3L15.8667 3.56667V18.9333L16 19.0667L23.3333 14.8667L16 3Z" fill="#C1C8F5"/>
            <path d="M16 3L8.66667 14.8667L16 19.0667V3Z" fill="#FFFFFF"/>
            <path d="M16 20.3667L15.9133 20.48V25.52L16 25.6667L23.3333 16.1667L16 20.3667Z" fill="#C1C8F5"/>
            <path d="M16 25.6667V20.3667L8.66667 16.1667L16 25.6667Z" fill="#FFFFFF"/>
            <path d="M16 19.0667L23.3333 14.8667L16 10.6667V19.0667Z" fill="#8992D5"/>
            <path d="M8.66667 14.8667L16 19.0667V10.6667L8.66667 14.8667Z" fill="#C1C8F5"/>
        </svg>
      );
    }
    if (sym.includes('SOL')) {
      return (
        <svg {...props} viewBox="0 0 24 24" fill="none">
            <defs>
                <linearGradient id="solanaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9945FF"/>
                <stop offset="100%" stopColor="#14F195"/>
                </linearGradient>
            </defs>
            <path d="M4 18h12l4-4H8z" fill="url(#solanaGradient)"/>
            <path d="M8 14l-4-4h12l4 4" fill="url(#solanaGradient)"/>
            <path d="M16 10l4-4H8l-4 4" fill="url(#solanaGradient)"/>
        </svg>
      );
    }
    if (sym.includes('SILVER') || sym.includes('XAG')) {
      return (
        <svg {...props} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="256" cy="256" r="240" fill="#C5C6D0"/>

          <circle cx="256" cy="256" r="238" stroke="#A0A1AC" strokeWidth="4" strokeOpacity="0.4"/>

          <path d="M220 165H292L320 225H192L220 165Z" fill="#F5F5F7" stroke="#D1D1D6" strokeWidth="1"/>

          <path d="M148 250H220L248 310H120L148 250Z" fill="#F5F5F7" stroke="#D1D1D6" strokeWidth="1"/>

          <path d="M292 250H364L392 310H264L292 250Z" fill="#F5F5F7" stroke="#D1D1D6" strokeWidth="1"/>
        </svg>
      );
    }
    if (sym.includes('XAUT') || sym.includes('GOLD') || sym.includes('XAU')) {
      return (
        <svg {...props} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="256" cy="256" r="240" fill="#F1B000"/>

          <circle cx="256" cy="256" r="238" stroke="#D49A00" strokeWidth="4" strokeOpacity="0.3"/>

          <path d="M220 165H292L320 225H192L220 165Z" fill="white" stroke="#E0E0E0" strokeWidth="1" strokeLinejoin="round"/>

          <path d="M148 250H220L248 310H120L148 250Z" fill="white" stroke="#E0E0E0" strokeWidth="1" strokeLinejoin="round"/>

          <path d="M292 250H364L392 310H264L292 250Z" fill="white" stroke="#E0E0E0" strokeWidth="1" strokeLinejoin="round"/>

          <defs>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.2"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>
      );
    }
    const cleanLabel = sym.replace(/[\/\-_]/g, '').slice(0, 3) || '?';
    return (
      <div
        className="rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-[10px] tracking-tight uppercase"
        style={{ width: size, height: size }}
      >
        {cleanLabel}
      </div>
    );
  };

  return renderLogo();
};
