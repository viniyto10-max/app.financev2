import { useState, useEffect, useCallback } from 'react';

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      const saved = localStorage.getItem('notifications_enabled');
      setEnabled(saved === 'true');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  const toggleNotifications = useCallback(async (shouldEnable: boolean) => {
    if (shouldEnable) {
      const granted = await requestPermission();
      if (granted) {
        setEnabled(true);
        localStorage.setItem('notifications_enabled', 'true');
        return true;
      }
      return false;
    } else {
      setEnabled(false);
      localStorage.setItem('notifications_enabled', 'false');
      return true;
    }
  }, [requestPermission]);

  // Daily scheduler logic (runs only when app is active)
  useEffect(() => {
    if (enabled && permission === 'granted') {
      const scheduleNext = () => {
        const now = new Date();
        const next = new Date();
        next.setHours(20, 0, 0, 0); // Exemplo: 20:00
        
        if (now > next) next.setDate(next.getDate() + 1);
        
        const delay = next.getTime() - now.getTime();
        
        return setTimeout(() => {
          new Notification('Minhas Economias', {
            body: 'Não esqueça de registrar suas despesas de hoje!',
            icon: '/pwa-192x192.png'
          });
          scheduleNext();
        }, delay);
      };

      const timerId = scheduleNext();
      return () => clearTimeout(timerId);
    }
  }, [enabled, permission]);

  return { permission, enabled, toggleNotifications };
}
