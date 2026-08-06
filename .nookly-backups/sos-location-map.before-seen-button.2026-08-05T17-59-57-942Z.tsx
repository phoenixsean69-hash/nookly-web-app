"use client";

import dynamic from "next/dynamic";
import { MapPin, X } from "lucide-react";
import { useEffect } from "react";

interface SosLocationMapBaseProps {
  latitude: number;
  longitude: number;
  title: string;
  locationName: string;
  locationDetail: string;
}

interface SosLocationMapModalProps extends SosLocationMapBaseProps {
  isOpen: boolean;
  onClose: () => void;
  statusLabel: string;
}

const SosLocationMapCanvas = dynamic(
  () =>
    import("@/components/sos/sos-location-map-canvas").then(
      (module) => module.SosLocationMapCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[310px] items-center justify-center bg-gray-100 px-6 text-center dark:bg-gray-950">
        <div>
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent-700)] dark:border-gray-700" />
          <p className="mt-3 text-sm font-bold text-gray-700 dark:text-gray-200">
            Loading emergency map…
          </p>
        </div>
      </div>
    ),
  },
);

export function SosLocationMapPreview(props: SosLocationMapBaseProps) {
  return (
    <div className="relative isolate h-[340px] overflow-hidden bg-gray-100 dark:bg-gray-950">
      <SosLocationMapCanvas {...props} mode="preview" />
    </div>
  );
}

export function SosLocationMapModal({
  isOpen,
  onClose,
  statusLabel,
  ...mapProps
}: SosLocationMapModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-location-map-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="relative z-0 flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 dark:border-gray-800 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <MapPin className="h-5 w-5 shrink-0 text-red-600" />
              <h2
                id="sos-location-map-title"
                className="truncate text-lg font-black sm:text-xl"
              >
                {mapProps.title}
              </h2>
              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {mapProps.locationName} · {mapProps.locationDetail}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-gray-200 p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Close SOS location map"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="relative isolate h-[68vh] min-h-[420px] max-h-[680px] overflow-hidden bg-gray-100 dark:bg-gray-950">
          <SosLocationMapCanvas {...mapProps} mode="modal" />
        </div>

        <footer className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-black">
              {mapProps.latitude}, {mapProps.longitude}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              Dummy emergency coordinates for the UI prototype
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--accent-700)] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Back to SOS case
          </button>
        </footer>
      </section>
    </div>
  );
}
