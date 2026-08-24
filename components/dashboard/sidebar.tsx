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
  Siren,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { Query } from "appwrite";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { useSosAlerts } from "@/contexts/sos-alert-context";
import { databases } from "@/lib/appwrite/config";
import { listOrganizationQueries } from "@/lib/appwrite/helpers";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  offlineEnabled: boolean;
}

interface SidebarProps {
  shell?: boolean;
}

const navigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, offlineEnabled: true },
  { name: "Properties", href: "/dashboard/properties", icon: Home, offlineEnabled: true },
  { name: "Add Property", href: "/dashboard/properties/new", icon: PlusCircle, offlineEnabled: false },
  { name: "Tasks", href: "/dashboard/tasks", icon: Calendar, offlineEnabled: true },
  { name: "Tenants & Requests", href: "/dashboard/tenants", icon: Users, offlineEnabled: false },
  { name: "Drivers", href: "/dashboard/drivers", icon: CarFront, offlineEnabled: false },
  { name: "SOS Calls", href: "/dashboard/sos", icon: Siren, offlineEnabled: false },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare, offlineEnabled: false },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, offlineEnabled: true },
  { name: "Within Us", href: "/dashboard/within-us", icon: Radius, offlineEnabled: true },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, offlineEnabled: true },
];

function getInitialCollapsedState(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("sidebarCollapsed") === "true";
}

function SidebarContent() {
  const pathname = usePathname();
  const { logout, isOffline, organization } = useAuth();
  const { unreadCount: unreadSosCount } = useSosAlerts();

  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsedState);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const orgName = organization?.name || "Organization";
  const orgEmail = organization?.email || "";
  const orgAvatar = organization?.avatar || "";
  const initial = orgName.charAt(0).toUpperCase();

  const visibleNavigationItems = useMemo(
    () =>
      navigationItems.filter((item) => {
        const isSchoolOnly =
          item.href === "/dashboard/drivers" ||
          item.href === "/dashboard/sos" ||
          item.href === "/dashboard/within-us";

        return !isSchoolOnly || organization?.type_of === "school";
      }),
    [organization?.type_of],
  );

  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.nooklySidebarCollapsed =
      isCollapsed ? "true" : "false";

    localStorage.setItem("sidebarCollapsed", String(isCollapsed));

    window.dispatchEvent(
      new CustomEvent("sidebarToggle", {
        detail: { isCollapsed },
      }),
    );

    return () => {
      delete document.documentElement.dataset.nooklySidebarCollapsed;
    };
  }, [isCollapsed]);

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

    const interval = window.setInterval(() => void refreshBadges(), 30_000);
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
          : itemName === "SOS Calls"
            ? unreadSosCount
            : 0;

    if (value <= 0) return null;

    return (
      <span
        className={`ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold text-white ${
          itemName === "SOS Calls" ? "bg-red-500 animate-pulse" : "bg-orange-500"
        }`}
      >
        {value > 99 ? "99+" : value}
      </span>
    );
  };

  const combinedUnread =
    unreadMessages + overdueTasks + unreadSosCount;

  return (
    <>
      {isMobile && !isMobileOpen && (
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="fixed left-3 top-3 z-[70] flex h-10 w-10 items-center justify-center rounded-xl bg-[#081a33] text-white shadow-lg md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {isMobile && isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 md:hidden"
          aria-label="Close navigation"
          onClick={toggleMobileSidebar}
        />
      )}

      <aside
        data-nookly-shell-sidebar="true"
        data-collapsed={isCollapsed ? "true" : "false"}
        data-mobile-open={isMobileOpen ? "true" : "false"}
      >
        <div className="nf-brand">
          <Image
            src="/images/icon.png"
            alt="Nookly"
            width={42}
            height={42}
            className="h-10 w-10 shrink-0 rounded-[13px] object-cover"
          />

          {(!isCollapsed || isMobile) && (
            <div className="nf-brand-copy">
              <p className="nf-brand-name">Nookly</p>
              <p className="nf-brand-subtitle">Organization workspace</p>
            </div>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={toggleMobileSidebar}
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="nf-profile-wrap">
          <div
            className={`nf-profile ${
              isCollapsed && !isMobile ? "justify-center px-2" : ""
            }`}
          >
            <div className="relative shrink-0">
              {orgAvatar ? (
                <div className="h-12 w-12 overflow-hidden rounded-[14px] border-2 border-white/15">
                  <Image
                    src={orgAvatar}
                    alt={orgName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-linear-to-br from-blue-500 to-orange-500 text-lg font-bold text-white">
                  {initial}
                </div>
              )}

              {combinedUnread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#081a33]">
                  {combinedUnread > 99 ? "99+" : combinedUnread}
                </span>
              )}
            </div>

            {(!isCollapsed || isMobile) && (
              <div className="nf-profile-copy">
                <p className="nf-profile-name">{orgName}</p>
                <p className="nf-profile-email">
                  {orgEmail || "Organization account"}
                </p>
              </div>
            )}
          </div>
        </div>

        {isOffline && (
          <div
            className={`mx-3 mt-2 flex items-center gap-2 rounded-xl border border-orange-400/20 bg-orange-400/10 p-2 text-xs text-orange-200 ${
              isCollapsed && !isMobile ? "justify-center" : ""
            }`}
          >
            <WifiOff className="h-4 w-4 shrink-0" />
            {(!isCollapsed || isMobile) && <span>Offline mode</span>}
          </div>
        )}

        <nav className="nf-nav">
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`));

            const disabled =
              isOffline && !item.offlineEnabled;

            return (
              <Link
                key={item.href}
                className={`nf-nav-link ${
                  disabled ? "cursor-not-allowed opacity-35" : ""
                } ${isCollapsed && !isMobile ? "justify-center" : ""}`}
                data-active={active ? "true" : "false"}
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
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />

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

        <div className="nf-sidebar-footer">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/45 transition hover:bg-red-500/10 hover:text-red-200 ${
              isCollapsed && !isMobile ? "justify-center" : ""
            }`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {(!isCollapsed || isMobile) && <span>Sign out</span>}
          </button>

          {!isMobile && (
            <button
              type="button"
              onClick={() => setIsCollapsed((current) => !current)}
              className="mt-1 flex w-full items-center justify-center rounded-xl p-2 text-white/35 transition hover:bg-white/8 hover:text-white"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[22px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Sign out?
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Your organization cache will be cleared from this browser.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {isLoggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Sidebar({ shell = false }: SidebarProps) {
  if (!shell) {
    return null;
  }

  return <SidebarContent />;
}
