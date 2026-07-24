"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import Link from "next/link";
import { databases } from "@/lib/appwrite/config";
import { Query, ID } from "appwrite";
import Image from "next/image";
import {
  Users,
  PlusCircle,
  Search,
  Phone,
  Home,
  DollarSign,
  Calendar,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  AlertCircle,
  User,
  Mail,
  CalendarDays,
  Building2,
  Check,
  X,
  MessageCircle,
  Send,
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

export default function TenantsPage() {
  const { organization } = useAuth();
  const { theme } = useTheme();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [allTenantsAndRequestors, setAllTenantsAndRequestors] = useState<Tenant[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedTenantRequests, setSelectedTenantRequests] = useState<RentalRequest[]>([]);
  const [organizationPropertyIds, setOrganizationPropertyIds] = useState<string[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRequestId, setEmailRequestId] = useState<string | null>(null);
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    message: "",
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
    if (organization?.userId) {
      fetchOrganizationProperties();
    }
  }, [organization?.userId]);

  const fetchOrganizationProperties = async () => {
    try {
      if (!organization?.userId) return;
      
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        [Query.equal("creatorId", organization.userId)]
      );
      
      const propertyIds = response.documents.map((p: any) => p.$id);
      setOrganizationPropertyIds(propertyIds);
      
      await Promise.all([fetchTenants(), fetchRentalRequests(propertyIds)]);
    } catch (error) {
      console.error("Error fetching organization properties:", error);
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
        [Query.orderDesc("$createdAt")]
      );
      const tenantsData = response.documents as unknown as Tenant[];
      setTenants(tenantsData);
      
      mergeTenantsAndRequestors(tenantsData, rentalRequests);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRentalRequests = async (propertyIds: string[]) => {
    try {
      if (propertyIds.length === 0) {
        setRentalRequests([]);
        mergeTenantsAndRequestors(tenants, []);
        return;
      }
      
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
        [
          Query.equal("propertyId", propertyIds),
          Query.orderDesc("$createdAt")
        ]
      );
      const requestsData = response.documents as unknown as RentalRequest[];
      setRentalRequests(requestsData);
      
      mergeTenantsAndRequestors(tenants, requestsData);
    } catch (error) {
      console.error("Error fetching rental requests:", error);
    }
  };

  const mergeTenantsAndRequestors = (tenantsData: Tenant[], requestsData: RentalRequest[]) => {
    const merged: Tenant[] = [...tenantsData];
    
    requestsData.forEach((request) => {
      const isExistingTenant = tenantsData.some(
        (tenant) => tenant.email === request.tenantEmail
      );
      
      if (!isExistingTenant) {
        merged.push({
          $id: request.$id,
          name: request.tenantName,
          identifier: `REQUEST-${request.$id.slice(0, 8)}`,
          phone: request.tenantPhone || "N/A",
          email: request.tenantEmail,
          propertyName: request.propertyName,
          status: request.status === "approved" ? "active" : "pending",
          monthlyRent: request.proposedPrice,
          leaseStartDate: request.moveInDate,
          avatar: request.tenantAvatar,
          organizationId: organization?.$id,
          source: "requests",
          requestId: request.$id,
          requestStatus: request.status,
        });
      }
    });
    
    setAllTenantsAndRequestors(merged);
  };

  const handleDelete = async () => {
    if (!selectedTenant) return;

    if (selectedTenant.source === "requests" && selectedTenant.requestId) {
      try {
        await databases.deleteDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
          selectedTenant.requestId
        );
        
        setShowDeleteModal(false);
        setSelectedTenant(null);
        fetchRentalRequests(organizationPropertyIds);
        alert("Request deleted successfully");
        return;
      } catch (error) {
        console.error("Error deleting request:", error);
        alert("Failed to delete request");
        return;
      }
    }

    try {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
        selectedTenant.$id
      );

      setShowDeleteModal(false);
      setSelectedTenant(null);
      fetchTenants();
    } catch (error) {
      console.error("Error deleting tenant:", error);
      alert("Failed to delete tenant");
    }
  };

  // Open rejection modal
  const openRejectModal = (requestId: string) => {
    setRejectRequestId(requestId);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  // Handle rejection with reason
  const handleRejectWithReason = async () => {
    if (!rejectRequestId) return;

    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    setIsRejecting(true);

    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
        rejectRequestId,
        {
          status: "rejected",
          rejectionReason: rejectionReason.trim(),
        }
      );

      await Promise.all([fetchRentalRequests(organizationPropertyIds), fetchTenants()]);

      setShowRejectModal(false);
      setRejectRequestId(null);
      setRejectionReason("");

      alert("Request rejected successfully");
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, newStatus: string) => {
    if (newStatus === "rejected") {
      openRejectModal(requestId);
      return;
    }

    try {
      const request = rentalRequests.find(r => r.$id === requestId);
      if (!request) return;
      
      if (newStatus === "approved") {
        const existingTenants = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
          [Query.equal("email", request.tenantEmail)]
        );
        
        const tenantIdentifier = `TENANT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        if (existingTenants.documents.length === 0) {
          await databases.createDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
            ID.unique(),
            {
              name: request.tenantName,
              Identifier: tenantIdentifier,
              tenantPhone: request.tenantPhone || "",
              email: request.tenantEmail,
              propertyName: request.propertyName,
              status: "active",
              monthlyRent: request.proposedPrice,
              leaseStartDate: request.moveInDate,
              avatar: request.tenantAvatar || "",
              organizationId: organization?.$id,
            }
          );
        } else {
          const existingTenant = existingTenants.documents[0];
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
            existingTenant.$id,
            {
              propertyName: request.propertyName,
              monthlyRent: request.proposedPrice,
              leaseStartDate: request.moveInDate,
              status: "active",
              tenantPhone: request.tenantPhone || existingTenant.phone,
            }
          );
        }
        
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
          request.propertyId,
          { isAvailable: false }
        );
      }
      
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
        requestId,
        { status: newStatus }
      );
      
      await Promise.all([fetchRentalRequests(organizationPropertyIds), fetchTenants()]);
      
      alert(`Request ${newStatus === "approved" ? "approved" : "rejected"} successfully!`);
      
      if (selectedTenant) {
        const updatedRequests = rentalRequests.filter(r => r.tenantId === selectedTenant.$id);
        setSelectedTenantRequests(updatedRequests);
      }
    } catch (error) {
      console.error("Error updating request status:", error);
      alert("Failed to update request status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return { text: "Active", icon: CheckCircle, className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" };
      case "pending":
        return { text: "Pending", icon: Clock, className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" };
      default:
        return { text: status, icon: Clock, className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" };
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { text: "Pending", icon: Clock, className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800" };
      case "approved":
        return { text: "Approved", icon: CheckCircle, className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" };
      case "rejected":
        return { text: "Rejected", icon: XCircle, className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800" };
      default:
        return { text: status, icon: Clock, className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredTenants = allTenantsAndRequestors.filter((tenant) => {
    const tenantRequests = rentalRequests.filter(r => r.tenantId === tenant.$id || r.tenantEmail === tenant.email);
    const hasPendingRequests = tenantRequests.some(r => r.status === "pending");
    const hasApprovedRequests = tenantRequests.some(r => r.status === "approved");
    
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.phone.includes(searchTerm);
    
    let matchesFilter = true;
    if (filterStatus === "pending") {
      matchesFilter = hasPendingRequests || (tenant.source === "requests" && tenant.requestStatus === "pending");
    } else if (filterStatus === "active") {
      matchesFilter = tenant.status === "active" || hasApprovedRequests || (tenant.source === "requests" && tenant.requestStatus === "approved");
    } else {
      matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  });

  const getMargin = () => {
    if (isMobile) {
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

  // Render Rejection Modal
  const renderRejectModal = () => {
    if (!showRejectModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className={`w-[420px] max-w-full transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-gray-800/95 backdrop-blur-md" 
            : "bg-white/95 backdrop-blur-md"
        } rounded-2xl shadow-2xl overflow-hidden`}>
          <div className={`px-6 py-5 relative overflow-hidden ${
            theme === "dark" 
              ? "bg-gray-700" 
              : "bg-gradient-to-r from-red-600 to-red-700"
          }`}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl ${
              theme === "dark" ? "bg-gray-500/20" : "bg-red-500/20"
            }`} />
            <div className="relative text-center">
              <div className={`inline-block p-2 rounded-full mb-2 ${
                theme === "dark" ? "bg-gray-600/50" : "bg-white/10"
              }`}>
                <MessageCircle className={`w-5 h-5 ${
                  theme === "dark" ? "text-gray-400" : "text-red-200"
                }`} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                Reject Request
              </h2>
              <p className={`text-xs ${
                theme === "dark" ? "text-gray-300" : "text-red-100"
              }`}>
                Provide a reason for rejecting this request
              </p>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-1.5 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Property is no longer available, Price too low, etc."
                rows={4}
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors duration-300 resize-none ${
                  theme === "dark" 
                    ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-[var(--accent-500)]" 
                    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-red-500"
                }`}
                autoFocus
              />
            </div>

            <div className="mb-5">
              <p className={`text-xs font-medium mb-2 ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}>
                Quick Select Reasons
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Property no longer available",
                  "Price too low",
                  "Application incomplete",
                  "Already rented to someone else",
                  "Doesn't meet requirements",
                  "Incomplete documentation",
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setRejectionReason(reason)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      rejectionReason === reason
                        ? theme === "dark"
                          ? "border-[var(--accent-500)] bg-[var(--accent-500)]/20 text-[var(--accent-400)]"
                          : "border-red-500 bg-red-50 text-red-700"
                        : theme === "dark"
                          ? "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectRequestId(null);
                  setRejectionReason("");
                }}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] ${
                  theme === "dark"
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectWithReason}
                disabled={isRejecting || !rejectionReason.trim()}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all transform hover:scale-[1.02] shadow-md ${
                  isRejecting || !rejectionReason.trim()
                    ? "bg-gray-400 cursor-not-allowed text-gray-200"
                    : theme === "dark"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {isRejecting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    <span>Rejecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <X className="w-4 h-4" />
                    <span>Reject Request</span>
                  </div>
                )}
              </button>
            </div>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full h-px transition-colors duration-300 ${
                  theme === "dark" ? "bg-gray-600" : "bg-gray-200"
                }`} />
              </div>
              <div className="relative flex justify-center">
                <span className={`px-2 text-[10px] transition-colors duration-300 ${
                  theme === "dark" ? "bg-gray-800/95 text-gray-400" : "bg-white/95 text-gray-400"
                }`}>
                  Confirm
                </span>
              </div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectRequestId(null);
                  setRejectionReason("");
                }}
                className={`text-xs transition-colors duration-300 flex items-center justify-center gap-1.5 mx-auto ${
                  theme === "dark" 
                    ? "text-gray-400 hover:text-gray-300" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <XCircle className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
                    Loading tenants...
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const pendingRequests = rentalRequests.filter(r => r.status === "pending");
  const approvedRequests = rentalRequests.filter(r => r.status === "approved");

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
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start md:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-100" : "text-gray-800"
                }`}>
                  Tenants & Requests
                </h1>
                <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  Manage tenants and incoming rental requests
                </p>
              </div>
              <Link
                href="/dashboard/tenants/new"
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition text-xs sm:text-sm shadow-sm hover:shadow-md"
              >
                <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Add New Tenant</span>
              </Link>
            </div>

            {/* Search and Filter Bar */}
            <div className={`rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 transition-colors duration-300 border ${
              theme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-400"
                  }`} />
                  <input
                    type="text"
                    placeholder="Search tenants and requestors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-200 text-gray-900 bg-white"
                    }`}
                  />
                </div>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm capitalize transition ${
                      filterStatus === "all"
                        ? "bg-[var(--accent-500)] text-white"
                        : theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus("pending")}
                    className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm capitalize transition flex items-center gap-1 sm:gap-2 ${
                      filterStatus === "pending"
                        ? "bg-yellow-600 text-white"
                        : theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Requests</span>
                    {pendingRequests.length > 0 && (
                      <span className="ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 bg-white/20 rounded-full text-[10px] sm:text-xs">
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setFilterStatus("active")}
                    className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm capitalize transition ${
                      filterStatus === "active"
                        ? "bg-blue-800 text-white"
                        : theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Active
                  </button>
                </div>
              </div>
            </div>

            {/* REQUESTS SECTION */}
            {filterStatus === "pending" && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
                  <h2 className={`text-base sm:text-lg font-semibold flex items-center gap-1.5 sm:gap-2 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}>
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
                    Requests
                    <span className="px-1.5 sm:px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-[10px] sm:text-xs">
                      {pendingRequests.length} pending
                    </span>
                  </h2>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className={`rounded-2xl shadow-sm p-8 sm:p-12 text-center border ${
                    theme === "dark" 
                      ? "bg-gray-800/80 border-gray-700" 
                      : "bg-white/80 border-gray-100 backdrop-blur-sm"
                  }`}>
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                    }`}>
                      <FileText className={`w-8 h-8 sm:w-10 sm:h-10 ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`} />
                    </div>
                    <h3 className={`text-base sm:text-lg font-semibold mb-1 sm:mb-2 ${
                      theme === "dark" ? "text-gray-200" : "text-gray-800"
                    }`}>
                      No requests
                    </h3>
                    <p className={`text-sm sm:text-base ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      All requests have been processed
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
                    {pendingRequests.map((request) => {
                      const reqStatus = getRequestStatusBadge(request.status);
                      const ReqStatusIcon = reqStatus.icon;
                      
                      return (
                        <div key={request.$id} className={`rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border ${
                          theme === "dark" 
                            ? "bg-gray-800/80 border-gray-700" 
                            : "bg-white/80 border-gray-100 backdrop-blur-sm"
                        }`}>
                          <div className={`p-4 sm:p-5 border-b ${
                            theme === "dark" 
                              ? "border-gray-700 bg-gray-700/50" 
                              : "border-gray-100 bg-gradient-to-r from-orange-50 to-white"
                          }`}>
                            <div className="flex items-start gap-3 sm:gap-4">
                              {request.tenantAvatar ? (
                                <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-[var(--accent-500)]/30 flex-shrink-0">
                                  <Image
                                    src={request.tenantAvatar}
                                    alt={request.tenantName}
                                    width={56}
                                    height={56}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ring-2 ring-[var(--accent-500)]/30 flex-shrink-0 ${
                                  theme === "dark" 
                                    ? "bg-gray-600" 
                                    : "bg-gradient-to-br from-orange-500 to-orange-600"
                                }`}>
                                  <User className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                  <div className="min-w-0">
                                    <h3 className={`font-bold text-sm sm:text-lg truncate ${
                                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                                    }`}>
                                      {request.tenantName}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                                      <Mail className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                                      }`} />
                                      <p className={`text-[10px] sm:text-xs truncate ${
                                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                                      }`}>
                                        {request.tenantEmail}
                                      </p>
                                    </div>
                                    {request.tenantPhone && (
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <Phone className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                                          theme === "dark" ? "text-gray-500" : "text-gray-400"
                                        }`} />
                                        <p className={`text-[10px] sm:text-xs ${
                                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                                        }`}>
                                          {request.tenantPhone}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium flex-shrink-0 ${reqStatus.className}`}>
                                    <ReqStatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span className="hidden xs:inline">{reqStatus.text}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 sm:p-5">
                            <div className={`rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 ${
                              theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                            }`}>
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                                <Building2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                                  theme === "dark" ? "text-[var(--accent-400)]" : "text-orange-500"
                                }`} />
                                <span className={`text-xs sm:text-sm font-semibold ${
                                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                                }`}>
                                  Property Requested
                                </span>
                              </div>
                              <p className={`text-sm sm:text-base font-medium ${
                                theme === "dark" ? "text-gray-100" : "text-gray-900"
                              }`}>
                                {request.propertyName}
                              </p>
                              <div className={`grid grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t ${
                                theme === "dark" ? "border-gray-600" : "border-gray-200"
                              }`}>
                                <div>
                                  <p className={`text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1 ${
                                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                                  }`}>
                                    <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    Proposed Price
                                  </p>
                                  <p className={`text-xs sm:text-sm font-semibold ${
                                    theme === "dark" ? "text-[var(--accent-400)]" : "text-orange-600"
                                  }`}>
                                    ${request.proposedPrice}/mo
                                  </p>
                                </div>
                                <div>
                                  <p className={`text-[10px] sm:text-xs ${
                                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                                  }`}>
                                    Original Price
                                  </p>
                                  <p className={`text-xs sm:text-sm line-through ${
                                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                                  }`}>
                                    ${request.originalPrice}/mo
                                  </p>
                                </div>
                                <div>
                                  <p className={`text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1 ${
                                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                                  }`}>
                                    <CalendarDays className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    Move-in Date
                                  </p>
                                  <p className={`text-xs sm:text-sm ${
                                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                                  }`}>
                                    {formatDate(request.moveInDate)}
                                  </p>
                                </div>
                                <div>
                                  <p className={`text-[10px] sm:text-xs ${
                                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                                  }`}>
                                    Lease Duration
                                  </p>
                                  <p className={`text-xs sm:text-sm ${
                                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                                  }`}>
                                    {request.leaseDuration} months
                                  </p>
                                </div>
                              </div>
                            </div>

                            {request.message && (
                              <div className={`mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg border ${
                                theme === "dark" 
                                  ? "bg-blue-900/20 border-blue-800" 
                                  : "bg-blue-50 border-blue-100"
                              }`}>
                                <p className={`text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-medium ${
                                  theme === "dark" ? "text-blue-400" : "text-blue-600"
                                }`}>
                                  Message from tenant:
                                </p>
                                <p className={`text-xs sm:text-sm italic ${
                                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                                }`}>
                                  "{request.message}"
                                </p>
                              </div>
                            )}

                            {request.questions && (
                              <div className={`mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg border ${
                                theme === "dark" 
                                  ? "bg-yellow-900/20 border-yellow-800" 
                                  : "bg-yellow-50 border-yellow-100"
                              }`}>
                                <p className={`text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-medium flex items-center gap-0.5 sm:gap-1 ${
                                  theme === "dark" ? "text-yellow-400" : "text-yellow-600"
                                }`}>
                                  <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  Questions:
                                </p>
                                <p className={`text-xs sm:text-sm ${
                                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                                }`}>
                                  {request.questions}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4 pt-1 sm:pt-2">
                              <button
                                onClick={() => handleUpdateRequestStatus(request.$id, "approved")}
                                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm shadow-sm hover:shadow-md"
                              >
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateRequestStatus(request.$id, "rejected")}
                                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm shadow-sm hover:shadow-md"
                              >
                                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* APPROVED REQUESTS SECTION */}
            {filterStatus === "active" && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
                  <h2 className={`text-base sm:text-lg font-semibold flex items-center gap-1.5 sm:gap-2 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}>
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                    Approved Requests
                    <span className="px-1.5 sm:px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-[10px] sm:text-xs">
                      {approvedRequests.length} approved
                    </span>
                  </h2>
                </div>

                {approvedRequests.length === 0 ? (
                  <div className={`rounded-2xl shadow-sm p-8 sm:p-12 text-center border ${
                    theme === "dark" 
                      ? "bg-gray-800/80 border-gray-700" 
                      : "bg-white/80 border-gray-100 backdrop-blur-sm"
                  }`}>
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                    }`}>
                      <CheckCircle className={`w-8 h-8 sm:w-10 sm:h-10 ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`} />
                    </div>
                    <h3 className={`text-base sm:text-lg font-semibold mb-1 sm:mb-2 ${
                      theme === "dark" ? "text-gray-200" : "text-gray-800"
                    }`}>
                      No approved requests
                    </h3>
                    <p className={`text-sm sm:text-base ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      Approved requests will appear here
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
                    {approvedRequests.map((request) => {
                      const reqStatus = getRequestStatusBadge(request.status);
                      const ReqStatusIcon = reqStatus.icon;
                      
                      return (
                        <div key={request.$id} className={`rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border ${
                          theme === "dark" 
                            ? "bg-gray-800/80 border-gray-700" 
                            : "bg-white/80 border-gray-100 backdrop-blur-sm"
                        }`}>
                          <div className={`p-4 sm:p-5 border-b ${
                            theme === "dark" 
                              ? "border-gray-700 bg-gray-700/50" 
                              : "border-gray-100 bg-gradient-to-r from-green-50 to-white"
                          }`}>
                            <div className="flex items-start gap-3 sm:gap-4">
                              {request.tenantAvatar ? (
                                <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-green-500/30 flex-shrink-0">
                                  <Image
                                    src={request.tenantAvatar}
                                    alt={request.tenantName}
                                    width={56}
                                    height={56}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ring-2 ring-green-500/30 flex-shrink-0 ${
                                  theme === "dark" 
                                    ? "bg-gray-600" 
                                    : "bg-gradient-to-br from-green-500 to-green-600"
                                }`}>
                                  <User className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                  <div className="min-w-0">
                                    <h3 className={`font-bold text-sm sm:text-lg truncate ${
                                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                                    }`}>
                                      {request.tenantName}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                                      <Mail className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                                      }`} />
                                      <p className={`text-[10px] sm:text-xs truncate ${
                                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                                      }`}>
                                        {request.tenantEmail}
                                      </p>
                                    </div>
                                    {request.tenantPhone && (
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <Phone className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                                          theme === "dark" ? "text-gray-500" : "text-gray-400"
                                        }`} />
                                        <p className={`text-[10px] sm:text-xs ${
                                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                                        }`}>
                                          {request.tenantPhone}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium flex-shrink-0 ${reqStatus.className}`}>
                                    <ReqStatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span className="hidden xs:inline">{reqStatus.text}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 sm:p-5">
                            <div className={`rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 ${
                              theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                            }`}>
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                                <Building2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                                  theme === "dark" ? "text-[var(--accent-400)]" : "text-green-500"
                                }`} />
                                <span className={`text-xs sm:text-sm font-semibold ${
                                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                                }`}>
                                  Property Approved
                                </span>
                              </div>
                              <p className={`text-sm sm:text-base font-medium ${
                                theme === "dark" ? "text-gray-100" : "text-gray-900"
                              }`}>
                                {request.propertyName}
                              </p>
                              <div className={`grid grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t ${
                                theme === "dark" ? "border-gray-600" : "border-gray-200"
                              }`}>
                                <div>
                                  <p className={`text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1 ${
                                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                                  }`}>
                                    <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    Approved Price
                                  </p>
                                  <p className={`text-xs sm:text-sm font-semibold ${
                                    theme === "dark" ? "text-[var(--accent-400)]" : "text-green-600"
                                  }`}>
                                    ${request.proposedPrice}/mo
                                  </p>
                                </div>
                                <div>
                                  <p className={`text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1 ${
                                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                                  }`}>
                                    <CalendarDays className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    Move-in Date
                                  </p>
                                  <p className={`text-xs sm:text-sm ${
                                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                                  }`}>
                                    {formatDate(request.moveInDate)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4 pt-1 sm:pt-2">
                              <Link
                                 href={`/dashboard/requests/${request.$id}`}
                                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm shadow-sm hover:shadow-md"
                              >
                                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                View Tenant
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TENANTS GRID */}
            {filterStatus !== "pending" && filterStatus !== "active" && (
              <>
                {filteredTenants.length === 0 ? (
                  <div className={`rounded-2xl shadow-sm p-8 sm:p-12 text-center border ${
                    theme === "dark" 
                      ? "bg-gray-800/80 border-gray-700" 
                      : "bg-white/80 border-gray-100 backdrop-blur-sm"
                  }`}>
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                    }`}>
                      <Users className={`w-8 h-8 sm:w-10 sm:h-10 ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`} />
                    </div>
                    <h3 className={`text-base sm:text-lg font-semibold mb-1 sm:mb-2 ${
                      theme === "dark" ? "text-gray-200" : "text-gray-800"
                    }`}>
                      No tenants or requestors found
                    </h3>
                    <p className={`text-sm sm:text-base mb-3 sm:mb-4 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      {searchTerm
                        ? "Try adjusting your search criteria"
                        : "Get started by adding your first tenant"}
                    </p>
                    {!searchTerm && (
                      <Link
                        href="/dashboard/tenants/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition text-sm"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Add New Tenant
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                    {filteredTenants.map((tenant) => {
                      const tenantRequests = rentalRequests.filter(r => r.tenantId === tenant.$id || r.tenantEmail === tenant.email);
                      const pendingRequestsCount = tenantRequests.filter(r => r.status === "pending").length;
                      const hasApprovedRequest = tenantRequests.some(r => r.status === "approved");
                      const isFromRequests = tenant.source === "requests";
                      const isApproved = tenant.status === "active" || hasApprovedRequest || (tenant.requestStatus === "approved");
                      
                      return (
                        <div key={tenant.$id} className={`rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition group border ${
                          theme === "dark" 
                            ? "bg-gray-800/80 border-gray-700" 
                            : "bg-white/80 border-gray-100 backdrop-blur-sm"
                        }`}>
                          <div className={`p-3 sm:p-4 border-b ${
                            theme === "dark" ? "border-gray-700" : "border-gray-100"
                          }`}>
                            <div className="flex items-center gap-2 sm:gap-3">
                              {tenant.avatar ? (
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0">
                                  <Image
                                    src={tenant.avatar}
                                    alt={tenant.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className={`text-sm sm:text-base font-semibold truncate ${
                                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                                  }`}>
                                    {tenant.name}
                                  </h3>
                                  {isFromRequests && (
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                                      tenant.requestStatus === "pending" 
                                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                                        : tenant.requestStatus === "approved"
                                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                    }`}>
                                      {tenant.requestStatus}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[10px] sm:text-xs truncate ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                                }`}>
                                  {isFromRequests ? `📧 ${tenant.email}` : tenant.identifier}
                                </p>
                              </div>
                              <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium flex-shrink-0 ${
                                tenant.status === "active" 
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" 
                                  : tenant.status === "pending"
                                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                              }`}>
                                {tenant.status === "active" ? <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                <span className="hidden xs:inline">{tenant.status === "active" ? "Active" : tenant.status === "pending" ? "Pending" : "Inactive"}</span>
                              </span>
                            </div>
                          </div>

                          <div className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                            <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
                              theme === "dark" ? "text-gray-300" : "text-gray-600"
                            }`}>
                              <Mail className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                theme === "dark" ? "text-gray-500" : "text-gray-400"
                              }`} />
                              <span className="truncate">{tenant.email}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
                              theme === "dark" ? "text-gray-300" : "text-gray-600"
                            }`}>
                              <Phone className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                theme === "dark" ? "text-gray-500" : "text-gray-400"
                              }`} />
                              <span className="truncate">{tenant.phone || "No phone"}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
                              theme === "dark" ? "text-gray-300" : "text-gray-600"
                            }`}>
                              <Home className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                theme === "dark" ? "text-gray-500" : "text-gray-400"
                              }`} />
                              <span className="truncate">{tenant.propertyName}</span>
                            </div>
                            {!isFromRequests && (
                              <>
                                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                                  <DollarSign className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                    theme === "dark" ? "text-[var(--accent-400)]" : "text-orange-500"
                                  }`} />
                                  <span className={`font-semibold ${
                                    theme === "dark" ? "text-[var(--accent-400)]" : "text-orange-600"
                                  }`}>
                                    ${tenant.monthlyRent}/mo
                                  </span>
                                </div>
                                <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
                                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                                }`}>
                                  <Calendar className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                                  }`} />
                                  <span className="truncate">Started: {new Date(tenant.leaseStartDate).toLocaleDateString()}</span>
                                </div>
                              </>
                            )}
                            {isFromRequests && tenant.requestStatus && (
                              <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mt-0.5 sm:mt-1 ${
                                tenant.requestStatus === "pending" 
                                  ? "text-yellow-600 dark:text-yellow-400" 
                                  : tenant.requestStatus === "approved"
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}>
                                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="font-medium capitalize">Request: {tenant.requestStatus}</span>
                              </div>
                            )}
                            {pendingRequestsCount > 0 && !isFromRequests && (
                              <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mt-0.5 sm:mt-1 ${
                                theme === "dark" ? "text-[var(--accent-400)]" : "text-orange-600"
                              }`}>
                                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="font-medium">{pendingRequestsCount} pending request{pendingRequestsCount > 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>

                          <div className={`p-3 sm:p-4 border-t flex gap-1.5 sm:gap-2 ${
                            theme === "dark" ? "border-gray-700" : "border-gray-100"
                          }`}>
                            {isFromRequests && tenant.requestStatus === "pending" ? (
                              <Link
                                href={`/dashboard/requests/${tenant.requestId}`}
                                className={`flex-1 flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-1.5 rounded-lg transition text-xs sm:text-sm ${
                                  theme === "dark"
                                    ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                }`}
                              >
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                View Request
                              </Link>
                            ) : isFromRequests && tenant.requestStatus === "approved" ? (
                              <>
                                <Link
                                  href={`/dashboard/requests/${tenant.requestId}`}
                                  className={`flex-1 flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-1.5 rounded-lg transition text-xs sm:text-sm ${
                                    theme === "dark"
                                      ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  }`}
                                >
                                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                  View Details
                                </Link>
                                <Link
                                  href={`/dashboard/tenants/${tenant.$id}/edit`}
                                  className={`flex-1 flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-1.5 rounded-lg transition text-xs sm:text-sm ${
                                    theme === "dark"
                                      ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                                      : "bg-green-50 text-green-600 hover:bg-green-100"
                                  }`}
                                >
                                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  Edit
                                </Link>
                                <button
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setShowDeleteModal(true);
                                  }}
                                  className={`flex-1 flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-1.5 rounded-lg transition text-xs sm:text-sm ${
                                    theme === "dark"
                                      ? "bg-red-900/30 text-red-400 hover:bg-red-900/50"
                                      : "bg-red-50 text-red-600 hover:bg-red-100"
                                  }`}
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                  Delete
                                </button>
                              </>
                            ) : isFromRequests && tenant.requestStatus === "rejected" ? (
                              <Link
                                href={`/dashboard/requests/${tenant.requestId}`}
                                className={`flex-1 flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-1.5 rounded-lg transition text-xs sm:text-sm ${
                                  theme === "dark"
                                    ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                }`}
                              >
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                View Request
                              </Link>
                            ) : (
                              <>
                                <Link
                                  href={`/dashboard/tenants/${tenant.$id}`}
                                  className={`flex-1 flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-1.5 rounded-lg transition text-xs sm:text-sm ${
                                    theme === "dark"
                                      ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  }`}
                                >
                                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                  View
                                </Link>
                                <Link
                                  href={`/dashboard/tenants/${tenant.$id}/edit`}
                                  className={`flex-1 flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-1.5 rounded-lg transition text-xs sm:text-sm ${
                                    theme === "dark"
                                      ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                                      : "bg-green-50 text-green-600 hover:bg-green-100"
                                  }`}
                                >
                                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  Edit
                                </Link>
                                <button
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setShowDeleteModal(true);
                                  }}
                                  className={`flex-1 flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-1.5 rounded-lg transition text-xs sm:text-sm ${
                                    theme === "dark"
                                      ? "bg-red-900/30 text-red-400 hover:bg-red-900/50"
                                      : "bg-red-50 text-red-600 hover:bg-red-100"
                                  }`}
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedTenant && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className={`w-[380px] max-w-full transition-colors duration-300 ${
                  theme === "dark" 
                    ? "bg-gray-800/95 backdrop-blur-md" 
                    : "bg-white/95 backdrop-blur-md"
                } rounded-2xl shadow-2xl overflow-hidden`}>
                  <div className={`px-6 py-5 relative overflow-hidden ${
                    theme === "dark" 
                      ? "bg-gray-700" 
                      : "bg-gradient-to-r from-red-600 to-red-700"
                  }`}>
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl ${
                      theme === "dark" ? "bg-gray-500/20" : "bg-red-500/20"
                    }`} />
                    <div className="relative text-center">
                      <div className={`inline-block p-2 rounded-full mb-2 ${
                        theme === "dark" ? "bg-gray-600/50" : "bg-white/10"
                      }`}>
                        <Trash2 className={`w-5 h-5 ${
                          theme === "dark" ? "text-gray-400" : "text-red-200"
                        }`} />
                      </div>
                      <h2 className="text-xl font-bold text-white mb-1">
                        {selectedTenant.source === "requests" ? "Delete Request" : "Delete Tenant"}
                      </h2>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-gray-300" : "text-red-100"
                      }`}>
                        This action cannot be undone
                      </p>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="text-center mb-5">
                      <p className={`text-sm mb-1 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Are you sure you want to delete
                      </p>
                      <p className={`text-base font-semibold ${
                        theme === "dark" ? "text-gray-100" : "text-gray-900"
                      }`}>
                        {selectedTenant.name}?
                      </p>
                      <p className={`text-[10px] mt-2 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        {selectedTenant.source === "requests" 
                          ? "This will permanently remove this rental request from your system."
                          : "This will permanently remove this tenant from your system."}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteModal(false)}
                        className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] ${
                          theme === "dark"
                            ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all transform hover:scale-[1.02] shadow-md ${
                          theme === "dark"
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </div>
                      </button>
                    </div>

                    <div className="relative my-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className={`w-full h-px transition-colors duration-300 ${
                          theme === "dark" ? "bg-gray-600" : "bg-gray-200"
                        }`} />
                      </div>
                      <div className="relative flex justify-center">
                        <span className={`px-2 text-[10px] transition-colors duration-300 ${
                          theme === "dark" ? "bg-gray-800/95 text-gray-400" : "bg-white/95 text-gray-400"
                        }`}>
                          Confirm
                        </span>
                      </div>
                    </div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        className={`text-xs transition-colors duration-300 flex items-center justify-center gap-1.5 mx-auto ${
                          theme === "dark" 
                            ? "text-gray-400 hover:text-gray-300" 
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rejection Reason Modal */}
            {renderRejectModal()}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}