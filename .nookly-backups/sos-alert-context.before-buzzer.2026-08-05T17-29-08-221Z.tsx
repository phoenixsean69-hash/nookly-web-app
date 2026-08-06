"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  BellRing,
  LocateFixed,
  MapPin,
  Siren,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import {
  listStudentSosAlerts,
  markStudentSosRead,
  subscribeToStudentSosAlerts,
} from "@/lib/sos-alert.service";
import { notificationService } from "@/lib/notification-service";
import type {
  SosNotificationPermission,
  SosRealtimeEvent,
  SosRealtimeState,
  StudentSosAlert,
} from "@/types/sos-alert";

interface SosAlertContextValue {
  alerts: StudentSosAlert[];
  unreadCount: number;
  enabled: boolean;
  loading: boolean;
  refreshing: boolean;
  realtimeState: SosRealtimeState;
  error: string;
  notificationPermission: SosNotificationPermission;
  incomingAlert: StudentSosAlert | null;
  refreshAlerts: () => Promise<void>;
  markAsRead: (
    notificationId: string,
  ) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  enableBrowserNotifications: () => Promise<boolean>;
  dismissIncomingAlert: () => void;
}

const SosAlertContext =
  createContext<SosAlertContextValue | null>(null);

function sortAlerts(
  alerts: StudentSosAlert[],
): StudentSosAlert[] {
  return [...alerts].sort((first, second) => {
    const firstTime = new Date(
      first.reportedAt || first.createdAt || 0,
    ).getTime();
    const secondTime = new Date(
      second.reportedAt || second.createdAt || 0,
    ).getTime();

    return secondTime - firstTime;
  });
}

function mergeAlert(
  alerts: StudentSosAlert[],
  nextAlert: StudentSosAlert,
): StudentSosAlert[] {
  return sortAlerts([
    nextAlert,
    ...alerts.filter(
      (alert) =>
        alert.notificationId !== nextAlert.notificationId,
    ),
  ]);
}

function announcementKey(
  notificationId: string,
): string {
  return `nookly-sos-announced:${notificationId}`;
}

function wasAnnounced(
  notificationId: string,
): boolean {
  try {
    return (
      sessionStorage.getItem(
        announcementKey(notificationId),
      ) === "true"
    );
  } catch {
    return false;
  }
}

function rememberAnnouncement(
  notificationId: string,
): void {
  try {
    sessionStorage.setItem(
      announcementKey(notificationId),
      "true",
    );
  } catch {
    // Session storage can be unavailable in restricted browsers.
  }
}

function isRecent(
  alert: StudentSosAlert,
  maximumAgeMinutes = 30,
): boolean {
  const value =
    alert.reportedAt || alert.createdAt;
  const timestamp = new Date(value).getTime();

  return (
    Number.isFinite(timestamp) &&
    Date.now() - timestamp <=
      maximumAgeMinutes * 60_000
  );
}

function notificationBody(
  alert: StudentSosAlert,
): string {
  return `${alert.studentName} reported ${alert.incidentLabel}. Location: ${alert.address}`;
}

export function SosAlertProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, organization, isOffline } = useAuth();

  const [alerts, setAlerts] = useState<
    StudentSosAlert[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] =
    useState(false);
  const [realtimeState, setRealtimeState] =
    useState<SosRealtimeState>("disabled");
  const [error, setError] = useState("");
  const [
    notificationPermission,
    setNotificationPermission,
  ] = useState<SosNotificationPermission>(
    "unsupported",
  );
  const [incomingAlert, setIncomingAlert] =
    useState<StudentSosAlert | null>(null);

  const mountedRef = useRef(true);

  const enabled = Boolean(
    user?.$id &&
      organization?.type_of === "school",
  );

  const showBrowserNotification = useCallback(
    async (
      alert: StudentSosAlert,
    ): Promise<boolean> => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return false;
      }

      const url =
        `/dashboard/sos?alert=${encodeURIComponent(
          alert.notificationId,
        )}`;

      try {
        if ("serviceWorker" in navigator) {
          let registration =
            await navigator.serviceWorker.getRegistration();

          if (!registration) {
            registration =
              await navigator.serviceWorker.register(
                "/sw.js",
              );
          }

          await registration.showNotification(
            alert.title ||
              `Emergency SOS: ${alert.incidentLabel}`,
            {
              body: notificationBody(alert),
              icon: "/images/icon.png",
              badge: "/images/icon.png",
              tag: `student-sos-${alert.alertId}`,
              requireInteraction: true,
              silent: false,
              data: {
                url,
                type: "student_sos",
                alertId: alert.alertId,
                notificationId:
                  alert.notificationId,
              },
            },
          );

          return true;
        }
      } catch (caught) {
        console.error(
          "Unable to show the SOS service-worker notification:",
          caught,
        );
      }

      return notificationService.sendNotification(
        alert.title ||
          `Emergency SOS: ${alert.incidentLabel}`,
        notificationBody(alert),
        {
          icon: "/images/icon.png",
          tag: `student-sos-${alert.alertId}`,
          requireInteraction: true,
          data: {
            url,
            type: "student_sos",
            alertId: alert.alertId,
            notificationId: alert.notificationId,
          },
        },
      );
    },
    [],
  );

  const announceAlert = useCallback(
    (alert: StudentSosAlert) => {
      if (
        alert.read ||
        wasAnnounced(alert.notificationId)
      ) {
        return;
      }

      rememberAnnouncement(alert.notificationId);
      setIncomingAlert(alert);

      if (
        typeof navigator !== "undefined" &&
        "vibrate" in navigator
      ) {
        navigator.vibrate?.([
          220,
          100,
          220,
          100,
          350,
        ]);
      }

      void showBrowserNotification(alert);
    },
    [showBrowserNotification],
  );

  const loadAlerts = useCallback(
    async ({
      announceRecent = false,
      showRefreshing = false,
    }: {
      announceRecent?: boolean;
      showRefreshing?: boolean;
    } = {}) => {
      if (
        !enabled ||
        !user?.$id ||
        isOffline ||
        !navigator.onLine
      ) {
        if (isOffline || !navigator.onLine) {
          setRealtimeState("offline");
        }
        return;
      }

      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const nextAlerts =
          await listStudentSosAlerts(user.$id);

        if (!mountedRef.current) return;

        setAlerts(nextAlerts);
        setError("");

        if (announceRecent) {
          const latestUnread = nextAlerts.find(
            (alert) =>
              !alert.read && isRecent(alert),
          );

          if (latestUnread) {
            announceAlert(latestUnread);
          }
        }
      } catch (caught) {
        if (!mountedRef.current) return;

        const message =
          caught instanceof Error
            ? caught.message
            : "Unable to load institution SOS alerts.";

        setError(message);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      announceAlert,
      enabled,
      isOffline,
      user?.$id,
    ],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      setNotificationPermission("unsupported");
      return;
    }

    const updatePermission = () => {
      setNotificationPermission(
        Notification.permission,
      );
    };

    updatePermission();

    document.addEventListener(
      "visibilitychange",
      updatePermission,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        updatePermission,
      );
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js")
      .catch((caught) => {
        console.error(
          "Unable to register the Nookly service worker:",
          caught,
        );
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setAlerts([]);
      setIncomingAlert(null);
      setRealtimeState("disabled");
      setError("");
      return;
    }

    if (isOffline || !navigator.onLine) {
      setRealtimeState("offline");
      return;
    }

    void loadAlerts({
      announceRecent: true,
    });
  }, [enabled, isOffline, loadAlerts]);

  useEffect(() => {
    if (
      !enabled ||
      !user?.$id ||
      isOffline ||
      !navigator.onLine
    ) {
      return;
    }

    const handleEvent = (
      event: SosRealtimeEvent,
    ) => {
      if (event.action === "delete") {
        setAlerts((current) =>
          current.filter(
            (alert) =>
              alert.notificationId !==
              event.notificationId,
          ),
        );

        setIncomingAlert((current) =>
          current?.notificationId ===
          event.notificationId
            ? null
            : current,
        );
        return;
      }

      if (!event.alert) return;

      setAlerts((current) =>
        mergeAlert(current, event.alert!),
      );

      if (event.action === "create") {
        announceAlert(event.alert);
      }
    };

    const stop = subscribeToStudentSosAlerts({
      recipientUserId: user.$id,
      onEvent: handleEvent,
      onState: (state, stateError) => {
        setRealtimeState(state);

        if (stateError) {
          setError(stateError.message);
        } else if (state === "connected") {
          setError("");
        }
      },
    });

    return stop;
  }, [
    announceAlert,
    enabled,
    isOffline,
    user?.$id,
  ]);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (navigator.onLine) {
        void loadAlerts({
          showRefreshing: false,
        });
      }
    };

    const interval = window.setInterval(
      refresh,
      60_000,
    );

    window.addEventListener("online", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(
        "online",
        refresh,
      );
    };
  }, [enabled, loadAlerts]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const current = alerts.find(
        (alert) =>
          alert.notificationId === notificationId,
      );

      if (!current || current.read) return;

      setAlerts((existing) =>
        existing.map((alert) =>
          alert.notificationId === notificationId
            ? {
                ...alert,
                read: true,
              }
            : alert,
        ),
      );

      try {
        const updated =
          await markStudentSosRead(notificationId);

        if (updated) {
          setAlerts((existing) =>
            mergeAlert(existing, updated),
          );
        }

        setIncomingAlert((incoming) =>
          incoming?.notificationId ===
          notificationId
            ? null
            : incoming,
        );
      } catch (caught) {
        setAlerts((existing) =>
          existing.map((alert) =>
            alert.notificationId === notificationId
              ? current
              : alert,
          ),
        );

        throw caught;
      }
    },
    [alerts],
  );

  const markAllAsRead = useCallback(async () => {
    const unread = alerts.filter(
      (alert) => !alert.read,
    );

    if (unread.length === 0) return;

    await Promise.all(
      unread.map((alert) =>
        markAsRead(alert.notificationId),
      ),
    );
  }, [alerts, markAsRead]);

  const enableBrowserNotifications =
    useCallback(async (): Promise<boolean> => {
      const granted =
        await notificationService.requestPermission();

      if (
        typeof window !== "undefined" &&
        "Notification" in window
      ) {
        setNotificationPermission(
          Notification.permission,
        );
      }

      if (
        granted &&
        "serviceWorker" in navigator
      ) {
        await navigator.serviceWorker.register(
          "/sw.js",
        );
      }

      return granted;
    }, []);

  const unreadCount = useMemo(
    () =>
      alerts.filter((alert) => !alert.read)
        .length,
    [alerts],
  );

  const value = useMemo<SosAlertContextValue>(
    () => ({
      alerts,
      unreadCount,
      enabled,
      loading,
      refreshing,
      realtimeState,
      error,
      notificationPermission,
      incomingAlert,
      refreshAlerts: () =>
        loadAlerts({
          showRefreshing: true,
        }),
      markAsRead,
      markAllAsRead,
      enableBrowserNotifications,
      dismissIncomingAlert: () =>
        setIncomingAlert(null),
    }),
    [
      alerts,
      enableBrowserNotifications,
      enabled,
      error,
      incomingAlert,
      loadAlerts,
      loading,
      markAllAsRead,
      markAsRead,
      notificationPermission,
      realtimeState,
      refreshing,
      unreadCount,
    ],
  );

  const openIncomingAlert = (
    openMap: boolean,
  ) => {
    if (!incomingAlert) return;

    const query = new URLSearchParams({
      alert: incomingAlert.notificationId,
    });

    if (openMap) {
      query.set("map", "1");
    }

    setIncomingAlert(null);
    router.push(
      `/dashboard/sos?${query.toString()}`,
    );
  };

  return (
    <SosAlertContext.Provider value={value}>
      {children}

      {incomingAlert && (
        <div className="fixed left-1/2 top-4 z-[10000] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-red-400 bg-red-600 text-white shadow-2xl shadow-red-950/30">
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <span className="absolute inset-0 animate-ping rounded-xl bg-white/15" />
              <Siren className="relative h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-red-100">
                  New student SOS
                </p>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">
                  {incomingAlert.incidentLabel}
                </span>
              </div>

              <h2 className="mt-1 text-lg font-black">
                {incomingAlert.studentName}
              </h2>

              <p className="mt-1 line-clamp-2 text-sm leading-5 text-red-50">
                {incomingAlert.message}
              </p>

              <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-red-100">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{incomingAlert.address}</span>
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openIncomingAlert(false)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-50"
                >
                  <BellRing className="h-4 w-4" />
                  Open SOS
                </button>

                {incomingAlert.latitude !== null &&
                  incomingAlert.longitude !==
                    null && (
                    <button
                      type="button"
                      onClick={() =>
                        openIncomingAlert(true)
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/20"
                    >
                      <LocateFixed className="h-4 w-4" />
                      Open map
                    </button>
                  )}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setIncomingAlert(null)
              }
              className="shrink-0 rounded-lg p-2 text-red-100 transition hover:bg-white/15 hover:text-white"
              aria-label="Dismiss SOS dashboard alert"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </SosAlertContext.Provider>
  );
}

export function useSosAlerts(): SosAlertContextValue {
  const context = useContext(SosAlertContext);

  if (!context) {
    throw new Error(
      "useSosAlerts must be used inside SosAlertProvider.",
    );
  }

  return context;
}
