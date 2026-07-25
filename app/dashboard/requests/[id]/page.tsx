"use client";

import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  User,
  XCircle,
} from "lucide-react";
import { ID, Query } from "appwrite";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases } from "@/lib/appwrite/config";
import {
  getOwnedRequest,
  listOrganizationProperties,
} from "@/lib/appwrite/helpers";
import type { Property } from "@/types/property";

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

export default function RequestDetailsPage() {
  const { organization } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const requestId = params.id;
  const margin = useDashboardMargin();

  const [request, setRequest] = useState<RentalRequest | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadRequest = useCallback(async () => {
    if (!organization?.userId || !requestId) return;

    setLoading(true);

    try {
      const requestDocument = (await getOwnedRequest(
        requestId,
        organization.userId,
      )) as unknown as RentalRequest;

      const propertyDocuments = await listOrganizationProperties(
        organization.userId,
      );

      const ownedProperties = propertyDocuments as unknown as Property[];
      setRequest(requestDocument);
      setProperty(
        ownedProperties.find(
          (item) => item.$id === requestDocument.propertyId,
        ) ?? null,
      );
    } catch (error) {
      console.error("Unable to load request:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load this request.",
      );
      router.replace("/dashboard/tenants");
    } finally {
      setLoading(false);
    }
  }, [organization, requestId, router]);

  useEffect(() => {
    void loadRequest();
  }, [loadRequest]);

  const updatePropertyAvailability = async (
    targetProperty: Property,
    propertyName: string,
  ) => {
    if (!organization) return;

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

    const capacity = Math.max(1, targetProperty.roomFor || 1);

    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
      targetProperty.$id,
      { isAvailable: activeTenants.total < capacity },
    );
  };

  const approve = async () => {
    if (!organization || !request || !property) return;

    setProcessing(true);

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
        email: request.tenantEmail,
        phone: request.tenantPhone ?? "",
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
          {
            status: "approved",
            rejectionReason: "",
          },
        ),
        updatePropertyAvailability(property, request.propertyName),
      ]);

      toast.success("Rental request approved.");
      await loadRequest();
      window.dispatchEvent(new CustomEvent("cacheRefreshed"));
    } catch (error) {
      console.error("Unable to approve request:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to approve request.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const reject = async () => {
    if (!organization || !request || !rejectionReason.trim()) return;

    setProcessing(true);

    try {
      await getOwnedRequest(request.$id, organization.userId);

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
        request.$id,
        {
          status: "rejected",
          rejectionReason: rejectionReason.trim(),
        },
      );

      toast.success("Rental request rejected.");
      setShowReject(false);
      setRejectionReason("");
      await loadRequest();
      window.dispatchEvent(new CustomEvent("cacheRefreshed"));
    } catch (error) {
      console.error("Unable to reject request:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reject request.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const dark = theme === "dark";

  if (loading) {
    return (
      <ProtectedRoute>
        <div
          className={`min-h-screen ${
            dark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"
          }`}
        >
          <Sidebar />
          <div className={`${margin} transition-all duration-300`}>
            <Header />
            <div className="flex h-[70vh] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent-500)] dark:border-gray-700" />
                <p className="mt-4 text-sm text-gray-500">
                  Loading request…
                </p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!request) return null;

  const statusStyle =
    request.status === "approved"
      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
      : request.status === "rejected"
        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";

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
            <div className="mx-auto max-w-5xl">
              <div className="mb-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold">
                      Rental request
                    </h1>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyle}`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Submitted {new Date(request.$createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      {request.tenantAvatar ? (
                        <Image
                          src={request.tenantAvatar}
                          alt=""
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <User className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {request.tenantName}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Nookly rental applicant
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                      <p className="text-xs uppercase text-gray-400">Email</p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {request.tenantEmail || "Not provided"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                      <p className="text-xs uppercase text-gray-400">Phone</p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {request.tenantPhone || "Not provided"}
                      </p>
                    </div>
                  </div>

                  {request.message && (
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 font-bold">
                        <MessageCircle className="h-4 w-4 text-[var(--accent-500)]" />
                        Message
                      </h3>
                      <p className="rounded-xl bg-gray-50 p-4 text-sm leading-6 dark:bg-gray-800">
                        {request.message}
                      </p>
                    </div>
                  )}

                  {request.questions && (
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 font-bold">
                        <FileText className="h-4 w-4 text-[var(--accent-500)]" />
                        Questions
                      </h3>
                      <p className="rounded-xl bg-gray-50 p-4 text-sm leading-6 dark:bg-gray-800">
                        {request.questions}
                      </p>
                    </div>
                  )}

                  {request.rejectionReason && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                      <p className="text-xs font-bold uppercase text-red-600">
                        Rejection reason
                      </p>
                      <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                        {request.rejectionReason}
                      </p>
                    </div>
                  )}
                </section>

                <aside className="space-y-5">
                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <h2 className="mb-4 flex items-center gap-2 font-bold">
                      <Building2 className="h-5 w-5 text-[var(--accent-500)]" />
                      Rental details
                    </h2>

                    <dl className="space-y-4">
                      <div>
                        <dt className="text-xs uppercase text-gray-400">
                          Property
                        </dt>
                        <dd className="mt-1 font-semibold">
                          {request.propertyName}
                        </dd>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="text-xs uppercase text-gray-400">
                            Proposed rent
                          </dt>
                          <dd className="mt-1 flex items-center gap-1 font-semibold">
                            <DollarSign className="h-4 w-4" />
                            {request.proposedPrice?.toLocaleString() || 0}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase text-gray-400">
                            Listed rent
                          </dt>
                          <dd className="mt-1 flex items-center gap-1 font-semibold">
                            <DollarSign className="h-4 w-4" />
                            {(request.originalPrice ??
                              property?.price ??
                              0
                            ).toLocaleString()}
                          </dd>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="text-xs uppercase text-gray-400">
                            Move-in
                          </dt>
                          <dd className="mt-1 flex items-center gap-1 text-sm font-semibold">
                            <Calendar className="h-4 w-4" />
                            {request.moveInDate
                              ? new Date(
                                  request.moveInDate,
                                ).toLocaleDateString()
                              : "Not set"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase text-gray-400">
                            Duration
                          </dt>
                          <dd className="mt-1 flex items-center gap-1 text-sm font-semibold">
                            <Clock className="h-4 w-4" />
                            {request.leaseDuration || "Not set"}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </section>

                  {request.status === "pending" && (
                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                      <h2 className="font-bold">Decision</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Approving creates or updates the tenant record.
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setShowReject(true)}
                          disabled={processing}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50 dark:border-red-900"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => void approve()}
                          disabled={processing || !property}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {processing ? "Processing…" : "Approve"}
                        </button>
                      </div>
                    </section>
                  )}
                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>

      {showReject && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h2 className="text-lg font-bold">Reject rental request</h2>
            <p className="mt-1 text-sm text-gray-500">
              This reason will be stored with the request.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              placeholder="Reason for rejection"
              className="mt-4 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-950"
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowReject(false);
                  setRejectionReason("");
                }}
                disabled={processing}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void reject()}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {processing ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
