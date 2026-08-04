"use client";

import {
  Bath,
  Bed,
  Building2,
  CheckCircle,
  Edit,
  Eye,
  Heart,
  Home,
  MapPin,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  Users,
  WifiOff,
  X,
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
            process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
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
                      className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
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
                  className: "text-orange-600 bg-orange-100 dark:bg-orange-950",
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
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProperties.map((property) => {
                  const activeTenants = activeTenantsFor(property);

                  return (
                    <article
                      key={property.$id}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
                    >
                      <Link
                        href={`/dashboard/properties/${property.$id}`}
                        className="relative block h-52 bg-gray-100 dark:bg-gray-900"
                      >
                        {property.image1 ? (
                          <Image
                            src={property.image1}
                            alt={property.propertyName}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Home className="h-12 w-12 text-gray-300" />
                          </div>
                        )}

                        <span
                          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            property.isAvailable !== false
                              ? "bg-blue-500 text-white"
                              : "bg-gray-900/80 text-white"
                          }`}
                        >
                          {property.isAvailable !== false
                            ? "Available"
                            : "Occupied"}
                        </span>
                      </Link>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold">
                              {property.propertyName}
                            </h2>
                            <p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {property.address}
                            </p>
                          </div>
                          <p className="shrink-0 font-bold text-[var(--accent-700)]">
                            {formatPrice(property)}
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-900">
                          <div>
                            <Bed className="mx-auto h-4 w-4 text-gray-500" />
                            <p className="mt-1 text-xs">
                              {property.bedrooms || 0} beds
                            </p>
                          </div>
                          <div>
                            <Bath className="mx-auto h-4 w-4 text-gray-500" />
                            <p className="mt-1 text-xs">
                              {property.bathrooms || 0} baths
                            </p>
                          </div>
                          <div>
                            <Users className="mx-auto h-4 w-4 text-gray-500" />
                            <p className="mt-1 text-xs">
                              {activeTenants.length}/{property.roomFor || 1}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            {property.views || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            {property.likes || 0}
                          </span>
                          <span className="ml-auto rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-900">
                            {property.type}
                          </span>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Link
                            href={`/dashboard/properties/${property.$id}/edit`}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setPropertyToDelete(property)}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
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
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
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
