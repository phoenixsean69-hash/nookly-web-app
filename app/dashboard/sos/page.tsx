"use client";

import {
  Activity,
  Bell,
  BellOff,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  HeartPulse,
  LocateFixed,
  Mail,
  MapPin,
  Phone,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Siren,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import toast from "react-hot-toast";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import {
  SosLocationMapModal,
  SosLocationMapPreview,
} from "@/components/sos/sos-location-map";
import { useAuth } from "@/contexts/auth-context";
import { useSosAlerts } from "@/contexts/sos-alert-context";
import { useTheme } from "@/contexts/theme-context";
import type {
  SosRealtimeState,
  StudentSosAlert,
} from "@/types/sos-alert";

type SosFilter =
  | "all"
  | "unseen"
  | "seen";

function useDashboardMargin(): string {
  const [collapsed, setCollapsed] =
    useState(false);
  const [mobile, setMobile] =
    useState(false);

  useEffect(() => {
    const update = () => {
      setMobile(
        window.innerWidth < 768,
      );
      setCollapsed(
        localStorage.getItem(
          "sidebarCollapsed",
        ) === "true",
      );
    };

    const handleToggle = (
      event: Event,
    ) => {
      const detail = (
        event as CustomEvent<{
          isCollapsed?: boolean;
        }>
      ).detail;

      setCollapsed(
        detail?.isCollapsed ??
          localStorage.getItem(
            "sidebarCollapsed",
          ) === "true",
      );
    };

    update();

    window.addEventListener(
      "resize",
      update,
    );
    window.addEventListener(
      "storage",
      update,
    );
    window.addEventListener(
      "sidebarToggle",
      handleToggle,
    );

    return () => {
      window.removeEventListener(
        "resize",
        update,
      );
      window.removeEventListener(
        "storage",
        update,
      );
      window.removeEventListener(
        "sidebarToggle",
        handleToggle,
      );
    };
  }, []);

  if (mobile) return "ml-0";
  return collapsed ? "ml-16" : "ml-64";
}

function validDate(
  value: string,
): Date | null {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function alertTimestamp(
  alert: StudentSosAlert,
): number {
  const candidates = [
    alert.reportedAt,
    alert.createdAt,
    alert.capturedAt,
    alert.updatedAt,
  ];

  for (const value of candidates) {
    const date = validDate(value);

    if (date) {
      return date.getTime();
    }
  }

  return 0;
}

function sortNewestFirst(
  alerts: StudentSosAlert[],
): StudentSosAlert[] {
  return [...alerts].sort(
    (first, second) => {
      const timeDifference =
        alertTimestamp(second) -
        alertTimestamp(first);

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return second.notificationId.localeCompare(
        first.notificationId,
      );
    },
  );
}

function formatDateTime(
  value: string,
): string {
  const date = validDate(value);

  if (!date) {
    return "Not available";
  }

  return date.toLocaleString(
    "en-ZW",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function formatRelativeTime(
  value: string,
): string {
  const date = validDate(value);

  if (!date) {
    return "Time unavailable";
  }

  const difference = Math.max(
    0,
    Date.now() - date.getTime(),
  );

  const minutes = Math.floor(
    difference / 60_000,
  );
  const hours = Math.floor(
    difference / 3_600_000,
  );
  const days = Math.floor(
    difference / 86_400_000,
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  return `${days} day${
    days === 1 ? "" : "s"
  } ago`;
}

function initials(
  name: string,
): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part.charAt(0),
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function incidentIcon(
  incidentType: string,
): LucideIcon {
  switch (incidentType) {
    case "medical_emergency":
      return HeartPulse;

    case "robbery":
    case "burglary":
    case "assault_or_threat":
    case "being_followed":
      return ShieldAlert;

    case "unsafe_transport":
      return Siren;

    default:
      return CircleAlert;
  }
}

function locationParts(
  alert: StudentSosAlert,
): {
  name: string;
  detail: string;
} {
  const parts = alert.address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    name:
      parts[0] ||
      "Reported GPS location",
    detail:
      parts.slice(1).join(", ") ||
      (alert.accuracy !== null
        ? `Accuracy about ${Math.round(
            alert.accuracy,
          )} metres`
        : "Location supplied by the student"),
  };
}

function realtimeMeta(
  state: SosRealtimeState,
): {
  label: string;
  className: string;
  icon: LucideIcon;
} {
  switch (state) {
    case "connected":
      return {
        label: "Live connection",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
        icon: Radio,
      };

    case "connecting":
      return {
        label: "Connecting…",
        className:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
        icon: Activity,
      };

    case "offline":
      return {
        label: "Offline",
        className:
          "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
        icon: WifiOff,
      };

    case "error":
      return {
        label: "Connection problem",
        className:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
        icon: CircleAlert,
      };

    default:
      return {
        label: "Monitoring unavailable",
        className:
          "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
        icon: CircleAlert,
      };
  }
}

export default function SosControlCentrePage() {
  return (
    <Suspense
      fallback={<SosPageFallback />}
    >
      <SosControlCentreContent />
    </Suspense>
  );
}

function SosPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <div className="text-center">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-700 border-t-red-500" />
        <p className="mt-4 text-sm font-bold">
          Opening SOS Control Centre…
        </p>
      </div>
    </div>
  );
}

function SosControlCentreContent() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const { organization } =
    useAuth();

  const { resolvedTheme } =
    useTheme();

  const margin =
    useDashboardMargin();

  const {
    alerts,
    unreadCount,
    loading,
    refreshing,
    realtimeState,
    error,
    notificationPermission,
    refreshAlerts,
    markAsRead,
    markAllAsRead,
    enableBrowserNotifications,
  } = useSosAlerts();

  const [
    selectedAlertId,
    setSelectedAlertId,
  ] = useState("");

  const [
    mapAlertId,
    setMapAlertId,
  ] = useState<string | null>(
    null,
  );

  const [
    activeFilter,
    setActiveFilter,
  ] = useState<SosFilter>(
    "all",
  );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    markingSeenId,
    setMarkingSeenId,
  ] = useState<string | null>(
    null,
  );

  const dark =
    resolvedTheme === "dark";

  const organizationName =
    organization?.name ||
    "University";

  const sortedAlerts =
    useMemo(
      () =>
        sortNewestFirst(alerts),
      [alerts],
    );

  useEffect(() => {
    if (
      sortedAlerts.length === 0
    ) {
      setSelectedAlertId("");
      setMapAlertId(null);
      return;
    }

    const requestedId =
      searchParams.get("alert");

    const requestedAlert =
      requestedId
        ? sortedAlerts.find(
            (alert) =>
              alert.notificationId ===
                requestedId ||
              alert.alertId ===
                requestedId,
          )
        : null;

    setSelectedAlertId(
      (currentId) => {
        const currentStillExists =
          sortedAlerts.some(
            (alert) =>
              alert.notificationId ===
              currentId,
          );

        if (requestedAlert) {
          return requestedAlert.notificationId;
        }

        if (currentStillExists) {
          return currentId;
        }

        return sortedAlerts[0]
          .notificationId;
      },
    );

    if (
      searchParams.get("map") ===
      "1"
    ) {
      const target =
        requestedAlert ||
        sortedAlerts[0];

      if (
        target.latitude !== null &&
        target.longitude !== null
      ) {
        setMapAlertId(
          target.notificationId,
        );
      }
    }
  }, [
    searchParams,
    sortedAlerts,
  ]);

  const selectedAlert =
    sortedAlerts.find(
      (alert) =>
        alert.notificationId ===
        selectedAlertId,
    ) || null;

  const mapAlert =
    sortedAlerts.find(
      (alert) =>
        alert.notificationId ===
        mapAlertId,
    ) || null;

  const newestAlert =
    sortedAlerts[0] || null;

  const counts = useMemo(
    () => ({
      total:
        sortedAlerts.length,
      unseen:
        sortedAlerts.filter(
          (alert) =>
            !alert.read,
        ).length,
      seen:
        sortedAlerts.filter(
          (alert) =>
            alert.read,
        ).length,
      today:
        sortedAlerts.filter(
          (alert) => {
            const date = validDate(
              alert.reportedAt ||
                alert.createdAt,
            );

            const today =
              new Date();

            return Boolean(
              date &&
                date.getFullYear() ===
                  today.getFullYear() &&
                date.getMonth() ===
                  today.getMonth() &&
                date.getDate() ===
                  today.getDate(),
            );
          },
        ).length,
    }),
    [sortedAlerts],
  );

  const filteredAlerts =
    useMemo(() => {
      const normalized =
        searchTerm
          .trim()
          .toLowerCase();

      return sortedAlerts.filter(
        (alert) => {
          const filterMatches =
            activeFilter ===
              "all" ||
            (activeFilter ===
              "unseen" &&
              !alert.read) ||
            (activeFilter ===
              "seen" &&
              alert.read);

          if (!filterMatches) {
            return false;
          }

          if (!normalized) {
            return true;
          }

          return [
            alert.alertId,
            alert.studentName,
            alert.studentId,
            alert.incidentLabel,
            alert.address,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalized);
        },
      );
    }, [
      activeFilter,
      searchTerm,
      sortedAlerts,
    ]);

  const selectAlert = (
    alert: StudentSosAlert,
  ) => {
    setSelectedAlertId(
      alert.notificationId,
    );

    router.replace(
      `/dashboard/sos?alert=${encodeURIComponent(
        alert.notificationId,
      )}`,
      {
        scroll: false,
      },
    );
  };

  const openMap = (
    alert: StudentSosAlert,
  ) => {
    if (
      alert.latitude === null ||
      alert.longitude === null
    ) {
      toast.error(
        "This SOS has no valid map coordinates.",
      );
      return;
    }

    setSelectedAlertId(
      alert.notificationId,
    );

    setMapAlertId(
      alert.notificationId,
    );

    router.replace(
      `/dashboard/sos?alert=${encodeURIComponent(
        alert.notificationId,
      )}&map=1`,
      {
        scroll: false,
      },
    );
  };

  const closeMap = () => {
    setMapAlertId(null);

    if (selectedAlert) {
      router.replace(
        `/dashboard/sos?alert=${encodeURIComponent(
          selectedAlert.notificationId,
        )}`,
        {
          scroll: false,
        },
      );
    } else {
      router.replace(
        "/dashboard/sos",
        {
          scroll: false,
        },
      );
    }
  };

  const markAlertSeen =
    async (
      alert: StudentSosAlert,
    ) => {
      if (alert.read) {
        return;
      }

      setMarkingSeenId(
        alert.notificationId,
      );

      try {
        await markAsRead(
          alert.notificationId,
        );

        toast.success(
          `${alert.studentName}'s SOS marked as seen.`,
        );
      } catch (caught) {
        toast.error(
          caught instanceof Error
            ? caught.message
            : "Unable to mark this SOS as seen.",
        );
      } finally {
        setMarkingSeenId(null);
      }
    };

  const handleEnableBrowserAlerts =
    async () => {
      const granted =
        await enableBrowserNotifications();

      if (granted) {
        toast.success(
          "Browser SOS alerts enabled.",
        );
      } else {
        toast.error(
          "Browser notifications were not enabled.",
        );
      }
    };

  if (
    organization &&
    organization.type_of !==
      "school"
  ) {
    return (
      <ProtectedRoute>
        <div
          className={`min-h-screen ${
            dark
              ? "bg-gray-950 text-white"
              : "bg-gray-50 text-gray-900"
          }`}
        >
          <Sidebar />

          <div
            className={`${margin} transition-all duration-300`}
          >
            <Header />

            <main className="flex min-h-[75vh] items-center justify-center p-5">
              <div className="max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <ShieldAlert className="mx-auto h-12 w-12 text-gray-400" />

                <h1 className="mt-4 text-2xl font-black">
                  SOS Control Centre unavailable
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  This emergency workspace
                  is available to university
                  and school organizations.
                </p>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const realtime =
    realtimeMeta(
      realtimeState,
    );

  const RealtimeIcon =
    realtime.icon;

  return (
    <ProtectedRoute>
      <div
        className={`min-h-screen ${
          dark
            ? "bg-gray-950 text-white"
            : "bg-gray-50 text-gray-900"
        }`}
      >
        <Sidebar />

        <div
          className={`${margin} transition-all duration-300`}
        >
          <Header />

          <main className="p-3 sm:p-5 lg:p-6">
            <div className="mx-auto max-w-[1500px]">
              <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20">
                      <Siren className="h-7 w-7" />

                      {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-red-600 dark:border-gray-900" />
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-black sm:text-3xl">
                          SOS Control Centre
                        </h1>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${realtime.className}`}
                        >
                          <RealtimeIcon className="h-3.5 w-3.5" />
                          {realtime.label}
                        </span>
                      </div>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                        Live student emergencies
                        for {organizationName}.
                        The newest SOS is always
                        placed first.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          void markAllAsRead().catch(
                            (caught) =>
                              toast.error(
                                caught instanceof
                                  Error
                                  ? caught.message
                                  : "Unable to mark all SOS alerts as seen.",
                              ),
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark all seen
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        void refreshAlerts()
                      }
                      disabled={refreshing}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-700)] px-3 py-2.5 text-xs font-black text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          refreshing
                            ? "animate-spin"
                            : ""
                        }`}
                      />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="grid gap-px border-t border-gray-200 bg-gray-200 dark:border-gray-800 dark:bg-gray-800 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    icon={Bell}
                    label="Needs attention"
                    value={counts.unseen}
                    hint="Unseen student SOS"
                    critical
                  />

                  <SummaryCard
                    icon={Clock3}
                    label="Received today"
                    value={counts.today}
                    hint="SOS reports today"
                  />

                  <SummaryCard
                    icon={Eye}
                    label="Seen"
                    value={counts.seen}
                    hint="Reviewed records"
                  />

                  <SummaryCard
                    icon={Siren}
                    label="All cases"
                    value={counts.total}
                    hint="Newest first"
                  />
                </div>
              </section>

              {notificationPermission !==
                "granted" &&
                notificationPermission !==
                  "unsupported" && (
                  <section
                    className={`mt-4 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      notificationPermission ===
                      "denied"
                        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25"
                        : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/25"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {notificationPermission ===
                      "denied" ? (
                        <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                      ) : (
                        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                      )}

                      <div>
                        <p className="text-sm font-black">
                          {notificationPermission ===
                          "denied"
                            ? "Browser SOS alerts are blocked"
                            : "Enable browser SOS alerts"}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
                          {notificationPermission ===
                          "denied"
                            ? "Allow notifications in this site's browser settings. Realtime dashboard alerts and the buzzer will still work while Nookly is active."
                            : "Receive the SOS popup and open its exact map while working in another browser tab."}
                        </p>
                      </div>
                    </div>

                    {notificationPermission ===
                      "default" && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleEnableBrowserAlerts()
                        }
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-700"
                      >
                        <Bell className="h-4 w-4" />
                        Enable alerts
                      </button>
                    )}
                  </section>
                )}

              {error && (
                <section className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/25">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                    <div>
                      <p className="text-sm font-black text-red-800 dark:text-red-200">
                        SOS connection problem
                      </p>

                      <p className="mt-1 text-xs leading-5 text-red-700 dark:text-red-300">
                        {error}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <section className="mt-5 grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
                <aside className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-black">
                          Emergency queue
                        </h2>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          Newest SOS first
                        </p>
                      </div>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black dark:bg-gray-800">
                        {filteredAlerts.length}
                      </span>
                    </div>

                    <label className="relative mt-4 block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                      <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) =>
                          setSearchTerm(
                            event.target.value,
                          )
                        }
                        placeholder="Search student, case or location…"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-500)]/15 dark:border-gray-700 dark:bg-gray-950"
                      />

                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() =>
                            setSearchTerm("")
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                          aria-label="Clear SOS search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </label>

                    <div className="mt-3 flex gap-2">
                      {(
                        [
                          {
                            id: "all",
                            label: "All",
                            count:
                              counts.total,
                          },
                          {
                            id: "unseen",
                            label: "Unseen",
                            count:
                              counts.unseen,
                          },
                          {
                            id: "seen",
                            label: "Seen",
                            count:
                              counts.seen,
                          },
                        ] as Array<{
                          id: SosFilter;
                          label: string;
                          count: number;
                        }>
                      ).map(
                        (filter) => (
                          <button
                            key={filter.id}
                            type="button"
                            onClick={() =>
                              setActiveFilter(
                                filter.id,
                              )
                            }
                            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition ${
                              activeFilter ===
                              filter.id
                                ? "border-[var(--accent-700)] bg-[var(--accent-700)] text-white"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                            }`}
                          >
                            {filter.label}

                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                                activeFilter ===
                                filter.id
                                  ? "bg-white/20 text-white"
                                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300"
                              }`}
                            >
                              {filter.count}
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="max-h-[930px] space-y-3 overflow-y-auto p-3">
                    {loading ? (
                      <QueueLoading />
                    ) : filteredAlerts.length >
                      0 ? (
                      filteredAlerts.map(
                        (alert) => (
                          <SosCaseCard
                            key={
                              alert.notificationId
                            }
                            alert={alert}
                            selected={
                              alert.notificationId ===
                              selectedAlert?.notificationId
                            }
                            newest={
                              alert.notificationId ===
                              newestAlert?.notificationId
                            }
                            onSelect={() =>
                              selectAlert(
                                alert,
                              )
                            }
                            onOpenMap={() =>
                              openMap(alert)
                            }
                          />
                        ),
                      )
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                        <Siren className="mx-auto h-9 w-9 text-gray-300 dark:text-gray-600" />

                        <p className="mt-3 text-sm font-black">
                          {sortedAlerts.length ===
                          0
                            ? "No student SOS records yet"
                            : "No matching SOS cases"}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          {sortedAlerts.length ===
                          0
                            ? "New SOS reports will appear here immediately."
                            : "Change the filter or clear the search."}
                        </p>
                      </div>
                    )}
                  </div>
                </aside>

                {selectedAlert ? (
                  <SelectedSosCase
                    alert={selectedAlert}
                    newest={
                      selectedAlert.notificationId ===
                      newestAlert?.notificationId
                    }
                    markingSeen={
                      markingSeenId ===
                      selectedAlert.notificationId
                    }
                    onOpenMap={() =>
                      openMap(
                        selectedAlert,
                      )
                    }
                    onMarkSeen={() =>
                      void markAlertSeen(
                        selectedAlert,
                      )
                    }
                  />
                ) : (
                  <section className="flex min-h-[520px] items-center justify-center rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div>
                      <Siren className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />

                      <h2 className="mt-4 text-xl font-black">
                        No SOS case selected
                      </h2>

                      <p className="mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
                        Select an emergency
                        from the newest-first
                        queue.
                      </p>
                    </div>
                  </section>
                )}
              </section>
            </div>
          </main>
        </div>

        {mapAlert &&
          mapAlert.latitude !==
            null &&
          mapAlert.longitude !==
            null && (
            <SosLocationMapModal
              isOpen
              onClose={closeMap}
              latitude={
                mapAlert.latitude
              }
              longitude={
                mapAlert.longitude
              }
              title={`${mapAlert.studentName} · ${mapAlert.alertId}`}
              locationName={
                locationParts(
                  mapAlert,
                ).name
              }
              locationDetail={
                locationParts(
                  mapAlert,
                ).detail
              }
              statusLabel={
                mapAlert.read
                  ? "Seen"
                  : "New SOS"
              }
              isSeen={mapAlert.read}
              isMarkingSeen={
                markingSeenId ===
                mapAlert.notificationId
              }
              onMarkSeen={() =>
                markAlertSeen(
                  mapAlert,
                )
              }
            />
          )}
      </div>
    </ProtectedRoute>
  );
}

function SelectedSosCase({
  alert,
  newest,
  markingSeen,
  onOpenMap,
  onMarkSeen,
}: {
  alert: StudentSosAlert;
  newest: boolean;
  markingSeen: boolean;
  onOpenMap: () => void;
  onMarkSeen: () => void;
}) {
  const Icon =
    incidentIcon(
      alert.incidentType,
    );

  const location =
    locationParts(alert);

  const hasMap =
    alert.latitude !== null &&
    alert.longitude !== null;

  return (
    <section className="space-y-5">
      <article
        className={`overflow-hidden rounded-3xl border bg-white shadow-sm dark:bg-gray-900 ${
          alert.read
            ? "border-gray-200 dark:border-gray-800"
            : "border-red-300 dark:border-red-900"
        }`}
      >
        <div
          className={`p-5 sm:p-6 ${
            alert.read
              ? ""
              : "bg-red-50/70 dark:bg-red-950/20"
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                  alert.read
                    ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    : "bg-red-600 text-white shadow-lg shadow-red-600/20"
                }`}
              >
                <Icon className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {newest && (
                    <span className="rounded-full bg-red-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white">
                      Latest SOS
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${
                      alert.read
                        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        alert.read
                          ? "bg-blue-500"
                          : "animate-pulse bg-red-500"
                      }`}
                    />
                    {alert.read
                      ? "Seen"
                      : "Needs attention"}
                  </span>
                </div>

                <h2 className="mt-3 text-2xl font-black">
                  {alert.incidentLabel}
                </h2>

                <p className="mt-1 text-sm font-bold text-gray-600 dark:text-gray-300">
                  {alert.studentName}
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Reported{" "}
                  {formatRelativeTime(
                    alert.reportedAt ||
                      alert.createdAt,
                  )}{" "}
                  ·{" "}
                  {formatDateTime(
                    alert.reportedAt ||
                      alert.createdAt,
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {hasMap && (
                <button
                  type="button"
                  onClick={onOpenMap}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-black transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <MapPin className="h-4 w-4" />
                  Open map
                </button>
              )}

              <button
                type="button"
                onClick={onMarkSeen}
                disabled={
                  alert.read ||
                  markingSeen
                }
                className={`inline-flex min-w-[145px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition disabled:cursor-not-allowed ${
                  alert.read
                    ? "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                    : "bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                }`}
              >
                {markingSeen ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : alert.read ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Seen
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Mark as seen
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
              Student's emergency message
            </p>

            <p className="mt-2 text-sm font-semibold leading-6 text-gray-800 dark:text-gray-100">
              {alert.message}
            </p>
          </div>
        </div>

        <div className="grid gap-px border-t border-gray-200 bg-gray-200 dark:border-gray-800 dark:bg-gray-800 sm:grid-cols-2 xl:grid-cols-4">
          <QuickDetail
            icon={UserRound}
            label="Student"
            value={alert.studentName}
            hint={
              alert.studentId ||
              "ID not supplied"
            }
          />

          <QuickDetail
            icon={Phone}
            label="Phone"
            value={
              alert.studentPhone ||
              "Not supplied"
            }
            hint="Student contact"
          />

          <QuickDetail
            icon={MapPin}
            label="Location"
            value={location.name}
            hint={location.detail}
          />

          <QuickDetail
            icon={LocateFixed}
            label="GPS accuracy"
            value={
              alert.accuracy !==
              null
                ? `About ${Math.round(
                    alert.accuracy,
                  )} metres`
                : "Not supplied"
            }
            hint={formatDateTime(
              alert.capturedAt,
            )}
          />
        </div>
      </article>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LocateFixed className="h-5 w-5 text-red-600" />

                <h3 className="font-black">
                  Exact emergency location
                </h3>
              </div>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {alert.address}
              </p>
            </div>

            {hasMap && (
              <button
                type="button"
                onClick={onOpenMap}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-700)] px-4 py-2.5 text-xs font-black text-white transition hover:opacity-90"
              >
                <MapPin className="h-4 w-4" />
                Full map
              </button>
            )}
          </div>

          {hasMap ? (
            <>
              <SosLocationMapPreview
                key={
                  alert.notificationId
                }
                latitude={
                  alert.latitude!
                }
                longitude={
                  alert.longitude!
                }
                title={`${alert.studentName} SOS`}
                locationName={
                  location.name
                }
                locationDetail={
                  location.detail
                }
              />

              <div className="grid gap-px border-t border-gray-200 bg-gray-200 dark:border-gray-800 dark:bg-gray-800 sm:grid-cols-2">
                <div className="bg-white p-4 dark:bg-gray-900">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                    Coordinates
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {alert.latitude},{" "}
                    {alert.longitude}
                  </p>
                </div>

                <div className="bg-white p-4 dark:bg-gray-900">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                    Location captured
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {formatDateTime(
                      alert.capturedAt,
                    )}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="p-10 text-center">
              <MapPin className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />

              <p className="mt-3 text-sm font-black">
                No valid coordinates
              </p>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The SOS record has no
                usable latitude and
                longitude pair.
              </p>
            </div>
          )}
        </article>

        <div className="space-y-5">
          <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-100)] font-black text-[var(--accent-700)] dark:bg-[var(--accent-950)]/50">
                {initials(
                  alert.studentName,
                )}
              </div>

              <div>
                <h3 className="font-black">
                  Contact student
                </h3>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Immediate follow-up
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {alert.studentPhone ? (
                <a
                  href={`tel:${alert.studentPhone}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700"
                >
                  <Phone className="h-4 w-4" />
                  Call{" "}
                  {alert.studentName}
                </a>
              ) : (
                <div className="rounded-xl bg-gray-100 px-4 py-3 text-center text-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  Phone not supplied
                </div>
              )}

              {alert.studentEmail && (
                <a
                  href={`mailto:${alert.studentEmail}?subject=${encodeURIComponent(
                    `Follow-up on ${alert.alertId}`,
                  )}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-black transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <Mail className="h-4 w-4" />
                  Email student
                </a>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="font-black">
              Case details
            </h3>

            <div className="mt-4 space-y-3">
              <RecordRow
                label="SOS case"
                value={
                  alert.alertId
                }
              />

              <RecordRow
                label="Emergency type"
                value={
                  alert.incidentLabel
                }
              />

              <RecordRow
                label="Institution"
                value={
                  alert.organizationName ||
                  "Linked institution"
                }
              />

              <RecordRow
                label="Reported"
                value={formatDateTime(
                  alert.reportedAt ||
                    alert.createdAt,
                )}
              />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function SosCaseCard({
  alert,
  selected,
  newest,
  onSelect,
  onOpenMap,
}: {
  alert: StudentSosAlert;
  selected: boolean;
  newest: boolean;
  onSelect: () => void;
  onOpenMap: () => void;
}) {
  const Icon =
    incidentIcon(
      alert.incidentType,
    );

  const location =
    locationParts(alert);

  const hasMap =
    alert.latitude !== null &&
    alert.longitude !== null;

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-l-4 transition ${
        alert.read
          ? "border-l-gray-300 dark:border-l-gray-700"
          : "border-l-red-600"
      } ${
        selected
          ? "border-[var(--accent-300)] bg-[var(--accent-50)] shadow-sm dark:border-[var(--accent-800)] dark:bg-[var(--accent-950)]/25"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              alert.read
                ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                : "bg-red-600 text-white"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate font-black">
                    {alert.studentName}
                  </p>

                  {newest && (
                    <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white">
                      Latest
                    </span>
                  )}
                </div>

                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                  {alert.studentId ||
                    alert.alertId}
                </p>
              </div>

              <span className="shrink-0 text-[10px] font-bold text-gray-400">
                {formatRelativeTime(
                  alert.reportedAt ||
                    alert.createdAt,
                )}
              </span>
            </div>

            <p className="mt-3 text-xs font-black">
              {alert.incidentLabel}
            </p>

            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
              {alert.message}
            </p>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span
                className={`rounded-full border px-2 py-1 text-[9px] font-bold ${
                  alert.read
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                }`}
              >
                {alert.read
                  ? "Seen"
                  : "Needs attention"}
              </span>

              <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
            </div>
          </div>
        </div>
      </button>

      <div className="border-t border-gray-200 bg-white/70 p-3 dark:border-gray-800 dark:bg-gray-900/60">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black">
              {location.name}
            </p>

            <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-gray-500 dark:text-gray-400">
              {location.detail}
            </p>
          </div>

          {hasMap && (
            <button
              type="button"
              onClick={onOpenMap}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-[10px] font-black transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              Map
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function QueueLoading() {
  return (
    <div className="space-y-3">
      {Array.from({
        length: 4,
      }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
        >
          <div className="flex gap-3">
            <div className="h-11 w-11 rounded-xl bg-gray-200 dark:bg-gray-800" />

            <div className="flex-1">
              <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-2 h-2.5 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-4 h-2.5 w-full rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-2 h-2.5 w-4/5 rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  critical = false,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  critical?: boolean;
}) {
  return (
    <article className="bg-white p-5 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-gray-400">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-black ${
              critical
                ? "text-red-600 dark:text-red-400"
                : ""
            }`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        </div>

        <div
          className={`rounded-xl p-2.5 ${
            critical
              ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function QuickDetail({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="bg-white p-4 dark:bg-gray-900">
      <Icon className="h-4 w-4 text-[var(--accent-700)]" />

      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 line-clamp-2 text-sm font-black">
        {value}
      </p>

      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500 dark:text-gray-400">
        {hint}
      </p>
    </article>
  );
}

function RecordRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/60">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-black">
        {value}
      </p>
    </div>
  );
}
