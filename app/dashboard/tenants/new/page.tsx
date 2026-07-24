"use client";

import { ProtectedRoute } from "@/components/protected-route";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useRouter } from "next/navigation";
import { databases, storage } from "@/lib/appwrite/config";
import { Query, ID } from "appwrite";
import Image from "next/image";
import {
  User,
  Phone,
  Home,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Upload,
  Trash2,
  Plus,
  ArrowLeft,
  Hash,
  Building2,
} from "lucide-react";

interface Property {
  $id: string;
  propertyName: string;
  address: string;
  price: number;
}

export default function NewTenantPage() {
  const { organization } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    identifier: "",
    phone: "",
    propertyName: "",
    propertyId: "",
    status: "active",
    monthlyRent: "",
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

  // Fetch properties when component mounts
  useEffect(() => {
    fetchProperties();
  }, [organization?.userId]);

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
      
      if (props.length > 0 && !formData.monthlyRent) {
        setFormData(prev => ({
          ...prev,
          monthlyRent: props[0].price.toString()
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
        monthlyRent: selectedProperty.price.toString(),
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setAvatarFile(file);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview("");
    setAvatarFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let avatarUrl = "";
      if (avatarFile) {
        const uploadedFile = await storage.createFile(
          process.env.NEXT_PUBLIC_APPWRITE_TENANTS_BUCKET_ID!,
          ID.unique(),
          avatarFile
        );
        avatarUrl = storage
          .getFileView(
            process.env.NEXT_PUBLIC_APPWRITE_TENANTS_BUCKET_ID!,
            uploadedFile.$id
          )
          .toString();
      }

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
        ID.unique(),
        {
          name: formData.name,
          identifier: formData.identifier,
          phone: formData.phone,
          propertyName: formData.propertyName,
          status: formData.status,
          monthlyRent: parseInt(formData.monthlyRent),
          leaseStartDate: formData.leaseStartDate,
          avatar: avatarUrl,
        }
      );

      router.push("/dashboard/tenants");
    } catch (err: unknown) {
      console.error("Error creating tenant:", err);
      let errorMessage = "Failed to create tenant";
      if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Calculate margin based on device and sidebar state
  const getMargin = () => {
    if (isMobile) {
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

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
            <div className="max-w-4xl mx-auto">
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
                        Add New Tenant
                      </h1>
                      <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        Add tenant information to your organization
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className={`mb-4 sm:mb-6 p-3 sm:p-4 border-l-4 rounded-xl overflow-hidden transition-colors duration-300 ${
                  theme === "dark" 
                    ? "bg-red-900/30 border-red-500" 
                    : "bg-red-50 border-red-500"
                }`}>
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
              )}

              <form onSubmit={handleSubmit} className={`rounded-2xl shadow-md p-4 sm:p-6 md:p-8 transition-colors duration-300 border w-full ${
                theme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                {/* Avatar Upload */}
                <div className="flex flex-col items-center mb-6 sm:mb-8">
                  <div className="relative">
                    <label className="cursor-pointer">
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 transition-colors duration-300 ${
                        theme === "dark" 
                          ? "border-[var(--accent-400)] bg-gray-700" 
                          : "border-[var(--accent-500)] bg-gray-100"
                      } flex items-center justify-center`}>
                        {avatarPreview ? (
                          <Image
                            src={avatarPreview}
                            alt="Avatar"
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-500" : "text-gray-400"
                          }`} />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <div className={`absolute bottom-0 right-0 rounded-full p-1.5 shadow-md transition-colors duration-300 ${
                        theme === "dark" 
                          ? "bg-[var(--accent-500)]" 
                          : "bg-[var(--accent-500)]"
                      }`}>
                        <Upload className="w-3 h-3 text-white" />
                      </div>
                    </label>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={removeAvatar}
                        className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition"
                      >
                        <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                      </button>
                    )}
                  </div>
                  <p className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-400"
                  }`}>
                    Optional - Tenant photo
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="sm:col-span-2">
                    <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                            : "border border-gray-200 text-gray-900 bg-white"
                        }`}
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Identifier *
                    </label>
                    <div className="relative">
                      <Hash className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      <input
                        type="text"
                        required
                        value={formData.identifier}
                        onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                            : "border border-gray-200 text-gray-900 bg-white"
                        }`}
                        placeholder="STU-2024-001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                            : "border border-gray-200 text-gray-900 bg-white"
                        }`}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Renting at *
                    </label>
                    <div className="relative">
                      <Home className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      {isLoadingProperties ? (
                        <div className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-gray-400" 
                            : "bg-gray-50 border border-gray-200 text-gray-400"
                        }`}>
                          <span>Loading properties...</span>
                        </div>
                      ) : properties.length === 0 ? (
                        <div className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-yellow-900/20 border-yellow-800 text-yellow-400" 
                            : "bg-yellow-50 border-yellow-200 text-yellow-600"
                        }`}>
                          <span>No properties found. Please add a property first.</span>
                        </div>
                      ) : (
                        <select
                          required
                          value={formData.propertyId || ""}
                          onChange={(e) => handlePropertyChange(e.target.value)}
                          className={`w-full pl-10 pr-10 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 appearance-none ${
                            theme === "dark" 
                              ? "bg-gray-700 border-gray-600 text-gray-100" 
                              : "border border-gray-200 text-gray-900 bg-white"
                          }`}
                        >
                          <option value="" disabled className="text-gray-400">
                            ↓ Select a property ↓
                          </option>
                          {properties.map((property) => (
                            <option key={property.$id} value={property.$id} className="text-gray-900">
                              {property.propertyName} - ${property.price}/mo
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Building2 className={`w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                      </div>
                    </div>
                    {properties.length === 0 && !isLoadingProperties && (
                      <p className="text-xs mt-1 transition-colors duration-300 text-orange-600 dark:text-orange-400">
                        <Link href="/dashboard/properties/new" className="hover:underline">
                          Click here to add a property first
                        </Link>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Status *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={`w-full px-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                        theme === "dark" 
                          ? "bg-gray-700 border-gray-600 text-gray-100" 
                          : "border border-gray-200 text-gray-900 bg-white"
                      }`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Monthly Rent *
                    </label>
                    <div className="relative">
                      <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.monthlyRent}
                        onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                            : "border border-gray-200 text-gray-900 bg-white"
                        } ${formData.propertyId ? 'opacity-70' : ''}`}
                        placeholder="500"
                        readOnly={!!formData.propertyId}
                      />
                    </div>
                    {formData.propertyId && (
                      <p className={`text-xs mt-1 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`}>
                        Rent amount auto-filled from selected property
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Lease Start Date *
                    </label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      <input
                        type="date"
                        required
                        value={formData.leaseStartDate}
                        onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-gray-100" 
                            : "border border-gray-200 text-gray-900 bg-white"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className={`flex flex-col sm:flex-row gap-3 pt-6 sm:pt-8 mt-4 border-t transition-colors duration-300 ${
                  theme === "dark" ? "border-gray-700" : "border-gray-200"
                }`}>
                  <button
                    type="submit"
                    disabled={loading || isLoadingProperties || properties.length === 0}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium ${
                      theme === "dark"
                        ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                        : "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Create Tenant
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}