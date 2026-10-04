import React, { useEffect } from 'react';
import { HiXMark } from 'react-icons/hi2';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className = ''
}) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] h-[95vh]'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`relative w-full ${sizes[size]} glass-card shadow-xl shadow-black/5 flex flex-col max-h-[90vh] animate-slide-up ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          {title && (
            <h3 className="text-xl font-display font-semibold text-text-primary">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <HiXMark className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
