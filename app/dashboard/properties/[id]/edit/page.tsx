"use client";

import {
  ArrowLeft,
  Bath,
  Bed,
  Building2,
  Car,
  CheckCircle,
  DollarSign,
  Droplets,
  Dumbbell,
  FileText,
  Home,
  Image as ImageIcon,
  MapPin,
  Moon,
  PawPrint,
  Plus,
  Ruler,
  Save,
  Sofa,
  Trash2,
  Upload,
  Users,
  Waves,
  Wifi,
  Wind,
  X,
} from "lucide-react";
import { ID } from "appwrite";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases, storage } from "@/lib/appwrite/config";
import { getOwnedProperty } from "@/lib/appwrite/helpers";
import { cacheService } from "@/lib/cache.service";
import { CACHE_KEYS } from "@/lib/cache-keys";
import type { Property } from "@/types/property";

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
  { name: "Pool", icon: Droplets },
  { name: "Gym", icon: Dumbbell },
  { name: "Laundry", icon: Waves },
  { name: "Pet Friendly", icon: PawPrint },
  { name: "Furnished", icon: Sofa },
];

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
  facilities: string[];
  isAvailable: boolean;
}

interface ImageState {
  image1: string;
  image2: string;
  image3: string;
}

type ImageKey = keyof ImageState;

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

function parseFacilities(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function EditPropertyPage() {
  const { organization } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const propertyId = params.id;
  const margin = useDashboardMargin();

  const inputRefs = {
    image1: useRef<HTMLInputElement | null>(null),
    image2: useRef<HTMLInputElement | null>(null),
    image3: useRef<HTMLInputElement | null>(null),
  };

  const [form, setForm] = useState<FormState>({
    propertyName: "",
    type: "House",
    description: "",
    address: "",
    price: "",
    priceThreshold: "",
    area: "",
    bedrooms: "",
    bathrooms: "",
    roomFor: "1",
    curfew: "No curfew",
    facilities: [],
    isAvailable: true,
  });
  const [images, setImages] = useState<ImageState>({
    image1: "",
    image2: "",
    image3: "",
  });
  const [originalImages, setOriginalImages] = useState<ImageState>({
    image1: "",
    image2: "",
    image3: "",
  });
  const [imageFiles, setImageFiles] = useState<
    Record<ImageKey, File | null>
  >({
    image1: null,
    image2: null,
    image3: null,
  });
  const [customFacility, setCustomFacility] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProperty = useCallback(async () => {
    if (!organization?.userId || !propertyId) return;

    setLoading(true);

    try {
      const property = (await getOwnedProperty(
        propertyId,
        organization.userId,
      )) as unknown as Property;

      setForm({
        propertyName: property.propertyName ?? "",
        type: property.type ?? "House",
        description: property.description ?? "",
        address: property.address ?? "",
        price: String(property.price ?? ""),
        priceThreshold: String(property.priceThreshold ?? ""),
        area: String(property.area ?? ""),
        bedrooms: String(property.bedrooms ?? ""),
        bathrooms: String(property.bathrooms ?? ""),
        roomFor: String(property.roomFor ?? 1),
        curfew: property.curfew ?? "No curfew",
        facilities: parseFacilities(property.facilities),
        isAvailable: property.isAvailable !== false,
      });

      const currentImages = {
        image1: property.image1 ?? "",
        image2: property.image2 ?? "",
        image3: property.image3 ?? "",
      };

      setImages(currentImages);
      setOriginalImages(currentImages);
    } catch (error) {
      console.error("Unable to load property:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load this property.",
      );
      router.replace("/dashboard/properties");
    } finally {
      setLoading(false);
    }
  }, [organization?.userId, propertyId, router]);

  useEffect(() => {
    void loadProperty();
  }, [loadProperty]);

  useEffect(() => {
    return () => {
      Object.values(images).forEach((image) => {
        if (image.startsWith("blob:")) URL.revokeObjectURL(image);
      });
    };
  }, [images]);

  const allFacilities = useMemo(
    () =>
      Array.from(
        new Set([
          ...defaultFacilities.map((facility) => facility.name),
          ...form.facilities,
        ]),
      ),
    [form.facilities],
  );

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
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
  };

  const selectImage = (key: ImageKey, file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Each image must be smaller than 8 MB.");
      return;
    }

    setImages((current) => {
      if (current[key].startsWith("blob:")) {
        URL.revokeObjectURL(current[key]);
      }

      return { ...current, [key]: URL.createObjectURL(file) };
    });
    setImageFiles((current) => ({ ...current, [key]: file }));
  };

  const removeImage = (key: ImageKey) => {
    setImages((current) => {
      if (current[key].startsWith("blob:")) {
        URL.revokeObjectURL(current[key]);
      }

      return { ...current, [key]: "" };
    });
    setImageFiles((current) => ({ ...current, [key]: null }));
  };

  const validate = (): string | null => {
    if (!form.propertyName.trim()) return "Property name is required.";
    if (!form.type) return "Property type is required.";
    if (!form.address.trim()) return "Property address is required.";

    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      return "Enter a valid property price.";
    }

    const capacity = Number(form.roomFor || 1);
    if (!Number.isFinite(capacity) || capacity < 1) {
      return "Room capacity must be at least 1.";
    }

    if (!images.image1) {
      return "At least one property image is required.";
    }

    return null;
  };

  const uploadImage = async (file: File): Promise<string> => {
    const uploaded = await storage.createFile(
      process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!,
      ID.unique(),
      file,
    );

    return storage
      .getFileView(
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!,
        uploaded.$id,
      )
      .toString();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!organization?.userId) return;

    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);

    const newlyUploadedUrls: string[] = [];

    try {
      await getOwnedProperty(propertyId, organization.userId);

      const finalImages: ImageState = { ...images };

      for (const key of Object.keys(imageFiles) as ImageKey[]) {
        const file = imageFiles[key];
        if (!file) continue;

        const uploadedUrl = await uploadImage(file);
        newlyUploadedUrls.push(uploadedUrl);
        finalImages[key] = uploadedUrl;
      }

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        propertyId,
        {
          propertyName: form.propertyName.trim(),
          type: form.type,
          description: form.description.trim(),
          address: form.address.trim(),
          price: Number(form.price),
          priceThreshold: Number(form.priceThreshold || 0),
          area: Number(form.area || 0),
          bedrooms: Number(form.bedrooms || 0),
          bathrooms: Number(form.bathrooms || 0),
          roomFor: Number(form.roomFor || 1),
          curfew: form.curfew,
          facilities: form.facilities.join(", "),
          isAvailable: form.isAvailable,
          image1: finalImages.image1,
          image2: finalImages.image2,
          image3: finalImages.image3,
        },
      );

      const imageKeys = Object.keys(originalImages) as ImageKey[];
      const oldUrlsToDelete = imageKeys
        .filter(
          (key) =>
            Boolean(originalImages[key]) &&
            originalImages[key] !== finalImages[key],
        )
        .map((key) => originalImages[key])
        .filter((url, index, values) => values.indexOf(url) === index);

      await Promise.allSettled(
        oldUrlsToDelete.map(async (url) => {
          const fileId = fileIdFromUrl(url);
          if (!fileId) return;

          await storage.deleteFile(
            process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!,
            fileId,
          );
        }),
      );

      cacheService.remove(
        CACHE_KEYS.organizationProperties(organization.$id),
      );
      cacheService.remove(CACHE_KEYS.PROPERTIES);
      cacheService.remove(CACHE_KEYS.PROPERTY(propertyId));

      toast.success("Property updated.");
      router.replace(`/dashboard/properties/${propertyId}`);
    } catch (error) {
      await Promise.allSettled(
        newlyUploadedUrls.map(async (url) => {
          const fileId = fileIdFromUrl(url);
          if (!fileId) return;

          await storage.deleteFile(
            process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!,
            fileId,
          );
        }),
      );

      console.error("Unable to update property:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update property.",
      );
    } finally {
      setSaving(false);
    }
  };

  const dark = theme === "dark";

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
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent-500)] dark:border-gray-700" />
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
              <div className="mb-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold">Edit property</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Update this organization-owned listing.
                  </p>
                </div>
              </div>

              <form
                onSubmit={submit}
                className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-800 dark:bg-gray-900"
              >
                <section>
                  <h2 className="mb-4 flex items-center gap-2 font-bold">
                    <ImageIcon className="h-5 w-5 text-[var(--accent-500)]" />
                    Property images
                  </h2>

                  <div className="grid gap-4 md:grid-cols-3">
                    {(Object.keys(images) as ImageKey[]).map((key, index) => (
                      <div
                        key={key}
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                      >
                        {images[key] ? (
                          <>
                            <Image
                              src={images[key]}
                              alt={`Property image ${index + 1}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <div className="absolute inset-x-2 bottom-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => inputRefs[key].current?.click()}
                                className="flex-1 rounded-lg bg-black/70 px-2 py-2 text-xs font-semibold text-white"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(key)}
                                className="rounded-lg bg-red-600 p-2 text-white"
                                aria-label={`Remove image ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => inputRefs[key].current?.click()}
                            className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-500"
                          >
                            <Upload className="h-7 w-7" />
                            <span className="text-sm font-semibold">
                              Add image {index + 1}
                            </span>
                          </button>
                        )}

                        <input
                          ref={inputRefs[key]}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) =>
                            selectImage(key, event.target.files?.[0] ?? null)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="space-y-4">
                    <h2 className="flex items-center gap-2 font-bold">
                      <Building2 className="h-5 w-5 text-[var(--accent-500)]" />
                      Listing details
                    </h2>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">
                        Property name
                      </span>
                      <div className="relative">
                        <Home className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          value={form.propertyName}
                          onChange={(event) =>
                            updateField("propertyName", event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-500)] dark:border-gray-700 dark:bg-gray-950"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">
                        Property type
                      </span>
                      <select
                        value={form.type}
                        onChange={(event) =>
                          updateField("type", event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                      >
                        {propertyTypes.map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">
                        Description
                      </span>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <textarea
                          value={form.description}
                          onChange={(event) =>
                            updateField("description", event.target.value)
                          }
                          rows={5}
                          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-500)] dark:border-gray-700 dark:bg-gray-950"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">
                        Address
                      </span>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          value={form.address}
                          onChange={(event) =>
                            updateField("address", event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--accent-500)] dark:border-gray-700 dark:bg-gray-950"
                        />
                      </div>
                    </label>
                  </section>

                  <section className="space-y-4">
                    <h2 className="flex items-center gap-2 font-bold">
                      <DollarSign className="h-5 w-5 text-[var(--accent-500)]" />
                      Pricing and capacity
                    </h2>

                    <div className="grid grid-cols-2 gap-3">
                      <label>
                        <span className="mb-1.5 block text-sm font-medium">
                          Price
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={form.price}
                          onChange={(event) =>
                            updateField("price", event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-sm font-medium">
                          Lowest acceptable
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={form.priceThreshold}
                          onChange={(event) =>
                            updateField("priceThreshold", event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        {
                          field: "area" as const,
                          label: "Area",
                          icon: Ruler,
                        },
                        {
                          field: "bedrooms" as const,
                          label: "Beds",
                          icon: Bed,
                        },
                        {
                          field: "bathrooms" as const,
                          label: "Baths",
                          icon: Bath,
                        },
                        {
                          field: "roomFor" as const,
                          label: "Capacity",
                          icon: Users,
                        },
                      ].map((item) => {
                        const Icon = item.icon;

                        return (
                          <label key={item.field}>
                            <span className="mb-1.5 flex items-center gap-1 text-xs font-medium">
                              <Icon className="h-3.5 w-3.5" />
                              {item.label}
                            </span>
                            <input
                              type="number"
                              min={item.field === "roomFor" ? 1 : 0}
                              value={form[item.field]}
                              onChange={(event) =>
                                updateField(item.field, event.target.value)
                              }
                              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                            />
                          </label>
                        );
                      })}
                    </div>

                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                        <Moon className="h-4 w-4" />
                        Curfew
                      </span>
                      <select
                        value={form.curfew}
                        onChange={(event) =>
                          updateField("curfew", event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                      >
                        <option>No curfew</option>
                        <option>9:00 PM</option>
                        <option>10:00 PM</option>
                        <option>11:00 PM</option>
                        <option>12:00 AM</option>
                      </select>
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950">
                      <div>
                        <p className="text-sm font-semibold">Available</p>
                        <p className="text-xs text-gray-500">
                          Show the listing as open for requests.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.isAvailable}
                        onChange={(event) =>
                          updateField("isAvailable", event.target.checked)
                        }
                        className="h-5 w-5 accent-[var(--accent-500)]"
                      />
                    </label>
                  </section>
                </div>

                <section>
                  <h2 className="mb-3 font-bold">Facilities</h2>
                  <div className="flex flex-wrap gap-2">
                    {allFacilities.map((facility) => {
                      const known = defaultFacilities.find(
                        (item) => item.name === facility,
                      );
                      const Icon = known?.icon ?? CheckCircle;
                      const active = form.facilities.includes(facility);

                      return (
                        <button
                          key={facility}
                          type="button"
                          onClick={() => toggleFacility(facility)}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                            active
                              ? "border-[var(--accent-500)] bg-[var(--accent-500)] text-white"
                              : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {facility}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex max-w-md gap-2">
                    <input
                      value={customFacility}
                      onChange={(event) =>
                        setCustomFacility(event.target.value)
                      }
                      placeholder="Add another facility"
                      className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                    />
                    <button
                      type="button"
                      onClick={addCustomFacility}
                      className="rounded-xl border border-gray-200 px-3 dark:border-gray-700"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </section>

                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={saving}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold dark:border-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
