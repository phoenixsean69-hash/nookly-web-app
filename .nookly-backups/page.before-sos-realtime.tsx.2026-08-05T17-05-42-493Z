"use client";

import {
  Activity,
  Ambulance,
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  HeartPulse,
  LocateFixed,
  MapPin,
  MessageSquareText,
  Phone,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import {
  SosLocationMapModal,
  SosLocationMapPreview,
} from "@/components/sos/sos-location-map";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";

type SosStatus = "new" | "acknowledged" | "dispatched" | "resolved";
type SosSeverity = "critical" | "high" | "medium";
type SosCategory =
  | "Medical emergency"
  | "Personal safety"
  | "Transport incident"
  | "Fire or hazard"
  | "Other emergency";
type SosFilter = "all" | "active" | "response" | "resolved";

interface SosTimelineEvent {
  id: string;
  label: string;
  detail: string;
  time: string;
  complete: boolean;
}

interface SosAlert {
  id: string;
  studentName: string;
  studentId: string;
  programme: string;
  yearOfStudy: string;
  phone: string;
  emergencyContact: string;
  emergencyContactPhone: string;
  avatarInitials: string;
  category: SosCategory;
  severity: SosSeverity;
  status: SosStatus;
  message: string;
  locationName: string;
  locationDetail: string;
  latitude: number;
  longitude: number;
  relativeTime: string;
  createdTime: string;
  locationUpdated: string;
  responder: string;
  timeline: SosTimelineEvent[];
}

const DEMO_ALERTS: SosAlert[] = [
  {
    id: "SOS-2026-0084",
    studentName: "Tariro Moyo",
    studentId: "BUSE/23/1842",
    programme: "BSc Computer Science",
    yearOfStudy: "Part 3",
    phone: "+263 77 245 9081",
    emergencyContact: "Rudo Moyo",
    emergencyContactPhone: "+263 71 882 4063",
    avatarInitials: "TM",
    category: "Medical emergency",
    severity: "critical",
    status: "new",
    message:
      "I am feeling very weak and struggling to breathe. I am near the library entrance and need help urgently.",
    locationName: "FSE Campus",
    locationDetail: "Main Library entrance, eastern walkway",
    latitude: -17.284829,
    longitude: 31.341247,
    relativeTime: "2 min ago",
    createdTime: "Today, 11:46",
    locationUpdated: "Updated 18 seconds ago",
    responder: "Not assigned",
    timeline: [
      {
        id: "timeline-1",
        label: "SOS triggered",
        detail: "Emergency request submitted from the Nookly student app.",
        time: "11:46",
        complete: true,
      },
      {
        id: "timeline-2",
        label: "Location received",
        detail: "The student's last known GPS position was attached.",
        time: "11:46",
        complete: true,
      },
      {
        id: "timeline-3",
        label: "Control room notified",
        detail: "The university organization portal received the alert.",
        time: "11:47",
        complete: true,
      },
      {
        id: "timeline-4",
        label: "Responder dispatched",
        detail: "Waiting for the control room to assign a response team.",
        time: "Pending",
        complete: false,
      },
    ],
  },
  {
    id: "SOS-2026-0083",
    studentName: "Nyasha Dube",
    studentId: "BUSE/24/0917",
    programme: "BSc Environmental Science",
    yearOfStudy: "Part 2",
    phone: "+263 78 614 3302",
    emergencyContact: "Sibusiso Dube",
    emergencyContactPhone: "+263 77 102 7749",
    avatarInitials: "ND",
    category: "Personal safety",
    severity: "high",
    status: "acknowledged",
    message:
      "A person has been following me from the shops. I have moved closer to the Astra Campus security gate.",
    locationName: "Astra Campus",
    locationDetail: "Outside the north security gate",
    latitude: -17.316644,
    longitude: 31.323384,
    relativeTime: "8 min ago",
    createdTime: "Today, 11:40",
    locationUpdated: "Updated 1 minute ago",
    responder: "Campus Security Team 2",
    timeline: [
      {
        id: "timeline-1",
        label: "SOS triggered",
        detail: "Personal-safety alert received from the student.",
        time: "11:40",
        complete: true,
      },
      {
        id: "timeline-2",
        label: "Control room acknowledged",
        detail: "An operator reviewed and acknowledged the alert.",
        time: "11:41",
        complete: true,
      },
      {
        id: "timeline-3",
        label: "Student contacted",
        detail: "The control room confirmed the student's current position.",
        time: "11:42",
        complete: true,
      },
      {
        id: "timeline-4",
        label: "Security assigned",
        detail: "Campus Security Team 2 is responding.",
        time: "11:43",
        complete: true,
      },
    ],
  },
  {
    id: "SOS-2026-0082",
    studentName: "Kudakwashe Ncube",
    studentId: "BUSE/22/1305",
    programme: "BSc Development Studies",
    yearOfStudy: "Part 4",
    phone: "+263 71 390 8821",
    emergencyContact: "Lindiwe Ncube",
    emergencyContactPhone: "+263 78 445 0097",
    avatarInitials: "KN",
    category: "Transport incident",
    severity: "high",
    status: "dispatched",
    message:
      "The shuttle I am travelling in has stopped after a minor collision. One passenger may be injured.",
    locationName: "Bindura Town",
    locationDetail: "A11 road near the Town Campus turn-off",
    latitude: -17.309872,
    longitude: 31.334921,
    relativeTime: "19 min ago",
    createdTime: "Today, 11:29",
    locationUpdated: "Updated 3 minutes ago",
    responder: "University Clinic Vehicle",
    timeline: [
      {
        id: "timeline-1",
        label: "SOS triggered",
        detail: "Transport incident submitted from the student app.",
        time: "11:29",
        complete: true,
      },
      {
        id: "timeline-2",
        label: "Control room acknowledged",
        detail: "Alert confirmed by the university operator.",
        time: "11:30",
        complete: true,
      },
      {
        id: "timeline-3",
        label: "Driver contacted",
        detail: "The shuttle driver confirmed a minor collision.",
        time: "11:32",
        complete: true,
      },
      {
        id: "timeline-4",
        label: "Medical response dispatched",
        detail: "The university clinic vehicle is travelling to the scene.",
        time: "11:34",
        complete: true,
      },
    ],
  },
  {
    id: "SOS-2026-0081",
    studentName: "Ropafadzo Chirwa",
    studentId: "BUSE/25/0418",
    programme: "BEd Mathematics",
    yearOfStudy: "Part 1",
    phone: "+263 77 981 2056",
    emergencyContact: "Memory Chirwa",
    emergencyContactPhone: "+263 71 556 2280",
    avatarInitials: "RC",
    category: "Fire or hazard",
    severity: "medium",
    status: "resolved",
    message:
      "There was smoke coming from an electrical socket in the residence common room. Power has now been switched off.",
    locationName: "Student Residence",
    locationDetail: "Block C common room, first floor",
    latitude: -17.287481,
    longitude: 31.339608,
    relativeTime: "1 hr ago",
    createdTime: "Today, 10:44",
    locationUpdated: "Final position recorded at 10:51",
    responder: "Facilities and Campus Security",
    timeline: [
      {
        id: "timeline-1",
        label: "SOS triggered",
        detail: "Fire or electrical-hazard report received.",
        time: "10:44",
        complete: true,
      },
      {
        id: "timeline-2",
        label: "Security dispatched",
        detail: "Campus security and facilities were notified.",
        time: "10:46",
        complete: true,
      },
      {
        id: "timeline-3",
        label: "Power isolated",
        detail: "Electricity was switched off in the affected room.",
        time: "10:50",
        complete: true,
      },
      {
        id: "timeline-4",
        label: "Alert resolved",
        detail: "The area was made safe and the student was notified.",
        time: "11:02",
        complete: true,
      },
    ],
  },
  {
    id: "SOS-2026-0080",
    studentName: "Blessing Zulu",
    studentId: "BUSE/23/2221",
    programme: "BSc Sports Science",
    yearOfStudy: "Part 3",
    phone: "+263 78 306 1174",
    emergencyContact: "Thandiwe Zulu",
    emergencyContactPhone: "+263 77 604 9135",
    avatarInitials: "BZ",
    category: "Other emergency",
    severity: "medium",
    status: "resolved",
    message:
      "I was locked inside a lecture room after an evening study session. Security has now opened the room.",
    locationName: "Town Campus",
    locationDetail: "Lecture Room T14",
    latitude: -17.311102,
    longitude: 31.334188,
    relativeTime: "3 hrs ago",
    createdTime: "Today, 08:37",
    locationUpdated: "Final position recorded at 08:46",
    responder: "Town Campus Security",
    timeline: [
      {
        id: "timeline-1",
        label: "SOS triggered",
        detail: "Student reported being locked inside a lecture room.",
        time: "08:37",
        complete: true,
      },
      {
        id: "timeline-2",
        label: "Security contacted",
        detail: "Town Campus Security accepted the request.",
        time: "08:39",
        complete: true,
      },
      {
        id: "timeline-3",
        label: "Student reached",
        detail: "Security arrived and opened the lecture room.",
        time: "08:45",
        complete: true,
      },
      {
        id: "timeline-4",
        label: "Alert resolved",
        detail: "The student confirmed that no medical help was needed.",
        time: "08:47",
        complete: true,
      },
    ],
  },
];

const STATUS_META: Record<
  SosStatus,
  { label: string; className: string; dotClassName: string }
> = {
  new: {
    label: "Needs attention",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    dotClassName: "bg-red-500",
  },
  acknowledged: {
    label: "Acknowledged",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
    dotClassName: "bg-blue-500",
  },
  dispatched: {
    label: "Team dispatched",
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300",
    dotClassName: "bg-cyan-500",
  },
  resolved: {
    label: "Resolved",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
    dotClassName: "bg-blue-500",
  },
};

const SEVERITY_META: Record<
  SosSeverity,
  { label: string; className: string; borderClassName: string }
> = {
  critical: {
    label: "Critical",
    className:
      "border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-600",
    borderClassName: "border-l-red-600",
  },
  high: {
    label: "High priority",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
    borderClassName: "border-l-rose-500",
  },
  medium: {
    label: "Medium priority",
    className:
      "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200",
    borderClassName: "border-l-gray-400",
  },
};

const CATEGORY_ICON: Record<SosCategory, LucideIcon> = {
  "Medical emergency": HeartPulse,
  "Personal safety": ShieldAlert,
  "Transport incident": Ambulance,
  "Fire or hazard": Siren,
  "Other emergency": CircleAlert,
};

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

function filterMatchesStatus(filter: SosFilter, status: SosStatus): boolean {
  if (filter === "all") return true;
  if (filter === "active") return status === "new";
  if (filter === "response") {
    return status === "acknowledged" || status === "dispatched";
  }

  return status === "resolved";
}

export default function SosControlCentrePage() {
  const { organization } = useAuth();
  const { resolvedTheme } = useTheme();
  const margin = useDashboardMargin();

  const [alerts, setAlerts] = useState<SosAlert[]>(DEMO_ALERTS);
  const [selectedAlertId, setSelectedAlertId] = useState(DEMO_ALERTS[0].id);
  const [mapAlertId, setMapAlertId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SosFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResponder, setSelectedResponder] = useState(
    "Campus Security Team 1",
  );

  const dark = resolvedTheme === "dark";
  const organizationName = organization?.name || "University";
  const selectedAlert =
    alerts.find((alert) => alert.id === selectedAlertId) || alerts[0];
  const mapAlert = alerts.find((alert) => alert.id === mapAlertId) || null;

  const counts = useMemo(
    () => ({
      new: alerts.filter((alert) => alert.status === "new").length,
      response: alerts.filter(
        (alert) =>
          alert.status === "acknowledged" || alert.status === "dispatched",
      ).length,
      dispatched: alerts.filter((alert) => alert.status === "dispatched").length,
      resolved: alerts.filter((alert) => alert.status === "resolved").length,
    }),
    [alerts],
  );

  const filteredAlerts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return alerts.filter((alert) => {
      if (!filterMatchesStatus(activeFilter, alert.status)) return false;
      if (!normalizedSearch) return true;

      return [
        alert.id,
        alert.studentName,
        alert.studentId,
        alert.category,
        alert.locationName,
        alert.locationDetail,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [activeFilter, alerts, searchTerm]);

  const updateAlert = (
    alertId: string,
    updater: (alert: SosAlert) => SosAlert,
  ) => {
    setAlerts((current) =>
      current.map((alert) => (alert.id === alertId ? updater(alert) : alert)),
    );
  };

  const acknowledgeAlert = () => {
    if (selectedAlert.status !== "new") {
      toast("This demo alert has already been acknowledged.");
      return;
    }

    updateAlert(selectedAlert.id, (alert) => ({
      ...alert,
      status: "acknowledged",
      timeline: [
        ...alert.timeline.filter(
          (event) => event.label !== "Control room acknowledged",
        ),
        {
          id: `acknowledged-${alert.id}`,
          label: "Control room acknowledged",
          detail: "The organization operator acknowledged this SOS call.",
          time: "Just now",
          complete: true,
        },
      ],
    }));

    toast.success("Demo alert acknowledged.");
  };

  const dispatchResponder = () => {
    if (selectedAlert.status === "resolved") {
      toast.error("A resolved demo alert cannot receive a responder.");
      return;
    }

    updateAlert(selectedAlert.id, (alert) => ({
      ...alert,
      status: "dispatched",
      responder: selectedResponder,
      timeline: [
        ...alert.timeline.filter(
          (event) => event.label !== "Responder dispatched",
        ),
        {
          id: `dispatch-${alert.id}`,
          label: "Responder dispatched",
          detail: `${selectedResponder} has been assigned to this emergency.`,
          time: "Just now",
          complete: true,
        },
      ],
    }));

    toast.success(`${selectedResponder} assigned in the demo UI.`);
  };

  const resolveAlert = () => {
    if (selectedAlert.status === "resolved") {
      toast("This demo alert is already resolved.");
      return;
    }

    updateAlert(selectedAlert.id, (alert) => ({
      ...alert,
      status: "resolved",
      timeline: [
        ...alert.timeline.filter((event) => event.label !== "Alert resolved"),
        {
          id: `resolved-${alert.id}`,
          label: "Alert resolved",
          detail:
            "The control room marked the emergency as resolved in the demo UI.",
          time: "Just now",
          complete: true,
        },
      ],
    }));

    toast.success("Demo SOS alert marked as resolved.");
  };

  const demoOnly = () => {
    toast(
      "UI demonstration only. This action will be connected to the backend later.",
    );
  };

  const filterOptions: Array<{
    id: SosFilter;
    label: string;
    count: number;
  }> = [
    { id: "all", label: "All cases", count: alerts.length },
    { id: "active", label: "Needs attention", count: counts.new },
    { id: "response", label: "In response", count: counts.response },
    { id: "resolved", label: "Resolved", count: counts.resolved },
  ];

  if (organization && organization.type_of !== "school") {
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
            <main className="flex min-h-[75vh] items-center justify-center p-5">
              <div className="max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <ShieldAlert className="mx-auto h-12 w-12 text-gray-400" />
                <h1 className="mt-4 text-2xl font-black">
                  SOS Control Centre unavailable
                </h1>
                <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  This emergency-response workspace is currently designed for
                  universities and school organizations.
                </p>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const SelectedCategoryIcon = CATEGORY_ICON[selectedAlert.category];
  const selectedStatus = STATUS_META[selectedAlert.status];
  const selectedSeverity = SEVERITY_META[selectedAlert.severity];

  return (
    <ProtectedRoute>
      <div
        className={`min-h-screen ${
          dark
            ? "bg-gray-950 text-white"
            : "bg-gradient-to-br from-gray-50 via-white to-red-50/25 text-gray-900"
        }`}
      >
        <Sidebar />

        <div className={`${margin} transition-all duration-300`}>
          <Header />

          <main className="p-3 sm:p-5 lg:p-6">
            <div className="mx-auto max-w-[1500px]">
              <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-5 border-b border-gray-200 p-5 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between lg:p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20">
                      <Siren className="h-7 w-7" />
                      {counts.new > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-red-600 dark:border-gray-900" />
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-black sm:text-3xl">
                          SOS Control Centre
                        </h1>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          <Activity className="h-3.5 w-3.5" />
                          Dummy data
                        </span>
                      </div>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                        Review student emergencies, see exactly where each SOS
                        call came from and coordinate the {organizationName}{" "}
                        response.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                      <Radio className="h-4 w-4" />
                      Control room online
                    </div>
                    <button
                      type="button"
                      onClick={demoOnly}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh cases
                    </button>
                  </div>
                </div>

                <div className="grid gap-px bg-gray-200 dark:bg-gray-800 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    icon={BellRing}
                    label="Needs attention"
                    value={counts.new}
                    hint="New SOS calls"
                    tone="critical"
                  />
                  <SummaryCard
                    icon={ShieldCheck}
                    label="In response"
                    value={counts.response}
                    hint="Acknowledged or assigned"
                    tone="default"
                  />
                  <SummaryCard
                    icon={Radio}
                    label="Teams dispatched"
                    value={counts.dispatched}
                    hint="Responders on the way"
                    tone="default"
                  />
                  <SummaryCard
                    icon={CheckCircle2}
                    label="Resolved"
                    value={counts.resolved}
                    hint="Completed demo cases"
                    tone="success"
                  />
                </div>
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
                <aside className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-black">Emergency case queue</h2>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Select a case to review it
                        </p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black dark:bg-gray-800">
                        {filteredAlerts.length}
                      </span>
                    </div>

                    <label className="relative mt-4 block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search student, ID or location…"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-500)]/15 dark:border-gray-700 dark:bg-gray-950"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                          aria-label="Clear SOS search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </label>

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {filterOptions.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setActiveFilter(filter.id)}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                            activeFilter === filter.id
                              ? "border-[var(--accent-700)] bg-[var(--accent-700)] text-white"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                          }`}
                        >
                          {filter.label}
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                              activeFilter === filter.id
                                ? "bg-white/20 text-white"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {filter.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-[900px] space-y-3 overflow-y-auto p-3">
                    {filteredAlerts.length > 0 ? (
                      filteredAlerts.map((alert) => (
                        <SosCaseCard
                          key={alert.id}
                          alert={alert}
                          selected={alert.id === selectedAlert.id}
                          onSelect={() => setSelectedAlertId(alert.id)}
                          onOpenMap={() => {
                            setSelectedAlertId(alert.id);
                            setMapAlertId(alert.id);
                          }}
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                        <SlidersHorizontal className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                        <p className="mt-3 text-sm font-bold">
                          No matching SOS cases
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Change the filter or clear the search field.
                        </p>
                      </div>
                    )}
                  </div>
                </aside>

                <section className="space-y-5">
                  <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div
                      className={`p-5 sm:p-6 ${
                        selectedAlert.severity === "critical"
                          ? "bg-red-50/70 dark:bg-red-950/20"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                              selectedAlert.severity === "critical"
                                ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200"
                            }`}
                          >
                            <SelectedCategoryIcon className="h-7 w-7" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                              Selected emergency case
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <h2 className="text-xl font-black sm:text-2xl">
                                {selectedAlert.category}
                              </h2>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${selectedSeverity.className}`}
                              >
                                {selectedSeverity.label}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${selectedStatus.className}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${selectedStatus.dotClassName}`}
                                />
                                {selectedStatus.label}
                              </span>
                            </div>

                            <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                              {selectedAlert.id} · {selectedAlert.createdTime}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setMapAlertId(selectedAlert.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            <MapPin className="h-4 w-4" />
                            Open location
                          </button>
                          <button
                            type="button"
                            onClick={acknowledgeAlert}
                            disabled={selectedAlert.status !== "new"}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            <Check className="h-4 w-4" />
                            Acknowledge
                          </button>
                          <button
                            type="button"
                            onClick={demoOnly}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-red-700"
                          >
                            <Phone className="h-4 w-4" />
                            Call student
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-gray-200 bg-white/90 p-4 dark:border-gray-800 dark:bg-gray-900/80">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <MessageSquareText className="h-4 w-4" />
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                            Student's SOS message
                          </p>
                        </div>
                        <p className="mt-2 text-sm font-semibold leading-6 text-gray-800 dark:text-gray-100">
                          “{selectedAlert.message}”
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-px border-t border-gray-200 bg-gray-200 dark:border-gray-800 dark:bg-gray-800 sm:grid-cols-2 xl:grid-cols-4">
                      <IncidentMiniCard
                        icon={UserRound}
                        label="Student"
                        value={selectedAlert.studentName}
                        hint={selectedAlert.studentId}
                      />
                      <IncidentMiniCard
                        icon={Building2}
                        label="Academic details"
                        value={selectedAlert.programme}
                        hint={selectedAlert.yearOfStudy}
                      />
                      <IncidentMiniCard
                        icon={MapPin}
                        label="SOS location"
                        value={selectedAlert.locationName}
                        hint={selectedAlert.locationDetail}
                      />
                      <IncidentMiniCard
                        icon={ShieldCheck}
                        label="Assigned responder"
                        value={selectedAlert.responder}
                        hint={selectedAlert.locationUpdated}
                      />
                    </div>
                  </article>

                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                    <div className="space-y-5">
                      <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                          <div>
                            <div className="flex items-center gap-2">
                              <LocateFixed className="h-5 w-5 text-[var(--accent-700)]" />
                              <h3 className="font-black">
                                Exact emergency location
                              </h3>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {selectedAlert.locationName} ·{" "}
                              {selectedAlert.locationDetail}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setMapAlertId(selectedAlert.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-700)] px-4 py-2.5 text-xs font-black text-white transition hover:opacity-90"
                          >
                            <MapPin className="h-4 w-4" />
                            Open full map
                          </button>
                        </div>

                        <SosLocationMapPreview
                          key={selectedAlert.id}
                          latitude={selectedAlert.latitude}
                          longitude={selectedAlert.longitude}
                          title={`${selectedAlert.studentName} SOS`}
                          locationName={selectedAlert.locationName}
                          locationDetail={selectedAlert.locationDetail}
                        />

                        <div className="grid gap-px border-t border-gray-200 bg-gray-200 dark:border-gray-800 dark:bg-gray-800 sm:grid-cols-2">
                          <div className="bg-white p-4 dark:bg-gray-900">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                              Coordinates
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {selectedAlert.latitude},{" "}
                              {selectedAlert.longitude}
                            </p>
                          </div>
                          <div className="bg-white p-4 dark:bg-gray-900">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                              Location freshness
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {selectedAlert.locationUpdated}
                            </p>
                          </div>
                        </div>
                      </article>

                      <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-5 w-5 text-[var(--accent-700)]" />
                          <h3 className="font-black">Emergency timeline</h3>
                        </div>

                        <div className="mt-5 space-y-0">
                          {selectedAlert.timeline.map((event, index) => (
                            <div
                              key={`${selectedAlert.id}-${event.id}-${index}`}
                              className="relative flex gap-4 pb-5 last:pb-0"
                            >
                              {index < selectedAlert.timeline.length - 1 && (
                                <div
                                  className={`absolute left-[15px] top-8 h-[calc(100%-20px)] w-px ${
                                    event.complete
                                      ? "bg-[var(--accent-300)] dark:bg-[var(--accent-800)]"
                                      : "bg-gray-200 dark:bg-gray-700"
                                  }`}
                                />
                              )}
                              <div
                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                                  event.complete
                                    ? "border-[var(--accent-700)] bg-[var(--accent-700)] text-white"
                                    : "border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900"
                                }`}
                              >
                                {event.complete ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Clock3 className="h-3.5 w-3.5" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1 pt-0.5">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm font-black">
                                    {event.label}
                                  </p>
                                  <span className="shrink-0 text-[10px] font-bold text-gray-400">
                                    {event.time}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                  {event.detail}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    </div>

                    <div className="space-y-5">
                      <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-100)] font-black text-[var(--accent-700)] dark:bg-[var(--accent-950)]/50">
                            {selectedAlert.avatarInitials}
                          </div>
                          <div>
                            <h3 className="font-black">Student information</h3>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              Identity and emergency contact
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 space-y-3">
                          <InformationRow
                            icon={UserRound}
                            label="Student"
                            value={selectedAlert.studentName}
                            hint={`${selectedAlert.studentId} · ${selectedAlert.yearOfStudy}`}
                          />
                          <InformationRow
                            icon={Phone}
                            label="Student phone"
                            value={selectedAlert.phone}
                            hint="Primary contact number"
                          />
                          <InformationRow
                            icon={Users}
                            label="Emergency contact"
                            value={selectedAlert.emergencyContact}
                            hint={selectedAlert.emergencyContactPhone}
                          />
                          <InformationRow
                            icon={MessageSquareText}
                            label="Programme"
                            value={selectedAlert.programme}
                            hint={organizationName}
                          />
                        </div>
                      </article>

                      <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-red-600" />
                          <h3 className="font-black">Response controls</h3>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          These controls update only the dummy records displayed
                          on this page.
                        </p>

                        <label className="mt-5 block">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                            Response team
                          </span>
                          <select
                            value={selectedResponder}
                            onChange={(event) =>
                              setSelectedResponder(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-bold outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-500)]/15 dark:border-gray-700 dark:bg-gray-950"
                          >
                            <option>Campus Security Team 1</option>
                            <option>Campus Security Team 2</option>
                            <option>University Clinic Vehicle</option>
                            <option>Student Affairs Officer</option>
                            <option>Facilities Emergency Team</option>
                          </select>
                        </label>

                        <div className="mt-4 grid gap-3">
                          <button
                            type="button"
                            onClick={dispatchResponder}
                            disabled={selectedAlert.status === "resolved"}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-700)] px-4 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Radio className="h-4 w-4" />
                            Dispatch selected team
                          </button>
                          <button
                            type="button"
                            onClick={resolveAlert}
                            disabled={selectedAlert.status === "resolved"}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Mark case as resolved
                          </button>
                        </div>
                      </article>

                      <article className="rounded-3xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-start gap-3">
                          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
                          <div>
                            <h3 className="text-sm font-black">
                              Prototype behaviour
                            </h3>
                            <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                              Refreshing restores the original dummy cases. No
                              SOS, student or response data is saved to Appwrite
                              yet.
                            </p>
                          </div>
                        </div>
                      </article>
                    </div>
                  </div>
                </section>
              </section>
            </div>
          </main>
        </div>

        {mapAlert && (
          <SosLocationMapModal
            isOpen
            onClose={() => setMapAlertId(null)}
            latitude={mapAlert.latitude}
            longitude={mapAlert.longitude}
            title={`${mapAlert.studentName} · ${mapAlert.id}`}
            locationName={mapAlert.locationName}
            locationDetail={mapAlert.locationDetail}
            statusLabel={STATUS_META[mapAlert.status].label}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

interface SosCaseCardProps {
  alert: SosAlert;
  selected: boolean;
  onSelect: () => void;
  onOpenMap: () => void;
}

function SosCaseCard({
  alert,
  selected,
  onSelect,
  onOpenMap,
}: SosCaseCardProps) {
  const CategoryIcon = CATEGORY_ICON[alert.category];
  const status = STATUS_META[alert.status];
  const severity = SEVERITY_META[alert.severity];

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-l-4 transition ${
        severity.borderClassName
      } ${
        selected
          ? "border-[var(--accent-300)] bg-[var(--accent-50)] shadow-sm dark:border-[var(--accent-800)] dark:bg-[var(--accent-950)]/25"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              alert.severity === "critical"
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            <CategoryIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black">{alert.studentName}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                  {alert.studentId}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-bold text-gray-400">
                {alert.relativeTime}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2 py-1 text-[9px] font-bold ${severity.className}`}
              >
                {severity.label}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold ${status.className}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`}
                />
                {status.label}
              </span>
            </div>

            <p className="mt-3 text-xs font-black text-gray-800 dark:text-gray-100">
              {alert.category}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
              {alert.message}
            </p>
          </div>

          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
        </div>
      </button>

      <div className="border-t border-gray-200 bg-white/70 p-3 dark:border-gray-800 dark:bg-gray-900/60">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-700)]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black">{alert.locationName}</p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-gray-500 dark:text-gray-400">
              {alert.locationDetail}
            </p>
            <p className="mt-1 text-[9px] font-semibold text-gray-400">
              {alert.latitude}, {alert.longitude}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMap}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-[10px] font-black transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            Open map
          </button>
        </div>
      </div>
    </article>
  );
}

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint: string;
  tone: "critical" | "success" | "default";
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: SummaryCardProps) {
  return (
    <article className="bg-white p-5 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-gray-400">
            {label}
          </p>
          <p
            className={`mt-2 text-2xl font-black ${
              tone === "critical"
                ? "text-red-600 dark:text-red-400"
                : tone === "success"
                  ? "text-blue-600 dark:text-blue-400"
                  : ""
            }`}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        </div>
        <div
          className={`rounded-xl p-2.5 ${
            tone === "critical"
              ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
              : tone === "success"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

interface IncidentMiniCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}

function IncidentMiniCard({
  icon: Icon,
  label,
  value,
  hint,
}: IncidentMiniCardProps) {
  return (
    <article className="bg-white p-4 dark:bg-gray-900">
      <Icon className="h-4 w-4 text-[var(--accent-700)]" />
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-black">{value}</p>
      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500 dark:text-gray-400">
        {hint}
      </p>
    </article>
  );
}

interface InformationRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}

function InformationRow({
  icon: Icon,
  label,
  value,
  hint,
}: InformationRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3.5 dark:bg-gray-950/60">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--accent-700)] shadow-sm dark:bg-gray-900">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-black">{value}</p>
        <p className="mt-0.5 break-words text-[10px] text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      </div>
    </div>
  );
}
