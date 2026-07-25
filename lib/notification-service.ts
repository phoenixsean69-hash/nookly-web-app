export interface BrowserNotificationOptions {
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  silent?: boolean;
  onClick?: (notification: Notification) => void;
  onClose?: (notification: Notification) => void;
  onError?: (notification: Notification) => void;
}

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = "default";

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }

    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }

    this.permission = Notification.permission;
    return this.permission === "granted";
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "denied") {
      this.permission = "denied";
      return false;
    }

    this.permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

    return this.permission === "granted";
  }

  sendNotification(
    title: string,
    body: string,
    options: BrowserNotificationOptions = {},
  ): boolean {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return false;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: options.icon ?? "/images/icon.png",
        tag: options.tag ?? `nookly-${Date.now()}`,
        data: options.data ?? {},
        requireInteraction: options.requireInteraction ?? false,
        silent: options.silent ?? false,
      });

      notification.onclick = () => {
        notification.close();
        window.focus();

        if (options.onClick) {
          options.onClick(notification);
          return;
        }

        const url = notification.data?.url;
        if (typeof url === "string") {
          window.location.assign(url);
        }
      };

      if (options.onClose) {
        notification.onclose = () => options.onClose?.(notification);
      }

      if (options.onError) {
        notification.onerror = () => options.onError?.(notification);
      }

      window.setTimeout(() => notification.close(), 10_000);
      return true;
    } catch (error) {
      console.error("Unable to show browser notification:", error);
      return false;
    }
  }

  sendPropertyRequestNotification(
    tenantName: string,
    propertyName: string,
    _message: string,
    queryId?: string,
  ): boolean {
    return this.sendNotification(
      "New property inquiry",
      `${tenantName} sent an inquiry about ${propertyName}.`,
      {
        tag: `property-inquiry-${queryId ?? Date.now()}`,
        data: { url: "/dashboard/messages", queryId },
        requireInteraction: true,
      },
    );
  }

  sendStatusUpdateNotification(
    tenantName: string,
    propertyName: string,
    newStatus: string,
    queryId?: string,
  ): boolean {
    return this.sendNotification(
      "Inquiry status updated",
      `${tenantName}'s inquiry for ${propertyName} is now ${newStatus}.`,
      {
        tag: `query-status-${queryId ?? Date.now()}`,
        data: { url: "/dashboard/messages", queryId },
      },
    );
  }

  sendBulkNotification(
    notifications: Array<{
      title: string;
      body: string;
      options?: BrowserNotificationOptions;
    }>,
  ): number {
    return notifications.reduce(
      (sent, notification) =>
        sent +
        Number(
          this.sendNotification(
            notification.title,
            notification.body,
            notification.options,
          ),
        ),
      0,
    );
  }

  isAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    );
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  openNotificationSettings = (): void => {
    alert(
      "Open your browser's site settings and allow notifications for Nookly.",
    );
  };
}

export const notificationService = NotificationService.getInstance();
