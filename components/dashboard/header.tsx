"use client";

import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { databases, account } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import {
  Bell,
  Settings,
  LogOut,
  User,
  ChevronDown,
  LayoutDashboard,
  Building2,
  Mail,
  Phone,
  Moon,
  Sun,
  Eye,
  Heart,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Star,
  XCircle,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

interface Notification {
  id: string;
  type: "view" | "like" | "request" | "review";
  title: string;
  message: string;
  comment?: string;
  propertyId: string;
  propertyName: string;
  timestamp: Date;
  read: boolean;
  count?: number;
  rating?: number;
  reviewText?: string;
  reviewerName?: string;
}

export function Header() {
  const { user, organization, logout, isOffline } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle click outside for notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showNotifications &&
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Update dropdown position when opened
  useEffect(() => {
    if (showNotifications && notificationButtonRef.current) {
      const rect = notificationButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showNotifications]);

  const orgName = organization?.name || "Organization";
  const orgEmail = organization?.email || user?.email || "";
  const orgAvatar = organization?.avatar || "";
  const displayInitial = orgName.charAt(0).toUpperCase();

  // Function to parse reviews from string to array
  const parseReviews = (reviewsString: string): any[] => {
    if (!reviewsString) return [];
    try {
      return JSON.parse(reviewsString);
    } catch (error) {
      return [];
    }
  };

  // Handle logout with confirmation
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

  // Show toast notification for mobile
  const showMobileToast = (action: string) => {
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-50)] dark:bg-[var(--accent-950)]/30 flex items-center justify-center">
                <Settings className="w-5 h-5 text-[var(--accent-500)] dark:text-[var(--accent-400)]" />
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {action}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {action === "Settings" ? "Opening settings..." : "Signing out..."}
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-[var(--accent-500)] hover:text-[var(--accent-600)] dark:text-[var(--accent-400)] dark:hover:text-[var(--accent-300)] focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    ), {
      duration: 2000,
      position: 'bottom-center',
    });
  };

  // Fetch notifications from localStorage and check property changes
  const checkForUpdates = useCallback(async () => {
    if (isOffline) {
      return;
    }
    
    if (!navigator.onLine) {
      return;
    }

    if (!organization?.userId) {
      return;
    }

    try {
      const propertiesResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        [
          Query.equal("creatorId", organization.userId),
          Query.orderDesc("$createdAt"),
        ]
      );

      const properties = propertiesResponse.documents as any[];
      
      const storedStats = localStorage.getItem("propertyStats");
      const previousStats = storedStats ? JSON.parse(storedStats) : {};
      
      const newNotifications: Notification[] = [];
      
      for (const property of properties) {
        const propertyId = property.$id;
        const prev = previousStats[propertyId] || {
          views: 0,
          likes: 0,
          requests: 0,
          reviewsCount: 0,
          lastViewNotificationAt: 0,
        };
        
        const currentViews = property.views || 0;
        const currentLikes = property.likes || 0;
        const currentRequests = property.requests || 0;
        
        const currentReviewsArray = parseReviews(property.reviews);
        const currentReviewsCount = currentReviewsArray.length;
        const prevReviewsCount = prev.reviewsCount || 0;
        
        const viewMilestone = Math.floor(currentViews / 50);
        const prevViewMilestone = Math.floor(prev.views / 50);
        
        if (viewMilestone > prevViewMilestone && currentViews > 0) {
          newNotifications.push({
            id: `${propertyId}-view-${Date.now()}`,
            type: "view",
            title: "Views Milestone Reached! 🎯",
            message: `${property.propertyName} has reached ${currentViews} views!`,
            propertyId: propertyId,
            propertyName: property.propertyName,
            timestamp: new Date(),
            read: false,
            count: currentViews,
          });
        }
        
        if (currentLikes > prev.likes) {
          const increase = currentLikes - prev.likes;
          newNotifications.push({
            id: `${propertyId}-like-${Date.now()}`,
            type: "like",
            title: "New Like! ❤️",
            message: `${property.propertyName} received ${increase} new like${increase > 1 ? 's' : ''}! Total: ${currentLikes}`,
            propertyId: propertyId,
            propertyName: property.propertyName,
            timestamp: new Date(),
            read: false,
            count: increase,
          });
        }
        
        if (currentRequests > prev.requests) {
          const increase = currentRequests - prev.requests;
          newNotifications.push({
            id: `${propertyId}-request-${Date.now()}`,
            type: "request",
            title: "New Inquiry! 📩",
            message: `${property.propertyName} has ${increase} new inquiry/request!`,
            propertyId: propertyId,
            propertyName: property.propertyName,
            timestamp: new Date(),
            read: false,
            count: increase,
          });
        }
        
        if (currentReviewsCount > prevReviewsCount) {
          const increase = currentReviewsCount - prevReviewsCount;
          const newReviews = currentReviewsArray.slice(prevReviewsCount);
          
          for (const newReview of newReviews) {
            newNotifications.push({
              id: `${propertyId}-review-${Date.now()}-${Math.random()}`,
              type: "review",
              title: "New Review! 🔥",
              message: `${newReview.userName || "Someone"} left a ${newReview.rating}-star review`,
              comment: `"${newReview.review}"`,
              propertyId: propertyId,
              propertyName: property.propertyName,
              timestamp: new Date(newReview.date || Date.now()),
              read: false,
              rating: newReview.rating,
              reviewText: newReview.review,
              reviewerName: newReview.userName,
            });
          }
        }
        
        previousStats[propertyId] = {
          views: currentViews,
          likes: currentLikes,
          requests: currentRequests,
          reviewsCount: currentReviewsCount,
          lastViewNotificationAt: prev.lastViewNotificationAt,
        };
      }
      
      localStorage.setItem("propertyStats", JSON.stringify(previousStats));
      
      const existingNotifications = localStorage.getItem("notifications");
      let allNotifications: Notification[] = [];
      
      if (existingNotifications) {
        const parsed = JSON.parse(existingNotifications);
        if (Array.isArray(parsed)) {
          allNotifications = parsed;
        }
      }
      
      if (newNotifications.length > 0) {
        allNotifications = [...newNotifications, ...allNotifications];
        localStorage.setItem("notifications", JSON.stringify(allNotifications));
      }
      
      if (isMountedRef.current) {
        setNotifications(allNotifications.slice(0, 20));
        const unread = allNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
        setLastCheck(new Date());
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes('Failed to fetch')) {
        console.error("Error checking for updates:", error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsPolling(false);
      }
    }
  }, [organization?.userId, isOffline]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem("notifications");
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        if (Array.isArray(parsed)) {
          setNotifications(parsed.slice(0, 20));
          const unread = parsed.filter((n: Notification) => !n.read).length;
          setUnreadCount(unread);
        } else {
          setNotifications([]);
          setUnreadCount(0);
          localStorage.setItem("notifications", JSON.stringify([]));
        }
      } catch (error) {
        console.error("Error parsing notifications:", error);
        setNotifications([]);
        setUnreadCount(0);
        localStorage.setItem("notifications", JSON.stringify([]));
      }
    }
  }, []);

  // Set up polling interval
  useEffect(() => {
    isMountedRef.current = true;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    const shouldPoll = !isOffline && navigator.onLine;
    
    if (shouldPoll) {
      const initialTimeout = setTimeout(() => {
        if (isMountedRef.current && !isOffline && navigator.onLine) {
          checkForUpdates();
        }
      }, 2000);
      
      pollingIntervalRef.current = setInterval(() => {
        if (isMountedRef.current && !isPolling && !isOffline && navigator.onLine) {
          setIsPolling(true);
          checkForUpdates();
        }
      }, 30000);

      return () => {
        clearTimeout(initialTimeout);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isOffline, checkForUpdates, isPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Auto-mark notifications as read when dropdown opens
  useEffect(() => {
    if (showNotifications) {
      const timer = setTimeout(() => {
        const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updatedNotifications);
        localStorage.setItem("notifications", JSON.stringify(updatedNotifications));
        setUnreadCount(0);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [showNotifications, notifications]);

  const markAsRead = (notificationId: string) => {
    const updatedNotifications = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
    localStorage.setItem("notifications", JSON.stringify(updatedNotifications));
    const unread = updatedNotifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    localStorage.setItem("notifications", JSON.stringify(updatedNotifications));
    setUnreadCount(0);
  };

  const clearNotification = (notificationId: string) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    setNotifications(updatedNotifications);
    localStorage.setItem("notifications", JSON.stringify(updatedNotifications));
    const unread = updatedNotifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "view":
        return <Eye className="w-4 h-4 text-[var(--accent-500)] dark:text-[var(--accent-400)]" />;
      case "like":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "request":
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case "review":
        return <Star className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Render Notification Dropdown using Portal
  const renderNotificationDropdown = () => {
    if (!showNotifications) return null;

    const dropdownContent = (
      <div
        ref={notificationRef}
        className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-[9999] transition-all duration-200 ease-in-out"
        style={{
          top: dropdownPosition.top,
          right: dropdownPosition.right,
          width: isMobile ? 'calc(100vw - 32px)' : '380px',
          maxWidth: '380px',
          maxHeight: '80vh',
        }}
      >
        <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
            Notifications ({unreadCount} unread)
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-[var(--accent-500)] hover:text-[var(--accent-600)] dark:text-[var(--accent-400)] dark:hover:text-[var(--accent-300)]"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 border-b border-gray-50 dark:border-gray-700 hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-950)]/20 transition cursor-pointer ${
                  !notif.read ? "bg-[var(--accent-50)]/30 dark:bg-[var(--accent-950)]/10" : ""
                }`}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {notif.title}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notif.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex-shrink-0 ml-2"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-300 font-medium mt-0.5">
                      {notif.message}
                    </p>
                    {notif.comment && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                        {notif.comment}
                      </p>
                    )}
                    {notif.type === "review" && notif.rating && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < (notif.rating || 0)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    <Link
                      href={`/dashboard/properties/${notif.propertyId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNotifications(false);
                      }}
                      className="text-xs text-[var(--accent-500)] hover:text-[var(--accent-600)] dark:text-[var(--accent-400)] dark:hover:text-[var(--accent-300)] mt-2 inline-block"
                    >
                      View Property →
                    </Link>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatTime(notif.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-2 border-t border-gray-100 dark:border-gray-700 text-center sticky bottom-0 bg-white dark:bg-gray-800">
          <Link
            href="/dashboard/notifications"
            className="text-xs text-[var(--accent-500)] hover:text-[var(--accent-600)] dark:text-[var(--accent-400)] dark:hover:text-[var(--accent-300)]"
            onClick={() => setShowNotifications(false)}
          >
            View all notifications
          </Link>
        </div>
      </div>
    );

    // Use createPortal to render at the body level
    if (typeof document !== 'undefined') {
      return createPortal(dropdownContent, document.body);
    }
    return null;
  };

  // Desktop Header
  if (!isMobile) {
    return (
      <>
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-30 transition-colors duration-300">
          <div className="px-4 md:px-6 py-2 md:py-3 flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center gap-2 px-2.5 md:px-3 py-1 md:py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                {isOffline ? (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 animate-ping">
                        <WifiOff className="w-3.5 h-3.5 text-yellow-500/50" />
                      </div>
                      <WifiOff className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 relative" />
                    </div>
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Offline</span>
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Online</span>
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  </>
                )}
              </div>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

              <h1 className="text-md font-bold text-blue-950 dark:text-blue-300 transition-colors duration-300 whitespace-nowrap">
                {orgName} Dashboard
              </h1>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 hover:text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:text-gray-400 dark:hover:text-[var(--accent-400)] dark:hover:bg-[var(--accent-950)]/30 rounded-lg transition-colors duration-300"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

              {/* Notifications */}
              <div className="relative">
                <button
                  ref={notificationButtonRef}
                  onClick={toggleNotifications}
                  className="relative p-2 text-gray-500 hover:text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:text-gray-400 dark:hover:text-[var(--accent-400)] dark:hover:bg-[var(--accent-950)]/30 rounded-lg transition-colors duration-300"
                  disabled={isOffline}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>
              </div>

              {/* Settings */}
              <Link
                href="/dashboard/settings?tab=preferences"
                className="p-2 text-gray-500 hover:text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:text-gray-400 dark:hover:text-[var(--accent-400)] dark:hover:bg-[var(--accent-950)]/30 rounded-lg transition-colors duration-300"
              >
                <Settings className="w-5 h-5" />
              </Link>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

              {/* Profile */}
              <Link
                href="/dashboard/settings?tab=profile"
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
              >
                {orgAvatar ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-500 dark:border-gray-400">
                    <Image
                      src={orgAvatar}
                      alt={orgName}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-800 to-[var(--accent-500)] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {displayInitial}
                  </div>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Notification Dropdown - Rendered via Portal */}
        {renderNotificationDropdown()}

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className={`rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl transition-colors duration-300 ${
              theme === "dark" ? "bg-gray-800" : "bg-white"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-100" : "text-gray-900"
                }`}>
                  Confirm Sign Out
                </h3>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className={`transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  theme === "dark" ? "bg-red-900/30" : "bg-red-100"
                }`}>
                  <AlertTriangle className={`w-10 h-10 ${
                    theme === "dark" ? "text-red-400" : "text-red-600"
                  }`} />
                </div>
                <p className={`text-center transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Are you sure you want to sign out?
                </p>
                <p className={`text-center text-sm mt-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  You will need to sign in again to access your dashboard.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg transition font-medium ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`flex-1 px-4 py-2.5 rounded-lg transition font-medium flex items-center justify-center gap-2 ${
                    theme === "dark"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoggingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing Out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Mobile Header
  return (
    <>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-30 transition-colors duration-300">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-sm font-bold text-blue-950 dark:text-blue-300 truncate transition-colors duration-300">
              {orgName}
            </h1>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:text-gray-400 dark:hover:text-[var(--accent-400)] dark:hover:bg-[var(--accent-950)]/30 rounded-lg transition-colors duration-300"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications - Mobile */}
            <div className="relative">
              <button
                ref={notificationButtonRef}
                onClick={toggleNotifications}
                className="relative p-2 text-gray-500 hover:text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:text-gray-400 dark:hover:text-[var(--accent-400)] dark:hover:bg-[var(--accent-950)]/30 rounded-lg transition-colors duration-300"
                disabled={isOffline}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>

            {/* Settings - Mobile */}
            <button
              onClick={() => {
                showMobileToast("Settings");
                setTimeout(() => {
                  window.location.href = "/dashboard/settings?tab=preferences";
                }, 300);
              }}
              className="p-2 text-gray-500 hover:text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:text-gray-400 dark:hover:text-[var(--accent-400)] dark:hover:bg-[var(--accent-950)]/30 rounded-lg transition-colors duration-300"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Profile - Mobile */}
            <button
              onClick={() => {
                toast.custom((t) => (
                  <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                    <div className="flex-1 w-0 p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                          {orgAvatar ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--accent-500)]">
                              <Image
                                src={orgAvatar}
                                alt={orgName}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-800 to-[var(--accent-500)] rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {displayInitial}
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {orgName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{orgEmail}</p>
                          <div className="mt-2 flex gap-3">
                            <Link
                              href="/dashboard/settings?tab=profile"
                              onClick={() => toast.dismiss(t.id)}
                              className="text-xs text-[var(--accent-500)] hover:text-[var(--accent-600)] dark:text-[var(--accent-400)] dark:hover:text-[var(--accent-300)]"
                            >
                              Profile Settings →
                            </Link>
                            <button
                              onClick={() => {
                                toast.dismiss(t.id);
                                setShowLogoutModal(true);
                              }}
                              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Sign Out
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex border-l border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ), {
                  duration: 5000,
                  position: 'bottom-center',
                });
              }}
              className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
            >
              {orgAvatar ? (
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-500 dark:border-gray-400">
                  <Image
                    src={orgAvatar}
                    alt={orgName}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-800 to-[var(--accent-500)] rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {displayInitial}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Notification Dropdown - Rendered via Portal */}
      {renderNotificationDropdown()}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className={`rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl transition-colors duration-300 ${
            theme === "dark" ? "bg-gray-800" : "bg-white"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold transition-colors duration-300 ${
                theme === "dark" ? "text-gray-100" : "text-gray-900"
              }`}>
                Confirm Sign Out
              </h3>
              <button
                onClick={() => setShowLogoutModal(false)}
                className={`transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                theme === "dark" ? "bg-red-900/30" : "bg-red-100"
              }`}>
                <AlertTriangle className={`w-10 h-10 ${
                  theme === "dark" ? "text-red-400" : "text-red-600"
                }`} />
              </div>
              <p className={`text-center transition-colors duration-300 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Are you sure you want to sign out?
              </p>
              <p className={`text-center text-sm mt-2 transition-colors duration-300 ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}>
                You will need to sign in again to access your dashboard.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className={`flex-1 px-4 py-2.5 rounded-lg transition font-medium ${
                  theme === "dark"
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`flex-1 px-4 py-2.5 rounded-lg transition font-medium flex items-center justify-center gap-2 ${
                  theme === "dark"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoggingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}