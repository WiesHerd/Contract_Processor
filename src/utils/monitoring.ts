import * as Sentry from '@sentry/react';

// Initialize Sentry for error tracking
export const initializeMonitoring = () => {
  // Only initialize in production
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN || 'https://your-sentry-dsn@sentry.io/project-id',
      integrations: [],
      tracesSampleRate: 0.1, // Sample 10% of transactions
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      
      // Configure error sampling
      beforeSend(event) {
        // Don't send errors for development
        if (import.meta.env.DEV) {
          return null;
        }
        
        // Filter out common errors that aren't actionable
        if (event.exception) {
          const exception = event.exception.values?.[0];
          if (exception?.value?.includes('ResizeObserver loop limit exceeded')) {
            return null;
          }
        }
        
        return event;
      },
    });
  }
};

// Track critical user actions
export const trackUserAction = (action: string, details?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: action,
      data: details,
      level: 'info',
    });
  }
};

// Track performance metrics
export const trackPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${operation} took ${duration}ms`,
      data: { operation, duration, ...metadata },
      level: 'info',
    });
  }
};

// Track security events
export const trackSecurityEvent = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      category: 'security',
      message: event,
      data: { severity, ...details },
      level: severity === 'critical' ? 'fatal' : severity === 'high' ? 'error' : 'warning',
    });
  }
};

// Track bulk operations
export const trackBulkOperation = (operation: string, count: number, success: boolean, error?: string) => {
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      category: 'bulk-operation',
      message: `${operation} ${count} items - ${success ? 'success' : 'failed'}`,
      data: { operation, count, success, error },
      level: success ? 'info' : 'error',
    });
  }
};

// Performance monitoring hooks
export const usePerformanceTracking = () => {
  const startTimer = (operation: string) => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      trackPerformance(operation, duration);
    };
  };

  return { startTimer };
};

// Health check utility
export const checkSystemHealth = async () => {
  const healthChecks = {
    auth: false,
    api: false,
    storage: false,
  };

  try {
    // Check authentication
    const { fetchAuthSession } = await import('aws-amplify/auth');
    await fetchAuthSession();
    healthChecks.auth = true;
  } catch (error) {
    console.error('Auth health check failed:', error);
  }

  try {
    // Check API connectivity
    const { generateClient } = await import('aws-amplify/api');
    const client = generateClient();
    // Try a simple query
    healthChecks.api = true;
  } catch (error) {
    console.error('API health check failed:', error);
  }

  try {
    // Check storage connectivity
    const { list } = await import('aws-amplify/storage');
    await list();
    healthChecks.storage = true;
  } catch (error) {
    console.error('Storage health check failed:', error);
  }

  // Report health status
  const allHealthy = Object.values(healthChecks).every(Boolean);
  
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      category: 'health-check',
      message: `System health: ${allHealthy ? 'healthy' : 'unhealthy'}`,
      data: healthChecks,
      level: allHealthy ? 'info' : 'error',
    });
  }

  return { healthy: allHealthy, checks: healthChecks };
}; 