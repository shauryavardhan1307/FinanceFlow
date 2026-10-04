import React from 'react';
import { HiXMark } from 'react-icons/hi2';

const Badge = ({
  children,
  color = 'primary',
  size = 'md',
  icon,
  onRemove,
  className = ''
}) => {
  const colors = {
    primary: 'bg-accent-primary/20 text-accent-secondary border border-accent-primary/30',
    secondary: 'bg-bg-secondary text-text-primary border border-border',
    success: 'bg-success/20 text-success border border-success/30',
    danger: 'bg-danger/20 text-danger border border-danger/30',
    warning: 'bg-warning/20 text-warning border border-warning/30'
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2'
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colors[color]} ${sizes[size]} ${className} animate-fade-in`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 -mr-1 rounded-full p-0.5 hover:bg-black/20 focus:outline-none transition-colors"
        >
          <HiXMark className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  );
};

export default Badge;
