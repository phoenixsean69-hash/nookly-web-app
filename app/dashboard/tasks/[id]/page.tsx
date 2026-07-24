"use client";

import { useEffect, useState, useCallback } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { databases } from "@/lib/appwrite/config";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  User,
  Building2,
  Tag,
  FileText,
  ChevronRight,
  RefreshCw,
  WifiOff,
  Loader2,
  X,
} from "lucide-react";

interface Task {
  $id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed";
  dueDate: string;
  propertyId?: string;
  propertyName?: string;
  organizationId: string;
  createdAt: string;
  updatedAt?: string;
}

interface Property {
  $id: string;
  propertyName: string;
  address: string;
}

export default function TaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { organization, isOffline } = useAuth();
  const { theme } = useTheme();
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  const taskId = unwrappedParams.id;

  // Redirect if ID is "new" or empty
  useEffect(() => {
    if (taskId === 'new' || !taskId) {
      router.push('/dashboard/tasks/new');
    }
  }, [taskId, router]);

  const [task, setTask] = useState<Task | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Function to check sidebar state from localStorage
  const checkSidebarState = useCallback(() => {
    if (isMobile) {
      const mobileState = sessionStorage.getItem('mobileSidebarOpen');
      setIsSidebarCollapsed(mobileState !== 'true');
      return;
    }
    const savedState = localStorage.getItem('sidebarCollapsed');
    setIsSidebarCollapsed(savedState === 'true');
  }, [isMobile]);

  // Listen for sidebar collapse state changes
  useEffect(() => {
    checkSidebarState();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        setIsSidebarCollapsed(e.newValue === 'true');
      }
    };

    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail?.isCollapsed !== undefined) {
        setIsSidebarCollapsed(e.detail.isCollapsed);
      } else {
        checkSidebarState();
      }
    };

    const handleMobileToggle = (e: CustomEvent) => {
      if (e.detail?.isOpen !== undefined) {
        setIsSidebarCollapsed(!e.detail.isOpen);
      } else {
        checkSidebarState();
      }
    };

    const handleFocus = () => {
      checkSidebarState();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sidebarToggle', handleCustomEvent as EventListener);
    window.addEventListener('mobileSidebarToggle', handleMobileToggle as EventListener);
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      if (isMobile) {
        const mobileState = sessionStorage.getItem('mobileSidebarOpen');
        setIsSidebarCollapsed(mobileState !== 'true');
      } else {
        const savedState = localStorage.getItem('sidebarCollapsed');
        const isCollapsed = savedState === 'true';
        setIsSidebarCollapsed(prev => {
          if (prev !== isCollapsed) {
            return isCollapsed;
          }
          return prev;
        });
      }
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sidebarToggle', handleCustomEvent as EventListener);
      window.removeEventListener('mobileSidebarToggle', handleMobileToggle as EventListener);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [checkSidebarState, isMobile]);

  // Check if task is overdue
  const isOverdue = (dueDate: string): boolean => {
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-red-100 dark:bg-red-900/30",
          text: "text-red-700 dark:text-red-300",
          border: "border-red-200 dark:border-red-800",
          icon: "text-red-600 dark:text-red-400",
        };
      case "medium":
        return {
          bg: "bg-yellow-100 dark:bg-yellow-900/30",
          text: "text-yellow-700 dark:text-yellow-300",
          border: "border-yellow-200 dark:border-yellow-800",
          icon: "text-yellow-600 dark:text-yellow-400",
        };
      case "low":
        return {
          bg: "bg-green-100 dark:bg-green-900/30",
          text: "text-green-700 dark:text-green-300",
          border: "border-green-200 dark:border-green-800",
          icon: "text-green-600 dark:text-green-400",
        };
      default:
        return {
          bg: "bg-gray-100 dark:bg-gray-700",
          text: "text-gray-700 dark:text-gray-300",
          border: "border-gray-200 dark:border-gray-700",
          icon: "text-gray-600 dark:text-gray-400",
        };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return {
          text: "Completed",
          icon: CheckCircle,
          className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
          iconColor: "text-green-600 dark:text-green-400",
        };
      case "in-progress":
        return {
          text: "In Progress",
          icon: Clock,
          className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
          iconColor: "text-blue-600 dark:text-blue-400",
        };
      default:
        return {
          text: "Pending",
          icon: AlertCircle,
          className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
          iconColor: "text-yellow-600 dark:text-yellow-400",
        };
    }
  };

  const fetchTask = async () => {
    // Skip if ID is 'new' or empty
    if (taskId === 'new' || !taskId) {
      setIsLoading(false);
      return;
    }

    if (!navigator.onLine) {
      console.log('📴 Offline - cannot fetch task details');
      setIsLoading(false);
      return;
    }

    try {
      const response = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
        taskId
      );

      const taskData = response as unknown as Task;
      setTask(taskData);
      setLastUpdated(new Date());

      // Fetch property details if task has a propertyId
      if (taskData.propertyId) {
        try {
          const propertyResponse = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
            taskData.propertyId
          );
          setProperty(propertyResponse as unknown as Property);
        } catch (error) {
          console.error("Error fetching property:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      // If task not found, redirect to tasks list
      if ((error as any).code === 404) {
        router.push('/dashboard/tasks');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (isOffline) {
      alert("You're offline. Please connect to the internet to refresh.");
      return;
    }

    setIsRefreshing(true);
    await fetchTask();
    setIsRefreshing(false);
  };

  const handleDelete = async () => {
    if (!task) return;

    setIsDeleting(true);
    try {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
        task.$id
      );
      router.push('/dashboard/tasks');
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  useEffect(() => {
    if (taskId && taskId !== 'new') {
      fetchTask();
    }
  }, [taskId]);

  // Calculate margin based on device and sidebar state
  const getMargin = () => {
    if (isMobile) {
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

  // If still loading
  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-gray-900" 
            : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
        }`}>
          <Sidebar />
          <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
            <Header />
            <main className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[var(--accent-500)] mx-auto" />
                  <p className={`mt-4 text-sm sm:text-base transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Loading task details...
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // If task not found (after redirect check)
  if (!task) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-gray-900" 
            : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
        }`}>
          <Sidebar />
          <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
            <Header />
            <main className="p-3 sm:p-4 md:p-6">
              <div className={`rounded-2xl shadow-sm p-8 sm:p-12 text-center transition-colors duration-300 border ${
                theme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                  theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                }`}>
                  <AlertCircle className={`w-8 h-8 sm:w-10 sm:h-10 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                </div>
                <h3 className={`text-base sm:text-lg font-semibold mb-1 sm:mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  Task not found
                </h3>
                <p className={`text-sm sm:text-base mb-4 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  The task you're looking for doesn't exist or has been deleted.
                </p>
                <Link
                  href="/dashboard/tasks"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition text-sm shadow-sm hover:shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Tasks
                </Link>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const status = getStatusInfo(task.status);
  const StatusIcon = status.icon;
  const priorityColors = getPriorityColor(task.priority);
  const overdue = isOverdue(task.dueDate) && task.status !== "completed";

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${
        theme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <Sidebar />
        <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
          <Header />
          <main className="p-3 sm:p-4 md:p-6 pb-12">
            {/* Back Button & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/dashboard/tasks"
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors duration-300 ${
                    theme === "dark"
                      ? "hover:bg-gray-700 text-gray-400"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
                <div>
                  <h1 className={`text-lg sm:text-xl md:text-2xl font-bold transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                  }`}>
                    {task.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 sm:mt-1">
                    <span className={`text-xs sm:text-sm transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Task #{task.$id.slice(0, 8)}
                    </span>
                    {isOffline && (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 sm:px-2 py-0.5 rounded-full">
                        <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        Offline Mode
                      </span>
                    )}
                    {!isOffline && lastUpdated && (
                      <span className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`}>
                        Updated: {lastUpdated.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing || isOffline}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition text-xs sm:text-sm ${
                    isOffline 
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : `bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600`
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden xs:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
                <Link
                  href={`/dashboard/tasks/${task.$id}/edit`}
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition text-xs sm:text-sm shadow-sm hover:shadow-md"
                >
                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Edit</span>
                </Link>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-xs sm:text-sm shadow-sm hover:shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Delete</span>
                </button>
              </div>
            </div>

            {/* Task Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Status & Priority Cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className={`rounded-xl p-3 sm:p-4 border transition-colors duration-300 ${
                    theme === "dark" 
                      ? "bg-gray-800/80 border-gray-700" 
                      : "bg-white/80 border-gray-100 backdrop-blur-sm"
                  }`}>
                    <p className={`text-xs sm:text-sm mb-1 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>Status</p>
                    <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium ${status.className}`}>
                      <StatusIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${status.iconColor}`} />
                      {status.text}
                    </div>
                  </div>
                  <div className={`rounded-xl p-3 sm:p-4 border transition-colors duration-300 ${
                    theme === "dark" 
                      ? "bg-gray-800/80 border-gray-700" 
                      : "bg-white/80 border-gray-100 backdrop-blur-sm"
                  }`}>
                    <p className={`text-xs sm:text-sm mb-1 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>Priority</p>
                    <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium ${priorityColors.bg} ${priorityColors.text} ${priorityColors.border}`}>
                      <Tag className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${priorityColors.icon}`} />
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className={`rounded-xl p-4 sm:p-6 border transition-colors duration-300 ${
                  theme === "dark" 
                    ? "bg-gray-800/80 border-gray-700" 
                    : "bg-white/80 border-gray-100 backdrop-blur-sm"
                }`}>
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <FileText className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`} />
                    <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      Description
                    </h3>
                  </div>
                  {task.description ? (
                    <p className={`text-sm sm:text-base leading-relaxed transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      {task.description}
                    </p>
                  ) : (
                    <p className={`text-sm sm:text-base transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`}>
                      No description provided.
                    </p>
                  )}
                </div>

                {/* Associated Property */}
                {task.propertyId && property && (
                  <Link href={`/dashboard/properties/${task.propertyId}`}>
                    <div className={`rounded-xl p-4 sm:p-6 border transition-all duration-300 cursor-pointer hover:shadow-md ${
                      theme === "dark" 
                        ? "bg-gray-800/80 border-gray-700 hover:border-gray-600" 
                        : "bg-white/80 border-gray-100 hover:border-[var(--accent-200)] backdrop-blur-sm"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${
                            theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"
                          }`}>
                            <Building2 className={`w-4 h-4 sm:w-5 sm:h-5 ${
                              theme === "dark" ? "text-blue-400" : "text-blue-600"
                            }`} />
                          </div>
                          <div>
                            <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>
                              Associated Property
                            </p>
                            <p className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-100" : "text-gray-800"
                            }`}>
                              {property.propertyName}
                            </p>
                            {property.address && (
                              <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                                theme === "dark" ? "text-gray-400" : "text-gray-500"
                              }`}>
                                {property.address}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 ${
                          theme === "dark" ? "text-gray-500" : "text-gray-400"
                        }`} />
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              {/* Sidebar Info */}
              <div className="space-y-4 sm:space-y-6">
                <div className={`rounded-xl p-4 sm:p-6 border transition-colors duration-300 ${
                  theme === "dark" 
                    ? "bg-gray-800/80 border-gray-700" 
                    : "bg-white/80 border-gray-100 backdrop-blur-sm"
                }`}>
                  <h3 className={`text-sm sm:text-base font-semibold mb-3 sm:mb-4 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                  }`}>
                    Details
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        Due Date
                      </p>
                      <div className={`flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 ${
                        overdue ? "text-red-600 dark:text-red-400" : 
                        theme === "dark" ? "text-gray-200" : "text-gray-700"
                      }`}>
                        <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                          overdue ? "text-red-600 dark:text-red-400" : ""
                        }`} />
                        <span className="text-sm sm:text-base font-medium">
                          {formatDate(task.dueDate)}
                          {overdue && " (Overdue)"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        Created
                      </p>
                      <div className={`flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 ${
                        theme === "dark" ? "text-gray-200" : "text-gray-700"
                      }`}>
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                        <span className="text-sm sm:text-base">
                          {formatDate(task.createdAt)}
                        </span>
                      </div>
                    </div>

                    {task.updatedAt && (
                      <div>
                        <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          Last Updated
                        </p>
                        <div className={`flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 ${
                          theme === "dark" ? "text-gray-200" : "text-gray-700"
                        }`}>
                          <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                          <span className="text-sm sm:text-base">
                            {formatDate(task.updatedAt)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        Task ID
                      </p>
                      <div className={`flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 ${
                        theme === "dark" ? "text-gray-200" : "text-gray-700"
                      }`}>
                        <span className="text-xs sm:text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {task.$id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`rounded-2xl p-5 sm:p-6 max-w-md w-full transition-colors duration-300 shadow-2xl ${
              theme === "dark" ? "bg-gray-800" : "bg-white"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-100" : "text-gray-800"
                }`}>
                  Delete Task
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className={`transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-6">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  theme === "dark" ? "bg-red-900/30" : "bg-red-100"
                }`}>
                  <Trash2 className={`w-8 h-8 sm:w-10 sm:h-10 ${
                    theme === "dark" ? "text-red-400" : "text-red-600"
                  }`} />
                </div>
                <p className={`text-center transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">"{task.title}"</span>?
                </p>
                <p className={`text-center text-xs sm:text-sm mt-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  This action cannot be undone. All data associated with this task will be permanently removed.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg transition font-medium ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}