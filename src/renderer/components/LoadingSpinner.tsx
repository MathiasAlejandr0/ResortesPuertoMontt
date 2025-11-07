import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export default function LoadingSpinner({ size = 'medium', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-16 h-16'
  };

  const borderSizeClasses = {
    small: 'border-2',
    medium: 'border-3',
    large: 'border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div 
        className={`${sizeClasses[size]} ${borderSizeClasses[size]} animate-spin rounded-full`} 
        style={{ 
          borderTopColor: '#dc2626',
          borderRightColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: 'transparent',
          borderWidth: size === 'large' ? '4px' : size === 'medium' ? '3px' : '2px'
        }}
      ></div>
      {text && (
        <p className="text-red-700 text-base font-semibold animate-pulse mt-2">{text}</p>
      )}
    </div>
  );
}
