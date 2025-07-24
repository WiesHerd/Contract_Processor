import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertCircle, X, AlertTriangle, Info, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';

// Enterprise notification types with clear hierarchy
export type NotificationType = 'critical' | 'error' | 'warning' | 'success' | 'info';

// Enterprise notification interface
export interface EnterpriseNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  details?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  };
  dismissible?: boolean;
  autoDismiss?: number;
  timestamp: Date;
  category?: string; // For grouping related notifications
}

// Enterprise notification context
interface EnterpriseNotificationContextType {
  // Critical notifications (modal dialogs - must acknowledge)
  showCritical: (notification: Omit<EnterpriseNotification, 'id' | 'type' | 'timestamp'>) => void;
  
  // Standard notifications (toasts - auto-dismiss)
  showError: (title: string, message: string, details?: string) => void;
  showSuccess: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
  
  // Utility functions
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  clearByCategory: (category: string) => void;
  
  // State
  notifications: EnterpriseNotification[];
  criticalNotifications: EnterpriseNotification[];
}

const EnterpriseNotificationContext = createContext<EnterpriseNotificationContextType | undefined>(undefined);

// Enterprise notification provider
export function EnterpriseNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<EnterpriseNotification[]>([]);
  const [criticalNotifications, setCriticalNotifications] = useState<EnterpriseNotification[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate unique ID
  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Show critical notification (modal dialog)
  const showCritical = useCallback((notification: Omit<EnterpriseNotification, 'id' | 'type' | 'timestamp'>) => {
    const id = generateId();
    const newNotification: EnterpriseNotification = {
      ...notification,
      id,
      type: 'critical',
      timestamp: new Date(),
      dismissible: notification.dismissible ?? true,
    };

    setCriticalNotifications(prev => [...prev, newNotification]);
  }, [generateId]);

  // Show standard notification (toast)
  const showStandardNotification = useCallback((type: Exclude<NotificationType, 'critical'>, title: string, message: string, details?: string) => {
    const id = generateId();
    const newNotification: EnterpriseNotification = {
      id,
      type,
      title,
      message,
      details,
      timestamp: new Date(),
      dismissible: true,
      autoDismiss: type === 'success' ? 4000 : type === 'info' ? 3000 : 6000,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-dismiss
    if (newNotification.autoDismiss) {
      const timeout = setTimeout(() => {
        clearNotification(id);
      }, newNotification.autoDismiss);
      timeoutRefs.current.set(id, timeout);
    }
  }, [generateId]);

  const showError = useCallback((title: string, message: string, details?: string) => {
    showStandardNotification('error', title, message, details);
  }, [showStandardNotification]);

  const showSuccess = useCallback((title: string, message: string) => {
    showStandardNotification('success', title, message);
  }, [showStandardNotification]);

  const showWarning = useCallback((title: string, message: string) => {
    showStandardNotification('warning', title, message);
  }, [showStandardNotification]);

  const showInfo = useCallback((title: string, message: string) => {
    showStandardNotification('info', title, message);
  }, [showStandardNotification]);

  // Clear notification
  const clearNotification = useCallback((id: string) => {
    // Clear timeout if exists
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }

    setNotifications(prev => prev.filter(n => n.id !== id));
    setCriticalNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();

    setNotifications([]);
    setCriticalNotifications([]);
  }, []);

  // Clear by category
  const clearByCategory = useCallback((category: string) => {
    setNotifications(prev => {
      const toRemove = prev.filter(n => n.category === category);
      toRemove.forEach(n => {
        const timeout = timeoutRefs.current.get(n.id);
        if (timeout) {
          clearTimeout(timeout);
          timeoutRefs.current.delete(n.id);
        }
      });
      return prev.filter(n => n.category !== category);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  return (
    <EnterpriseNotificationContext.Provider value={{
      showCritical,
      showError,
      showSuccess,
      showWarning,
      showInfo,
      clearNotification,
      clearAllNotifications,
      clearByCategory,
      notifications,
      criticalNotifications,
    }}>
      {children}
      <EnterpriseNotificationDisplay />
      <CriticalNotificationModals />
    </EnterpriseNotificationContext.Provider>
  );
}

// Enterprise notification display (toasts)
function EnterpriseNotificationDisplay() {
  const { notifications, clearNotification } = useContext(EnterpriseNotificationContext)!;

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <EnterpriseToast
          key={notification.id}
          notification={notification}
          onDismiss={() => clearNotification(notification.id)}
        />
      ))}
    </div>
  );
}

// Enterprise toast component
function EnterpriseToast({ notification, onDismiss }: { notification: EnterpriseNotification; onDismiss: () => void }) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 shadow-green-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 shadow-yellow-100';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 shadow-red-100';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 shadow-blue-100';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 shadow-gray-100';
    }
  };

  return (
    <div className={cn(
      'relative p-4 border rounded-lg shadow-lg backdrop-blur-sm',
      'transform transition-all duration-300 ease-out',
      'animate-in slide-in-from-right-4 fade-in',
      'hover:shadow-xl transition-shadow duration-200',
      getStyles()
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold leading-5 mb-1">
            {notification.title}
          </h4>
          <p className="text-sm leading-5 opacity-90">
            {notification.message}
          </p>
          {notification.details && (
            <details className="mt-2">
              <summary className="text-xs font-medium cursor-pointer hover:opacity-80">
                View details
              </summary>
              <p className="text-xs mt-1 opacity-75 whitespace-pre-wrap">
                {notification.details}
              </p>
            </details>
          )}
        </div>
        {notification.dismissible && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Critical notification modals
function CriticalNotificationModals() {
  const { criticalNotifications, clearNotification } = useContext(EnterpriseNotificationContext)!;

  return (
    <>
      {criticalNotifications.map((notification) => (
        <Dialog key={notification.id} open={true} onOpenChange={() => clearNotification(notification.id)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                {notification.title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {notification.message}
              </p>
              
              {notification.details && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">
                    {notification.details}
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              {notification.action && (
                <Button
                  variant={notification.action.variant || 'default'}
                  onClick={() => {
                    notification.action?.onClick();
                    clearNotification(notification.id);
                  }}
                >
                  {notification.action.label}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => clearNotification(notification.id)}
              >
                {notification.action ? 'Cancel' : 'OK'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}
    </>
  );
}

// Hook to use enterprise notifications
export function useEnterpriseNotifications() {
  const context = useContext(EnterpriseNotificationContext);
  if (!context) {
    throw new Error('useEnterpriseNotifications must be used within EnterpriseNotificationProvider');
  }
  return context;
}

// Legacy compatibility wrapper
export function useLegacyNotifications() {
  const { showError, showSuccess, showWarning, showInfo, showCritical } = useEnterpriseNotifications();
  
  return {
    showError: (error: { message: string; severity?: string }) => {
      showError('Error', error.message);
    },
    showSuccess: (message: string) => {
      showSuccess('Success', message);
    },
    showWarning: (message: string) => {
      showWarning('Warning', message);
    },
    showInfo: (message: string) => {
      showInfo('Information', message);
    },
    showCritical: (notification: Omit<EnterpriseNotification, 'id' | 'type' | 'timestamp'>) => {
      showCritical(notification);
    },
  };
} 