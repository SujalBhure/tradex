import { useState, useEffect } from 'react';

export const useIsTouchDevice = (): boolean => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkIsTouch = () => {
      if (typeof window === 'undefined') {
        return false;
      }
      // If the device has a mouse with hover capabilities, it is a PC
      const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (hasFinePointer) {
        return false;
      }
      // Otherwise, check for touch devices (smartphones, tablets without mouse)
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      return hasTouch;
    };

    setIsTouch(checkIsTouch());

    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const handleMediaChange = () => setIsTouch(checkIsTouch());

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }
    window.addEventListener('resize', handleMediaChange);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
      window.removeEventListener('resize', handleMediaChange);
    };
  }, []);

  return isTouch;
};
