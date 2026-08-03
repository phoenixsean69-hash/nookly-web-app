"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  Radius,
  Settings,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Query } from "appwrite";

import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases } from "@/lib/appwrite/config";
import { listOrganizationQueries } from "@/lib/appwrite/helpers";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  offlineEnabled: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    offlineEnabled: true,
  },
  {
    name: "Properties",
    href: "/dashboard/properties",
    icon: Home,
    offlineEnabled: true,
  },
  {
    name: "Add Property",
    href: "/dashboard/properties/new",
    icon: PlusCircle,
    offlineEnabled: false,
  },
  {
    name: "Tasks",
    href: "/dashboard/tasks",
    icon: Calendar,
    offlineEnabled: true,
  },
  {
    name: "Tenants & Requests",
    href: "/dashboard/tenants",
    icon: Users,
    offlineEnabled: false,
  },
  {
    name: "Drivers",
    href: "/dashboard/drivers",
    icon: CarFront,
    offlineEnabled: false,
  },
  {
    name: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
    offlineEnabled: false,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    offlineEnabled: true,
  },
  {
    name: "Within Us",
    href: "/dashboard/within-us",
    icon: Radius,
    offlineEnabled: true,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    offlineEnabled: true,
  },
];

function getInitialCollapsedState(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("sidebarCollapsed") === "true";
}

export function Sidebar() {
  const pathname = usePathname();
  const { logout, isOffline, organization } = useAuth();
  const { resolvedTheme } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsedState);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const dark = resolvedTheme === "dark";

  const visibleNavigationItems = useMemo(
    () =>
      navigationItems.filter((item) => {
        const isSchoolOnlyItem =
          item.href === "/dashboard/drivers" ||
          item.href === "/dashboard/within-us";

        return !isSchoolOnlyItem || organization?.type_of === "school";
      }),
    [organization?.type_of],
  );

  useEffect(() => {
    const updateDeviceMode = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!mobile) {
        setIsMobileOpen(false);
        sessionStorage.removeItem("mobileSidebarOpen");
      }
    };

    updateDeviceMode();
    window.addEventListener("resize", updateDeviceMode);

    return () => window.removeEventListener("resize", updateDeviceMode);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    sessionStorage.setItem("mobileSidebarOpen", "false");
    window.dispatchEvent(
      new CustomEvent("mobileSidebarToggle", {
        detail: { isOpen: false },
      }),
    );
  }, [pathname]);

  const refreshBadges = useCallback(async () => {
    if (!organization) {
      setUnreadMessages(0);
      setOverdueTasks(0);
      return;
    }

    try {
      const [queries, tasks] = await Promise.all([
        listOrganizationQueries(organization.userId, [
          Query.equal("status", "pending"),
        ]),
        databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
          [
            Query.equal("organizationId", organization.$id),
            Query.notEqual("status", "completed"),
            Query.lessThan("dueDate", new Date().toISOString()),
            Query.limit(100),
          ],
        ),
      ]);

      setUnreadMessages(queries.length);
      setOverdueTasks(tasks.total);
    } catch (error) {
      console.error("Unable to refresh sidebar badges:", error);
    }
  }, [organization]);

  useEffect(() => {
    void refreshBadges();

    const interval = window.setInterval(() => {
      void refreshBadges();
    }, 30_000);

    const refresh = () => void refreshBadges();
    window.addEventListener("messagesUpdated", refresh);
    window.addEventListener("tasksUpdated", refresh);
    window.addEventListener("cacheRefreshed", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("messagesUpdated", refresh);
      window.removeEventListener("tasksUpdated", refresh);
      window.removeEventListener("cacheRefreshed", refresh);
    };
  }, [refreshBadges]);

  const sidebarClasses = useMemo(() => {
    if (isMobile) {
      return `fixed inset-y-0 left-0 z-50 w-72 transform ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`;
    }

    return `fixed inset-y-0 left-0 z-40 ${
      isCollapsed ? "w-16" : "w-64"
    }`;
  }, [isCollapsed, isMobile, isMobileOpen]);

  const toggleDesktopSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebarCollapsed", String(next));
    window.dispatchEvent(
      new CustomEvent("sidebarToggle", {
        detail: { isCollapsed: next },
      }),
    );
  };

  const toggleMobileSidebar = () => {
    const next = !isMobileOpen;
    setIsMobileOpen(next);
    sessionStorage.setItem("mobileSidebarOpen", String(next));
    window.dispatchEvent(
      new CustomEvent("mobileSidebarToggle", {
        detail: { isOpen: next },
      }),
    );
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const renderBadge = (itemName: string) => {
    const value =
      itemName === "Messages"
        ? unreadMessages
        : itemName === "Tasks"
          ? overdueTasks
          : 0;

    if (value <= 0) return null;

    return (
      <span className="ml-auto min-w-5 rounded-full bg-orange-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
        {value > 99 ? "99+" : value}
      </span>
    );
  };

  return (
    <>
      {isMobile && (
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="fixed left-4 top-4 z-[60] rounded-xl bg-[var(--accent-500)] p-2.5 text-white shadow-lg md:hidden"
          aria-label="Toggle navigation"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      )}

      {isMobile && isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={toggleMobileSidebar}
          className="fixed inset-0 z-40 bg-black/55 md:hidden"
        />
      )}

      <aside
        className={`${sidebarClasses} flex flex-col overflow-hidden text-white shadow-xl transition-all duration-300 ${
          dark ? "bg-gray-950" : "bg-[#082346]"
        }`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-3">
          <Image
            src="/images/icon.png"
            alt="Nookly"
            width={42}
            height={42}
            className="h-10 w-10 shrink-0 rounded-xl object-cover"
          />

          {(!isCollapsed || isMobile) && (
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">Nookly</p>
              <p className="truncate text-xs text-blue-200">
                Organization Portal
              </p>
            </div>
          )}
        </div>

        {isOffline && (
          <div
            className={`mx-3 mt-3 flex items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-2 text-xs text-yellow-200 ${
              isCollapsed && !isMobile ? "justify-center" : ""
            }`}
          >
            <WifiOff className="h-4 w-4 shrink-0" />
            {(!isCollapsed || isMobile) && <span>Offline mode</span>}
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`));
            const disabled = isOffline && !item.offlineEnabled;

            return (
              <Link
                key={item.href}
                href={disabled ? "#" : item.href}
                onClick={(event) => {
                  if (disabled) {
                    event.preventDefault();
                    return;
                  }

                  if (isMobile) {
                    toggleMobileSidebar();
                  }
                }}
                title={
                  disabled
                    ? "This section requires an internet connection."
                    : isCollapsed && !isMobile
                      ? item.name
                      : undefined
                }
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  disabled
                    ? "cursor-not-allowed opacity-40"
                    : active
                      ? "bg-[var(--accent-500)] text-white shadow-md"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                } ${isCollapsed && !isMobile ? "justify-center" : ""}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {(!isCollapsed || isMobile) && (
                  <>
                    <span className="truncate">{item.name}</span>
                    {renderBadge(item.name)}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-2">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/15 ${
              isCollapsed && !isMobile ? "justify-center" : ""
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {(!isCollapsed || isMobile) && <span>Sign out</span>}
          </button>

          {!isMobile && (
            <button
              type="button"
              onClick={toggleDesktopSidebar}
              className="mt-1 flex w-full items-center justify-center rounded-xl p-2 text-blue-200 transition hover:bg-white/10 hover:text-white"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </aside>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Sign out?
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Your organization cache will be cleared from this browser.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isLoggingOut ? "Signing outâ€¦" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}