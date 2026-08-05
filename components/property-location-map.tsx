"use client";

import dynamic from "next/dynamic";
import { MapPin, X } from "lucide-react";
import { useEffect } from "react";

interface PropertyLocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  title: string;
  address: string;
}

const PropertyLocationMapCanvas = dynamic(
  () =>
    import("@/components/property-location-map-canvas").then(
      (module) => module.PropertyLocationMapCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[380px] items-center justify-center bg-gray-100 px-6 text-center dark:bg-gray-950">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent-700)] dark:border-gray-700" />
          <p className="mt-4 text-sm font-bold text-gray-700 dark:text-gray-200">
            Loading Nookly map…
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Preparing the saved property location.
          </p>
        </div>
      </div>
    ),
  },
);

export function PropertyLocationMapModal({
  isOpen,
  onClose,
  latitude,
  longitude,
  title,
  address,
}: PropertyLocationMapModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-location-map-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 dark:border-gray-800 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 shrink-0 text-[var(--accent-700)]" />
              <h2
                id="property-location-map-title"
                className="truncate text-lg font-black sm:text-xl"
              >
                {title}
              </h2>
            </div>

            <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
              {address}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-gray-200 p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Close property map"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="relative h-[68vh] min-h-[380px] max-h-[650px] bg-gray-100 dark:bg-gray-950">
          <PropertyLocationMapCanvas
            latitude={latitude}
            longitude={longitude}
            title={title}
            address={address}
          />
        </div>

        <footer className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This map stays inside Nookly Web. Drag, zoom, or switch the map
            style without leaving the property page.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--accent-700)] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Back to property
          </button>
        </footer>
      </section>
    </div>
  );
}
