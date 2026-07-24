"use client";

import { updateOrganizationPropertyCount } from "@/lib/appwrite/helpers";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { databases, storage } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import Image from "next/image";
import { Property } from "@/types/property";
import {
  Building2,
  Bed,
  Bath,
  Ruler,
  DollarSign,
  MapPin,
  Eye,
  Edit,
  Trash2,
  ArrowLeft,
  CheckCircle,
  Clock,
  Wifi,
  Car,
  Wind,
  Thermometer,
  Droplets,
  Dumbbell,
  Waves,
  PawPrint,
  Sofa,
  Users,
  Moon,
  Calendar,
  TrendingUp,
  Heart,
  Star,
  X,
  User,
  Phone,
  Mail,
} from "lucide-react";

interface Review {
  id: string;
  propertyId: string;
  userName: string;
  userAvatar?: string;
  review: string;
  rating: number;
  date: string;
}

interface Tenant {
  $id: string;
  name: string;
  identifier: string;
  phone: string;
  email: string;
  propertyName: string;
  status: string;
  monthlyRent: number;
  leaseStartDate: string;
  avatar?: string;
  propertyId?: string;
}

const facilityIcons: Record<string, any> = {
  Parking: Car,
  WiFi: Wifi,
  AC: Wind,
  Heating: Thermometer,
  Pool: Droplets,
  Gym: Dumbbell,
  Laundry: Waves,
  "Pet Friendly": PawPrint,
  Furnished: Sofa,
};

function PropertyDetailPage() {
  const { organization, user } = useAuth();
  const { theme } = useTheme();
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  
  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, review: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    Promise.all([fetchProperty(), fetchTenants()]);
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      const response = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        propertyId
      );
      const prop = response as unknown as Property;
      setProperty(prop);
      setLikesCount(prop.likes || 0);
      
      if (prop.reviews) {
        try {
          const parsedReviews = JSON.parse(prop.reviews);
          setReviews(Array.isArray(parsedReviews) ? parsedReviews : []);
        } catch {
          setReviews([]);
        }
      }
      
      const likedStatus = localStorage.getItem(`liked_${propertyId}`);
      setIsLiked(likedStatus === "true");
    } catch (error) {
      console.error("Error fetching property:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!,
        [Query.orderDesc("$createdAt")]
      );
      
      const fetchedTenants = response.documents as unknown as Tenant[];
      setTenants(fetchedTenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  };

  const getPropertyTenants = () => {
    if (!property) return [];
    return tenants.filter(t => t.propertyName === property.propertyName && t.status === 'active');
  };

  const handleLike = async () => {
    if (!property) return;
    
    const newLikesCount = isLiked ? likesCount - 1 : likesCount + 1;
    
    setIsLiked(!isLiked);
    setLikesCount(newLikesCount);
    localStorage.setItem(`liked_${propertyId}`, (!isLiked).toString());
    
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        propertyId,
        { likes: newLikesCount }
      );
    } catch (error) {
      setIsLiked(isLiked);
      setLikesCount(likesCount);
      localStorage.setItem(`liked_${propertyId}`, isLiked.toString());
      console.error("Error updating likes:", error);
    }
  };

  const handleSubmitReview = async () => {
    if (!property || !newReview.review.trim()) return;
    
    setIsSubmitting(true);
    
    const newReviewObj: Review = {
      id: Date.now().toString(),
      propertyId: propertyId,
      userName: user?.name || "Anonymous",
      userAvatar: (user?.prefs as any)?.avatar || "",
      review: newReview.review,
      rating: newReview.rating,
      date: new Date().toISOString(),
    };
    
    const updatedReviews = [...reviews, newReviewObj];
    
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        propertyId,
        { reviews: JSON.stringify(updatedReviews) }
      );
      
      setReviews(updatedReviews);
      setShowReviewModal(false);
      setNewReview({ rating: 5, review: "" });
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!property) return;

    try {
      const imageIds = [property.image1, property.image2, property.image3].filter(Boolean);
      for (const imageUrl of imageIds) {
        if (imageUrl) {
          const fileId = imageUrl.split("/files/")[1]?.split("/")[0];
          if (fileId) {
            try {
              await storage.deleteFile(
                process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID!,
                fileId
              );
            } catch (error) {
              console.error("Error deleting image:", error);
            }
          }
        }
      }

      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        property.$id
      );
      
      if (organization?.userId) {
        await updateOrganizationPropertyCount(organization.userId, 'decrement');
      }
      router.push("/dashboard/properties");
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Failed to delete property");
    }
  };

  const getStatusBadge = (isAvailable: boolean) => {
    if (isAvailable) {
      return {
        text: "Available",
        icon: CheckCircle,
        className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
      };
    }
    return {
      text: "Rented",
      icon: Clock,
      className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    };
  };

  const getFacilityIcon = (facilityName: string) => {
    const Icon = facilityIcons[facilityName];
    return Icon ? <Icon className="w-4 h-4" /> : null;
  };

  const getCurfewDisplay = () => {
    if (!property) return null;
    const type = property.type?.toLowerCase();
    const curfew = property.curfew;
    
    if (type === "boarding") {
      if (!curfew || curfew.toLowerCase() === "no curfew") {
        return "No curfew";
      }
      return curfew;
    }
    
    if (curfew && curfew.toLowerCase() !== "no curfew" && curfew !== "") {
      return curfew;
    }
    return null;
  };

  const getPricingDisplay = () => {
    if (!property) return "";
    const type = property.type?.toLowerCase();
    
    if (type === "luxury") {
      return `${property.price}/night`;
    } else if (type === "boarding") {
      return `${property.price}/month per head`;
    } else if (type === "land") {
      return `${property.price}/sq meter`;
    } else if (type === "workplace" || type === "commercial") {
      return `${property.price}/month for office`;
    }
    return `${property.price}/month`;
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  // Calculate margin based on device and sidebar state
  const getMargin = () => {
    if (isMobile) {
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

  if (isLoading) {
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

  if (!property) {
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
              <div className={`rounded-2xl shadow-md p-12 text-center transition-colors duration-300 border ${
                theme === "dark" 
                  ? "bg-gray-800 border-gray-700" 
                  : "bg-white border-gray-100"
              }`}>
                <Building2 className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-600" : "text-gray-400"
                }`} />
                <h2 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  Property not found
                </h2>
                <p className={`mb-4 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  The property you're looking for doesn't exist.
                </p>
                <Link 
                  href="/dashboard/properties" 
                  className={`transition-colors duration-300 ${
                    theme === "dark" 
                      ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                      : "text-[var(--accent-500)] hover:text-[var(--accent-600)]"
                  }`}
                >
                  Back to Properties
                </Link>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const status = getStatusBadge(property.isAvailable ?? true);
  const StatusIcon = status.icon;
  const images = [property.image1, property.image2, property.image3].filter(Boolean);
  const facilitiesList = property.facilities?.split(", ").filter(Boolean) || [];
  const curfewDisplay = getCurfewDisplay();
  const pricingDisplay = getPricingDisplay();
  const propertyTenants = getPropertyTenants();

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
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className={`flex items-center gap-2 mb-4 transition-colors duration-300 ${
                theme === "dark" 
                  ? "text-gray-400 hover:text-[var(--accent-400)]" 
                  : "text-gray-600 hover:text-[var(--accent-500)]"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Properties
            </button>

            {/* Header Section */}
            <div className={`rounded-2xl shadow-sm p-4 sm:p-6 mb-6 transition-colors duration-300 border ${
              theme === "dark" 
                ? "bg-gray-800 border-gray-700" 
                : "bg-white border-gray-100"
            }`}>
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
                    }`}>
                      {property.type || "Property"}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.text}
                    </span>
                  </div>
                  <h1 className={`text-xl sm:text-2xl font-bold mb-2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                  }`}>
                    {property.propertyName}
                  </h1>
                  <div className={`flex items-center gap-2 mb-3 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{property.address}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <span className={`flex items-center gap-1 text-xs sm:text-sm transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      <Eye className="w-3 h-3" />
                      {property.views || 0} views
                    </span>
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-1 text-xs sm:text-sm transition ${isLiked ? "text-red-500" : "text-gray-500 dark:text-gray-400 hover:text-red-500"}`}
                    >
                      <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${isLiked ? "fill-red-500" : ""}`} />
                      {likesCount} likes
                    </button>
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className={`flex items-center gap-1 text-xs sm:text-sm transition-colors duration-300 ${
                        theme === "dark" 
                          ? "text-gray-400 hover:text-[var(--accent-400)]" 
                          : "text-gray-500 hover:text-[var(--accent-500)]"
                      }`}
                    >
                      <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                      {reviews.length} reviews
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Link
                    href={`/dashboard/properties/${property.$id}/edit`}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Images Section */}
            <div className={`rounded-2xl shadow-sm p-4 sm:p-6 mb-6 transition-colors duration-300 border ${
              theme === "dark" 
                ? "bg-gray-800 border-gray-700" 
                : "bg-white border-gray-100"
            }`}>
              <h2 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 transition-colors duration-300 ${
                theme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>
                Property Images
              </h2>
              {images.length === 0 ? (
                <div className={`h-48 sm:h-64 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                  theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                }`}>
                  <Building2 className={`w-12 h-12 sm:w-16 sm:h-16 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-600" : "text-gray-400"
                  }`} />
                </div>
              ) : images.length === 1 ? (
                <div className="relative h-64 sm:h-96 rounded-xl overflow-hidden">
                  <Image
                    src={images[0]}
                    alt={property.propertyName}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative h-48 sm:h-64 rounded-xl overflow-hidden">
                      <Image
                        src={image}
                        alt={`${property.propertyName} - Image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Left Column - Details */}
              <div className="lg:col-span-2">
                <div className={`rounded-2xl shadow-sm p-4 sm:p-6 transition-colors duration-300 border ${
                  theme === "dark" 
                    ? "bg-gray-800 border-gray-700" 
                    : "bg-white border-gray-100"
                }`}>
                  <h2 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}>
                    Property Details
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                    }`}>
                      <Bed className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                        theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                      }`} />
                      <div>
                        <p className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          Bedrooms
                        </p>
                        <p className={`text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-200" : "text-gray-800"
                        }`}>
                          {property.bedrooms}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                    }`}>
                      <Bath className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                        theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                      }`} />
                      <div>
                        <p className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          Bathrooms
                        </p>
                        <p className={`text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-200" : "text-gray-800"
                        }`}>
                          {property.bathrooms}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                    }`}>
                      <Ruler className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                        theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                      }`} />
                      <div>
                        <p className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          Area
                        </p>
                        <p className={`text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-200" : "text-gray-800"
                        }`}>
                          {property.area} m²
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                    }`}>
                      <DollarSign className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                        theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                      }`} />
                      <div>
                        <p className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          Price
                        </p>
                        <p className={`text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-200" : "text-gray-800"
                        }`}>
                          {pricingDisplay}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                    }`}>
                      <Users className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                        theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                      }`} />
                      <div>
                        <p className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          Max Room occup.
                        </p>
                        <p className={`text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-200" : "text-gray-800"
                        }`}>
                          {property.roomFor || 'N/A'} people per room
                        </p>
                      </div>
                    </div>
                    {curfewDisplay && (
                      <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors duration-300 ${
                        theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                      }`}>
                        <Moon className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                          theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                        }`} />
                        <div>
                          <p className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>
                            Curfew
                          </p>
                          <p className={`text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-200" : "text-gray-800"
                          }`}>
                            {curfewDisplay}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tenants Section */}
                  <div className="mt-4 sm:mt-6">
                    <h3 className={`font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-200" : "text-gray-800"
                    }`}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Current Tenants ({propertyTenants.length})
                      </div>
                    </h3>
                    {propertyTenants.length === 0 ? (
                      <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        No tenants currently staying at this property.
                      </p>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {propertyTenants.map((tenant) => (
                          <div key={tenant.$id} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors duration-300 ${
                            theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
                          }`}>
                            {tenant.avatar ? (
                              <Image
                                src={tenant.avatar}
                                alt={tenant.name}
                                width={32}
                                height={32}
                                className="rounded-full object-cover w-8 h-8"
                              />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                theme === "dark" ? "bg-gray-600" : "bg-blue-100"
                              }`}>
                                <User className={`w-4 h-4 ${
                                  theme === "dark" ? "text-gray-400" : "text-blue-600"
                                }`} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate transition-colors duration-300 ${
                                theme === "dark" ? "text-gray-200" : "text-gray-800"
                              }`}>
                                {tenant.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-xs">
                                <span className={`transition-colors duration-300 ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                                }`}>
                                  ${tenant.monthlyRent}/mo
                                </span>
                                <span className={`transition-colors duration-300 ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                                }`}>
                                  • {tenant.identifier}
                                </span>
                              </div>
                            </div>
                            <Link
                              href={`/dashboard/tenants/${tenant.$id}`}
                              className={`text-xs px-2 py-1 rounded-lg transition ${
                                theme === "dark"
                                  ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              }`}
                            >
                              View
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {property.type?.toLowerCase() === "boarding" && property.roomFor && (
                    <div className={`mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-[var(--accent-950)]/20 text-gray-300" 
                        : "bg-orange-50 text-gray-700"
                    }`}>
                      
                    </div>
                  )}

                  <div className="mt-4 sm:mt-6">
                    <h3 className={`font-semibold mb-1 sm:mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-200" : "text-gray-800"
                    }`}>
                      Description
                    </h3>
                    <p className={`text-xs sm:text-sm leading-relaxed transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}>
                      {property.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Facilities & Reviews */}
              <div className="space-y-4 sm:space-y-6">
                {/* Facilities */}
                <div className={`rounded-2xl shadow-sm p-4 sm:p-6 transition-colors duration-300 border ${
                  theme === "dark" 
                    ? "bg-gray-800 border-gray-700" 
                    : "bg-white border-gray-100"
                }`}>
                  <h2 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}>
                    Facilities
                  </h2>
                  {facilitiesList.length === 0 ? (
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      No facilities listed
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {facilitiesList.map((facility) => (
                        <span
                          key={facility}
                          className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-[var(--accent-950)]/30 text-[var(--accent-400)]" 
                              : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {getFacilityIcon(facility)}
                          {facility}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reviews Section */}
                <div className={`rounded-2xl shadow-sm p-4 sm:p-6 transition-colors duration-300 border ${
                  theme === "dark" 
                    ? "bg-gray-800 border-gray-700" 
                    : "bg-white border-gray-100"
                }`}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h2 className={`text-base sm:text-lg font-bold flex items-center gap-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-200" : "text-gray-800"
                    }`}>
                      <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                      Reviews ({reviews.length})
                    </h2>
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white text-xs sm:text-sm rounded-lg transition"
                    >
                      Write Review
                    </button>
                  </div>
                  
                  {averageRating > 0 && (
                    <div className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg transition-colors duration-300 ${
                      theme === "dark" ? "bg-yellow-900/20" : "bg-yellow-50"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-200" : "text-gray-800"
                        }`}>
                          {averageRating.toFixed(1)}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${i < Math.round(averageRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
                            />
                          ))}
                        </div>
                        <span className={`text-xs sm:text-sm transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          ({reviews.length} reviews)
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {reviews.length === 0 ? (
                    <p className={`text-xs sm:text-sm text-center py-3 sm:py-4 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      No reviews yet. Be the first to review!
                    </p>
                  ) : (
                    <div className="space-y-3 sm:space-y-4 max-h-60 sm:max-h-80 overflow-y-auto">
                      {reviews.map((review) => (
                        <div key={review.id} className={`border-b pb-2 sm:pb-3 transition-colors duration-300 ${
                          theme === "dark" ? "border-gray-700" : "border-gray-100"
                        }`}>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                            {review.userAvatar ? (
                              <Image
                                src={review.userAvatar}
                                alt={review.userName}
                                width={20}
                                height={20}
                                className="rounded-full object-cover sm:w-6 sm:h-6"
                              />
                            ) : (
                              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-[8px] sm:text-xs font-semibold">
                                  {review.userName.charAt(0)}
                                </span>
                              </div>
                            )}
                            <span className={`font-medium text-xs sm:text-sm transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-200" : "text-gray-800"
                            }`}>
                              {review.userName}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
                                />
                              ))}
                            </div>
                            <span className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-400" : "text-gray-400"
                            }`}>
                              {new Date(review.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className={`text-xs sm:text-sm mt-1 transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}>
                            {review.review}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Insights */}
                <div className={`rounded-2xl p-4 sm:p-6 text-white transition-colors duration-300 ${
                  theme === "dark" 
                    ? "bg-gradient-to-r from-gray-700 to-gray-600" 
                    : "bg-gradient-to-r from-blue-600 to-blue-700"
                }`}>
                  <h3 className="font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <TrendingUp className={`w-4 h-4 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-orange-300"
                    }`} />
                    Property Insights
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className={`transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-blue-200"
                      }`}>
                        Total Views
                      </span>
                      <span className="font-bold">{property.views || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className={`transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-blue-200"
                      }`}>
                        Total Likes
                      </span>
                      <span className="font-bold">{likesCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className={`transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-blue-200"
                      }`}>
                        Total Reviews
                      </span>
                      <span className="font-bold">{reviews.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className={`transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-blue-200"
                      }`}>
                        Active Tenants
                      </span>
                      <span className="font-bold">{propertyTenants.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className={`transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-blue-200"
                      }`}>
                        Listing Date
                      </span>
                      <span className="font-bold text-xs sm:text-sm">
                        {new Date(property.$createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className={`transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-blue-200"
                      }`}>
                        Last Updated
                      </span>
                      <span className="font-bold text-xs sm:text-sm">
                        {new Date(property.$updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Review Modal */}
            {showReviewModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className={`rounded-2xl p-4 sm:p-6 max-w-md w-full mx-4 transition-colors duration-300 ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>
                      Write a Review
                    </h3>
                    <button onClick={() => setShowReviewModal(false)} className={`transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                    }`}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>
                        Rating
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`w-6 h-6 sm:w-8 sm:h-8 ${star <= newReview.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>
                        Your Review
                      </label>
                      <textarea
                        rows={4}
                        value={newReview.review}
                        onChange={(e) => setNewReview({ ...newReview, review: e.target.value })}
                        placeholder="Share your experience with this property..."
                        className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                            : "border border-gray-300 text-gray-900 bg-white"
                        }`}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleSubmitReview}
                      disabled={isSubmitting || !newReview.review.trim()}
                      className={`flex-1 px-4 py-2 rounded-lg transition disabled:opacity-50 ${
                        theme === "dark"
                          ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                          : "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                      }`}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Review"}
                    </button>
                    <button
                      onClick={() => setShowReviewModal(false)}
                      className={`flex-1 px-4 py-2 rounded-lg transition ${
                        theme === "dark"
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className={`rounded-2xl p-4 sm:p-6 max-w-md w-full mx-4 transition-colors duration-300 ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      Delete Property
                    </h3>
                    <button onClick={() => setShowDeleteModal(false)} className={`transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                    }`}>
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mb-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <p className={`text-center text-sm sm:text-base transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Are you sure you want to delete <span className="font-semibold">{property.propertyName}</span>?
                    </p>
                    <p className={`text-center text-xs sm:text-sm mt-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      This action cannot be undone. All images and data will be permanently removed.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowDeleteModal(false)} className={`flex-1 px-4 py-2 rounded-lg transition ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}>
                      Cancel
                    </button>
                    <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default PropertyDetailPage;