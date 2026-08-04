"use client";

import {
  Activity,
  AlertTriangle,
  BellRing,
  CarFront,
  CheckCircle2,
  Clock3,
  Gauge,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  ShieldCheck,
  Signal,
  Siren,
  UserRound,
  Users,
  Wifi,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

type RideStatus = "active" | "boarding" | "delayed";
type RideHealth = "normal" | "attention";

interface DemoRide {
  id: string;
  status: RideStatus;
  health: RideHealth;
  driver: {
    name: string;
    phone: string;
    avatar?: string;
  };
  student: {
    name: string;
    studentNumber: string;
    phone: string;
  };
  vehicle: {
    name: string;
    registration: string;
    color: string;
  };
  pickup: string;
  destination: string;
  passengerCount: number;
  speedKph: number;
  progress: number;
  lastUpdated: string;
  estimatedArrival: string;
  routeMessage: string;
  gpsMessage: string;
  warning?: string;
  mapVariant: 1 | 2 | 3;
}

const DEMO_RIDES: DemoRide[] = [
  {
    id: "ride-preview-001",
    status: "active",
    health: "normal",
    driver: {
      name: "Tinashe Moyo",
      phone: "+263 77 412 8890",
    },
    student: {
      name: "Ruvimbo Ncube",
      studentNumber: "B223041B",
      phone: "+263 78 209 4481",
    },
    vehicle: {
      name: "Toyota Aqua",
      registration: "AEK 4123",
      color: "Silver",
    },
    pickup: "B.U.S.E Town Campus",
    destination: "Chiwaridzo",
    passengerCount: 1,
    speedKph: 42,
    progress: 68,
    lastUpdated: "8 seconds ago",
    estimatedArrival: "8:36 PM",
    routeMessage: "Driver is following the expected route.",
    gpsMessage: "Location is updating normally.",
    mapVariant: 1,
  },
  {
    id: "ride-preview-002",
    status: "delayed",
    health: "attention",
    driver: {
      name: "Farai Dube",
      phone: "+263 71 630 2774",
    },
    student: {
      name: "Anesu Chikowore",
      studentNumber: "B221958A",
      phone: "+263 77 506 4410",
    },
    vehicle: {
      name: "Honda Fit",
      registration: "AFD 9912",
      color: "Blue",
    },
    pickup: "B.U.S.E FSE Campus",
    destination: "Aerodrome",
    passengerCount: 2,
    speedKph: 18,
    progress: 44,
    lastUpdated: "1 minute ago",
    estimatedArrival: "8:49 PM",
    routeMessage: "Driver is about 430 metres away from the expected route.",
    gpsMessage: "Location is still available, but updates are slower than normal.",
    warning: "Route needs attention",
    mapVariant: 2,
  },
  {
    id: "ride-preview-003",
    status: "boarding",
    health: "normal",
    driver: {
      name: "Blessing Zhou",
      phone: "+263 78 314 7260",
    },
    student: {
      name: "Tatenda Mashingaidze",
      studentNumber: "B224110C",
      phone: "+263 71 992 1063",
    },
    vehicle: {
      name: "Nissan Note",
      registration: "AFL 2058",
      color: "White",
    },
    pickup: "B.U.S.E Astra Campus",
    destination: "Bindura CBD",
    passengerCount: 1,
    speedKph: 0,
    progress: 8,
    lastUpdated: "12 seconds ago",
    estimatedArrival: "9:04 PM",
    routeMessage: "Vehicle is still at the pickup point.",
    gpsMessage: "Location is updating normally.",
    mapVariant: 3,
  },
];

const statusStyles: Record<RideStatus, string> = {
  active:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-[var(--accent-800)] dark:bg-blue-950/30 dark:text-blue-300",
  boarding:
    "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200",
  delayed:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300",
};

function readableStatus(status: RideStatus): string {
  if (status === "active") return "On the way";
  if (status === "boarding") return "Picking up student";
  return "Delayed";
}

export function InspectRidesPanel() {
  const [selectedRideId, setSelectedRideId] = useState(DEMO_RIDES[0].id);
  const [filter, setFilter] = useState<"all" | "attention" | "normal">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [lastRefresh, setLastRefresh] = useState("just now");

  const filteredRides = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return DEMO_RIDES.filter((ride) => {
      if (filter !== "all" && ride.health !== filter) return false;

      if (!query) return true;

      return [
        ride.driver.name,
        ride.student.name,
        ride.student.studentNumber,
        ride.vehicle.name,
        ride.vehicle.registration,
        ride.pickup,
        ride.destination,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [filter, searchTerm]);

  const selectedRide =
    DEMO_RIDES.find((ride) => ride.id === selectedRideId) ?? DEMO_RIDES[0];

  const attentionCount = DEMO_RIDES.filter(
    (ride) => ride.health === "attention",
  ).length;
  const studentsOnBoard = DEMO_RIDES.reduce(
    (total, ride) => total + ride.passengerCount,
    0,
  );

  const refreshPreview = () => {
    setLastRefresh("just now");
    toast.success("Ride inspection preview refreshed.");
  };

  const previewAction = (message: string) => {
    toast(message, {
      icon: "ℹ️",
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold">Inspect Rides interface preview</h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  UI only
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                This screen demonstrates how B.U.S.E staff will inspect active
                student rides. The cards currently use preview data and do not
                read or change live ride records.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshPreview}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh preview
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InspectionSummaryCard
          icon={Navigation}
          label="Rides being watched"
          value={DEMO_RIDES.length}
          detail="Boarding, active or delayed"
        />
        <InspectionSummaryCard
          icon={ShieldAlert}
          label="Needs attention"
          value={attentionCount}
          detail="Route or safety warning"
          warning={attentionCount > 0}
        />
        <InspectionSummaryCard
          icon={Users}
          label="Students in rides"
          value={studentsOnBoard}
          detail="Confirmed B.U.S.E passengers"
        />
        <InspectionSummaryCard
          icon={Signal}
          label="Monitoring status"
          value="Online"
          detail={`Preview refreshed ${lastRefresh}`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 p-4 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Current student rides</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select a ride to inspect its journey and safety checks.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {filteredRides.length}
              </span>
            </div>

            <label className="relative mt-4 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search driver, student or vehicle"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: "all", label: "All rides" },
                { id: "attention", label: "Needs attention" },
                { id: "normal", label: "Normal" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setFilter(item.id as "all" | "attention" | "normal")
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    filter === item.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[760px] space-y-3 overflow-y-auto p-3">
            {filteredRides.map((ride) => {
              const selected = selectedRideId === ride.id;

              return (
                <button
                  key={ride.id}
                  type="button"
                  onClick={() => setSelectedRideId(ride.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-blue-600 bg-blue-50 shadow-sm dark:bg-blue-950/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-950/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                        <CarFront className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{ride.driver.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {ride.vehicle.name} · {ride.vehicle.registration}
                        </p>
                      </div>
                    </div>

                    {ride.health === "attention" ? (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{ride.pickup}</span>
                    <span>→</span>
                    <span className="truncate">{ride.destination}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[ride.status]}`}
                    >
                      {readableStatus(ride.status)}
                    </span>

                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      Updated {ride.lastUpdated}
                    </span>
                  </div>

                  {ride.warning && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                      {ride.warning}
                    </div>
                  )}
                </button>
              );
            })}

            {filteredRides.length === 0 && (
              <div className="py-12 text-center">
                <Search className="mx-auto h-7 w-7 text-gray-300" />
                <p className="mt-3 text-sm font-semibold">No matching rides</p>
                <p className="mt-1 text-xs text-gray-500">
                  Change the search or monitoring filter.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 p-4 dark:border-gray-800">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">
                      {selectedRide.driver.name}
                    </h2>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[selectedRide.status]}`}
                    >
                      {readableStatus(selectedRide.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedRide.student.name} ·{" "}
                    {selectedRide.student.studentNumber}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      previewAction(
                        "Driver calling will be connected when live ride services are added.",
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <Phone className="h-4 w-4" />
                    Call driver
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      previewAction(
                        "Student messaging will be connected when live ride services are added.",
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contact student
                  </button>
                </div>
              </div>
            </div>

            <RouteMapPreview ride={selectedRide} />

            <div className="grid gap-3 border-t border-gray-100 p-4 sm:grid-cols-2 xl:grid-cols-4 dark:border-gray-800">
              <MetricBox
                icon={Gauge}
                label="Current speed"
                value={`${selectedRide.speedKph} km/h`}
              />
              <MetricBox
                icon={Clock3}
                label="Expected arrival"
                value={selectedRide.estimatedArrival}
              />
              <MetricBox
                icon={Route}
                label="Journey progress"
                value={`${selectedRide.progress}%`}
              />
              <MetricBox
                icon={Wifi}
                label="Last location"
                value={selectedRide.lastUpdated}
              />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">Journey information</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Clear details about who is travelling and where they are
                    going.
                  </p>
                </div>
                <UserRound className="h-5 w-5 text-blue-600" />
              </div>

              <div className="mt-4 space-y-3">
                <ReadableDetail
                  label="B.U.S.E student"
                  value={`${selectedRide.student.name} (${selectedRide.student.studentNumber})`}
                />
                <ReadableDetail
                  label="Driver"
                  value={`${selectedRide.driver.name} · ${selectedRide.driver.phone}`}
                />
                <ReadableDetail
                  label="Vehicle"
                  value={`${selectedRide.vehicle.color} ${selectedRide.vehicle.name} · ${selectedRide.vehicle.registration}`}
                />
                <ReadableDetail
                  label="Journey"
                  value={`${selectedRide.pickup} to ${selectedRide.destination}`}
                />
                <ReadableDetail
                  label="Passengers"
                  value={`${selectedRide.passengerCount} confirmed ${
                    selectedRide.passengerCount === 1
                      ? "B.U.S.E student"
                      : "B.U.S.E students"
                  }`}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">Safety monitoring</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Human-readable checks for staff supervising the journey.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>

              <div className="mt-4 space-y-3">
                <SafetyCheck
                  good
                  title="Student booking confirmed"
                  detail={`${selectedRide.student.name} is linked to this ride.`}
                />
                <SafetyCheck
                  good={selectedRide.health === "normal"}
                  title="Expected route"
                  detail={selectedRide.routeMessage}
                />
                <SafetyCheck
                  good={selectedRide.health === "normal"}
                  title="Location signal"
                  detail={selectedRide.gpsMessage}
                />
                <SafetyCheck
                  good={selectedRide.speedKph <= 80}
                  title="Vehicle speed"
                  detail={
                    selectedRide.speedKph <= 80
                      ? `The vehicle is moving at ${selectedRide.speedKph} km/h, which is within the monitoring limit.`
                      : `The vehicle is moving at ${selectedRide.speedKph} km/h and needs attention.`
                  }
                />
                <SafetyCheck
                  good
                  title="Incident reports"
                  detail="No emergency or safety incident has been reported."
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300">
                  <Siren className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">Safety actions</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Actions staff can use when a ride needs intervention.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    previewAction(
                      "Incident reporting will be connected to live ride records later.",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <BellRing className="h-4 w-4" />
                  Record concern
                </button>

                <button
                  type="button"
                  onClick={() =>
                    previewAction(
                      "Security notification will be connected after the UI is approved.",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Alert security
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function RouteMapPreview({ ride }: { ride: DemoRide }) {
  const variants = {
    1: {
      route: "55,300 125,255 205,270 280,210 365,225 450,160 535,178 625,115",
      travelled: "55,300 125,255 205,270 280,210 365,225 450,160",
      driver: { cx: 450, cy: 160 },
      pickup: { cx: 55, cy: 300 },
      destination: { cx: 625, cy: 115 },
    },
    2: {
      route: "60,115 145,160 225,145 305,210 390,188 475,250 625,275",
      travelled: "60,115 145,160 225,145 305,210",
      driver: { cx: 345, cy: 265 },
      pickup: { cx: 60, cy: 115 },
      destination: { cx: 625, cy: 275 },
    },
    3: {
      route: "75,260 160,225 245,245 330,190 420,205 520,145 620,165",
      travelled: "75,260",
      driver: { cx: 82, cy: 252 },
      pickup: { cx: 75, cy: 260 },
      destination: { cx: 620, cy: 165 },
    },
  } as const;

  const map = variants[ride.mapVariant];

  return (
    <div className="relative h-[390px] overflow-hidden bg-gray-100 dark:bg-gray-950">
      <svg
        viewBox="0 0 700 390"
        className="h-full w-full"
        role="img"
        aria-label={`Preview map from ${ride.pickup} to ${ride.destination}`}
      >
        <defs>
          <pattern
            id={`small-grid-${ride.id}`}
            width="34"
            height="34"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 34 0 L 0 0 0 34"
              fill="none"
              className="stroke-gray-200 dark:stroke-gray-800"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect
          width="700"
          height="390"
          fill={`url(#small-grid-${ride.id})`}
        />

        <path
          d="M0 80 C130 120 215 45 350 90 S560 100 700 55"
          fill="none"
          className="stroke-white dark:stroke-gray-800"
          strokeWidth="22"
        />
        <path
          d="M60 390 C150 280 205 315 285 215 S470 105 700 145"
          fill="none"
          className="stroke-white dark:stroke-gray-800"
          strokeWidth="18"
        />
        <path
          d="M175 0 C220 85 205 160 250 390"
          fill="none"
          className="stroke-white dark:stroke-gray-800"
          strokeWidth="14"
        />
        <path
          d="M505 0 C465 85 520 195 470 390"
          fill="none"
          className="stroke-white dark:stroke-gray-800"
          strokeWidth="16"
        />

        <polyline
          points={map.route}
          fill="none"
          className="stroke-gray-400 dark:stroke-gray-600"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="10 11"
        />
        <polyline
          points={map.travelled}
          fill="none"
          className="stroke-blue-600"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {ride.health === "attention" && (
          <line
            x1="305"
            y1="210"
            x2={map.driver.cx}
            y2={map.driver.cy}
            className="stroke-red-500"
            strokeWidth="4"
            strokeDasharray="7 7"
          />
        )}

        <circle
          cx={map.pickup.cx}
          cy={map.pickup.cy}
          r="13"
          className="fill-white stroke-blue-600 dark:fill-gray-900"
          strokeWidth="6"
        />
        <circle
          cx={map.destination.cx}
          cy={map.destination.cy}
          r="13"
          className="fill-white stroke-gray-700 dark:fill-gray-900 dark:stroke-gray-200"
          strokeWidth="6"
        />

        <circle
          cx={map.driver.cx}
          cy={map.driver.cy}
          r="24"
          className={
            ride.health === "attention"
              ? "fill-red-500/20"
              : "fill-blue-600/20"
          }
        />
        <circle
          cx={map.driver.cx}
          cy={map.driver.cy}
          r="13"
          className={
            ride.health === "attention"
              ? "fill-red-600 stroke-white"
              : "fill-blue-600 stroke-white"
          }
          strokeWidth="4"
        />

        <text
          x={map.pickup.cx + 18}
          y={map.pickup.cy + 4}
          className="fill-gray-600 text-[12px] font-bold dark:fill-gray-300"
        >
          Pickup
        </text>
        <text
          x={map.destination.cx - 82}
          y={map.destination.cy - 20}
          className="fill-gray-600 text-[12px] font-bold dark:fill-gray-300"
        >
          Destination
        </text>
        <text
          x={map.driver.cx + 20}
          y={map.driver.cy + 4}
          className="fill-gray-900 text-[12px] font-black dark:fill-white"
        >
          Driver
        </text>
      </svg>

      <div className="absolute left-4 top-4 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-xs font-bold">Journey map preview</p>
            <p className="text-[10px] text-gray-500">
              Expected route and travelled path
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {ride.pickup} → {ride.destination}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {ride.routeMessage}
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-gray-500">
            {ride.progress}% complete
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${ride.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface InspectionSummaryCardProps {
  icon: typeof Navigation;
  label: string;
  value: number | string;
  detail: string;
  warning?: boolean;
}

function InspectionSummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  warning = false,
}: InspectionSummaryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          warning
            ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300"
            : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detail}</p>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/60">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <Icon className="h-4 w-4 text-blue-600" />
        {label}
      </div>
      <p className="mt-2 text-sm font-bold">{value}</p>
    </div>
  );
}

function ReadableDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/60">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}

function SafetyCheck({
  good,
  title,
  detail,
}: {
  good: boolean;
  title: string;
  detail: string;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        good
          ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/60"
          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
      }`}
    >
      <div className="flex items-start gap-3">
        {good ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-300" />
        )}
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}
