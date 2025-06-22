import * as React from "react";
import { cn } from "@/lib/utils";

export interface LoadingSpinnerProps {
  /** Size variant - 'sm', 'md', 'lg', 'xl' or custom number in px */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Color variant - 'primary', 'secondary', 'white', 'gray' or custom CSS class */
  color?: 'primary' | 'secondary' | 'white' | 'gray' | string;
  /** Optional message to display below the spinner */
  message?: string;
  /** Accessible label for screen readers */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the spinner inline or as a full container */
  inline?: boolean;
}

/**
 * A reusable, accessible loading spinner for consistent use across the app.
 * Uses Tailwind CSS for styling and animation with multiple size and color variants.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  message,
  label = "Loading...",
  className = "",
  inline = false,
}) => {
  // Size mapping
  const sizeMap = {
    sm: 16,
    md: 32,
    lg: 48,
    xl: 64,
  };

  const spinnerSize = typeof size === 'number' ? size : sizeMap[size];

  // Color mapping
  const colorMap = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    white: 'text-white',
    gray: 'text-gray-500',
  };

  const colorClass = colorMap[color as keyof typeof colorMap] || color;

  const spinnerElement = (
    <div 
      className={cn(
        "flex flex-col items-center justify-center",
        !inline && "w-full h-full min-h-[100px]",
        className
      )} 
      role="status" 
      aria-live="polite"
    >
      <svg
        className={cn("animate-spin", colorClass)}
        width={spinnerSize}
        height={spinnerSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      {message && (
        <p className={cn(
          "mt-2 text-sm font-medium",
          color === 'white' ? 'text-white' : 'text-gray-600'
        )}>
          {message}
        </p>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );

  if (inline) {
    return (
      <div className="inline-flex items-center justify-center">
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};

export default LoadingSpinner; 