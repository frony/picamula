'use client';

import { useEffect, useRef, useState } from 'react';

interface CaptchaProps {
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
}

export function Captcha({ onSuccess, onError }: CaptchaProps) {
  const widgetRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Dynamically load ALTCHA widget
    const loadAltcha = async () => {
      try {
        // Import ALTCHA web component
        await import('altcha');
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load ALTCHA:', err);
        onError?.('Failed to load verification widget');
      }
    };

    loadAltcha();
  }, [onError]);

  useEffect(() => {
    if (!isLoaded || !widgetRef.current) return;

    const widget = widgetRef.current;

    // Listen for state changes
    const handleStateChange = (ev: CustomEvent) => {
      if (ev.detail.state === 'verified') {
        // User completed the challenge
        const payload = ev.detail.payload;
        onSuccess(payload);
      } else if (ev.detail.state === 'error') {
        onError?.('Verification failed. Please try again.');
      }
    };

    widget.addEventListener('statechange', handleStateChange);

    return () => {
      widget.removeEventListener('statechange', handleStateChange);
    };
  }, [isLoaded, onSuccess, onError]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-gray-600">Loading verification...</span>
      </div>
    );
  }

  return (
    <div className="my-4">
      <altcha-widget
        ref={widgetRef}
        challengeurl="/api/captcha/challenge"
        hidefooter
        hidelogo
      />
    </div>
  );
}
