"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Bath,
  Bed,
  Building2,
  Calendar,
  CheckCircle,
  Clock3,
  DollarSign,
  Edit,
  Eye,
  Heart,
  Home,
  Info,
  Layers3,
  LoaderCircle,
  Mail,
  MapPin,
  MapPinned,
  MessageSquare,
  Phone,
  Ruler,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Query } from "appwrite";
import type { Models } from "appwrite";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { PropertyLocationMapModal } from "@/components/property-location-map";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases, storage } from "@/lib/appwrite/config";
import {
  getOwnedProperty,
  listOrganizationTenants,
  syncOrganizationPropertyCount,
} from "@/lib/appwrite/helpers";
import { cacheService } from "@/lib/cache.service";
import { CACHE_KEYS } from "@/lib/cache-keys";
import {
  sendPropertyApprovedPushNotification,
  sendPropertyDisapprovedPushNotification,
} from "@/lib/push-notification.service";
import type { Property } from "@/types/property";
import type { Tenant } from "@/types/tenant";

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const propertiesCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!;
const propertiesBucketId =
  process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!;
const boardingPlacesCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_BOARDING_PLACES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_BOARDING_COLLECTION_ID ||
  "boarding_places";

type BoardingPlace = Models.Document & Record<string, unknown>;

interface BoardingField {
  key: string;
  label: string;
  value: string;
}

interface BoardingRoomSummary {
  roomType: string;
  price: string;
  occupiedRooms: string;
  ensuite: string;
}

interface CampusDistance {
  name: string;
  shortName: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  distanceLabel: string;
}

const BUSE_CAMPUSES = [
  {
    name: "B.U.S.E FSE Campus",
    shortName: "FSE Campus",
    latitude: -17.284669,
    longitude: 31.341083,
  },
  {
    name: "B.U.S.E Town Campus",
    shortName: "Town Campus",
    latitude: -17.311231,
    longitude: 31.333996,
  },
  {
    name: "B.U.S.E Astra Campus",
    shortName: "Astra Campus",
    latitude: -17.316745,
    longitude: 31.323141,
  },
] as const;

interface DisplayReview {
  userName: string;
  userAvatar?: string;
  review: string;
  rating: number;
  date?: string;
}

function useDashboardMargin(): string {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const update = () => {
      setMobile(window.innerWidth < 768);
      setCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    };

    const handleToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ isCollapsed?: boolean }>).detail;

      setCollapsed(
        detail?.isCollapsed ??
          localStorage.getItem("sidebarCollapsed") === "true",
      );
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("storage", update);
    window.addEventListener("sidebarToggle", handleToggle);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("storage", update);
      window.removeEventListener("sidebarToggle", handleToggle);
    };
  }, []);

  if (mobile) return "ml-0";
  return collapsed ? "ml-16" : "ml-64";
}

function fileIdFromUrl(url: string): string | null {
  const match = url.match(/\/files\/([^/?]+)/);
  return match?.[1] ?? null;
}

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMoney(value: unknown): string {
  return `$${safeNumber(value).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function formatPrice(property: Property): string {
  const price = formatMoney(property.price);
  const type = property.type?.toLowerCase();

  if (type === "land" || type === "workplace") {
    return price;
  }

  return `${price}/month`;
}

function formatDate(value?: string): string {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string): string {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseFacilities(value?: string): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function addressMatchesCity(address: string, city: string): boolean {
  if (!address.trim() || !city.trim()) return false;

  const addressParts = address
    .toLowerCase()
    .split(/[,\s.]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const cityWords = city
    .toLowerCase()
    .split(/[\s,]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return cityWords.some((cityWord) =>
    addressParts.some(
      (addressPart) =>
        addressPart === cityWord || addressPart.includes(cityWord),
    ),
  );
}

function isWithinUsProperty(property: Property, organizationCity: string) {
  const supportedType =
    property.type === "House" || property.type === "Boarding";

  return (
    supportedType &&
    addressMatchesCity(property.address || "", organizationCity)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampRating(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;

  if (!Number.isFinite(parsed)) return 0;

  return Math.min(5, Math.max(0, parsed));
}

function parseReviewValue(value: unknown): unknown {
  let current = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (typeof current !== "string") break;

    const trimmed = current.trim();

    if (
      !trimmed ||
      trimmed === "null" ||
      trimmed === "undefined" ||
      trimmed === "[]"
    ) {
      return [];
    }

    try {
      current = JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return current;
}

function parseReviews(value: unknown): DisplayReview[] {
  const parsed = parseReviewValue(value);
  const items = Array.isArray(parsed) ? parsed : [parsed];

  return items.flatMap((item): DisplayReview[] => {
    if (typeof item === "string") {
      const review = item.trim();

      return review
        ? [
            {
              userName: "Anonymous reviewer",
              review,
              rating: 0,
            },
          ]
        : [];
    }

    if (!isRecord(item)) return [];

    const reviewText =
      typeof item.review === "string"
        ? item.review.trim()
        : typeof item.comment === "string"
          ? item.comment.trim()
          : typeof item.message === "string"
            ? item.message.trim()
            : "";

    if (!reviewText) return [];

    const userNameCandidates = [
      item.userName,
      item.username,
      item.name,
      item.reviewerName,
    ];

    const userName =
      userNameCandidates.find(
        (candidate): candidate is string =>
          typeof candidate === "string" && candidate.trim().length > 0,
      )?.trim() || "Anonymous reviewer";

    const avatarCandidates = [
      item.userAvatar,
      item.avatar,
      item.reviewerAvatar,
    ];

    const userAvatar = avatarCandidates.find(
      (candidate): candidate is string =>
        typeof candidate === "string" &&
        candidate.trim().length > 0 &&
        candidate !== "null",
    );

    const dateCandidates = [
      item.date,
      item.createdAt,
      item.$createdAt,
      item.reviewDate,
    ];

    const date = dateCandidates.find(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.trim().length > 0,
    );

    return [
      {
        userName,
        userAvatar,
        review: reviewText,
        rating: clampRating(item.rating),
        date,
      },
    ];
  });
}

function getReadableReviews(property: Property): DisplayReview[] {
  const candidates: unknown[] = [
    (property as unknown as { reviews?: unknown }).reviews,
    (property as unknown as { review?: unknown }).review,
  ];

  const seen = new Set<string>();

  return candidates
    .flatMap((candidate) => parseReviews(candidate))
    .filter((review) => {
      const signature = [
        review.userName.toLowerCase(),
        review.review.toLowerCase(),
        review.rating,
        review.date || "",
      ].join("|");

      if (seen.has(signature)) return false;

      seen.add(signature);
      return true;
    });
}

function normalizeBoardingText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getNestedDocumentId(value: unknown): string {
  if (!isRecord(value)) return "";

  const candidate = value.$id ?? value.id ?? value.propertyId;
  return typeof candidate === "string" ? candidate : "";
}

function boardingRecordMatchesProperty(
  record: BoardingPlace,
  property: Property,
): boolean {
  if (record.$id === property.$id) return true;

  const relationCandidates = [
    record.propertyId,
    record.propertyID,
    record.property_id,
    record.listingId,
    record.listingID,
    record.listing_id,
    record.parentPropertyId,
    record.propertyDocumentId,
    getNestedDocumentId(record.property),
  ];

  if (
    relationCandidates.some(
      (candidate) => normalizeBoardingText(candidate) === property.$id,
    )
  ) {
    return true;
  }

  const propertyName = normalizeBoardingText(property.propertyName);
  const recordNames = [
    record.propertyName,
    record.property_name,
    record.boardingName,
    record.boardingHouseName,
    record.name,
    record.title,
  ];

  if (
    propertyName &&
    recordNames.some(
      (candidate) => normalizeBoardingText(candidate) === propertyName,
    )
  ) {
    return true;
  }

  const propertyAddress = normalizeBoardingText(property.address);
  const recordAddresses = [
    record.address,
    record.location,
    record.physicalAddress,
    record.propertyAddress,
  ];
  const creatorMatches =
    normalizeBoardingText(record.creatorId ?? record.userId ?? record.ownerId) ===
    normalizeBoardingText(property.creatorId);

  return Boolean(
    creatorMatches &&
      propertyAddress &&
      recordAddresses.some(
        (candidate) => normalizeBoardingText(candidate) === propertyAddress,
      ),
  );
}

function readBoardingValue(
  records: BoardingPlace[],
  keys: string[],
): unknown {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }
  }

  return undefined;
}

function displayBoardingValue(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => displayBoardingValue(item))
      .filter((item) => item !== "Not provided")
      .join(", ");
  }

  if (isRecord(value)) {
    const preferred =
      value.name ??
      value.label ??
      value.title ??
      value.value ??
      value.$id ??
      value.id;

    if (preferred !== undefined) {
      return displayBoardingValue(preferred);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "Recorded";
    }
  }

  return String(value);
}

function boardingLabelFromKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getAdditionalBoardingFields(
  records: BoardingPlace[],
): BoardingField[] {
  const excluded = new Set([
    "$id",
    "$createdAt",
    "$updatedAt",
    "$permissions",
    "$databaseId",
    "$collectionId",
    "propertyId",
    "propertyID",
    "property_id",
    "listingId",
    "listingID",
    "listing_id",
    "parentPropertyId",
    "propertyDocumentId",
    "property",
    "propertyName",
    "property_name",
    "boardingName",
    "boardingHouseName",
    "name",
    "title",
    "description",
    "address",
    "location",
    "physicalAddress",
    "propertyAddress",
    "creatorId",
    "userId",
    "ownerId",
    "images",
    "image1",
    "image2",
    "image3",
    "video1",
    "video2",
    "video3",
    "rooms_for_available",
    "roomsForAvailable",
    "price_per_room",
    "pricePerRoom",
    "rooms_for_occupied",
    "roomsForOccupied",
    "capacity",
    "hasEnsuite_bathrooms",
    "hasEnsuiteBathrooms",
    "hasEnsuite_bathrooms_in_rooms_for",
    "hasEnsuiteBathroomsInRoomsFor",
    "rating",
    "facilities",
    "likes",
    "isAvailable",
    "curfew",
    "requests",
    "priceThreshold",
    "new_price",
    "occupiedSlots",
    "availableSlots",
    "latitude",
    "longitude",
    "lat",
    "lng",
    "distanceToCampus",
    "distanceFromCampus",
    "campusDistance",
    "distanceToSchool",
    "walkingDistance",
  ]);

  const seen = new Set<string>();
  const fields: BoardingField[] = [];

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (excluded.has(key) || key.startsWith("$")) continue;

      const displayValue = displayBoardingValue(value);

      if (!displayValue || displayValue === "Not provided") continue;

      const signature = `${key}:${displayValue}`;

      if (seen.has(signature)) continue;

      seen.add(signature);
      fields.push({
        key: signature,
        label: boardingLabelFromKey(key),
        value: displayValue,
      });
    }
  }

  return fields;
}

function splitBoardingList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => splitBoardingList(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value === undefined || value === null) return [];

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoardingBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;

  const normalized = normalizeBoardingText(value);

  if (["true", "yes", "1", "available", "ensuite"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "0", "none", "not available"].includes(normalized)) {
    return false;
  }

  return null;
}

function getReadableBoardingRoomType(roomType: string): {
  title: string;
  description: string;
  capacity: number | null;
} {
  const normalized = roomType.trim();
  const capacityMatch = normalized.match(
    /(?:room[\s_-]*for|for)[\s_-]*(\d+)/i,
  );
  const capacity = capacityMatch ? Number(capacityMatch[1]) : null;

  if (capacity === 1) {
    return {
      title: "Private room for one person",
      description: "Designed for one resident in each room.",
      capacity,
    };
  }

  if (capacity === 2) {
    return {
      title: "Shared room for two people",
      description: "Designed for two residents sharing one room.",
      capacity,
    };
  }

  if (capacity && capacity > 2) {
    return {
      title: `Shared room for ${capacity} people`,
      description: `Designed for ${capacity} residents sharing one room.`,
      capacity,
    };
  }

  const readableName = normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    title: readableName || "Boarding room",
    description: "Boarding room option available at this property.",
    capacity: null,
  };
}

function describeOccupiedRooms(value: string): string {
  const occupiedRooms = safeNumber(value, 0);

  if (occupiedRooms <= 0) {
    return "No rooms of this type are currently occupied.";
  }

  if (occupiedRooms === 1) {
    return "1 room of this type is currently occupied.";
  }

  return `${occupiedRooms} rooms of this type are currently occupied.`;
}

function describeEnsuite(value: string): string {
  if (value === "Yes") {
    return "A private bathroom is included inside the room.";
  }

  if (value === "No") {
    return "The room does not include a private bathroom.";
  }

  return "Private-bathroom information was not provided.";
}

function getBoardingRoomSummaries(
  records: BoardingPlace[],
): BoardingRoomSummary[] {
  const roomTypes = splitBoardingList(
    readBoardingValue(records, [
      "rooms_for_available",
      "roomsForAvailable",
      "roomTypes",
      "roomType",
      "roomArrangement",
    ]),
  );

  const roomPrices = splitBoardingList(
    readBoardingValue(records, ["price_per_room", "pricePerRoom", "roomPrices"]),
  );

  const occupiedRooms = splitBoardingList(
    readBoardingValue(records, [
      "rooms_for_occupied",
      "roomsForOccupied",
      "occupiedRooms",
    ]),
  );

  const ensuiteValues = splitBoardingList(
    readBoardingValue(records, [
      "hasEnsuite_bathrooms_in_rooms_for",
      "hasEnsuiteBathroomsInRoomsFor",
      "ensuiteRooms",
    ]),
  );

  return roomTypes.map((roomType, index) => {
    const rawPrice = roomPrices[index];
    const priceNumber = safeNumber(rawPrice, Number.NaN);
    const ensuiteValue = ensuiteValues[index];
    const ensuiteBoolean = parseBoardingBoolean(ensuiteValue);
    const ensuiteByRoomName = ensuiteValues.some(
      (item) => normalizeBoardingText(item) === normalizeBoardingText(roomType),
    );

    return {
      roomType,
      price: Number.isFinite(priceNumber)
        ? `${formatMoney(priceNumber)}/room`
        : rawPrice || "Not provided",
      occupiedRooms: occupiedRooms[index] || "0",
      ensuite:
        ensuiteBoolean === true || ensuiteByRoomName
          ? "Yes"
          : ensuiteBoolean === false
            ? "No"
            : "Not specified",
    };
  });
}

function getBoardingVideos(records: BoardingPlace[]): string[] {
  const videos = records.flatMap((record) => [
    record.video1,
    record.video2,
    record.video3,
    record.video,
  ]);

  return Array.from(
    new Set(
      videos.filter(
        (video): video is string =>
          typeof video === "string" && video.trim().length > 0,
      ),
    ),
  );
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPropertyCoordinates(
  property: Property,
  boardingRecords: BoardingPlace[],
): { latitude: number; longitude: number } | null {
  const latitude =
    parseCoordinate(property.latitude) ??
    parseCoordinate(
      readBoardingValue(boardingRecords, [
        "latitude",
        "lat",
        "propertyLatitude",
      ]),
    );

  const longitude =
    parseCoordinate(property.longitude) ??
    parseCoordinate(
      readBoardingValue(boardingRecords, [
        "longitude",
        "lng",
        "lon",
        "propertyLongitude",
      ]),
    );

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateHaversineDistanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const earthRadiusKm = 6371.0088;
  const latitudeDifference = toRadians(toLatitude - fromLatitude);
  const longitudeDifference = toRadians(toLongitude - fromLongitude);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  const angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * angularDistance;
}

function formatCampusDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(2)} km`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

function calculateCampusDistances(
  property: Property,
  boardingRecords: BoardingPlace[],
): CampusDistance[] {
  const coordinates = getPropertyCoordinates(property, boardingRecords);

  if (!coordinates) return [];

  return BUSE_CAMPUSES.map((campus) => {
    const distanceKm = calculateHaversineDistanceKm(
      coordinates.latitude,
      coordinates.longitude,
      campus.latitude,
      campus.longitude,
    );

    return {
      ...campus,
      distanceKm,
      distanceLabel: formatCampusDistance(distanceKm),
    };
  }).sort((first, second) => first.distanceKm - second.distanceKm);
}

function buildMapUrl(property: Property): string | null {
  const latitude = property.latitude;
  const longitude = property.longitude;

  if (
    latitude === undefined ||
    latitude === null ||
    latitude === "" ||
    longitude === undefined ||
    longitude === null ||
    longitude === ""
  ) {
    return null;
  }

  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
    String(latitude),
  )}&mlon=${encodeURIComponent(String(longitude))}#map=17/${encodeURIComponent(
    String(latitude),
  )}/${encodeURIComponent(String(longitude))}`;
}

export default function PropertyDetailsPage() {
  const { organization } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const propertyId = params.id;
  const margin = useDashboardMargin();

  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [boardingPlaces, setBoardingPlaces] = useState<BoardingPlace[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [disapproving, setDisapproving] = useState(false);

  const loadData = useCallback(async () => {
    if (!organization || !propertyId) return;

    setLoading(true);

    try {
      const propertyDocument = (await databases.getDocument(
        databaseId,
        propertiesCollectionId,
        propertyId,
      )) as unknown as Property;

      const organizationOwnsProperty =
        propertyDocument.creatorId === organization.userId;

      const canViewThroughWithinUs =
        !organizationOwnsProperty &&
        isWithinUsProperty(propertyDocument, organization.city || "");

      if (!organizationOwnsProperty && !canViewThroughWithinUs) {
        throw new Error("You do not have access to this property.");
      }

      let tenantDocuments: Tenant[] = [];
      let matchingBoardingPlaces: BoardingPlace[] = [];

      if (organizationOwnsProperty) {
        const response = await listOrganizationTenants(organization.$id, [
          Query.orderDesc("$createdAt"),
        ]);

        tenantDocuments = response as unknown as Tenant[];
      }

      try {
        const boardingResponse = await databases.listDocuments(
          databaseId,
          boardingPlacesCollectionId,
          [Query.limit(1000)],
        );

        matchingBoardingPlaces = (
          boardingResponse.documents as unknown as BoardingPlace[]
        ).filter((record) =>
          boardingRecordMatchesProperty(record, propertyDocument),
        );
      } catch (boardingError) {
        console.warn(
          "Unable to load matching boarding_places records:",
          boardingError,
        );
      }

      setProperty(propertyDocument);
      setIsOwner(organizationOwnsProperty);
      setTenants(tenantDocuments);
      setBoardingPlaces(matchingBoardingPlaces);
      setSelectedImage(
        propertyDocument.image1 ||
          propertyDocument.image2 ||
          propertyDocument.image3 ||
          "",
      );
    } catch (error) {
      console.error("Unable to load property details:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load this property.",
      );

      router.replace("/dashboard/within-us");
    } finally {
      setLoading(false);
    }
  }, [organization, propertyId, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const propertyTenants = useMemo(() => {
    if (!property || !isOwner) return [];

    return tenants.filter(
      (tenant) =>
        tenant.status === "active" &&
        tenant.propertyName === property.propertyName,
    );
  }, [isOwner, property, tenants]);

  const deleteProperty = async () => {
    if (!organization || !property || !isOwner) return;

    if (propertyTenants.length > 0) {
      toast.error(
        "Move or remove active tenants before deleting this property.",
      );
      setShowDelete(false);
      return;
    }

    setDeleting(true);

    try {
      await getOwnedProperty(property.$id, organization.userId);

      await databases.deleteDocument(
        databaseId,
        propertiesCollectionId,
        property.$id,
      );

      await Promise.allSettled(
        [property.image1, property.image2, property.image3]
          .filter((url): url is string => Boolean(url))
          .map(async (url) => {
            const fileId = fileIdFromUrl(url);

            if (!fileId) return;

            await storage.deleteFile(propertiesBucketId, fileId);
          }),
      );

      cacheService.remove(
        CACHE_KEYS.organizationProperties(organization.$id),
      );
      cacheService.remove(CACHE_KEYS.PROPERTIES);
      cacheService.remove(CACHE_KEYS.PROPERTY(property.$id));

      await syncOrganizationPropertyCount(organization.userId);

      toast.success("Property deleted.");
      router.replace("/dashboard/properties");
    } catch (error) {
      console.error("Unable to delete property:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to delete property.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const approveProperty = async () => {
    const alreadyApproved = property?.organizationApproved === true;

    if (!organization || !property || isOwner || alreadyApproved) {
      return;
    }

    if (!navigator.onLine) {
      toast.error("Connect to the internet before approving this property.");
      return;
    }

    if (!isWithinUsProperty(property, organization.city || "")) {
      toast.error(
        "This property is not eligible for approval by your organization.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Approve "${property.propertyName}"? This will mark the property as organization-approved for students.`,
    );

    if (!confirmed) return;

    setApproving(true);

    try {
      await databases.updateDocument(
        databaseId,
        propertiesCollectionId,
        property.$id,
        {
          organizationApproved: true,
        },
      );

      const verifiedDocument = (await databases.getDocument(
        databaseId,
        propertiesCollectionId,
        property.$id,
      )) as unknown as Property;

      const approvedInDatabase =
        verifiedDocument.organizationApproved === true;

      setProperty((current) =>
        current
          ? {
              ...current,
              organizationApproved: approvedInDatabase ? true : null,
              $updatedAt: verifiedDocument.$updatedAt || current.$updatedAt,
            }
          : current,
      );

      if (!approvedInDatabase) {
        throw new Error(
          "Appwrite did not save the approval. The property is still not approved.",
        );
      }

      cacheService.remove(CACHE_KEYS.PROPERTIES);
      cacheService.remove(CACHE_KEYS.PROPERTY(property.$id));

      let landlordNotified = false;

      try {
        const delivery = await sendPropertyApprovedPushNotification({
          recipientUserId: verifiedDocument.creatorId || property.creatorId,
          propertyId: verifiedDocument.$id || property.$id,
          propertyName:
            verifiedDocument.propertyName || property.propertyName,
          organizationId: organization.$id,
          organizationName: organization.name,
        });

        landlordNotified = delivery.accepted > 0;

        if (!landlordNotified) {
          console.warn(
            "Property approval was saved, but no landlord push notification was accepted.",
            delivery,
          );
        }
      } catch (pushError) {
        console.error(
          "Property approval was saved, but landlord notification failed:",
          pushError,
        );
      }

      toast.success(
        landlordNotified
          ? "Property approved and landlord notified."
          : "Property approved successfully.",
      );

      if (!landlordNotified) {
        toast.error(
          "The property was approved, but the landlord push notification was not delivered.",
        );
      }
    } catch (error) {
      console.error("Unable to approve property:", error);

      const errorCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "number"
          ? (error as { code: number }).code
          : null;

      toast.error(
        errorCode === 401 || errorCode === 403
          ? "Your Appwrite permissions do not allow this organization to approve the property."
          : error instanceof Error
            ? error.message
            : "Failed to approve the property.",
      );
    } finally {
      setApproving(false);
    }
  };

  const disapproveProperty = async () => {
    const currentlyApproved = property?.organizationApproved === true;

    if (!organization || !property || isOwner || !currentlyApproved) {
      return;
    }

    if (!navigator.onLine) {
      toast.error("Connect to the internet before disapproving this property.");
      return;
    }

    if (!isWithinUsProperty(property, organization.city || "")) {
      toast.error(
        "This property is not eligible for review by your organization.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Disapprove "${property.propertyName}"? This will remove the organization-approved badge for students.`,
    );

    if (!confirmed) return;

    setDisapproving(true);

    try {
      await databases.updateDocument(
        databaseId,
        propertiesCollectionId,
        property.$id,
        {
          organizationApproved: false,
        },
      );

      const verifiedDocument = (await databases.getDocument(
        databaseId,
        propertiesCollectionId,
        property.$id,
      )) as unknown as Property;

      const disapprovedInDatabase =
        verifiedDocument.organizationApproved === false;

      setProperty((current) =>
        current
          ? {
              ...current,
              organizationApproved: disapprovedInDatabase ? false : true,
              $updatedAt: verifiedDocument.$updatedAt || current.$updatedAt,
            }
          : current,
      );

      if (!disapprovedInDatabase) {
        throw new Error(
          "Appwrite did not save the disapproval. The property is still approved.",
        );
      }

      cacheService.remove(CACHE_KEYS.PROPERTIES);
      cacheService.remove(CACHE_KEYS.PROPERTY(property.$id));

      let landlordNotified = false;

      try {
        const delivery = await sendPropertyDisapprovedPushNotification({
          recipientUserId: verifiedDocument.creatorId || property.creatorId,
          propertyId: verifiedDocument.$id || property.$id,
          propertyName:
            verifiedDocument.propertyName || property.propertyName,
          organizationId: organization.$id,
          organizationName: organization.name,
        });

        landlordNotified = delivery.accepted > 0;

        if (!landlordNotified) {
          console.warn(
            "Property disapproval was saved, but no landlord push notification was accepted.",
            delivery,
          );
        }
      } catch (pushError) {
        console.error(
          "Property disapproval was saved, but landlord notification failed:",
          pushError,
        );
      }

      toast.success(
        landlordNotified
          ? "Property disapproved and landlord notified."
          : "Property disapproved successfully.",
      );

      if (!landlordNotified) {
        toast.error(
          "The property was disapproved, but the landlord push notification was not delivered.",
        );
      }
    } catch (error) {
      console.error("Unable to disapprove property:", error);

      const errorCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "number"
          ? (error as { code: number }).code
          : null;

      toast.error(
        errorCode === 401 || errorCode === 403
          ? "Your Appwrite permissions do not allow this organization to disapprove the property."
          : error instanceof Error
            ? error.message
            : "Failed to disapprove the property.",
      );
    } finally {
      setDisapproving(false);
    }
  };

  const dark = resolvedTheme === "dark";

  if (loading) {
    return (
      <ProtectedRoute>
        <div
          className={`min-h-screen ${
            dark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"
          }`}
        >
          <Sidebar />

          <div className={`${margin} transition-all duration-300`}>
            <Header />

            <div className="flex h-[70vh] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent-700)] dark:border-gray-700" />
                <p className="mt-4 text-sm text-gray-500">
                  Loading property…
                </p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!property) return null;

  const readableReviews = getReadableReviews(property);
  const ratedReviews = readableReviews.filter((review) => review.rating > 0);
  const calculatedRating =
    ratedReviews.length > 0
      ? ratedReviews.reduce((total, review) => total + review.rating, 0) /
        ratedReviews.length
      : clampRating(property.rating);

  const ratingLabel =
    calculatedRating > 0
      ? calculatedRating.toFixed(
          Number.isInteger(calculatedRating) ? 0 : 1,
        )
      : "Not rated";

  const images = [
    property.image1,
    property.image2,
    property.image3,
  ].filter((image): image is string => Boolean(image));

  const facilities = parseFacilities(property.facilities);

  const declaredCapacity = Math.max(
    0,
    safeNumber(property.totalSlots ?? property.roomFor),
  );

  const explicitOccupiedSlots = safeNumber(
    property.occupiedSlots,
    Number.NaN,
  );

  const occupiedSlots = Math.max(
    0,
    Math.min(
      declaredCapacity || Number.MAX_SAFE_INTEGER,
      Number.isFinite(explicitOccupiedSlots)
        ? Math.max(explicitOccupiedSlots, propertyTenants.length)
        : isOwner
          ? propertyTenants.length
          : property.isAvailable === false
            ? declaredCapacity
            : 0,
    ),
  );

  const explicitAvailableSlots = safeNumber(
    property.availableSlots,
    Number.NaN,
  );

  const availableSlots = Math.max(
    0,
    Math.min(
      declaredCapacity || Number.MAX_SAFE_INTEGER,
      Number.isFinite(explicitAvailableSlots)
        ? explicitAvailableSlots
        : Math.max(declaredCapacity - occupiedSlots, 0),
    ),
  );

  const occupancyPercent =
    declaredCapacity > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((occupiedSlots / declaredCapacity) * 100),
          ),
        )
      : 0;

  const mapUrl = buildMapUrl(property);
  const isOrganizationApproved =
    property.organizationApproved === true;

  const approvalLabel =
    property.organizationApproved === true
      ? "Organization approved"
      : property.organizationApproved === false
        ? "Disapproved"
        : "Pending approval";

  const approvalClasses =
    property.organizationApproved === true
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
      : property.organizationApproved === false
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";

  const availabilityLabel =
    property.isAvailable !== false ? "Available" : "Occupied";

  const availabilityClasses =
    property.isAvailable !== false
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
      : "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";

  const isBoardingProperty =
    property.type?.toLowerCase().includes("boarding") ||
    property.propertyType?.toLowerCase().includes("boarding") ||
    boardingPlaces.length > 0;

  const boardingRooms = getBoardingRoomSummaries(boardingPlaces);
  const boardingVideos = getBoardingVideos(boardingPlaces);
  const campusDistances = calculateCampusDistances(property, boardingPlaces);
  const nearestCampus = campusDistances[0] ?? null;

  const boardingCapacity = Math.max(
    declaredCapacity,
    safeNumber(
      readBoardingValue(boardingPlaces, ["capacity", "totalSlots", "roomFor"]),
    ),
  );

  const boardingHasEnsuiteValue = readBoardingValue(boardingPlaces, [
    "hasEnsuite_bathrooms",
    "hasEnsuiteBathrooms",
    "ensuiteBathrooms",
  ]);

  const boardingHasEnsuite =
    parseBoardingBoolean(boardingHasEnsuiteValue) === true ||
    boardingRooms.some((room) => room.ensuite === "Yes");

  const boardingRules = displayBoardingValue(
    readBoardingValue(boardingPlaces, [
      "rules",
      "houseRules",
      "boardingRules",
      "restrictions",
      "notes",
    ]),
  );

  const boardingExtraFields = getAdditionalBoardingFields(boardingPlaces);

  const propertyMetadata = [
    {
      icon: Building2,
      label: "Listing type",
      value: property.type || "Not provided",
    },
    {
      icon: Layers3,
      label: "Property category",
      value:
        property.propertyType ||
        property.type ||
        "Not provided",
    },
    {
      icon: Clock3,
      label: "Curfew",
      value: property.curfew || "No curfew specified",
    },
    {
      icon: ShieldCheck,
      label: "Agent",
      value: property.agent || "No agent listed",
    },
    {
      icon: Calendar,
      label: "Created",
      value: formatDateTime(property.$createdAt),
    },
    {
      icon: Calendar,
      label: "Last updated",
      value: formatDateTime(property.$updatedAt),
    },
    {
      icon: Info,
      label: "Property ID",
      value: property.$id,
    },
    {
      icon: UserRound,
      label: "Creator ID",
      value: property.creatorId || "Not provided",
    },
  ];

  return (
    <ProtectedRoute>
      <div
        className={`min-h-screen ${
          dark
            ? "bg-gray-950 text-white"
            : "bg-gradient-to-br from-blue-50 via-white to-orange-50 text-gray-900"
        }`}
      >
        <Sidebar />

        <div className={`${margin} transition-all duration-300`}>
          <Header />

          <main className="p-3 sm:p-5 lg:p-6">
            <div className="mx-auto max-w-7xl">
              <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="mt-0.5 rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-black sm:text-3xl">
                        {property.propertyName}
                      </h1>

                      {!isOwner && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Within Us
                        </span>
                      )}
                    </div>

                    <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{property.address || "No address provided"}</span>
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${availabilityClasses}`}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        {availabilityLabel}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${approvalClasses}`}
                      >
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {approvalLabel}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                        <Building2 className="h-3.5 w-3.5" />
                        {property.type || "Property"}
                      </span>
                    </div>
                  </div>
                </div>

                {isOwner ? (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/properties/${property.$id}/edit`}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Edit className="h-4 w-4" />
                      Edit property
                    </Link>

                    <button
                      type="button"
                      onClick={() => setShowDelete(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void approveProperty()}
                      disabled={
                        approving ||
                        disapproving ||
                        isOrganizationApproved
                      }
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed ${
                        isOrganizationApproved
                          ? "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                          : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                      }`}
                    >
                      {approving ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}

                      {approving
                        ? "Approving…"
                        : isOrganizationApproved
                          ? "Organization approved"
                          : "Approve property"}
                    </button>

                    {isOrganizationApproved && (
                      <button
                        type="button"
                        onClick={() => void disapproveProperty()}
                        disabled={approving || disapproving}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {disapproving ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}

                        {disapproving
                          ? "Disapproving…"
                          : "Disapprove property"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {!isOwner && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <p className="font-semibold">
                      Organization viewing privilege
                    </p>
                    <p className="mt-1 text-sm leading-6 text-blue-700 dark:text-blue-300">
                      This listing is visible through Within Us because it
                      matches your organization&apos;s city. You can inspect
                      its full public details and manage organization
                      approval. Tenant identities and owner-only controls
                      remain private.
                    </p>
                  </div>
                </div>
              )}

              <section className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
                <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-950">
                    {selectedImage ? (
                      <Image
                        src={selectedImage}
                        alt={property.propertyName}
                        fill
                        sizes="(max-width: 1280px) 100vw, 70vw"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Home className="h-20 w-20 text-gray-300 dark:text-gray-700" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/10" />

                    <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="text-white">
                        <p className="text-sm font-semibold text-white/75">
                          {property.type || "Property"}
                        </p>
                        <p className="text-2xl font-black sm:text-3xl">
                          {formatPrice(property)}
                        </p>
                      </div>

                      <span className="self-start rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md sm:self-auto">
                        {images.length} image
                        {images.length === 1 ? "" : "s"} available
                      </span>
                    </div>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 p-3">
                      {images.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setSelectedImage(image)}
                          className={`relative aspect-[4/3] overflow-hidden rounded-2xl border-2 transition ${
                            selectedImage === image
                              ? "border-[var(--accent-700)] shadow-sm"
                              : "border-transparent opacity-75 hover:opacity-100"
                          }`}
                          aria-label={`Show image ${index + 1}`}
                        >
                          <Image
                            src={image}
                            alt={`${property.propertyName} image ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <aside className="space-y-5">
                  <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                      Pricing
                    </p>

                    <p className="mt-2 text-3xl font-black text-[var(--accent-700)]">
                      {formatPrice(property)}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <MiniValue
                        label="Listed price"
                        value={formatMoney(property.price)}
                      />
                      <MiniValue
                        label="Lowest accepted"
                        value={formatMoney(
                          property.priceThreshold ?? property.price,
                        )}
                      />
                    </div>
                  </section>

                  <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                          Occupancy
                        </p>
                        <p className="mt-1 text-xl font-black">
                          {occupancyPercent}% occupied
                        </p>
                      </div>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-black dark:bg-gray-800">
                        {occupiedSlots}/{declaredCapacity || 0}
                      </span>
                    </div>

                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-[var(--accent-700)] transition-[width] duration-500"
                        style={{ width: `${occupancyPercent}%` }}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniValue
                        label="Total slots"
                        value={declaredCapacity}
                      />
                      <MiniValue
                        label="Occupied"
                        value={occupiedSlots}
                      />
                      <MiniValue
                        label="Available"
                        value={availableSlots}
                      />
                    </div>
                  </section>

                  <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                      Listing health
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <HealthRow
                        icon={Eye}
                        label="Views"
                        value={property.views || 0}
                      />
                      <HealthRow
                        icon={Heart}
                        label="Likes"
                        value={property.likes || 0}
                      />
                      <HealthRow
                        icon={MessageSquare}
                        label="Requests"
                        value={property.requests || 0}
                      />
                      <HealthRow
                        icon={Star}
                        label="Rating"
                        value={ratingLabel}
                      />
                    </div>
                  </section>
                </aside>
              </section>

              <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  icon={Bed}
                  label="Bedrooms"
                  value={property.bedrooms || 0}
                  hint="Sleeping rooms"
                />
                <StatTile
                  icon={Bath}
                  label="Bathrooms"
                  value={property.bathrooms || 0}
                  hint="Bathing spaces"
                />
                <StatTile
                  icon={Ruler}
                  label="Area"
                  value={`${property.area || 0} m²`}
                  hint="Recorded property size"
                />
                <StatTile
                  icon={Users}
                  label="Capacity"
                  value={declaredCapacity || property.roomFor || 0}
                  hint="Maximum occupants"
                />
              </section>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
                <section className="space-y-5">
                  <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[var(--accent-700)]" />
                      <h2 className="text-lg font-black">
                        Property overview
                      </h2>
                    </div>

                    <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-600 dark:text-gray-300">
                      {property.description?.trim() ||
                        "No description has been added for this property yet."}
                    </p>
                  </article>

                  <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-[var(--accent-700)]" />
                        <h2 className="text-lg font-black">
                          Facilities and amenities
                        </h2>
                      </div>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold dark:bg-gray-800">
                        {facilities.length}
                      </span>
                    </div>

                    {facilities.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {facilities.map((facility) => (
                          <span
                            key={facility}
                            className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-200"
                          >
                            {facility}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-950/60 dark:text-gray-400">
                        No facilities have been listed.
                      </p>
                    )}
                  </article>

                  {isBoardingProperty && (
                    <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Home className="h-5 w-5 text-[var(--accent-700)]" />
                            <h2 className="text-lg font-black">
                              Boarding house details
                            </h2>
                          </div>

                          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                            Room, occupancy and accommodation information from
                            the linked boarding_places record.
                          </p>
                        </div>

                        <span className="self-start rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {boardingPlaces.length > 0
                            ? `${boardingPlaces.length} linked record${
                                boardingPlaces.length === 1 ? "" : "s"
                              }`
                            : "Property record only"}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <BoardingValueCard
                          icon={Bed}
                          label="Room types"
                          value={
                            boardingRooms.length > 0
                              ? boardingRooms.length.toString()
                              : "Not provided"
                          }
                        />

                        <BoardingValueCard
                          icon={Bath}
                          label="Ensuite bathrooms"
                          value={boardingHasEnsuite ? "Available" : "Not recorded"}
                        />

                        <BoardingValueCard
                          icon={Users}
                          label="Boarding capacity"
                          value={
                            boardingCapacity > 0
                              ? `${boardingCapacity} people`
                              : "Not provided"
                          }
                        />

                        <BoardingValueCard
                          icon={MapPinned}
                          label="Nearest B.U.S.E campus"
                          value={
                            nearestCampus
                              ? `${nearestCampus.shortName} · ${nearestCampus.distanceLabel}`
                              : "Location coordinates required"
                          }
                        />
                      </div>

                      {boardingRooms.length > 0 && (
                        <section className="mt-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="font-black">
                                Boarding room options
                              </h3>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Easy-to-read room choices, prices, current use
                                and bathroom arrangements.
                              </p>
                            </div>

                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold dark:bg-gray-800">
                              {boardingRooms.length} option
                              {boardingRooms.length === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {boardingRooms.map((room, index) => {
                              const readableRoom =
                                getReadableBoardingRoomType(room.roomType);
                              const hasEnsuite = room.ensuite === "Yes";

                              return (
                                <article
                                  key={`${room.roomType}-${index}`}
                                  className={`rounded-2xl border p-5 ${
                                    hasEnsuite
                                      ? "border-gray-800 bg-gray-800 dark:border-gray-700 dark:bg-gray-900"
                                      : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/60"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-lg font-black">
                                        {readableRoom.title}
                                      </p>
                                      <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                        {readableRoom.description}
                                      </p>
                                    </div>

                                    <span
                                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                        hasEnsuite
                                          ? "bg-[var(--accent-700)] text-white"
                                          : "bg-gray-200 text-gray-700 dark:bg-gray-900 dark:text-gray-200"
                                      }`}
                                    >
                                      {hasEnsuite
                                        ? "Private bathroom"
                                        : "Shared bathroom"}
                                    </span>
                                  </div>

                                  <div className="mt-5">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                                      Price per room
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-[var(--accent-700)]">
                                      {room.price}
                                    </p>
                                  </div>

                                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-[var(--accent-700)]" />
                                        <p className="text-xs font-black">
                                          Room capacity
                                        </p>
                                      </div>
                                      <p className="mt-2 text-sm leading-5 text-gray-600 dark:text-gray-300">
                                        {readableRoom.capacity
                                          ? readableRoom.capacity === 1
                                            ? "1 person stays in each room."
                                            : `${readableRoom.capacity} people share each room.`
                                          : "The number of people per room was not specified."}
                                      </p>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                                      <div className="flex items-center gap-2">
                                        <Bed className="h-4 w-4 text-[var(--accent-700)]" />
                                        <p className="text-xs font-black">
                                          Current occupancy
                                        </p>
                                      </div>
                                      <p className="mt-2 text-sm leading-5 text-gray-600 dark:text-gray-300">
                                        {describeOccupiedRooms(
                                          room.occupiedRooms,
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                                    <div className="flex items-start gap-2">
                                      <Bath className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-700)]" />
                                      <div>
                                        <p className="text-xs font-black">
                                          Bathroom arrangement
                                        </p>
                                        <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
                                          {describeEnsuite(room.ensuite)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      )}

                      <section className="mt-5 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <MapPinned className="h-5 w-5 text-[var(--accent-700)]" />
                          <div>
                            <h3 className="font-black">
                              Distance to B.U.S.E campuses
                            </h3>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Straight-line distance calculated from the
                              property&apos;s saved map coordinates.
                            </p>
                          </div>
                        </div>

                        {campusDistances.length > 0 ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {campusDistances.map((campus, index) => (
                              <div
                                key={campus.name}
                                className={`rounded-2xl border p-4 ${
                                  index === 0
                                    ? "border-[var(--accent-200)] bg-[var(--accent-50)] dark:border-[var(--accent-800)] dark:bg-[var(--accent-950)]/25"
                                    : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/60"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black">
                                      {campus.name}
                                    </p>
                                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                      {campus.latitude}, {campus.longitude}
                                    </p>
                                  </div>

                                  {index === 0 && (
                                    <span className="rounded-full bg-[var(--accent-700)] px-2.5 py-1 text-[10px] font-bold text-white">
                                      Nearest
                                    </span>
                                  )}
                                </div>

                                <p className="mt-4 text-2xl font-black text-[var(--accent-700)]">
                                  {campus.distanceLabel}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-950/60 dark:text-gray-400">
                            Add the property latitude and longitude through the
                            map picker to calculate distances to FSE, Town and
                            Astra campuses.
                          </p>
                        )}
                      </section>

                      <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                              Boarding occupancy
                            </p>
                            <p className="mt-1 text-lg font-black">
                              {occupiedSlots} occupied · {availableSlots}{" "}
                              available · {boardingCapacity || 0} total
                            </p>
                          </div>

                          <span className="rounded-full bg-white px-3 py-1 text-sm font-black shadow-sm dark:bg-gray-900">
                            {occupancyPercent}%
                          </span>
                        </div>

                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                          <div
                            className="h-full rounded-full bg-[var(--accent-700)]"
                            style={{ width: `${occupancyPercent}%` }}
                          />
                        </div>
                      </div>

                      {boardingVideos.length > 0 && (
                        <section className="mt-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="font-black">Boarding videos</h3>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Walk-through videos stored with the boarding
                                listing.
                              </p>
                            </div>

                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold dark:bg-gray-800">
                              {boardingVideos.length}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {boardingVideos.map((video, index) => (
                              <video
                                key={`${video}-${index}`}
                                src={video}
                                controls
                                preload="metadata"
                                className="aspect-video w-full rounded-2xl border border-gray-200 bg-black object-cover dark:border-gray-800"
                              >
                                Your browser does not support video playback.
                              </video>
                            ))}
                          </div>
                        </section>
                      )}

                      {boardingRules !== "Not provided" && (
                        <section className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            House rules and boarding notes
                          </p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700 dark:text-gray-300">
                            {boardingRules}
                          </p>
                        </section>
                      )}

                      {boardingExtraFields.length > 0 && (
                        <section className="mt-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="font-black">
                                Additional boarding information
                              </h3>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Other boarding-place fields not already shown
                                above.
                              </p>
                            </div>

                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold dark:bg-gray-800">
                              {boardingExtraFields.length}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {boardingExtraFields.map((field) => (
                              <div
                                key={field.key}
                                className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                              >
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                                  {field.label}
                                </p>
                                <p className="mt-1 break-words text-sm font-semibold leading-6">
                                  {field.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {boardingPlaces.length === 0 && (
                        <p className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-950/60 dark:text-gray-400">
                          This property is marked as a boarding house, but no
                          separate boarding_places record matched its ID, name
                          or address. Main-property values are shown where
                          available.
                        </p>
                      )}
                    </article>
                  )}

                  {isOwner && (
                    <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-[var(--accent-700)]" />
                          <h2 className="text-lg font-black">
                            Active tenant roster
                          </h2>
                        </div>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold dark:bg-gray-800">
                          {propertyTenants.length} active
                        </span>
                      </div>

                      {propertyTenants.length > 0 ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {propertyTenants.map((tenant) => (
                            <Link
                              key={tenant.$id}
                              href={`/dashboard/tenants/${tenant.$id}/edit`}
                              className="rounded-2xl border border-gray-200 p-4 transition hover:border-[var(--accent-700)] hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                            >
                              <div className="flex items-start gap-3">
                                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                  {tenant.avatar ? (
                                    <Image
                                      src={tenant.avatar}
                                      alt={tenant.name}
                                      fill
                                      sizes="48px"
                                      className="object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <UserRound className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-black">
                                    {tenant.name}
                                  </p>
                                  <p className="mt-0.5 truncate text-xs text-gray-500">
                                    {tenant.identifier ||
                                      tenant.Identifier ||
                                      "No identifier"}
                                  </p>
                                </div>

                                <CheckCircle className="h-4 w-4 shrink-0 text-blue-500" />
                              </div>

                              <div className="mt-4 grid gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5" />
                                  {tenant.phone ||
                                    tenant.tenantPhone ||
                                    "No phone"}
                                </span>

                                <span className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5" />
                                  {tenant.email || "No email"}
                                </span>

                                <span className="flex items-center gap-2">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  {formatMoney(tenant.monthlyRent)} monthly rent
                                </span>

                                <span className="flex items-center gap-2">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Lease started{" "}
                                  {formatDate(tenant.leaseStartDate)}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 rounded-2xl bg-gray-50 p-5 text-center text-sm text-gray-500 dark:bg-gray-950/60 dark:text-gray-400">
                          No active tenants are linked to this property.
                        </p>
                      )}
                    </article>
                  )}

                  <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                          <h2 className="text-lg font-black">
                            Reviews and rating
                          </h2>
                        </div>

                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {readableReviews.length} written{" "}
                          {readableReviews.length === 1
                            ? "review"
                            : "reviews"}
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                        <span className="text-xl font-black">
                          {ratingLabel}
                        </span>
                        {calculatedRating > 0 && (
                          <span className="text-xs text-gray-500">
                            / 5
                          </span>
                        )}
                      </div>
                    </div>

                    {readableReviews.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        {readableReviews.map((review, index) => {
                          const initial =
                            review.userName.charAt(0).toUpperCase() || "A";

                          return (
                            <article
                              key={`${review.userName}-${review.date || "undated"}-${index}`}
                              className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                            >
                              <div className="flex items-start gap-3">
                                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-100)] font-black text-[var(--accent-700)] dark:bg-[var(--accent-950)]">
                                  {review.userAvatar ? (
                                    <Image
                                      src={review.userAvatar}
                                      alt={review.userName}
                                      fill
                                      sizes="44px"
                                      className="object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    initial
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="font-black">
                                        {review.userName}
                                      </p>

                                      <div className="mt-1 flex items-center gap-0.5">
                                        {Array.from({ length: 5 }).map(
                                          (_, starIndex) => (
                                            <Star
                                              key={starIndex}
                                              className={`h-4 w-4 ${
                                                starIndex < review.rating
                                                  ? "fill-amber-400 text-amber-400"
                                                  : "text-gray-300 dark:text-gray-600"
                                              }`}
                                            />
                                          ),
                                        )}
                                      </div>
                                    </div>

                                    <time className="text-xs text-gray-400">
                                      {formatDate(review.date)}
                                    </time>
                                  </div>

                                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    {review.review}
                                  </p>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-2xl bg-gray-50 p-5 text-sm text-gray-500 dark:bg-gray-950/60 dark:text-gray-400">
                        No written reviews are available yet.
                      </p>
                    )}
                  </article>
                </section>

                <aside className="space-y-5">
                  <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-[var(--accent-700)]" />
                      <h2 className="text-lg font-black">
                        Complete listing information
                      </h2>
                    </div>

                    <div className="mt-4 space-y-3">
                      {propertyMetadata.map((item) => (
                        <DetailRow
                          key={item.label}
                          icon={item.icon}
                          label={item.label}
                          value={String(item.value)}
                        />
                      ))}
                    </div>
                  </article>

                  <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                      <MapPinned className="h-5 w-5 text-[var(--accent-700)]" />
                      <h2 className="text-lg font-black">
                        Location information
                      </h2>
                    </div>

                    <div className="mt-4 space-y-3">
                      <DetailRow
                        icon={MapPin}
                        label="Full address"
                        value={property.address || "Not provided"}
                      />

                      <DetailRow
                        icon={MapPinned}
                        label="Stored location"
                        value={
                          property.location ||
                          property.address ||
                          "Not provided"
                        }
                      />

                      <DetailRow
                        icon={MapPinned}
                        label="Coordinates"
                        value={
                          mapUrl
                            ? `${property.latitude}, ${property.longitude}`
                            : "No coordinates stored"
                        }
                      />
                    </div>

                    {mapUrl && (
                      <button
                        type="button"
                        onClick={() => setShowLocationMap(true)}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        <MapPinned className="h-4 w-4" />
                        View in Nookly map
                      </button>
                    )}
                  </article>

                  <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                      <WalletCards className="h-5 w-5 text-[var(--accent-700)]" />
                      <h2 className="text-lg font-black">
                        Financial summary
                      </h2>
                    </div>

                    <div className="mt-4 space-y-3">
                      <DetailRow
                        icon={DollarSign}
                        label="Advertised price"
                        value={formatPrice(property)}
                      />

                      <DetailRow
                        icon={DollarSign}
                        label="Lowest acceptable price"
                        value={formatMoney(
                          property.priceThreshold ?? property.price,
                        )}
                      />

                      <DetailRow
                        icon={Users}
                        label="Capacity basis"
                        value={
                          declaredCapacity > 0
                            ? `${declaredCapacity} total slots`
                            : "No slot capacity recorded"
                        }
                      />
                    </div>
                  </article>

                  {!isOwner && (
                    <article className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-blue-800 shadow-sm dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        <h2 className="text-lg font-black">
                          Organization review
                        </h2>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-blue-700 dark:text-blue-300">
                        Review the listing information, images, pricing,
                        facilities, location and public engagement before
                        approving it for your organization.
                      </p>
                    </article>
                  )}
                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>

      {showLocationMap && mapUrl && (
        <PropertyLocationMapModal
          isOpen={showLocationMap}
          onClose={() => setShowLocationMap(false)}
          latitude={Number(property.latitude)}
          longitude={Number(property.longitude)}
          title={property.propertyName}
          address={
            property.location ||
            property.address ||
            "Property location"
          }
        />
      )}

      {isOwner && showDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">Delete property?</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  This permanently deletes {property.propertyName} and its
                  uploaded images.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDelete(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close delete dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {propertyTenants.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                This property still has active tenants and cannot be deleted.
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-gray-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void deleteProperty()}
                disabled={deleting || propertyTenants.length > 0}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint: string;
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: StatTileProps) {
  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black">{value}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--accent-50)] p-3 text-[var(--accent-700)] dark:bg-[var(--accent-950)]/40">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

interface DetailRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: DetailRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3.5 dark:bg-gray-950/60">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-700)]" />

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

interface HealthRowProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
}

function HealthRow({
  icon: Icon,
  label,
  value,
}: HealthRowProps) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-950/60">
      <Icon className="h-4 w-4 text-[var(--accent-700)]" />
      <p className="mt-2 text-lg font-black">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>
    </div>
  );
}

interface BoardingValueCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function BoardingValueCard({
  icon: Icon,
  label,
  value,
}: BoardingValueCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
      <div className="flex items-center gap-2 text-[var(--accent-700)]">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>
      <p className="mt-2 break-words text-base font-black text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

interface MiniValueProps {
  label: string;
  value: number | string;
}

function MiniValue({
  label,
  value,
}: MiniValueProps) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3 text-center dark:bg-gray-950/60">
      <p className="text-lg font-black">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>
    </div>
  );
}
