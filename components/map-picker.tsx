"use client";

import dynamic from "next/dynamic";

export interface AddressParts {
  houseNumber: string;
  road: string;
  neighbourhood: string;
  city: string;
}

export interface MapPickerProps {
  onLocationSelect: (
    lat: number,
    lng: number,
    address: string,
    parts: AddressParts,
  ) => void;
  theme: string;
  initialLat?: number;
  initialLng?: number;
}

const ClientMapPicker = dynamic<MapPickerProps>(
  () => import("./map-picker-client"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--accent-700)]" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Loading map...
          </p>
        </div>
      </div>
    ),
  },
);

export default function MapPicker(props: MapPickerProps) {
  return <ClientMapPicker {...props} />;
}