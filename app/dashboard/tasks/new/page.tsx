"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useRouter } from "next/navigation";
import { databases } from "@/lib/appwrite/config";
import { Query, ID } from "appwrite";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  XCircle,
  Calendar,
  User,
  Building2,
  Tag,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  WifiOff,
  FileText
} from "lucide-react";

interface Property {
  $id: string;
  propertyName: string;
  address: string;
}

export default function NewTaskPage() {
  const router = useRouter();
  const { organization, isOffline } = useAuth();
  const { resolvedTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [error, setError] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "high" | "medium" | "low",
    status: "pending" as "pending" | "in-progress" | "completed",
    dueDate: "",
    propertyId: "",
    propertyName: "",
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

  // Fetch properties
  useEffect(() => {
    fetchProperties();
  }, [organization?.userId]);

  const fetchProperties = async () => {
    if (!navigator.onLine) {
      console.log('📴 Offline - cannot fetch properties');
      setIsLoadingProperties(false);
      return;
    }

    try {
      if (!organization?.userId) {
        setIsLoadingProperties(false);
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

      const props = response.documents as unknown as Property[];
      setProperties(props);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setIsLoadingProperties(false);
    }
  };

  const handlePropertyChange = (propertyId: string) => {
    const selectedProperty = properties.find(p => p.$id === propertyId);
    if (selectedProperty) {
      setFormData({
        ...formData,
        propertyId: propertyId,
        propertyName: selectedProperty.propertyName,
      });
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
      alert("You're offline. Please connect to the internet to create a task.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
        ID.unique(),
        {
          title: formData.title.trim(),
          description: formData.description.trim(),
          priority: formData.priority,
          status: formData.status,
          dueDate: formData.dueDate,
          propertyId: formData.propertyId || null,
          propertyName: formData.propertyName || null,
          organizationId: organization?.$id,
        }
      );

      router.push("/dashboard/tasks");
    } catch (error) {
      console.error("Error creating task:", error);
      setError("Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Calculate margin based on device and sidebar state
  const getMargin = () => {
    if (isMobile) {
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

  if (isLoadingProperties) {
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
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[var(--accent-700)] mx-auto" />
                  <p className={`mt-4 text-sm sm:text-base transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Loading properties...
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
            <div className="max-w-4xl mx-auto">
              {/* Header with Back Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={handleCancel}
                    className={`p-1.5 sm:p-2 rounded-lg transition-colors duration-300 ${
                      resolvedTheme === "dark"
                        ? "hover:bg-gray-700 text-gray-400"
                        : "hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <div>
                    <h1 className={`text-lg sm:text-xl md:text-2xl font-bold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>
                      Create New Task
                    </h1>
                    <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Add a new task to your organization
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className={`mb-4 sm:mb-6 p-3 sm:p-4 border-l-4 rounded-xl overflow-hidden transition-colors duration-300 ${
                  resolvedTheme === "dark" 
                    ? "bg-red-900/30 border-red-500" 
                    : "bg-red-50 border-red-500"
                }`}>
                  <div className="flex items-start xs:items-center gap-2">
                    <AlertCircle className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 xs:mt-0 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-red-400" : "text-red-500"
                    }`} />
                    <span className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-red-300" : "text-red-700"
                    }`}>
                      {error}
                    </span>
                  </div>
                </div>
              )}

              {/* Offline Warning */}
              {isOffline && (
                <div className={`mb-4 sm:mb-6 border rounded-xl p-3 sm:p-4 flex items-center gap-2 ${
                  resolvedTheme === "dark" 
                    ? "bg-yellow-900/20 border-yellow-800" 
                    : "bg-yellow-50 border-yellow-200"
                }`}>
                  <div className={`p-1.5 rounded-full ${
                    resolvedTheme === "dark" ? "bg-yellow-900/30" : "bg-yellow-100"
                  }`}>
                    <WifiOff className={`w-4 h-4 ${
                      resolvedTheme === "dark" ? "text-yellow-400" : "text-yellow-600"
                    }`} />
                  </div>
                  <p className={`text-xs sm:text-sm ${
                    resolvedTheme === "dark" ? "text-yellow-300" : "text-yellow-700"
                  }`}>
                    You're offline. Please connect to the internet to create tasks.
                  </p>
                </div>
              )}

              {/* Create Task Form */}
              <form onSubmit={handleSubmit} className={`rounded-2xl shadow-md p-4 sm:p-6 md:p-8 transition-colors duration-300 border w-full ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="grid grid-cols-1 gap-4 sm:gap-5">
                  {/* Title */}
                  <div>
                    <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Task Title <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-700)] transition-colors duration-300 ${
                          formErrors.title 
                            ? "border-red-500 dark:border-red-500" 
                            : "border-gray-200 dark:border-gray-700"
                        } ${
                          resolvedTheme === "dark" 
                            ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                            : "bg-white text-gray-900"
                        }`}
                        placeholder="Enter task title"
                      />
                    </div>
                    {formErrors.title && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">
                        {formErrors.title}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Description
                    </label>
                    <div className="relative">
                      <FileText className={`absolute left-3 top-3 w-4 h-4 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      <textarea
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-700)] transition-colors duration-300 border ${
                          resolvedTheme === "dark" 
                            ? "bg-gray-700 border-gray-700 text-gray-100 placeholder-gray-400" 
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                        placeholder="Enter task description (optional)"
                      />
                    </div>
                  </div>

                  {/* Priority & Status Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {/* Priority */}
                    <div>
                      <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Priority <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <select
                          required
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value as "high" | "medium" | "low" })}
                          className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-700)] transition-colors duration-300 border ${
                            resolvedTheme === "dark" 
                              ? "bg-gray-700 border-gray-700 text-gray-100" 
                              : "bg-white border-gray-200 text-gray-900"
                          }`}
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Status <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Clock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <select
                          required
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as "pending" | "in-progress" | "completed" })}
                          className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-700)] transition-colors duration-300 border ${
                            resolvedTheme === "dark" 
                              ? "bg-gray-700 border-gray-700 text-gray-100" 
                              : "bg-white border-gray-200 text-gray-900"
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      <input
                        type="date"
                        required
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-700)] transition-colors duration-300 ${
                          formErrors.dueDate 
                            ? "border-red-500 dark:border-red-500" 
                            : "border-gray-200 dark:border-gray-700"
                        } ${
                          resolvedTheme === "dark" 
                            ? "bg-gray-700 text-gray-100" 
                            : "bg-white text-gray-900"
                        }`}
                      />
                    </div>
                    {formErrors.dueDate && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">
                        {formErrors.dueDate}
                      </p>
                    )}
                  </div>

                  {/* Property Association */}
                  <div>
                    <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Associated Property
                    </label>
                    <div className="relative">
                      <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      {isLoadingProperties ? (
                        <div className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg border ${
                          resolvedTheme === "dark" 
                            ? "bg-gray-700 border-gray-700 text-gray-400" 
                            : "bg-gray-50 border-gray-200 text-gray-400"
                        }`}>
                          <span>Loading properties...</span>
                        </div>
                      ) : properties.length === 0 ? (
                        <div className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg border ${
                          resolvedTheme === "dark" 
                            ? "bg-yellow-900/20 border-yellow-800 text-yellow-400" 
                            : "bg-yellow-50 border-yellow-200 text-yellow-600"
                        }`}>
                          <span>No properties found. Please add a property first.</span>
                        </div>
                      ) : (
                        <select
                          value={formData.propertyId || ""}
                          onChange={(e) => handlePropertyChange(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-700)] transition-colors duration-300 border ${
                            resolvedTheme === "dark" 
                              ? "bg-gray-700 border-gray-700 text-gray-100" 
                              : "bg-white border-gray-200 text-gray-900"
                          }`}
                        >
                          <option value="">None</option>
                          {properties.map((property) => (
                            <option key={property.$id} value={property.$id}>
                              {property.propertyName}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {properties.length === 0 && !isLoadingProperties && (
                      <p className="text-xs mt-1 transition-colors duration-300 text-orange-600 dark:text-orange-400">
                        <Link href="/dashboard/properties/new" className="hover:underline">
                          Click here to add a property first
                        </Link>
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={`flex flex-col xs:flex-row gap-2 sm:gap-3 pt-6 sm:pt-8 mt-4 border-t transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
                }`}>
                  <button
                    type="submit"
                    disabled={isSubmitting || isOffline}
                    className={`flex-1 xs:flex-none px-6 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium ${
                      resolvedTheme === "dark"
                        ? "bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white"
                        : "bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Create Task
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className={`flex-1 xs:flex-none px-6 py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium ${
                      resolvedTheme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                </div>

                {isOffline && (
                  <div className={`mt-3 p-3 rounded-lg border ${
                    resolvedTheme === "dark" 
                      ? "bg-yellow-900/20 border-yellow-800" 
                      : "bg-yellow-50 border-yellow-200"
                  }`}>
                    <p className={`text-xs sm:text-sm ${
                      resolvedTheme === "dark" ? "text-yellow-300" : "text-yellow-700"
                    }`}>
                      You're offline. Please connect to the internet to create tasks.
                    </p>
                  </div>
                )}
              </form>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}