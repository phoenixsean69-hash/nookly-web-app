"use client";
import { updateOrganizationPropertyCount } from "@/lib/appwrite/helpers";
import MapPicker, { AddressParts } from "@/components/map-picker";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useRouter } from "next/navigation";
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
  Plus,
  Image as ImageIcon,
  Hash,
  PlusCircle,
  MinusCircle,
  Map,
  Navigation,
  Users as UsersIcon,
  Calendar,
  Video,
  Star,
  BookOpen,
  Link,
} from "lucide-react";

// Updated property types from your image
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

// Generate curfew options from 9PM to 12AM only
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

// Room options for dropdown
const roomOptions = [
  { value: "room_for1", label: "Single Room (1 person)" },
  { value: "room_for2", label: "Double Room (2 people)" },
  { value: "room_for3", label: "Triple Room (3 people)" },
  { value: "room_for4", label: "Quad Room (4 people)" },
];

export default function NewPropertyPage() {
  const { organization } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showCustomFacilityInput, setShowCustomFacilityInput] = useState(false);
  const [customFacilityName, setCustomFacilityName] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // New state for boarding places fields
  const [boardingData, setBoardingData] = useState({
    rooms_for_available: [] as string[],
    price_per_room: [] as string[],
    hasEnsuite_bathrooms: false,
    hasEnsuite_bathrooms_in_rooms_for: [] as string[],
    occupiedRooms: [] as string[],
    video1: "",
    video2: "",
    video3: "",
    rating: 0,
    new_price: "",
  });

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Function to check sidebar state from localStorage
  const checkSidebarState = useCallback(() => {
    if (isMobile) {
      const mobileState = sessionStorage.getItem('mobileSidebarOpen');
      setIsSidebarCollapsed(mobileState !== 'true');
      return;
    }
    const savedState = localStorage.getItem('sidebarCollapsed');
    setIsSidebarCollapsed(savedState === 'true');
  }, [isMobile]);

  // Listen for sidebar collapse state changes
  useEffect(() => {
    checkSidebarState();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        setIsSidebarCollapsed(e.newValue === 'true');
      }
    };

    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail?.isCollapsed !== undefined) {
        setIsSidebarCollapsed(e.detail.isCollapsed);
      } else {
        checkSidebarState();
      }
    };

    const handleMobileToggle = (e: CustomEvent) => {
      if (e.detail?.isOpen !== undefined) {
        setIsSidebarCollapsed(!e.detail.isOpen);
      } else {
        checkSidebarState();
      }
    };

    const handleFocus = () => {
      checkSidebarState();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sidebarToggle', handleCustomEvent as EventListener);
    window.addEventListener('mobileSidebarToggle', handleMobileToggle as EventListener);
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      if (isMobile) {
        const mobileState = sessionStorage.getItem('mobileSidebarOpen');
        setIsSidebarCollapsed(mobileState !== 'true');
      } else {
        const savedState = localStorage.getItem('sidebarCollapsed');
        const isCollapsed = savedState === 'true';
        setIsSidebarCollapsed(prev => {
          if (prev !== isCollapsed) {
            return isCollapsed;
          }
          return prev;
        });
      }
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sidebarToggle', handleCustomEvent as EventListener);
      window.removeEventListener('mobileSidebarToggle', handleMobileToggle as EventListener);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [checkSidebarState, isMobile]);

  // Separated address fields
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
    totalSlots: "", // Total parking/room slots
    occupiedSlots: "0", // Occupied slots (default 0)
    availableSlots: "", // Auto-calculated
    latitude: "", // Latitude from map
    longitude: "", // Longitude from map
  });
  
  const [images, setImages] = useState({
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

  // Auto-calculate available slots when totalSlots or occupiedSlots changes
  useEffect(() => {
    const total = parseInt(formData.totalSlots);
    const occupied = parseInt(formData.occupiedSlots) || 0;
    
    if (!isNaN(total) && total >= 0) {
      const available = Math.max(0, total - occupied);
      setFormData(prev => ({
        ...prev,
        availableSlots: available.toString()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        availableSlots: ""
      }));
    }
  }, [formData.totalSlots, formData.occupiedSlots]);

  // Helper function to prevent negative numbers
  const handlePositiveNumber = (value: string, field: string) => {
    const numValue = parseInt(value);
    if (value === "") {
      setFormData({ ...formData, [field]: "" });
    } else if (!isNaN(numValue) && numValue >= 0) {
      setFormData({ ...formData, [field]: value });
    }
  };

  // Handle price with step of 10, can be 0 or above
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

  // Handle address field changes and combine them
  const handleAddressFieldChange = (field: string, value: string) => {
    const newAddressFields = { ...addressFields, [field]: value };
    setAddressFields(newAddressFields);

    const combinedAddress = [
      newAddressFields.addressNumber,
      newAddressFields.streetName,
      newAddressFields.neighbourhood,
      newAddressFields.cityTown,
    ]
      .filter((part) => part.trim() !== "")
      .join(", ");

    setFormData({ ...formData, address: combinedAddress });
  };

  // Called only once the user has explicitly accepted a map location
  const handleLocationSelect = (
    lat: number,
    lng: number,
    address: string,
    parts?: AddressParts
  ) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }));

    const hasStructuredParts =
      parts && (parts.houseNumber || parts.road || parts.neighbourhood || parts.city);

    if (hasStructuredParts) {
      const newAddressFields = {
        addressNumber: parts!.houseNumber || addressFields.addressNumber,
        streetName: parts!.road || addressFields.streetName,
        neighbourhood: parts!.neighbourhood || addressFields.neighbourhood,
        cityTown: parts!.city || addressFields.cityTown,
      };
      setAddressFields(newAddressFields);

      const combinedAddress = [
        newAddressFields.addressNumber,
        newAddressFields.streetName,
        newAddressFields.neighbourhood,
        newAddressFields.cityTown,
      ]
        .filter((part) => part.trim() !== "")
        .join(", ");

      setFormData(prev => ({ ...prev, address: combinedAddress }));
    } else if (address) {
      setFormData(prev => ({ ...prev, address }));
    }
  };

  // Add custom facility
  const addCustomFacility = () => {
    if (
      customFacilityName.trim() &&
      !formData.facilities.includes(customFacilityName.trim())
    ) {
      setFormData({
        ...formData,
        facilities: [...formData.facilities, customFacilityName.trim()],
      });
      setCustomFacilityName("");
      setShowCustomFacilityInput(false);
    }
  };

  // Handle price threshold with step of 10, can be 0 or above
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

  // Remove a facility
  const removeFacility = (facility: string) => {
    setFormData({
      ...formData,
      facilities: formData.facilities.filter((f) => f !== facility),
    });
  };

  // Boarding data handlers
  const addRoomType = (type: string) => {
    if (!boardingData.rooms_for_available.includes(type)) {
      setBoardingData({
        ...boardingData,
        rooms_for_available: [...boardingData.rooms_for_available, type],
        price_per_room: [...boardingData.price_per_room, ""],
        hasEnsuite_bathrooms_in_rooms_for: [...boardingData.hasEnsuite_bathrooms_in_rooms_for, "false"],
        occupiedRooms: [...boardingData.occupiedRooms, "0"],
      });
    }
  };

  const removeRoomType = (index: number) => {
    const newRooms = [...boardingData.rooms_for_available];
    newRooms.splice(index, 1);
    const newPrices = [...boardingData.price_per_room];
    newPrices.splice(index, 1);
    const newEnsuite = [...boardingData.hasEnsuite_bathrooms_in_rooms_for];
    newEnsuite.splice(index, 1);
    const newOccupied = [...boardingData.occupiedRooms];
    newOccupied.splice(index, 1);
    
    setBoardingData({
      ...boardingData,
      rooms_for_available: newRooms,
      price_per_room: newPrices,
      hasEnsuite_bathrooms_in_rooms_for: newEnsuite,
      occupiedRooms: newOccupied,
    });
  };

  const updateRoomPrice = (index: number, value: string) => {
    const newPrices = [...boardingData.price_per_room];
    newPrices[index] = value;
    setBoardingData({ ...boardingData, price_per_room: newPrices });
  };

  const updateRoomOccupied = (index: number, value: string) => {
    const newOccupied = [...boardingData.occupiedRooms];
    newOccupied[index] = value;
    setBoardingData({ ...boardingData, occupiedRooms: newOccupied });
  };

  const updateRoomEnsuite = (index: number, value: string) => {
    const newEnsuite = [...boardingData.hasEnsuite_bathrooms_in_rooms_for];
    newEnsuite[index] = value;
    setBoardingData({ ...boardingData, hasEnsuite_bathrooms_in_rooms_for: newEnsuite });
  };

  const handleImageUpload = async (
    file: File,
    imageKey: string,
  ): Promise<string> => {
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

  const handleImageSelect = (key: string, file: File | null) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImages({ ...images, [key]: previewUrl });
      setImageFiles({ ...imageFiles, [key]: file });
    } else {
      setImages({ ...images, [key]: "" });
      setImageFiles({ ...imageFiles, [key]: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setUploadingImages(true);

    try {
      if (!organization?.$id) {
        throw new Error("Organization not found");
      }

      // Validate positive numbers
      const price = parseInt(formData.price);
      const priceThreshold = parseInt(formData.priceThreshold) || 0;
      const area = parseFloat(formData.area);
      const bedrooms = parseInt(formData.bedrooms);
      const bathrooms = parseInt(formData.bathrooms);
      const roomFor = formData.roomFor ? parseInt(formData.roomFor) : null;
      const totalSlots = formData.totalSlots ? parseInt(formData.totalSlots) : 0;
      const occupiedSlots = parseInt(formData.occupiedSlots) || 0;
      const availableSlots = parseInt(formData.availableSlots) || 0;
      const latitude = formData.latitude ? parseFloat(formData.latitude) : null;
      const longitude = formData.longitude ? parseFloat(formData.longitude) : null;

      if (price < 0) throw new Error("Price cannot be negative");
      if (priceThreshold < 0) throw new Error("Price threshold cannot be negative");
      if (area < 0) throw new Error("Area cannot be negative");
      if (bedrooms < 0) throw new Error("Bedrooms cannot be negative");
      if (bathrooms < 0) throw new Error("Bathrooms cannot be negative");
      if (roomFor !== null && roomFor < 0) throw new Error("Room for cannot be negative");
      if (totalSlots < 0) throw new Error("Total slots cannot be negative");
      if (occupiedSlots < 0) throw new Error("Occupied slots cannot be negative");
      if (occupiedSlots > totalSlots && totalSlots > 0) {
        throw new Error("Occupied slots cannot exceed total slots");
      }

      const uploadedImages = await Promise.all([
        imageFiles.image1
          ? handleImageUpload(imageFiles.image1, "image1")
          : Promise.resolve(""),
        imageFiles.image2
          ? handleImageUpload(imageFiles.image2, "image2")
          : Promise.resolve(""),
        imageFiles.image3
          ? handleImageUpload(imageFiles.image3, "image3")
          : Promise.resolve(""),
      ]);

      // 1. Create property in PROPERTIES collection
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        ID.unique(),
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
          image1: uploadedImages[0],
          image2: uploadedImages[1],
          image3: uploadedImages[2],
          isAvailable: true,
          roomFor: roomFor,
          curfew: formData.curfew,
          totalSlots: totalSlots,
          occupiedSlots: occupiedSlots,
          availableSlots: availableSlots,
          latitude: latitude,
          longitude: longitude,
          creatorId: organization.userId,
          views: 0,
          likes: 0,
          requests: 0,
        },
      );

      // 2. Create boarding place in BOARDING_PLACES collection
      // Only proceed if type is "Boarding" or if boarding data is provided
      if (formData.type === "Boarding" || boardingData.rooms_for_available.length > 0) {
        const boardingDoc = {
          propertyName: formData.propertyName,
          description: formData.description,
          rooms_for_available: boardingData.rooms_for_available.join(", "),
          price_per_room: boardingData.price_per_room.join(", "),
          address: formData.address,
          capacity: totalSlots || parseInt(formData.roomFor) || 0,
          hasEnsuite_bathrooms: boardingData.hasEnsuite_bathrooms,
          hasEnsuite_bathrooms_in_rooms_for: boardingData.hasEnsuite_bathrooms_in_rooms_for.join(", "),
          rating: boardingData.rating || 0,
          facilities: formData.facilities.join(", "),
          image1: uploadedImages[0] || "",
          image2: uploadedImages[1] || "",
          image3: uploadedImages[2] || "",
          creatorId: organization.userId,
          likes: 0,
          isAvailable: true,
          curfew: formData.curfew,
          requests: 0,
          priceThreshold: priceThreshold,
          video1: boardingData.video1 || "",
          video2: boardingData.video2 || "",
          video3: boardingData.video3 || "",
          occupiedSlots: occupiedSlots || 0,
          rooms_for_occupied: boardingData.occupiedRooms.join(", "),
          availableSlots: availableSlots || 0,
          latitude: latitude,
          longitude: longitude,
        };

        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_BOARDING_PLACES_COLLECTION_ID!,
          ID.unique(),
          boardingDoc
        );
      }

      await updateOrganizationPropertyCount(organization.userId, "increment");
      router.push("/dashboard/properties");
    } catch (err: unknown) {
      console.error("Error creating property:", err);
      let errorMessage = "Failed to create property";
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

  // Calculate margin based on device and sidebar state
  const getMargin = () => {
    if (isMobile) {
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${
        theme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <Sidebar />
        <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
          <Header />
          <main className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                  }`}>
                    Add New Property
                  </h1>
                  <p className={`text-sm mt-1 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    Fill in the details to list a new property
                  </p>
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

            <form
              onSubmit={handleSubmit}
              className={`rounded-2xl shadow-md p-6 transition-all duration-300 border ${
                theme === "dark" 
                  ? "bg-gray-800 border-gray-700" 
                  : "bg-white border-gray-100"
              } ${isMobile ? 'w-full max-w-full' : `w-full ${isSidebarCollapsed ? 'max-w-6xl' : 'max-w-4xl'}`}`}
            >
              {/* Images Section */}
              <div className="mb-6">
                <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  <ImageIcon className={`w-5 h-5 transition-colors duration-300 ${
                    theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                  }`} />
                  Property Images
                </h2>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
                  {[1, 2, 3].map((num) => (
                    <div key={num}>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Image {num}
                      </label>
                      <div className={`border-2 border-dashed rounded-lg p-4 text-center transition ${
                        theme === "dark" 
                          ? "border-gray-600 hover:border-[var(--accent-500)]" 
                          : "border-gray-300 hover:border-[var(--accent-400)]"
                      }`}>
                        {images[`image${num}` as keyof typeof images] ? (
                          <div className="relative">
                            <Image
                              src={images[`image${num}` as keyof typeof images]}
                              alt={`Preview ${num}`}
                              width={200}
                              height={150}
                              className="object-cover rounded mx-auto"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleImageSelect(`image${num}`, null)
                              }
                              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-500" : "text-gray-400"
                            }`} />
                            <span className={`text-sm transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>
                              Click to upload
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) =>
                                handleImageSelect(
                                  `image${num}`,
                                  e.target.files?.[0] || null,
                                )
                              }
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Basic Information */}
              <div className="mb-6">
                <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  <Home className={`w-5 h-5 transition-colors duration-300 ${
                    theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                  }`} />
                  Basic Information
                </h2>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
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
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              propertyName: e.target.value,
                            })
                          }
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
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value })
                        }
                        className={`w-full px-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 text-gray-100" 
                            : "border border-gray-300 text-gray-900 bg-white"
                        }`}
                      >
                        <option value="" className="text-gray-500 dark:text-gray-400">
                          Select type
                        </option>
                        {propertyTypes.map((type) => (
                          <option
                            key={type}
                            value={type}
                            className="text-gray-900 dark:text-gray-100"
                          >
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={isMobile ? '' : 'md:col-span-2'}>
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
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
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
                  <div className={isMobile ? '' : 'md:col-span-2'}>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`block text-sm font-semibold transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Address *
                      </label>
                    </div>

                    {/* Prominent map picker trigger */}
                    <button
                      type="button"
                      onClick={() => setShowMapPicker(!showMapPicker)}
                      className={`w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm shadow-sm transition ${
                        showMapPicker
                          ? theme === "dark"
                            ? "bg-gray-700 text-gray-100 border-2 border-[var(--accent-500)]"
                            : "bg-orange-50 text-orange-700 border-2 border-orange-400"
                          : theme === "dark"
                            ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                            : "bg-orange-600 hover:bg-orange-700 text-white"
                      }`}
                    >
                      <Map className="w-5 h-5" />
                      {showMapPicker ? "Hide Map" : "Pick Location on Map"}
                    </button>

                    <div className={`grid gap-2 ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
                      <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                        theme === "dark" ? "bg-gray-700" : "bg-white"
                      }`}>
                        <div className="relative">
                          <Hash className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-400"
                          }`} />
                          <input
                            type="text"
                            required
                            value={addressFields.addressNumber}
                            onChange={(e) =>
                              handleAddressFieldChange(
                                "addressNumber",
                                e.target.value,
                              )
                            }
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
                          required
                          value={addressFields.streetName}
                          onChange={(e) =>
                            handleAddressFieldChange(
                              "streetName",
                              e.target.value,
                            )
                          }
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
                          onChange={(e) =>
                            handleAddressFieldChange(
                              "neighbourhood",
                              e.target.value,
                            )
                          }
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
                          required
                          value={addressFields.cityTown}
                          onChange={(e) =>
                            handleAddressFieldChange("cityTown", e.target.value)
                          }
                          className={`w-full px-3 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="City/Town"
                        />
                      </div>
                    </div>
                    <p className={`text-xs mt-1 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-400"
                    }`}>
                      Address will be combined as:{" "}
                      {formData.address ||
                        "123, Main Street, Downtown, New York"}
                    </p>

                    {/* Map Picker */}
                    {showMapPicker && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-3">
                          <p className={`text-sm font-medium ${
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}>
                            🗺️ Search, click, or confirm a marker to autofill the address
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowMapPicker(false)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition ${
                              theme === "dark"
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            ✕ Close Map
                          </button>
                        </div>
                        <MapPicker
                          onLocationSelect={handleLocationSelect}
                          theme={theme}
                          initialLat={formData.latitude ? parseFloat(formData.latitude) : undefined}
                          initialLng={formData.longitude ? parseFloat(formData.longitude) : undefined}
                        />
                        {formData.latitude && formData.longitude && (
                          <div className={`mt-3 text-sm p-3 rounded-lg border ${
                            theme === "dark" 
                              ? "bg-green-900/20 border-green-800 text-green-300" 
                              : "bg-green-50 border-green-200 text-green-700"
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Navigation className="w-4 h-4" />
                                  <span className="font-medium">Location Selected:</span>
                                </div>
                                <div className="mt-1 text-xs opacity-75">
                                  Coordinates: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    latitude: "",
                                    longitude: ""
                                  }));
                                }}
                                className={`px-3 py-1 text-xs rounded-lg transition ${
                                  theme === "dark"
                                    ? "bg-red-900/30 text-red-400 hover:bg-red-900/50"
                                    : "bg-red-100 text-red-600 hover:bg-red-200"
                                }`}
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pricing Section */}
                  <div className={isMobile ? '' : 'md:col-span-2'}>
                    <h3 className={`text-sm font-semibold mb-3 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Pricing Details
                    </h3>
                    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
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
                        <p className={`text-xs mt-1 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`}>
                          Price increments by 10s (0, 10, 20, 30...)
                        </p>
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

                    </div>
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
                          onChange={(e) =>
                            handlePositiveNumber(e.target.value, "area")
                          }
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
                          onChange={(e) =>
                            handlePositiveNumber(e.target.value, "bedrooms")
                          }
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
                          onChange={(e) =>
                            handlePositiveNumber(e.target.value, "bathrooms")
                          }
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
                      Available rooms For (max people)
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
                          onChange={(e) =>
                            handlePositiveNumber(e.target.value, "roomFor")
                          }
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
                          onChange={(e) =>
                            setFormData({ ...formData, curfew: e.target.value })
                          }
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                        >
                          {curfewOptions.map((option) => (
                            <option
                              key={option}
                              value={option}
                              className="text-gray-900 dark:text-gray-100"
                            >
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className={`text-xs mt-1 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-400"
                    }`}>
                      Select curfew time (9PM - 12AM) or choose "No curfew"
                    </p>
                  </div>

                </div>
              </div>

              {/* Video Section for Boarding Places */}
              <div className="mb-6">
                <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  <Video className={`w-5 h-5 transition-colors duration-300 ${
                    theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                  }`} />
                  Video URLs (Boarding)
                </h2>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                  {[1, 2, 3].map((num) => (
                    <div key={num}>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        Video {num}
                      </label>
                      <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                        theme === "dark" ? "bg-gray-700" : "bg-white"
                      }`}>
                        <div className="relative">
                          <Link className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-400"
                          }`} />
                          <input
                            type="url"
                            value={num === 1 ? boardingData.video1 : num === 2 ? boardingData.video2 : boardingData.video3}
                            onChange={(e) => {
                              if (num === 1) setBoardingData({ ...boardingData, video1: e.target.value });
                              else if (num === 2) setBoardingData({ ...boardingData, video2: e.target.value });
                              else setBoardingData({ ...boardingData, video3: e.target.value });
                            }}
                            className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                              theme === "dark" 
                                ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                                : "border border-gray-300 text-gray-900 bg-white"
                            }`}
                            placeholder="Enter video URL"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Types for Boarding Places */}
              <div className="mb-6">
                <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  <BookOpen className={`w-5 h-5 transition-colors duration-300 ${
                    theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                  }`} />
                  Room Types (Boarding)
                </h2>
                
                {/* Add Room Type */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addRoomType(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className={`flex-1 px-4 py-2 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                        theme === "dark" 
                          ? "bg-gray-700 border-gray-600 text-gray-100" 
                          : "border border-gray-300 text-gray-900 bg-white"
                      }`}
                    >
                      <option value="">Add Room Type</option>
                      {roomOptions.map((room) => (
                        <option key={room.value} value={room.value}>
                          {room.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Room Types Table */}
                {boardingData.rooms_for_available.length > 0 && (
                  <div className={`overflow-x-auto rounded-lg border ${
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                  }`}>
                    <table className="w-full">
                      <thead className={theme === "dark" ? "bg-gray-700" : "bg-gray-50"}>
                        <tr>
                          <th className={`px-4 py-2 text-left text-xs font-semibold uppercase ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}>
                            Room Type
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-semibold uppercase ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}>
                            Price
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-semibold uppercase ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}>
                            Ensuite Bathroom
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-semibold uppercase ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}>
                            Occupied
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-semibold uppercase ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}>
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${
                        theme === "dark" ? "divide-gray-700" : "divide-gray-200"
                      }`}>
                        {boardingData.rooms_for_available.map((room, index) => {
                          const roomLabel = roomOptions.find(r => r.value === room)?.label || room;
                          return (
                            <tr key={index} className={theme === "dark" ? "bg-gray-800" : "bg-white"}>
                              <td className={`px-4 py-2 text-sm ${
                                theme === "dark" ? "text-gray-300" : "text-gray-700"
                              }`}>
                                {roomLabel}
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={boardingData.price_per_room[index] || ""}
                                  onChange={(e) => updateRoomPrice(index, e.target.value)}
                                  className={`w-24 px-2 py-1 text-sm rounded focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                                    theme === "dark" 
                                      ? "bg-gray-700 border-gray-600 text-gray-100" 
                                      : "border border-gray-300 text-gray-900 bg-white"
                                  }`}
                                  placeholder="Price"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  value={boardingData.hasEnsuite_bathrooms_in_rooms_for[index] || "false"}
                                  onChange={(e) => updateRoomEnsuite(index, e.target.value)}
                                  className={`px-2 py-1 text-sm rounded focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                                    theme === "dark" 
                                      ? "bg-gray-700 border-gray-600 text-gray-100" 
                                      : "border border-gray-300 text-gray-900 bg-white"
                                  }`}
                                >
                                  <option value="false">No</option>
                                  <option value="true">Yes</option>
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={boardingData.occupiedRooms[index] || "0"}
                                  onChange={(e) => updateRoomOccupied(index, e.target.value)}
                                  className={`w-16 px-2 py-1 text-sm rounded focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                                    theme === "dark" 
                                      ? "bg-gray-700 border-gray-600 text-gray-100" 
                                      : "border border-gray-300 text-gray-900 bg-white"
                                  }`}
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeRoomType(index)}
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Has Ensuite Bathrooms (Global) */}
                <div className="mt-4">
                  <label className={`flex items-center gap-2 text-sm font-medium transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    <input
                      type="checkbox"
                      checked={boardingData.hasEnsuite_bathrooms}
                      onChange={(e) => setBoardingData({ ...boardingData, hasEnsuite_bathrooms: e.target.checked })}
                      className={`w-4 h-4 rounded transition-colors duration-300 ${
                        theme === "dark" 
                          ? "text-[var(--accent-500)] focus:ring-[var(--accent-500)]" 
                          : "text-orange-600 focus:ring-orange-500"
                      }`}
                    />
                    Has Ensuite Bathrooms (Global)
                  </label>
                </div>
              </div>

              {/* Slots Section */}
              <div className="mb-6">
                <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  <UsersIcon className={`w-5 h-5 transition-colors duration-300 ${
                    theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                  }`} />
                  Slots Management
                </h2>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Total Slots *
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <input
                          type="number"
                          required
                          min="0"
                          step="1"
                          value={formData.totalSlots}
                          onChange={(e) => handlePositiveNumber(e.target.value, "totalSlots")}
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="Enter total slots"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Occupied Slots
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <UsersIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.occupiedSlots}
                          onChange={(e) => handlePositiveNumber(e.target.value, "occupiedSlots")}
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-300 text-gray-900 bg-white"
                          }`}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <p className={`text-xs mt-1 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-400"
                    }`}>
                      Default: 0
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Available Slots
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <CheckCircle className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          theme === "dark" ? "text-green-400" : "text-green-600"
                        }`} />
                        <input
                          type="number"
                          value={formData.availableSlots}
                          className={`w-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-gray-700 text-gray-100" 
                              : "border border-gray-300 text-gray-900 bg-gray-50"
                          }`}
                          placeholder="Auto-calculated"
                          disabled
                        />
                      </div>
                    </div>
                    <p className={`text-xs mt-1 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-400"
                    }`}>
                      Auto-calculated: Total - Occupied
                    </p>
                  </div>
                </div>
              </div>

              {/* Facilities */}
              <div className="mb-6">
                <label className={`block text-sm font-semibold mb-3 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Facilities *
                </label>

                <div className={`grid gap-2 mb-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {defaultFacilitiesList.map(({ name, icon: Icon }) => (
                    <label
                      key={name}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition cursor-pointer ${
                        theme === "dark" 
                          ? `border-gray-600 hover:bg-gray-700 ${
                              formData.facilities.includes(name) ? "bg-gray-700" : ""
                            }`
                          : `border-gray-200 hover:bg-orange-50 ${
                              formData.facilities.includes(name) ? "bg-orange-50" : ""
                            }`
                      }`}
                    >
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

                {formData.facilities.filter(
                  (f) => !defaultFacilitiesList.some((df) => df.name === f),
                ).length > 0 && (
                  <div className="mt-3 mb-3">
                    <h3 className={`text-sm font-medium mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Custom Facilities:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {formData.facilities
                        .filter(
                          (f) =>
                            !defaultFacilitiesList.some((df) => df.name === f),
                        )
                        .map((facility) => (
                          <span
                            key={facility}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors duration-300 ${
                              theme === "dark" 
                                ? "bg-[var(--accent-950)]/30 text-[var(--accent-400)]" 
                                : "bg-orange-50 text-orange-700"
                            }`}
                          >
                            {facility}
                            <button
                              type="button"
                              onClick={() => removeFacility(facility)}
                              className="hover:text-red-600 dark:hover:text-red-400 transition"
                            >
                              <MinusCircle className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {!showCustomFacilityInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomFacilityInput(true)}
                    className={`flex items-center gap-2 text-sm mt-2 transition-colors duration-300 ${
                      theme === "dark" 
                        ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                        : "text-orange-600 hover:text-orange-700"
                    }`}
                  >
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
                    <button
                      type="button"
                      onClick={addCustomFacility}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        theme === "dark"
                          ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                          : "bg-orange-600 hover:bg-orange-700 text-white"
                      }`}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomFacilityInput(false);
                        setCustomFacilityName("");
                      }}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        theme === "dark"
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                )}
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
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2 ${
                    theme === "dark"
                      ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                      : "bg-orange-600 hover:bg-orange-700 text-white"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create Property
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className={`px-6 py-2 rounded-lg transition flex items-center gap-2 ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
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