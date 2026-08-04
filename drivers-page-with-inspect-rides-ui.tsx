"use client";

import {
  BadgeCheck,
  CarFront,
  CheckCircle,
  Clock3,
  Eye,
  FileWarning,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import toast from "react-hot-toast";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { InspectRidesPanel } from "@/components/drivers/inspect-rides-panel";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import {
  isDriverApplicationApproved,
  isDriverApplicationSuspended,
  listDriverReviewApplications,
} from "@/lib/driver-review.service";
import type {
  DriverReviewApplication,
  DriverReviewTab,
} from "@/types/driver-review";

type DriverScreenSection = "applications" | "inspect";

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

function formatDate(value?: string): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getApplicationDate(
  application: DriverReviewApplication,
): string | undefined {
  return (
    application.profile.documentsSubmittedAt ||
    application.institution.createdAt ||
    application.institution.$createdAt ||
    application.profile.createdAt ||
    application.profile.$createdAt
  );
}

function getStatus(application: DriverReviewApplication) {
  if (isDriverApplicationSuspended(application)) {
    return {
      label: "Suspended",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300",
      icon: FileWarning,
    };
  }

  if (isDriverApplicationApproved(application)) {
    return {
      label: "Approved",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      icon: BadgeCheck,
    };
  }

  if (
    application.profile.verificationStatus === "rejected" ||
    application.institution.status === "rejected"
  ) {
    return {
      label: "Rejected",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300",
      icon: FileWarning,
    };
  }

  return {
    label: application.requirements.readyForApproval
      ? "Ready for review"
      : "Incomplete",
    className: application.requirements.readyForApproval
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      : "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
    icon: application.requirements.readyForApproval ? Clock3 : FileWarning,
  };
}

export default function DriverApplicationsPage() {
  const { organization, isOffline } = useAuth();
  const { resolvedTheme } = useTheme();
  const margin = useDashboardMargin();

  const [screenSection, setScreenSection] =
    useState<DriverScreenSection>("applications");
  const [applications, setApplications] = useState<DriverReviewApplication[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<DriverReviewTab>("pending");
  const [searchTerm, setSearchTerm] = useState("");

  const dark = resolvedTheme === "dark";

  const loadApplications = useCallback(
    async (showToast = false) => {
      if (!organization) return;

      if (!navigator.onLine) {
        setLoading(false);
        setRefreshing(false);
        toast.error("Driver applications require an internet connection.");
        return;
      }

      try {
        const result = await listDriverReviewApplications();
        setApplications(result);

        if (showToast) {
          toast.success("Driver applications refreshed.");
        }
      } catch (error) {
        console.error("Unable to load driver applications:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load driver applications.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [organization],
  );

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const counts = useMemo(() => {
    const approved = applications.filter(isDriverApplicationApproved).length;
    const pending = applications.filter(
      (application) =>
        !isDriverApplicationApproved(application) &&
        application.profile.verificationStatus !== "rejected" &&
        application.institution.status !== "rejected" &&
        !isDriverApplicationSuspended(application),
    ).length;

    return {
      pending,
      approved,
      all: applications.length,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return applications.filter((application) => {
      const approved = isDriverApplicationApproved(application);
      const rejected =
        application.profile.verificationStatus === "rejected" ||
        application.institution.status === "rejected";
      const suspended = isDriverApplicationSuspended(application);

      const tabMatches =
        activeTab === "all" ||
        (activeTab === "approved" && approved) ||
        (activeTab === "pending" && !approved && !rejected && !suspended);

      if (!tabMatches) return false;
      if (!normalizedSearch) return true;

      const vehicle = application.primaryVehicle;
      const haystack = [
        application.profile.name,
        application.profile.email,
        application.profile.phone,
        vehicle?.registrationNumber,
        vehicle?.make,
        vehicle?.model,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [activeTab, applications, searchTerm]);

  const tabs: Array<{
    id: DriverReviewTab;
    label: string;
    count: number;
  }> = [
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "approved", label: "Approved", count: counts.approved },
    { id: "all", label: "All", count: counts.all },
  ];

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
            <div className="mx-auto max-w-7xl">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-500)] text-white shadow-sm">
                  {screenSection === "applications" ? (
                    <CarFront className="h-6 w-6" />
                  ) : (
                    <MapPin className="h-6 w-6" />
                  )}
                </div>

                <div>
                  <h1 className="text-2xl font-bold sm:text-3xl">Drivers</h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Review driver applications and supervise B.U.S.E student
                    journeys.
                  </p>
                </div>
              </div>

              <section className="mb-6 inline-flex w-full flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={() => setScreenSection("applications")}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
                    screenSection === "applications"
                      ? "bg-[var(--accent-500)] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <CarFront className="h-4 w-4" />
                  Driver applications
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      screenSection === "applications"
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {counts.all}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setScreenSection("inspect")}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
                    screenSection === "inspect"
                      ? "bg-[var(--accent-500)] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  Inspect rides
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      screenSection === "inspect"
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    Preview
                  </span>
                </button>
              </section>

              {screenSection === "inspect" ? (
                <InspectRidesPanel />
              ) : (
                <ApplicationsSection
                  organizationName={
                    organization?.name || "your organization"
                  }
                  isOffline={isOffline}
                  applications={applications}
                  loading={loading}
                  refreshing={refreshing}
                  activeTab={activeTab}
                  searchTerm={searchTerm}
                  tabs={tabs}
                  counts={counts}
                  filteredApplications={filteredApplications}
                  setActiveTab={setActiveTab}
                  setSearchTerm={setSearchTerm}
                  refresh={() => {
                    setRefreshing(true);
                    void loadApplications(true);
                  }}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

interface ApplicationsSectionProps {
  organizationName: string;
  isOffline: boolean;
  applications: DriverReviewApplication[];
  loading: boolean;
  refreshing: boolean;
  activeTab: DriverReviewTab;
  searchTerm: string;
  tabs: Array<{
    id: DriverReviewTab;
    label: string;
    count: number;
  }>;
  counts: {
    pending: number;
    approved: number;
    all: number;
  };
  filteredApplications: DriverReviewApplication[];
  setActiveTab: (tab: DriverReviewTab) => void;
  setSearchTerm: (value: string) => void;
  refresh: () => void;
}

function ApplicationsSection({
  organizationName,
  isOffline,
  applications,
  loading,
  refreshing,
  activeTab,
  searchTerm,
  tabs,
  counts,
  filteredApplications,
  setActiveTab,
  setSearchTerm,
  refresh,
}: ApplicationsSectionProps) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">
            Driver applications
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review drivers applying to {organizationName}.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={refreshing || isOffline}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 lg:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <section className="mb-5 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Clock3}
          label="Pending review"
          value={counts.pending}
          tone="amber"
        />
        <SummaryCard
          icon={CheckCircle}
          label="Approved drivers"
          value={counts.approved}
          tone="blue"
        />
        <SummaryCard
          icon={Users}
          label="Total applications"
          value={counts.all}
          tone="blue"
        />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[var(--accent-500)] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-300"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <label className="relative block w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search driver or vehicle"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-500)]/15 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent-500)] dark:border-gray-700" />
              <p className="mt-4 text-sm text-gray-500">
                Loading driver applications…
              </p>
            </div>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex min-h-80 items-center justify-center p-8 text-center">
            <div className="max-w-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <UserRound className="h-7 w-7 text-gray-400" />
              </div>
              <h2 className="mt-4 text-lg font-bold">
                {applications.length === 0
                  ? "No applications available"
                  : "No applications found"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {applications.length === 0
                  ? "Applications submitted to your organization will appear here."
                  : "Change the search term or selected application status."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 p-4 xl:grid-cols-2">
            {filteredApplications.map((application) => {
              const status = getStatus(application);
              const StatusIcon = status.icon;
              const vehicle = application.primaryVehicle;

              return (
                <article
                  key={application.profile.$id}
                  className="rounded-2xl border border-gray-200 p-4 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:hover:border-gray-700"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
                      {application.profile.avatar ? (
                        <Image
                          src={application.profile.avatar}
                          alt={application.profile.name}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <UserRound className="h-7 w-7 text-gray-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-bold">
                            {application.profile.name}
                          </h2>
                          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                            {application.profile.email ||
                              application.profile.phone ||
                              "No contact information"}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <InfoBox
                          icon={CarFront}
                          label="Vehicle"
                          value={
                            vehicle
                              ? `${vehicle.make} ${vehicle.model}`
                              : "No vehicle submitted"
                          }
                        />
                        <InfoBox
                          icon={ShieldCheck}
                          label="Registration"
                          value={vehicle?.registrationNumber || "Not provided"}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Submitted{" "}
                          {formatDate(getApplicationDate(application))}
                        </p>

                        <Link
                          href={`/dashboard/drivers/${application.profile.$id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                        >
                          <Eye className="h-4 w-4" />
                          Review application
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

interface SummaryCardProps {
  icon: typeof Clock3;
  label: string;
  value: number;
  tone: "amber" | "blue";
}

function SummaryCard({ icon: Icon, label, value, tone }: SummaryCardProps) {
  const styles = {
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
    blue:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
  }[tone];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${styles}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

interface InfoBoxProps {
  icon: typeof CarFront;
  label: string;
  value: string;
}

function InfoBox({ icon: Icon, label, value }: InfoBoxProps) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/60">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
