"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import {
  LayoutDashboard,
  Home,
  PlusCircle,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Calendar,
  WifiOff,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  Radius
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

// Helper to get initial state from localStorage
const getInitialCollapsedState = (): boolean => {
  if (typeof window !== 'undefined') {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState === 'true';
  }
  return false;
};

export function Sidebar() {
  const pathname = usePathname();
  const { logout, isOffline, organization } = useAuth();
  const { theme } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsedState);
  const isFirstRender = useRef(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [isTasksFlashing, setIsTasksFlashing] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Function to fetch unread messages
  const fetchUnreadMessages = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID!,
        [
          Query.equal("status", "pending"),
          Query.limit(100),
        ]
      );
      
      const count = response.documents.length;
      setUnreadMessages(count);
      setIsFlashing(count > 0);
    } catch (error) {
      console.error("Error fetching unread messages:", error);
    }
  }, []);

  // Function to fetch overdue tasks
  const fetchOverdueTasks = useCallback(async () => {
    try {
      if (!organization?.$id) {
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
        [
          Query.equal("organizationId", organization.$id),
          Query.notEqual("status", "completed"),
          Query.lessThan("dueDate", todayISO),
          Query.limit(100),
        ]
      );

      const count = response.documents.length;
      setOverdueTasks(count);
      setIsTasksFlashing(count > 0);
    } catch (error) {
      console.error("Error fetching overdue tasks:", error);
    }
  }, [organization?.$id]);

  // Fetch unread messages count
  useEffect(() => {
    fetchUnreadMessages();

    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadMessages, 30000);

    // Listen for real-time updates from the messages page
    const handleMessagesUpdate = () => {
      fetchUnreadMessages();
    };

    window.addEventListener('messagesUpdated', handleMessagesUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('messagesUpdated', handleMessagesUpdate);
    };
  }, [fetchUnreadMessages]);

  // Fetch overdue tasks count
  useEffect(() => {
    fetchOverdueTasks();

    // Refresh every 30 seconds
    const interval = setInterval(fetchOverdueTasks, 30000);

    // Listen for real-time updates from the tasks page
    const handleTasksUpdate = () => {
      fetchOverdueTasks();
    };

    window.addEventListener('tasksUpdated', handleTasksUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('tasksUpdated', handleTasksUpdate);
    };
  }, [fetchOverdueTasks]);

  // Close mobile sidebar when navigating
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Save collapsed state to localStorage
  useEffect(() => {
    if (!isFirstRender.current && !isMobile) {
      localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    }
    isFirstRender.current = false;
  }, [isCollapsed, isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      const newState = !isCollapsed;
      setIsCollapsed(newState);
      localStorage.setItem('sidebarCollapsed', String(newState));
      window.dispatchEvent(new CustomEvent('sidebarToggle', { 
        detail: { isCollapsed: newState } 
      }));
      window.dispatchEvent(new Event('storage'));
    }
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, offlineEnabled: true },
    { name: "Properties", href: "/dashboard/properties", icon: Home, offlineEnabled: true },
    { name: "Add Property", href: "/dashboard/properties/new", icon: PlusCircle, offlineEnabled: false },
    { name: "Tasks", href: "/dashboard/tasks", icon: Calendar, offlineEnabled: true },
    { name: "Tenants & Requests", href: "/dashboard/tenants", icon: Users, offlineEnabled: false },
    { name: "Messages", href: "/dashboard/messages", icon: MessageSquare, offlineEnabled: false },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, offlineEnabled: true },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, offlineEnabled: true },
    { name: "Within Us", href: "/dashboard/within-us", icon: Radius, offlineEnabled: true },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  // Mobile: hamburger menu button
  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-[var(--accent-500)] text-white shadow-lg hover:bg-[var(--accent-600)] transition md:hidden"
          aria-label="Toggle sidebar"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeMobileSidebar}
          />
        )}

        {/* Mobile Sidebar */}
        <aside 
          className={`fixed left-0 top-0 h-full w-64 text-white shadow-xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          } ${
            theme === "dark" 
              ? "bg-gray-900" 
              : "bg-[#082346]"
          }`}
        >
          {/* Logo Section */}
          <div className={`p-4 border-b transition-colors duration-300 shrink-0 flex items-center gap-3 ${
            theme === "dark" ? "border-gray-700" : "border-blue-700"
          }`}>
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
              <Image
                src="/images/icon.png"
                alt="Nookly Icon"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold">Nookly</h2>
              <p className={`text-xs mt-0.5 transition-colors duration-300 ${
                theme === "dark" ? "text-gray-400" : "text-blue-300"
              }`}>
                Organization Portal
              </p>
            </div>
          </div>

          {/* Offline Status */}
          {isOffline && (
            <div className={`mx-3 mt-3 px-3 py-2 rounded-lg flex items-center gap-2 shrink-0 transition-colors duration-300 ${
              theme === "dark" 
                ? "bg-yellow-500/10 border border-yellow-500/20" 
                : "bg-yellow-500/20 border border-yellow-500/30"
            }`}>
              <WifiOff className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className={`text-xs transition-colors duration-300 ${
                theme === "dark" ? "text-yellow-300" : "text-yellow-200"
              }`}>
                Offline Mode
              </span>
            </div>
          )}

          {/* Navigation */}
          <nav className="mt-4 flex-1 overflow-y-auto">
            <div className="w-full">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const isDisabled = isOffline && !item.offlineEnabled;
                const isMessages = item.name === "Messages";
                const isTasks = item.name === "Tasks";
                const hasUnreadMessages = isMessages && unreadMessages > 0;
                const hasOverdueTasks = isTasks && overdueTasks > 0;
                const shouldFlash = hasUnreadMessages || hasOverdueTasks;
                
                const showDivider = index === 2 || index === 4;
                
                return (
                  <div key={item.name}>
                    <Link
                      href={isDisabled ? "#" : item.href}
                      onClick={(e) => {
                        if (isDisabled) {
                          e.preventDefault();
                        } else {
                          closeMobileSidebar();
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all relative ${
                        isDisabled
                          ? "opacity-40 blur-[1px] cursor-not-allowed text-gray-400 hover:bg-transparent"
                          : isActive
                          ? "bg-[var(--accent-500)] text-white shadow-lg"
                          : theme === "dark"
                          ? "text-gray-300 hover:bg-gray-800"
                          : "text-blue-100 hover:bg-[#163660]"
                      }`}
                      title={isDisabled ? "Unavailable offline. Connect to the internet." : ""}
                    >
                      <div className="relative">
                        <Icon 
                          size={20} 
                          className={`flex-shrink-0 ${shouldFlash ? 'flash-icon' : ''}`} 
                        />
                        {hasUnreadMessages && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full pulse-dot" />
                        )}
                        {hasOverdueTasks && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full pulse-dot" style={{ animationDelay: '0.5s' }} />
                        )}
                      </div>
                      <span className="font-medium flex-1">{item.name}</span>
                      {hasUnreadMessages && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                      {hasOverdueTasks && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {overdueTasks > 9 ? '9+' : overdueTasks}
                        </span>
                      )}
                      {isDisabled && (
                        <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 text-gray-400" 
                            : "bg-gray-500/30 text-gray-400"
                        }`}>
                          Offline
                        </span>
                      )}
                    </Link>
                    {showDivider && (
                      <div className={`mx-4 my-2 h-px transition-colors duration-300 ${
                        theme === "dark" ? "bg-gray-700" : "bg-blue-700/30"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Logout Button */}
            <div className={`mx-4 my-2 h-px transition-colors duration-300 ${
              theme === "dark" ? "bg-gray-700" : "bg-blue-700/30"
            }`} />
            <button
              onClick={() => setShowLogoutModal(true)}
              className={`flex items-center gap-3 px-4 py-3 mx-2 mt-2 rounded-lg transition-all ${
                theme === "dark"
                  ? "text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  : "text-red-300 hover:bg-red-500/20 hover:text-red-200"
              }`}
            >
              <LogOut size={20} className="flex-shrink-0" />
              <span className="font-medium">Logout</span>
            </button>
          </nav>

          {/* Footer */}
          <div className={`p-4 border-t transition-colors duration-300 shrink-0 ${
            theme === "dark" ? "border-gray-700" : "border-blue-700/50"
          }`}>
            <div className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
              theme === "dark" ? "text-gray-400" : "text-blue-300/60"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              <span>{isOffline ? 'Offline' : 'Online'}</span>
            </div>
          </div>
        </aside>

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className={`w-[340px] max-w-full transition-colors duration-300 ${
              theme === "dark" 
                ? "bg-gray-800/95 backdrop-blur-md" 
                : "bg-white/95 backdrop-blur-md"
            } rounded-2xl shadow-2xl overflow-hidden`}>
              {/* Header */}
              <div className={`px-6 py-4 relative overflow-hidden ${
                theme === "dark" 
                  ? "bg-gray-700" 
                  : "bg-gradient-to-r from-blue-800 to-[var(--accent-500)]"
              }`}>
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl ${
                  theme === "dark" ? "bg-gray-500/20" : "bg-[var(--accent-500)]/20"
                }`} />
                <div className="relative text-center">
                  <div className={`inline-block p-2.5 rounded-full mb-2 ${
                    theme === "dark" ? "bg-gray-600/50" : "bg-white/10"
                  }`}>
                    <LogOut className={`w-6 h-6 ${
                      theme === "dark" ? "text-gray-400" : "text-[var(--accent-400)]"
                    }`} />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Sign Out?
                  </h2>
                  <p className={`text-xs ${
                    theme === "dark" ? "text-gray-300" : "text-blue-200"
                  }`}>
                    You'll need to sign in again
                  </p>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-5">
                <p className={`text-center text-sm mb-5 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  Are you sure you want to sign out of your account?
                </p>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className={`w-full h-px transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-600" : "bg-gray-200"
                    }`} />
                  </div>
                  <div className="relative flex justify-center">
                    <span className={`px-2 text-[10px] transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-800/95 text-gray-400" : "bg-white/95 text-gray-400"
                    }`}>
                      Are you sure?
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md ${
                      theme === "dark"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {isLoggingOut ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Signing Out...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <LogOut className="w-4 h-4" />
                        <span>Yes, Sign Out</span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop Sidebar
  return (
    <>
      {/* Desktop Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-20 z-50 p-1.5 rounded-full shadow-lg transition-colors duration-300 hidden md:flex ${
          isCollapsed ? "left-14" : "left-60"
        } ${
          theme === "dark"
            ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
            : "bg-blue-700 hover:bg-blue-600 text-white"
        }`}
        aria-label="Toggle sidebar"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Desktop Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full text-white shadow-xl z-40 flex flex-col transition-all duration-300 overflow-y-auto overflow-x-hidden ${
          isCollapsed ? "w-16" : "w-64"
        } ${
          theme === "dark" 
            ? "bg-gray-900" 
            : "bg-[#082346]"
        }`}
      >
        {/* Logo Section */}
        <div className={`p-4 border-b transition-colors duration-300 shrink-0 flex items-center gap-3 ${
          theme === "dark" ? "border-gray-700" : "border-blue-700"
        } ${isCollapsed ? "justify-center" : ""}`}>
          <div className={`rounded-lg overflow-hidden shrink-0 ${isCollapsed ? "w-8 h-8" : "w-10 h-10"}`}>
            <Image
              src="/images/icon.png"
              alt="Nookly Icon"
              width={isCollapsed ? 32 : 40}
              height={isCollapsed ? 32 : 40}
              className="w-full h-full object-cover"
            />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-xl font-bold">Nookly</h2>
              <p className={`text-xs mt-0.5 transition-colors duration-300 ${
                theme === "dark" ? "text-gray-400" : "text-blue-300"
              }`}>
                for Organizations
              </p>
            </div>
          )}
        </div>

        {/* Offline Status */}
        {isOffline && (
          <div className={`mx-3 mt-3 px-3 py-2 rounded-lg flex items-center gap-2 shrink-0 transition-colors duration-300 ${
            isCollapsed 
              ? "justify-center mx-2 p-2 bg-yellow-500/20 border border-yellow-500/30"
              : "bg-yellow-500/20 border border-yellow-500/30"
          }`}>
            <WifiOff className="w-4 h-4 text-yellow-400 shrink-0" />
            {!isCollapsed && (
              <span className={`text-xs transition-colors duration-300 ${
                theme === "dark" ? "text-yellow-300" : "text-yellow-200"
              }`}>
                Offline Mode
              </span>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-4 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const isDisabled = isOffline && !item.offlineEnabled;
              const isMessages = item.name === "Messages";
              const isTasks = item.name === "Tasks";
              const hasUnreadMessages = isMessages && unreadMessages > 0;
              const hasOverdueTasks = isTasks && overdueTasks > 0;
              const shouldFlash = hasUnreadMessages || hasOverdueTasks;
              
              const showDivider = index === 2 || index === 4;
              
              return (
                <div key={item.name}>
                  <Link
                    href={isDisabled ? "#" : item.href}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-3 mx-2 rounded-lg transition-all relative ${
                      isDisabled
                        ? "opacity-40 blur-[1px] cursor-not-allowed text-gray-400 hover:bg-transparent"
                        : isActive
                        ? "bg-[var(--accent-500)] text-white shadow-lg"
                        : theme === "dark"
                        ? "text-gray-300 hover:bg-gray-800"
                        : "text-blue-100 hover:bg-[#163660]"
                    } ${isCollapsed ? "justify-center" : ""}`}
                    title={isDisabled ? "Unavailable offline. Connect to the internet." : ""}
                  >
                    <div className="relative">
                      <Icon 
                        size={20} 
                        className={`flex-shrink-0 ${shouldFlash ? 'flash-icon' : ''}`} 
                      />
                      {hasUnreadMessages && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full pulse-dot" />
                      )}
                      {hasOverdueTasks && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full pulse-dot" style={{ animationDelay: '0.5s' }} />
                      )}
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="font-medium truncate">{item.name}</span>
                        {hasUnreadMessages && (
                          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
                        {hasOverdueTasks && (
                          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {overdueTasks > 9 ? '9+' : overdueTasks}
                          </span>
                        )}
                        {isDisabled && (
                          <span className={`ml-auto text-[8px] uppercase px-1.5 py-0.5 rounded transition-colors duration-300 shrink-0 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-400" 
                              : "bg-gray-500/30 text-gray-400"
                          }`}>
                            Offline
                          </span>
                        )}
                      </>
                    )}
                    {isCollapsed && (hasUnreadMessages || hasOverdueTasks) && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full pulse-dot" />
                    )}
                    {isCollapsed && isActive && (
                      <span className="absolute right-0 w-1 h-8 bg-white rounded-l-full" />
                    )}
                  </Link>
                  {showDivider && !isCollapsed && (
                    <div className={`mx-4 my-2 h-px transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-blue-700/30"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Logout Button */}
          {!isCollapsed && (
            <div className={`mx-4 my-2 h-px transition-colors duration-300 ${
              theme === "dark" ? "bg-gray-700" : "bg-blue-700/30"
            }`} />
          )}
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`flex items-center gap-3 px-3 py-3 mx-2 mt-2 rounded-lg transition-all ${
              theme === "dark"
                ? "text-red-400 hover:bg-red-500/20 hover:text-red-300"
                : "text-red-300 hover:bg-red-500/20 hover:text-red-200"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Logout" : ""}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className={`p-4 border-t transition-colors duration-300 shrink-0 ${
            theme === "dark" ? "border-gray-700" : "border-blue-700/50"
          }`}>
            <div className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
              theme === "dark" ? "text-gray-400" : "text-blue-300/60"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              <span>{isOffline ? 'Offline' : 'Online'}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Vertical Separator Line */}
      <div 
        className={`fixed top-0 h-full w-px transition-all duration-300 z-30 ${
          isCollapsed ? "left-16" : "left-64"
        } ${
          theme === "dark" ? "bg-gray-700" : "bg-blue-700/30"
        }`}
      />

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className={`w-[340px] max-w-full transition-colors duration-300 ${
            theme === "dark" 
              ? "bg-gray-800/95 backdrop-blur-md" 
              : "bg-white/95 backdrop-blur-md"
          } rounded-2xl shadow-2xl overflow-hidden`}>
            {/* Header */}
            <div className={`px-6 py-4 relative overflow-hidden ${
              theme === "dark" 
                ? "bg-gray-700" 
                : "bg-gradient-to-r from-blue-800 to-[var(--accent-500)]"
            }`}>
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl ${
                theme === "dark" ? "bg-gray-500/20" : "bg-[var(--accent-500)]/20"
              }`} />
              <div className="relative text-center">
                <div className={`inline-block p-2.5 rounded-full mb-2 ${
                  theme === "dark" ? "bg-gray-600/50" : "bg-white/10"
                }`}>
                  <LogOut className={`w-6 h-6 ${
                    theme === "dark" ? "text-gray-400" : "text-[var(--accent-400)]"
                  }`} />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Sign Out?
                </h2>
                <p className={`text-xs ${
                  theme === "dark" ? "text-gray-300" : "text-blue-200"
                }`}>
                  You'll need to sign in again
                </p>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-5">
              <p className={`text-center text-sm mb-5 transition-colors duration-300 ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>
                Are you sure you want to sign out of your account?
              </p>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full h-px transition-colors duration-300 ${
                    theme === "dark" ? "bg-gray-600" : "bg-gray-200"
                  }`} />
                </div>
                <div className="relative flex justify-center">
                  <span className={`px-2 text-[10px] transition-colors duration-300 ${
                    theme === "dark" ? "bg-gray-800/95 text-gray-400" : "bg-white/95 text-gray-400"
                  }`}>
                    Are you sure?
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md ${
                    theme === "dark"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {isLoggingOut ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Signing Out...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <LogOut className="w-4 h-4" />
                      <span>Yes, Sign Out</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setShowLogoutModal(false)}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}