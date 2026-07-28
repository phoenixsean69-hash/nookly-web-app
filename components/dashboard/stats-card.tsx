"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Building2,
  Eye,
  Home,
  MessageCircle,
  Target,
} from "lucide-react";

import { CACHE_KEYS } from "@/lib/cache-keys";
import { cacheService } from "@/lib/cache.service";

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

interface CachedProperty {
  $id?: string;
  isAvailable?: boolean;
}

type CardTone = "blue" | "purple" | "green" | "orange" | "cyan";

type BadgeTone = "success" | "warning" | "danger" | "neutral";

const toneStyles: Record<
  CardTone,
  {
    iconBackground: string;
    iconBorder: string;
    iconText: string;
    progress: string;
    accentText: string;
  }
> = {
  blue: {
    iconBackground: "bg-blue-500/15 dark:bg-blue-500/20",
    iconBorder: "border-blue-500/30 dark:border-blue-400/30",
    iconText: "text-blue-600 dark:text-blue-300",
    progress: "bg-blue-500 dark:bg-blue-400",
    accentText: "text-blue-600 dark:text-blue-300",
  },
  purple: {
    iconBackground: "bg-purple-500/15 dark:bg-purple-500/20",
    iconBorder: "border-purple-500/30 dark:border-purple-400/30",
    iconText: "text-purple-600 dark:text-purple-300",
    progress: "bg-purple-500 dark:bg-purple-400",
    accentText: "text-purple-600 dark:text-purple-300",
  },
  green: {
    iconBackground: "bg-green-500/15 dark:bg-green-500/20",
    iconBorder: "border-green-500/30 dark:border-green-400/30",
    iconText: "text-green-600 dark:text-green-300",
    progress: "bg-green-500 dark:bg-green-400",
    accentText: "text-green-600 dark:text-green-300",
  },
  orange: {
    iconBackground: "bg-orange-500/15 dark:bg-orange-500/20",
    iconBorder: "border-orange-500/30 dark:border-orange-400/30",
    iconText: "text-orange-600 dark:text-orange-300",
    progress: "bg-orange-500 dark:bg-orange-400",
    accentText: "text-orange-600 dark:text-orange-300",
  },
  cyan: {
    iconBackground: "bg-cyan-500/15 dark:bg-cyan-500/20",
    iconBorder: "border-cyan-500/30 dark:border-cyan-400/30",
    iconText: "text-cyan-600 dark:text-cyan-300",
    progress: "bg-cyan-500 dark:bg-cyan-400",
    accentText: "text-cyan-600 dark:text-cyan-300",
  },
};

const badgeStyles: Record<BadgeTone, string> = {
  success:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  danger:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300",
  neutral:
    "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300",
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

function getTone(statId?: string, fallbackColor?: string): CardTone {
  switch (statId) {
    case "occupiedListings":
      return "purple";
    case "totalViews":
      return "green";
    case "occupancyRate":
      return "orange";
    case "responseRate":
      return "cyan";
    case "totalProperties":
      return "blue";
    default:
      if (fallbackColor === "purple") return "purple";
      if (fallbackColor === "green") return "green";
      if (fallbackColor === "orange" || fallbackColor === "yellow") {
        return "orange";
      }
      if (fallbackColor === "cyan" || fallbackColor === "teal") {
        return "cyan";
      }
      return "blue";
  }
}

function getDefaultIcon(statId?: string): ReactNode {
  switch (statId) {
    case "occupiedListings":
      return <Home className="h-5 w-5" />;
    case "totalViews":
      return <Eye className="h-5 w-5" />;
    case "occupancyRate":
      return <Target className="h-5 w-5" />;
    case "responseRate":
      return <MessageCircle className="h-5 w-5" />;
    case "totalProperties":
    default:
      return <Building2 className="h-5 w-5" />;
  }
}

function getResponseBadge(rate: number): {
  label: string;
  tone: BadgeTone;
} {
  if (rate >= 80) {
    return { label: "Excellent", tone: "success" };
  }

  if (rate >= 70) {
    return { label: "Good", tone: "success" };
  }

  if (rate >= 50) {
    return { label: "Moderate", tone: "warning" };
  }

  if (rate > 0) {
    return { label: "Low", tone: "danger" };
  }

  return { label: "No enquiries yet", tone: "neutral" };
}

export function StatsCard({
  title,
  value,
  color,
  icon,
  properties = [],
  statId,
  description,
  trend,
  actions,
}: StatsCardProps) {
  const numericValue = toNumber(value);
  const tone = getTone(statId, color);
  const styles = toneStyles[tone];

  const [cachedProperties, setCachedProperties] = useState<CachedProperty[]>([]);

  useEffect(() => {
    const cached = cacheService.get<CachedProperty[]>(CACHE_KEYS.PROPERTIES);
    setCachedProperties(Array.isArray(cached) ? cached : []);
  }, [properties, value]);

  const portfolioProperties =
    cachedProperties.length > 0 ? cachedProperties : properties;

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
      (property) => property.isAvailable === false,
    ).length;
  }, [numericValue, portfolioProperties, statId]);

  const availableTotal = Math.max(portfolioTotal - occupiedTotal, 0);

  const occupancyPercentage =
    portfolioTotal > 0
      ? clampPercentage((occupiedTotal / portfolioTotal) * 100)
      : 0;

  const responseBadge = getResponseBadge(numericValue);

  const resolvedDescription = (() => {
    if (description) {
      return description;
    }

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
        return `${occupiedTotal} of ${portfolioTotal} properties`;
      case "responseRate":
        return "Based on recent enquiries";
      default:
        return "";
    }
  })();

  const footer = (() => {
    switch (statId) {
      case "occupiedListings":
        return "Currently occupied";
      case "totalViews":
        return "Property views";
      case "occupancyRate":
        return "Current occupancy";
      case "responseRate":
        return "Your responsiveness";
      case "totalProperties":
      default:
        return "All your properties";
    }
  })();

  const progress = (() => {
    if (statId === "occupiedListings") {
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
          section:has(article[data-nookly-stat-card="true"]) > div:first-child {
            margin-bottom: 1.25rem;
            align-items: center;
          }

          section:has(article[data-nookly-stat-card="true"]) > div:first-child > div:first-child {
            align-items: center;
            gap: 0.75rem;
          }

          section:has(article[data-nookly-stat-card="true"]) > div:first-child > div:first-child > div:first-child {
            width: 2.75rem;
            height: 2.75rem;
            border-radius: 0.75rem;
          }

          section:has(article[data-nookly-stat-card="true"]) > div:first-child h2 {
            font-size: 1.25rem;
            line-height: 1.55rem;
          }

          section:has(article[data-nookly-stat-card="true"]) > div:first-child h2::after {
            content: "Overview of your property portfolio";
            display: block;
            margin-top: 0.2rem;
            color: rgb(107 114 128);
            font-size: 0.875rem;
            font-weight: 400;
            line-height: 1.25rem;
          }

          .dark section:has(article[data-nookly-stat-card="true"]) > div:first-child h2::after {
            color: rgb(156 163 175);
          }

          section:has(article[data-nookly-stat-card="true"]) > div:first-child > button {
            gap: 0.5rem;
            border-radius: 0.75rem;
            padding: 0.625rem 1rem;
            font-size: 0.875rem;
            line-height: 1.25rem;
          }

          @media (min-width: 1280px) {
            section:has(article[data-nookly-stat-card="true"]) > div.grid {
              grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            }
          }
        `}</style>
      )}

      <article
        data-nookly-stat-card="true"
        className="flex min-h-[250px] h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${styles.iconBackground} ${styles.iconBorder} ${styles.iconText}`}
            >
              {icon ?? getDefaultIcon(statId)}
            </div>

            <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              {title}
            </h3>
          </div>

          {actions && <div className="shrink-0">{actions}</div>}
        </div>

        <div className="mt-6">
          <p className="text-4xl font-bold tracking-tight text-gray-950 dark:text-white">
            {value}
          </p>

          {statId === "totalProperties" ? (
            <p className="mt-2 min-h-5 text-sm leading-5 text-gray-500 dark:text-gray-400">
              <span className={styles.accentText}>{occupiedTotal} occupied</span>
              <span> · {availableTotal} available</span>
            </p>
          ) : (
            <p className="mt-2 min-h-5 text-sm leading-5 text-gray-500 dark:text-gray-400">
              {resolvedDescription}
            </p>
          )}
        </div>

        <div className="mt-5 min-h-11">
          {progress !== null ? (
            <div className="flex items-center gap-3">
              <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"
                role="progressbar"
                aria-label={`${title} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div
                  className={`h-full rounded-full ${styles.progress}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <span className="shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-200">
                {Math.round(progress)}%
              </span>
            </div>
          ) : statId === "responseRate" ? (
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyles[responseBadge.tone]}`}
            >
              {responseBadge.label}
            </span>
          ) : trend ? (
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  trend.isUp
                    ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                <span aria-hidden="true">{trend.isUp ? "▲" : "▼"}</span>
                {trend.value}
              </span>

              <span className="text-xs text-gray-500 dark:text-gray-400">
                vs last 30 days
              </span>
            </div>
          ) : statId === "totalViews" ? (
            <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
              Portfolio traffic
            </span>
          ) : null}
        </div>

        <div className="mt-auto border-t border-gray-100 pt-4 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">{footer}</p>
        </div>
      </article>
    </>
  );
}
