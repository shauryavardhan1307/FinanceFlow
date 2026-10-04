import React, { forwardRef } from 'react';
import { HiExclamationCircle } from 'react-icons/hi2';

const Input = forwardRef(({
  label,
  error,
  iconPrefix,
  iconSuffix,
  variant = 'input',
  options = [],
  className = '',
  fullWidth = true,
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  
  const baseWrapperStyles = 'relative flex items-center w-full transition-all duration-300';
  const baseInputStyles = 'w-full bg-bg-input backdrop-blur-md border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all duration-300';
  
  const errorStyles = error 
    ? 'border-danger focus:ring-danger/50 focus:border-danger' 
    : 'border-border focus:ring-accent-primary/50 focus:border-accent-primary hover:border-border-hover';

  const paddingStyles = `${iconPrefix ? 'pl-10' : 'pl-4'} ${iconSuffix ? 'pr-10' : 'pr-4'} py-2.5`;
  const widthStyle = fullWidth ? 'w-full' : '';

  const renderInput = () => {
    if (variant === 'textarea') {
      return (
        <textarea
          ref={ref}
          id={inputId}
          className={`${baseInputStyles} ${errorStyles} ${paddingStyles} min-h-[100px] resize-y ${className}`}
          {...props}
        />
      );
    }
    
    if (variant === 'select') {
      return (
        <select
          ref={ref}
          id={inputId}
          className={`${baseInputStyles} ${errorStyles} ${paddingStyles} appearance-none ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-bg-secondary text-text-primary">
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={ref}
        id={inputId}
        className={`${baseInputStyles} ${errorStyles} ${paddingStyles} ${className}`}
        {...props}
      />
    );
  };

  return (
    <div className={`flex flex-col gap-1.5 ${widthStyle} animate-fade-in`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary ml-1">
          {label}
        </label>
      )}
      
      <div className={baseWrapperStyles}>
        {iconPrefix && (
          <div className="absolute left-3 text-text-muted flex items-center justify-center">
            {iconPrefix}
          </div>
        )}
        
        {renderInput()}
        
        {iconSuffix && !error && (
          <div className="absolute right-3 text-text-muted flex items-center justify-center">
            {iconSuffix}
          </div>
        )}

        {error && (
          <div className="absolute right-3 text-danger flex items-center justify-center">
            <HiExclamationCircle className="w-5 h-5" />
          </div>
        )}
      </div>
      
      {error && (
        <span className="text-xs text-danger ml-1 animate-slide-down">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
