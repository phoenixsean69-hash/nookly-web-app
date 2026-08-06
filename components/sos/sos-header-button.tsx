"use client";

import { Siren } from "lucide-react";
import Link from "next/link";

import { useSosAlerts } from "@/contexts/sos-alert-context";

export function SosHeaderButton({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  const { enabled, unreadCount, realtimeState } =
    useSosAlerts();

  if (!enabled) return null;

  const active = unreadCount > 0;
  const connected =
    realtimeState === "connected";

  return (
    <Link
      href="/dashboard/sos"
      className={`relative inline-flex items-center justify-center rounded-lg p-2 transition ${
        active
          ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      }`}
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread student SOS alerts`
          : "Open SOS Control Centre"
      }
      title={
        connected
          ? "SOS realtime monitoring is connected"
          : "Open SOS Control Centre"
      }
    >
      <Siren
        className={`h-5 w-5 ${
          active ? "animate-pulse" : ""
        }`}
      />

      {unreadCount > 0 && (
        <span
          className={`absolute flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black leading-4 text-white ${
            mobile
              ? "-right-0.5 -top-0.5"
              : "-right-1 -top-1"
          }`}
        >
          {unreadCount > 99
            ? "99+"
            : unreadCount}
        </span>
      )}

      {connected && unreadCount === 0 && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full border border-white bg-emerald-500 dark:border-gray-900" />
      )}
    </Link>
  );
}
