import { useState, useEffect, useRef } from 'react';
import { resendVerificationApi } from '../api/authApi';

const COOLDOWN_SECONDS = 60;

/**
 * Shared hook for "resend verification email" functionality.
 * Handles loading state, 60-second cooldown, and error feedback.
 *
 * Usage:
 *   const { resend, status, countdown } = useResendVerification();
 *   resend('user@example.com');
 *
 * status: 'idle' | 'sending' | 'sent' | 'error'
 */
const useResendVerification = () => {
  const [status, setStatus] = useState('idle');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  const startCooldown = () => {
    setCountdown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          setStatus('idle');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const resend = async (email) => {
    if (status === 'sending' || countdown > 0) return;
    setStatus('sending');
    try {
      await resendVerificationApi(email);
      setStatus('sent');
      startCooldown();
    } catch (err) {
      // 429 = cooldown active on server; treat same as sent
      if (err?.response?.status === 429) {
        setStatus('sent');
        startCooldown();
      } else {
        setStatus('error');
      }
    }
  };

  return { resend, status, countdown };
};

export default useResendVerification;
