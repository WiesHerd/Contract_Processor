import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Error severity levels
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'success';

// Error context interface
export interface ErrorContext {
  message: string;
  severity: ErrorSeverity;
  action?: string;
  onAction?: () => void;
  dismissible?: boolean;
  autoDismiss?: number;
  id: string;
}

// Error handler context
interface ErrorHandlerContextType {
  showError: (error: Omit<ErrorContext, 'id'>) => void;
  showSuccess: (message: string, action?: string, onAction?: () => void) => void;
  showWarning: (message: string, action?: string, onAction?: () => void) => void;
  showInfo: (message: string, action?: string, onAction?: () => void) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
  errors: ErrorContext[];
}

const ErrorHandlerContext = createContext<ErrorHandlerContextType | undefined>(undefined);

// Error handler provider
export function ErrorHandlerProvider({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = useState<ErrorContext[]>([]);

  const showError = useCallback((error: Omit<ErrorContext, 'id'>) => {
    const id = crypto.randomUUID();
    const newError: ErrorContext = {
      ...error,
      id,
      dismissible: error.dismissible ?? true,
      autoDismiss: error.autoDismiss ?? (error.severity === 'error' ? 0 : 5000)
    };

    setErrors(prev => [...prev, newError]);

    // Auto-dismiss for non-error messages
    if (newError.autoDismiss && newError.autoDismiss > 0) {
      setTimeout(() => {
        clearError(id);
      }, newError.autoDismiss);
    }
  }, []);

  const showSuccess = useCallback((message: string, action?: string, onAction?: () => void) => {
    showError({ message, severity: 'success', action, onAction });
  }, [showError]);

  const showWarning = useCallback((message: string, action?: string, onAction?: () => void) => {
    showError({ message, severity: 'warning', action, onAction });
  }, [showError]);

  const showInfo = useCallback((message: string, action?: string, onAction?: () => void) => {
    showError({ message, severity: 'info', action, onAction });
  }, [showError]);

  const clearError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorHandlerContext.Provider value={{
      showError,
      showSuccess,
      showWarning,
      showInfo,
      clearError,
      clearAllErrors,
      errors
    }}>
      {children}
      <ErrorDisplay />
    </ErrorHandlerContext.Provider>
  );
}

// Error display component
function ErrorDisplay() {
  const { errors, clearError } = useContext(ErrorHandlerContext)!;

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.map((error) => (
        <ErrorCard key={error.id} error={error} onDismiss={() => clearError(error.id)} />
      ))}
    </div>
  );
}

// Individual error card
function ErrorCard({ error, onDismiss }: { error: ErrorContext; onDismiss: () => void }) {
  const getIcon = () => {
    switch (error.severity) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (error.severity) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={cn(
      'relative p-4 border rounded-lg shadow-lg backdrop-blur-sm',
      'transform transition-all duration-300 ease-out',
      'animate-in slide-in-from-right-4',
      getStyles()
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-5">
            {error.message}
          </p>
          {error.action && (
            <button
              onClick={error.onAction}
              className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent rounded"
            >
              {error.action}
            </button>
          )}
        </div>
        {error.dismissible && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Hook to use error handler
export function useErrorHandler() {
  const context = useContext(ErrorHandlerContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorHandlerProvider');
  }
  return context;
}

// Global error handler for unhandled errors
export function setupGlobalErrorHandler() {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error);
      // You can send this to your error tracking service
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // You can send this to your error tracking service
    });
  }
} 