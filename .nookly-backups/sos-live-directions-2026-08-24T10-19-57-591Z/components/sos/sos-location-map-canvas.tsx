"use client";

import "leaflet/dist/leaflet.css";

import {
  LocateFixed,
  Navigation,
  Satellite,
  Siren,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

type LatLngTuple = [number, number];
type MapStyle = "street" | "hybrid";
type DeviceLocationStatus =
  | "idle"
  | "locating"
  | "ready"
  | "denied"
  | "unavailable"
  | "error";
type RouteStatus =
  | "idle"
  | "loading"
  | "road"
  | "direct";

interface SosLocationMapCanvasProps {
  latitude: number;
  longitude: number;
  title: string;
  locationName: string;
  locationDetail: string;
  mode: "preview" | "modal";
}

interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

interface SharedDeviceLocationState {
  status: DeviceLocationStatus;
  location: DeviceLocation | null;
  message: string;
}

interface RouteInfo {
  coordinates: LatLngTuple[];
  distanceMeters: number;
  durationSeconds: number | null;
  source: "road" | "direct";
}

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      type?: string;
      coordinates?: Array<[number, number]>;
    };
  }>;
}

const ESRI_IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ESRI_IMAGERY_HD_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?blankTile=false";

const ESRI_LABELS_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}?blankTile=false";

const TRANSPARENT_TILE =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

const OSRM_BASE_URL =
  "https://router.project-osrm.org/route/v1/driving";

const routeCache =
  new Map<string, RouteInfo>();

let sharedLocationState: SharedDeviceLocationState = {
  status: "idle",
  location: null,
  message: "",
};

let sharedWatchId: number | null = null;

const sharedLocationListeners =
  new Set<
    (
      state: SharedDeviceLocationState,
    ) => void
  >();

function emitSharedLocation(
  next: SharedDeviceLocationState,
) {
  sharedLocationState = next;

  for (
    const listener of
    sharedLocationListeners
  ) {
    listener(next);
  }
}

function stopSharedLocationWatch() {
  if (
    typeof navigator === "undefined" ||
    !navigator.geolocation ||
    sharedWatchId === null
  ) {
    return;
  }

  navigator.geolocation.clearWatch(
    sharedWatchId,
  );

  sharedWatchId = null;
}

function ensureSharedLocationWatch() {
  if (
    typeof navigator === "undefined"
  ) {
    return;
  }

  if (!navigator.geolocation) {
    emitSharedLocation({
      status: "unavailable",
      location: null,
      message:
        "This browser does not provide device location.",
    });
    return;
  }

  if (sharedWatchId !== null) {
    return;
  }

  emitSharedLocation({
    ...sharedLocationState,
    status:
      sharedLocationState.location
        ? "ready"
        : "locating",
    message:
      sharedLocationState.location
        ? ""
        : "Finding your current location…",
  });

  sharedWatchId =
    navigator.geolocation.watchPosition(
      (position) => {
        emitSharedLocation({
          status: "ready",
          location: {
            latitude:
              position.coords.latitude,
            longitude:
              position.coords.longitude,
            accuracy:
              Number.isFinite(
                position.coords.accuracy,
              )
                ? position.coords.accuracy
                : null,
            timestamp:
              position.timestamp ||
              Date.now(),
          },
          message: "",
        });
      },
      (error) => {
        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {
          stopSharedLocationWatch();

          emitSharedLocation({
            status: "denied",
            location: null,
            message:
              "Allow location access to show directions from this device.",
          });

          return;
        }

        emitSharedLocation({
          status:
            error.code ===
            error.POSITION_UNAVAILABLE
              ? "unavailable"
              : "error",
          location:
            sharedLocationState.location,
          message:
            error.message ||
            "Unable to determine your current location.",
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      },
    );
}

function subscribeToSharedLocation(
  listener: (
    state: SharedDeviceLocationState,
  ) => void,
) {
  sharedLocationListeners.add(
    listener,
  );

  listener(
    sharedLocationState,
  );

  ensureSharedLocationWatch();

  return () => {
    sharedLocationListeners.delete(
      listener,
    );

    if (
      sharedLocationListeners.size ===
      0
    ) {
      stopSharedLocationWatch();
    }
  };
}

function useSharedDeviceLocation() {
  const [
    state,
    setState,
  ] =
    useState<SharedDeviceLocationState>(
      sharedLocationState,
    );

  useEffect(
    () =>
      subscribeToSharedLocation(
        setState,
      ),
    [],
  );

  return state;
}

function toRadians(value: number) {
  return (
    (value * Math.PI) / 180
  );
}

function directDistanceMeters(
  first: LatLngTuple,
  second: LatLngTuple,
) {
  const earthRadius = 6_371_000;

  const latitudeDelta =
    toRadians(
      second[0] - first[0],
    );

  const longitudeDelta =
    toRadians(
      second[1] - first[1],
    );

  const firstLatitude =
    toRadians(first[0]);

  const secondLatitude =
    toRadians(second[0]);

  const a =
    Math.sin(
      latitudeDelta / 2,
    ) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(
        longitudeDelta / 2,
      ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    );

  return earthRadius * c;
}

function makeDirectRoute(
  start: LatLngTuple,
  destination: LatLngTuple,
): RouteInfo {
  return {
    coordinates: [
      start,
      destination,
    ],
    distanceMeters:
      directDistanceMeters(
        start,
        destination,
      ),
    durationSeconds: null,
    source: "direct",
  };
}

function routeCacheKey(
  start: LatLngTuple,
  destination: LatLngTuple,
) {
  return [
    start[0].toFixed(4),
    start[1].toFixed(4),
    destination[0].toFixed(5),
    destination[1].toFixed(5),
  ].join(":");
}

function pruneRouteCache() {
  if (routeCache.size <= 80) {
    return;
  }

  const keys = [
    ...routeCache.keys(),
  ].slice(
    0,
    routeCache.size - 80,
  );

  for (const key of keys) {
    routeCache.delete(key);
  }
}

async function fetchRoadRoute(
  start: LatLngTuple,
  destination: LatLngTuple,
  signal: AbortSignal,
): Promise<RouteInfo> {
  const key =
    routeCacheKey(
      start,
      destination,
    );

  const cached =
    routeCache.get(key);

  if (cached) {
    return cached;
  }

  const query =
    `${OSRM_BASE_URL}/` +
    `${start[1]},${start[0]};` +
    `${destination[1]},${destination[0]}` +
    "?overview=full&geometries=geojson&steps=false";

  const response =
    await fetch(
      query,
      {
        signal,
        headers: {
          accept:
            "application/json",
        },
      },
    );

  if (!response.ok) {
    throw new Error(
      `Routing service returned HTTP ${response.status}.`,
    );
  }

  const payload =
    (await response.json()) as OsrmRouteResponse;

  const firstRoute =
    payload.routes?.[0];

  const geometry =
    firstRoute?.geometry
      ?.coordinates;

  if (
    payload.code !== "Ok" ||
    !geometry ||
    geometry.length < 2
  ) {
    throw new Error(
      "No road route was returned.",
    );
  }

  const route: RouteInfo = {
    coordinates:
      geometry.map(
        ([longitude, latitude]) =>
          [
            latitude,
            longitude,
          ] as LatLngTuple,
      ),
    distanceMeters:
      Number(
        firstRoute.distance ??
          0,
      ),
    durationSeconds:
      Number.isFinite(
        firstRoute.duration,
      )
        ? Number(
            firstRoute.duration,
          )
        : null,
    source: "road",
  };

  routeCache.set(
    key,
    route,
  );

  pruneRouteCache();

  return route;
}

function formatDistance(
  meters: number,
) {
  if (
    !Number.isFinite(meters)
  ) {
    return "Distance unavailable";
  }

  if (meters < 1000) {
    return `${Math.max(
      1,
      Math.round(meters),
    )} m`;
  }

  return `${(
    meters / 1000
  ).toFixed(
    meters < 10 ? 1 : 0,
  )} km`;
}

function formatDuration(
  seconds: number | null,
) {
  if (
    seconds === null ||
    !Number.isFinite(seconds)
  ) {
    return null;
  }

  const minutes =
    Math.max(
      1,
      Math.round(
        seconds / 60,
      ),
    );

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remainingMinutes =
    minutes % 60;

  return remainingMinutes > 0
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

function MapViewport({
  destination,
  route,
  zoom,
  mode,
}: {
  destination: LatLngTuple;
  route: RouteInfo | null;
  zoom: number;
  mode: "preview" | "modal";
}) {
  const map = useMap();

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          map.invalidateSize({
            animate: false,
          });

          if (
            route &&
            route.coordinates.length >=
              2
          ) {
            map.fitBounds(
              route.coordinates,
              {
                padding:
                  mode === "modal"
                    ? [58, 58]
                    : [36, 36],
                maxZoom:
                  mode === "modal"
                    ? 16
                    : 15,
                animate: false,
              },
            );

            return;
          }

          map.setView(
            destination,
            zoom,
            {
              animate: false,
            },
          );
        },
        80,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    destination,
    map,
    mode,
    route,
    zoom,
  ]);

  return null;
}

export function SosLocationMapCanvas({
  latitude,
  longitude,
  title,
  locationName,
  locationDetail,
  mode,
}: SosLocationMapCanvasProps) {
  const [
    mapStyle,
    setMapStyle,
  ] =
    useState<MapStyle>(
      "street",
    );

  const [
    route,
    setRoute,
  ] =
    useState<RouteInfo | null>(
      null,
    );

  const [
    routeStatus,
    setRouteStatus,
  ] =
    useState<RouteStatus>(
      "idle",
    );

  const device =
    useSharedDeviceLocation();

  const destination =
    useMemo<LatLngTuple>(
      () => [
        latitude,
        longitude,
      ],
      [
        latitude,
        longitude,
      ],
    );

  const devicePoint =
    useMemo<LatLngTuple | null>(
      () =>
        device.location
          ? [
              device.location.latitude,
              device.location.longitude,
            ]
          : null,
      [
        device.location?.latitude,
        device.location?.longitude,
      ],
    );

  const routingOriginKey =
    devicePoint
      ? `${devicePoint[0].toFixed(
          4,
        )}:${devicePoint[1].toFixed(
          4,
        )}`
      : "";

  useEffect(() => {
    if (!devicePoint) {
      setRoute(null);
      setRouteStatus(
        "idle",
      );
      return;
    }

    const controller =
      new AbortController();

    const fallback =
      makeDirectRoute(
        devicePoint,
        destination,
      );

    setRoute(fallback);
    setRouteStatus(
      "loading",
    );

    void fetchRoadRoute(
      devicePoint,
      destination,
      controller.signal,
    )
      .then(
        (roadRoute) => {
          setRoute(
            roadRoute,
          );
          setRouteStatus(
            "road",
          );
        },
      )
      .catch(
        (error) => {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

          console.warn(
            "Unable to load road directions for SOS; using direct trail.",
            error,
          );

          setRoute(
            fallback,
          );
          setRouteStatus(
            "direct",
          );
        },
      );

    return () =>
      controller.abort();
  }, [
    destination,
    routingOriginKey,
  ]);

  const initialZoom =
    mode === "modal"
      ? 17
      : 16;

  const routeDuration =
    formatDuration(
      route?.durationSeconds ??
        null,
    );

  const routeSummary =
    route
      ? `${formatDistance(
          route.distanceMeters,
        )}${
          routeDuration
            ? ` · ${routeDuration}`
            : ""
        }`
      : "";

  return (
    <div className="relative isolate h-full w-full overflow-hidden">
      <MapContainer
        center={destination}
        zoom={initialZoom}
        minZoom={3}
        maxZoom={19}
        scrollWheelZoom
        fadeAnimation={false}
        className="relative z-0 h-full w-full"
      >
        {mapStyle ===
        "street" ? (
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
              url={
                ESRI_IMAGERY_URL
              }
              maxNativeZoom={14}
              maxZoom={19}
              keepBuffer={5}
              updateWhenZooming={
                false
              }
              updateWhenIdle
              zIndex={1}
            />
            <TileLayer
              attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
              url={
                ESRI_IMAGERY_HD_URL
              }
              errorTileUrl={
                TRANSPARENT_TILE
              }
              maxNativeZoom={19}
              maxZoom={19}
              keepBuffer={5}
              updateWhenZooming={
                false
              }
              updateWhenIdle
              zIndex={2}
            />
            <TileLayer
              attribution="Labels &copy; Esri"
              url={
                ESRI_LABELS_URL
              }
              errorTileUrl={
                TRANSPARENT_TILE
              }
              maxNativeZoom={19}
              maxZoom={19}
              keepBuffer={5}
              updateWhenZooming={
                false
              }
              updateWhenIdle
              opacity={0.95}
              zIndex={3}
            />
          </>
        )}

        <MapViewport
          destination={
            destination
          }
          route={route}
          zoom={
            initialZoom
          }
          mode={mode}
        />

        {route &&
          route.coordinates
            .length >= 2 && (
            <>
              <Polyline
                positions={
                  route.coordinates
                }
                pathOptions={{
                  color:
                    "#2563eb",
                  weight: 9,
                  opacity: 0.28,
                  lineCap:
                    "round",
                  lineJoin:
                    "round",
                }}
              />
              <Polyline
                positions={
                  route.coordinates
                }
                pathOptions={{
                  color:
                    route.source ===
                    "road"
                      ? "#f97316"
                      : "#60a5fa",
                  weight: 5,
                  opacity: 0.95,
                  dashArray:
                    route.source ===
                    "direct"
                      ? "10 10"
                      : undefined,
                  lineCap:
                    "round",
                  lineJoin:
                    "round",
                }}
              />
            </>
          )}

        {devicePoint && (
          <>
            {device.location
              ?.accuracy !== null &&
              device.location
                ?.accuracy !== undefined && (
                <Circle
                  center={
                    devicePoint
                  }
                  radius={Math.max(
                    5,
                    Math.min(
                      250,
                      device.location
                        .accuracy,
                    ),
                  )}
                  pathOptions={{
                    color:
                      "#2563eb",
                    fillColor:
                      "#3b82f6",
                    fillOpacity:
                      0.08,
                    weight: 1,
                  }}
                />
              )}

            <CircleMarker
              center={
                devicePoint
              }
              radius={10}
              pathOptions={{
                color: "#ffffff",
                fillColor:
                  "#2563eb",
                fillOpacity: 1,
                weight: 4,
              }}
            >
              <Popup>
                <strong>
                  Your device
                </strong>
                <br />
                Current location
                {device.location
                  ?.accuracy !== null &&
                  device.location
                    ?.accuracy !== undefined && (
                    <>
                      <br />
                      Accuracy about{" "}
                      {Math.round(
                        device.location
                          .accuracy,
                      )}{" "}
                      m
                    </>
                  )}
              </Popup>
            </CircleMarker>
          </>
        )}

        <CircleMarker
          center={
            destination
          }
          radius={28}
          pathOptions={{
            color: "#dc2626",
            fillColor:
              "#dc2626",
            fillOpacity:
              0.15,
            weight: 2,
          }}
        />

        <CircleMarker
          center={
            destination
          }
          radius={12}
          pathOptions={{
            color: "#ffffff",
            fillColor:
              "#dc2626",
            fillOpacity: 1,
            weight: 4,
          }}
        >
          <Popup>
            <strong>
              {title}
            </strong>
            <br />
            {locationName}
            <br />
            {locationDetail}
            <br />
            {latitude},{" "}
            {longitude}
          </Popup>
        </CircleMarker>
      </MapContainer>

      <div className="absolute left-3 top-3 z-[500] max-w-[calc(100%-9rem)] rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:left-4 sm:top-4">
        <div className="flex items-start gap-2">
          {device.status ===
          "ready" ? (
            <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          ) : (
            <LocateFixed className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          )}

          <div className="min-w-0">
            <p className="text-xs font-black text-gray-900 dark:text-white">
              {device.status ===
              "ready"
                ? "Your device → SOS"
                : device.status ===
                    "locating"
                  ? "Finding your location…"
                  : "Directions unavailable"}
            </p>

            <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              {device.status ===
                "ready" &&
              route
                ? routeStatus ===
                  "loading"
                  ? `${routeSummary} · Calculating road route…`
                  : routeStatus ===
                      "direct"
                    ? `${routeSummary} · Direct fallback trail`
                    : `${routeSummary} · Live road route`
                : device.message ||
                  "Allow browser location to draw a route."}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-3 z-[500] flex rounded-xl border border-gray-200 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:right-4 sm:top-4">
        <button
          type="button"
          onClick={() =>
            setMapStyle(
              "street",
            )
          }
          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
            mapStyle ===
            "street"
              ? "bg-[var(--accent-700)] text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
          aria-pressed={
            mapStyle ===
            "street"
          }
        >
          Street
        </button>

        <button
          type="button"
          onClick={() =>
            setMapStyle(
              "hybrid",
            )
          }
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
            mapStyle ===
            "hybrid"
              ? "bg-[var(--accent-700)] text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
          aria-pressed={
            mapStyle ===
            "hybrid"
          }
        >
          <Satellite className="h-3.5 w-3.5" />
          Hybrid
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] max-w-[calc(100%-1.5rem)] rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:bottom-4 sm:left-4">
        <div className="flex items-start gap-2">
          <Siren className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

          <div>
            <p className="text-xs font-black text-gray-900 dark:text-white">
              {locationName}
            </p>

            <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              {locationDetail}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
