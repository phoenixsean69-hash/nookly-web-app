"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useEffect, useState, useCallback } from "react";
import { Query } from "appwrite";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useRouter } from "next/navigation";
import { databases } from "@/lib/appwrite/config";
import Link from "next/link";
import Image from "next/image";
import {
  Home,
  Building2,
  MapPin,
  Bed,
  Bath,
  Users,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Filter,
  Search,
  Grid3x3,
  List,
  Eye,
  Heart,
  MessageCircle,
  Calendar,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

// Property interface
interface ExtendedProperty {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  views?: number;
  likes?: number;
  requests?: number;
  price?: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  roomFor?: number;
  isAvailable?: boolean;
  propertyName?: string;
  address?: string;
  type?: string;
  description?: string;
  image1?: string;
  image2?: string;
  image3?: string;
  curfew?: string;
  creatorId?: string;
  latitude?: string;
  longitude?: string;
  totalSlots?: number;
  occupiedSlots?: number;
  availableSlots?: number;
  priceThreshold?: number;
}

export default function WithinUsPage() {
  const { organization } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [properties, setProperties] = useState<ExtendedProperty[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<ExtendedProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "rented">("all");
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high" | "views">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [organizationCity, setOrganizationCity] = useState<string>("");

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Function to check sidebar state
  const checkSidebarState = useCallback(() => {
    if (isMobile) {
      const mobileState = sessionStorage.getItem('mobileSidebarOpen');
      setIsSidebarCollapsed(mobileState !== 'true');
      return;
    }
    const savedState = localStorage.getItem('sidebarCollapsed');
    setIsSidebarCollapsed(savedState === 'true');
  }, [isMobile]);

  // Listen for sidebar state changes
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

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sidebarToggle', handleCustomEvent as EventListener);
    window.addEventListener('mobileSidebarToggle', handleMobileToggle as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sidebarToggle', handleCustomEvent as EventListener);
      window.removeEventListener('mobileSidebarToggle', handleMobileToggle as EventListener);
    };
  }, [checkSidebarState, isMobile]);

  // Fetch ALL properties and filter by city
// Fetch ALL properties and filter by city (excluding own properties)
useEffect(() => {
  const fetchProperties = async () => {
    setIsLoading(true);

    try {
      // Get organization city from the organization object
      const orgCity = (organization as any)?.city || "";
      setOrganizationCity(orgCity);

      if (!orgCity) {
        setIsLoading(false);
        return;
      }

      // Fetch ALL properties (no creatorId filter)
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        [
          Query.orderDesc("$createdAt"),
          Query.limit(1000), // Get as many as possible
        ],
      );

      const allProperties = response.documents as unknown as ExtendedProperty[];
      
      // Filter properties where:
      // 1. Address contains the organization city
      // 2. NOT created by this organization
      // 3. Type is either "House" or "Boarding"
      const matchedProperties = allProperties.filter((property: ExtendedProperty) => {
        if (!orgCity || !property.address) return false;
        
        // EXCLUDE properties created by this organization
        if (property.creatorId === organization?.userId) return false;
        
        // ONLY include properties with type "House" or "Boarding"
        if (property.type !== "House" && property.type !== "Boarding") return false;
        
        // Convert both to lowercase for case-insensitive comparison
        const addressLower = property.address.toLowerCase();
        const cityLower = orgCity.toLowerCase();
        
        // Check if the city appears in the address
        const addressParts: string[] = addressLower.split(/[,.\s]+/);
        const cityWords: string[] = cityLower.split(/[\s,]+/);
        
        // Check if any part of the city name appears in any part of the address
        return cityWords.some((cityWord: string) => 
          addressParts.some((part: string) => part === cityWord || part.includes(cityWord))
        );
      });

      setProperties(matchedProperties);
      setFilteredProperties(matchedProperties);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setIsLoading(false);
    }
  };

  fetchProperties();
}, [organization]);

  // Apply filters and search
  useEffect(() => {
    let result = [...properties];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p: ExtendedProperty) => 
        p.propertyName?.toLowerCase().includes(term) ||
        p.address?.toLowerCase().includes(term) ||
        p.type?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filterStatus === "available") {
      result = result.filter((p: ExtendedProperty) => p.isAvailable === true);
    } else if (filterStatus === "rented") {
      result = result.filter((p: ExtendedProperty) => p.isAvailable === false);
    }

    // Apply sorting
    switch (sortBy) {
      case "price-low":
        result.sort((a: ExtendedProperty, b: ExtendedProperty) => (a.price || 0) - (b.price || 0));
        break;
      case "price-high":
        result.sort((a: ExtendedProperty, b: ExtendedProperty) => (b.price || 0) - (a.price || 0));
        break;
      case "views":
        result.sort((a: ExtendedProperty, b: ExtendedProperty) => (b.views || 0) - (a.views || 0));
        break;
      case "newest":
      default:
        result.sort((a: ExtendedProperty, b: ExtendedProperty) => {
          const dateA = new Date(a.$createdAt || 0);
          const dateB = new Date(b.$createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
        break;
    }

    setFilteredProperties(result);
  }, [properties, searchTerm, filterStatus, sortBy]);

  // Calculate stats
  const totalProperties = filteredProperties.length;
  const availableProperties = filteredProperties.filter((p: ExtendedProperty) => p.isAvailable === true).length;
  const rentedProperties = filteredProperties.filter((p: ExtendedProperty) => p.isAvailable === false).length;
  const totalViews = filteredProperties.reduce((sum: number, p: ExtendedProperty) => sum + (p.views || 0), 0);
  const totalLikes = filteredProperties.reduce((sum: number, p: ExtendedProperty) => sum + (p.likes || 0), 0);
  const totalRequests = filteredProperties.reduce((sum: number, p: ExtendedProperty) => sum + (p.requests || 0), 0);

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
            <main className="p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-500)] mx-auto" />
                  <p className={`mt-4 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Loading properties within your city...
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
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.back()}
                    className={`p-2 rounded-lg transition-colors duration-300 ${
                      theme === "dark" 
                        ? "hover:bg-gray-700 text-gray-400" 
                        : "hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      Properties Within Us
                    </h1>
                    <p className={`text-sm mt-1 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Properties located in {organizationCity || "your city"} from all providers
                    </p>
                  </div>
                </div>
                {organizationCity && (
                  <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
                    theme === "dark" 
                      ? "bg-[var(--accent-950)]/30 text-[var(--accent-400)] border border-[var(--accent-800)]" 
                      : "bg-[var(--accent-50)] text-[var(--accent-700)] border border-[var(--accent-200)]"
                  }`}>
                    <MapPin className="w-4 h-4" />
                    {organizationCity}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className={`rounded-xl p-4 border transition-colors duration-300 ${
                theme === "dark" 
                  ? "bg-gray-800 border-gray-700" 
                  : "bg-white border-gray-100"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === "dark" ? "bg-blue-900/30" : "bg-blue-50"
                  }`}>
                    <Home className={`w-5 h-5 ${
                      theme === "dark" ? "text-blue-400" : "text-blue-600"
                    }`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      {totalProperties}
                    </p>
                    <p className={`text-xs transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Total Properties
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl p-4 border transition-colors duration-300 ${
                theme === "dark" 
                  ? "bg-gray-800 border-gray-700" 
                  : "bg-white border-gray-100"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === "dark" ? "bg-green-900/30" : "bg-green-50"
                  }`}>
                    <CheckCircle className={`w-5 h-5 ${
                      theme === "dark" ? "text-green-400" : "text-green-600"
                    }`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      {availableProperties}
                    </p>
                    <p className={`text-xs transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Available
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl p-4 border transition-colors duration-300 ${
                theme === "dark" 
                  ? "bg-gray-800 border-gray-700" 
                  : "bg-white border-gray-100"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === "dark" ? "bg-orange-900/30" : "bg-orange-50"
                  }`}>
                    <XCircle className={`w-5 h-5 ${
                      theme === "dark" ? "text-orange-400" : "text-orange-600"
                    }`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      {rentedProperties}
                    </p>
                    <p className={`text-xs transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Rented
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl p-4 border transition-colors duration-300 ${
                theme === "dark" 
                  ? "bg-gray-800 border-gray-700" 
                  : "bg-white border-gray-100"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === "dark" ? "bg-purple-900/30" : "bg-purple-50"
                  }`}>
                    <Eye className={`w-5 h-5 ${
                      theme === "dark" ? "text-purple-400" : "text-purple-600"
                    }`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      {totalViews}
                    </p>
                    <p className={`text-xs transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Total Views
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* No properties message */}
            {organizationCity === "" && (
              <div className={`mb-6 rounded-xl p-6 text-center border ${
                theme === "dark" 
                  ? "bg-yellow-900/20 border-yellow-800" 
                  : "bg-yellow-50 border-yellow-200"
              }`}>
                <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${
                  theme === "dark" ? "text-yellow-400" : "text-yellow-600"
                }`} />
                <h3 className={`text-sm font-semibold ${
                  theme === "dark" ? "text-yellow-300" : "text-yellow-800"
                }`}>
                  No City Set for Your Organization
                </h3>
                <p className={`text-xs mt-1 ${
                  theme === "dark" ? "text-yellow-200/70" : "text-yellow-600"
                }`}>
                  Please set your organization's city in the settings to see properties within your area.
                </p>
              </div>
            )}

            {filteredProperties.length === 0 && organizationCity && (
              <div className={`rounded-xl p-12 text-center border-2 border-dashed ${
                theme === "dark" 
                  ? "border-gray-700 bg-gray-800/50" 
                  : "border-gray-200 bg-gray-50"
              }`}>
                <Building2 className={`w-12 h-12 mx-auto mb-3 ${
                  theme === "dark" ? "text-gray-600" : "text-gray-300"
                }`} />
                <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  No properties found in {organizationCity}
                </h3>
                <p className={`text-sm mt-1 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  Properties with addresses containing "{organizationCity}" will appear here.
                </p>
              </div>
            )}

            {/* Filters and Search */}
            {filteredProperties.length > 0 && (
              <div className={`mb-6 rounded-xl p-4 border transition-colors duration-300 ${
                theme === "dark" 
                  ? "bg-gray-800 border-gray-700" 
                  : "bg-white border-gray-100"
              }`}>
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`} />
                    <input
                      type="text"
                      placeholder="Search properties..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                        theme === "dark" 
                          ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                          : "border border-gray-300 text-gray-900 bg-white"
                      }`}
                    />
                  </div>

                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
                  </button>

                  {/* View Toggle */}
                  <div className={`flex rounded-lg overflow-hidden border ${
                    theme === "dark" ? "border-gray-600" : "border-gray-300"
                  }`}>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`px-3 py-2 transition ${
                        viewMode === "grid"
                          ? theme === "dark"
                            ? "bg-[var(--accent-500)] text-white"
                            : "bg-[var(--accent-500)] text-white"
                          : theme === "dark"
                            ? "bg-gray-700 text-gray-400 hover:bg-gray-600"
                            : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-3 py-2 transition ${
                        viewMode === "list"
                          ? theme === "dark"
                            ? "bg-[var(--accent-500)] text-white"
                            : "bg-[var(--accent-500)] text-white"
                          : theme === "dark"
                            ? "bg-gray-700 text-gray-400 hover:bg-gray-600"
                            : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className={`px-4 py-2 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100" 
                        : "border border-gray-300 text-gray-900 bg-white"
                    }`}
                  >
                    <option value="newest">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="views">Most Views</option>
                  </select>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFilterStatus("all")}
                        className={`px-3 py-1.5 rounded-full text-sm transition ${
                          filterStatus === "all"
                            ? theme === "dark"
                              ? "bg-[var(--accent-500)] text-white"
                              : "bg-[var(--accent-500)] text-white"
                            : theme === "dark"
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        All ({totalProperties})
                      </button>
                      <button
                        onClick={() => setFilterStatus("available")}
                        className={`px-3 py-1.5 rounded-full text-sm transition ${
                          filterStatus === "available"
                            ? "bg-green-500 text-white"
                            : theme === "dark"
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Available ({availableProperties})
                      </button>
                      <button
                        onClick={() => setFilterStatus("rented")}
                        className={`px-3 py-1.5 rounded-full text-sm transition ${
                          filterStatus === "rented"
                            ? "bg-orange-500 text-white"
                            : theme === "dark"
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Rented ({rentedProperties})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Property Grid/List */}
            {filteredProperties.length > 0 && (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                : "space-y-4"
              }>
                {filteredProperties.map((property: ExtendedProperty) => {
                  const propertyImage = property.image1 || property.image2 || property.image3;
                  const isAvailable = property.isAvailable === true;
                  const statusText = isAvailable ? "Available" : "Rented";
                  const StatusIcon = isAvailable ? CheckCircle : XCircle;

                  if (viewMode === "grid") {
                    return (
                      <Link
                        key={property.$id}
                        href={`/dashboard/properties/${property.$id}`}
                        className={`group rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-xl ${
                          theme === "dark" 
                            ? "bg-gray-800 border-gray-700 hover:border-[var(--accent-700)]" 
                            : "bg-white border-gray-200 hover:border-[var(--accent-300)]"
                        }`}
                      >
                        {/* Image */}
                        <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                          {propertyImage ? (
                            <Image
                              src={propertyImage}
                              alt={property.propertyName || "Property"}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3 flex gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                              isAvailable
                                ? "bg-green-500/90 text-white"
                                : "bg-orange-500/90 text-white"
                            }`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusText}
                            </span>
                          </div>
                          {property.type && (
                            <span className={`absolute bottom-3 left-3 px-2 py-0.5 rounded-full text-xs font-medium ${
                              theme === "dark" 
                                ? "bg-gray-900/80 text-gray-300" 
                                : "bg-black/60 text-white"
                            }`}>
                              {property.type}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h3 className={`text-sm font-semibold truncate transition-colors duration-300 group-hover:text-[var(--accent-500)] ${
                            theme === "dark" ? "text-gray-200" : "text-gray-800"
                          }`}>
                            {property.propertyName}
                          </h3>
                          
                          <p className={`text-xs truncate mt-1 flex items-center gap-1 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>
                            <MapPin className="w-3 h-3" />
                            {property.address || "No address"}
                          </p>

                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className={`flex items-center gap-1 ${
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>
                              <Bed className="w-3 h-3" />
                              {property.bedrooms || 0}
                            </span>
                            <span className={`flex items-center gap-1 ${
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>
                              <Bath className="w-3 h-3" />
                              {property.bathrooms || 0}
                            </span>
                            <span className={`flex items-center gap-1 ${
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>
                              <Users className="w-3 h-3" />
                              {property.roomFor || 0}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <span className={`text-lg font-bold ${
                              theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-600)]"
                            }`}>
                              ${property.price?.toLocaleString() || 0}
                              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/mo</span>
                            </span>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-0.5">
                                <Eye className="w-3 h-3" />
                                {property.views || 0}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Heart className="w-3 h-3" />
                                {property.likes || 0}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <MessageCircle className="w-3 h-3" />
                                {property.requests || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  } else {
                    // List View
                    return (
                      <Link
                        key={property.$id}
                        href={`/dashboard/properties/${property.$id}`}
                        className={`group rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-lg flex ${
                          theme === "dark" 
                            ? "bg-gray-800 border-gray-700 hover:border-[var(--accent-700)]" 
                            : "bg-white border-gray-200 hover:border-[var(--accent-300)]"
                        }`}
                      >
                        {/* Image */}
                        <div className="relative w-40 h-40 flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                          {propertyImage ? (
                            <Image
                              src={propertyImage}
                              alt={property.propertyName || "Property"}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                            isAvailable
                              ? "bg-green-500/90 text-white"
                              : "bg-orange-500/90 text-white"
                          }`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusText}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className={`text-sm font-semibold transition-colors duration-300 group-hover:text-[var(--accent-500)] ${
                                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                                }`}>
                                  {property.propertyName}
                                </h3>
                                <p className={`text-xs flex items-center gap-1 mt-0.5 ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                                }`}>
                                  <MapPin className="w-3 h-3" />
                                  {property.address || "No address"}
                                </p>
                              </div>
                              <span className={`text-sm font-bold ${
                                theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-600)]"
                              }`}>
                                ${property.price?.toLocaleString() || 0}
                                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/mo</span>
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                              <span className={`flex items-center gap-1 ${
                                theme === "dark" ? "text-gray-400" : "text-gray-500"
                              }`}>
                                <Bed className="w-3 h-3" />
                                {property.bedrooms || 0} beds
                              </span>
                              <span className={`flex items-center gap-1 ${
                                theme === "dark" ? "text-gray-400" : "text-gray-500"
                              }`}>
                                <Bath className="w-3 h-3" />
                                {property.bathrooms || 0} baths
                              </span>
                              <span className={`flex items-center gap-1 ${
                                theme === "dark" ? "text-gray-400" : "text-gray-500"
                              }`}>
                                <Users className="w-3 h-3" />
                                {property.roomFor || 0} people
                              </span>
                              {property.area && (
                                <span className={`flex items-center gap-1 ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                                }`}>
                                  <span className="text-xs">{property.area} m²</span>
                                </span>
                              )}
                              {property.type && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  theme === "dark" 
                                    ? "bg-gray-700 text-gray-300" 
                                    : "bg-gray-100 text-gray-600"
                                }`}>
                                  {property.type}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {property.views || 0} views
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {property.likes || 0} likes
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {property.requests || 0} requests
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(property.$createdAt || 0).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  }
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}