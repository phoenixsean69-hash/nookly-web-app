"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useParams, useRouter } from "next/navigation";
import { databases, storage } from "@/lib/appwrite/config";
import { ID } from "appwrite";
import Image from "next/image";
import {
  Building2,
  Home,
  FileText,
  MapPin,
  DollarSign,
  Ruler,
  Bed,
  Bath,
  Users,
  Moon,
  Wifi,
  Car,
  Wind,
  Thermometer,
  Droplets,
  Dumbbell,
  Waves,
  PawPrint,
  Sofa,
  CheckCircle,
  XCircle,
  Upload,
  Trash2,
  ArrowLeft,
  PlusCircle,
  MinusCircle,
  Image as ImageIcon,
  Hash,
} from "lucide-react";

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

const defaultFacilitiesList = [
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

const generateCurfewOptions = () => {
  const options = ["No curfew"];
  for (let i = 21; i <= 24; i++) {
    const hour12 = i === 24 ? 12 : i % 12;
    const ampm = i < 12 || i === 24 ? "AM" : "PM";
    const displayHour = hour12 === 0 ? 12 : hour12;
    options.push(`${displayHour}:00 ${ampm}`);
  }
  return options;
};

const curfewOptions = generateCurfewOptions();

export default function EditPropertyPage() {
  const { organization } = useAuth();
  const { theme } = useTheme();
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  
  // Refs for file inputs
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showCustomFacilityInput, setShowCustomFacilityInput] = useState(false);
  const [customFacilityName, setCustomFacilityName] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [addressFields, setAddressFields] = useState({
    addressNumber: "",
    streetName: "",
    neighbourhood: "",
    cityTown: "",
  });
  
  const [formData, setFormData] = useState({
    propertyName: "",
    type: "",
    description: "",
    address: "",
    price: "0",
    priceThreshold: "0",
    area: "",
    bedrooms: "",
    bathrooms: "",
    facilities: [] as string[],
    isAvailable: true,
    roomFor: "",
    curfew: "No curfew",
  });
  
  const [images, setImages] = useState({
    image1: "",
    image2: "",
    image3: "",
  });
  
  const [existingImages, setExistingImages] = useState({
    image1: "",
    image2: "",
    image3: "",
  });
  
  const [imageFiles, setImageFiles] = useState({
    image1: null as File | null,
    image2: null as File | null,
    image3: null as File | null,
  });
  
  const [error, setError] = useState("");

  // Function to check sidebar state from localStorage
  const checkSidebarState = useCallback(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    setIsSidebarCollapsed(savedState === 'true');
  }, []);

  // Listen for sidebar collapse state changes
  useEffect(() => {
    // Initial check
    checkSidebarState();

    // Listen for storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        setIsSidebarCollapsed(e.newValue === 'true');
      }
    };

    // Custom event listener for sidebar toggle
    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail?.isCollapsed !== undefined) {
        setIsSidebarCollapsed(e.detail.isCollapsed);
      } else {
        checkSidebarState();
      }
    };

    // Also check on window focus
    const handleFocus = () => {
      checkSidebarState();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sidebarToggle', handleCustomEvent as EventListener);
    window.addEventListener('focus', handleFocus);

    // Poll for changes as a fallback
    const interval = setInterval(() => {
      const savedState = localStorage.getItem('sidebarCollapsed');
      const isCollapsed = savedState === 'true';
      setIsSidebarCollapsed(prev => {
        if (prev !== isCollapsed) {
          return isCollapsed;
        }
        return prev;
      });
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sidebarToggle', handleCustomEvent as EventListener);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [checkSidebarState]);

  useEffect(() => {
    fetchProperty();
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      const response = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        propertyId
      );
      const property = response as unknown as any;
      
      // Parse address into separate fields
      let addressNumber = "", streetName = "", neighbourhood = "", cityTown = "";
      const addressParts = property.address?.split(", ") || [];
      
      if (addressParts.length === 4) {
        addressNumber = addressParts[0] || "";
        streetName = addressParts[1] || "";
        neighbourhood = addressParts[2] || "";
        cityTown = addressParts[3] || "";
      } else if (addressParts.length === 3) {
        streetName = addressParts[0] || "";
        neighbourhood = addressParts[1] || "";
        cityTown = addressParts[2] || "";
      } else if (addressParts.length === 2) {
        streetName = addressParts[0] || "";
        cityTown = addressParts[1] || "";
      } else if (addressParts.length === 1) {
        cityTown = addressParts[0] || "";
      }
      
      setAddressFields({
        addressNumber,
        streetName,
        neighbourhood,
        cityTown,
      });
      
      setFormData({
        propertyName: property.propertyName || "",
        type: property.type || "",
        description: property.description || "",
        address: property.address || "",
        price: property.price?.toString() || "0",
        area: property.area?.toString() || "",
        priceThreshold: property.priceThreshold?.toString() || "0",
        bedrooms: property.bedrooms?.toString() || "",
        bathrooms: property.bathrooms?.toString() || "",
        facilities: property.facilities?.split(", ").filter(Boolean) || [],
        isAvailable: property.isAvailable ?? true,
        roomFor: property.roomFor?.toString() || "",
        curfew: property.curfew || "No curfew",
      });
      
      setExistingImages({
        image1: property.image1 || "",
        image2: property.image2 || "",
        image3: property.image3 || "",
      });
      
      setImages({
        image1: property.image1 || "",
        image2: property.image2 || "",
        image3: property.image3 || "",
      });
    } catch (error) {
      console.error("Error fetching property:", error);
      setError("Failed to load property");
    } finally {
      setInitialLoading(false);
    }
  };

  const handlePriceThresholdChange = (value: string) => {
  const numValue = parseInt(value);
  if (value === "") {
    setFormData({ ...formData, priceThreshold: "" });
  } else if (!isNaN(numValue) && numValue >= 0) {
    const roundedValue = Math.round(numValue / 10) * 10;
    setFormData({ ...formData, priceThreshold: roundedValue.toString() });
  } else if (!isNaN(numValue) && numValue < 0) {
    setFormData({ ...formData, priceThreshold: "0" });
  }
};

  const handlePositiveNumber = (value: string, field: string) => {
    const numValue = parseInt(value);
    if (value === "") {
      setFormData({ ...formData, [field]: "" });
    } else if (!isNaN(numValue) && numValue >= 0) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handlePriceChange = (value: string) => {
    const numValue = parseInt(value);
    if (value === "") {
      setFormData({ ...formData, price: "" });
    } else if (!isNaN(numValue) && numValue >= 0) {
      const roundedValue = Math.round(numValue / 10) * 10;
      setFormData({ ...formData, price: roundedValue.toString() });
    } else if (!isNaN(numValue) && numValue < 0) {
      setFormData({ ...formData, price: "0" });
    }
  };

  const handleAddressFieldChange = (field: string, value: string) => {
    const newAddressFields = { ...addressFields, [field]: value };
    setAddressFields(newAddressFields);
    
    const combinedAddress = [
      newAddressFields.addressNumber,
      newAddressFields.streetName,
      newAddressFields.neighbourhood,
      newAddressFields.cityTown,
    ]
      .filter(part => part.trim() !== "")
      .join(", ");
    
    setFormData({ ...formData, address: combinedAddress });
  };

  const handleImageUpload = async (file: File, imageKey: string): Promise<string> => {
    try {
      const uploadedFile = await storage.createFile(
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!,
        ID.unique(),
        file,
      );
      const fileUrl = storage
        .getFileView(
          process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!,
          uploadedFile.$id,
        )
        .toString();
      return fileUrl;
    } catch (error) {
      console.error(`Error uploading ${imageKey}:`, error);
      throw error;
    }
  };

  const handleImageSelect = (imageKey: string, file: File | null) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImages({ ...images, [imageKey]: previewUrl });
      setImageFiles({ ...imageFiles, [imageKey]: file });
    }
  };

  const deleteOldImage = async (imageUrl: string) => {
    if (!imageUrl) return;
    const fileId = imageUrl.split("/files/")[1]?.split("/")[0];
    if (fileId) {
      try {
        await storage.deleteFile(
          process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!,
          fileId
        );
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
    }
  };

  const handleRemoveImage = (imageKey: string) => {
    setImages({ ...images, [imageKey]: "" });
    setImageFiles({ ...imageFiles, [imageKey]: null });
    setExistingImages({ ...existingImages, [imageKey]: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setUploadingImages(true);

    try {
      const price = parseInt(formData.price);
      const priceThreshold = parseInt(formData.priceThreshold) || 0;
      const area = parseFloat(formData.area);
      const bedrooms = parseInt(formData.bedrooms);
      const bathrooms = parseInt(formData.bathrooms);
      const roomFor = formData.roomFor ? parseInt(formData.roomFor) : null;

      if (price < 0) throw new Error("Price cannot be negative");
      if (priceThreshold < 0) throw new Error("Price threshold cannot be negative");
      if (area < 0) throw new Error("Area cannot be negative");
      if (bedrooms < 0) throw new Error("Bedrooms cannot be negative");
      if (bathrooms < 0) throw new Error("Bathrooms cannot be negative");
      if (roomFor !== null && roomFor < 0) throw new Error("Room for cannot be negative");

      // Determine which images to keep
      let finalImage1 = existingImages.image1;
      let finalImage2 = existingImages.image2;
      let finalImage3 = existingImages.image3;

      // Upload new images and delete old ones
      if (imageFiles.image1) {
        if (existingImages.image1) await deleteOldImage(existingImages.image1);
        finalImage1 = await handleImageUpload(imageFiles.image1, "image1");
      }
      if (imageFiles.image2) {
        if (existingImages.image2) await deleteOldImage(existingImages.image2);
        finalImage2 = await handleImageUpload(imageFiles.image2, "image2");
      }
      if (imageFiles.image3) {
        if (existingImages.image3) await deleteOldImage(existingImages.image3);
        finalImage3 = await handleImageUpload(imageFiles.image3, "image3");
      }

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        propertyId,
        {
          propertyName: formData.propertyName,
          type: formData.type,
          description: formData.description,
          address: formData.address,
          price: price,
          priceThreshold: priceThreshold,
          area: area,
          bedrooms: bedrooms,
          bathrooms: bathrooms,
          facilities: formData.facilities.join(", "),
          image1: finalImage1,
          image2: finalImage2,
          image3: finalImage3,
          isAvailable: formData.isAvailable,
          roomFor: roomFor,
          curfew: formData.curfew,
        }
      );

      router.push(`/dashboard/properties/${propertyId}`);
    } catch (err: unknown) {
      console.error("Error updating property:", err);
      let errorMessage = "Failed to update property";
      if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const toggleFacility = (facility: string) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  const addCustomFacility = () => {
    if (customFacilityName.trim() && !formData.facilities.includes(customFacilityName.trim())) {
      setFormData({
        ...formData,
        facilities: [...formData.facilities, customFacilityName.trim()]
      });
      setCustomFacilityName("");
      setShowCustomFacilityInput(false);
    }
  };

  const removeFacility = (facility: string) => {
    setFormData({
      ...formData,
      facilities: formData.facilities.filter(f => f !== facility)
    });
  };

  if (initialLoading) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-gray-900" 
            : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
        }`}>
          <Sidebar />
          <div className={`transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'ml-16' : 'ml-64'
          }`}>
            <Header />
            <main className="p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-500)] mx-auto" />
                  <p className={`mt-4 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Loading property...
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${
        theme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <Sidebar />
        <div className={`transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}>
          <Header />
          <main className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.back()}
                    className={`p-2 rounded-lg transition-colors duration-300 ${
                      theme === "dark" 
                        ? "hover:bg-gray-700 text-gray-400" 
                        : "hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      Edit Property
                    </h1>
                    <p className={`text-sm mt-1 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Update your property information
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    formData.isAvailable 
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" 
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  }`}>
                    {formData.isAvailable ? "Available" : "Rented"}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className={`mb-6 border-l-4 rounded-xl overflow-hidden transition-colors duration-300 ${
                theme === "dark" 
                  ? "bg-red-900/30 border-red-500" 
                  : "bg-red-50 border-red-500"
              }`}>
                <div className="p-4 flex items-center gap-2">
                  <XCircle className={`w-5 h-5 transition-colors duration-300 ${
                    theme === "dark" ? "text-red-400" : "text-red-500"
                  }`} />
                  <span className={`text-sm transition-colors duration-300 ${
                    theme === "dark" ? "text-red-300" : "text-red-700"
                  }`}>
                    {error}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className={`rounded-2xl shadow-md p-6 transition-all duration-300 border ${
              theme === "dark" 
                ? "bg-gray-800 border-gray-700" 
                : "bg-white border-gray-100"
            } ${isSidebarCollapsed ? 'max-w-6xl' : 'max-w-4xl'}`}>
              {/* Images Section - Curved Box */}
              <div className="mb-6">
                <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  <ImageIcon className={`w-5 h-5 transition-colors duration-300 ${
                    theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                  }`} />
                  Property Images
                </h2>
                <div className={`grid gap-4 ${isSidebarCollapsed ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
                  {/* Image 1 */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Image 1
                    </label>
                    <input
                      ref={fileInputRef1}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleImageSelect("image1", e.target.files?.[0] || null)}
                    />
                    <div 
                      onClick={() => fileInputRef1.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition cursor-pointer ${
                        theme === "dark" 
                          ? "border-gray-600 hover:border-[var(--accent-500)]" 
                          : "border-gray-300 hover:border-[var(--accent-400)]"
                      }`}
                    >
                      {images.image1 ? (
                        <div className="relative">
                          <Image
                            src={images.image1}
                            alt="Preview 1"
                            width={200}
                            height={150}
                            className="object-cover rounded mx-auto"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage("image1");
                            }}
                            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-500" : "text-gray-400"
                          }`} />
                          <span className={`text-sm transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>
                            Click to upload
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image 2 */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Image 2
                    </label>
                    <input
                      ref={fileInputRef2}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleImageSelect("image2", e.target.files?.[0] || null)}
                    />
                    <div 
                      onClick={() => fileInputRef2.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition cursor-pointer ${
                        theme === "dark" 
                          ? "border-gray-600 hover:border-[var(--accent-500)]" 
                          : "border-gray-300 hover:border-[var(--accent-400)]"
                      }`}
                    >
                      {images.image2 ? (
                        <div className="relative">
                          <Image
                            src={images.image2}
                            alt="Preview 2"
                            width={200}
                            height={150}
                            className="object-cover rounded mx-auto"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage("image2");
                            }}
                            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-500" : "text-gray-400"
                          }`} />
                          <span className={`text-sm transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>
                            Click to upload
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image 3 */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Image 3
                    </label>
                    <input
                      ref={fileInputRef3}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleImageSelect("image3", e.target.files?.[0] || null)}
                    />
                    <div 
                      onClick={() => fileInputRef3.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition cursor-pointer ${
                        theme === "dark" 
                          ? "border-gray-600 hover:border-[var(--accent-500)]" 
                          : "border-gray-300 hover:border-[var(--accent-400)]"
                      }`}
                    >
                      {images.image3 ? (
                        <div className="relative">
                          <Image
                            src={images.image3}
                            alt="Preview 3"
                            width={200}
                            height={150}
                            className="object-cover rounded mx-auto"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage("image3");
                            }}
                            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-500" : "text-gray-400"
                          }`} />
                          <span className={`text-sm transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>
                            Click to upload
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Information - Curved Box */}
              <div className="mb-6">
                <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  <Home className={`w-5 h-5 transition-colors duration-300 ${
                    theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                  }`} />
                  Basic Information
                </h2>
                <div className={`grid ${isSidebarCollapsed ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Property Name *
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <input
                          type="text"
                          required
                          value={formData.propertyName}
                          onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="Luxury Downtown Apartment"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Property Type *
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className={`w-full px-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 text-gray-100" 
                            : "border border-gray-300 text-gray-900 bg-white"
                        }`}
                      >
                        <option value="">Select type</option>
                        {propertyTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={isSidebarCollapsed ? 'lg:col-span-2' : 'md:col-span-2'}>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Description *
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <FileText className={`absolute left-3 top-3 w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <textarea
                          required
                          rows={4}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="Describe the property..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Fields */}
                  <div className={isSidebarCollapsed ? 'lg:col-span-2' : 'md:col-span-2'}>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Address *
                    </label>
                    <div className={`grid ${isSidebarCollapsed ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'} gap-3`}>
                      <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                        theme === "dark" ? "bg-gray-700" : "bg-white"
                      }`}>
                        <div className="relative">
                          <Hash className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-400"
                          }`} />
                          <input
                            type="text"
                            value={addressFields.addressNumber}
                            onChange={(e) => handleAddressFieldChange("addressNumber", e.target.value)}
                            className={`w-full pl-10 pr-3 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                              theme === "dark" 
                                ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                                : "border border-gray-300 text-gray-900 bg-white"
                            }`}
                            placeholder="Address Number"
                          />
                        </div>
                      </div>
                      <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                        theme === "dark" ? "bg-gray-700" : "bg-white"
                      }`}>
                        <input
                          type="text"
                          value={addressFields.streetName}
                          onChange={(e) => handleAddressFieldChange("streetName", e.target.value)}
                          className={`w-full px-3 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="Street Name"
                        />
                      </div>
                      <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                        theme === "dark" ? "bg-gray-700" : "bg-white"
                      }`}>
                        <input
                          type="text"
                          value={addressFields.neighbourhood}
                          onChange={(e) => handleAddressFieldChange("neighbourhood", e.target.value)}
                          className={`w-full px-3 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="Neighbourhood (Optional)"
                        />
                      </div>
                      <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                        theme === "dark" ? "bg-gray-700" : "bg-white"
                      }`}>
                        <input
                          type="text"
                          value={addressFields.cityTown}
                          onChange={(e) => handleAddressFieldChange("cityTown", e.target.value)}
                          className={`w-full px-3 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="City/Town"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Price (per month) *
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <input
                          type="number"
                          required
                          min="0"
                          step="10"
                          value={formData.price}
                          onChange={(e) => handlePriceChange(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="Enter price"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
  <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
    theme === "dark" ? "text-gray-300" : "text-gray-700"
  }`}>
    Price Threshold
  </label>
  <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
    theme === "dark" ? "bg-gray-700" : "bg-white"
  }`}>
    <div className="relative">
      <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
        theme === "dark" ? "text-gray-400" : "text-gray-400"
      }`} />
      <input
        type="number"
        min="0"
        step="10"
        value={formData.priceThreshold}
        onChange={(e) => handlePriceThresholdChange(e.target.value)}
        className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
            : "border border-gray-300 text-gray-900 bg-white"
        }`}
        placeholder="Enter price threshold"
      />
    </div>
  </div>
  <p className={`text-xs mt-1 transition-colors duration-300 ${
    theme === "dark" ? "text-gray-400" : "text-gray-400"
  }`}>
    Price threshold for pricing tiers (optional)
  </p>
</div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Area (square meters) *
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <Ruler className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={formData.area}
                          onChange={(e) => handlePositiveNumber(e.target.value, "area")}
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="1200"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Bedrooms *
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <Bed className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <input
                          type="number"
                          required
                          min="0"
                          step="1"
                          value={formData.bedrooms}
                          onChange={(e) => handlePositiveNumber(e.target.value, "bedrooms")}
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="2"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Bathrooms *
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <Bath className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <input
                          type="number"
                          required
                          min="0"
                          step="1"
                          value={formData.bathrooms}
                          onChange={(e) => handlePositiveNumber(e.target.value, "bathrooms")}
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="2"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Rooms For (max people)
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <Users className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.roomFor}
                          onChange={(e) => handlePositiveNumber(e.target.value, "roomFor")}
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="4"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Curfew
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <Moon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <select
                          value={formData.curfew}
                          onChange={(e) => setFormData({ ...formData, curfew: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                        >
                          {curfewOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Facilities - Curved Box */}
              <div className="mb-6">
                <label className={`block text-sm font-semibold mb-3 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Facilities *
                </label>
                
                <div className={`grid ${isSidebarCollapsed ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'} gap-3 mb-3`}>
                  {defaultFacilitiesList.map(({ name, icon: Icon }) => (
                    <label key={name} className={`flex items-center gap-2 p-2 rounded-lg border transition cursor-pointer ${
                      theme === "dark" 
                        ? `border-gray-600 hover:bg-gray-700 ${
                            formData.facilities.includes(name) ? "bg-gray-700" : ""
                          }`
                        : `border-gray-200 hover:bg-orange-50 ${
                            formData.facilities.includes(name) ? "bg-orange-50" : ""
                          }`
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.facilities.includes(name)}
                        onChange={() => toggleFacility(name)}
                        className={`w-4 h-4 rounded transition-colors duration-300 ${
                          theme === "dark" 
                            ? "text-[var(--accent-500)] focus:ring-[var(--accent-500)]" 
                            : "text-orange-600 focus:ring-orange-500"
                        }`}
                      />
                      <Icon className={`w-4 h-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`} />
                      <span className={`text-sm transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        {name}
                      </span>
                    </label>
                  ))}
                </div>

                {formData.facilities.filter(f => !defaultFacilitiesList.some(df => df.name === f)).length > 0 && (
                  <div className="mt-3 mb-3">
                    <h3 className={`text-sm font-medium mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Custom Facilities:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {formData.facilities.filter(f => !defaultFacilitiesList.some(df => df.name === f)).map((facility) => (
                        <span key={facility} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-[var(--accent-950)]/30 text-[var(--accent-400)]" 
                            : "bg-orange-50 text-orange-700"
                        }`}>
                          {facility}
                          <button type="button" onClick={() => removeFacility(facility)} className="hover:text-red-600 dark:hover:text-red-400 transition">
                            <MinusCircle className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!showCustomFacilityInput ? (
                  <button type="button" onClick={() => setShowCustomFacilityInput(true)} className={`flex items-center gap-2 text-sm mt-2 transition-colors duration-300 ${
                    theme === "dark" 
                      ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                      : "text-orange-600 hover:text-orange-700"
                  }`}>
                    <PlusCircle className="w-4 h-4" />
                    Add Custom Facility
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={customFacilityName}
                      onChange={(e) => setCustomFacilityName(e.target.value)}
                      placeholder="Enter facility name"
                      className={`flex-1 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                        theme === "dark" 
                          ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                          : "border border-gray-300 text-gray-900 bg-white"
                      }`}
                      autoFocus
                    />
                    <button type="button" onClick={addCustomFacility} className={`px-3 py-1.5 rounded-lg transition ${
                      theme === "dark"
                        ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                        : "bg-orange-600 hover:bg-orange-700 text-white"
                    }`}>
                      Add
                    </button>
                    <button type="button" onClick={() => { setShowCustomFacilityInput(false); setCustomFacilityName(""); }} className={`px-3 py-1.5 rounded-lg transition ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Availability Toggle - Curved Box */}
              <div className="mb-6">
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  formData.isAvailable 
                    ? theme === "dark"
                      ? "bg-green-900/20 border-green-800"
                      : "bg-green-50 border-green-200"
                    : theme === "dark"
                      ? "bg-red-900/20 border-red-800"
                      : "bg-red-50 border-red-200"
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    className={`w-4 h-4 rounded transition-colors duration-300 ${
                      theme === "dark" 
                        ? "text-[var(--accent-500)] focus:ring-[var(--accent-500)]" 
                        : "text-green-600 focus:ring-green-500"
                    }`}
                  />
                  <CheckCircle className={`w-4 h-4 ${
                    formData.isAvailable 
                      ? theme === "dark" ? "text-[var(--accent-400)]" : "text-green-600"
                      : "text-red-600 dark:text-red-400"
                  }`} />
                  <span className={`text-sm font-semibold ${
                    formData.isAvailable 
                      ? theme === "dark" ? "text-[var(--accent-400)]" : "text-green-700"
                      : "text-red-700 dark:text-red-400"
                  }`}>
                    Property is available for rent
                  </span>
                </label>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full h-px transition-colors duration-300 ${
                    theme === "dark" ? "bg-gray-600" : "bg-gray-200"
                  }`} />
                </div>
                <div className="relative flex justify-center">
                  <span className={`px-4 text-xs transition-colors duration-300 ${
                    theme === "dark" ? "bg-gray-800 text-gray-400" : "bg-white text-gray-500"
                  }`}>
                    Property Details
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={loading} className={`px-6 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2 ${
                  theme === "dark"
                    ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                    : "bg-orange-600 hover:bg-orange-700 text-white"
                }`}>
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
                <button type="button" onClick={() => router.back()} className={`px-6 py-2 rounded-lg transition flex items-center gap-2 ${
                  theme === "dark"
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}>
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}