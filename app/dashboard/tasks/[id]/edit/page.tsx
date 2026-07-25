"use client";

import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Save,
  Tag,
  Trash2,
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
  getOwnedTask,
  listOrganizationProperties,
  type OwnedTask,
} from "@/lib/appwrite/helpers";
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

export default function EditTaskPage() {
  const { organization, isOffline } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params.id;
  const margin = useDashboardMargin();

  const [task, setTask] = useState<OwnedTask | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as "high" | "medium" | "low",
    status: "pending" as "pending" | "in-progress" | "completed",
    dueDate: "",
    propertyId: "",
    propertyName: "",
  });

  const loadData = useCallback(async () => {
    if (!organization || !taskId) return;

    setLoading(true);

    try {
      const [taskDocument, propertyDocuments] = await Promise.all([
        getOwnedTask(taskId, organization.$id),
        listOrganizationProperties(organization.userId, [
          Query.orderDesc("$createdAt"),
        ]),
      ]);

      setTask(taskDocument);
      setProperties(propertyDocuments as unknown as Property[]);
      setForm({
        title: taskDocument.title ?? "",
        description: taskDocument.description ?? "",
        priority: taskDocument.priority ?? "medium",
        status: taskDocument.status ?? "pending",
        dueDate: taskDocument.dueDate
          ? new Date(taskDocument.dueDate).toISOString().slice(0, 16)
          : "",
        propertyId: taskDocument.propertyId ?? "",
        propertyName: taskDocument.propertyName ?? "",
      });
    } catch (error) {
      console.error("Unable to load task:", error);
      toast.error(
        error instanceof Error ? error.message : "Unable to load this task.",
      );
      router.replace("/dashboard/tasks");
    } finally {
      setLoading(false);
    }
  }, [organization, router, taskId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectProperty = (propertyId: string) => {
    const property = properties.find((item) => item.$id === propertyId);

    setForm((current) => ({
      ...current,
      propertyId,
      propertyName: property?.propertyName ?? "",
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!organization) return;

    if (!form.title.trim()) {
      toast.error("Task title is required.");
      return;
    }

    if (!form.dueDate) {
      toast.error("Due date is required.");
      return;
    }

    if (isOffline) {
      toast.error("Connect to the internet to save this task.");
      return;
    }

    setSaving(true);

    try {
      await getOwnedTask(taskId, organization.$id);

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
        taskId,
        {
          organizationId: organization.$id,
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          status: form.status,
          dueDate: new Date(form.dueDate).toISOString(),
          propertyId: form.propertyId || "",
          propertyName: form.propertyName || "",
        },
      );

      window.dispatchEvent(new CustomEvent("tasksUpdated"));
      toast.success("Task updated.");
      router.replace(`/dashboard/tasks/${taskId}`);
    } catch (error) {
      console.error("Unable to update task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update task.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async () => {
    if (!organization || !task) return;

    setDeleting(true);

    try {
      await getOwnedTask(task.$id, organization.$id);

      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
        task.$id,
      );

      window.dispatchEvent(new CustomEvent("tasksUpdated"));
      toast.success("Task deleted.");
      router.replace("/dashboard/tasks");
    } catch (error) {
      console.error("Unable to delete task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task.",
      );
    } finally {
      setDeleting(false);
      setShowDelete(false);
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
                <p className="mt-4 text-sm text-gray-500">Loading task…</p>
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
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold">Edit task</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Update an organization-owned task.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 dark:border-red-900"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete task
                </button>
              </div>

              <form
                onSubmit={submit}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">
                      Task title
                    </span>
                    <input
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Description
                    </span>
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={6}
                      className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                        <Tag className="h-4 w-4" />
                        Priority
                      </span>
                      <select
                        value={form.priority}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            priority: event.target.value as
                              | "high"
                              | "medium"
                              | "low",
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium">
                        Status
                      </span>
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            status: event.target.value as
                              | "pending"
                              | "in-progress"
                              | "completed",
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </label>

                    <label>
                      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                        <Calendar className="h-4 w-4" />
                        Due date
                      </span>
                      <input
                        type="datetime-local"
                        value={form.dueDate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            dueDate: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                        <Building2 className="h-4 w-4" />
                        Property
                      </span>
                      <select
                        value={form.propertyId}
                        onChange={(event) =>
                          selectProperty(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                      >
                        <option value="">General organization task</option>
                        {properties.map((property) => (
                          <option key={property.$id} value={property.$id}>
                            {property.propertyName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
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
                    disabled={saving || isOffline}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
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

      {showDelete && task && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h2 className="text-lg font-bold">Delete task?</h2>
            <p className="mt-2 text-sm text-gray-500">
              This permanently deletes “{task.title}”.
            </p>

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
                onClick={() => void deleteTask()}
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
