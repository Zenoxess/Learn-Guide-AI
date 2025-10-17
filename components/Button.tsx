import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  leftIcon,
  rightIcon,
  ...props
}) => {
  const { theme } = useTheme();

  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all duration-200 disabled:cursor-not-allowed';

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-8 py-3 text-lg',
  };
  
  const variantClasses: Record<ButtonVariant, string> = {
    primary: `${theme['bg-primary-600']} text-white ${theme['hover:bg-primary-700']} ${theme['focus:ring-primary-400']} disabled:bg-slate-400 dark:disabled:bg-slate-600 shadow-sm`,
    secondary: 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-60 focus:ring-slate-400',
    ghost: `${theme['hover:bg-primary-100_dark-800']} text-slate-600 dark:text-slate-300 ${theme['hover:text-primary-600_dark-300']} dark:hover:text-slate-100 focus:ring-slate-400`,
  };

  const finalClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  
  const iconSizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
  };

  return (
    <button className={finalClasses} {...props}>
      {leftIcon && <span className={`mr-2 -ml-1 ${iconSizeClasses[size]}`}>{leftIcon}</span>}
      {children}
      {rightIcon && <span className={`ml-2 -mr-1 ${iconSizeClasses[size]}`}>{rightIcon}</span>}
    </button>
  );
};