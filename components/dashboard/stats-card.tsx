"use client";

import { useId, useMemo } from "react";
import type { ReactNode } from "react";


interface StatsProperty {
  $id?: string;
  propertyName?: string;
  name?: string;
  views?: number;
  likes?: number;
  requests?: number;
  revenue?: number;
  status?: string;
  responseRate?: number;
  isAvailable?: boolean;
  totalSlots?: number;
  occupiedSlots?: number;
  availableSlots?: number;
}

interface StatsCardProps {
  title: string;
  value: number | string;
  color: string;
  icon?: ReactNode;
  properties?: StatsProperty[];
  statId?: string;
  description?: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
  actions?: ReactNode;
}


type CardTone = "blue" | "purple" | "orange" | "cyan";
type BadgeTone = "success" | "warning" | "danger" | "neutral";

interface ToneStyle {
  title: string;
  accentText: string;
  progress: string;
  progressTrack: string;
  glow: string;
  artPrimary: string;
  artSecondary: string;
  artTertiary: string;
}

const toneStyles: Record<CardTone, ToneStyle> = {
  blue: {
    title: "text-blue-700 dark:text-blue-300",
    accentText: "text-blue-700 dark:text-blue-300",
    progress: "bg-blue-600 dark:bg-blue-400",
    progressTrack: "bg-blue-100/90 dark:bg-blue-950/80",
    glow: "bg-blue-500/12 dark:bg-blue-500/18",
    artPrimary: "text-blue-500/85 dark:text-blue-400/85",
    artSecondary: "text-sky-400/60 dark:text-sky-300/60",
    artTertiary: "text-indigo-400/45 dark:text-indigo-300/45",
  },
  purple: {
    title: "text-violet-700 dark:text-violet-300",
    accentText: "text-violet-700 dark:text-violet-300",
    progress: "bg-violet-600 dark:bg-violet-400",
    progressTrack: "bg-violet-100/90 dark:bg-violet-950/80",
    glow: "bg-violet-500/12 dark:bg-violet-500/18",
    artPrimary: "text-violet-500/85 dark:text-violet-400/85",
    artSecondary: "text-fuchsia-400/60 dark:text-fuchsia-300/60",
    artTertiary: "text-blue-400/45 dark:text-blue-300/45",
  },
  orange: {
    title: "text-orange-700 dark:text-orange-300",
    accentText: "text-orange-700 dark:text-orange-300",
    progress: "bg-orange-500 dark:bg-orange-400",
    progressTrack: "bg-orange-100/90 dark:bg-orange-950/80",
    glow: "bg-orange-500/12 dark:bg-orange-500/18",
    artPrimary: "text-orange-500/85 dark:text-orange-400/85",
    artSecondary: "text-amber-400/60 dark:text-amber-300/60",
    artTertiary: "text-red-400/45 dark:text-red-300/45",
  },
  cyan: {
    title: "text-cyan-700 dark:text-cyan-300",
    accentText: "text-cyan-700 dark:text-cyan-300",
    progress: "bg-cyan-600 dark:bg-cyan-400",
    progressTrack: "bg-cyan-100/90 dark:bg-cyan-950/80",
    glow: "bg-cyan-500/12 dark:bg-cyan-500/18",
    artPrimary: "text-cyan-500/85 dark:text-cyan-400/85",
    artSecondary: "text-sky-400/60 dark:text-sky-300/60",
    artTertiary: "text-blue-400/45 dark:text-blue-300/45",
  },
};

const badgeStyles: Record<BadgeTone, string> = {
  success:
    "border-blue-200/80 bg-blue-50/85 text-blue-700 dark:border-blue-700/50 dark:bg-blue-500/10 dark:text-blue-300",
  warning:
    "border-amber-200/80 bg-amber-50/85 text-amber-700 dark:border-amber-700/50 dark:bg-amber-500/10 dark:text-amber-300",
  danger:
    "border-red-200/80 bg-red-50/85 text-red-700 dark:border-red-700/50 dark:bg-red-500/10 dark:text-red-300",
  neutral:
    "border-slate-200 bg-slate-100/85 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300",
};

function toNumber(value: number | string): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function toNonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function getPropertySlots(property: StatsProperty) {
  const legacyCapacity = Math.max(
    1,
    toNonNegativeInteger(property.totalSlots, 1),
  );
  const total = Math.max(
    1,
    toNonNegativeInteger(property.totalSlots, legacyCapacity),
  );

  let occupied: number;

  if (property.occupiedSlots !== undefined && property.occupiedSlots !== null) {
    occupied = Math.min(
      total,
      toNonNegativeInteger(property.occupiedSlots),
    );
  } else if (
    property.availableSlots !== undefined &&
    property.availableSlots !== null
  ) {
    occupied = total - Math.min(
      total,
      toNonNegativeInteger(property.availableSlots),
    );
  } else {
    occupied = property.isAvailable === false ? total : 0;
  }

  return {
    total,
    occupied,
    available: Math.max(0, total - occupied),
  };
}

function getTone(statId?: string, fallbackColor?: string): CardTone {
  switch (statId) {
    case "occupiedListings":
    case "totalViews":
      return "purple";
    case "occupancyRate":
      return "orange";
    case "responseRate":
      return "cyan";
    case "totalProperties":
      return "blue";
    default:
      if (fallbackColor === "purple" || fallbackColor === "violet") {
        return "purple";
      }
      if (fallbackColor === "orange" || fallbackColor === "yellow") {
        return "orange";
      }
      if (fallbackColor === "cyan" || fallbackColor === "teal") {
        return "cyan";
      }
      return "blue";
  }
}

function getResponseBadge(rate: number): {
  label: string;
  tone: BadgeTone;
} {
  if (rate >= 80) return { label: "Excellent", tone: "success" };
  if (rate >= 70) return { label: "Good", tone: "success" };
  if (rate >= 50) return { label: "Moderate", tone: "warning" };
  if (rate > 0) return { label: "Low", tone: "danger" };
  return { label: "No responses yet", tone: "neutral" };
}

function CardArtwork({
  statId,
  styles,
}: {
  statId?: string;
  styles: ToneStyle;
}) {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientPrimary = `nookly-primary-${id}`;
  const gradientSoft = `nookly-soft-${id}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className={`absolute -right-12 bottom-8 h-40 w-40 rounded-full blur-3xl ${styles.glow}`}
      />
      <div
        className={`absolute right-16 top-16 h-24 w-24 rounded-full blur-3xl ${styles.glow} opacity-60`}
      />

      {statId === "totalProperties" && (
        <svg
          viewBox="0 0 420 220"
          className="absolute inset-x-0 bottom-0 h-[70%] w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientPrimary} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.04" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.22" />
            </linearGradient>
          </defs>

          <g className={styles.artTertiary}>
            <path d="M0 180C52 165 99 201 153 186c51-14 92-72 152-72 50 0 77 26 115 36V220H0Z" fill="currentColor" />
          </g>

<g className={styles.artPrimary}>
  <path d="M240 186V86l34-24 29 21 26-19 35 25v97H240Z" fill={`url(#${gradientPrimary})`} />
  <path d="M274 186v-62h19v62h-19Zm35 0v-52h17v52h-17Zm-51 0v-42h11v42h-11Zm76 0v-72h13v72h-13Z" fill="currentColor" opacity="0.32" />
</g>

<g className={styles.artSecondary}>
  <path d="M20 174c61 12 96-18 145-10 45 8 89 40 143 30 37-7 71-29 112-17" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
  <path d="M128 186V118l27-19 23 18v69h-50Z" fill="currentColor" opacity="0.15" />
</g>
        </svg>
      )}

      {statId === "occupiedListings" && (
        <svg
          viewBox="0 0 420 220"
          className="absolute inset-x-0 bottom-0 h-[72%] w-full"
          preserveAspectRatio="none"
        >
          <g className={styles.artPrimary}>
            <rect x="236" y="72" width="112" height="108" rx="18" fill="currentColor" opacity="0.12" />
            <rect x="263" y="98" width="22" height="22" rx="5" fill="currentColor" opacity="0.45" />
            <rect x="294" y="98" width="22" height="22" rx="5" fill="currentColor" opacity="0.2" />
            <rect x="263" y="129" width="22" height="22" rx="5" fill="currentColor" opacity="0.45" />
            <rect x="294" y="129" width="22" height="22" rx="5" fill="currentColor" opacity="0.45" />
            <rect x="325" y="129" width="22" height="22" rx="5" fill="currentColor" opacity="0.2" />
          </g>

          <g className={styles.artSecondary}>
            <path d="M24 176c38-7 69-30 112-28 63 4 79 45 137 44 43-1 84-16 147-6V220H0v-30c8-6 16-10 24-14Z" fill="currentColor" opacity="0.12" />
            <path d="M228 176h120" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
            <path d="M252 164v12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
            <path d="M324 164v12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
          </g>

          <g className={styles.artTertiary}>
            <path d="M42 170c33-12 66-8 94 4 24 10 47 23 79 22 27 0 44-9 59-16 25-12 58-21 98-12" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
          </g>
        </svg>
      )}

      {statId === "totalViews" && (
        <svg
          viewBox="0 0 420 220"
          className="absolute inset-x-0 bottom-0 h-[74%] w-full"
          preserveAspectRatio="none"
        >
          <g className={styles.artSecondary}>
            <ellipse cx="300" cy="138" rx="104" ry="48" fill="none" stroke="currentColor" strokeWidth="8" opacity="0.25" />
            <ellipse cx="300" cy="138" rx="72" ry="33" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.28" />
          </g>
          <g className={styles.artPrimary}>
            <circle cx="300" cy="138" r="24" fill="currentColor" opacity="0.24" />
            <circle cx="300" cy="138" r="12" fill="currentColor" opacity="0.55" />
          </g>
          <g className={styles.artTertiary}>
            <path d="M188 174c25-8 48-30 72-38 16-5 31-6 48-1 18 5 31 16 45 23 17 8 36 12 67 8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
            <path d="M206 86c19 9 29 20 41 37" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.34" />
          </g>
        </svg>
      )}

      {statId === "occupancyRate" && (
        <svg
          viewBox="0 0 420 220"
          className="absolute inset-x-0 bottom-0 h-[72%] w-full"
          preserveAspectRatio="none"
        >
          <g className={styles.artPrimary}>
            {[0, 1, 2, 3].map((row) =>
              [0, 1, 2, 3, 4].map((col) => {
                const x = 216 + col * 28;
                const y = 86 + row * 24;
                const active = row * 5 + col < 12;
                return (
                  <rect
                    key={`${row}-${col}`}
                    x={x}
                    y={y}
                    width="18"
                    height="14"
                    rx="4"
                    fill="currentColor"
                    opacity={active ? 0.45 : 0.14}
                  />
                );
              }),
            )}
          </g>
          <g className={styles.artSecondary}>
            <path d="M36 182c46-26 84-20 126-6 29 10 57 24 94 23 35-1 53-12 75-18 27-8 53-6 89 3V220H0v-26c12-5 24-9 36-12Z" fill="currentColor" opacity="0.12" />
            <path d="M214 172h142" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.18" />
            <path d="M214 172h93" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.48" />
          </g>
          <g className={styles.artTertiary}>
            <path d="M62 160c23 0 40 8 54 18 16 11 29 23 53 25" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.45" />
          </g>
        </svg>
      )}

      {statId === "responseRate" && (
        <svg
          viewBox="0 0 420 220"
          className="absolute inset-x-0 bottom-0 h-[74%] w-full"
          preserveAspectRatio="none"
        >
          <g className={styles.artPrimary}>
            <path d="M232 92h86a18 18 0 0 1 18 18v30a18 18 0 0 1-18 18h-39l-23 18 4-18h-28a18 18 0 0 1-18-18v-30a18 18 0 0 1 18-18Z" fill="currentColor" opacity="0.16" />
            <path d="M282 76h76a16 16 0 0 1 16 16v25a16 16 0 0 1-16 16h-22l-13 12 2-12h-43a16 16 0 0 1-16-16V92a16 16 0 0 1 16-16Z" fill="currentColor" opacity="0.12" />
          </g>
          <g className={styles.artSecondary}>
            <path d="M247 116h54" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
            <path d="M247 130h41" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.3" />
            <path d="M286 98h48" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.42" />
          </g>
          <g className={styles.artTertiary}>
            <path d="M42 178c43-17 83-9 124 6 24 9 52 18 86 14 15-2 27-5 39-9" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
          </g>
        </svg>
      )}

      {!statId && (
        <div className={`absolute inset-x-0 bottom-0 h-[56%] ${styles.artPrimary}`}>
          <svg viewBox="0 0 420 160" className="h-full w-full" preserveAspectRatio="none">
            <path d="M0 135c63-24 91 23 154 8 45-11 68-46 114-43 48 3 72 28 152 7V160H0Z" fill="currentColor" opacity="0.1" />
            <path d="M8 129c68-19 96 24 160 11 51-11 71-56 129-46 42 7 63 33 123 6" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" opacity="0.16" />
          </svg>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/[0.10] via-transparent to-transparent dark:from-black/15" />
    </div>
  );
}

export function StatsCard({
  title,
  value,
  color,
  properties = [],
  statId,
  description,
  trend,
  actions,
}: StatsCardProps) {
  const numericValue = toNumber(value);
  const tone = getTone(statId, color);
  const styles = toneStyles[tone];

  const portfolioProperties = properties;

  const portfolioTotal = useMemo(() => {
    if (statId === "totalProperties") {
      return Math.max(0, Math.round(numericValue));
    }

    return portfolioProperties.length;
  }, [numericValue, portfolioProperties.length, statId]);

  const occupiedTotal = useMemo(() => {
    if (statId === "occupiedListings") {
      return Math.max(0, Math.round(numericValue));
    }

    return portfolioProperties.filter(
      (property) => getPropertySlots(property).available === 0,
    ).length;
  }, [numericValue, portfolioProperties, statId]);

  const availableTotal = useMemo(
    () =>
      portfolioProperties.filter(
        (property) => getPropertySlots(property).available > 0,
      ).length,
    [portfolioProperties],
  );

  const occupancyPercentage =
    portfolioTotal > 0
      ? clampPercentage((occupiedTotal / portfolioTotal) * 100)
      : 0;

  const responseBadge = getResponseBadge(numericValue);

  const resolvedDescription = (() => {
    if (description) return description;

    switch (statId) {
      case "occupiedListings":
        return portfolioTotal > 0
          ? `${Math.round(occupancyPercentage)}% of total properties`
          : `${Math.round(numericValue)} properties currently rented`;
      case "totalViews":
        return portfolioTotal > 0
          ? `Across ${portfolioTotal} ${portfolioTotal === 1 ? "listing" : "listings"}`
          : "Across your property listings";
      case "occupancyRate":
        return `${occupiedTotal} of ${portfolioTotal} occupied`;
      case "responseRate":
        return "Based on recent enquiries";
      default:
        return "";
    }
  })();

  const progress = (() => {
    if (statId === "totalProperties" || statId === "occupiedListings") {
      return occupancyPercentage;
    }

    if (statId === "occupancyRate") {
      return clampPercentage(numericValue);
    }

    return null;
  })();

  return (
    <>
      {statId === "totalProperties" && (
        <style>{`
          @media (min-width: 1280px) {
            section:has(article[data-nookly-stat-card="true"]) > div.grid {
              grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            }
          }
        `}</style>
      )}

      <article
        data-nookly-stat-card="true"
        className="group relative flex h-full min-h-[250px] flex-col overflow-hidden rounded-[1.7rem] border border-slate-200/90 bg-white/95 p-5 shadow-[0_14px_36px_-24px_rgba(15,23,42,0.42)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_44px_-24px_rgba(15,23,42,0.5)] dark:border-slate-700/80 dark:bg-[#07111f] dark:shadow-[0_18px_48px_-28px_rgba(0,0,0,0.9)] dark:hover:border-slate-600"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,rgba(255,255,255,0.97)_0%,rgba(248,250,252,0.88)_50%,rgba(239,246,255,0.76)_100%)] dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.96)_0%,rgba(7,17,31,0.98)_55%,rgba(3,12,25,1)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20" />

        <CardArtwork statId={statId} styles={styles} />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <h3
            className={`min-w-0 truncate text-[0.72rem] font-bold uppercase tracking-[0.14em] ${styles.title}`}
          >
            {title}
          </h3>

          {actions && <div className="shrink-0">{actions}</div>}
        </div>

        <div className="relative z-10 mt-6">
          <p className="text-[2.55rem] font-semibold leading-none tracking-[-0.045em] text-slate-950 dark:text-white">
            {value}
          </p>

          {statId === "totalProperties" ? (
            <p className="mt-3 min-h-5 text-sm leading-5 text-slate-600 dark:text-slate-300">
              <span className={`font-semibold ${styles.accentText}`}>
                {occupiedTotal} occupied
              </span>
              <span> · {availableTotal} available</span>
            </p>
          ) : statId === "responseRate" ? (
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${badgeStyles[responseBadge.tone]}`}
              >
                {responseBadge.label}
              </span>
              <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                {resolvedDescription}
              </p>
            </div>
          ) : trend ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span
                className={`font-semibold ${
                  trend.isUp
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {trend.isUp ? "↗" : "↘"} {trend.value}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                this month
              </span>
            </div>
          ) : (
            <p className="mt-3 min-h-5 text-sm leading-5 text-slate-600 dark:text-slate-300">
              {resolvedDescription}
            </p>
          )}
        </div>

        <div className="relative z-10 mt-auto pt-8">
          {progress !== null ? (
            <div className="flex items-center gap-3">
              <div
                className={`h-1.5 flex-1 overflow-hidden rounded-full ${styles.progressTrack}`}
                role="progressbar"
                aria-label={`${title} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div
                  className={`h-full rounded-full shadow-sm transition-[width] duration-700 ${styles.progress}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <span className="shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {Math.round(progress)}%
              </span>
            </div>
          ) : statId === "totalViews" ? (
            <span className="inline-flex rounded-full border border-violet-200/80 bg-white/50 px-2.5 py-1 text-xs font-semibold text-violet-700 backdrop-blur-sm dark:border-violet-700/50 dark:bg-violet-500/10 dark:text-violet-300">
              Portfolio traffic
            </span>
          ) : statId === "responseRate" ? (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Your responsiveness
            </p>
          ) : null}
        </div>
      </article>
    </>
  );
}