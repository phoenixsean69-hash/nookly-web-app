"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useRouter, useParams } from "next/navigation";
import { databases } from "@/lib/appwrite/config";
import { ID, Query } from "appwrite";
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
  Send,
  FileSignature,
  Check,
  X,
  Edit,
  Trash2,
} from "lucide-react";

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
  formSent?: boolean;
  formSentAt?: string;
  formFileId?: string;
  formFileName?: string;
}

export default function RequestDetailsPage() {
  const { organization } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<RentalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
    if (requestId && organization?.userId) {
      fetchRequestDetails();
    }
  }, [requestId, organization?.userId]);

  const fetchRequestDetails = async () => {
    setIsLoading(true);
    try {
      const response = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
        requestId
      );
      setRequest(response as unknown as RentalRequest);
    } catch (error) {
      console.error("Error fetching request details:", error);
      router.push("/dashboard/tenants");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!request || !organization) return;
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      // Update the request status to approved
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
        requestId,
        {
          status: "approved",
          $updatedAt: new Date().toISOString()
        }
      );

      // Update local state
      setRequest({
        ...request,
        status: "approved",
        $updatedAt: new Date().toISOString()
      });

      setSuccessMessage(`Successfully approved ${request.tenantName}'s rental request!`);
      setShowSuccessModal(true);
      
      // Close approve modal
      setShowApproveModal(false);

      // Refresh the page data
      await fetchRequestDetails();

    } catch (error) {
      console.error("Error approving request:", error);
      setErrorMessage("Failed to approve request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!request || !organization) return;
    
    if (!rejectionReason.trim()) {
      setErrorMessage("Please provide a reason for rejection.");
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      // Update the request status to rejected with reason
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
        requestId,
        {
          status: "rejected",
          rejectionReason: rejectionReason.trim(),
          $updatedAt: new Date().toISOString()
        }
      );

      // Here you could also:
      // 1. Send notification email to tenant with rejection reason
      // 2. Log the rejection for analytics

      // Update local state
      setRequest({
        ...request,
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
        $updatedAt: new Date().toISOString()
      });

      setSuccessMessage(`Successfully rejected ${request.tenantName}'s rental request.`);
      setShowSuccessModal(true);
      
      // Close reject modal
      setShowRejectModal(false);
      setRejectionReason("");

      // Refresh the page data
      await fetchRequestDetails();

    } catch (error) {
      console.error("Error rejecting request:", error);
      setErrorMessage("Failed to reject request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
                    Loading request details...
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!request) {
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
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className={`text-xl font-bold mb-2 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}>
                    Request Not Found
                  </h2>
                  <p className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    The rental request you're looking for doesn't exist.
                  </p>
                  <Link
                    href="/dashboard/tenants"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
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

  const status = getStatusBadge(request.status);
  const StatusIcon = status.icon;

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
            {/* Back Button */}
            <div className="mb-4 sm:mb-6">
              <Link
                href="/dashboard/tenants"
                className={`inline-flex items-center gap-2 text-sm transition-colors duration-300 ${
                  theme === "dark" 
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
              theme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  {request.tenantAvatar ? (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-[var(--accent-500)]/30 flex-shrink-0">
                      <Image
                        src={request.tenantAvatar}
                        alt={request.tenantName}
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
                      theme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>
                      {request.tenantName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium ${status.className}`}>
                        <StatusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {status.text}
                      </span>
                      <span className={`text-xs sm:text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        Request ID: {request.$id.slice(0, 12)}...
                      </span>
                    </div>
                  </div>
                </div>
                {request.status === "pending" && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setShowApproveModal(true)}
                      disabled={isProcessing}
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setShowRejectModal(true)}
                      disabled={isProcessing}
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Tenant Information */}
                <div className={`rounded-2xl shadow-lg border p-4 sm:p-6 transition-colors duration-300 ${
                  theme === "dark" 
                    ? "bg-gray-800/80 border-gray-700" 
                    : "bg-white/80 border-gray-100 backdrop-blur-sm"
                }`}>
                  <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-700"
                  }`}>
                    <User className="w-4 h-4 text-[var(--accent-500)]" />
                    Tenant Information
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Full Name</p>
                      <p className={`font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{request.tenantName}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Email</p>
                      <p className={`font-medium truncate ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{request.tenantEmail}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Phone</p>
                      <p className={`font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{request.tenantPhone || "Not provided"}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Submitted</p>
                      <p className={`font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{formatDateTime(request.$createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div className={`rounded-2xl shadow-lg border p-4 sm:p-6 transition-colors duration-300 ${
                  theme === "dark" 
                    ? "bg-gray-800/80 border-gray-700" 
                    : "bg-white/80 border-gray-100 backdrop-blur-sm"
                }`}>
                  <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-700"
                  }`}>
                    <Building2 className="w-4 h-4 text-[var(--accent-500)]" />
                    Property Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Property Name</p>
                      <p className={`font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{request.propertyName}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Property ID</p>
                      <p className={`font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{request.propertyId}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Proposed Price</p>
                      <p className={`font-medium text-green-600 dark:text-green-400`}>
                        ${request.proposedPrice.toLocaleString()}/mo
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Original Price</p>
                      <p className={`font-medium line-through ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        ${request.originalPrice.toLocaleString()}/mo
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs flex items-center gap-1 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        <CalendarDays className="w-3 h-3" />
                        Move-in Date
                      </p>
                      <p className={`font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{formatDate(request.moveInDate)}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Lease Duration</p>
                      <p className={`font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{request.leaseDuration} months</p>
                    </div>
                  </div>
                </div>

                {/* Message & Questions */}
                {(request.message || request.questions) && (
                  <div className={`rounded-2xl shadow-lg border p-4 sm:p-6 transition-colors duration-300 ${
                    theme === "dark" 
                      ? "bg-gray-800/80 border-gray-700" 
                      : "bg-white/80 border-gray-100 backdrop-blur-sm"
                  }`}>
                    {request.message && (
                      <div className={`p-3 rounded-lg mb-4 ${
                        theme === "dark" 
                          ? "bg-blue-900/20 border border-blue-800" 
                          : "bg-blue-50 border border-blue-100"
                      }`}>
                        <p className={`text-xs font-medium mb-1 ${
                          theme === "dark" ? "text-blue-400" : "text-blue-600"
                        }`}>
                          <MessageCircle className="w-3 h-3 inline mr-1" />
                          Message from tenant:
                        </p>
                        <p className={`text-sm ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>
                          "{request.message}"
                        </p>
                      </div>
                    )}
                    {request.questions && (
                      <div className={`p-3 rounded-lg ${
                        theme === "dark" 
                          ? "bg-yellow-900/20 border border-yellow-800" 
                          : "bg-yellow-50 border border-yellow-100"
                      }`}>
                        <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${
                          theme === "dark" ? "text-yellow-400" : "text-yellow-600"
                        }`}>
                          <AlertCircle className="w-3 h-3" />
                          Questions:
                        </p>
                        <p className={`text-sm ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
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
                  theme === "dark" 
                    ? "bg-gray-800/80 border-gray-700" 
                    : "bg-white/80 border-gray-100 backdrop-blur-sm"
                }`}>
                  <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-700"
                  }`}>
                    <Clock className="w-4 h-4 text-[var(--accent-500)]" />
                    Status Information
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Status</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.text}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Submitted</span>
                      <span className={`text-sm ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{formatDate(request.$createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>Last Updated</span>
                      <span className={`text-sm ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>{formatDate(request.$updatedAt)}</span>
                    </div>
                    {request.rejectionReason && (
                      <div className={`p-3 rounded-lg border ${
                        theme === "dark" 
                          ? "bg-red-900/20 border-red-800" 
                          : "bg-red-50 border-red-100"
                      }`}>
                        <p className={`text-xs font-medium mb-1 ${
                          theme === "dark" ? "text-red-400" : "text-red-600"
                        }`}>Rejection Reason:</p>
                        <p className={`text-sm ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>{request.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

{/* Approve Modal */}
{showApproveModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
    <div className={`w-[450px] max-w-full rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300 ${
      theme === "dark" 
        ? "bg-gray-800/95" 
        : "bg-white/95"
    }`}>
      <div className={`p-6 ${
        theme === "dark" ? "bg-gray-800/95" : "bg-white/95"
      }`}>
        <h2 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
          theme === "dark" ? "text-gray-100" : "text-gray-900"
        }`}>
          Approve Request
        </h2>
        <p className={`text-sm mb-5 transition-colors duration-300 ${
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        }`}>
          Are you sure you want to approve <strong className={theme === "dark" ? "text-gray-200" : "text-gray-800"}>{request.tenantName}</strong>'s request for <strong className={theme === "dark" ? "text-gray-200" : "text-gray-800"}>{request.propertyName}</strong>?
        </p>
        
        <div className={`p-3 rounded-lg mb-5 transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-blue-900/20 border border-blue-800" 
            : "bg-blue-50 border border-blue-100"
        }`}>
          <p className={`text-sm flex items-center gap-2 transition-colors duration-300 ${
            theme === "dark" ? "text-blue-300" : "text-blue-700"
          }`}>
            <CheckCircle className="w-4 h-4" />
            This action will send an approval notification to the tenant.
          </p>
        </div>

        {errorMessage && (
          <div className={`p-3 rounded-lg mb-4 border transition-colors duration-300 ${
            theme === "dark" 
              ? "bg-red-900/20 border-red-800 text-red-300" 
              : "bg-red-50 border-red-100 text-red-700"
          }`}>
            <p className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errorMessage}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowApproveModal(false);
              setErrorMessage("");
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg transition text-sm font-semibold ${
              theme === "dark" 
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Approve
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* Reject Modal */}
{showRejectModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
    <div className={`w-[450px] max-w-full rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300 ${
      theme === "dark" 
        ? "bg-gray-800/95" 
        : "bg-white/95"
    }`}>
      <div className={`p-6 ${
        theme === "dark" ? "bg-gray-800/95" : "bg-white/95"
      }`}>
        <h2 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
          theme === "dark" ? "text-gray-100" : "text-gray-900"
        }`}>
          Reject Request
        </h2>
        <p className={`text-sm mb-4 transition-colors duration-300 ${
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        }`}>
          Please provide a reason for rejecting <strong className={theme === "dark" ? "text-gray-200" : "text-gray-800"}>{request.tenantName}</strong>'s request for <strong className={theme === "dark" ? "text-gray-200" : "text-gray-800"}>{request.propertyName}</strong>.
        </p>

        <div className="mb-4">
          <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
            theme === "dark" ? "text-gray-300" : "text-gray-700"
          }`}>
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this request is being rejected..."
            rows={4}
            className={`w-full px-3 py-2.5 rounded-lg border transition-colors duration-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
              theme === "dark" 
                ? "bg-gray-700/50 border-gray-600 text-gray-200 placeholder-gray-400" 
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            } focus:outline-none`}
          />
          <p className={`text-xs mt-1.5 transition-colors duration-300 ${
            theme === "dark" ? "text-gray-500" : "text-gray-400"
          }`}>
            This reason will be shared with the tenant.
          </p>
        </div>

        {errorMessage && (
          <div className={`p-3 rounded-lg mb-4 border transition-colors duration-300 ${
            theme === "dark" 
              ? "bg-red-900/20 border-red-800 text-red-300" 
              : "bg-red-50 border-red-100 text-red-700"
          }`}>
            <p className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errorMessage}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowRejectModal(false);
              setRejectionReason("");
              setErrorMessage("");
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg transition text-sm font-semibold ${
              theme === "dark" 
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing || !rejectionReason.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Processing...
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                Reject
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* Success Modal */}
{showSuccessModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
    <div className={`w-[450px] max-w-full rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300 ${
      theme === "dark" 
        ? "bg-gray-800/95" 
        : "bg-white/95"
    }`}>
      <div className={`p-6 text-center ${
        theme === "dark" ? "bg-gray-800/95" : "bg-white/95"
      }`}>
        <div className="w-20 h-20 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
          theme === "dark" ? "text-gray-100" : "text-gray-900"
        }`}>
          Success!
        </h2>
        <p className={`text-sm mb-6 transition-colors duration-300 ${
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        }`}>
          {successMessage}
        </p>
        <button
          onClick={() => {
            setShowSuccessModal(false);
            setSuccessMessage("");
            router.push("/dashboard/tenants");
          }}
          className="w-full px-4 py-2.5 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition text-sm font-semibold"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
)}

    </ProtectedRoute>
  );
}