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
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { ID, Query } from "appwrite";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases, storage } from "@/lib/appwrite/config";
import { listOrganizationProperties } from "@/lib/appwrite/helpers";
import type { Property } from "@/types/property";

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

export default function NewTenantPage() {
  const { organization } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const margin = useDashboardMargin();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [form, setForm] = useState({
    name: "",
    identifier: "",
    email: "",
    phone: "",
    propertyId: "",
    propertyName: "",
    status: "active",
    monthlyRent: "",
    leaseStartDate: new Date().toISOString().slice(0, 10),
  });

  const loadProperties = useCallback(async () => {
    if (!organization?.userId) return;

    setLoadingProperties(true);

    try {
      const owned = await listOrganizationProperties(organization.userId, [
        Query.orderDesc("$createdAt"),
      ]);
      setProperties(owned as unknown as Property[]);
    } catch (error) {
      console.error("Unable to load properties:", error);
      toast.error("Failed to load organization properties.");
    } finally {
      setLoadingProperties(false);
    }
  }, [organization?.userId]);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const selectProperty = (propertyId: string) => {
    const property = properties.find((item) => item.$id === propertyId);

    setForm((current) => ({
      ...current,
      propertyId,
      propertyName: property?.propertyName ?? "",
      monthlyRent:
        current.monthlyRent || String(property?.price ?? ""),
    }));
  };

  const selectAvatar = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar must be smaller than 5 MB.");
      return;
    }

    if (avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
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
      toast.error("Select one of your organization properties.");
      return;
    }

    const selectedProperty = properties.find(
      (property) => property.$id === form.propertyId,
    );

    if (!selectedProperty) {
      toast.error("The selected property is unavailable.");
      return;
    }

    setSaving(true);
    let uploadedAvatarFileId: string | null = null;

    try {
      let avatarUrl = "";

      if (avatarFile) {
        const uploaded = await storage.createFile(
          process.env.NEXT_PUBLIC_APPWRITE_TENANTS_BUCKET_ID!,
          ID.unique(),
          avatarFile,
        );
        uploadedAvatarFileId = uploaded.$id;
        avatarUrl = storage
          .getFileView(
            process.env.NEXT_PUBLIC_APPWRITE_TENANTS_BUCKET_ID!,
            uploaded.$id,
          )
          .toString();
      }

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
        ID.unique(),
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
          avatar: avatarUrl,
        },
      );

      if (form.status === "active") {
        const activeResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
          [
            Query.equal("organizationId", organization.$id),
            Query.equal("propertyName", form.propertyName),
            Query.equal("status", "active"),
            Query.limit(1),
          ],
        );

        const capacity = Math.max(1, selectedProperty.roomFor || 1);

        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
          selectedProperty.$id,
          { isAvailable: activeResponse.total < capacity },
        );
      }

      toast.success("Tenant created.");
      router.replace("/dashboard/tenants");
    } catch (error) {
      if (uploadedAvatarFileId) {
        await storage
          .deleteFile(
            process.env.NEXT_PUBLIC_APPWRITE_TENANTS_BUCKET_ID!,
            uploadedAvatarFileId,
          )
          .catch(() => undefined);
      }

      console.error("Unable to create tenant:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create tenant.",
      );
    } finally {
      setSaving(false);
    }
  };

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
                  <h1 className="text-2xl font-bold">Add tenant</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add a tenant directly to {organization?.name}.
                  </p>
                </div>
              </div>

              <form
                onSubmit={submit}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-6 flex flex-col items-center">
                  <label className="relative cursor-pointer">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--accent-500)] bg-gray-100 dark:bg-gray-800">
                      {avatarPreview ? (
                        <Image
                          src={avatarPreview}
                          alt="Tenant avatar preview"
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <User className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 rounded-full bg-[var(--accent-500)] p-2 text-white shadow">
                      <Upload className="h-4 w-4" />
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        selectAvatar(event.target.files?.[0] ?? null)
                      }
                    />
                  </label>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        if (avatarPreview.startsWith("blob:")) {
                          URL.revokeObjectURL(avatarPreview);
                        }
                        setAvatarPreview("");
                        setAvatarFile(null);
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove avatar
                    </button>
                  )}
                </div>

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
                        placeholder="Student ID or National ID"
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
                      Organization property
                    </span>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <select
                        value={form.propertyId}
                        onChange={(event) =>
                          selectProperty(event.target.value)
                        }
                        disabled={loadingProperties}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                      >
                        <option value="">
                          {loadingProperties
                            ? "Loading properties…"
                            : "Select property"}
                        </option>
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
                    disabled={saving || loadingProperties}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving…" : "Create tenant"}
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
