"use client";

import {
  AlertCircle,
  Bell,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Info,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { RealtimeResponseEvent } from "appwrite";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import client, { databases } from "@/lib/appwrite/config";
import {
  getOrganizationPropertyReferences,
  listOrganizationProperties,
  listOrganizationQueries,
} from "@/lib/appwrite/helpers";
import { notificationService } from "@/lib/notification-service";

type InquiryStatus = "pending" | "in-progress" | "resolved";
type InquiryCategory = "information" | "complaint" | "other";

interface Inquiry {
  $id: string;
  referenceProperty: string;
  propertyName: string;
  writer: string;
  body: string;
  category: InquiryCategory;
  status: InquiryStatus;
  response: string;
  avatar: string;
  snap: string;
  image1: string;
  image2: string;
  image3: string;
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
      const customEvent = event as CustomEvent<{ isCollapsed?: boolean }>;
      setCollapsed(
        customEvent.detail?.isCollapsed ??
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

function normalizeInquiry(
  document: Record<string, unknown>,
  propertyNames: Map<string, string>,
): Inquiry {
  const referenceProperty = String(document.referenceProperty ?? "");
  const propertyName =
    propertyNames.get(referenceProperty) || referenceProperty || "Property";

  return {
    $id: String(document.$id ?? ""),
    referenceProperty,
    propertyName,
    writer: String(document.writer ?? "Nookly user"),
    body: String(document.body ?? ""),
    category:
      document.category === "information" ||
      document.category === "complaint"
        ? document.category
        : "other",
    status:
      document.status === "in-progress" || document.status === "resolved"
        ? document.status
        : "pending",
    response: String(document.response ?? ""),
    avatar: String(document.writerAvatar ?? document.avatar ?? ""),
    snap: String(document.snap ?? ""),
    image1: String(document.image1 ?? ""),
    image2: String(document.image2 ?? ""),
    image3: String(document.image3 ?? ""),
    $createdAt: String(document.$createdAt ?? ""),
    $updatedAt: String(document.$updatedAt ?? ""),
  };
}

export default function MessagesPage() {
  const { organization, isOffline } = useAuth();
  const { resolvedTheme } = useTheme();
  const margin = useDashboardMargin();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImage, setShowImage] = useState<string | null>(null);
  const ownedReferences = useRef<Set<string>>(new Set());

  const selectedInquiry =
    inquiries.find((inquiry) => inquiry.$id === selectedId) ?? null;

  const loadInquiries = useCallback(
    async (showLoader = true) => {
      if (!organization?.userId) {
        setInquiries([]);
        setSelectedId(null);
        setLoading(false);
        return;
      }

      if (showLoader) setLoading(true);

      try {
        const [properties, documents, references] = await Promise.all([
          listOrganizationProperties(organization.userId),
          listOrganizationQueries(organization.userId),
          getOrganizationPropertyReferences(organization.userId),
        ]);

        ownedReferences.current = new Set(references);

        const propertyNames = new Map<string, string>();
        properties.forEach((property) => {
          propertyNames.set(property.$id, property.propertyName);
          propertyNames.set(property.propertyName, property.propertyName);
        });

        const nextInquiries = documents.map((document) =>
          normalizeInquiry(
            document as unknown as Record<string, unknown>,
            propertyNames,
          ),
        );

        setInquiries(nextInquiries);
        setSelectedId((current) => {
          if (current && nextInquiries.some((item) => item.$id === current)) {
            return current;
          }

          return nextInquiries[0]?.$id ?? null;
        });
      } catch (error) {
        console.error("Unable to load inquiries:", error);
        toast.error("Failed to load organization messages.");
      } finally {
        setLoading(false);
      }
    },
    [organization?.userId],
  );

  useEffect(() => {
    void loadInquiries();
  }, [loadInquiries]);

  useEffect(() => {
    if (!organization?.userId) return;

    const unsubscribe = client.subscribe<
      RealtimeResponseEvent<Record<string, unknown>>
    >(
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID}.documents`,
      (event) => {
        const payload = event.payload;
        const reference = String(payload?.referenceProperty ?? "");

        if (!ownedReferences.current.has(reference)) {
          return;
        }

        if (event.events.some((name) => name.includes("documents.create"))) {
          const writer = String(payload.writer ?? "A Nookly user");
          notificationService.sendPropertyRequestNotification(
            writer,
            reference || "your property",
            String(payload.body ?? ""),
            String(payload.$id ?? ""),
          );
        }

        void loadInquiries(false);
        window.dispatchEvent(new CustomEvent("messagesUpdated"));
      },
    );

    return unsubscribe;
  }, [loadInquiries, organization?.userId]);

  useEffect(() => {
    setResponseText(selectedInquiry?.response ?? "");
  }, [selectedInquiry?.$id, selectedInquiry?.response]);

  const filteredInquiries = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return inquiries.filter((inquiry) => {
      const matchesSearch =
        !search ||
        inquiry.writer.toLowerCase().includes(search) ||
        inquiry.body.toLowerCase().includes(search) ||
        inquiry.propertyName.toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "all" || inquiry.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" || inquiry.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, inquiries, searchTerm, statusFilter]);

  const updateStatus = async (
    inquiry: Inquiry,
    status: InquiryStatus,
  ) => {
    setSaving(true);

    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID!,
        inquiry.$id,
        { status },
      );

      await loadInquiries(false);
      window.dispatchEvent(new CustomEvent("messagesUpdated"));
      toast.success(`Message marked ${status.replace("-", " ")}.`);
    } catch (error) {
      console.error("Unable to update inquiry:", error);
      toast.error("Failed to update the message.");
    } finally {
      setSaving(false);
    }
  };

  const sendResponse = async () => {
    if (!selectedInquiry || !responseText.trim()) return;

    setSaving(true);

    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID!,
        selectedInquiry.$id,
        {
          response: responseText.trim(),
          status: "resolved",
          respondedAt: new Date().toISOString(),
        },
      );

      await loadInquiries(false);
      window.dispatchEvent(new CustomEvent("messagesUpdated"));
      toast.success("Response saved.");
    } catch (error) {
      console.error("Unable to save response:", error);
      toast.error("Failed to save the response.");
    } finally {
      setSaving(false);
    }
  };

  const clearResolved = async () => {
    const resolved = inquiries.filter((inquiry) => inquiry.status === "resolved");
    if (resolved.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${resolved.length} resolved message${resolved.length === 1 ? "" : "s"}?`,
    );
    if (!confirmed) return;

    setSaving(true);

    try {
      await Promise.all(
        resolved.map((inquiry) =>
          databases.deleteDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID!,
            inquiry.$id,
          ),
        ),
      );

      await loadInquiries(false);
      window.dispatchEvent(new CustomEvent("messagesUpdated"));
      toast.success("Resolved messages cleared.");
    } catch (error) {
      console.error("Unable to clear resolved messages:", error);
      toast.error("Failed to clear resolved messages.");
    } finally {
      setSaving(false);
    }
  };

  const categoryIcon = (category: InquiryCategory) => {
    if (category === "complaint") return AlertCircle;
    if (category === "information") return Info;
    return MessageCircle;
  };

  const dark = resolvedTheme === "dark";
  const imageUrls = selectedInquiry
    ? [
        selectedInquiry.snap,
        selectedInquiry.image1,
        selectedInquiry.image2,
        selectedInquiry.image3,
      ].filter(Boolean)
    : [];

  return (
    <ProtectedRoute>
      <div
        className={`min-h-screen transition-colors ${
          dark
            ? "bg-gray-950 text-white"
            : "bg-gradient-to-br from-blue-50 via-white to-orange-50 text-gray-900"
        }`}
      >
        <Sidebar />

        <div className={`${margin} transition-all duration-300`}>
          <Header />

          <main className="p-3 sm:p-5 lg:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Messages</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Property inquiries and complaints for this organization only.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadInquiries()}
                  disabled={isOffline || loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void clearResolved()}
                  disabled={saving || !inquiries.some((item) => item.status === "resolved")}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear resolved
                </button>
              </div>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <label className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search messages"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-700)] dark:border-gray-700 dark:bg-gray-900"
                />
              </label>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="all">All categories</option>
                <option value="information">Information</option>
                <option value="complaint">Complaints</option>
                <option value="other">Other</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:grid-cols-[360px_1fr] dark:border-gray-800 dark:bg-gray-900">
              <section className="border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-800">
                <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold dark:border-gray-800">
                  {filteredInquiries.length} conversation
                  {filteredInquiries.length === 1 ? "" : "s"}
                </div>

                <div className="max-h-[620px] overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center text-sm text-gray-500">
                      Loading messages…
                    </div>
                  ) : filteredInquiries.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">
                      No matching messages.
                    </div>
                  ) : (
                    filteredInquiries.map((inquiry) => {
                      const CategoryIcon = categoryIcon(inquiry.category);
                      const active = inquiry.$id === selectedId;

                      return (
                        <button
                          key={inquiry.$id}
                          type="button"
                          onClick={() => setSelectedId(inquiry.$id)}
                          className={`w-full border-b border-gray-100 p-4 text-left transition dark:border-gray-800 ${
                            active
                              ? "bg-blue-50 dark:bg-blue-950/30"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800/70"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              {inquiry.avatar ? (
                                <Image
                                  src={inquiry.avatar}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <CategoryIcon className="h-5 w-5 text-[var(--accent-700)]" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold">
                                  {inquiry.writer}
                                </p>
                                <span className="shrink-0 text-[11px] text-gray-400">
                                  {new Date(inquiry.$createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs font-medium text-[var(--accent-700)]">
                                {inquiry.propertyName}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                                {inquiry.body}
                              </p>
                              <span
                                className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  inquiry.status === "resolved"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                    : inquiry.status === "in-progress"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                                }`}
                              >
                                {inquiry.status.replace("-", " ")}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="min-w-0">
                {!selectedInquiry ? (
                  <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center">
                    <div>
                      <Bell className="mx-auto h-10 w-10 text-gray-300" />
                      <p className="mt-3 text-sm text-gray-500">
                        Select a message to view and respond.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col">
                    <header className="border-b border-gray-200 p-4 dark:border-gray-800">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="font-bold">{selectedInquiry.writer}</h2>
                          <p className="text-sm text-[var(--accent-700)]">
                            {selectedInquiry.propertyName}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void updateStatus(selectedInquiry, "pending")
                            }
                            disabled={saving}
                            className="rounded-lg border border-yellow-200 px-2.5 py-1.5 text-xs font-semibold text-yellow-700 dark:border-yellow-900 dark:text-yellow-300"
                          >
                            <Clock className="mr-1 inline h-3.5 w-3.5" />
                            Pending
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void updateStatus(selectedInquiry, "in-progress")
                            }
                            disabled={saving}
                            className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:text-blue-300"
                          >
                            <Info className="mr-1 inline h-3.5 w-3.5" />
                            In progress
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void updateStatus(selectedInquiry, "resolved")
                            }
                            disabled={saving}
                            className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:text-blue-300"
                          >
                            <CheckCircle className="mr-1 inline h-3.5 w-3.5" />
                            Resolved
                          </button>
                        </div>
                      </div>
                    </header>

                    <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
                      <div className="max-w-3xl rounded-2xl rounded-tl-sm bg-gray-100 p-4 text-sm leading-6 dark:bg-gray-800">
                        {selectedInquiry.body}
                      </div>

                      {imageUrls.length > 0 && (
                        <div>
                          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <ImageIcon className="h-4 w-4" />
                            Attachments
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {imageUrls.map((url) => (
                              <button
                                key={url}
                                type="button"
                                onClick={() => setShowImage(url)}
                                className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                              >
                                <Image
                                  src={url}
                                  alt="Inquiry attachment"
                                  width={110}
                                  height={90}
                                  className="h-20 w-24 object-cover"
                                  unoptimized
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedInquiry.response && (
                        <div className="ml-auto max-w-3xl rounded-2xl rounded-tr-sm bg-blue-600 p-4 text-sm leading-6 text-white">
                          {selectedInquiry.response}
                        </div>
                      )}
                    </div>

                    <footer className="border-t border-gray-200 p-4 dark:border-gray-800">
                      <textarea
                        value={responseText}
                        onChange={(event) => setResponseText(event.target.value)}
                        rows={3}
                        placeholder="Write the organization response…"
                        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-[var(--accent-700)] dark:border-gray-700 dark:bg-gray-950"
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void sendResponse()}
                          disabled={saving || !responseText.trim()}
                          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-700)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          {saving ? "Saving…" : "Save response"}
                        </button>
                      </div>
                    </footer>
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>

      {showImage && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4">
          <button
            type="button"
            onClick={() => setShowImage(null)}
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white"
            aria-label="Close image"
          >
            <X className="h-6 w-6" />
          </button>
          <Image
            src={showImage}
            alt="Inquiry attachment"
            width={1400}
            height={1000}
            className="max-h-[90vh] max-w-[92vw] object-contain"
            unoptimized
          />
        </div>
      )}
    </ProtectedRoute>
  );
}
