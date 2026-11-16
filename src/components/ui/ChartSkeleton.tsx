import React from 'react';

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="glass-card p-6">
      <div className="h-8 w-48 bg-background-light rounded shimmer mb-6" />
      <div className="h-72 bg-background-light rounded-lg shimmer" />
    </div>
  );
};
