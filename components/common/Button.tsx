import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', ...props }) => {
  const baseClasses = "inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200";
  
  const variantClasses = {
    primary: 'text-white bg-gradient-to-r from-primary to-secondary hover:opacity-90 focus:ring-primary',
    secondary: 'text-white bg-accent hover:bg-green-600 focus:ring-accent',
    outline: 'text-primary bg-transparent border-primary hover:bg-primary/10 focus:ring-primary',
  };

  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};