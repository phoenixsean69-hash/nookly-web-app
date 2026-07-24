"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { databases } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  Loader2,
  Trash2,
  Calendar,
  Clock,
  Tag,
  FileText,
  Building2,
  RefreshCw,
  WifiOff,
} from "lucide-react";

interface Task {
  $id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed";
  dueDate: string;
  propertyId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt?: string;
}

interface Property {
  $id: string;
  propertyName: string;
}

export default function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { organization, isOffline } = useAuth();
  const { theme } = useTheme();
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  const taskId = unwrappedParams.id;

  const [task, setTask] = useState<Task | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingProperties, setIsFetchingProperties] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "high" | "medium" | "low",
    status: "pending" as "pending" | "in-progress" | "completed",
    dueDate: "",
    propertyId: "",
  });

  const [formErrors, setFormErrors] = useState<{
    title?: string;
    dueDate?: string;
  }>({});

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

  const fetchTask = async () => {
    if (!taskId) return;

    try {
      const response = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
        taskId
      );

      const taskData = response as unknown as Task;
      setTask(taskData);
      
      // Populate form data
      setFormData({
        title: taskData.title || "",
        description: taskData.description || "",
        priority: taskData.priority || "medium",
        status: taskData.status || "pending",
        dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString().split('T')[0] : "",
        propertyId: taskData.propertyId || "",
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching task:", error);
      alert("Failed to load task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProperties = async () => {
    if (!organization?.userId) return;

    setIsFetchingProperties(true);
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        [
          Query.equal("creatorId", organization.userId),
          Query.orderDesc("$createdAt"),
        ]
      );

      const props = response.documents as unknown as Property[];
      setProperties(props);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setIsFetchingProperties(false);
    }
  };

  const validateForm = () => {
    const errors: { title?: string; dueDate?: string } = {};
    
    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }
    
    if (!formData.dueDate) {
      errors.dueDate = "Due date is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (isOffline) {
      alert("You're offline. Please connect to the internet to save changes.");
      return;
    }

    setIsSaving(true);
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
        taskId,
        {
          title: formData.title.trim(),
          description: formData.description.trim(),
          priority: formData.priority,
          status: formData.status,
          dueDate: formData.dueDate,
          propertyId: formData.propertyId || null,
        }
      );

      router.push(`/dashboard/tasks/${taskId}`);
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task. Please try again.");
    } finally {
      setIsSaving(false);
    }
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

  const handleCancel = () => {
    router.back();
  };

  useEffect(() => {
    if (taskId) {
      fetchTask();
      fetchProperties();
    }
  }, [taskId, organization?.userId]);

  // Calculate margin based on device and sidebar state
  const getMargin = () => {
    if (isMobile) {
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

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
                    Loading task...
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

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
                  The task you're trying to edit doesn't exist or has been deleted.
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={handleCancel}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors duration-300 ${
                    theme === "dark"
                      ? "hover:bg-gray-700 text-gray-400"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <div>
                  <h1 className={`text-lg sm:text-xl md:text-2xl font-bold transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                  }`}>
                    Edit Task
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 sm:mt-1">
                    <span className={`text-xs sm:text-sm transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      {task.title}
                    </span>
                    {isOffline && (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 sm:px-2 py-0.5 rounded-full">
                        <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        Offline Mode
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-xs sm:text-sm shadow-sm hover:shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Delete</span>
                </button>
              </div>
            </div>

            {/* Edit Form */}
            <div className={`rounded-2xl shadow-sm border transition-colors duration-300 ${
              theme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Title */}
                <div>
                  <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                      formErrors.title 
                        ? "border-red-500 dark:border-red-500" 
                        : "border-gray-200 dark:border-gray-600"
                    } ${
                      theme === "dark" 
                        ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                        : "bg-white text-gray-900"
                    }`}
                    placeholder="Enter task title"
                  />
                  {formErrors.title && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">
                      {formErrors.title}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 border ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                        : "bg-white border-gray-200 text-gray-900"
                    }`}
                    placeholder="Enter task description"
                  />
                </div>

                {/* Priority & Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Priority */}
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as "high" | "medium" | "low" })}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 border ${
                        theme === "dark" 
                          ? "bg-gray-700 border-gray-600 text-gray-100" 
                          : "bg-white border-gray-200 text-gray-900"
                      }`}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "pending" | "in-progress" | "completed" })}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 border ${
                        theme === "dark" 
                          ? "bg-gray-700 border-gray-600 text-gray-100" 
                          : "bg-white border-gray-200 text-gray-900"
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                      formErrors.dueDate 
                        ? "border-red-500 dark:border-red-500" 
                        : "border-gray-200 dark:border-gray-600"
                    } ${
                      theme === "dark" 
                        ? "bg-gray-700 text-gray-100" 
                        : "bg-white text-gray-900"
                    }`}
                  />
                  {formErrors.dueDate && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">
                      {formErrors.dueDate}
                    </p>
                  )}
                </div>

                {/* Property Association */}
                <div>
                  <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Associated Property
                  </label>
                  <select
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 border ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100" 
                        : "bg-white border-gray-200 text-gray-900"
                    }`}
                    disabled={isFetchingProperties}
                  >
                    <option value="">None</option>
                    {properties.map((property) => (
                      <option key={property.$id} value={property.$id}>
                        {property.propertyName}
                      </option>
                    ))}
                  </select>
                  {isFetchingProperties && (
                    <p className={`mt-1 text-xs sm:text-sm transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Loading properties...
                    </p>
                  )}
                </div>

                {/* Form Actions */}
                <div className={`flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t ${
                  theme === "dark" ? "border-gray-700" : "border-gray-200"
                }`}>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition text-sm sm:text-base font-medium ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isOffline}
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition text-sm sm:text-base font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>

                {isOffline && (
                  <div className={`p-3 rounded-lg border ${
                    theme === "dark" 
                      ? "bg-yellow-900/20 border-yellow-800" 
                      : "bg-yellow-50 border-yellow-200"
                  }`}>
                    <p className={`text-xs sm:text-sm ${
                      theme === "dark" ? "text-yellow-300" : "text-yellow-700"
                    }`}>
                      You're offline. Please connect to the internet to save changes.
                    </p>
                  </div>
                )}
              </form>
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