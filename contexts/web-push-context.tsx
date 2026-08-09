"use client";

import {
  BellRing,
  CheckCircle2,
  CircleAlert,
  Loader2,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ReactNode,
} from "react";
import toast from "react-hot-toast";

import { useAuth } from "@/contexts/auth-context";
import {
  enableWebPushForCurrentBrowser,
  hasRegisteredWebPush,
  sendCurrentUserWebPushTest,
  synchronizeExistingWebPushSubscription,
  webPushIsSupported,
} from "@/lib/web-push.service";
import type {
  WebPushRegistrationState,
} from "@/types/web-push";

interface WebPushContextValue {
  state: WebPushRegistrationState;
  registered: boolean;
  error: string;
  enable: () => Promise<boolean>;
}

const WebPushContext =
  createContext<WebPushContextValue | null>(
    null,
  );

export function WebPushProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    organization,
    isOffline,
  } = useAuth();

  const [state, setState] =
    useState<WebPushRegistrationState>(
      "checking",
    );

  const [error, setError] =
    useState("");

  const [dismissed, setDismissed] =
    useState(false);

  const userId =
    user?.$id?.trim() || "";

  const enabled = Boolean(
    userId && organization,
  );

  const registerExisting =
    useCallback(async () => {
      if (!enabled) {
        setState("checking");
        setError("");
        return;
      }

      if (!webPushIsSupported()) {
        setState("unsupported");
        return;
      }

      if (
        isOffline ||
        !navigator.onLine
      ) {
        setState(
          hasRegisteredWebPush(
            userId,
          )
            ? "registered"
            : "unregistered",
        );
        return;
      }

      if (
        Notification.permission ===
        "denied"
      ) {
        setState("blocked");
        return;
      }

      setState("checking");

      try {
        const synchronized =
          await synchronizeExistingWebPushSubscription(
            userId,
          );

        setState(
          synchronized
            ? "registered"
            : "unregistered",
        );

        setError("");
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Unable to synchronize browser push notifications.";

        setError(message);
        setState("error");
      }
    }, [
      enabled,
      isOffline,
      userId,
    ]);

  useEffect(() => {
    void registerExisting();
  }, [registerExisting]);

  useEffect(() => {
    if (!enabled) return;

    const synchronize = () => {
      if (navigator.onLine) {
        void registerExisting();
      }
    };

    window.addEventListener(
      "online",
      synchronize,
    );

    document.addEventListener(
      "visibilitychange",
      synchronize,
    );

    const interval =
      window.setInterval(
        synchronize,
        5 * 60_000,
      );

    return () => {
      window.removeEventListener(
        "online",
        synchronize,
      );

      document.removeEventListener(
        "visibilitychange",
        synchronize,
      );

      window.clearInterval(
        interval,
      );
    };
  }, [
    enabled,
    registerExisting,
  ]);

  const enable =
    useCallback(async (): Promise<boolean> => {
      if (!userId) {
        toast.error(
          "Sign in to your organization account first.",
        );
        return false;
      }

      setState("registering");
      setError("");

      try {
        await enableWebPushForCurrentBrowser(
          userId,
        );

        setState("registered");
        setDismissed(true);

        toast.success(
          "All Nookly browser push notifications are enabled.",
        );

        // Send a real server-originated Web Push immediately so setup
        // can be confirmed before waiting for a tenant action.
        await sendCurrentUserWebPushTest();

        return true;
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Unable to enable browser push notifications.";

        setError(message);

        setState(
          typeof Notification !==
            "undefined" &&
          Notification.permission ===
            "denied"
            ? "blocked"
            : "error",
        );

        toast.error(message);

        return false;
      }
    }, [userId]);

  const value =
    useMemo<WebPushContextValue>(
      () => ({
        state,
        registered:
          state === "registered",
        error,
        enable,
      }),
      [
        enable,
        error,
        state,
      ],
    );

  const showPrompt =
    enabled &&
    !isOffline &&
    !dismissed &&
    (
      state === "unregistered" ||
      state === "blocked" ||
      state === "error" ||
      state === "registering"
    );

  return (
    <WebPushContext.Provider
      value={value}
    >
      {children}

      {showPrompt && (
        <section
          className="fixed z-[10020] overflow-hidden rounded-2xl border border-white/10 bg-[#030712] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          style={{
            top: "96px",
            right: "clamp(16px, 1.5vw, 24px)",
            width: "min(420px, calc(100vw - 32px))",
            maxWidth: "420px",
          }}
        >

          <button
            type="button"
            onClick={() =>
              setDismissed(true)
            }
            className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-500 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss push notification prompt"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-5 pr-11">
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                state === "blocked" ||
                state === "error"
                  ? "bg-red-500/15 text-red-300"
                  : "bg-[#B45309]/20 text-orange-300"
              }`}>
                {state === "blocked" ||
                state === "error" ? (
                  <CircleAlert className="h-5 w-5" />
                ) : (
                  <BellRing className="h-5 w-5" />
                )}
              </div>

              <div>
                <h2 className="pr-4 font-black text-white">
                  {state === "blocked"
                    ? "Browser push is blocked"
                    : "Enable all Nookly push notifications"}
                </h2>

                <p className="mt-1.5 text-sm leading-5 text-gray-300">
                  {state === "blocked"
                    ? "Allow notifications in this site's browser settings, reload Nookly, then enable push."
                    : "Receive property reviews, tenant messages, requests, SOS alerts and other organization notifications even when this tab is not active."}
                </p>

                {error && (
                  <p className="mt-2 text-xs font-semibold text-red-300">
                    {error}
                  </p>
                )}
              </div>
            </div>

            {state !== "blocked" && (
              <button
                type="button"
                onClick={() =>
                  void enable()
                }
                disabled={
                  state ===
                  "registering"
                }
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-[#B45309] bg-transparent px-4 py-3 text-sm font-black text-white transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:ring-offset-2 focus:ring-offset-[#030712] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state ===
                "registering" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering browser…
                  </>
                ) : (
                  "Enable all push notifications"
                )}
              </button>
            )}
          </div>
        </section>
      )}

      {state === "registered" &&
        false && (
          <span>
            <CheckCircle2 />
          </span>
        )}
    </WebPushContext.Provider>
  );
}

export function useWebPush(): WebPushContextValue {
  const context =
    useContext(WebPushContext);

  if (!context) {
    throw new Error(
      "useWebPush must be used inside WebPushProvider.",
    );
  }

  return context;
}
