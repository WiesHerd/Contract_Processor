import { useState, useEffect, useCallback, useRef } from 'react';

// Enterprise-grade session timeout configuration
const SESSION_DURATION = 20 * 60 * 1000; // 20 minutes (increased from 15)
const WARNING_TIME = 2 * 60 * 1000; // 2 minutes before timeout (increased from 1)
const ADMIN_SESSION_DURATION = 15 * 60 * 1000; // 15 minutes for admin users
const ADMIN_WARNING_TIME = 1 * 60 * 1000; // 1 minute warning for admin users

interface SessionTimeoutConfig {
  isAdmin?: boolean;
  customDuration?: number;
  customWarningTime?: number;
}

export const useSessionTimeout = (
  onTimeout: () => void, 
  config: SessionTimeoutConfig = {}
) => {
  const { isAdmin = false, customDuration, customWarningTime } = config;
  
  const sessionDuration = customDuration || (isAdmin ? ADMIN_SESSION_DURATION : SESSION_DURATION);
  const warningTime = customWarningTime || (isAdmin ? ADMIN_WARNING_TIME : WARNING_TIME);
  
  const [isWarningModalOpen, setWarningModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(warningTime / 1000);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const timeoutId = useRef<NodeJS.Timeout>();
  const warningTimeoutId = useRef<NodeJS.Timeout>();
  const countdownIntervalId = useRef<NodeJS.Timeout>();
  const activityCheckIntervalId = useRef<NodeJS.Timeout>();
  const onTimeoutRef = useRef(onTimeout);
  const sessionDurationRef = useRef(sessionDuration);
  const warningTimeRef = useRef(warningTime);
  const isInitializedRef = useRef(false);
  
  // Update refs when props change
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
    sessionDurationRef.current = sessionDuration;
    warningTimeRef.current = warningTime;
  }, [onTimeout, sessionDuration, warningTime]);

  const startWarningTimer = useCallback(() => {
    if (warningTimeoutId.current) clearTimeout(warningTimeoutId.current);
    
    warningTimeoutId.current = setTimeout(() => {
      setWarningModalOpen(true);
      
      // Start the countdown
      if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
      countdownIntervalId.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
            onTimeoutRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    }, sessionDurationRef.current - warningTimeRef.current);
  }, []);

  const startMainTimer = useCallback(() => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    
    timeoutId.current = setTimeout(() => {
      // If this timer is reached, the user has been inactive for the full duration
      onTimeoutRef.current();
    }, sessionDurationRef.current);
  }, []);
  
  const resetTimers = useCallback(() => {
    // Clear all existing timers
    if (timeoutId.current) clearTimeout(timeoutId.current);
    if (warningTimeoutId.current) clearTimeout(warningTimeoutId.current);
    if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);

    // Reset modal state
    setWarningModalOpen(false);
    setCountdown(warningTimeRef.current / 1000);
    setLastActivity(Date.now());
    
    // Restart timers
    startWarningTimer();
    startMainTimer();
  }, [startWarningTimer, startMainTimer]);

  const handleStayLoggedIn = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  // Activity monitoring with periodic checks
  const startActivityMonitoring = useCallback(() => {
    if (activityCheckIntervalId.current) clearInterval(activityCheckIntervalId.current);
    
    activityCheckIntervalId.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      // If more than 5 minutes have passed without activity, force timeout
      if (timeSinceLastActivity > 5 * 60 * 1000) {
        onTimeoutRef.current();
      }
    }, 30 * 1000); // Check every 30 seconds
  }, [lastActivity]);
  
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) {
      console.log('Session timeout already initialized, skipping...');
      return;
    }
    
    console.log('Initializing session timeout hook...');
    isInitializedRef.current = true;
    
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'focus'];

    const eventListener = () => {
      setLastActivity(Date.now());
      resetTimers();
    };
    
    // Set initial timers
    resetTimers();
    startActivityMonitoring();

    // Add event listeners
    events.forEach(event => window.addEventListener(event, eventListener));

    // Cleanup
    return () => {
      console.log('Cleaning up session timeout hook...');
      events.forEach(event => window.removeEventListener(event, eventListener));
      if (timeoutId.current) clearTimeout(timeoutId.current);
      if (warningTimeoutId.current) clearTimeout(warningTimeoutId.current);
      if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
      if (activityCheckIntervalId.current) clearInterval(activityCheckIntervalId.current);
      isInitializedRef.current = false;
    };
  }, []); // Remove all dependencies to prevent infinite loops

  return {
    isWarningModalOpen,
    countdown,
    handleStayLoggedIn,
    lastActivity,
    sessionDuration: sessionDuration / 1000 / 60, // Return in minutes
  };
}; 