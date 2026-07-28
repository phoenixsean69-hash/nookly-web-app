"use client";

import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import "leaflet/dist/leaflet.css";

import type {
  AddressParts,
  MapPickerProps,
} from "./map-picker";

const DefaultIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

interface Coordinates {
  lat: number;
  lng: number;
}

function extractAddressParts(
  address: Record<string, string> | undefined,
): AddressParts {
  if (!address) {
    return {
      houseNumber: "",
      road: "",
      neighbourhood: "",
      city: "",
    };
  }

  return {
    houseNumber: address.house_number || "",
    road:
      address.road ||
      address.pedestrian ||
      address.footway ||
      "",
    neighbourhood:
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.residential ||
      "",
    city:
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      "",
  };
}

function MapController({
  flyToPosition,
}: {
  flyToPosition: Coordinates | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (flyToPosition) {
      map.flyTo(
        [flyToPosition.lat, flyToPosition.lng],
        17,
        { duration: 1 },
      );
    }
  }, [flyToPosition, map]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

function ClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function MapPickerClient({
  onLocationSelect,
  theme: resolvedTheme,
  initialLat,
  initialLng,
}: MapPickerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [mapType, setMapType] = useState<"street" | "hybrid">(
    "street",
  );
  const [position, setPosition] = useState<Coordinates | null>(() => {
    if (
      typeof initialLat === "number" &&
      Number.isFinite(initialLat) &&
      typeof initialLng === "number" &&
      Number.isFinite(initialLng)
    ) {
      return { lat: initialLat, lng: initialLng };
    }

    return null;
  });
  const [flyToPosition, setFlyToPosition] =
    useState<Coordinates | null>(null);
  const [address, setAddress] = useState("");
  const [addressParts, setAddressParts] =
    useState<AddressParts>({
      houseNumber: "",
      road: "",
      neighbourhood: "",
      city: "",
    });
  const [isLoadingAddress, setIsLoadingAddress] =
    useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>(
    [],
  );
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchDebounce =
    useRef<number | null>(null);
  const blurTimeout =
    useRef<number | null>(null);

  const defaultLat = initialLat ?? -26.1952;
  const defaultLng = initialLng ?? 28.0341;

  useEffect(() => {
    setIsMounted(true);

    return () => {
      if (searchDebounce.current) {
        window.clearTimeout(searchDebounce.current);
      }

      if (blurTimeout.current) {
        window.clearTimeout(blurTimeout.current);
      }
    };
  }, []);

  const fetchAddress = useCallback(
    async (lat: number, lng: number) => {
      setIsLoadingAddress(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        );

        if (!response.ok) {
          throw new Error("Address lookup failed.");
        }

        const data = (await response.json()) as {
          display_name?: string;
          address?: Record<string, string>;
        };

        setAddress(
          data.display_name ||
            `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        );
        setAddressParts(extractAddressParts(data.address));
      } catch (error) {
        console.error("Error fetching address:", error);
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setAddressParts({
          houseNumber: "",
          road: "",
          neighbourhood: "",
          city: "",
        });
      } finally {
        setIsLoadingAddress(false);
      }
    },
    [],
  );

  const handleMapClick = (lat: number, lng: number) => {
    setPosition({ lat, lng });
    setJustConfirmed(false);
    void fetchAddress(lat, lng);
  };

  const confirmLocation = () => {
    if (!position) return;

    onLocationSelect(
      position.lat,
      position.lng,
      address,
      addressParts,
    );
    setJustConfirmed(true);
  };

  const runSearch = useCallback(async (query: string) => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalizedQuery)}&addressdetails=1&limit=5`,
      );

      if (!response.ok) {
        throw new Error("Location search failed.");
      }

      const data = (await response.json()) as SearchResult[];
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching for location:", error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchDebounce.current) {
      window.clearTimeout(searchDebounce.current);
    }

    searchDebounce.current = window.setTimeout(() => {
      void runSearch(value);
    }, 450);
  };

  const handleSelectResult = (result: SearchResult) => {
    const lat = Number.parseFloat(result.lat);
    const lng = Number.parseFloat(result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const parts = extractAddressParts(result.address);

    setPosition({ lat, lng });
    setFlyToPosition({ lat, lng });
    setAddress(result.display_name);
    setAddressParts(parts);
    setSearchQuery(result.display_name);
    setShowResults(false);
    setJustConfirmed(true);

    onLocationSelect(
      lat,
      lng,
      result.display_name,
      parts,
    );
  };

  if (!isMounted) {
    return (
      <div
        className={`flex h-96 items-center justify-center rounded-lg ${
          resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
        }`}
      >
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--accent-500)]" />
          <p
            className={`mt-2 text-sm ${
              resolvedTheme === "dark"
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Loading map...
          </p>
        </div>
      </div>
    );
  }

  const streetTileUrl =
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const satelliteTileUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const transportationTileUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";
  const labelsTileUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

  const MAX_NATIVE_ZOOM = 19;
  const MAX_ZOOM = 20;

  return (
    <div className="relative w-full">
      <div className="relative mb-2">
        <div
          className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-colors ${
            resolvedTheme === "dark"
              ? "border-gray-600 bg-gray-700"
              : "border-gray-300 bg-white"
          }`}
        >
          <svg
            className="h-4 w-4 shrink-0 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            type="text"
            value={searchQuery}
            onChange={(event) =>
              handleSearchChange(event.target.value)
            }
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowResults(true);
              }
            }}
            onBlur={() => {
              blurTimeout.current = window.setTimeout(() => {
                setShowResults(false);
              }, 150);
            }}
            placeholder="Search for a place or address..."
            className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
              resolvedTheme === "dark"
                ? "text-gray-100 placeholder-gray-400"
                : "text-gray-900 placeholder-gray-400"
            }`}
          />

          {isSearching && (
            <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-b-2 border-blue-500" />
          )}
        </div>

        {showResults && searchResults.length > 0 && (
          <div
            className={`absolute z-[1000] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border shadow-lg ${
              resolvedTheme === "dark"
                ? "border-gray-600 bg-gray-800"
                : "border-gray-200 bg-white"
            }`}
          >
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelectResult(result)}
                className={`w-full border-b px-3 py-2 text-left text-sm transition last:border-b-0 ${
                  resolvedTheme === "dark"
                    ? "border-gray-700 text-gray-200 hover:bg-gray-700"
                    : "border-gray-100 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-2 flex justify-end">
        <div
          className={`inline-flex overflow-hidden rounded-lg border ${
            resolvedTheme === "dark"
              ? "border-gray-600"
              : "border-gray-300"
          }`}
        >
          <button
            type="button"
            onClick={() => setMapType("street")}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              mapType === "street"
                ? "bg-blue-500 text-white"
                : resolvedTheme === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Street
          </button>

          <button
            type="button"
            onClick={() => setMapType("hybrid")}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              mapType === "hybrid"
                ? "bg-blue-500 text-white"
                : resolvedTheme === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Hybrid
          </button>
        </div>
      </div>

      <div className="h-96 overflow-hidden rounded-lg border-2 border-gray-300 dark:border-gray-600">
        <MapContainer
          center={[
            position?.lat ?? defaultLat,
            position?.lng ?? defaultLng,
          ]}
          zoom={15}
          maxZoom={MAX_ZOOM}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
          zoomControl
          attributionControl
        >
          {mapType === "street" ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={streetTileUrl}
              maxZoom={MAX_ZOOM}
              maxNativeZoom={MAX_NATIVE_ZOOM}
            />
          ) : (
            <>
              <TileLayer
                attribution="Imagery &copy; Esri"
                url={satelliteTileUrl}
                maxZoom={MAX_ZOOM}
                maxNativeZoom={MAX_NATIVE_ZOOM}
                zIndex={1}
              />
              <TileLayer
                attribution="Roads &copy; Esri"
                url={transportationTileUrl}
                maxZoom={MAX_ZOOM}
                maxNativeZoom={MAX_NATIVE_ZOOM}
                zIndex={2}
              />
              <TileLayer
                attribution="Labels &copy; Esri"
                url={labelsTileUrl}
                maxZoom={MAX_ZOOM}
                maxNativeZoom={MAX_NATIVE_ZOOM}
                zIndex={3}
              />
            </>
          )}

          <ClickHandler onMapClick={handleMapClick} />
          <MapController flyToPosition={flyToPosition} />

          {position && (
            <Marker position={[position.lat, position.lng]}>
              <Popup>
                <div className="min-w-[190px] text-sm">
                  {isLoadingAddress ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-blue-500" />
                      <span>Getting address...</span>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold">
                        📍 Selected Location
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {address}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {position.lat.toFixed(6)}, {" "}
                        {position.lng.toFixed(6)}
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          confirmLocation();
                        }}
                        className={`mt-2 w-full rounded px-3 py-1.5 text-xs font-medium transition ${
                          justConfirmed
                            ? "bg-green-600 text-white"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        {justConfirmed
                          ? "✓ Location Confirmed"
                          : "✓ Use This Location"}
                      </button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div
        className={`mt-2 text-center text-xs ${
          resolvedTheme === "dark"
            ? "text-gray-400"
            : "text-gray-500"
        }`}
      >
        🖱️ Search above or click the map, then confirm the marker popup to
        autofill the address fields
      </div>
    </div>
  );
}