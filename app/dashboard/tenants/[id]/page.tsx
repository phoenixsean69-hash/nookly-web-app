"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useRouter, useParams } from "next/navigation";
import { databases } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  DollarSign,
  CalendarDays,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  Home,
  MessageCircle,
  Check,
  X,
  Edit,
  Trash2,
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
  organizationId?: string;
  source?: "tenants" | "requests";
  requestId?: string;
  requestStatus?: string;
}

interface RentalRequest {
  $id: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  tenantId: string;
  tenantPhone?: string;
  status: "pending" | "approved" | "rejected";
  tenantEmail: string;
  proposedPrice: number;
  message: string;
  moveInDate: string;
  leaseDuration: string;
  questions: string;
  originalPrice: number;
  tenantAvatar?: string;
  $createdAt: string;
  $updatedAt: string;
  rejectionReason?: string;
}

export default function TenantDetailsPage() {
  const { organization } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [request, setRequest] = useState<RentalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromRequests, setIsFromRequests] = useState(false);
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

  useEffect(() => {
    if (id && organization?.userId) {
      fetchDetails();
    }
  }, [id, organization?.userId]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      // 🔥 STEP 1: Try to fetch as a tenant first
      try {
        const tenantResponse = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
          id
        );
        setTenant(tenantResponse as unknown as Tenant);
        setIsFromRequests(false);
        setIsLoading(false);
        return;
      } catch (tenantError) {
        // Tenant not found, try requests collection
        console.log('Not a tenant, trying requests collection...');
      }

      // 🔥 STEP 2: Try to fetch as a request
      try {
        const requestResponse = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
          id
        );
        setRequest(requestResponse as unknown as RentalRequest);
        setIsFromRequests(true);
        
        // Try to find if this request has a corresponding tenant
        try {
          const tenantResponse = await databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
            [Query.equal("email", requestResponse.tenantEmail)]
          );
          
          if (tenantResponse.documents.length > 0) {
            setTenant(tenantResponse.documents[0] as unknown as Tenant);
          }
        } catch (tenantFindError) {
          // No tenant found, that's fine
        }
        
        setIsLoading(false);
        return;
      } catch (requestError) {
        console.error('Request not found either');
      }

      // 🔥 STEP 3: Neither found
      router.push("/dashboard/tenants");
      
    } catch (error) {
      console.error("Error fetching details:", error);
      router.push("/dashboard/tenants");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return { 
          text: "Active", 
          icon: CheckCircle, 
          className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800",
          color: "green"
        };
      case "pending":
        return { 
          text: "Pending", 
          icon: Clock, 
          className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800",
          color: "yellow"
        };
      case "approved":
        return { 
          text: "Approved", 
          icon: CheckCircle, 
          className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800",
          color: "green"
        };
      case "rejected":
        return { 
          text: "Rejected", 
          icon: XCircle, 
          className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800",
          color: "red"
        };
      default:
        return { 
          text: status, 
          icon: Clock, 
          className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
          color: "gray"
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
                    Loading details...
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!tenant && !request) {
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
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className={`text-xl font-bold mb-2 ${
                    resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}>
                    Not Found
                  </h2>
                  <p className={`text-sm ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    The tenant or request you're looking for doesn't exist.
                  </p>
                  <Link
                    href="/dashboard/tenants"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Tenants
                  </Link>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const displayName = isFromRequests && request ? request.tenantName : tenant?.name || '';
  const displayEmail = isFromRequests && request ? request.tenantEmail : tenant?.email || '';
  const displayPhone = isFromRequests && request ? request.tenantPhone : tenant?.phone || '';
  const displayAvatar = isFromRequests && request ? request.tenantAvatar : tenant?.avatar || '';
  const displayStatus = isFromRequests && request ? request.status : (tenant?.status || '');
  const displayPropertyName = isFromRequests && request ? request.propertyName : tenant?.propertyName || '';
  const displayMonthlyRent = isFromRequests && request ? request.proposedPrice : tenant?.monthlyRent || 0;
  const displayMoveInDate = isFromRequests && request ? request.moveInDate : tenant?.leaseStartDate || '';
  
  const status = getStatusBadge(displayStatus);
  const StatusIcon = status.icon;

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
            {/* Back Button */}
            <div className="mb-4 sm:mb-6">
              <Link
                href="/dashboard/tenants"
                className={`inline-flex items-center gap-2 text-sm transition-colors duration-300 ${
                  resolvedTheme === "dark" 
                    ? "text-gray-400 hover:text-gray-200" 
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Tenants
              </Link>
            </div>

            {/* Header Card */}
            <div className={`rounded-2xl shadow-lg border p-4 sm:p-6 mb-4 sm:mb-6 transition-colors duration-300 ${
              resolvedTheme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  {displayAvatar ? (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-[var(--accent-700)]/30 flex-shrink-0">
                      <Image
                        src={displayAvatar}
                        alt={displayName}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                  )}
                  <div>
                    <h1 className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>
                      {displayName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium ${status.className}`}>
                        <StatusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {status.text}
                      </span>
                      <span className={`text-xs sm:text-sm ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        {isFromRequests ? 'Request ID' : 'Tenant ID'}: {id.slice(0, 12)}...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Tenant Information */}
                <div className={`rounded-2xl shadow-lg border p-4 sm:p-6 transition-colors duration-300 ${
                  resolvedTheme === "dark" 
                    ? "bg-gray-800/80 border-gray-700" 
                    : "bg-white/80 border-gray-100 backdrop-blur-sm"
                }`}>
                  <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                    resolvedTheme === "dark" ? "text-gray-200" : "text-gray-700"
                  }`}>
                    <User className="w-4 h-4 text-[var(--accent-700)]" />
                    {isFromRequests ? 'Requestor Information' : 'Tenant Information'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className={`text-xs ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Full Name</p>
                      <p className={`font-medium ${
                        resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{displayName}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Email</p>
                      <p className={`font-medium truncate ${
                        resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{displayEmail}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Phone</p>
                      <p className={`font-medium ${
                        resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{displayPhone || "Not provided"}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Submitted</p>
                      <p className={`font-medium ${
                        resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{isFromRequests && request ? formatDateTime(request.$createdAt) : formatDateTime(new Date().toISOString())}</p>
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div className={`rounded-2xl shadow-lg border p-4 sm:p-6 transition-colors duration-300 ${
                  resolvedTheme === "dark" 
                    ? "bg-gray-800/80 border-gray-700" 
                    : "bg-white/80 border-gray-100 backdrop-blur-sm"
                }`}>
                  <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                    resolvedTheme === "dark" ? "text-gray-200" : "text-gray-700"
                  }`}>
                    <Building2 className="w-4 h-4 text-[var(--accent-700)]" />
                    Property Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className={`text-xs ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Property Name</p>
                      <p className={`font-medium ${
                        resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{displayPropertyName}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Monthly Rent</p>
                      <p className={`font-medium ${isFromRequests ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                        ${displayMonthlyRent.toLocaleString()}/mo
                      </p>
                    </div>
                    {isFromRequests && request && (
                      <>
                        <div>
                          <p className={`text-xs ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>Original Price</p>
                          <p className={`font-medium line-through ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>
                            ${request.originalPrice.toLocaleString()}/mo
                          </p>
                        </div>
                        {request.leaseDuration && (
                          <div>
                            <p className={`text-xs ${
                              resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>Lease Duration</p>
                            <p className={`font-medium ${
                              resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                            }`}>{request.leaseDuration} months</p>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <p className={`text-xs flex items-center gap-1 ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        <CalendarDays className="w-3 h-3" />
                        {isFromRequests ? 'Move-in Date' : 'Lease Start Date'}
                      </p>
                      <p className={`font-medium ${
                        resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>
                        {displayMoveInDate ? formatDate(displayMoveInDate) : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Message & Questions - Only for requests */}
                {isFromRequests && request && (request.message || request.questions) && (
                  <div className={`rounded-2xl shadow-lg border p-4 sm:p-6 transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "bg-gray-800/80 border-gray-700" 
                      : "bg-white/80 border-gray-100 backdrop-blur-sm"
                  }`}>
                    {request.message && (
                      <div className={`p-3 rounded-lg mb-4 ${
                        resolvedTheme === "dark" 
                          ? "bg-blue-900/20 border border-blue-800" 
                          : "bg-blue-50 border border-blue-100"
                      }`}>
                        <p className={`text-xs font-medium mb-1 ${
                          resolvedTheme === "dark" ? "text-blue-400" : "text-blue-600"
                        }`}>
                          <MessageCircle className="w-3 h-3 inline mr-1" />
                          Message from tenant:
                        </p>
                        <p className={`text-sm ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>
                          "{request.message}"
                        </p>
                      </div>
                    )}
                    {request.questions && (
                      <div className={`p-3 rounded-lg ${
                        resolvedTheme === "dark" 
                          ? "bg-yellow-900/20 border border-yellow-800" 
                          : "bg-yellow-50 border border-yellow-100"
                      }`}>
                        <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${
                          resolvedTheme === "dark" ? "text-yellow-400" : "text-yellow-600"
                        }`}>
                          <AlertCircle className="w-3 h-3" />
                          Questions:
                        </p>
                        <p className={`text-sm ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>
                          "{request.questions}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar Info */}
              <div className="space-y-4 sm:space-y-6">
                {/* Status Card */}
                <div className={`rounded-2xl shadow-lg border p-4 sm:p-6 transition-colors duration-300 ${
                  resolvedTheme === "dark" 
                    ? "bg-gray-800/80 border-gray-700" 
                    : "bg-white/80 border-gray-100 backdrop-blur-sm"
                }`}>
                  <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                    resolvedTheme === "dark" ? "text-gray-200" : "text-gray-700"
                  }`}>
                    <Clock className="w-4 h-4 text-[var(--accent-700)]" />
                    Status Information
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Status</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.text}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Created</span>
                      <span className={`text-sm ${
                        resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>
                        {isFromRequests && request ? formatDate(request.$createdAt) : 'N/A'}
                      </span>
                    </div>
                    {isFromRequests && request && request.rejectionReason && (
                      <div className={`p-3 rounded-lg border ${
                        resolvedTheme === "dark" 
                          ? "bg-red-900/20 border-red-800" 
                          : "bg-red-50 border-red-100"
                      }`}>
                        <p className={`text-xs font-medium mb-1 ${
                          resolvedTheme === "dark" ? "text-red-400" : "text-red-600"
                        }`}>Rejection Reason:</p>
                        <p className={`text-sm ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>{request.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Source Info */}
                <div className={`rounded-2xl shadow-lg border p-4 sm:p-6 transition-colors duration-300 ${
                  resolvedTheme === "dark" 
                    ? "bg-gray-800/80 border-gray-700" 
                    : "bg-white/80 border-gray-100 backdrop-blur-sm"
                }`}>
                  <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                    resolvedTheme === "dark" ? "text-gray-200" : "text-gray-700"
                  }`}>
                    <FileText className="w-4 h-4 text-[var(--accent-700)]" />
                    Source Information
                  </h2>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Source</span>
                      <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                        isFromRequests 
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                        {isFromRequests ? 'Request' : 'Tenant'}
                      </span>
                    </div>
                    {isFromRequests && (
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>Request ID</span>
                        <span className={`text-xs font-mono ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>{id.slice(0, 12)}...</span>
                      </div>
                    )}
                    {tenant && !isFromRequests && (
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>Tenant ID</span>
                        <span className={`text-xs font-mono ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>{id.slice(0, 12)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}