import React from 'react';

const LoadingSpinner = ({ size = 'md', fullScreen = false, text }) => {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3 animate-fade-in">
      <div className="relative">
        {/* Outer glowing ring */}
        <div className={`absolute inset-0 rounded-full border-2 border-transparent border-t-accent-primary border-r-accent-secondary blur-sm animate-spin ${sizes[size]}`} />
        
        {/* Inner sharp ring */}
        <div className={`rounded-full border-2 border-border border-t-accent-primary border-r-accent-secondary animate-spin ${sizes[size]}`} />
      </div>
      {text && <p className="text-text-secondary text-sm font-medium animate-pulse">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-md z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export const Skeleton = ({ className = '' }) => (
  <div className={`bg-bg-secondary/50 rounded-lg animate-pulse ${className}`} />
);

export default LoadingSpinner;
