"use client";

import {
  Bath,
  Bed,
  Building2,
  Calendar,
  CheckCircle,
  Clock3,
  Edit,
  Eye,
  Heart,
  Home,
  MapPin,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  WifiOff,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Query } from "appwrite";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases, storage } from "@/lib/appwrite/config";
import {
  listOrganizationProperties,
  syncOrganizationPropertyCount,
} from "@/lib/appwrite/helpers";
import { cacheService } from "@/lib/cache.service";
import { CACHE_KEYS } from "@/lib/cache-keys";
import type { Property } from "@/types/property";
import type { Tenant } from "@/types/tenant";

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

function getFileIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/files\/([^/?]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function formatPrice(property: Property): string {
  const amount = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(property.price || 0);

  const type = property.type?.toLowerCase();

  if (type === "land" || type === "workplace") {
    return `$${amount}`;
  }

  return `$${amount}/month`;
}

function formatDate(value?: string): string {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseFacilities(value?: string): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseReviewCount(value: unknown): number {
  if (typeof value !== "string") return 0;

  const trimmed = value.trim();

  if (!trimmed || trimmed === "[]" || trimmed === "null") {
    return 0;
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return parsed.length;
    }

    return parsed ? 1 : 0;
  } catch {
    return 1;
  }
}

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function PropertiesPage() {
  const { organization, isOffline } = useAuth();
  const { resolvedTheme } = useTheme();
  const margin = useDashboardMargin();

  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(
    null,
  );

  const cacheKey = organization
    ? CACHE_KEYS.organizationProperties(organization.$id)
    : null;

  const loadProperties = useCallback(
    async (force = false) => {
      if (!organization) {
        setProperties([]);
        setTenants([]);
        setLoading(false);
        return;
      }

      if (!force && cacheKey) {
        const cached = cacheService.get<Property[]>(cacheKey);

        if (cached) {
          setProperties(cached);
          setLoading(false);
        }
      }

      if (!navigator.onLine) {
        setLoading(false);
        return;
      }

      try {
        const [ownedProperties, tenantResponse] = await Promise.all([
          listOrganizationProperties(organization.userId, [
            Query.orderDesc("$createdAt"),
          ]),
          databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env
              .NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
            [
              Query.equal("organizationId", organization.$id),
              Query.orderDesc("$createdAt"),
              Query.limit(1000),
            ],
          ),
        ]);

        const nextProperties = ownedProperties as unknown as Property[];
        const nextTenants = tenantResponse.documents as unknown as Tenant[];

        setProperties(nextProperties);
        setTenants(nextTenants);

        if (cacheKey) {
          cacheService.set(cacheKey, nextProperties, 5 * 60 * 1000);
        }
      } catch (error) {
        console.error("Unable to load properties:", error);
        toast.error("Failed to load organization properties.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cacheKey, organization],
  );

  useEffect(() => {
    void loadProperties();

    const refresh = () => void loadProperties(true);
    window.addEventListener("cacheRefreshed", refresh);

    return () => window.removeEventListener("cacheRefreshed", refresh);
  }, [loadProperties]);

  const filteredProperties = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return properties.filter((property) => {
      const matchesSearch =
        !search ||
        property.propertyName.toLowerCase().includes(search) ||
        property.address.toLowerCase().includes(search) ||
        property.type.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "available"
          ? property.isAvailable !== false
          : property.isAvailable === false);

      const matchesType =
        typeFilter === "all" || property.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [properties, searchTerm, statusFilter, typeFilter]);

  const propertyTypes = useMemo(
    () =>
      Array.from(new Set(properties.map((property) => property.type))).sort(),
    [properties],
  );

  const activeTenantsFor = (property: Property): Tenant[] =>
    tenants.filter(
      (tenant) =>
        tenant.status === "active" &&
        tenant.propertyName === property.propertyName,
    );

  const deleteProperty = async () => {
    if (!organization || !propertyToDelete) return;

    const activeTenants = activeTenantsFor(propertyToDelete);

    if (activeTenants.length > 0) {
      toast.error(
        "Move or remove active tenants before deleting this property.",
      );
      return;
    }

    setDeleting(true);

    try {
      const latestProperty = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        propertyToDelete.$id,
      );

      if (String(latestProperty.creatorId ?? "") !== organization.userId) {
        throw new Error("You cannot delete another organization's property.");
      }

      const imageUrls = [
        propertyToDelete.image1,
        propertyToDelete.image2,
        propertyToDelete.image3,
      ].filter(Boolean);

      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        propertyToDelete.$id,
      );

      await Promise.allSettled(
        imageUrls.map(async (url) => {
          const fileId = getFileIdFromUrl(url);

          if (!fileId) return;

          await storage.deleteFile(
            process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!,
            fileId,
          );
        }),
      );

      const nextProperties = properties.filter(
        (property) => property.$id !== propertyToDelete.$id,
      );

      setProperties(nextProperties);

      if (cacheKey) {
        cacheService.set(cacheKey, nextProperties, 5 * 60 * 1000);
      }

      await syncOrganizationPropertyCount(organization.userId);
      setPropertyToDelete(null);
      toast.success("Property deleted.");
    } catch (error) {
      console.error("Unable to delete property:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete property.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const availableCount = properties.filter(
    (property) => property.isAvailable !== false,
  ).length;

  const occupiedCount = properties.length - availableCount;
  const dark = resolvedTheme === "dark";

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
                <h1 className="text-2xl font-bold">Properties</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Manage listings created by {organization?.name}.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRefreshing(true);
                    void loadProperties(true);
                  }}
                  disabled={refreshing || isOffline}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {isOffline ? (
                    <WifiOff className="h-4 w-4" />
                  ) : (
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshing ? "animate-spin" : ""
                      }`}
                    />
                  )}
                  Refresh
                </button>

                <Link
                  href="/dashboard/properties/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-700)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add property
                </Link>
              </div>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Total properties",
                  value: properties.length,
                  icon: Building2,
                  className: "text-blue-600 bg-blue-100 dark:bg-blue-950",
                },
                {
                  label: "Available",
                  value: availableCount,
                  icon: CheckCircle,
                  className: "text-blue-600 bg-blue-100 dark:bg-blue-950",
                },
                {
                  label: "Occupied",
                  value: occupiedCount,
                  icon: Users,
                  className:
                    "text-orange-600 bg-orange-100 dark:bg-orange-950",
                },
              ].map((stat) => {
                const Icon = stat.icon;

                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl p-2.5 ${stat.className}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <label className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, address or type"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-700)] dark:border-gray-700 dark:bg-gray-900"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="all">All statuses</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="all">All property types</option>

                {propertyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex h-80 items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent-700)] dark:border-gray-700" />
                  <p className="mt-4 text-sm text-gray-500">
                    Loading properties…
                  </p>
                </div>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
                <Home className="mx-auto h-12 w-12 text-gray-300" />
                <h2 className="mt-4 font-bold">No properties found</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add a property or adjust the current filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {filteredProperties.map((property) => {
                  const activeTenants = activeTenantsFor(property);
                  const facilities = parseFacilities(property.facilities);
                  const visibleFacilities = facilities.slice(0, 4);
                  const hiddenFacilitiesCount = Math.max(
                    0,
                    facilities.length - visibleFacilities.length,
                  );

                  const totalSlots = Math.max(
                    1,
                    safeNumber(
                      property.totalSlots ?? property.roomFor,
                      property.roomFor || 1,
                    ),
                  );

                  const occupiedFromProperty = safeNumber(
                    property.occupiedSlots,
                    Number.NaN,
                  );

                  const occupiedSlots = Math.min(
                    totalSlots,
                    Math.max(
                      0,
                      Number.isFinite(occupiedFromProperty)
                        ? occupiedFromProperty
                        : activeTenants.length,
                    ),
                  );

                  const availableFromProperty = safeNumber(
                    property.availableSlots,
                    Number.NaN,
                  );

                  const availableSlots = Math.min(
                    totalSlots,
                    Math.max(
                      0,
                      Number.isFinite(availableFromProperty)
                        ? availableFromProperty
                        : totalSlots - occupiedSlots,
                    ),
                  );

                  const occupancyPercent = Math.min(
                    100,
                    Math.max(
                      0,
                      Math.round((occupiedSlots / totalSlots) * 100),
                    ),
                  );

                  const reviewCount = parseReviewCount(
                    property.reviews || property.review,
                  );

                  const rating = Math.min(
                    5,
                    Math.max(0, safeNumber(property.rating)),
                  );

                  const imageCount = [
                    property.image1,
                    property.image2,
                    property.image3,
                  ].filter(Boolean).length;

                  const approvalLabel =
                    property.organizationApproved === true
                      ? "Approved"
                      : property.organizationApproved === false
                        ? "Disapproved"
                        : "Pending approval";

                  const approvalClasses =
                    property.organizationApproved === true
                      ? "bg-emerald-500/95 text-white"
                      : property.organizationApproved === false
                        ? "bg-red-500/95 text-white"
                        : "bg-amber-400/95 text-gray-950";

                  return (
                    <article
                      key={property.$id}
                      className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900"
                    >
                      <Link
                        href={`/dashboard/properties/${property.$id}`}
                        className="relative block h-56 overflow-hidden bg-gray-100 dark:bg-gray-950"
                      >
                        {property.image1 ? (
                          <Image
                            src={property.image1}
                            alt={property.propertyName}
                            fill
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            className="object-cover transition duration-500 group-hover:scale-[1.03]"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Home className="h-14 w-14 text-gray-300 dark:text-gray-700" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" />

                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
                              property.isAvailable !== false
                                ? "bg-blue-500 text-white"
                                : "bg-gray-950/85 text-white"
                            }`}
                          >
                            {property.isAvailable !== false
                              ? "Available"
                              : "Occupied"}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${approvalClasses}`}
                          >
                            {approvalLabel}
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white/75">
                              {property.type || "Property"}
                            </p>
                            <p className="truncate text-xl font-black">
                              {property.propertyName}
                            </p>
                          </div>

                          <div className="shrink-0 rounded-2xl bg-black/45 px-3 py-2 text-right backdrop-blur-md">
                            <p className="text-[10px] uppercase tracking-wide text-white/70">
                              Price
                            </p>
                            <p className="font-black">
                              {formatPrice(property)}
                            </p>
                          </div>
                        </div>

                        <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                          {imageCount} image{imageCount === 1 ? "" : "s"}
                        </span>
                      </Link>

                      <div className="p-5">
                        <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-700)]" />
                          <p className="line-clamp-2">{property.address}</p>
                        </div>

                        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-gray-600 dark:text-gray-300">
                          {property.description?.trim() ||
                            "No property description has been added yet."}
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-950/70">
                            <Bed className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <p className="mt-2 text-base font-black">
                              {property.bedrooms || 0}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Bedrooms
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-950/70">
                            <Bath className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            <p className="mt-2 text-base font-black">
                              {property.bathrooms || 0}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Bathrooms
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-950/70">
                            <Ruler className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            <p className="mt-2 truncate text-base font-black">
                              {property.area || 0}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Area
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-950/70">
                            <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <p className="mt-2 text-base font-black">
                              {totalSlots}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Total slots
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                Occupancy
                              </p>
                              <p className="mt-1 text-sm font-semibold">
                                {occupiedSlots} occupied · {availableSlots}{" "}
                                available
                              </p>
                            </div>

                            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-black text-gray-700 dark:bg-gray-800 dark:text-gray-100">
                              {occupancyPercent}%
                            </span>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                              className="h-full rounded-full bg-[var(--accent-700)] transition-[width] duration-500"
                              style={{ width: `${occupancyPercent}%` }}
                            />
                          </div>

                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {activeTenants.length} active tenant
                            {activeTenants.length === 1 ? "" : "s"} linked to
                            this listing
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-4 divide-x divide-gray-200 rounded-2xl bg-gray-50 py-3 text-center dark:divide-gray-800 dark:bg-gray-950/70">
                          <div className="px-2">
                            <Eye className="mx-auto h-4 w-4 text-gray-500" />
                            <p className="mt-1 font-black">
                              {property.views || 0}
                            </p>
                            <p className="text-[10px] text-gray-500">Views</p>
                          </div>

                          <div className="px-2">
                            <Heart className="mx-auto h-4 w-4 text-rose-500" />
                            <p className="mt-1 font-black">
                              {property.likes || 0}
                            </p>
                            <p className="text-[10px] text-gray-500">Likes</p>
                          </div>

                          <div className="px-2">
                            <MessageSquare className="mx-auto h-4 w-4 text-violet-500" />
                            <p className="mt-1 font-black">
                              {property.requests || 0}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              Requests
                            </p>
                          </div>

                          <div className="px-2">
                            <Star className="mx-auto h-4 w-4 fill-amber-400 text-amber-400" />
                            <p className="mt-1 font-black">
                              {rating > 0 ? rating.toFixed(1) : "—"}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {reviewCount} review
                              {reviewCount === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                              Facilities
                            </p>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {visibleFacilities.length > 0 ? (
                              <>
                                {visibleFacilities.map((facility) => (
                                  <span
                                    key={facility}
                                    className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                  >
                                    {facility}
                                  </span>
                                ))}

                                {hiddenFacilitiesCount > 0 && (
                                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                    +{hiddenFacilitiesCount} more
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">
                                No facilities listed
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:grid-cols-2">
                          <span className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 shrink-0" />
                            Curfew: {property.curfew || "Not specified"}
                          </span>

                          <span className="flex items-center gap-2 sm:justify-end">
                            <Calendar className="h-4 w-4 shrink-0" />
                            Added {formatDate(property.$createdAt)}
                          </span>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Link
                            href={`/dashboard/properties/${property.$id}`}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent-700)] px-3 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            View details
                          </Link>

                          <Link
                            href={`/dashboard/properties/${property.$id}/edit`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => setPropertyToDelete(property)}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2.5 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                            aria-label={`Delete ${property.propertyName}`}
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
          </main>
        </div>
      </div>

      {propertyToDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Delete property?</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {propertyToDelete.propertyName} and its uploaded images will
                  be permanently deleted.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPropertyToDelete(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {activeTenantsFor(propertyToDelete).length > 0 && (
              <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                This property still has active tenants and cannot be deleted.
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPropertyToDelete(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-gray-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void deleteProperty()}
                disabled={
                  deleting || activeTenantsFor(propertyToDelete).length > 0
                }
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
