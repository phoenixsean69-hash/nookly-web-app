// hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/lib/notification-service';

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check initial state
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        setIsEnabled(Notification.permission === 'granted');
      }
    };

    checkSupport();

    // Listen for permission changes (when user changes it in browser settings)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 'Notification' in window) {
        setPermission(Notification.permission);
        setIsEnabled(Notification.permission === 'granted');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    try {
      const granted = await notificationService.requestPermission();
      setIsEnabled(granted);
      setPermission(notificationService.getPermissionStatus());
      return granted;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send notification
  const sendNotification = useCallback((
    title: string,
    body: string,
    options?: any
  ) => {
    return notificationService.sendNotification(title, body, options);
  }, []);

  // Send property request notification
  const sendPropertyRequest = useCallback((
    tenantName: string,
    propertyName: string,
    message: string,
    queryId?: string
  ) => {
    return notificationService.sendPropertyRequestNotification(
      tenantName,
      propertyName,
      message,
      queryId
    );
  }, []);

  // Send status update notification
  const sendStatusUpdate = useCallback((
    tenantName: string,
    propertyName: string,
    newStatus: string,
    queryId?: string
  ) => {
    return notificationService.sendStatusUpdateNotification(
      tenantName,
      propertyName,
      newStatus,
      queryId
    );
  }, []);

  return {
    isSupported,
    isEnabled,
    permission,
    isLoading,
    requestPermission,
    sendNotification,
    sendPropertyRequest,
    sendStatusUpdate,
    openSettings: notificationService.openNotificationSettings,
  };
}