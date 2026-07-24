// lib/notification-service.ts
export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return this.permission === 'granted';

    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.warn('🔔 Web Notifications are not supported in this browser');
        return false;
      }

      // Get current permission status
      this.permission = Notification.permission;
      this.isInitialized = true;

      console.log(`🔔 Notification permission: ${this.permission}`);
      return this.permission === 'granted';
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Request permission from the user
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        console.warn('🔔 Web Notifications are not supported in this browser');
        return false;
      }

      if (Notification.permission === 'granted') {
        this.permission = 'granted';
        return true;
      }

      if (Notification.permission === 'denied') {
        console.warn('🔔 Notification permission was previously denied');
        return false;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      this.permission = permission;

      console.log(`🔔 Permission ${permission}`);
      return permission === 'granted';
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Send a notification
   */
  sendNotification(
    title: string,
    body: string,
    options?: {
      icon?: string;
      tag?: string;
      data?: any;
      requireInteraction?: boolean;
      silent?: boolean;
      actions?: NotificationAction[];
      onClick?: (notification: Notification) => void;
      onClose?: (notification: Notification) => void;
      onError?: (notification: Notification) => void;
    }
  ): boolean {
    try {
      // Check if notifications are available
      if (!('Notification' in window)) {
        console.warn('🔔 Web Notifications are not supported');
        return false;
      }

      // Check if we have permission
      if (Notification.permission !== 'granted') {
        console.warn('🔔 Notification permission not granted');
        return false;
      }

      // Check if document is visible (don't send if user is already on the page)
      if (!document.hidden && options?.silent !== false) {
        console.log('🔔 Page is visible, skipping notification');
        return false;
      }

      // Create notification
      const notification = new Notification(title, {
        body: body,
        icon: options?.icon || '/logo-192.png',
        tag: options?.tag || `notification-${Date.now()}`,
        data: options?.data || {},
        requireInteraction: options?.requireInteraction || true,
        silent: options?.silent || false,
        actions: options?.actions || [],
      });

      // Set up event handlers
      if (options?.onClick) {
        notification.onclick = () => {
          notification.close();
          options.onClick?.(notification);
        };
      } else {
        notification.onclick = () => {
          notification.close();
          window.focus();
          if (notification.data?.url) {
            window.location.href = notification.data.url;
          }
        };
      }

      if (options?.onClose) {
        notification.onclose = () => options.onClose?.(notification);
      }

      if (options?.onError) {
        notification.onerror = () => options.onError?.(notification);
      }

      // Auto-close after 10 seconds if not interacted with
      setTimeout(() => {
        if (!notification?.closed) {
          notification?.close();
        }
      }, 10000);

      console.log('🔔 Notification sent:', title);
      return true;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return false;
    }
  }

  /**
   * Send a property request notification
   */
  sendPropertyRequestNotification(
    tenantName: string,
    propertyName: string,
    message: string,
    queryId?: string
  ): boolean {
    const title = '🏠 New Property Request';
    const body = `${tenantName} is requesting information about ${propertyName}`;
    
    return this.sendNotification(title, body, {
      icon: '/property-icon.png',
      tag: `property-request-${queryId || Date.now()}`,
      data: {
        url: '/dashboard/messages',
        queryId: queryId,
        tenantName: tenantName,
        propertyName: propertyName,
      },
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Request 📋',
        },
        {
          action: 'dismiss',
          title: 'Dismiss ❌',
        },
      ],
      onClick: (notification) => {
        if (notification.data?.url) {
          window.location.href = notification.data.url;
        }
      },
    });
  }

  /**
   * Send a status update notification
   */
  sendStatusUpdateNotification(
    tenantName: string,
    propertyName: string,
    newStatus: string,
    queryId?: string
  ): boolean {
    const statusEmojis = {
      'pending': '⏳',
      'in-progress': '🔄',
      'resolved': '✅',
    };
    
    const emoji = statusEmojis[newStatus as keyof typeof statusEmojis] || '📌';
    const title = `${emoji} Query Status Updated`;
    const body = `Query from ${tenantName} for ${propertyName} is now ${newStatus}`;
    
    return this.sendNotification(title, body, {
      icon: '/status-icon.png',
      tag: `status-update-${queryId || Date.now()}`,
      data: {
        url: '/dashboard/messages',
        queryId: queryId,
      },
      requireInteraction: false,
    });
  }

  /**
   * Send a bulk notification (for multiple recipients)
   */
  sendBulkNotification(
    notifications: Array<{
      title: string;
      body: string;
      options?: any;
    }>
  ): number {
    let sentCount = 0;
    
    for (const notif of notifications) {
      const sent = this.sendNotification(notif.title, notif.body, notif.options);
      if (sent) sentCount++;
      
      // Small delay between notifications to avoid overwhelming
      if (notifications.length > 1) {
        // Wait 100ms between notifications
        const delay = 100;
        // Note: In a real implementation, you might want to use setTimeout
        // But for simplicity, we're just sending them sequentially
      }
    }
    
    return sentCount;
  }

  /**
   * Check if notifications are available
   */
  isAvailable(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  /**
   * Open notification settings (browser-specific)
   */
  openNotificationSettings(): void {
    // This will open the browser's notification settings
    if (navigator.userAgent.includes('Chrome')) {
      // Chrome
      window.open('chrome://settings/content/notifications');
    } else if (navigator.userAgent.includes('Firefox')) {
      // Firefox
      window.open('about:preferences#privacy');
    } else if (navigator.userAgent.includes('Safari')) {
      // Safari
      window.open('safari://settings');
    } else {
      // Generic
      alert('Please enable notifications in your browser settings.');
    }
  }
}

// Export a singleton instance
export const notificationService = NotificationService.getInstance();