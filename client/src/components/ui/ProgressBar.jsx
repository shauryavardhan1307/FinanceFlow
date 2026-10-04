import React from 'react';

const ProgressBar = ({
  value,
  max = 100,
  size = 'md',
  showLabel = false,
  labelPrefix = '',
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  let colorClass = 'bg-success';
  let glowClass = 'shadow-[0_0_10px_rgba(0,206,201,0.5)]';
  
  if (percentage >= 85) {
    colorClass = 'bg-danger';
    glowClass = 'shadow-[0_0_15px_rgba(255,107,107,0.7)] animate-pulse-glow';
  } else if (percentage >= 60) {
    colorClass = 'bg-warning';
    glowClass = 'shadow-[0_0_10px_rgba(254,202,87,0.5)]';
  }

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-xs font-medium text-text-secondary">
            {labelPrefix}
          </span>
          <span className="text-xs font-bold text-text-primary">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-bg-secondary rounded-full overflow-hidden border border-border/30 ${sizes[size]}`}>
        <div
          className={`h-full ${colorClass} ${glowClass} rounded-full animate-progress-fill transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
