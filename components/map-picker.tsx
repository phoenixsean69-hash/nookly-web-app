"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export interface AddressParts {
  houseNumber: string;
  road: string;
  neighbourhood: string;
  city: string;
}

interface MapPickerProps {
  // `parts` is only populated once the user explicitly confirms a location
  // (map-click confirm button, or picking a search result).
  onLocationSelect: (lat: number, lng: number, address: string, parts: AddressParts) => void;
  theme: string;
  initialLat?: number;
  initialLng?: number;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

function extractAddressParts(address: Record<string, string> | undefined): AddressParts {
  if (!address) return { houseNumber: '', road: '', neighbourhood: '', city: '' };
  return {
    houseNumber: address.house_number || '',
    road: address.road || address.pedestrian || address.footway || '',
    neighbourhood: address.suburb || address.neighbourhood || address.quarter || address.residential || '',
    city: address.city || address.town || address.village || address.county || '',
  };
}

// Imperative helper: lets search results / re-mount pan the underlying Leaflet
// map, and re-measures the container once it's actually visible (fixes maps
// that mount at zero size inside a toggled section).
function MapController({ flyToPosition }: { flyToPosition: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (flyToPosition) {
      map.flyTo([flyToPosition.lat, flyToPosition.lng], 17, { duration: 1 });
    }
  }, [flyToPosition, map]);

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ onLocationSelect, theme, initialLat, initialLng }: MapPickerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'hybrid'>('street');

  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [flyToPosition, setFlyToPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [addressParts, setAddressParts] = useState<AddressParts>({ houseNumber: '', road: '', neighbourhood: '', city: '' });
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultLat = initialLat || -26.1952;
  const defaultLng = initialLng || 28.0341;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      setAddress(data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setAddressParts(extractAddressParts(data.address));
    } catch (error) {
      console.error('Error fetching address:', error);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setAddressParts({ houseNumber: '', road: '', neighbourhood: '', city: '' });
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setPosition({ lat, lng });
    setJustConfirmed(false);
    fetchAddress(lat, lng);
  };

  const confirmLocation = () => {
    if (!position) return;
    onLocationSelect(position.lat, position.lng, address, addressParts);
    setJustConfirmed(true);
  };

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching for location:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => runSearch(value), 450);
  };

  // Picking a search result IS the user's explicit "accept" action for that
  // location, so this fires onLocationSelect immediately - no extra confirm click.
  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const parts = extractAddressParts(result.address);

    setPosition({ lat, lng });
    setFlyToPosition({ lat, lng });
    setAddress(result.display_name);
    setAddressParts(parts);
    setSearchQuery(result.display_name);
    setShowResults(false);
    setJustConfirmed(true);

    onLocationSelect(lat, lng, result.display_name, parts);
  };

  if (!isMounted) {
    return (
      <div className={`h-96 rounded-lg flex items-center justify-center ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-100"
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-500)] mx-auto" />
          <p className={`mt-2 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            Loading map...
          </p>
        </div>
      </div>
    );
  }

  const streetTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const satelliteTileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  // Two stacked reference layers give the "hybrid" look: roads + road names,
  // then place/city/country labels and boundaries on top.
  const transportationTileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";
  const labelsTileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

  // Esri's reference/imagery services only have real tiles up to zoom 19 in
  // most areas. Without maxNativeZoom, Leaflet caps the whole map at whichever
  // layer's implicit max is lowest. Setting maxNativeZoom + a higher maxZoom
  // lets it keep zooming by upscaling the last available tile instead of stopping.
  const MAX_NATIVE_ZOOM = 19;
  const MAX_ZOOM = 20;

  return (
    <div className="relative w-full">
      {/* Search box */}
      <div className="relative mb-2">
        <div className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-colors ${
          theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
        }`}>
          <svg className={`w-4 h-4 flex-shrink-0 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onBlur={() => {
              blurTimeout.current = setTimeout(() => setShowResults(false), 150);
            }}
            placeholder="Search for a place or address..."
            className={`flex-1 bg-transparent outline-none text-sm ${
              theme === "dark" ? "text-gray-100 placeholder-gray-400" : "text-gray-900 placeholder-gray-400"
            }`}
          />
          {isSearching && (
            <div className="animate-spin h-4 w-4 border-b-2 border-blue-500 rounded-full flex-shrink-0" />
          )}
        </div>

        {showResults && searchResults.length > 0 && (
          <div className={`absolute z-[1000] w-full mt-1 rounded-lg border shadow-lg max-h-56 overflow-y-auto ${
            theme === "dark" ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
          }`}>
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()} // keep input focus so onBlur doesn't fire first
                onClick={() => handleSelectResult(result)}
                className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 transition ${
                  theme === "dark"
                    ? "border-gray-700 hover:bg-gray-700 text-gray-200"
                    : "border-gray-100 hover:bg-gray-50 text-gray-700"
                }`}
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map type toggle */}
      <div className="flex justify-end mb-2">
        <div className={`inline-flex rounded-lg border overflow-hidden ${theme === "dark" ? "border-gray-600" : "border-gray-300"}`}>
          <button
            type="button"
            onClick={() => setMapType('street')}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              mapType === 'street'
                ? "bg-blue-500 text-white"
                : theme === "dark" ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Street
          </button>
          <button
            type="button"
            onClick={() => setMapType('hybrid')}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              mapType === 'hybrid'
                ? "bg-blue-500 text-white"
                : theme === "dark" ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Hybrid
          </button>
        </div>
      </div>

      <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
        <MapContainer
          center={[position?.lat ?? defaultLat, position?.lng ?? defaultLng]}
          zoom={15}
          maxZoom={MAX_ZOOM}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          zoomControl={true}
          attributionControl={true}
        >
          {mapType === 'street' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={streetTileUrl}
              maxZoom={MAX_ZOOM}
              maxNativeZoom={MAX_NATIVE_ZOOM}
            />
          ) : (
            <>
              <TileLayer
                attribution='Imagery &copy; Esri'
                url={satelliteTileUrl}
                maxZoom={MAX_ZOOM}
                maxNativeZoom={MAX_NATIVE_ZOOM}
                zIndex={1}
              />
              <TileLayer
                attribution='Roads &copy; Esri'
                url={transportationTileUrl}
                maxZoom={MAX_ZOOM}
                maxNativeZoom={MAX_NATIVE_ZOOM}
                zIndex={2}
              />
              <TileLayer
                attribution='Labels &copy; Esri'
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
                <div className="text-sm min-w-[190px]">
                  {isLoadingAddress ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />
                      <span>Getting address...</span>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold">📍 Selected Location</div>
                      <div className="text-xs text-gray-600 mt-1">{address}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmLocation();
                        }}
                        className={`mt-2 w-full px-3 py-1.5 text-xs font-medium rounded transition ${
                          justConfirmed
                            ? "bg-green-600 text-white"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        {justConfirmed ? "✓ Location Confirmed" : "✓ Use This Location"}
                      </button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className={`mt-2 text-center text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
        🖱️ Search above or click the map, then confirm the marker popup to autofill the address fields
      </div>
    </div>
  );
}