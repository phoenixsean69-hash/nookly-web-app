"use client";

import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Eye,
  Mail,
  Phone,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { ID, Query } from "appwrite";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases } from "@/lib/appwrite/config";
import {
  getOwnedRequest,
  getOwnedTenant,
  listOrganizationProperties,
  listOrganizationRequests,
  listOrganizationTenants,
} from "@/lib/appwrite/helpers";
import type { Property } from "@/types/property";
import type { Tenant } from "@/types/tenant";

interface RentalRequest {
  $id: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  tenantId?: string;
  tenantPhone?: string;
  tenantEmail: string;
  tenantAvatar?: string;
  status: "pending" | "approved" | "rejected";
  proposedPrice: number;
  originalPrice?: number;
  message?: string;
  moveInDate: string;
  leaseDuration?: string;
  questions?: string;
  rejectionReason?: string;
  $createdAt: string;
  $updatedAt: string;
}

type DisplayEntry =
  | {
      kind: "tenant";
      id: string;
      tenant: Tenant;
      name: string;
      email: string;
      phone: string;
      propertyName: string;
      amount: number;
      date: string;
      status: string;
      avatar: string;
    }
  | {
      kind: "request";
      id: string;
      request: RentalRequest;
      name: string;
      email: string;
      phone: string;
      propertyName: string;
      amount: number;
      date: string;
      status: string;
      avatar: string;
    };

function useDashboardMargin(): string {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const update = () => {
      setMobile(window.innerWidth < 768);
      setCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    };

    const handleToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ isCollapsed?: boolean }>).detail;
      setCollapsed(
        detail?.isCollapsed ??
          localStorage.getItem("sidebarCollapsed") === "true",
      );
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("storage", update);
    window.addEventListener("sidebarToggle", handleToggle);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("storage", update);
      window.removeEventListener("sidebarToggle", handleToggle);
    };
  }, []);

  if (mobile) return "ml-0";
  return collapsed ? "ml-16" : "ml-64";
}

function normalizedIdentifier(tenant: Tenant): string {
  return tenant.identifier || tenant.Identifier || "";
}

function normalizedPhone(tenant: Tenant): string {
  return tenant.phone || tenant.tenantPhone || "";
}

export default function TenantsPage() {
  const { organization, isOffline } = useAuth();
  const { theme } = useTheme();
  const margin = useDashboardMargin();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<DisplayEntry | null>(null);
  const [rejectRequest, setRejectRequest] =
    useState<RentalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadData = useCallback(async () => {
    if (!organization) {
      setTenants([]);
      setRequests([]);
      setProperties([]);
      setLoading(false);
      return;
    }

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [tenantDocuments, requestDocuments, propertyDocuments] =
        await Promise.all([
          listOrganizationTenants(organization.$id, [
            Query.orderDesc("$createdAt"),
          ]),
          listOrganizationRequests(organization.userId),
          listOrganizationProperties(organization.userId, [
            Query.orderDesc("$createdAt"),
          ]),
        ]);

      setTenants(tenantDocuments as unknown as Tenant[]);
      setRequests(requestDocuments as unknown as RentalRequest[]);
      setProperties(propertyDocuments as unknown as Property[]);
    } catch (error) {
      console.error("Unable to load tenants and requests:", error);
      toast.error("Failed to load tenants and rental requests.");
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    void loadData();

    const refresh = () => void loadData();
    window.addEventListener("cacheRefreshed", refresh);

    return () => window.removeEventListener("cacheRefreshed", refresh);
  }, [loadData]);

  const entries = useMemo<DisplayEntry[]>(() => {
    const tenantEmails = new Set(
      tenants
        .map((tenant) => tenant.email?.toLowerCase())
        .filter((email): email is string => Boolean(email)),
    );

    const tenantEntries: DisplayEntry[] = tenants.map((tenant) => ({
      kind: "tenant",
      id: tenant.$id,
      tenant,
      name: tenant.name,
      email: tenant.email ?? "",
      phone: normalizedPhone(tenant),
      propertyName: tenant.propertyName,
      amount: tenant.monthlyRent || 0,
      date: tenant.leaseStartDate,
      status: tenant.status,
      avatar: tenant.avatar ?? "",
    }));

    const requestEntries: DisplayEntry[] = requests
      .filter(
        (request) =>
          !tenantEmails.has(request.tenantEmail?.toLowerCase()) ||
          request.status === "pending",
      )
      .map((request) => ({
        kind: "request",
        id: request.$id,
        request,
        name: request.tenantName,
        email: request.tenantEmail,
        phone: request.tenantPhone ?? "",
        propertyName: request.propertyName,
        amount: request.proposedPrice || 0,
        date: request.moveInDate,
        status: request.status,
        avatar: request.tenantAvatar ?? "",
      }));

    return [...requestEntries, ...tenantEntries];
  }, [requests, tenants]);

  const filteredEntries = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesSearch =
        !search ||
        entry.name.toLowerCase().includes(search) ||
        entry.email.toLowerCase().includes(search) ||
        entry.phone.toLowerCase().includes(search) ||
        entry.propertyName.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        entry.status === statusFilter ||
        (statusFilter === "pending" &&
          entry.kind === "request" &&
          entry.request.status === "pending");

      return matchesSearch && matchesStatus;
    });
  }, [entries, searchTerm, statusFilter]);

  const refreshPropertyAvailability = async (
    propertyId: string,
    propertyName: string,
  ) => {
    if (!organization) return;

    const property = properties.find((item) => item.$id === propertyId);
    if (!property) return;

    const activeTenants = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
      [
        Query.equal("organizationId", organization.$id),
        Query.equal("propertyName", propertyName),
        Query.equal("status", "active"),
        Query.limit(1),
      ],
    );

    const capacity = Math.max(1, property.roomFor || 1);

    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
      propertyId,
      { isAvailable: activeTenants.total < capacity },
    );
  };

  const approveRequest = async (request: RentalRequest) => {
    if (!organization) return;

    setProcessingId(request.$id);

    try {
      await getOwnedRequest(request.$id, organization.userId);

      const existing = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
        [
          Query.equal("organizationId", organization.$id),
          Query.equal("email", request.tenantEmail),
          Query.limit(1),
        ],
      );

      const tenantData = {
        organizationId: organization.$id,
        name: request.tenantName,
        identifier: `TENANT-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`,
        phone: request.tenantPhone ?? "",
        email: request.tenantEmail,
        propertyName: request.propertyName,
        status: "active",
        monthlyRent: request.proposedPrice,
        leaseStartDate:
          request.moveInDate || new Date().toISOString().slice(0, 10),
        avatar: request.tenantAvatar ?? "",
      };

      if (existing.documents.length > 0) {
        const current = existing.documents[0];

        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
          current.$id,
          {
            ...tenantData,
            identifier:
              String(current.identifier ?? current.Identifier ?? "") ||
              tenantData.identifier,
          },
        );
      } else {
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
          ID.unique(),
          tenantData,
        );
      }

      await Promise.all([
        databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
          request.$id,
          { status: "approved", rejectionReason: "" },
        ),
        refreshPropertyAvailability(request.propertyId, request.propertyName),
      ]);

      toast.success("Rental request approved.");
      await loadData();
    } catch (error) {
      console.error("Unable to approve request:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to approve request.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const rejectSelectedRequest = async () => {
    if (!organization || !rejectRequest || !rejectionReason.trim()) return;

    setProcessingId(rejectRequest.$id);

    try {
      await getOwnedRequest(rejectRequest.$id, organization.userId);

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
        rejectRequest.$id,
        {
          status: "rejected",
          rejectionReason: rejectionReason.trim(),
        },
      );

      setRejectRequest(null);
      setRejectionReason("");
      toast.success("Rental request rejected.");
      await loadData();
    } catch (error) {
      console.error("Unable to reject request:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reject request.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const deleteSelectedEntry = async () => {
    if (!organization || !deleteEntry) return;

    setProcessingId(deleteEntry.id);

    try {
      if (deleteEntry.kind === "tenant") {
        await getOwnedTenant(deleteEntry.id, organization.$id);

        const relatedProperty = properties.find(
          (property) => property.propertyName === deleteEntry.propertyName,
        );

        await databases.deleteDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
          deleteEntry.id,
        );

        if (relatedProperty) {
          await refreshPropertyAvailability(
            relatedProperty.$id,
            relatedProperty.propertyName,
          );
        }
      } else {
        await getOwnedRequest(deleteEntry.id, organization.userId);

        await databases.deleteDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
          deleteEntry.id,
        );
      }

      setDeleteEntry(null);
      toast.success(
        deleteEntry.kind === "tenant"
          ? "Tenant deleted."
          : "Rental request deleted.",
      );
      await loadData();
    } catch (error) {
      console.error("Unable to delete record:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete record.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const dark = theme === "dark";
  const activeCount = tenants.filter(
    (tenant) => tenant.status === "active",
  ).length;
  const pendingCount = requests.filter(
    (request) => request.status === "pending",
  ).length;

  return (
    <ProtectedRoute>
      <div
        className={`min-h-screen ${
          dark
            ? "bg-gray-950 text-white"
            : "bg-gradient-to-br from-blue-50 via-white to-orange-50 text-gray-900"
        }`}
      >
        <Sidebar />

        <div className={`${margin} transition-all duration-300`}>
          <Header />

          <main className="p-3 sm:p-5 lg:p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Tenants & Requests</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Only records belonging to {organization?.name} are shown.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadData()}
                  disabled={loading || isOffline}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <Link
                  href="/dashboard/tenants/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-500)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add tenant
                </Link>
              </div>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Active tenants",
                  value: activeCount,
                  icon: CheckCircle,
                  style: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
                },
                {
                  label: "Pending requests",
                  value: pendingCount,
                  icon: Clock,
                  style: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
                },
                {
                  label: "Total records",
                  value: entries.length,
                  icon: Users,
                  style: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl p-2.5 ${item.style}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{item.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.label}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search tenants and requests"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-500)] dark:border-gray-700 dark:bg-gray-900"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              {loading ? (
                <div className="flex h-72 items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent-500)] dark:border-gray-700" />
                    <p className="mt-4 text-sm text-gray-500">
                      Loading tenants and requests…
                    </p>
                  </div>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-300" />
                  <h2 className="mt-4 font-bold">No records found</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Add a tenant or wait for a rental request.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredEntries.map((entry) => {
                    const isBusy = processingId === entry.id;
                    const request =
                      entry.kind === "request" ? entry.request : null;

                    return (
                      <article
                        key={`${entry.kind}-${entry.id}`}
                        className="p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              {entry.avatar ? (
                                <Image
                                  src={entry.avatar}
                                  alt=""
                                  width={48}
                                  height={48}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <User className="h-6 w-6 text-gray-400" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="truncate font-bold">
                                  {entry.name}
                                </h2>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    entry.kind === "request"
                                      ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                  }`}
                                >
                                  {entry.kind}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    entry.status === "active" ||
                                    entry.status === "approved"
                                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                      : entry.status === "rejected"
                                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                                  }`}
                                >
                                  {entry.status}
                                </span>
                              </div>

                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                {entry.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5" />
                                    {entry.email}
                                  </span>
                                )}
                                {entry.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5" />
                                    {entry.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-2 text-sm sm:grid-cols-3 xl:w-[470px]">
                            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                              <p className="text-[10px] uppercase text-gray-400">
                                Property
                              </p>
                              <p className="mt-1 truncate font-semibold">
                                <Building2 className="mr-1 inline h-4 w-4 text-gray-400" />
                                {entry.propertyName}
                              </p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                              <p className="text-[10px] uppercase text-gray-400">
                                Monthly amount
                              </p>
                              <p className="mt-1 font-semibold">
                                <DollarSign className="mr-1 inline h-4 w-4 text-gray-400" />
                                {entry.amount.toLocaleString()}
                              </p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                              <p className="text-[10px] uppercase text-gray-400">
                                {entry.kind === "request"
                                  ? "Move-in date"
                                  : "Lease start"}
                              </p>
                              <p className="mt-1 font-semibold">
                                <Calendar className="mr-1 inline h-4 w-4 text-gray-400" />
                                {entry.date
                                  ? new Date(entry.date).toLocaleDateString()
                                  : "Not set"}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            {request ? (
                              <>
                                <Link
                                  href={`/dashboard/requests/${request.$id}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold dark:border-gray-700"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Link>
                                {request.status === "pending" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void approveRequest(request)
                                      }
                                      disabled={isBusy}
                                      className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejectRequest(request);
                                        setRejectionReason("");
                                      }}
                                      disabled={isBusy}
                                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Reject
                                    </button>
                                  </>
                                )}
                              </>
                            ) : (
                              <Link
                                href={`/dashboard/tenants/${entry.id}/edit`}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold dark:border-gray-700"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={() => setDeleteEntry(entry)}
                              disabled={isBusy}
                              className="rounded-lg border border-red-200 p-2 text-red-600 disabled:opacity-50 dark:border-red-900"
                              aria-label="Delete record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {rejectRequest && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-red-100 p-2 text-red-600 dark:bg-red-950 dark:text-red-300">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Reject request</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Give {rejectRequest.tenantName} a clear reason.
                </p>
              </div>
            </div>

            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              placeholder="Reason for rejection"
              className="mt-5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-red-500 dark:border-gray-700 dark:bg-gray-950"
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectRequest(null);
                  setRejectionReason("");
                }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void rejectSelectedRequest()}
                disabled={
                  !rejectionReason.trim() ||
                  processingId === rejectRequest.$id
                }
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {processingId === rejectRequest.$id
                  ? "Rejecting…"
                  : "Reject request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteEntry && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Delete record?</h2>
                <p className="mt-2 text-sm text-gray-500">
                  This will permanently delete {deleteEntry.name}&apos;s{" "}
                  {deleteEntry.kind}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteEntry(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteEntry(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteSelectedEntry()}
                disabled={processingId === deleteEntry.id}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {processingId === deleteEntry.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
