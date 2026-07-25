"use client";

import {
  ArrowLeft,
  Bath,
  Bed,
  Building2,
  Calendar,
  CheckCircle,
  Edit,
  Eye,
  Heart,
  Home,
  MapPin,
  Ruler,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Query } from "appwrite";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases, storage } from "@/lib/appwrite/config";
import {
  getOwnedProperty,
  listOrganizationTenants,
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

function fileIdFromUrl(url: string): string | null {
  const match = url.match(/\/files\/([^/?]+)/);
  return match?.[1] ?? null;
}

function parseFacilities(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PropertyDetailsPage() {
  const { organization } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const propertyId = params.id;
  const margin = useDashboardMargin();

  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!organization || !propertyId) return;

    setLoading(true);

    try {
      const [propertyDocument, tenantDocuments] = await Promise.all([
        getOwnedProperty(propertyId, organization.userId),
        listOrganizationTenants(organization.$id, [
          Query.orderDesc("$createdAt"),
        ]),
      ]);

      const ownedProperty = propertyDocument as unknown as Property;
      setProperty(ownedProperty);
      setSelectedImage(
        ownedProperty.image1 ||
          ownedProperty.image2 ||
          ownedProperty.image3 ||
          "",
      );
      setTenants(tenantDocuments as unknown as Tenant[]);
    } catch (error) {
      console.error("Unable to load property details:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load this property.",
      );
      router.replace("/dashboard/properties");
    } finally {
      setLoading(false);
    }
  }, [organization, propertyId, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const propertyTenants = useMemo(() => {
    if (!property) return [];

    return tenants.filter(
      (tenant) =>
        tenant.status === "active" &&
        tenant.propertyName === property.propertyName,
    );
  }, [property, tenants]);

  const deleteProperty = async () => {
    if (!organization || !property) return;

    if (propertyTenants.length > 0) {
      toast.error(
        "Move or remove active tenants before deleting this property.",
      );
      setShowDelete(false);
      return;
    }

    setDeleting(true);

    try {
      await getOwnedProperty(property.$id, organization.userId);

      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        property.$id,
      );

      await Promise.allSettled(
        [property.image1, property.image2, property.image3]
          .filter(Boolean)
          .map(async (url) => {
            const fileId = fileIdFromUrl(url);
            if (!fileId) return;

            await storage.deleteFile(
              process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!,
              fileId,
            );
          }),
      );

      cacheService.remove(
        CACHE_KEYS.organizationProperties(organization.$id),
      );
      cacheService.remove(CACHE_KEYS.PROPERTIES);
      cacheService.remove(CACHE_KEYS.PROPERTY(property.$id));
      await syncOrganizationPropertyCount(organization.userId);

      toast.success("Property deleted.");
      router.replace("/dashboard/properties");
    } catch (error) {
      console.error("Unable to delete property:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete property.",
      );
    } finally {
      setDeleting(false);
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
                  Loading property…
                </p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!property) return null;

  const images = [
    property.image1,
    property.image2,
    property.image3,
  ].filter(Boolean);
  const facilities = parseFacilities(property.facilities || "");
  const capacity = Math.max(1, property.roomFor || 1);
  const occupancy = Math.min(
    100,
    Math.round((propertyTenants.length / capacity) * 100),
  );

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
            <div className="mx-auto max-w-6xl">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-bold">
                      {property.propertyName}
                    </h1>
                    <p className="mt-1 flex items-center gap-1 truncate text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {property.address}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/properties/${property.$id}/edit`}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowDelete(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
                <section className="space-y-5">
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-800">
                      {selectedImage ? (
                        <Image
                          src={selectedImage}
                          alt={property.propertyName}
                          fill
                          sizes="(max-width: 1024px) 100vw, 70vw"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Home className="h-16 w-16 text-gray-300" />
                        </div>
                      )}

                      <span
                        className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold ${
                          property.isAvailable !== false
                            ? "bg-green-500 text-white"
                            : "bg-gray-900/80 text-white"
                        }`}
                      >
                        {property.isAvailable !== false
                          ? "Available"
                          : "Occupied"}
                      </span>
                    </div>

                    {images.length > 1 && (
                      <div className="grid grid-cols-3 gap-2 p-3">
                        {images.map((image) => (
                          <button
                            key={image}
                            type="button"
                            onClick={() => setSelectedImage(image)}
                            className={`relative aspect-[4/3] overflow-hidden rounded-xl border-2 ${
                              selectedImage === image
                                ? "border-[var(--accent-500)]"
                                : "border-transparent"
                            }`}
                          >
                            <Image
                              src={image}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--accent-500)]">
                          {property.type}
                        </p>
                        <h2 className="mt-1 text-2xl font-bold">
                          ${Number(property.price || 0).toLocaleString()}
                          {property.type !== "Land" &&
                            property.type !== "Workplace" && (
                              <span className="text-sm font-normal text-gray-500">
                                /month
                              </span>
                            )}
                        </h2>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800">
                        <p className="text-xs uppercase text-gray-400">
                          Lowest acceptable
                        </p>
                        <p className="mt-1 font-bold">
                          ${Number(
                            property.priceThreshold ?? property.price ?? 0,
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        {
                          icon: Bed,
                          label: "Bedrooms",
                          value: property.bedrooms || 0,
                        },
                        {
                          icon: Bath,
                          label: "Bathrooms",
                          value: property.bathrooms || 0,
                        },
                        {
                          icon: Ruler,
                          label: "Area",
                          value: `${property.area || 0} m²`,
                        },
                        {
                          icon: Users,
                          label: "Capacity",
                          value: `${propertyTenants.length}/${capacity}`,
                        },
                      ].map((item) => {
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.label}
                            className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800"
                          >
                            <Icon className="mx-auto h-5 w-5 text-[var(--accent-500)]" />
                            <p className="mt-2 font-bold">{item.value}</p>
                            <p className="text-[10px] uppercase text-gray-400">
                              {item.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {property.description && (
                      <div className="mt-5">
                        <h3 className="font-bold">Description</h3>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {property.description}
                        </p>
                      </div>
                    )}

                    {facilities.length > 0 && (
                      <div className="mt-5">
                        <h3 className="font-bold">Facilities</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {facilities.map((facility) => (
                            <span
                              key={facility}
                              className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold dark:bg-gray-800"
                            >
                              {facility}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="space-y-5">
                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <h2 className="flex items-center gap-2 font-bold">
                      <Building2 className="h-5 w-5 text-[var(--accent-500)]" />
                      Performance
                    </h2>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800">
                        <Eye className="mx-auto h-4 w-4 text-gray-400" />
                        <p className="mt-1 font-bold">{property.views || 0}</p>
                        <p className="text-[10px] uppercase text-gray-400">
                          Views
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800">
                        <Heart className="mx-auto h-4 w-4 text-gray-400" />
                        <p className="mt-1 font-bold">{property.likes || 0}</p>
                        <p className="text-[10px] uppercase text-gray-400">
                          Likes
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800">
                        <Calendar className="mx-auto h-4 w-4 text-gray-400" />
                        <p className="mt-1 font-bold">
                          {property.requests || 0}
                        </p>
                        <p className="text-[10px] uppercase text-gray-400">
                          Requests
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <h2 className="flex items-center gap-2 font-bold">
                        <Users className="h-5 w-5 text-[var(--accent-500)]" />
                        Active tenants
                      </h2>
                      <span className="text-sm font-bold">
                        {propertyTenants.length}/{capacity}
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-[var(--accent-500)]"
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>

                    <div className="mt-4 space-y-3">
                      {propertyTenants.length === 0 ? (
                        <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-800">
                          No active tenants.
                        </p>
                      ) : (
                        propertyTenants.map((tenant) => (
                          <Link
                            key={tenant.$id}
                            href={`/dashboard/tenants/${tenant.$id}/edit`}
                            className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              {tenant.avatar ? (
                                <Image
                                  src={tenant.avatar}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <Users className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">
                                {tenant.name}
                              </p>
                              <p className="truncate text-xs text-gray-500">
                                {tenant.phone ||
                                  tenant.tenantPhone ||
                                  tenant.email ||
                                  "No contact details"}
                              </p>
                            </div>
                            <CheckCircle className="ml-auto h-4 w-4 text-green-500" />
                          </Link>
                        ))
                      )}
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Delete property?</h2>
                <p className="mt-2 text-sm text-gray-500">
                  This permanently deletes {property.propertyName} and its
                  uploaded images.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteProperty()}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
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
