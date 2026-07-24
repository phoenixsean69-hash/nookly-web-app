"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useParams, useRouter } from "next/navigation";
import { databases } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import Link from "next/link";
import {
  Home,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Building2,
  Save,
  Clock,
  User,
  Phone,
  Hash,
  DollarSign,
} from "lucide-react";

interface Property {
  $id: string;
  propertyName: string;
  address: string;
  price: number;
}

export default function EditTenantPage() {
  const { organization } = useAuth();
  const { theme } = useTheme();
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [tenantInfo, setTenantInfo] = useState({
    name: "",
    Identifier: "",
    phone: "",
    monthlyRent: 0,
  });
  const [formData, setFormData] = useState({
    propertyId: "",
    propertyName: "",
    status: "active",
    leaseStartDate: "",
  });
  const [error, setError] = useState("");
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

  // Fetch tenant and properties
  useEffect(() => {
    fetchTenant();
    fetchProperties();
  }, [tenantId, organization?.userId]);

  const fetchTenant = async () => {
    try {
      const response = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
        tenantId
      );
      const tenant = response as unknown as any;
      
      setTenantInfo({
        name: tenant.name || "",
        Identifier: tenant.Identifier || "",
        phone: tenant.phone || "",
        monthlyRent: tenant.monthlyRent || 0,
      });
      
      setFormData({
        propertyId: "",
        propertyName: tenant.propertyName || "",
        status: tenant.status || "active",
        leaseStartDate: tenant.leaseStartDate || "",
      });
    } catch (error) {
      console.error("Error fetching tenant:", error);
      setError("Failed to load tenant");
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      if (!organization?.userId) return;

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
      
      // Find and set propertyId if propertyName matches
      const matchedProperty = props.find(p => p.propertyName === formData.propertyName);
      if (matchedProperty) {
        setFormData(prev => ({
          ...prev,
          propertyId: matchedProperty.$id
        }));
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
        tenantId,
        {
          propertyName: formData.propertyName,
          status: formData.status,
          leaseStartDate: formData.leaseStartDate,
        }
      );

      router.push("/dashboard/tenants");
    } catch (err: unknown) {
      console.error("Error updating tenant:", err);
      let errorMessage = "Failed to update tenant";
      if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
      case "inactive":
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600";
    }
  };

  // Calculate margin based on device and sidebar state
  const getMargin = () => {
    if (isMobile) {
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

  if (initialLoading || isLoadingProperties) {
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
                    Loading tenant...
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
        theme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <Sidebar />
        <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
          <Header />
          <main className="p-3 sm:p-4 md:p-6 pb-12">
            {/* Header with Back Button */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => router.back()}
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
                      Edit Tenant
                    </h1>
                    <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Update property, status, or move-in date
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tenant Info Card */}
            <div className={`rounded-2xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6 transition-colors duration-300 border ${
              theme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <h2 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 transition-colors duration-300 ${
                theme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>
                <User className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                  theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                }`} />
                Tenant Information (Read-only)
              </h2>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-4">
                <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="font-medium">Name:</span>
                  <span className="truncate">{tenantInfo.name}</span>
                </div>
                <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="font-medium">Identifier:</span>
                  <span className="truncate">{tenantInfo.Identifier}</span>
                </div>
                <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="font-medium">Phone:</span>
                  <span className="truncate">{tenantInfo.phone}</span>
                </div>
                <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="font-medium">Monthly Rent:</span>
                  <span>${tenantInfo.monthlyRent}</span>
                </div>
              </div>
            </div>

            {/* Status Banner */}
            <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl border transition-colors duration-300 flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 ${getStatusColor(formData.status)}`}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {formData.status === "active" && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
                {formData.status === "inactive" && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
                {formData.status === "pending" && <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
                <span className="text-sm sm:text-base font-semibold capitalize">{formData.status}</span>
                <span className="text-[10px] sm:text-sm opacity-75">- Current Status</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`mb-4 sm:mb-6 border-l-4 rounded-xl overflow-hidden transition-colors duration-300 ${
                theme === "dark" 
                  ? "bg-red-900/30 border-red-500" 
                  : "bg-red-50 border-red-500"
              }`}>
                <div className="p-3 sm:p-4">
                  <div className="flex items-start xs:items-center gap-2">
                    <XCircle className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 xs:mt-0 transition-colors duration-300 ${
                      theme === "dark" ? "text-red-400" : "text-red-500"
                    }`} />
                    <span className={`text-xs sm:text-sm transition-colors duration-300 ${
                      theme === "dark" ? "text-red-300" : "text-red-700"
                    }`}>
                      {error}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSubmit} className={`rounded-2xl shadow-md p-4 sm:p-6 max-w-2xl transition-colors duration-300 border ${
              theme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                {/* Property Name */}
                <div>
                  <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Property Name *
                  </label>
                  <div className={`rounded-xl overflow-hidden transition-colors duration-300 ${
                    theme === "dark" ? "bg-gray-700" : "bg-white"
                  }`}>
                    <div className="relative">
                      <Home className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      <select
                        required
                        value={formData.propertyId}
                        onChange={(e) => handlePropertyChange(e.target.value)}
                        className={`w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 appearance-none ${
                          theme === "dark" 
                            ? "bg-gray-700 text-gray-100 border-gray-600" 
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                      >
                        <option value="" className="text-gray-400 italic">
                          Select a property
                        </option>
                        {properties.map((property) => (
                          <option key={property.$id} value={property.$id} className="text-gray-900">
                            {property.propertyName} - ${property.price}/mo
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Building2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                      </div>
                    </div>
                  </div>
                  <p className={`text-[10px] sm:text-xs mt-1 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-400"
                  }`}>
                    Changing property will update the tenant's assigned property
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Status *
                  </label>
                  <div className={`rounded-xl overflow-hidden transition-colors duration-300 ${
                    theme === "dark" ? "bg-gray-700" : "bg-white"
                  }`}>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                        theme === "dark" 
                          ? "bg-gray-700 text-gray-100" 
                          : "bg-white text-gray-900 border border-gray-200"
                      }`}
                    >
                      <option value="active" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        ✓ Active - Tenant is currently renting
                      </option>
                      <option value="inactive" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        ○ Inactive - Tenant has moved out
                      </option>
                      <option value="pending" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                        ⏳ Pending - Application under review
                      </option>
                    </select>
                  </div>
                  <p className={`text-[10px] sm:text-xs mt-1 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-400"
                  }`}>
                    Changing status will update tenant's current standing
                  </p>
                </div>

                {/* Lease Start Date */}
                <div>
                  <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Move-in Date (Lease Start) *
                  </label>
                  <div className={`rounded-xl overflow-hidden transition-colors duration-300 ${
                    theme === "dark" ? "bg-gray-700" : "bg-white"
                  }`}>
                    <div className="relative">
                      <Calendar className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      <input
                        type="date"
                        required
                        value={formData.leaseStartDate}
                        onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                        className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 text-gray-100 border-gray-600" 
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                      />
                    </div>
                  </div>
                  <p className={`text-[10px] sm:text-xs mt-1 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-400"
                  }`}>
                    Update the date tenant moved in / lease started
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="relative my-4 sm:my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full h-px transition-colors duration-300 ${
                    theme === "dark" ? "bg-gray-600" : "bg-gray-200"
                  }`} />
                </div>
                <div className="relative flex justify-center">
                  <span className={`px-3 sm:px-4 text-[10px] sm:text-xs transition-colors duration-300 ${
                    theme === "dark" ? "bg-gray-800/80 text-gray-400" : "bg-white/80 text-gray-500"
                  }`}>
                    Update Tenant Details
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 xs:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
                    theme === "dark"
                      ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                      : "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className={`flex-1 xs:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Cancel
                </button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}