"use client";

import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Hash,
  Mail,
  Phone,
  Save,
  User,
} from "lucide-react";
import { Query } from "appwrite";
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
  getOwnedTenant,
  listOrganizationProperties,
} from "@/lib/appwrite/helpers";
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

export default function EditTenantPage() {
  const { organization } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const tenantId = params.id;
  const margin = useDashboardMargin();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalPropertyName, setOriginalPropertyName] = useState("");
  const [form, setForm] = useState({
    name: "",
    identifier: "",
    email: "",
    phone: "",
    propertyId: "",
    propertyName: "",
    status: "active",
    monthlyRent: "",
    leaseStartDate: "",
  });

  const loadData = useCallback(async () => {
    if (!organization || !tenantId) return;

    setLoading(true);

    try {
      const [tenantDocument, propertyDocuments] = await Promise.all([
        getOwnedTenant(tenantId, organization.$id),
        listOrganizationProperties(organization.userId, [
          Query.orderDesc("$createdAt"),
        ]),
      ]);

      const tenant = tenantDocument as unknown as Tenant;
      const ownedProperties = propertyDocuments as unknown as Property[];
      const matchingProperty = ownedProperties.find(
        (property) => property.propertyName === tenant.propertyName,
      );

      setProperties(ownedProperties);
      setOriginalPropertyName(tenant.propertyName ?? "");
      setForm({
        name: tenant.name ?? "",
        identifier: tenant.identifier || tenant.Identifier || "",
        email: tenant.email ?? "",
        phone: tenant.phone || tenant.tenantPhone || "",
        propertyId: matchingProperty?.$id ?? "",
        propertyName: tenant.propertyName ?? "",
        status: tenant.status ?? "active",
        monthlyRent: String(tenant.monthlyRent ?? ""),
        leaseStartDate: tenant.leaseStartDate ?? "",
      });
    } catch (error) {
      console.error("Unable to load tenant:", error);
      toast.error(
        error instanceof Error ? error.message : "Unable to load this tenant.",
      );
      router.replace("/dashboard/tenants");
    } finally {
      setLoading(false);
    }
  }, [organization, router, tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectProperty = (propertyId: string) => {
    const property = properties.find((item) => item.$id === propertyId);

    setForm((current) => ({
      ...current,
      propertyId,
      propertyName: property?.propertyName ?? "",
      monthlyRent:
        property && !current.monthlyRent
          ? String(property.price ?? "")
          : current.monthlyRent,
    }));
  };

  const refreshPropertyAvailability = async (propertyName: string) => {
    if (!organization || !propertyName) return;

    const property = properties.find(
      (item) => item.propertyName === propertyName,
    );
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
      property.$id,
      { isAvailable: activeTenants.total < capacity },
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!organization) return;

    if (!form.name.trim()) {
      toast.error("Tenant name is required.");
      return;
    }

    if (!form.identifier.trim()) {
      toast.error("Tenant identifier is required.");
      return;
    }

    if (!form.propertyId || !form.propertyName) {
      toast.error("Select an organization property.");
      return;
    }

    setSaving(true);

    try {
      await getOwnedTenant(tenantId, organization.$id);

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
        tenantId,
        {
          organizationId: organization.$id,
          name: form.name.trim(),
          identifier: form.identifier.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          propertyName: form.propertyName,
          status: form.status,
          monthlyRent: Number(form.monthlyRent || 0),
          leaseStartDate: form.leaseStartDate,
        },
      );

      await Promise.allSettled([
        refreshPropertyAvailability(originalPropertyName),
        refreshPropertyAvailability(form.propertyName),
      ]);

      toast.success("Tenant updated.");
      router.replace("/dashboard/tenants");
    } catch (error) {
      console.error("Unable to update tenant:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update tenant.",
      );
    } finally {
      setSaving(false);
    }
  };

  const dark = resolvedTheme === "dark";

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
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent-700)] dark:border-gray-700" />
                <p className="mt-4 text-sm text-gray-500">
                  Loading tenant…
                </p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

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
            <div className="mx-auto max-w-4xl">
              <div className="mb-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold">Edit tenant</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Update an organization-owned tenant record.
                  </p>
                </div>
              </div>

              <form
                onSubmit={submit}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-sm font-medium">
                      Full name
                    </span>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                      />
                    </div>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-sm font-medium">
                      Identifier
                    </span>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        value={form.identifier}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            identifier: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                      />
                    </div>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-sm font-medium">
                      Email
                    </span>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                      />
                    </div>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-sm font-medium">
                      Phone
                    </span>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        value={form.phone}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                      />
                    </div>
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium">
                      Property
                    </span>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <select
                        value={form.propertyId}
                        onChange={(event) =>
                          selectProperty(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                      >
                        <option value="">Select property</option>
                        {properties.map((property) => (
                          <option key={property.$id} value={property.$id}>
                            {property.propertyName} — {property.address}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-sm font-medium">
                      Monthly rent
                    </span>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        value={form.monthlyRent}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            monthlyRent: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                      />
                    </div>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-sm font-medium">
                      Lease start date
                    </span>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={form.leaseStartDate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            leaseStartDate: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                      />
                    </div>
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium">
                      Status
                    </span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={saving}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold dark:border-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-700)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
