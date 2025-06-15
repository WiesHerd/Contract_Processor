import React from 'react';

export const Logo = ({ className = '', size = 'default' }: { className?: string; size?: 'small' | 'default' | 'large' }) => {
  const dimensions = {
    small: 'w-6 h-6',
    default: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size === 'small' ? '24' : size === 'large' ? '48' : '32'}
        height={size === 'small' ? '24' : size === 'large' ? '48' : '32'}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`text-primary ${dimensions[size]}`}
      >
        <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity="0.1"/>
        <path
          d="M16 2L4 9V23L16 30L28 23V9L16 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 16L16 30"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 16L28 23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 16L4 23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`font-bold text-gray-900 ${
        size === 'small' ? 'text-lg' : 
        size === 'large' ? 'text-2xl' : 
        'text-xl'
      }`}>
        ContractEngine
      </span>
    </div>
  );
}; 