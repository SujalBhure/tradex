import React from 'react';

export const TradingCapitalCardSkeleton: React.FC = () => {
  return (
    <div className="glass-card p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-background-light rounded-xl shimmer" />
          <div>
            <div className="h-4 w-24 bg-background-light rounded shimmer mb-2" />
            <div className="h-3 w-32 bg-background-light rounded shimmer" />
          </div>
        </div>
        <div className="w-8 h-8 bg-background-light rounded-lg shimmer" />
      </div>
      <div className="text-center h-24 flex items-center justify-center">
        <div className="h-12 w-48 bg-background-light rounded-lg shimmer mx-auto" />
      </div>
    </div>
  );
};
