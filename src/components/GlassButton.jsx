import { forwardRef } from 'react';

/**
 * Reusable Glass Button Component with iOS 16-18 Glassmorphism Style
 * 
 * @param {string} variant - 'primary' | 'outline' | 'fab'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} fullWidth - Make button full width
 */
const GlassButton = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  className = '',
  ...props 
}, ref) => {
  const baseClasses = 'font-semibold transition-all duration-300';
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-xl',
    md: 'px-6 py-3 text-base rounded-2xl',
    lg: 'px-8 py-4 text-lg rounded-2xl',
  };
  
  const variantClasses = {
    primary: 'glass-button',
    outline: 'glass-button-outline',
    fab: 'glass-fab',
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <button
      ref={ref}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

GlassButton.displayName = 'GlassButton';

export default GlassButton;

