import React from 'react';

const MetricCardSkeleton = () => (
  <div className="glass-card p-6 text-center">
    <div className="flex items-center justify-center mb-4">
      <div className="w-12 h-12 rounded-xl shimmer bg-background-light" />
    </div>
    <div className="h-4 w-20 bg-background-light rounded shimmer mx-auto mb-2" />
    <div className="h-8 w-28 bg-background-light rounded shimmer mx-auto" />
  </div>
);

export const MetricsGridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <MetricCardSkeleton key={index} />
      ))}
    </div>
  );
};
