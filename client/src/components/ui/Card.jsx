import React from 'react';

const Card = ({
  children,
  header,
  footer,
  className = '',
  padding = 'p-6',
  hover = true,
  glow = false,
  onClick,
}) => {
  const hoverStyles = hover ? 'hover:-translate-y-1 hover:shadow-lg hover:border-border-hover transition-all duration-300' : '';
  const glowStyles = glow ? 'hover:shadow-[0_0_20px_var(--color-accent-glow)]' : '';
  const cursorStyles = onClick ? 'cursor-pointer' : '';

  return (
    <div 
      className={`glass-card flex flex-col ${hoverStyles} ${glowStyles} ${cursorStyles} ${className}`}
      onClick={onClick}
    >
      {header && (
        <div className={`border-b border-border/50 px-6 py-4 flex items-center justify-between`}>
          {header}
        </div>
      )}
      
      <div className={`flex-grow ${padding}`}>
        {children}
      </div>
      
      {footer && (
        <div className={`border-t border-border/50 px-6 py-4 bg-bg-secondary/30 rounded-b-2xl`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
