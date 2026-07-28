"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { databases } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import Link from "next/link";
import { cacheService } from "@/lib/cache.service";
import { CACHE_KEYS } from "@/lib/cache-keys";
import {
  CheckCircle,
  Clock,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  RefreshCw,
  WifiOff,
  Edit,
  Trash2,
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
}

interface Property {
  $id: string;
  propertyName: string;
}

export default function TasksPage() {
  const { organization, isOffline } = useAuth();
  // Add this function near the top
const dispatchTasksUpdate = () => {
  const event = new CustomEvent('tasksUpdated');
  window.dispatchEvent(event);
};

// Add this function to mark a task as completed
const handleCompleteTask = async (taskId: string) => {
  try {
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
      taskId,
      { status: "completed" }
    );
    
    // Update local state
    setTasks(prev => prev.map(task => 
      task.$id === taskId ? { ...task, status: "completed" as const } : task
    ));
    
    // Dispatch event to update sidebar
    dispatchTasksUpdate();
    
    console.log('✅ Task marked as completed');
  } catch (error) {
    console.error("Error completing task:", error);
  }
};

// Add this function to mark a task as in-progress
const handleStartTask = async (taskId: string) => {
  try {
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
      taskId,
      { status: "in-progress" }
    );
    
    // Update local state
    setTasks(prev => prev.map(task => 
      task.$id === taskId ? { ...task, status: "in-progress" as const } : task
    ));
    
    // Dispatch event to update sidebar
    dispatchTasksUpdate();
    
    console.log('✅ Task marked as in-progress');
  } catch (error) {
    console.error("Error starting task:", error);
  }
};
  const { resolvedTheme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    // Initial check
    checkSidebarState();

    // Listen for storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        setIsSidebarCollapsed(e.newValue === 'true');
      }
    };

    // Custom event listener for sidebar toggle
    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail?.isCollapsed !== undefined) {
        setIsSidebarCollapsed(e.detail.isCollapsed);
      } else {
        checkSidebarState();
      }
    };

    // Mobile sidebar toggle event
    const handleMobileToggle = (e: CustomEvent) => {
      if (e.detail?.isOpen !== undefined) {
        setIsSidebarCollapsed(!e.detail.isOpen);
      } else {
        checkSidebarState();
      }
    };

    // Also check on window focus
    const handleFocus = () => {
      checkSidebarState();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sidebarToggle', handleCustomEvent as EventListener);
    window.addEventListener('mobileSidebarToggle', handleMobileToggle as EventListener);
    window.addEventListener('focus', handleFocus);

    // Poll for changes as a fallback
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

  // Format due date
  const formatDueDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    return date.toLocaleDateString();
  };

  // Dispatch event when tasks change
useEffect(() => {
  // Dispatch event to notify sidebar
  const event = new CustomEvent('tasksUpdated');
  window.dispatchEvent(event);
}, [tasks]);

  const fetchTasks = async () => {
    // Skip if offline
    if (!navigator.onLine) {
      console.log('📴 Offline - using cached tasks');
      const cachedTasks = cacheService.get<Task[]>(CACHE_KEYS.TASKS);
      if (cachedTasks) {
        setTasks(cachedTasks);
        setLastUpdated(new Date());
      }
      setIsLoading(false);
      return;
    }

    try {
      if (!organization?.$id) {
        setIsLoading(false);
        return;
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
        [
          Query.equal("organizationId", organization.$id),
          Query.orderDesc("$createdAt"),
        ]
      );

      const fetchedTasks = response.documents as unknown as Task[];
      setTasks(fetchedTasks);
      
      cacheService.set(CACHE_KEYS.TASKS, fetchedTasks, 5 * 60 * 1000);
      setLastUpdated(new Date());
      
      console.log('✅ Tasks cached successfully');
    } catch (error) {
      console.error("Error fetching tasks:", error);
      const cachedTasks = cacheService.get<Task[]>(CACHE_KEYS.TASKS);
      if (cachedTasks) {
        setTasks(cachedTasks);
        setLastUpdated(new Date());
        console.log('📦 Using cached tasks due to error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add this effect after your fetchTasks useEffect
useEffect(() => {
  // Dispatch event when tasks change
  dispatchTasksUpdate();
}, [tasks]);

  const fetchProperties = async () => {
    if (!navigator.onLine) {
      console.log('📴 Offline - using cached properties for tasks');
      const cachedProperties = cacheService.get<Property[]>(CACHE_KEYS.PROPERTIES);
      if (cachedProperties) {
        setProperties(cachedProperties);
      }
      return;
    }

    try {
      if (!organization?.userId) {
        return;
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        [
          Query.equal("creatorId", organization.userId),
          Query.orderDesc("$createdAt"),
        ]
      );

      const fetchedProperties = response.documents as unknown as Property[];
      setProperties(fetchedProperties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      const cachedProperties = cacheService.get<Property[]>(CACHE_KEYS.PROPERTIES);
      if (cachedProperties) {
        setProperties(cachedProperties);
      }
    }
  };

  const handleRefresh = async () => {
  if (isOffline) {
    alert("You're offline. Please connect to the internet to refresh.");
    return;
  }

  setIsRefreshing(true);
  try {
    await Promise.all([fetchTasks(), fetchProperties()]);
    // Dispatch event to notify sidebar
    dispatchTasksUpdate();
  } finally {
    setIsRefreshing(false);
  }
};

  useEffect(() => {
    const loadData = async () => {
      const cachedTasks = cacheService.get<Task[]>(CACHE_KEYS.TASKS);
      if (cachedTasks && cachedTasks.length > 0) {
        setTasks(cachedTasks);
        setLastUpdated(new Date());
        console.log('📦 Loaded tasks from cache');
      }

      if (navigator.onLine) {
        await fetchTasks();
        await fetchProperties();
      } else {
        setIsLoading(false);
      }
    };

    loadData();
  }, [organization?.$id, organization?.userId]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "low":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { text: "Completed", icon: CheckCircle, className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" };
      case "in-progress":
        return { text: "In Progress", icon: Clock, className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" };
      default:
        return { text: "Pending", icon: AlertCircle, className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" };
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.propertyName && task.propertyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.$id === propertyId);
    return property?.propertyName || "Unknown Property";
  };

  // Calculate margin based on device and sidebar state
  const getMargin = () => {
    if (isMobile) {
      // On mobile, sidebar slides over content
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen transition-colors duration-300 ${
          resolvedTheme === "dark" 
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
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Loading tasks...
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${
        resolvedTheme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <Sidebar />
        <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
          <Header />
          <main className="p-3 sm:p-4 md:p-6 pb-12">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start md:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-100" : "text-gray-800"
                }`}>
                  Tasks
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1">
                  <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    Manage your tasks ({filteredTasks.length} tasks)
                  </p>
                  {isOffline && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 sm:px-2 py-0.5 rounded-full">
                      <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      Offline Mode
                    </span>
                  )}
                  {!isOffline && lastUpdated && (
                    <span className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`}>
                      Updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
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
                  href="/dashboard/tasks/new"
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition text-xs sm:text-sm shadow-sm hover:shadow-md"
                >
                  <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Add Task</span>
                </Link>
              </div>
            </div>

            {/* Offline Warning */}
            {isOffline && tasks.length > 0 && (
              <div className={`mb-3 sm:mb-4 border rounded-lg p-2.5 sm:p-3 flex items-center gap-2 ${
                resolvedTheme === "dark" 
                  ? "bg-yellow-900/20 border-yellow-800" 
                  : "bg-yellow-50 border-yellow-200"
              }`}>
                <WifiOff className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${
                  resolvedTheme === "dark" ? "text-yellow-400" : "text-yellow-600"
                }`} />
                <p className={`text-xs sm:text-sm ${
                  resolvedTheme === "dark" ? "text-yellow-300" : "text-yellow-700"
                }`}>
                  You're offline. Showing cached tasks from your last visit.
                </p>
              </div>
            )}

            {/* Search and Filter */}
            <div className={`rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 transition-colors duration-300 border ${
              resolvedTheme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                  }`} />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-200 text-gray-900 bg-white"
                    }`}
                  />
                </div>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100" 
                        : "border border-gray-200 text-gray-900 bg-white"
                    }`}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100" 
                        : "border border-gray-200 text-gray-900 bg-white"
                    }`}
                  >
                    <option value="all">All Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
              <div className={`rounded-2xl shadow-sm p-8 sm:p-12 text-center transition-colors duration-300 border ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                  resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                }`}>
                  <Clock className={`w-8 h-8 sm:w-10 sm:h-10 ${
                    resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                </div>
                <h3 className={`text-base sm:text-lg font-semibold mb-1 sm:mb-2 transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  No tasks found
                </h3>
                <p className={`text-sm sm:text-base mb-3 sm:mb-4 transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  {searchTerm || filterStatus !== "all" || filterPriority !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Get started by creating your first task"}
                </p>
                {!searchTerm && filterStatus === "all" && filterPriority === "all" && !isOffline && (
                  <Link
                    href="/dashboard/tasks/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition text-sm shadow-sm hover:shadow-md"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create Task
                  </Link>
                )}
                {isOffline && (
                  <p className={`text-xs sm:text-sm mt-2 transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-yellow-400" : "text-yellow-600"
                  }`}>
                    Connect to the internet to create new tasks
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {filteredTasks.map((task) => {
                  const status = getStatusBadge(task.status);
                  const StatusIcon = status.icon;
                  const overdue = isOverdue(task.dueDate) && task.status !== "completed";
                  const dueDateDisplay = formatDueDate(task.dueDate);
                  
                  return (
                    <div
                      key={task.$id}
                      className={`rounded-xl shadow-sm p-3 sm:p-4 hover:shadow-md transition border transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "bg-gray-800/80 border-gray-700 hover:border-[var(--accent-700)]" 
                          : "bg-white/80 border-gray-100 hover:border-[var(--accent-200)] backdrop-blur-sm"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                              resolvedTheme === "dark" ? "text-gray-100" : "text-gray-800"
                            }`}>
                              {task.title}
                            </h3>
                            {overdue && (
                              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 sm:px-2 py-0.5 rounded-full">
                                <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                Overdue
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-2 transition-colors duration-300 ${
                              resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                            }`}>
                              {task.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className={`inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${status.className}`}>
                              <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="hidden xs:inline">{status.text}</span>
                            </span>
                            <span className={`text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1 ${overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                              <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {dueDateDisplay}
                            </span>
                            {task.propertyId && (
                              <span className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                                resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                              }`}>
                                • {getPropertyName(task.propertyId)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                            <div className="flex items-center gap-1.5 sm:gap-2 self-start md:self-center">
  <Link
    href={`/dashboard/tasks/${task.$id}`}
    className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm rounded-lg transition ${
      resolvedTheme === "dark"
        ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
        : "bg-blue-50 text-blue-600 hover:bg-blue-100"
    }`}
  >
    View
  </Link>
  
  {/* Complete Button - Show when task is not completed */}
  {task.status !== "completed" && (
    <button
      onClick={() => handleCompleteTask(task.$id)}
      className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm rounded-lg transition flex items-center gap-1 ${
        resolvedTheme === "dark"
          ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
          : "bg-green-50 text-green-600 hover:bg-green-100"
      }`}
    >
      <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      Complete
    </button>
  )}
  
  {/* Start Button - Show when task is pending */}
  {task.status === "pending" && (
    <button
      onClick={() => handleStartTask(task.$id)}
      className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm rounded-lg transition flex items-center gap-1 ${
        resolvedTheme === "dark"
          ? "bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50"
          : "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
      }`}
    >
      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      Start
    </button>
  )}
  
  <Link
    href={`/dashboard/tasks/${task.$id}/edit`}
    className={`p-1.5 sm:p-1.5 rounded-lg transition ${
      resolvedTheme === "dark"
        ? "bg-purple-900/30 text-purple-400 hover:bg-purple-900/50"
        : "bg-purple-50 text-purple-600 hover:bg-purple-100"
    }`}
  >
    <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
  </Link>
</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}