// Performance utilities for the application
// This file provides performance monitoring and optimization utilities

/**
 * Performance monitoring utilities
 */
export const performanceUtils = {
  /**
   * Measure execution time of a function
   */
  measureTime: <T>(fn: () => T): { result: T; duration: number } => {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  /**
   * Debounce function execution
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle function execution
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};

/**
 * Performance monitoring hooks
 */
export const usePerformanceTracking = () => {
  const trackPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => {
    console.log(`Performance: ${operation} took ${duration.toFixed(2)}ms`, metadata);
  };

  return { trackPerformance };
};

export default performanceUtils; 