"use client";

import {
  AlertCircle,
  Bath,
  Bed,
  BookOpen,
  Building2,
  Calendar,
  Car,
  CheckCircle,
  CircleHelp,
  DollarSign,
  Droplets,
  Dumbbell,
  FileText,
  Gauge,
  Hash,
  Home,
  Image as ImageIcon,
  Map,
  MapPin,
  Minus,
  Moon,
  Navigation,
  PawPrint,
  PencilLine,
  Plus,
  Ruler,
  Save,
  Sofa,
  Sparkles,
  Thermometer,
  Trash2,
  Upload,
  Users,
  Waves,
  Video,
  Wifi,
  Wind,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ID } from "appwrite";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import MapPicker, { AddressParts } from "@/components/map-picker";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases, storage } from "@/lib/appwrite/config";
import { updateOrganizationPropertyCount } from "@/lib/appwrite/helpers";

const PROPERTY_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!;

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const propertyTypes = [
  "House",
  "Cottage",
  "Duplex",
  "Luxury",
  "Studio",
  "Land",
  "Apartment",
  "Workplace",
  "Boarding",
];

const defaultFacilities = [
  { name: "Parking", icon: Car },
  { name: "WiFi", icon: Wifi },
  { name: "AC", icon: Wind },
  { name: "Heating", icon: Thermometer },
  { name: "Pool", icon: Droplets },
  { name: "Gym", icon: Dumbbell },
  { name: "Laundry", icon: Waves },
  { name: "Pet Friendly", icon: PawPrint },
  { name: "Furnished", icon: Sofa },
];

const roomOptions = [
  { value: "room_for1", label: "Single Room", people: 1 },
  { value: "room_for2", label: "Double Room", people: 2 },
  { value: "room_for3", label: "Triple Room", people: 3 },
  { value: "room_for4", label: "Quad Room", people: 4 },
] as const;

const curfewOptions = [
  "No curfew",
  "9:00 PM",
  "10:00 PM",
  "11:00 PM",
  "12:00 AM",
];

type ImageKey = "image1" | "image2" | "image3";
type SlotField = "totalSlots" | "occupiedSlots" | "availableSlots";
type RoomTypeCode = (typeof roomOptions)[number]["value"];

type MediaFileState = Record<ImageKey, File | null>;
type MediaPreviewState = Record<ImageKey, string>;

interface FormState {
  propertyName: string;
  type: string;
  description: string;
  address: string;
  price: string;
  priceThreshold: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  roomFor: string;
  curfew: string;
  totalSlots: string;
  occupiedSlots: string;
  availableSlots: string;
  latitude: string;
  longitude: string;
  facilities: string[];
}

interface BoardingRoom {
  type: RoomTypeCode;
  price: string;
  occupied: string;
  ensuite: boolean;
}

interface UploadedMedia {
  bucketId: string;
  fileId: string;
  url: string;
}

interface UploadProgress {
  current: number;
  total: number;
  label: string;
}

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  cardClass: string;
  action?: ReactNode;
}

interface SlotControlProps {
  icon: LucideIcon;
  label: string;
  helper: string;
  value: string;
  disabled: boolean;
  inputClass: string;
  accentClass: string;
  onChange: (value: string) => void;
  onAdjust: (delta: number) => void;
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  cardClass,
  action,
}: SectionCardProps) {
  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${cardClass}`}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Icon className="h-5 w-5 text-[var(--accent-700)]" />
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>

      {children}
    </section>
  );
}

function SlotControl({
  icon: Icon,
  label,
  helper,
  value,
  disabled,
  inputClass,
  accentClass,
  onChange,
  onAdjust,
}: SlotControlProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <span className={`rounded-xl p-2 ${accentClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-bold">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {helper}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAdjust(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>

        <input
          type="number"
          min="0"
          step="1"
          value={value}
          disabled={disabled}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => onChange(event.target.value)}
          className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-center text-lg font-bold outline-none focus:border-[var(--accent-700)] ${inputClass}`}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => onAdjust(1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function toNonNegativeInteger(value: string | number, fallback = 0): number {
  const parsed = Math.floor(Number(value));

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, parsed);
}

function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Choose a JPG, PNG, or WEBP image.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Each image must be 8 MB or smaller.";
  }

  if (file.size === 0) {
    return "The selected image is empty.";
  }

  return null;
}

function uploadErrorMessage(error: unknown, label: string): string {
  const rawMessage =
    error instanceof Error ? error.message : "The upload failed unexpectedly.";
  const message = rawMessage.toLowerCase();

  if (
    message.includes("maximum") ||
    message.includes("too large") ||
    message.includes("size")
  ) {
    return `${label} exceeds the Appwrite bucket file-size limit. Reduce the file or raise the bucket limit.`;
  }

  if (
    message.includes("extension") ||
    message.includes("mime") ||
    message.includes("file type")
  ) {
    return `${label} is not allowed by the Appwrite bucket. Check the allowed file extensions.`;
  }

  if (
    message.includes("permission") ||
    message.includes("unauthorized") ||
    message.includes("401") ||
    message.includes("403")
  ) {
    return `Nookly does not have permission to upload ${label}. Check the Appwrite bucket create permissions.`;
  }

  if (message.includes("network") || message.includes("fetch")) {
    return `${label} could not upload because the connection was interrupted. Check your internet connection and try again.`;
  }

  return `${label} failed to upload. ${rawMessage}`;
}

export default function NewPropertyPage() {
  const { organization } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const margin = useDashboardMargin();

  const previewUrls = useRef(new Set<string>());
  const lastEditedAvailability = useRef<"occupied" | "available">("available");

  const [form, setForm] = useState<FormState>({
    propertyName: "",
    type: "",
    description: "",
    address: "",
    price: "0",
    priceThreshold: "0",
    area: "",
    bedrooms: "",
    bathrooms: "",
    roomFor: "1",
    curfew: "No curfew",
    totalSlots: "1",
    occupiedSlots: "0",
    availableSlots: "1",
    latitude: "",
    longitude: "",
    facilities: [],
  });

  const [addressFields, setAddressFields] = useState({
    addressNumber: "",
    streetName: "",
    neighbourhood: "",
    cityTown: "",
  });

  const [boardingRooms, setBoardingRooms] = useState<BoardingRoom[]>([]);

  const [imageFiles, setImageFiles] = useState<MediaFileState>({
    image1: null,
    image2: null,
    image3: null,
  });

  const [imagePreviews, setImagePreviews] = useState<MediaPreviewState>({
    image1: "",
    image2: "",
    image3: "",
  });

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapMessage, setMapMessage] = useState("");
  const [showCustomFacility, setShowCustomFacility] = useState(false);
  const [customFacility, setCustomFacility] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgress | null>(null);

  const isBoarding = form.type === "Boarding";
  const totalSlots = toNonNegativeInteger(form.totalSlots, 1);
  const occupiedSlots = toNonNegativeInteger(form.occupiedSlots);
  const availableSlots = toNonNegativeInteger(form.availableSlots);
  const occupancyPercentage =
    totalSlots > 0
      ? Math.min(100, Math.round((occupiedSlots / totalSlots) * 100))
      : 0;

  const roomOccupiedTotal = useMemo(
    () =>
      boardingRooms.reduce(
        (sum, room) => sum + toNonNegativeInteger(room.occupied),
        0,
      ),
    [boardingRooms],
  );

  const roomPrices = useMemo(
    () =>
      boardingRooms
        .map((room) => Number(room.price))
        .filter((price) => Number.isFinite(price) && price >= 0),
    [boardingRooms],
  );

  const lowestRoomPrice =
    roomPrices.length > 0 ? Math.min(...roomPrices) : null;
  const highestRoomPrice =
    roomPrices.length > 0 ? Math.max(...roomPrices) : null;

  const selectedUploadCount = useMemo(
    () => Object.values(imageFiles).filter(Boolean).length,
    [imageFiles],
  );

  const completedSteps = useMemo(() => {
    let completed = 0;

    if (imageFiles.image1) completed += 1;
    if (
      form.propertyName.trim() &&
      form.type &&
      form.description.trim()
    ) {
      completed += 1;
    }
    if (form.address.trim()) completed += 1;
    if (totalSlots >= 1 && occupiedSlots + availableSlots === totalSlots) {
      completed += 1;
    }
    if (!isBoarding || boardingRooms.length > 0) completed += 1;

    return completed;
  }, [
    availableSlots,
    boardingRooms.length,
    form.address,
    form.description,
    form.propertyName,
    form.type,
    imageFiles.image1,
    isBoarding,
    occupiedSlots,
    totalSlots,
  ]);

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    };
  }, []);

  const setObjectPreview = useCallback(
    (key: ImageKey, file: File) => {
      setImagePreviews((current) => {
        const previous = current[key];

        if (previous) {
          URL.revokeObjectURL(previous);
          previewUrls.current.delete(previous);
        }

        const next = URL.createObjectURL(file);
        previewUrls.current.add(next);

        return { ...current, [key]: next };
      });
    },
    [],
  );

  const removeObjectPreview = useCallback((key: ImageKey) => {
    setImagePreviews((current) => {
      const previous = current[key];

      if (previous) {
        URL.revokeObjectURL(previous);
        previewUrls.current.delete(previous);
      }

      return { ...current, [key]: "" };
    });
  }, []);

  const selectImage = (key: ImageKey, file: File | null) => {
    if (!file) return;

    const validationError = validateImage(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setImageFiles((current) => ({ ...current, [key]: file }));
    setObjectPreview(key, file);
  };

  const removeImage = (key: ImageKey) => {
    setImageFiles((current) => ({ ...current, [key]: null }));
    removeObjectPreview(key);
  };

  const updateAddress = (
    field: keyof typeof addressFields,
    value: string,
  ) => {
    const nextAddressFields = {
      ...addressFields,
      [field]: value,
    };

    setAddressFields(nextAddressFields);

    const address = [
      nextAddressFields.addressNumber,
      nextAddressFields.streetName,
      nextAddressFields.neighbourhood,
      nextAddressFields.cityTown,
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ");

    setForm((current) => ({ ...current, address }));
    setMapMessage((current) =>
      current
        ? "Address edited. Your saved map pin remains unchanged."
        : current,
    );
  };

  const selectMapLocation = (
    latitude: number,
    longitude: number,
    address: string,
    parts: AddressParts,
  ) => {
    const nextAddressFields = {
      addressNumber:
        parts.houseNumber || addressFields.addressNumber,
      streetName: parts.road || addressFields.streetName,
      neighbourhood:
        parts.neighbourhood || addressFields.neighbourhood,
      cityTown: parts.city || addressFields.cityTown,
    };

    const structuredAddress = [
      nextAddressFields.addressNumber,
      nextAddressFields.streetName,
      nextAddressFields.neighbourhood,
      nextAddressFields.cityTown,
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ");

    setAddressFields(nextAddressFields);
    setForm((current) => ({
      ...current,
      latitude: String(latitude),
      longitude: String(longitude),
      address: structuredAddress || address,
    }));

    setMapMessage(
      "Location selected and the map was minimized. Review or edit the address fields freely before publishing.",
    );
    setShowMapPicker(false);
  };

  const clearMapPin = () => {
    setForm((current) => ({
      ...current,
      latitude: "",
      longitude: "",
    }));
    setMapMessage(
      "Map pin cleared. Your typed address is still available and editable.",
    );
  };

  const updateSlots = useCallback(
    (field: SlotField, rawValue: string) => {
      const nextValue = toNonNegativeInteger(rawValue);

      if (field === "occupiedSlots") {
        lastEditedAvailability.current = "occupied";
      }

      if (field === "availableSlots") {
        lastEditedAvailability.current = "available";
      }

      setForm((current) => {
        let total = Math.max(
          1,
          toNonNegativeInteger(current.totalSlots, 1),
        );
        let occupied = Math.min(
          toNonNegativeInteger(current.occupiedSlots),
          total,
        );
        let available = Math.min(
          toNonNegativeInteger(current.availableSlots),
          total,
        );

        if (field === "totalSlots") {
          total = Math.max(1, nextValue);

          if (lastEditedAvailability.current === "available") {
            available = Math.min(available, total);
            occupied = total - available;
          } else {
            occupied = Math.min(occupied, total);
            available = total - occupied;
          }
        }

        if (field === "occupiedSlots") {
          occupied = Math.min(nextValue, total);
          available = total - occupied;
        }

        if (field === "availableSlots") {
          available = Math.min(nextValue, total);
          occupied = total - available;
        }

        return {
          ...current,
          totalSlots: String(total),
          occupiedSlots: String(occupied),
          availableSlots: String(available),
        };
      });
    },
    [],
  );

  const adjustSlots = (field: SlotField, delta: number) => {
    const currentValue =
      field === "totalSlots"
        ? totalSlots
        : field === "occupiedSlots"
          ? occupiedSlots
          : availableSlots;

    updateSlots(field, String(Math.max(0, currentValue + delta)));
  };

  const applyOccupancyPreset = (
    preset: "empty" | "half" | "full",
  ) => {
    const occupied =
      preset === "empty"
        ? 0
        : preset === "full"
          ? totalSlots
          : Math.floor(totalSlots / 2);

    lastEditedAvailability.current = "occupied";
    setForm((current) => ({
      ...current,
      occupiedSlots: String(occupied),
      availableSlots: String(totalSlots - occupied),
    }));
  };

  const toggleFacility = (facility: string) => {
    setForm((current) => ({
      ...current,
      facilities: current.facilities.includes(facility)
        ? current.facilities.filter((item) => item !== facility)
        : [...current.facilities, facility],
    }));
  };

  const addCustomFacility = () => {
    const value = customFacility.trim();

    if (!value) return;

    setForm((current) => ({
      ...current,
      facilities: Array.from(
        new Set([...current.facilities, value]),
      ),
    }));

    setCustomFacility("");
    setShowCustomFacility(false);
  };

  const addBoardingRoom = (roomType: string) => {
    if (!roomType) return;

    const typedRoomType = roomType as RoomTypeCode;

    if (boardingRooms.some((room) => room.type === typedRoomType)) {
      return;
    }

    setBoardingRooms((current) => [
      ...current,
      {
        type: typedRoomType,
        price: form.price === "0" ? "" : form.price,
        occupied: "0",
        ensuite: false,
      },
    ]);
  };

  const removeBoardingRoom = (index: number) => {
    setBoardingRooms((current) =>
      current.filter((_, roomIndex) => roomIndex !== index),
    );
  };

  const updateBoardingRoom = (
    index: number,
    field: "price" | "occupied" | "ensuite",
    value: string | boolean,
  ) => {
    setBoardingRooms((current) =>
      current.map((room, roomIndex) => {
        if (roomIndex !== index) return room;

        if (field === "occupied") {
          return {
            ...room,
            occupied: String(toNonNegativeInteger(String(value))),
          };
        }

        return {
          ...room,
          [field]: value,
        };
      }),
    );
  };

  const useRoomBreakdown = () => {
    if (roomOccupiedTotal > totalSlots) {
      setError(
        "The occupied room-type breakdown is greater than the total slots. Reduce the room counts first.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    updateSlots("occupiedSlots", String(roomOccupiedTotal));
  };

  const useLowestRoomPrice = () => {
    if (lowestRoomPrice === null) return;

    setForm((current) => ({
      ...current,
      price: String(lowestRoomPrice),
      priceThreshold:
        Number(current.priceThreshold) > lowestRoomPrice
          ? String(lowestRoomPrice)
          : current.priceThreshold,
    }));
  };

  const validateForm = (): string | null => {
    if (!organization?.$id || !organization.userId) {
      return "Your organization account is not ready. Refresh and try again.";
    }

    if (!PROPERTY_BUCKET_ID) {
      return "The property media bucket is not configured.";
    }

    if (!form.propertyName.trim()) {
      return "Property name is required.";
    }

    if (!form.type) {
      return "Property type is required.";
    }

    if (!form.description.trim()) {
      return "Property description is required.";
    }

    if (!form.address.trim()) {
      return "Property address is required.";
    }

    if (!imageFiles.image1) {
      return "Image 1 is required.";
    }

    const price = Number(form.price);
    const priceThreshold = Number(form.priceThreshold || 0);
    const area = Number(form.area);
    const bedrooms = Number(form.bedrooms);
    const bathrooms = Number(form.bathrooms);
    const roomFor = Number(form.roomFor || 0);

    const numericValues = [
      { label: "Price", value: price },
      { label: "Price threshold", value: priceThreshold },
      { label: "Area", value: area },
      { label: "Bedrooms", value: bedrooms },
      { label: "Bathrooms", value: bathrooms },
      { label: "Maximum people", value: roomFor },
    ];

    for (const item of numericValues) {
      if (!Number.isFinite(item.value) || item.value < 0) {
        return `${item.label} must be zero or greater.`;
      }
    }

    if (totalSlots < 1) {
      return "Total slots must be at least 1.";
    }

    if (occupiedSlots + availableSlots !== totalSlots) {
      return "Occupied and available slots must add up to the total slots.";
    }

    if (isBoarding) {
      if (boardingRooms.length === 0) {
        return "Add at least one room type for the boarding house.";
      }

      if (roomFor < 1) {
        return "Maximum people per room must be at least 1 for a boarding house.";
      }

      const missingRoomPrice = boardingRooms.some(
        (room) =>
          room.price.trim() === "" ||
          !Number.isFinite(Number(room.price)) ||
          Number(room.price) < 0,
      );

      if (missingRoomPrice) {
        return "Enter a valid price for every boarding room type.";
      }

      if (roomOccupiedTotal > occupiedSlots) {
        return "The occupied room-type breakdown cannot exceed the overall occupied slots.";
      }
    }

    return null;
  };

  const uploadFile = async (
    file: File,
    bucketId: string,
    label: string,
  ): Promise<UploadedMedia> => {
    try {
      const uploaded = await storage.createFile(
        bucketId,
        ID.unique(),
        file,
      );

      return {
        bucketId,
        fileId: uploaded.$id,
        url: storage.getFileView(bucketId, uploaded.$id).toString(),
      };
    } catch (uploadError) {
      throw new Error(uploadErrorMessage(uploadError, label));
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!navigator.onLine) {
      setError("Connect to the internet before uploading the listing.");
      return;
    }

    if (!organization) return;

    setSubmitting(true);

    const uploadedFiles: UploadedMedia[] = [];

    const uploadedImages: Record<ImageKey, string> = {
      image1: "",
      image2: "",
      image3: "",
    };

    const listingDocumentId = ID.unique();
    let propertyCreated = false;
    let boardingCreated = false;

    try {
      const uploadQueue: Array<{
        key: ImageKey;
        file: File;
        bucketId: string;
        label: string;
      }> = [];

      (Object.keys(imageFiles) as ImageKey[]).forEach(
        (key, index) => {
          const file = imageFiles[key];

          if (file) {
            uploadQueue.push({
              key,
              file,
              bucketId: PROPERTY_BUCKET_ID,
              label: `Image ${index + 1}`,
            });
          }
        },
      );

      for (let index = 0; index < uploadQueue.length; index += 1) {
        const item = uploadQueue[index];

        setUploadProgress({
          current: index + 1,
          total: uploadQueue.length,
          label: item.label,
        });

        const uploaded = await uploadFile(
          item.file,
          item.bucketId,
          item.label,
        );

        uploadedFiles.push(uploaded);
        uploadedImages[item.key] = uploaded.url;
      }

      const price = Number(form.price);
      const priceThreshold = Number(form.priceThreshold || 0);
      const area = Number(form.area);
      const bedrooms = Number(form.bedrooms);
      const bathrooms = Number(form.bathrooms);
      const roomFor = Number(form.roomFor || 0);
      const latitude = form.latitude ? Number(form.latitude) : null;
      const longitude = form.longitude ? Number(form.longitude) : null;
      const isAvailable = availableSlots > 0;

      const roomTypeValues = boardingRooms.map((room) => room.type);
      const roomPriceValues = boardingRooms.map((room) => room.price);
      const roomOccupiedValues = boardingRooms.map(
        (room) => room.occupied,
      );
      const roomEnsuiteValues = boardingRooms.map((room) =>
        String(room.ensuite),
      );
      const hasAnyEnsuite = boardingRooms.some(
        (room) => room.ensuite,
      );

      setUploadProgress({
        current: uploadQueue.length,
        total: uploadQueue.length,
        label: "Saving property",
      });

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        listingDocumentId,
        {
          propertyName: form.propertyName.trim(),
          type: form.type,
          description: form.description.trim(),
          address: form.address.trim(),
          price,
          priceThreshold,
          new_price: price,
          area,
          bedrooms,
          bathrooms,
          facilities: form.facilities.join(", "),
          image1: uploadedImages.image1,
          image2: uploadedImages.image2,
          image3: uploadedImages.image3,
          isAvailable,
          roomFor,
          curfew: form.curfew,
          totalSlots,
          occupiedSlots,
          availableSlots,
          latitude,
          longitude,
          creatorId: organization.userId,
          rating: 0,
          views: 0,
          likes: 0,
          requests: 0,
        },
      );

      propertyCreated = true;

      if (isBoarding) {
        setUploadProgress({
          current: uploadQueue.length,
          total: uploadQueue.length,
          label: "Saving boarding details",
        });

        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_BOARDING_PLACES_COLLECTION_ID!,
          listingDocumentId,
          {
            propertyName: form.propertyName.trim(),
            description: form.description.trim(),
            rooms_for_available: roomTypeValues.join(", "),
            price_per_room: roomPriceValues.join(", "),
            address: form.address.trim(),
            capacity: totalSlots,
            hasEnsuite_bathrooms: hasAnyEnsuite,
            hasEnsuite_bathrooms_in_rooms_for:
              roomEnsuiteValues.join(", "),
            rating: 0,
            facilities: form.facilities.join(", "),
            image1: uploadedImages.image1,
            image2: uploadedImages.image2,
            image3: uploadedImages.image3,
            creatorId: organization.userId,
            likes: 0,
            isAvailable,
            curfew: form.curfew,
            requests: 0,
            priceThreshold,
            new_price: price,
            occupiedSlots,
            availableSlots,
            latitude,
            longitude,
            rooms_for_occupied: roomOccupiedValues.join(", "),
          },
        );

        boardingCreated = true;
      }

      try {
        await updateOrganizationPropertyCount(
          organization.userId,
          "increment",
        );
      } catch (countError) {
        console.warn(
          "Property count could not be refreshed:",
          countError,
        );
      }

      router.replace("/dashboard/properties");
    } catch (submitError) {
      if (boardingCreated) {
        await databases
          .deleteDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_BOARDING_PLACES_COLLECTION_ID!,
            listingDocumentId,
          )
          .catch(() => undefined);
      }

      if (propertyCreated) {
        await databases
          .deleteDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
            listingDocumentId,
          )
          .catch(() => undefined);
      }

      await Promise.allSettled(
        uploadedFiles.map((uploaded) =>
          storage.deleteFile(uploaded.bucketId, uploaded.fileId),
        ),
      );

      console.error("Unable to create listing:", submitError);

      setError(
        submitError instanceof Error
          ? submitError.message
          : "The property could not be created.",
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const dark = resolvedTheme === "dark";

  const cardClass = dark
    ? "border-gray-800 bg-gray-900"
    : "border-gray-200 bg-white";

  const inputClass = dark
    ? "border-gray-700 bg-gray-950 text-gray-100 placeholder:text-gray-500"
    : "border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400";

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
            <div className="mx-auto max-w-6xl">
              <div className="mb-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">
                      Add New Property
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                      Create the main property listing first. When you
                      choose Boarding house, Nookly also prepares the
                      matching Boarding Places record automatically.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between gap-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Setup progress
                        </p>
                        <p className="mt-1 text-sm font-bold">
                          {completedSteps} of 5 essentials ready
                        </p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-700)] text-sm font-bold text-white">
                        {Math.round((completedSteps / 5) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-5">
                  {[
                    ["1", "Media", Boolean(imageFiles.image1)],
                    [
                      "2",
                      "Details",
                      Boolean(
                        form.propertyName.trim() &&
                          form.type &&
                          form.description.trim(),
                      ),
                    ],
                    ["3", "Address", Boolean(form.address.trim())],
                    [
                      "4",
                      "Availability",
                      occupiedSlots + availableSlots === totalSlots,
                    ],
                    [
                      "5",
                      isBoarding ? "Boarding" : "Ready",
                      !isBoarding || boardingRooms.length > 0,
                    ],
                  ].map(([number, label, ready]) => (
                    <div
                      key={String(number)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                        ready
                          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                          : "border-gray-200 bg-white text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          ready
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        {ready ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          number
                        )}
                      </span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Verification Notice */}
              <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/50">
                    <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700 dark:text-blue-300">
                      Video verification coming soon
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Upload videos of your property to give tenants a virtual tour. This feature will be available in the next update.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      Could not save the listing
                    </p>
                    <p className="mt-1 text-sm">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError("")}
                    className="rounded-lg p-1 hover:bg-red-100 dark:hover:bg-red-900/40"
                    aria-label="Dismiss error"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {submitting && uploadProgress && (
                <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {uploadProgress.label}…
                    </span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {uploadProgress.current}/
                      {Math.max(1, uploadProgress.total)}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${Math.max(
                          5,
                          (uploadProgress.current /
                            Math.max(1, uploadProgress.total)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    Keep this page open until the listing is saved.
                  </p>
                </div>
              )}

              <form onSubmit={submit} className="space-y-5">
                <SectionCard
                  icon={ImageIcon}
                  title="Property Images"
                  description="Image 1 is the main cover. Images 2 and 3 are optional."
                  cardClass={cardClass}
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    {(["image1", "image2", "image3"] as ImageKey[]).map(
                      (key, index) => {
                        const file = imageFiles[key];
                        const preview = imagePreviews[key];

                        return (
                          <div key={key}>
                            <label className="mb-2 block text-sm font-semibold">
                              Image {index + 1}
                              {index === 0 && (
                                <span className="ml-1 text-red-500">
                                  *
                                </span>
                              )}
                            </label>

                            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-950">
                              {preview ? (
                                <>
                                  <Image
                                    src={preview}
                                    alt={`Property preview ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />

                                  <div className="absolute inset-x-2 bottom-2 flex gap-2">
                                    <label className="flex-1 cursor-pointer rounded-xl bg-black/70 px-3 py-2 text-center text-xs font-semibold text-white">
                                      Replace
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        disabled={submitting}
                                        onChange={(event) => {
                                          selectImage(
                                            key,
                                            event.target.files?.[0] ??
                                              null,
                                          );
                                          event.currentTarget.value = "";
                                        }}
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() => removeImage(key)}
                                      disabled={submitting}
                                      className="rounded-xl bg-red-600 p-2 text-white"
                                      aria-label={`Remove image ${index + 1}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 p-4 text-center text-gray-500">
                                  <Upload className="h-8 w-8" />
                                  <span className="text-sm font-semibold">
                                    Choose image {index + 1}
                                  </span>
                                  <span className="text-xs">
                                    JPG, PNG or WEBP · max 8 MB
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    disabled={submitting}
                                    onChange={(event) => {
                                      selectImage(
                                        key,
                                        event.target.files?.[0] ??
                                          null,
                                      );
                                      event.currentTarget.value = "";
                                    }}
                                  />
                                </label>
                              )}
                            </div>

                            {file && (
                              <p className="mt-2 truncate text-xs text-gray-500 dark:text-gray-400">
                                {file.name} ·{" "}
                                {formatFileSize(file.size)}
                              </p>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  icon={Building2}
                  title="Property Details"
                  description="Start with the essential listing information. Boarding-only controls appear automatically after choosing Boarding house."
                  cardClass={cardClass}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label>
                      <span className="mb-1.5 block text-sm font-semibold">
                        Property name *
                      </span>
                      <div className="relative">
                        <Home className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          value={form.propertyName}
                          disabled={submitting}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              propertyName: event.target.value,
                            }))
                          }
                          className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                          placeholder="e.g. Sunrise Student Residence"
                        />
                      </div>
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-semibold">
                        Property type *
                      </span>
                      <select
                        value={form.type}
                        disabled={submitting}
                        onChange={(event) => {
                          const nextType = event.target.value;

                          setForm((current) => ({
                            ...current,
                            type: nextType,
                            roomFor:
                              nextType === "Boarding" &&
                              !current.roomFor
                                ? "1"
                                : current.roomFor,
                          }));
                        }}
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                      >
                        <option value="">Select type</option>
                        {propertyTypes.map((type) => (
                          <option key={type} value={type}>
                            {type === "Boarding"
                              ? "Boarding house"
                              : type}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="md:col-span-2">
                      <span className="mb-1.5 block text-sm font-semibold">
                        Description *
                      </span>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <textarea
                          value={form.description}
                          disabled={submitting}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          rows={5}
                          className={`w-full resize-none rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                          placeholder="Describe the rooms, environment, rules, nearby places and what makes the property special."
                        />
                      </div>
                    </label>
                  </div>
                </SectionCard>

                <SectionCard
                  icon={MapPin}
                  title="Address & Map"
                  description="You may type the address manually, use the map, or do both. Map selection never locks the address fields."
                  cardClass={cardClass}
                  action={
                    <button
                      type="button"
                      onClick={() =>
                        setShowMapPicker((current) => !current)
                      }
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-700)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <Map className="h-4 w-4" />
                      {showMapPicker
                        ? "Minimize map"
                        : form.latitude
                          ? "Reopen map"
                          : "Open map"}
                    </button>
                  }
                >
                  <div className="mb-4 grid gap-3 md:grid-cols-2">
                    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                      <PencilLine className="mt-0.5 h-4 w-4 shrink-0" />
                      <p className="text-xs leading-5">
                        All address boxes remain editable after selecting a
                        location on the map.
                      </p>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                      <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
                      <p className="text-xs leading-5">
                        Select and confirm the location. The map then
                        minimizes automatically so you can continue.
                      </p>
                    </div>
                  </div>

                  {showMapPicker && (
                    <div className="mb-5 rounded-2xl border border-gray-200 p-3 dark:border-gray-700">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold">
                            Pick the property location
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Search or click the map, then confirm the
                            location.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowMapPicker(false)}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold dark:border-gray-700"
                        >
                          Minimize
                        </button>
                      </div>

                      <MapPicker
                        onLocationSelect={selectMapLocation}
                        theme={resolvedTheme}
                        initialLat={
                          form.latitude
                            ? Number(form.latitude)
                            : undefined
                        }
                        initialLng={
                          form.longitude
                            ? Number(form.longitude)
                            : undefined
                        }
                      />
                    </div>
                  )}

                  {mapMessage && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p className="text-xs leading-5">{mapMessage}</p>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold">
                        Address number *
                      </span>
                      <div className="relative">
                        <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          value={addressFields.addressNumber}
                          disabled={submitting}
                          onChange={(event) =>
                            updateAddress(
                              "addressNumber",
                              event.target.value,
                            )
                          }
                          className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                          placeholder="123"
                        />
                      </div>
                    </label>

                    <label>
                      <span className="mb-1.5 block text-xs font-semibold">
                        Street name *
                      </span>
                      <input
                        value={addressFields.streetName}
                        disabled={submitting}
                        onChange={(event) =>
                          updateAddress(
                            "streetName",
                            event.target.value,
                          )
                        }
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                        placeholder="Main Street"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-xs font-semibold">
                        Neighbourhood
                      </span>
                      <input
                        value={addressFields.neighbourhood}
                        disabled={submitting}
                        onChange={(event) =>
                          updateAddress(
                            "neighbourhood",
                            event.target.value,
                          )
                        }
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                        placeholder="Neighbourhood"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-xs font-semibold">
                        City or town *
                      </span>
                      <input
                        value={addressFields.cityTown}
                        disabled={submitting}
                        onChange={(event) =>
                          updateAddress(
                            "cityTown",
                            event.target.value,
                          )
                        }
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                        placeholder="Bindura"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700 dark:bg-gray-950">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Address that will be saved
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {form.address || "No address entered yet"}
                      </p>
                    </div>

                    {form.latitude && form.longitude && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          <Navigation className="h-3.5 w-3.5" />
                          Map pin saved
                        </span>
                        <button
                          type="button"
                          onClick={clearMapPin}
                          disabled={submitting}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-900 dark:text-red-300"
                        >
                          Clear pin
                        </button>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  icon={DollarSign}
                  title="Pricing & Property Capacity"
                  description="Enter the listing price and the physical property details. The live slot planner below keeps availability consistent."
                  cardClass={cardClass}
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      {
                        field: "price" as const,
                        label: isBoarding
                          ? "Starting monthly price *"
                          : "Price *",
                        icon: DollarSign,
                        step: "10",
                        min: "0",
                      },
                      {
                        field: "priceThreshold" as const,
                        label: "Lowest acceptable price",
                        icon: DollarSign,
                        step: "10",
                        min: "0",
                      },
                      {
                        field: "area" as const,
                        label: "Area (m²) *",
                        icon: Ruler,
                        step: "0.01",
                        min: "0",
                      },
                      {
                        field: "bedrooms" as const,
                        label: "Bedrooms *",
                        icon: Bed,
                        step: "1",
                        min: "0",
                      },
                      {
                        field: "bathrooms" as const,
                        label: "Bathrooms *",
                        icon: Bath,
                        step: "1",
                        min: "0",
                      },
                      {
                        field: "roomFor" as const,
                        label: isBoarding
                          ? "Maximum people per room *"
                          : "Maximum people",
                        icon: Users,
                        step: "1",
                        min: isBoarding ? "1" : "0",
                      },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <label key={item.field}>
                          <span className="mb-1.5 block text-xs font-semibold">
                            {item.label}
                          </span>
                          <div className="relative">
                            <Icon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input
                              type="number"
                              min={item.min}
                              step={item.step}
                              value={form[item.field]}
                              disabled={submitting}
                              onFocus={(event) =>
                                event.currentTarget.select()
                              }
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  [item.field]: event.target.value,
                                }))
                              }
                              className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                            />
                          </div>
                        </label>
                      );
                    })}

                    <label>
                      <span className="mb-1.5 block text-xs font-semibold">
                        Curfew
                      </span>
                      <div className="relative">
                        <Moon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <select
                          value={form.curfew}
                          disabled={submitting}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              curfew: event.target.value,
                            }))
                          }
                          className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                        >
                          {curfewOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>

                  <div className="mt-6 rounded-2xl border border-[var(--accent-700)]/20 bg-[var(--accent-700)]/5 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="flex items-center gap-2 font-bold">
                          <Gauge className="h-5 w-5 text-[var(--accent-700)]" />
                          Live Availability Planner
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                          Edit either Occupied now or Available now. Nookly
                          automatically adjusts the other value so the
                          numbers always match Total slots.
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${
                          availableSlots > 0
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {availableSlots > 0 ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" />
                        )}
                        {availableSlots > 0
                          ? `${availableSlots} available`
                          : "Fully occupied"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <SlotControl
                        icon={Calendar}
                        label="Total slots"
                        helper={
                          isBoarding
                            ? "Total tenant spaces in the boarding house"
                            : "Total spaces or capacity"
                        }
                        value={form.totalSlots}
                        disabled={submitting}
                        inputClass={inputClass}
                        accentClass="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        onChange={(value) =>
                          updateSlots("totalSlots", value)
                        }
                        onAdjust={(delta) =>
                          adjustSlots("totalSlots", delta)
                        }
                      />

                      <SlotControl
                        icon={Users}
                        label="Occupied now"
                        helper="Spaces currently taken"
                        value={form.occupiedSlots}
                        disabled={submitting}
                        inputClass={inputClass}
                        accentClass="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                        onChange={(value) =>
                          updateSlots("occupiedSlots", value)
                        }
                        onAdjust={(delta) =>
                          adjustSlots("occupiedSlots", delta)
                        }
                      />

                      <SlotControl
                        icon={CheckCircle}
                        label="Available now"
                        helper="Spaces open for new tenants"
                        value={form.availableSlots}
                        disabled={submitting}
                        inputClass={inputClass}
                        accentClass="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        onChange={(value) =>
                          updateSlots("availableSlots", value)
                        }
                        onAdjust={(delta) =>
                          adjustSlots("availableSlots", delta)
                        }
                      />
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>
                          {occupiedSlots} occupied of {totalSlots}
                        </span>
                        <span>{occupancyPercentage}% occupied</span>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-950">
                        <div
                          className="h-full rounded-full bg-orange-500 transition-all duration-300"
                          style={{
                            width: `${occupancyPercentage}%`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            applyOccupancyPreset("empty")
                          }
                          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                        >
                          All available
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            applyOccupancyPreset("half")
                          }
                          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                        >
                          Half occupied
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            applyOccupancyPreset("full")
                          }
                          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                        >
                          Fully occupied
                        </button>
                      </div>
                    </div>

                    {isBoarding && (
                      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                        Example: set Total slots to 40, then set Available
                        now to 20. Occupied now immediately becomes 20.
                      </div>
                    )}
                  </div>
                </SectionCard>

                {isBoarding && (
                  <SectionCard
                    icon={BookOpen}
                    title="Boarding Room Types"
                    description="Add only the room types this boarding house offers. Prices and occupied-room counts stay aligned when saved to Appwrite."
                    cardClass={cardClass}
                    action={
                      <select
                        value=""
                        disabled={submitting}
                        onChange={(event) => {
                          addBoardingRoom(event.target.value);
                          event.currentTarget.value = "";
                        }}
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-700)] sm:w-64 ${inputClass}`}
                      >
                        <option value="">+ Add room type</option>
                        {roomOptions
                          .filter(
                            (option) =>
                              !boardingRooms.some(
                                (room) =>
                                  room.type === option.value,
                              ),
                          )
                          .map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label} ({option.people}{" "}
                              {option.people === 1
                                ? "person"
                                : "people"})
                            </option>
                          ))}
                      </select>
                    }
                  >
                    {boardingRooms.length === 0 ? (
                      <div className="rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                        <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                        <p className="mt-3 font-bold">
                          No room types added yet
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Use the Add room type menu above. At least one
                          room type is required for a boarding house.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {boardingRooms.map((room, index) => {
                          const option = roomOptions.find(
                            (item) => item.value === room.type,
                          );

                          return (
                            <div
                              key={room.type}
                              className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-bold">
                                    {option?.label ?? room.type}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Holds {option?.people ?? 1}{" "}
                                    {(option?.people ?? 1) === 1
                                      ? "person"
                                      : "people"}{" "}
                                    per room
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeBoardingRoom(index)
                                  }
                                  disabled={submitting}
                                  className="rounded-xl p-2 text-red-600 transition hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-950"
                                  aria-label={`Remove ${option?.label ?? room.type}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                <label>
                                  <span className="mb-1.5 block text-xs font-semibold">
                                    Price per room *
                                  </span>
                                  <div className="relative">
                                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <input
                                      type="number"
                                      min="0"
                                      step="10"
                                      value={room.price}
                                      disabled={submitting}
                                      onFocus={(event) =>
                                        event.currentTarget.select()
                                      }
                                      onChange={(event) =>
                                        updateBoardingRoom(
                                          index,
                                          "price",
                                          event.target.value,
                                        )
                                      }
                                      className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                                      placeholder="Monthly price"
                                    />
                                  </div>
                                </label>

                                <label>
                                  <span className="mb-1.5 block text-xs font-semibold">
                                    Occupied rooms of this type
                                  </span>
                                  <div className="relative">
                                    <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={room.occupied}
                                      disabled={submitting}
                                      onFocus={(event) =>
                                        event.currentTarget.select()
                                      }
                                      onChange={(event) =>
                                        updateBoardingRoom(
                                          index,
                                          "occupied",
                                          event.target.value,
                                        )
                                      }
                                      className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                                    />
                                  </div>
                                </label>

                                <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                                  <div>
                                    <p className="text-xs font-bold">
                                      Ensuite bathroom
                                    </p>
                                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                      For this room type
                                    </p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={room.ensuite}
                                    disabled={submitting}
                                    onChange={(event) =>
                                      updateBoardingRoom(
                                        index,
                                        "ensuite",
                                        event.target.checked,
                                      )
                                    }
                                    className="h-5 w-5 accent-[var(--accent-700)]"
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        })}

                        <div className="grid gap-3 lg:grid-cols-2">
                          <div
                            className={`rounded-2xl border p-4 ${
                              roomOccupiedTotal > occupiedSlots
                                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                                : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                            }`}
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide">
                              Occupancy breakdown
                            </p>
                            <p className="mt-1 text-lg font-bold">
                              {roomOccupiedTotal} room
                              {roomOccupiedTotal === 1 ? "" : "s"}{" "}
                              assigned by type
                            </p>
                            <p className="mt-1 text-xs leading-5">
                              Overall occupied slots: {occupiedSlots}.
                              The room-type total may be lower when some
                              occupied spaces have not yet been classified.
                            </p>

                            <button
                              type="button"
                              onClick={useRoomBreakdown}
                              disabled={
                                submitting ||
                                roomOccupiedTotal > totalSlots
                              }
                              className="mt-3 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Use room breakdown as occupied total
                            </button>
                          </div>

                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                            <p className="text-xs font-semibold uppercase tracking-wide">
                              Room price range
                            </p>
                            {lowestRoomPrice === null ||
                            highestRoomPrice === null ? (
                              <p className="mt-1 text-sm">
                                Enter room prices to see the range.
                              </p>
                            ) : (
                              <>
                                <p className="mt-1 text-lg font-bold">
                                  {formatMoney(lowestRoomPrice)}
                                  {lowestRoomPrice !==
                                    highestRoomPrice &&
                                    ` – ${formatMoney(
                                      highestRoomPrice,
                                    )}`}
                                </p>
                                <p className="mt-1 text-xs">
                                  You can use the lowest room price as
                                  the main listing price.
                                </p>
                                <button
                                  type="button"
                                  onClick={useLowestRoomPrice}
                                  disabled={submitting}
                                  className="mt-3 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  Use lowest as listing price
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </SectionCard>
                )}

                <SectionCard
                  icon={Sparkles}
                  title="Facilities"
                  description="Select the facilities tenants can expect, or add a custom one."
                  cardClass={cardClass}
                  action={
                    <button
                      type="button"
                      onClick={() =>
                        setShowCustomFacility((current) => !current)
                      }
                      disabled={submitting}
                      className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold dark:border-gray-700"
                    >
                      <Plus className="h-4 w-4" />
                      Custom facility
                    </button>
                  }
                >
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {defaultFacilities.map(
                      ({ name, icon: Icon }) => {
                        const active =
                          form.facilities.includes(name);

                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => toggleFacility(name)}
                            disabled={submitting}
                            className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition ${
                              active
                                ? "border-[var(--accent-700)] bg-[var(--accent-700)] text-white"
                                : dark
                                  ? "border-gray-700 bg-gray-950 hover:border-gray-600"
                                  : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {name}
                          </button>
                        );
                      },
                    )}
                  </div>

                  {showCustomFacility && (
                    <div className="mt-4 flex max-w-md gap-2">
                      <input
                        value={customFacility}
                        disabled={submitting}
                        onChange={(event) =>
                          setCustomFacility(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addCustomFacility();
                          }
                        }}
                        placeholder="Facility name"
                        className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-700)] ${inputClass}`}
                      />
                      <button
                        type="button"
                        onClick={addCustomFacility}
                        disabled={
                          submitting || !customFacility.trim()
                        }
                        className="rounded-xl bg-[var(--accent-700)] px-4 text-white disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {form.facilities.some(
                    (facility) =>
                      !defaultFacilities.some(
                        (defaultFacility) =>
                          defaultFacility.name === facility,
                      ),
                  ) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {form.facilities
                        .filter(
                          (facility) =>
                            !defaultFacilities.some(
                              (defaultFacility) =>
                                defaultFacility.name === facility,
                            ),
                        )
                        .map((facility) => (
                          <span
                            key={facility}
                            className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                          >
                            {facility}
                            <button
                              type="button"
                              onClick={() =>
                                toggleFacility(facility)
                              }
                              disabled={submitting}
                              aria-label={`Remove ${facility}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </SectionCard>

                <section
                  className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${cardClass}`}
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <p className="font-bold">
                        Review and create the listing
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-gray-100 px-3 py-1.5 font-semibold dark:bg-gray-800">
                          {selectedUploadCount} image
                          {selectedUploadCount === 1 ? "" : "s"}
                        </span>
                        <span className="rounded-full bg-blue-100 px-3 py-1.5 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {totalSlots} total slots
                        </span>
                        <span className="rounded-full bg-blue-100 px-3 py-1.5 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {availableSlots} available
                        </span>
                        {isBoarding && (
                          <span className="rounded-full bg-orange-100 px-3 py-1.5 font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                            {boardingRooms.length} room type
                            {boardingRooms.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {isBoarding
                          ? "One linked record will be created in each collection."
                          : "One property record will be created."}
                      </p>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => router.back()}
                        disabled={submitting}
                        className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-gray-700"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-700)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            Uploading and saving…
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Create listing
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </section>
              </form>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}