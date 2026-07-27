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
  DollarSign,
  Droplets,
  Dumbbell,
  FileText,
  Hash,
  Home,
  Image as ImageIcon,
  Map,
  MapPin,
  Moon,
  Navigation,
  PawPrint,
  Plus,
  Ruler,
  Save,
  Sofa,
  Thermometer,
  Trash2,
  Upload,
  Users,
  Video,
  Waves,
  Wifi,
  Wind,
  X,
} from "lucide-react";
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
const VIDEO_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_VIDEOS_BUCKET_ID || PROPERTY_BUCKET_ID;

const configuredVideoLimit = Number(
  process.env.NEXT_PUBLIC_MAX_PROPERTY_VIDEO_SIZE_MB,
);
const MAX_VIDEO_SIZE_MB =
  Number.isFinite(configuredVideoLimit) && configuredVideoLimit > 0
    ? configuredVideoLimit
    : 30;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
];
const ACCEPTED_VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v"];

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
  { value: "room_for1", label: "Single Room (1 person)" },
  { value: "room_for2", label: "Double Room (2 people)" },
  { value: "room_for3", label: "Triple Room (3 people)" },
  { value: "room_for4", label: "Quad Room (4 people)" },
];

const curfewOptions = [
  "No curfew",
  "9:00 PM",
  "10:00 PM",
  "11:00 PM",
  "12:00 AM",
];

type ImageKey = "image1" | "image2" | "image3";
type VideoKey = "video1" | "video2" | "video3";
type MediaKey = ImageKey | VideoKey;

type MediaFileState<T extends string> = Record<T, File | null>;
type MediaPreviewState<T extends string> = Record<T, string>;

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

interface BoardingState {
  rooms_for_available: string[];
  price_per_room: string[];
  hasEnsuite_bathrooms: boolean;
  hasEnsuite_bathrooms_in_rooms_for: string[];
  occupiedRooms: string[];
  rating: number;
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

function isSameFile(first: File, second: File): boolean {
  return (
    first.name === second.name &&
    first.size === second.size &&
    first.lastModified === second.lastModified
  );
}

function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Choose a JPG, PNG, or WEBP image.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Each image must be 8 MB or smaller.";
  }

  return null;
}

function validateVideo(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const hasAcceptedType = ACCEPTED_VIDEO_TYPES.includes(file.type);
  const hasAcceptedExtension = ACCEPTED_VIDEO_EXTENSIONS.includes(extension);

  if (!hasAcceptedType && !hasAcceptedExtension) {
    return "Choose an MP4, WEBM, MOV, or M4V video.";
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return `Each video must be ${MAX_VIDEO_SIZE_MB} MB or smaller.`;
  }

  if (file.size === 0) {
    return "The selected video is empty.";
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
    return `${label} exceeds the Appwrite bucket file-size limit. Reduce the file size or raise the bucket limit.`;
  }

  if (
    message.includes("extension") ||
    message.includes("mime") ||
    message.includes("file type")
  ) {
    return `${label} is not allowed by the Appwrite bucket. Allow MP4, WEBM, MOV, and M4V files in the bucket settings.`;
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
  const { theme } = useTheme();
  const router = useRouter();
  const margin = useDashboardMargin();
  const previewUrls = useRef(new Set<string>());

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
    roomFor: "",
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

  const [boarding, setBoarding] = useState<BoardingState>({
    rooms_for_available: [],
    price_per_room: [],
    hasEnsuite_bathrooms: false,
    hasEnsuite_bathrooms_in_rooms_for: [],
    occupiedRooms: [],
    rating: 0,
  });

  const [imageFiles, setImageFiles] = useState<MediaFileState<ImageKey>>({
    image1: null,
    image2: null,
    image3: null,
  });
  const [imagePreviews, setImagePreviews] = useState<
    MediaPreviewState<ImageKey>
  >({
    image1: "",
    image2: "",
    image3: "",
  });

  const [videoFiles, setVideoFiles] = useState<MediaFileState<VideoKey>>({
    video1: null,
    video2: null,
    video3: null,
  });
  const [videoPreviews, setVideoPreviews] = useState<
    MediaPreviewState<VideoKey>
  >({
    video1: "",
    video2: "",
    video3: "",
  });

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showCustomFacility, setShowCustomFacility] = useState(false);
  const [customFacility, setCustomFacility] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgress | null>(null);

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    };
  }, []);

  useEffect(() => {
    const total = Number(form.totalSlots || 0);
    const occupied = Number(form.occupiedSlots || 0);
    const available = Math.max(0, total - occupied);

    setForm((current) => ({
      ...current,
      availableSlots: String(available),
    }));
  }, [form.totalSlots, form.occupiedSlots]);

  const isBoarding = form.type === "Boarding";

  const selectedUploadCount = useMemo(
    () =>
      [...Object.values(imageFiles), ...Object.values(videoFiles)].filter(
        Boolean,
      ).length,
    [imageFiles, videoFiles],
  );

  const setPreviewUrl = useCallback(
    <T extends MediaKey>(
      key: T,
      file: File,
      setter: React.Dispatch<
        React.SetStateAction<Record<T, string>>
      >,
    ) => {
      setter((current) => {
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

  const removePreviewUrl = useCallback(
    <T extends MediaKey>(
      key: T,
      setter: React.Dispatch<React.SetStateAction<Record<T, string>>>,
    ) => {
      setter((current) => {
        const previous = current[key];
        if (previous) {
          URL.revokeObjectURL(previous);
          previewUrls.current.delete(previous);
        }
        return { ...current, [key]: "" };
      });
    },
    [],
  );

  const selectImage = (key: ImageKey, file: File | null) => {
    if (!file) return;

    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setImageFiles((current) => ({ ...current, [key]: file }));
    setPreviewUrl(key, file, setImagePreviews);
  };

  const removeImage = (key: ImageKey) => {
    setImageFiles((current) => ({ ...current, [key]: null }));
    removePreviewUrl(key, setImagePreviews);
  };

  const selectVideo = (key: VideoKey, file: File | null) => {
    if (!file) return;

    const validationError = validateVideo(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const duplicate = Object.entries(videoFiles).some(
      ([existingKey, existingFile]) =>
        existingKey !== key &&
        existingFile !== null &&
        isSameFile(existingFile, file),
    );

    if (duplicate) {
      setError("That video is already selected in another slot.");
      return;
    }

    setError("");
    setVideoFiles((current) => ({ ...current, [key]: file }));
    setPreviewUrl(key, file, setVideoPreviews);
  };

  const removeVideo = (key: VideoKey) => {
    setVideoFiles((current) => ({ ...current, [key]: null }));
    removePreviewUrl(key, setVideoPreviews);
  };

  const updateAddress = (
    field: keyof typeof addressFields,
    value: string,
  ) => {
    const nextAddressFields = { ...addressFields, [field]: value };
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
  };

  const selectMapLocation = (
    latitude: number,
    longitude: number,
    address: string,
    parts: AddressParts,
  ) => {
    const nextAddressFields = {
      addressNumber: parts.houseNumber || addressFields.addressNumber,
      streetName: parts.road || addressFields.streetName,
      neighbourhood: parts.neighbourhood || addressFields.neighbourhood,
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
      facilities: Array.from(new Set([...current.facilities, value])),
    }));
    setCustomFacility("");
    setShowCustomFacility(false);
  };

  const addRoomType = (roomType: string) => {
    if (!roomType || boarding.rooms_for_available.includes(roomType)) return;

    setBoarding((current) => ({
      ...current,
      rooms_for_available: [...current.rooms_for_available, roomType],
      price_per_room: [...current.price_per_room, ""],
      hasEnsuite_bathrooms_in_rooms_for: [
        ...current.hasEnsuite_bathrooms_in_rooms_for,
        "false",
      ],
      occupiedRooms: [...current.occupiedRooms, "0"],
    }));
  };

  const removeRoomType = (index: number) => {
    setBoarding((current) => ({
      ...current,
      rooms_for_available: current.rooms_for_available.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
      price_per_room: current.price_per_room.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
      hasEnsuite_bathrooms_in_rooms_for:
        current.hasEnsuite_bathrooms_in_rooms_for.filter(
          (_, itemIndex) => itemIndex !== index,
        ),
      occupiedRooms: current.occupiedRooms.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const updateBoardingArray = (
    field:
      | "price_per_room"
      | "hasEnsuite_bathrooms_in_rooms_for"
      | "occupiedRooms",
    index: number,
    value: string,
  ) => {
    setBoarding((current) => {
      const next = [...current[field]];
      next[index] = value;
      return { ...current, [field]: next };
    });
  };

  const validateForm = (): string | null => {
    if (!organization?.$id || !organization.userId) {
      return "Your organization account is not ready. Refresh and try again.";
    }

    if (!form.propertyName.trim()) return "Property name is required.";
    if (!form.type) return "Property type is required.";
    if (!form.description.trim()) return "Property description is required.";
    if (!form.address.trim()) return "Property address is required.";
    if (!imageFiles.image1) return "Image 1 is required.";

    const price = Number(form.price);
    const priceThreshold = Number(form.priceThreshold || 0);
    const area = Number(form.area);
    const bedrooms = Number(form.bedrooms);
    const bathrooms = Number(form.bathrooms);
    const roomFor = Number(form.roomFor || 0);
    const totalSlots = Number(form.totalSlots);
    const occupiedSlots = Number(form.occupiedSlots || 0);

    const numericValues = [
      { label: "Price", value: price },
      { label: "Price threshold", value: priceThreshold },
      { label: "Area", value: area },
      { label: "Bedrooms", value: bedrooms },
      { label: "Bathrooms", value: bathrooms },
      { label: "Room capacity", value: roomFor },
      { label: "Total slots", value: totalSlots },
      { label: "Occupied slots", value: occupiedSlots },
    ];

    for (const item of numericValues) {
      if (!Number.isFinite(item.value) || item.value < 0) {
        return `${item.label} must be zero or greater.`;
      }
    }

    if (totalSlots < 1) return "Total slots must be at least 1.";
    if (occupiedSlots > totalSlots) {
      return "Occupied slots cannot exceed total slots.";
    }

    if (isBoarding) {
      const invalidRoomPrice = boarding.price_per_room.some(
        (value) => value.trim() !== "" && Number(value) < 0,
      );
      if (invalidRoomPrice) {
        return "Boarding room prices cannot be negative.";
      }

      const invalidOccupiedRooms = boarding.occupiedRooms.some(
        (value) => Number(value || 0) < 0,
      );
      if (invalidOccupiedRooms) {
        return "Occupied room counts cannot be negative.";
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
    const uploadedVideos: Record<VideoKey, string> = {
      video1: "",
      video2: "",
      video3: "",
    };

    const propertyDocumentId = ID.unique();
    const boardingDocumentId = ID.unique();
    let propertyCreated = false;
    let boardingCreated = false;

    try {
      const uploadQueue: Array<{
        key: MediaKey;
        file: File;
        bucketId: string;
        label: string;
        mediaType: "image" | "video";
      }> = [];

      (Object.keys(imageFiles) as ImageKey[]).forEach((key, index) => {
        const file = imageFiles[key];
        if (file) {
          uploadQueue.push({
            key,
            file,
            bucketId: PROPERTY_BUCKET_ID,
            label: `Image ${index + 1}`,
            mediaType: "image",
          });
        }
      });

      if (isBoarding) {
        (Object.keys(videoFiles) as VideoKey[]).forEach((key, index) => {
          const file = videoFiles[key];
          if (file) {
            uploadQueue.push({
              key,
              file,
              bucketId: VIDEO_BUCKET_ID,
              label: `Video ${index + 1}`,
              mediaType: "video",
            });
          }
        });
      }

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

        if (item.mediaType === "image") {
          uploadedImages[item.key as ImageKey] = uploaded.url;
        } else {
          uploadedVideos[item.key as VideoKey] = uploaded.url;
        }
      }

      const price = Number(form.price);
      const priceThreshold = Number(form.priceThreshold || 0);
      const area = Number(form.area);
      const bedrooms = Number(form.bedrooms);
      const bathrooms = Number(form.bathrooms);
      const roomFor = Number(form.roomFor || 0);
      const totalSlots = Number(form.totalSlots);
      const occupiedSlots = Number(form.occupiedSlots || 0);
      const availableSlots = Math.max(0, totalSlots - occupiedSlots);
      const latitude = form.latitude ? Number(form.latitude) : null;
      const longitude = form.longitude ? Number(form.longitude) : null;
      const isAvailable = availableSlots > 0;

      setUploadProgress({
        current: uploadQueue.length,
        total: uploadQueue.length,
        label: "Saving property",
      });

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        propertyDocumentId,
        {
          propertyName: form.propertyName.trim(),
          type: form.type,
          description: form.description.trim(),
          address: form.address.trim(),
          price,
          priceThreshold,
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
          views: 0,
          likes: 0,
          requests: 0,
        },
      );
      propertyCreated = true;

      if (isBoarding) {
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_BOARDING_PLACES_COLLECTION_ID!,
          boardingDocumentId,
          {
            propertyName: form.propertyName.trim(),
            description: form.description.trim(),
            rooms_for_available: boarding.rooms_for_available.join(", "),
            price_per_room: boarding.price_per_room.join(", "),
            address: form.address.trim(),
            capacity: totalSlots || roomFor,
            hasEnsuite_bathrooms: boarding.hasEnsuite_bathrooms,
            hasEnsuite_bathrooms_in_rooms_for:
              boarding.hasEnsuite_bathrooms_in_rooms_for.join(", "),
            rating: boarding.rating,
            facilities: form.facilities.join(", "),
            image1: uploadedImages.image1,
            image2: uploadedImages.image2,
            image3: uploadedImages.image3,
            video1: uploadedVideos.video1,
            video2: uploadedVideos.video2,
            video3: uploadedVideos.video3,
            creatorId: organization.userId,
            likes: 0,
            isAvailable,
            curfew: form.curfew,
            requests: 0,
            priceThreshold,
            occupiedSlots,
            rooms_for_occupied: boarding.occupiedRooms.join(", "),
            availableSlots,
            latitude,
            longitude,
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
        console.warn("Property count could not be refreshed:", countError);
      }

      router.replace("/dashboard/properties");
    } catch (submitError) {
      if (boardingCreated) {
        await databases
          .deleteDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_BOARDING_PLACES_COLLECTION_ID!,
            boardingDocumentId,
          )
          .catch(() => undefined);
      }

      if (propertyCreated) {
        await databases
          .deleteDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
            propertyDocumentId,
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

  const dark = theme === "dark";
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
                <h1 className="text-2xl font-bold">Add New Property</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Upload property media and create a listing for your
                  organization.
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Could not save the listing</p>
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
                      {uploadProgress.current}/{Math.max(1, uploadProgress.total)}
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
                <section
                  className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${cardClass}`}
                >
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                    <ImageIcon className="h-5 w-5 text-[var(--accent-500)]" />
                    Property Images
                  </h2>

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
                                <span className="ml-1 text-red-500">*</span>
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
                                            event.target.files?.[0] ?? null,
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
                                        event.target.files?.[0] ?? null,
                                      );
                                      event.currentTarget.value = "";
                                    }}
                                  />
                                </label>
                              )}
                            </div>

                            {file && (
                              <p className="mt-2 truncate text-xs text-gray-500 dark:text-gray-400">
                                {file.name} · {formatFileSize(file.size)}
                              </p>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </section>

                <section
                  className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${cardClass}`}
                >
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                    <Building2 className="h-5 w-5 text-[var(--accent-500)]" />
                    Property Details
                  </h2>

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
                          className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-500)] ${inputClass}`}
                          placeholder="Property name"
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
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            type: event.target.value,
                          }))
                        }
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-500)] ${inputClass}`}
                      >
                        <option value="">Select type</option>
                        {propertyTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
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
                          className={`w-full resize-none rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-500)] ${inputClass}`}
                          placeholder="Describe the property"
                        />
                      </div>
                    </label>
                  </div>
                </section>

                <section
                  className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${cardClass}`}
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-bold">
                      <MapPin className="h-5 w-5 text-[var(--accent-500)]" />
                      Address
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowMapPicker((current) => !current)}
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-500)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <Map className="h-4 w-4" />
                      {showMapPicker ? "Hide map" : "Pick on map"}
                    </button>
                  </div>

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
                            updateAddress("addressNumber", event.target.value)
                          }
                          className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm ${inputClass}`}
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
                          updateAddress("streetName", event.target.value)
                        }
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm ${inputClass}`}
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
                          updateAddress("neighbourhood", event.target.value)
                        }
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm ${inputClass}`}
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
                          updateAddress("cityTown", event.target.value)
                        }
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm ${inputClass}`}
                        placeholder="Bindura"
                      />
                    </label>
                  </div>

                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Saved address: {form.address || "No address entered yet"}
                  </p>

                  {showMapPicker && (
                    <div className="mt-4">
                      <MapPicker
                        onLocationSelect={selectMapLocation}
                        theme={theme}
                        initialLat={
                          form.latitude ? Number(form.latitude) : undefined
                        }
                        initialLng={
                          form.longitude ? Number(form.longitude) : undefined
                        }
                      />
                      {form.latitude && form.longitude && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
                          <Navigation className="h-4 w-4" />
                          {Number(form.latitude).toFixed(6)}, {" "}
                          {Number(form.longitude).toFixed(6)}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section
                  className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${cardClass}`}
                >
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                    <DollarSign className="h-5 w-5 text-[var(--accent-500)]" />
                    Pricing and Capacity
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        field: "price" as const,
                        label: "Price *",
                        icon: DollarSign,
                        step: "10",
                      },
                      {
                        field: "priceThreshold" as const,
                        label: "Price threshold",
                        icon: DollarSign,
                        step: "10",
                      },
                      {
                        field: "area" as const,
                        label: "Area (m²) *",
                        icon: Ruler,
                        step: "0.01",
                      },
                      {
                        field: "bedrooms" as const,
                        label: "Bedrooms *",
                        icon: Bed,
                        step: "1",
                      },
                      {
                        field: "bathrooms" as const,
                        label: "Bathrooms *",
                        icon: Bath,
                        step: "1",
                      },
                      {
                        field: "roomFor" as const,
                        label: "Maximum people",
                        icon: Users,
                        step: "1",
                      },
                      {
                        field: "totalSlots" as const,
                        label: "Total slots *",
                        icon: Calendar,
                        step: "1",
                      },
                      {
                        field: "occupiedSlots" as const,
                        label: "Occupied slots",
                        icon: Users,
                        step: "1",
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
                              min="0"
                              step={item.step}
                              value={form[item.field]}
                              disabled={submitting}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  [item.field]: event.target.value,
                                }))
                              }
                              className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm ${inputClass}`}
                            />
                          </div>
                        </label>
                      );
                    })}

                    <label>
                      <span className="mb-1.5 block text-xs font-semibold">
                        Available slots
                      </span>
                      <div className="relative">
                        <CheckCircle className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                        <input
                          value={form.availableSlots}
                          disabled
                          className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm opacity-75 ${inputClass}`}
                        />
                      </div>
                    </label>

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
                          className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm ${inputClass}`}
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
                </section>

                {isBoarding && (
                  <section
                    className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${cardClass}`}
                  >
                    <div className="mb-4">
                      <h2 className="flex items-center gap-2 text-lg font-bold">
                        <Video className="h-5 w-5 text-[var(--accent-500)]" />
                        Boarding Videos
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Pick actual videos from this computer. They are uploaded
                        directly to Appwrite as Video 1, Video 2, and Video 3.
                      </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      {(["video1", "video2", "video3"] as VideoKey[]).map(
                        (key, index) => {
                          const file = videoFiles[key];
                          const preview = videoPreviews[key];

                          return (
                            <div key={key}>
                              <label className="mb-2 block text-sm font-semibold">
                                Video {index + 1}
                              </label>

                              <div className="overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-950">
                                {preview ? (
                                  <div>
                                    <video
                                      src={preview}
                                      controls
                                      preload="metadata"
                                      playsInline
                                      className="aspect-video w-full bg-black object-contain"
                                    >
                                      Your browser cannot preview this video.
                                    </video>
                                    <div className="space-y-2 p-3">
                                      <p className="truncate text-xs font-semibold">
                                        {file?.name}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {file && formatFileSize(file.size)}
                                      </p>
                                      <div className="flex gap-2">
                                        <label className="flex-1 cursor-pointer rounded-xl border border-gray-200 px-3 py-2 text-center text-xs font-semibold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
                                          Replace
                                          <input
                                            type="file"
                                            accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
                                            className="hidden"
                                            disabled={submitting}
                                            onChange={(event) => {
                                              selectVideo(
                                                key,
                                                event.target.files?.[0] ?? null,
                                              );
                                              event.currentTarget.value = "";
                                            }}
                                          />
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => removeVideo(key)}
                                          disabled={submitting}
                                          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 p-5 text-center text-gray-500">
                                    <Video className="h-10 w-10" />
                                    <span className="text-sm font-semibold">
                                      Choose Video {index + 1}
                                    </span>
                                    <span className="text-xs">
                                      MP4, WEBM, MOV or M4V · max {" "}
                                      {MAX_VIDEO_SIZE_MB} MB
                                    </span>
                                    <input
                                      type="file"
                                      accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
                                      className="hidden"
                                      disabled={submitting}
                                      onChange={(event) => {
                                        selectVideo(
                                          key,
                                          event.target.files?.[0] ?? null,
                                        );
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>

                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                      Videos are never converted to Base64. The original files
                      are sent to Appwrite Storage and only their Appwrite URLs
                      are saved in the boarding-place document.
                    </div>
                  </section>
                )}

                {isBoarding && (
                  <section
                    className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${cardClass}`}
                  >
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                      <BookOpen className="h-5 w-5 text-[var(--accent-500)]" />
                      Boarding Room Types
                    </h2>

                    <select
                      value=""
                      disabled={submitting}
                      onChange={(event) => {
                        addRoomType(event.target.value);
                        event.currentTarget.value = "";
                      }}
                      className={`w-full max-w-md rounded-xl border px-3 py-2.5 text-sm ${inputClass}`}
                    >
                      <option value="">Add room type</option>
                      {roomOptions
                        .filter(
                          (option) =>
                            !boarding.rooms_for_available.includes(option.value),
                        )
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </select>

                    {boarding.rooms_for_available.length > 0 && (
                      <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full min-w-[720px] text-sm">
                          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-950 dark:text-gray-400">
                            <tr>
                              <th className="px-4 py-3">Room type</th>
                              <th className="px-4 py-3">Price</th>
                              <th className="px-4 py-3">Ensuite</th>
                              <th className="px-4 py-3">Occupied</th>
                              <th className="px-4 py-3">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {boarding.rooms_for_available.map((room, index) => (
                              <tr key={room}>
                                <td className="px-4 py-3 font-semibold">
                                  {roomOptions.find(
                                    (option) => option.value === room,
                                  )?.label ?? room}
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={boarding.price_per_room[index] ?? ""}
                                    disabled={submitting}
                                    onChange={(event) =>
                                      updateBoardingArray(
                                        "price_per_room",
                                        index,
                                        event.target.value,
                                      )
                                    }
                                    className={`w-28 rounded-lg border px-2 py-1.5 ${inputClass}`}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={
                                      boarding
                                        .hasEnsuite_bathrooms_in_rooms_for[
                                        index
                                      ] ?? "false"
                                    }
                                    disabled={submitting}
                                    onChange={(event) =>
                                      updateBoardingArray(
                                        "hasEnsuite_bathrooms_in_rooms_for",
                                        index,
                                        event.target.value,
                                      )
                                    }
                                    className={`rounded-lg border px-2 py-1.5 ${inputClass}`}
                                  >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={boarding.occupiedRooms[index] ?? "0"}
                                    disabled={submitting}
                                    onChange={(event) =>
                                      updateBoardingArray(
                                        "occupiedRooms",
                                        index,
                                        event.target.value,
                                      )
                                    }
                                    className={`w-20 rounded-lg border px-2 py-1.5 ${inputClass}`}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => removeRoomType(index)}
                                    disabled={submitting}
                                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950">
                        <input
                          type="checkbox"
                          checked={boarding.hasEnsuite_bathrooms}
                          disabled={submitting}
                          onChange={(event) =>
                            setBoarding((current) => ({
                              ...current,
                              hasEnsuite_bathrooms: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 accent-[var(--accent-500)]"
                        />
                        <span className="text-sm font-semibold">
                          Has ensuite bathrooms
                        </span>
                      </label>

                    </div>
                  </section>
                )}

                <section
                  className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${cardClass}`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold">Facilities</h2>
                    <button
                      type="button"
                      onClick={() => setShowCustomFacility((current) => !current)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold dark:border-gray-700"
                    >
                      <Plus className="h-4 w-4" />
                      Custom facility
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {defaultFacilities.map(({ name, icon: Icon }) => {
                      const active = form.facilities.includes(name);

                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleFacility(name)}
                          disabled={submitting}
                          className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition ${
                            active
                              ? "border-[var(--accent-500)] bg-[var(--accent-500)] text-white"
                              : dark
                                ? "border-gray-700 bg-gray-950 hover:border-gray-600"
                                : "border-gray-200 bg-gray-50 hover:border-gray-300"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {name}
                        </button>
                      );
                    })}
                  </div>

                  {showCustomFacility && (
                    <div className="mt-4 flex max-w-md gap-2">
                      <input
                        value={customFacility}
                        disabled={submitting}
                        onChange={(event) => setCustomFacility(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addCustomFacility();
                          }
                        }}
                        placeholder="Facility name"
                        className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm ${inputClass}`}
                      />
                      <button
                        type="button"
                        onClick={addCustomFacility}
                        disabled={submitting || !customFacility.trim()}
                        className="rounded-xl bg-[var(--accent-500)] px-4 text-white disabled:opacity-50"
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
                              onClick={() => toggleFacility(facility)}
                              disabled={submitting}
                              aria-label={`Remove ${facility}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </section>

                <section
                  className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5 ${cardClass}`}
                >
                  <div>
                    <p className="font-bold">Ready to publish?</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {selectedUploadCount} media file
                      {selectedUploadCount === 1 ? "" : "s"} selected.
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
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-500)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
                </section>
              </form>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}