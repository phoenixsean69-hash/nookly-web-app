"use client";
import { updateOrganizationPropertyCount } from "@/lib/appwrite/helpers";
import { cacheService } from "@/lib/cache.service";
import { CACHE_KEYS } from "@/lib/cache-keys";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import Link from "next/link";
import { databases, storage } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import Image from "next/image";
import { Property } from "@/types/property";
import {
  Home,
  Building2,
  Bed,
  Bath,
  Ruler,
  DollarSign,
  MapPin,
  Eye,
  Edit,
  Trash2,
  PlusCircle,
  Search,
  X,
  CheckCircle,
  Clock,
  Heart,
  Users,
  Calendar,
  Moon,
  WifiOff,
  RefreshCw,
  Star,
  TrendingUp,
  Shield,
  Award,
  User,
  Phone,
  Mail,
} from "lucide-react";

interface Tenant {
  $id: string;
  name: string;
  identifier: string;
  phone: string;
  email: string;
  propertyName: string;
  status: string;
  monthlyRent: number;
  leaseStartDate: string;
  avatar?: string;
  propertyId?: string;
}

export default function PropertiesPage() {
  const { organization, isOffline } = useAuth();
  const { theme } = useTheme();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  useEffect(() => {
    Promise.all([fetchProperties(), fetchTenants()]);
  }, [organization?.$id]);

  const fetchProperties = async () => {
    try {
      const cachedProperties = cacheService.get<Property[]>(CACHE_KEYS.PROPERTIES);
      if (cachedProperties && cachedProperties.length > 0) {
        setProperties(cachedProperties);
        setLastUpdated(new Date());
        console.log('📦 Loaded properties from cache');
      }
      
      if (!navigator.onLine) {
        setIsLoading(false);
        console.log('📴 Offline mode - using cached properties');
        return;
      }
      
      if (!organization?.$id) {
        setIsLoading(false);
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
      
      cacheService.set(CACHE_KEYS.PROPERTIES, props, 5 * 60 * 1000);
      setLastUpdated(new Date());
      console.log('✅ Properties cached successfully');
      
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      if (!navigator.onLine) {
        console.log('📴 Offline - using cached tenants');
        return;
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
        [Query.orderDesc("$createdAt")]
      );
      
      const fetchedTenants = response.documents as unknown as Tenant[];
      setTenants(fetchedTenants);
      console.log('✅ Tenants fetched successfully');
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  };

  const getTenantsForProperty = (propertyName: string) => {
    return tenants.filter(t => t.propertyName === propertyName && t.status === 'active');
  };

  const handleRefresh = async () => {
    if (isOffline) {
      alert("You're offline. Please connect to the internet to refresh properties.");
      return;
    }
    
    setIsRefreshing(true);
    try {
      await Promise.all([fetchProperties(), fetchTenants()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProperty) return;

    try {
      const imageIds = [
        selectedProperty.image1,
        selectedProperty.image2,
        selectedProperty.image3,
      ].filter(Boolean);

      for (const imageUrl of imageIds) {
        if (imageUrl) {
          const fileId = imageUrl.split("/files/")[1]?.split("/")[0];
          if (fileId) {
            try {
              await storage.deleteFile(
                process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!,
                fileId
              );
            } catch (error) {
              console.error("Error deleting image:", error);
            }
          }
        }
      }

      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        selectedProperty.$id
      );

      if (organization?.userId) {
        await updateOrganizationPropertyCount(organization.userId, 'decrement');
      }

      const updatedProperties = properties.filter(p => p.$id !== selectedProperty.$id);
      cacheService.set(CACHE_KEYS.PROPERTIES, updatedProperties, 5 * 60 * 1000);
      setProperties(updatedProperties);

      setShowDeleteModal(false);
      setSelectedProperty(null);
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Failed to delete property");
    }
  };

  const getPricingDisplay = (property: Property) => {
    const type = property.type?.toLowerCase();
    
    if (type === "luxury") {
      return `${property.price}/night`;
    } else if (type === "boarding") {
      return `${property.price}/month per head`;
    } else if (type === "land") {
      return `${property.price}/sq meter`;
    } else if (type === "workplace" || type === "commercial") {
      return `${property.price}/month for office`;
    } else {
      return `${property.price}/month`;
    }
  };

  const getCurfewDisplay = (property: Property) => {
    const type = property.type?.toLowerCase();
    const curfew = property.curfew;
    
    if (type === "boarding") {
      if (!curfew || curfew.toLowerCase() === "no curfew") {
        return "No curfew";
      }
      return curfew;
    }
    
    if (curfew && curfew.toLowerCase() !== "no curfew" && curfew !== "") {
      return curfew;
    }
    return null;
  };

  const getAdditionalInfo = (property: Property) => {
    const type = property.type?.toLowerCase();
    
    if (type === "boarding") {
      const areaPerPerson = property.area && property.roomFor 
        ? Math.round(property.area / property.roomFor) 
        : null;
      const availableRooms = property.roomFor || 0;
      
      return (
        <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-gray-100/50 dark:border-gray-700/50">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Users className="w-3.5 h-3.5 text-[var(--accent-500)] dark:text-[var(--accent-400)]" />
            <span>Rooms for {availableRooms} {availableRooms === 1 ? 'person' : 'people'}</span>
          </div>
        </div>
      );
    } else if (type === "luxury") {
      return (
        <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-gray-100/50 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
          <span>Premium nightly rental</span>
        </div>
      );
    } else if (type === "land") {
      return (
        <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-gray-100/50 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
          <Ruler className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
          <span>Total land area: {property.area} m²</span>
        </div>
      );
    } else if (type === "workplace") {
      return (
        <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-gray-100/50 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
          <Building2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          <span>Commercial/Office space</span>
        </div>
      );
    }
    return null;
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch = property.propertyName
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "available" && property.isAvailable === true) ||
      (filterStatus === "rented" && property.isAvailable === false);
    
    const matchesType = filterType === "all" || 
      property.type?.toLowerCase() === filterType.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (isAvailable: boolean) => {
    if (isAvailable) {
      return {
        text: "Available",
        icon: CheckCircle,
        className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
      };
    }
    return {
      text: "Rented",
      icon: Clock,
      className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    };
  };

  const propertyTypes = ["all", ...new Set(properties.map(p => p.type).filter(Boolean))];

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
          theme === "dark" 
            ? "bg-gray-900" 
            : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
        }`}>
          <Sidebar />
          <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
            <Header />
            <main className="p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-500)] mx-auto" />
                  <p className={`mt-4 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
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
        theme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <Sidebar />
        <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
          <Header />
          <main className="p-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                  }`}>
                    Properties
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    theme === "dark" 
                      ? "bg-gray-700 text-gray-300" 
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {filteredProperties.length}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className={`text-sm transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    Manage all your property listings
                  </p>
                  {isOffline && (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                      <WifiOff className="w-3 h-3" />
                      Offline Mode
                    </span>
                  )}
                  {!isOffline && lastUpdated && (
                    <span className={`text-xs transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`}>
                      Updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing || isOffline}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${
                    isOffline 
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : `bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600`
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <Link
                  href="/dashboard/properties/new"
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition shadow-sm hover:shadow-md"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add New Property
                </Link>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className={`rounded-xl shadow-sm p-4 mb-6 transition-colors duration-300 border ${
              theme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className={`w-4 h-4 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-400"
                    }`} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by property name or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-200 text-gray-900 bg-white"
                    }`}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className={`px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100" 
                        : "border border-gray-200 text-gray-900 bg-white"
                    }`}
                  >
                    {propertyTypes.map((type) => (
                      <option key={type} value={type}>
                        {type === "all" ? "All Types" : type}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-4 py-2.5 rounded-lg transition text-sm font-medium ${
                      filterStatus === "all"
                        ? "bg-[var(--accent-500)] text-white shadow-sm"
                        : theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus("available")}
                    className={`px-4 py-2.5 rounded-lg transition text-sm font-medium ${
                      filterStatus === "available"
                        ? "bg-green-600 text-white shadow-sm"
                        : theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => setFilterStatus("rented")}
                    className={`px-4 py-2.5 rounded-lg transition text-sm font-medium ${
                      filterStatus === "rented"
                        ? "bg-blue-600 text-white shadow-sm"
                        : theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Rented
                  </button>
                </div>
              </div>
            </div>

            {/* Offline Warning */}
            {isOffline && properties.length > 0 && (
              <div className={`mb-6 border rounded-xl p-4 flex items-center gap-3 ${
                theme === "dark" 
                  ? "bg-yellow-900/20 border-yellow-800" 
                  : "bg-yellow-50/80 border-yellow-200 backdrop-blur-sm"
              }`}>
                <div className={`p-2 rounded-full ${
                  theme === "dark" ? "bg-yellow-900/30" : "bg-yellow-100"
                }`}>
                  <WifiOff className={`w-4 h-4 ${
                    theme === "dark" ? "text-yellow-400" : "text-yellow-600"
                  }`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    theme === "dark" ? "text-yellow-300" : "text-yellow-700"
                  }`}>
                    You're offline
                  </p>
                  <p className={`text-xs ${
                    theme === "dark" ? "text-yellow-400/70" : "text-yellow-600/70"
                  }`}>
                    Showing cached properties from your last visit
                  </p>
                </div>
              </div>
            )}

            {/* Properties Grid */}
            {filteredProperties.length === 0 ? (
              <div className={`rounded-2xl shadow-sm p-16 text-center transition-colors duration-300 border ${
                theme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                }`}>
                  <Home className={`w-12 h-12 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                </div>
                <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  No properties found
                </h3>
                <p className={`mb-6 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  {searchTerm || filterStatus !== "all" || filterType !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Get started by adding your first property"}
                </p>
                {!searchTerm && filterStatus === "all" && filterType === "all" && !isOffline && (
                  <Link
                    href="/dashboard/properties/new"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition shadow-sm hover:shadow-md"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add New Property
                  </Link>
                )}
                {isOffline && (
                  <p className={`text-sm mt-2 transition-colors duration-300 ${
                    theme === "dark" ? "text-yellow-400" : "text-yellow-600"
                  }`}>
                    Connect to the internet to add new properties
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((property) => {
                  const status = getStatusBadge(property.isAvailable ?? true);
                  const StatusIcon = status.icon;
                  const mainImage = property.image1 || property.image2 || property.image3;
                  const type = property.type || "N/A";
                  const curfewDisplay = getCurfewDisplay(property);
                  const propertyTenants = getTenantsForProperty(property.propertyName);
                  const hasTenants = propertyTenants.length > 0;
                  
                  return (
                    <div
                      key={property.$id}
                      className={`group rounded-2xl overflow-hidden transition-all duration-300 border ${
                        theme === "dark" 
                          ? "bg-gray-800/80 border-gray-700 hover:border-gray-600 hover:shadow-xl hover:shadow-gray-900/50" 
                          : "bg-white/80 border-gray-100 hover:border-[var(--accent-200)] hover:shadow-xl backdrop-blur-sm"
                      }`}
                    >
                      {/* Image Section */}
                      <div className="relative h-52 bg-gradient-to-br from-blue-500 to-blue-600 shrink-0 overflow-hidden">
                        {mainImage ? (
                          <Image
                            src={mainImage}
                            alt={property.propertyName}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-16 h-16 text-white/30" />
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        
                        {/* Status Badge */}
                        <div className="absolute top-3 right-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm ${status.className} ${
                            theme === "dark" ? "bg-opacity-90" : ""
                          }`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.text}
                          </span>
                        </div>
                        
                        {/* Type Badge */}
                        <div className="absolute bottom-3 left-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm border border-white/10">
                            <Award className="w-3.5 h-3.5" />
                            {type}
                          </span>
                        </div>
                        
                        {/* Price Badge */}
                        <div className="absolute bottom-3 right-3">
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold bg-black/60 text-white backdrop-blur-sm border border-white/10">
                            Prices/month <DollarSign className="w-3.5 h-3.5" />
                            {property.price.toLocaleString()}
                            <span className="text-[10px] font-normal text-white/70">
                              {property.type?.toLowerCase() === "luxury" ? "/night" : 
                               property.type?.toLowerCase() === "land" ? "/sq m" :
                               property.type?.toLowerCase() === "boarding" ? "/head" :
                               property.type?.toLowerCase() === "workplace" ? "/mo" :
                               "/mo"}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-5">
                        {/* Property Name & Likes */}
                        <div className="flex justify-between items-start mb-2">
                          <h3 className={`text-lg font-bold line-clamp-1 flex-1 transition-colors duration-300 group-hover:text-[var(--accent-500)] ${
                            theme === "dark" ? "text-gray-100" : "text-gray-800"
                          }`}>
                            {property.propertyName}
                          </h3>
                          <div className="flex items-center gap-1 text-red-500 ml-2 shrink-0">
                            <Heart className="w-4 h-4 fill-red-500" />
                            <span className="text-sm font-semibold">{property.likes || 0}</span>
                          </div>
                        </div>
                        
                        {/* Location */}
                        <div className={`flex items-center gap-1.5 text-sm mb-3 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="line-clamp-1">{property.address}</span>
                        </div>

                        {/* Tenants Section */}
                        {hasTenants ? (
                          <div className="mb-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Users className={`w-3.5 h-3.5 ${
                                theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                              }`} />
                              <span className={`text-xs font-medium ${
                                theme === "dark" ? "text-gray-300" : "text-gray-700"
                              }`}>
                                {propertyTenants.length} Tenant{propertyTenants.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {propertyTenants.slice(0, 2).map((tenant) => (
                                <div key={tenant.$id} className={`flex items-center gap-2 p-1.5 rounded-lg ${
                                  theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
                                }`}>
                                  {tenant.avatar ? (
                                    <Image
                                      src={tenant.avatar}
                                      alt={tenant.name}
                                      width={24}
                                      height={24}
                                      className="rounded-full object-cover w-6 h-6"
                                    />
                                  ) : (
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                      theme === "dark" ? "bg-gray-600" : "bg-blue-100"
                                    }`}>
                                      <User className={`w-3.5 h-3.5 ${
                                        theme === "dark" ? "text-gray-400" : "text-blue-600"
                                      }`} />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium truncate ${
                                      theme === "dark" ? "text-gray-200" : "text-gray-800"
                                    }`}>
                                      {tenant.name}
                                    </p>
                                    <p className={`text-[10px] truncate ${
                                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                                    }`}>
                                      ${tenant.monthlyRent}/mo
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {propertyTenants.length > 2 && (
                                <p className={`text-[10px] text-center ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                                }`}>
                                  +{propertyTenants.length - 2} more tenant{propertyTenants.length - 2 > 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className={`mb-3 p-2 rounded-lg border border-dashed ${
                            theme === "dark" 
                              ? "border-gray-600 text-gray-400" 
                              : "border-gray-300 text-gray-500"
                          }`}>
                            <div className="flex items-center justify-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              <span className="text-xs">No tenants yet</span>
                            </div>
                          </div>
                        )}

                        {/* Specs Grid */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700/50 text-gray-300" 
                              : "bg-gray-50 text-gray-600"
                          }`}>
                            <Bed className="w-3.5 h-3.5" />
                            <span>{property.bedrooms}</span>
                          </div>
                          <div className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700/50 text-gray-300" 
                              : "bg-gray-50 text-gray-600"
                          }`}>
                            <Bath className="w-3.5 h-3.5" />
                            <span>{property.bathrooms}</span>
                          </div>
                          <div className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700/50 text-gray-300" 
                              : "bg-gray-50 text-gray-600"
                          }`}>
                            <Ruler className="w-3.5 h-3.5" />
                            <span>{property.area}m²</span>
                          </div>
                        </div>

                        {/* Views & Engagement */}
                        <div className={`flex items-center justify-between text-xs mb-2 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {property.views || 0} views
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {property.likes || 0} likes
                            </span>
                          </div>
                        </div>

                        {/* Curfew & Additional Info */}
                        {curfewDisplay && (
                          <div className="flex items-center gap-1.5 mb-2 text-xs">
                            <Moon className={`w-3.5 h-3.5 ${
                              type === "boarding" 
                                ? "text-[var(--accent-500)] dark:text-[var(--accent-400)]" 
                                : "text-gray-400 dark:text-gray-500"
                            }`} />
                            <span className={type === "boarding" ? "text-gray-700 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"}>
                              Curfew: {curfewDisplay}
                            </span>
                          </div>
                        )}

                        {/* Type-specific additional info */}
                        {getAdditionalInfo(property)}

                        {/* Action Buttons */}
                        <div className={`flex gap-2 pt-3 mt-3 border-t transition-colors duration-300 ${
                          theme === "dark" ? "border-gray-700" : "border-gray-100"
                        }`}>
                          <Link
                            href={`/dashboard/properties/${property.$id}`}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition text-sm font-medium ${
                              theme === "dark"
                                ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Link>
                          <Link
                            href={`/dashboard/properties/${property.$id}/edit`}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition text-sm font-medium ${
                              theme === "dark"
                                ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                                : "bg-green-50 text-green-600 hover:bg-green-100"
                            }`}
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedProperty(property);
                              setShowDeleteModal(true);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition text-sm font-medium ${
                              theme === "dark"
                                ? "bg-red-900/30 text-red-400 hover:bg-red-900/50"
                                : "bg-red-50 text-red-600 hover:bg-red-100"
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedProperty && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className={`rounded-2xl p-6 max-w-md w-full mx-4 transition-colors duration-300 shadow-2xl ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      Delete Property
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
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      theme === "dark" ? "bg-red-900/30" : "bg-red-100"
                    }`}>
                      <Trash2 className={`w-10 h-10 ${
                        theme === "dark" ? "text-red-400" : "text-red-600"
                      }`} />
                    </div>
                    <p className={`text-center transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Are you sure you want to delete{" "}
                      <span className="font-semibold">{selectedProperty.propertyName}</span>?
                    </p>
                    <p className={`text-center text-sm mt-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      This action cannot be undone. All images and data will be permanently removed.
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
                      className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium shadow-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}