import { useState, useEffect, useCallback, useRef } from 'react';

const SESSION_DURATION = 15 * 60 * 1000; // 15 minutes
const WARNING_TIME = 1 * 60 * 1000; // 1 minute before timeout

export const useSessionTimeout = (onTimeout: () => void) => {
  const [isWarningModalOpen, setWarningModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_TIME / 1000);

  const timeoutId = useRef<NodeJS.Timeout>();
  const warningTimeoutId = useRef<NodeJS.Timeout>();
  const countdownIntervalId = useRef<NodeJS.Timeout>();

  const startWarningTimer = useCallback(() => {
    warningTimeoutId.current = setTimeout(() => {
      setWarningModalOpen(true);
      
      // Start the countdown
      countdownIntervalId.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalId.current);
            onTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    }, SESSION_DURATION - WARNING_TIME);
  }, [onTimeout]);

  const startMainTimer = useCallback(() => {
    timeoutId.current = setTimeout(() => {
      // If this timer is reached, the user has been inactive for the full duration
      onTimeout();
    }, SESSION_DURATION);
  }, [onTimeout]);
  
  const resetTimers = useCallback(() => {
    // Clear all existing timers
    if (timeoutId.current) clearTimeout(timeoutId.current);
    if (warningTimeoutId.current) clearTimeout(warningTimeoutId.current);
    if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);

    // Reset modal state
    setWarningModalOpen(false);
    setCountdown(WARNING_TIME / 1000);
    
    // Restart timers
    startWarningTimer();
    startMainTimer();
  }, [startWarningTimer, startMainTimer]);

  const handleStayLoggedIn = () => {
    resetTimers();
  };
  
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'click'];

    const eventListener = () => {
      resetTimers();
    };
    
    // Set initial timers
    resetTimers();

    // Add event listeners
    events.forEach(event => window.addEventListener(event, eventListener));

    // Cleanup
    return () => {
      events.forEach(event => window.removeEventListener(event, eventListener));
      if (timeoutId.current) clearTimeout(timeoutId.current);
      if (warningTimeoutId.current) clearTimeout(warningTimeoutId.current);
      if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
    };
  }, [resetTimers]);

  return {
    isWarningModalOpen,
    countdown,
    handleStayLoggedIn,
  };
}; 