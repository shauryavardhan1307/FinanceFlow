import React from 'react';
import { HiOutlineArrowPath } from 'react-icons/hi2';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary';
  
  const variants = {
    primary: 'bg-accent-primary text-white shadow-md hover:bg-accent-secondary hover:-translate-y-0.5 focus:ring-accent-primary border border-transparent',
    secondary: 'bg-bg-secondary text-text-primary border border-border hover:border-accent-primary hover:bg-bg-hover focus:ring-accent-primary',
    danger: 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger hover:text-white hover:shadow-md focus:ring-danger',
    success: 'bg-success/10 text-success border border-success/20 hover:bg-success hover:text-white hover:shadow-md focus:ring-success',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover focus:ring-border border border-transparent'
  };

  const sizes = {
    sm: 'text-sm px-3 py-1.5 gap-1.5',
    md: 'text-base px-4 py-2 gap-2',
    lg: 'text-lg px-6 py-3 gap-2.5'
  };

  const widthStyle = fullWidth ? 'w-full' : '';
  const disabledStyle = (disabled || isLoading) ? 'opacity-60 cursor-not-allowed transform-none hover:transform-none hover:shadow-none' : 'cursor-pointer';

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${disabledStyle} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading && <HiOutlineArrowPath className="animate-spin -ml-1 mr-2" />}
      {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
