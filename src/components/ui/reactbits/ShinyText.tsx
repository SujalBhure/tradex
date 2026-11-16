import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  shimmerColor?: string;
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 3.5,
  className = '',
  shimmerColor = 'rgba(255, 255, 255, 0.85)',
}) => {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`inline-block bg-clip-text text-transparent relative ${className}`}
      style={{
        backgroundImage: `linear-gradient(120deg, currentColor 35%, ${shimmerColor} 50%, currentColor 65%)`,
        backgroundSize: '250% 100%',
        WebkitBackgroundClip: 'text',
        animation: disabled ? 'none' : `tradex-shiny-sweep ${animationDuration} ease-in-out infinite`,
      }}
    >
      {text}
      <style>{`
        @keyframes tradex-shiny-sweep {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }
      `}</style>
    </span>
  );
};

export default ShinyText;
