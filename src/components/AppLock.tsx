import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import LockScreen from './LockScreen';

export default function AppLock({ children }: { children: React.ReactNode }) {
  const appLockEnabled = useSettingsStore((state) => state.appLockEnabled);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const unlock = useCallback(() => {
    setIsUnlocked(true);
  }, []);

  useEffect(() => {
    if (!appLockEnabled) {
      setIsUnlocked(true);
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isUnlocked) {
          setIsUnlocked(false);
        }
      }
    };

    const handleBeforeUnload = () => {
      setIsUnlocked(false);
    };

    const handleFocus = () => {
      if (appLockEnabled && isUnlocked) {
        setIsUnlocked(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
    };
  }, [appLockEnabled, isUnlocked]);

  if (!appLockEnabled || isUnlocked) {
    return <>{children}</>;
  }

  return <LockScreen onUnlock={unlock} />;
}
