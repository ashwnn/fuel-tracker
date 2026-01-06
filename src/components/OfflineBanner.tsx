'use client';

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center gap-2 bg-amber-500 text-amber-950 px-4 py-2 text-sm shadow-md dark:bg-amber-600 dark:text-amber-50">
      <WifiOff className="h-4 w-4" />
      <span>Offline mode. Some actions may not work until connection is restored.</span>
    </div>
  );
}
