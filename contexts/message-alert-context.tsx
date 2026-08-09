"use client";

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
  CheckCircle2,
  MessageSquareText,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/contexts/auth-context";
import {
  listOrganizationProperties,
} from "@/lib/appwrite/helpers";
import {
  subscribeToOrganizationMessages,
} from "@/lib/message-alert.service";
import { hasRegisteredWebPush } from "@/lib/web-push.service";
import { notificationService } from "@/lib/notification-service";
import type {
  MessageRealtimeState,
  OrganizationMessageRealtimeEvent,
} from "@/types/message-alert";

type BrowserPermission =
  | NotificationPermission
  | "unsupported";

interface MessageAlertContextValue {
  realtimeState: MessageRealtimeState;
  notificationPermission: BrowserPermission;
  enableBrowserNotifications: () => Promise<boolean>;
}

const MessageAlertContext =
  createContext<MessageAlertContextValue | null>(
    null,
  );

function announcementKey(
  organizationUserId: string,
  queryId: string,
): string {
  return `nookly-message-announced:${organizationUserId}:${queryId}`;
}

function wasAnnounced(
  organizationUserId: string,
  queryId: string,
): boolean {
  try {
    return (
      sessionStorage.getItem(
        announcementKey(
          organizationUserId,
          queryId,
        ),
      ) === "true"
    );
  } catch {
    return false;
  }
}

function rememberAnnouncement(
  organizationUserId: string,
  queryId: string,
): void {
  try {
    sessionStorage.setItem(
      announcementKey(
        organizationUserId,
        queryId,
      ),
      "true",
    );
  } catch {
    // Session storage can be unavailable in restricted browsers.
  }
}

function messagePreview(value: string): string {
  const normalized = value
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Open Nookly to read the new message.";
  }

  return normalized.length > 150
    ? `${normalized.slice(0, 147)}...`
    : normalized;
}

export function MessageAlertProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    organization,
    isOffline,
  } = useAuth();

  const [realtimeState, setRealtimeState] =
    useState<MessageRealtimeState>(
      "disabled",
    );

  const [
    notificationPermission,
    setNotificationPermission,
  ] = useState<BrowserPermission>(
    "unsupported",
  );

  const [
    permissionPromptDismissed,
    setPermissionPromptDismissed,
  ] = useState(false);

  const ownedReferencesRef =
    useRef<Set<string>>(new Set());

  const propertyNamesRef =
    useRef<Map<string, string>>(
      new Map(),
    );

  const organizationUserId =
    organization?.userId?.trim() || "";

  const enabled = Boolean(
    organizationUserId,
  );

  const refreshOwnership =
    useCallback(async (): Promise<void> => {
      if (!organizationUserId) {
        ownedReferencesRef.current =
          new Set();
        propertyNamesRef.current =
          new Map();
        return;
      }

      const properties =
        await listOrganizationProperties(
          organizationUserId,
        );

      const references = new Set<string>();
      const names =
        new Map<string, string>();

      for (const property of properties) {
        const id = String(
          property.$id || "",
        ).trim();

        const propertyName = String(
          property.propertyName ||
            "Property",
        ).trim();

        if (id) {
          references.add(id);
          names.set(
            id,
            propertyName,
          );
        }

        if (propertyName) {
          references.add(propertyName);
          names.set(
            propertyName,
            propertyName,
          );
        }
      }

      ownedReferencesRef.current =
        references;
      propertyNamesRef.current =
        names;
    }, [organizationUserId]);

  const showBrowserNotification =
    useCallback(
      async (
        event: OrganizationMessageRealtimeEvent,
        propertyName: string,
      ): Promise<boolean> => {
        if (
          typeof window === "undefined" ||
          !("Notification" in window) ||
          Notification.permission !==
            "granted"
        ) {
          return false;
        }

        const url =
          `/dashboard/messages?message=${encodeURIComponent(
            event.queryId,
          )}`;

        const title =
          "New tenant message";

        const body =
          `${event.writer} sent a message about ${propertyName}. ` +
          messagePreview(event.body);

        try {
          if (
            "serviceWorker" in navigator
          ) {
            let registration =
              await navigator.serviceWorker.getRegistration();

            if (!registration) {
              registration =
                await navigator.serviceWorker.register(
                  "/sw.js",
                );
            }

            await registration.showNotification(
              title,
              {
                body,
                icon: "/images/icon.png",
                badge: "/images/icon.png",
                tag:
                  `organization-message-${event.queryId}`,
                requireInteraction: true,
                data: {
                  url,
                  screen: url,
                  type:
                    "organization_message",
                  queryId:
                    event.queryId,
                  propertyId:
                    event.referenceProperty,
                  propertyName,
                },
              },
            );

            return true;
          }
        } catch (caught) {
          console.error(
            "Unable to show the organization message service-worker notification:",
            caught,
          );
        }

        return notificationService.sendNotification(
          title,
          body,
          {
            icon: "/images/icon.png",
            tag:
              `organization-message-${event.queryId}`,
            requireInteraction: true,
            data: {
              url,
              screen: url,
              type:
                "organization_message",
              queryId:
                event.queryId,
              propertyId:
                event.referenceProperty,
              propertyName,
            },
          },
        );
      },
      [],
    );

  const announceMessage =
    useCallback(
      (
        event: OrganizationMessageRealtimeEvent,
      ) => {
        if (
          !organizationUserId ||
          wasAnnounced(
            organizationUserId,
            event.queryId,
          )
        ) {
          return;
        }

        rememberAnnouncement(
          organizationUserId,
          event.queryId,
        );

        const propertyName =
          propertyNamesRef.current.get(
            event.referenceProperty,
          ) ||
          event.referenceProperty ||
          "your property";

        toast(
          `${event.writer} sent a new message about ${propertyName}.`,
          {
            icon: "💬",
            duration: 6_000,
          },
        );

        if (
          !hasRegisteredWebPush(
            organizationUserId,
          )
        ) {
          void showBrowserNotification(
            event,
            propertyName,
          );
        }
      },
      [
        organizationUserId,
        showBrowserNotification,
      ],
    );

  const handleRealtimeEvent =
    useCallback(
      (
        event: OrganizationMessageRealtimeEvent,
      ) => {
        const belongsToOrganization =
          Boolean(
            event.referenceProperty,
          ) &&
          ownedReferencesRef.current.has(
            event.referenceProperty,
          );

        if (!belongsToOrganization) {
          return;
        }

        window.dispatchEvent(
          new CustomEvent(
            "messagesUpdated",
            {
              detail: {
                action:
                  event.action,
                queryId:
                  event.queryId,
              },
            },
          ),
        );

        if (
          event.action === "create"
        ) {
          announceMessage(event);
        }
      },
      [announceMessage],
    );

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

      if (granted) {
        setPermissionPromptDismissed(
          true,
        );

        toast.success(
          "Tenant message alerts enabled.",
        );
      }

      return granted;
    }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      setNotificationPermission(
        "unsupported",
      );
      return;
    }

    const update = () => {
      setNotificationPermission(
        Notification.permission,
      );
    };

    update();

    document.addEventListener(
      "visibilitychange",
      update,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        update,
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
      setRealtimeState(
        "disabled",
      );
      ownedReferencesRef.current =
        new Set();
      propertyNamesRef.current =
        new Map();
      return;
    }

    if (
      isOffline ||
      !navigator.onLine
    ) {
      setRealtimeState(
        "offline",
      );
      return;
    }

    let stopped = false;
    let unsubscribe:
      | (() => void)
      | null = null;

    void refreshOwnership()
      .then(() => {
        if (stopped) return;

        unsubscribe =
          subscribeToOrganizationMessages({
            onEvent:
              handleRealtimeEvent,
            onState:
              (
                state,
                stateError,
              ) => {
                setRealtimeState(
                  state,
                );

                if (stateError) {
                  console.error(
                    "Organization message Realtime error:",
                    stateError,
                  );
                }
              },
          });
      })
      .catch((caught) => {
        setRealtimeState(
          "error",
        );

        console.error(
          "Unable to load organization property references for message Realtime:",
          caught,
        );
      });

    return () => {
      stopped = true;
      unsubscribe?.();
    };
  }, [
    enabled,
    handleRealtimeEvent,
    isOffline,
    refreshOwnership,
  ]);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (
        navigator.onLine
      ) {
        void refreshOwnership();
      }
    };

    const interval =
      window.setInterval(
        refresh,
        60_000,
      );

    window.addEventListener(
      "online",
      refresh,
    );

    window.addEventListener(
      "propertiesUpdated",
      refresh,
    );

    return () => {
      window.clearInterval(
        interval,
      );

      window.removeEventListener(
        "online",
        refresh,
      );

      window.removeEventListener(
        "propertiesUpdated",
        refresh,
      );
    };
  }, [
    enabled,
    refreshOwnership,
  ]);

  const contextValue =
    useMemo<MessageAlertContextValue>(
      () => ({
        realtimeState,
        notificationPermission,
        enableBrowserNotifications,
      }),
      [
        enableBrowserNotifications,
        notificationPermission,
        realtimeState,
      ],
    );

  const showPermissionPrompt =
    enabled &&
    !isOffline &&
    notificationPermission ===
      "default" &&
    !permissionPromptDismissed;

  return (
    <MessageAlertContext.Provider
      value={contextValue}
    >
      {children}

      {showPermissionPrompt && (
        <div className="fixed bottom-4 right-4 z-[95] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl dark:border-blue-900 dark:bg-gray-950">
          <button
            type="button"
            onClick={() =>
              setPermissionPromptDismissed(
                true,
              )
            }
            className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Dismiss message alert prompt"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex gap-3 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <BellRing className="h-5 w-5" />
            </div>

            <div>
              <p className="font-bold text-gray-900 dark:text-white">
                Enable tenant message alerts
              </p>

              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Receive an immediate browser notification whenever a tenant sends your organization a message.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void enableBrowserNotifications()
            }
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Enable message alerts
          </button>
        </div>
      )}
    </MessageAlertContext.Provider>
  );
}

export function useMessageAlerts(): MessageAlertContextValue {
  const context =
    useContext(
      MessageAlertContext,
    );

  if (!context) {
    throw new Error(
      "useMessageAlerts must be used inside MessageAlertProvider.",
    );
  }

  return context;
}
