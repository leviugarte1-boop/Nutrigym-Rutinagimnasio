import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-surface rounded-xl shadow p-4 sm:p-6 border-2 border-primary/10 ${className}`}>
      {children}
    </div>
  );
};