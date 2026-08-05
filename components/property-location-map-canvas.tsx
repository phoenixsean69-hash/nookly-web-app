"use client";

import "leaflet/dist/leaflet.css";

import { Satellite } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

type LatLngTuple = [number, number];
type MapStyle = "street" | "hybrid";

interface PropertyLocationMapCanvasProps {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
}

const ESRI_IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ESRI_IMAGERY_HD_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?blankTile=false";

const ESRI_LABELS_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}?blankTile=false";

const TRANSPARENT_TILE =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

function PrepareMap({ center }: { center: LatLngTuple }) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      map.setView(center, 17, { animate: false });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [center, map]);

  return null;
}

export function PropertyLocationMapCanvas({
  latitude,
  longitude,
  title,
  address,
}: PropertyLocationMapCanvasProps) {
  const [mapStyle, setMapStyle] = useState<MapStyle>("street");

  const center = useMemo<LatLngTuple>(
    () => [latitude, longitude],
    [latitude, longitude],
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={17}
        minZoom={3}
        maxZoom={19}
        scrollWheelZoom
        fadeAnimation={false}
        className="h-full w-full"
      >
        {mapStyle === "street" ? (
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            keepBuffer={4}
          />
        ) : (
          <>
            <TileLayer
              attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
              url={ESRI_IMAGERY_URL}
              maxNativeZoom={14}
              maxZoom={19}
              keepBuffer={5}
              updateWhenZooming={false}
              updateWhenIdle
              zIndex={1}
            />

            <TileLayer
              attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
              url={ESRI_IMAGERY_HD_URL}
              errorTileUrl={TRANSPARENT_TILE}
              maxNativeZoom={19}
              maxZoom={19}
              keepBuffer={5}
              updateWhenZooming={false}
              updateWhenIdle
              zIndex={2}
            />

            <TileLayer
              attribution="Labels &copy; Esri"
              url={ESRI_LABELS_URL}
              errorTileUrl={TRANSPARENT_TILE}
              maxNativeZoom={19}
              maxZoom={19}
              keepBuffer={5}
              updateWhenZooming={false}
              updateWhenIdle
              opacity={0.95}
              zIndex={3}
            />
          </>
        )}

        <PrepareMap center={center} />

        <CircleMarker
          center={center}
          radius={22}
          pathOptions={{
            color: "var(--accent-700)",
            fillColor: "var(--accent-700)",
            fillOpacity: 0.16,
            weight: 2,
          }}
        />

        <CircleMarker
          center={center}
          radius={10}
          pathOptions={{
            color: "#ffffff",
            fillColor: "var(--accent-700)",
            fillOpacity: 1,
            weight: 4,
          }}
        >
          <Popup>
            <strong>{title}</strong>
            <br />
            {address}
            <br />
            {latitude}, {longitude}
          </Popup>
        </CircleMarker>
      </MapContainer>

      <div className="absolute right-3 top-3 z-[500] flex rounded-xl border border-gray-200 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:right-4 sm:top-4">
        <button
          type="button"
          onClick={() => setMapStyle("street")}
          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
            mapStyle === "street"
              ? "bg-[var(--accent-700)] text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
          aria-pressed={mapStyle === "street"}
        >
          Street
        </button>

        <button
          type="button"
          onClick={() => setMapStyle("hybrid")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
            mapStyle === "hybrid"
              ? "bg-[var(--accent-700)] text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
          aria-pressed={mapStyle === "hybrid"}
        >
          <Satellite className="h-3.5 w-3.5" />
          Hybrid
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] max-w-[calc(100%-1.5rem)] rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:bottom-4 sm:left-4">
        <p className="text-xs font-black text-gray-900 dark:text-white">
          Saved property position
        </p>
        <p className="mt-0.5 break-all text-[10px] text-gray-500 dark:text-gray-400">
          {latitude}, {longitude}
        </p>
      </div>
    </div>
  );
}
