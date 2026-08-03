"use client";

import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  FileText,
  RefreshCw,
  Tag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
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
  getOwnedProperty,
  getOwnedTask,
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

export default function TaskDetailsPage() {
  const { organization, isOffline } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params.id;
  const margin = useDashboardMargin();

  const [task, setTask] = useState<OwnedTask | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const loadTask = useCallback(async () => {
    if (!organization || !taskId || taskId === "new") return;

    try {
      const taskDocument = await getOwnedTask(taskId, organization.$id);
      setTask(taskDocument);

      if (taskDocument.propertyId) {
        try {
          const propertyDocument = await getOwnedProperty(
            taskDocument.propertyId,
            organization.userId,
          );
          setProperty(propertyDocument as unknown as Property);
        } catch {
          setProperty(null);
        }
      } else {
        setProperty(null);
      }
    } catch (error) {
      console.error("Unable to load task:", error);
      toast.error(
        error instanceof Error ? error.message : "Unable to load this task.",
      );
      router.replace("/dashboard/tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organization, router, taskId]);

  useEffect(() => {
    if (taskId === "new") {
      router.replace("/dashboard/tasks/new");
      return;
    }

    void loadTask();
  }, [loadTask, router, taskId]);

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
                <p className="mt-4 text-sm text-gray-500">Loading task…</p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!task) return null;

  const overdue =
    task.status !== "completed" &&
    new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

  const priorityStyle =
    task.priority === "high"
      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      : task.priority === "medium"
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
        : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";

  const statusStyle =
    task.status === "completed"
      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
      : task.status === "in-progress"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
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
            <div className="mx-auto max-w-4xl">
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
                    <h1 className="truncate text-2xl font-bold">{task.title}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Organization task details
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRefreshing(true);
                      void loadTask();
                    }}
                    disabled={refreshing || isOffline}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshing ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>
                  <Link
                    href={`/dashboard/tasks/${task.$id}/edit`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-700)] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowDelete(true)}
                    className="rounded-xl bg-red-600 p-2.5 text-white"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold capitalize ${priorityStyle}`}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    {task.priority} priority
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold capitalize ${statusStyle}`}
                  >
                    {task.status === "completed" ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    {task.status.replace("-", " ")}
                  </span>
                  {overdue && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Overdue
                    </span>
                  )}
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                    <p className="text-xs uppercase text-gray-400">Due date</p>
                    <p className="mt-2 flex items-center gap-2 font-semibold">
                      <Calendar className="h-4 w-4 text-[var(--accent-700)]" />
                      {new Date(task.dueDate).toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                    <p className="text-xs uppercase text-gray-400">Property</p>
                    <p className="mt-2 flex items-center gap-2 font-semibold">
                      <Building2 className="h-4 w-4 text-[var(--accent-700)]" />
                      {property?.propertyName ||
                        task.propertyName ||
                        "General organization task"}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h2 className="flex items-center gap-2 font-bold">
                    <FileText className="h-5 w-5 text-[var(--accent-700)]" />
                    Description
                  </h2>
                  <p className="mt-3 whitespace-pre-line rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {task.description || "No description was added."}
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {showDelete && (
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
