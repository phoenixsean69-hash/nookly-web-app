"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useRouter, useSearchParams } from "next/navigation";
import { databases, storage, account } from "@/lib/appwrite/config";
import { ID } from "appwrite";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Mail,
  Phone,
  Users,
  Bell,
  Shield,
  CreditCard,
  Palette,
  Save,
  XCircle,
  CheckCircle,
  Upload,
  Trash2,
  Lock,
  Key,
  LogOut,
  AlertCircle,
  Moon,
  Sun,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface OrganizationSettings {
  name: string;
  email: string;
  phone: string;
  logo: string;
  logoFileId: string;
  subscriptionTier: "free" | "pro" | "enterprise";
  maxProperties: number;
  maxTeamMembers: number;
  username: string;
}

export default function SettingsPage() {
  const { organization, user, logout, isOffline } = useAuth();
  const {
  theme,
  resolvedTheme,
  accentColor,
  toggleTheme,
  setAccentColor,
} = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const tabParam = searchParams.get('tab');
  
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState(tabParam || "profile");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileTabMenu, setShowMobileTabMenu] = useState(false);
  
  const [formData, setFormData] = useState<OrganizationSettings>({
    name: "",
    email: "",
    phone: "",
    logo: "",
    logoFileId: "",
    subscriptionTier: "free",
    maxProperties: 10,
    maxTeamMembers: 5,
    username: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setShowMobileTabMenu(false);
      }
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

  // Update active tab when URL param changes
  useEffect(() => {
    if (tabParam && ['profile', 'security', 'billing', 'preferences'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Accent color options
  const accentColors = [
    { id: "orange", label: "Orange", class: "bg-orange-500" },
    { id: "blue", label: "Blue", class: "bg-blue-500" },
    { id: "green", label: "Green", class: "bg-green-500" },
    { id: "purple", label: "Purple", class: "bg-purple-500" },
    { id: "pink", label: "Pink", class: "bg-pink-500" },
    { id: "teal", label: "Teal", class: "bg-teal-500" },
    { id: "red", label: "Red", class: "bg-red-500" },
    { id: "indigo", label: "Indigo", class: "bg-indigo-500" },
    { id: "rose", label: "Rose", class: "bg-rose-500" },
    { id: "amber", label: "Amber", class: "bg-amber-500" },
  ];

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-dismiss error message after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || "",
        email: organization.email || "",
        phone: organization.phone || "",
        username:organization.username || "",
        logo: organization.avatar || "",
        logoFileId: (organization as any).avatarFileId || "",
        subscriptionTier: (organization as any).subscriptionTier || "free",
        maxProperties: (organization as any).maxProperties || 10,
        maxTeamMembers: (organization as any).maxTeamMembers || 5,
      });
      setLogoPreview(organization.avatar || "");
    }
  }, [organization]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      setLogoFile(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview("");
    setLogoFile(null);
    setFormData(prev => ({ ...prev, logo: "", logoFileId: "" }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      let logoUrl = formData.logo;
      let logoFileId = formData.logoFileId;

      if (logoFile) {
        if (logoFileId) {
          try {
            await storage.deleteFile(
              process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATIONS_BUCKET_ID!,
              logoFileId
            );
          } catch (error) {
            console.error("Error deleting old logo:", error);
          }
        }

        const uploadedFile = await storage.createFile(
          process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATIONS_BUCKET_ID!,
          ID.unique(),
          logoFile
        );
        logoUrl = storage
          .getFileView(
            process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATIONS_BUCKET_ID!,
            uploadedFile.$id
          )
          .toString();
        logoFileId = uploadedFile.$id;
      }

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATIONS_COLLECTION_ID!,
        organization?.$id!,
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          avatar: logoUrl,
          avatarFileId: logoFileId,
        }
      );

      setSuccess("Organization profile updated successfully!");
      
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      console.error("Error updating profile:", err);
      let errorMessage = "Failed to update profile";
      if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!passwordData.currentPassword) {
      setError("Current password is required");
      return;
    }

    setLoading(true);

    try {
      await account.updatePassword(
        passwordData.newPassword,
        passwordData.currentPassword
      );
      
      setSuccess("Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: unknown) {
      console.error("Error updating password:", err);
      let errorMessage = "Failed to update password";
      if (err instanceof Error) {
        if (err.message.includes("Invalid credentials")) {
          errorMessage = "Current password is incorrect";
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: Building2 },
    { id: "security", label: "Passwords", icon: Shield },
    { id: "billing", label: "Billing & Subscription", icon: CreditCard },
    { id: "preferences", label: "Preferences", icon: Palette },
  ];

  const subscriptionPlans = [
    {
      tier: "free",
      name: "Free",
      price: "$0",
      period: "/month",
      features: ["Up to 10 properties", "Basic support", "5 team members"],
      maxProperties: 10,
      maxTeamMembers: 5,
    },
    {
      tier: "pro",
      name: "Pro",
      price: "$49",
      period: "/month",
      features: ["Up to 50 properties", "Priority support", "15 team members", "Advanced analytics"],
      maxProperties: 50,
      maxTeamMembers: 15,
    },
    {
      tier: "enterprise",
      name: "Enterprise",
      price: "Custom",
      period: "",
      features: ["Unlimited properties", "24/7 dedicated support", "Unlimited team members", "Custom features"],
      maxProperties: 999999,
      maxTeamMembers: 999999,
    },
  ];

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
        resolvedTheme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <Sidebar />
        <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
          <Header />
          <main className="p-3 sm:p-4 md:p-6 pb-12">
            <div className="max-w-7xl mx-auto">
              <div className="mb-4 sm:mb-6">
                <h1 className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                }`}>Settings</h1>
                <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}>
                  Manage your organization settings and preferences
                </p>
              </div>

              {success && (
                <div className={`mb-4 sm:mb-6 p-3 sm:p-4 border-l-4 rounded-xl overflow-hidden transition-colors duration-300 ${
                  resolvedTheme === "dark" 
                    ? "bg-green-900/30 border-green-500" 
                    : "bg-green-50 border-green-500"
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-green-400" : "text-green-600"
                    }`} />
                    <span className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-green-300" : "text-green-800"
                    }`}>
                      {success}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className={`mb-4 sm:mb-6 p-3 sm:p-4 border-l-4 rounded-xl overflow-hidden transition-colors duration-300 ${
                  resolvedTheme === "dark" 
                    ? "bg-red-900/30 border-red-500" 
                    : "bg-red-50 border-red-500"
                }`}>
                  <div className="flex items-start xs:items-center gap-2">
                    <AlertCircle className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 xs:mt-0 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-red-400" : "text-red-500"
                    }`} />
                    <span className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-red-300" : "text-red-700"
                    }`}>
                      {error}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
                {/* Sidebar Tabs - Desktop */}
                <div className="hidden md:block w-64 flex-shrink-0">
                  <div className={`rounded-2xl shadow-md overflow-hidden transition-colors duration-300 border ${
                    resolvedTheme === "dark" 
                      ? "bg-gray-800/80 border-gray-700" 
                      : "bg-white/80 border-gray-100 backdrop-blur-sm"
                  }`}>
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            router.push(`/dashboard/settings?tab=${tab.id}`, { scroll: false });
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                            activeTab === tab.id
                              ? "bg-[var(--accent-50)] dark:bg-[var(--accent-950)]/30 text-[var(--accent-600)] dark:text-[var(--accent-400)] border-r-4 border-[var(--accent-500)] dark:border-[var(--accent-400)]"
                              : `text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50`
                          }`}
                        >
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            activeTab === tab.id ? "text-[var(--accent-500)] dark:text-[var(--accent-400)]" : ""
                          }`} />
                          <span className="text-sm sm:text-base font-medium">{tab.label}</span>
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setShowLogoutModal(true)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-t ${
                        resolvedTheme === "dark" 
                          ? "text-red-400 hover:bg-red-900/30 border-gray-700" 
                          : "text-red-600 hover:bg-red-50 border-gray-100"
                      }`}
                    >
                      <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Tab Selector */}
                <div className="md:hidden">
                  <div className={`rounded-2xl shadow-md overflow-hidden transition-colors duration-300 border ${
                    resolvedTheme === "dark" 
                      ? "bg-gray-800/80 border-gray-700" 
                      : "bg-white/80 border-gray-100 backdrop-blur-sm"
                  }`}>
                    <button
                      onClick={() => setShowMobileTabMenu(!showMobileTabMenu)}
                      className={`w-full flex items-center justify-between px-4 py-3 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-100 hover:bg-gray-700/50" : "text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {(() => {
                          const activeTabObj = tabs.find(t => t.id === activeTab);
                          const Icon = activeTabObj?.icon || Building2;
                          return <Icon className="w-4 h-4 text-[var(--accent-500)] dark:text-[var(--accent-400)]" />;
                        })()}
                        <span className="font-medium">{tabs.find(t => t.id === activeTab)?.label || "Settings"}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${
                        showMobileTabMenu ? "rotate-90" : ""
                      }`} />
                    </button>
                    
                    {showMobileTabMenu && (
                      <div className={`border-t transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "border-gray-700" : "border-gray-100"
                      }`}>
                        {tabs.map((tab) => {
                          const Icon = tab.icon;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => {
                                setActiveTab(tab.id);
                                setShowMobileTabMenu(false);
                                router.push(`/dashboard/settings?tab=${tab.id}`, { scroll: false });
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                                activeTab === tab.id
                                  ? `bg-[var(--accent-50)] dark:bg-[var(--accent-950)]/30 text-[var(--accent-600)] dark:text-[var(--accent-400)]`
                                  : `text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50`
                              }`}
                            >
                              <Icon className={`w-4 h-4 ${
                                activeTab === tab.id ? "text-[var(--accent-500)] dark:text-[var(--accent-400)]" : ""
                              }`} />
                              <span className="text-sm font-medium">{tab.label}</span>
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => {
                            setShowMobileTabMenu(false);
                            setShowLogoutModal(true);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-t ${
                            resolvedTheme === "dark" 
                              ? "text-red-400 hover:bg-red-900/30 border-gray-700" 
                              : "text-red-600 hover:bg-red-50 border-gray-100"
                          }`}
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm font-medium">Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  {/* Profile Tab */}
                  {activeTab === "profile" && (
                    <div className={`rounded-2xl shadow-md p-4 sm:p-6 transition-colors duration-300 border ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-800/80 border-gray-700" 
                        : "bg-white/80 border-gray-100 backdrop-blur-sm"
                    }`}>
                      <h2 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                      }`}>
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent-500)] dark:text-[var(--accent-400)]" />
                        Organization Profile
                      </h2>

                      <form onSubmit={handleProfileSubmit} className="space-y-4 sm:space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                          <div className="flex flex-col items-center sm:items-start">
                            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 transition-colors duration-300 flex items-center justify-center ${
                              resolvedTheme === "dark" 
                                ? "border-[var(--accent-400)] bg-gray-700" 
                                : "border-[var(--accent-500)] bg-gray-200"
                            }`}>
                              {logoPreview ? (
                                <Image
                                  src={logoPreview}
                                  alt="Organization Logo"
                                  width={96}
                                  height={96}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Building2 className={`w-10 h-10 sm:w-12 sm:h-12 transition-colors duration-300 ${
                                  resolvedTheme === "dark" ? "text-gray-500" : "text-gray-500"
                                }`} />
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                              <label className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg cursor-pointer transition ${
                                resolvedTheme === "dark"
                                  ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                                  : "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                              }`}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoSelect}
                                  className="hidden"
                                />
                                <Upload className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                                Upload
                              </label>
                              {logoPreview && (
                                <button
                                  type="button"
                                  onClick={removeLogo}
                                  className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm rounded-lg transition"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 w-full space-y-3 sm:space-y-4">
                            <div>
                              <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                                resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                              }`}>
                                Organization Name
                              </label>
                              <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={`w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                                  resolvedTheme === "dark" 
                                    ? "bg-gray-700 border-gray-600 text-gray-100" 
                                    : "border border-gray-200 text-gray-900 bg-white"
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                              resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                            }`}>
                              Email
                            </label>
                            <div className="relative">
                              <Mail className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${
                                resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                              }`} />
                              <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                                  resolvedTheme === "dark" 
                                    ? "bg-gray-700 border-gray-600 text-gray-100" 
                                    : "border border-gray-200 text-gray-900 bg-white"
                                }`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                              resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                            }`}>
                              Phone
                            </label>
                            <div className="relative">
                              <Phone className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${
                                resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                              }`} />
                              <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                                  resolvedTheme === "dark" 
                                    ? "bg-gray-700 border-gray-600 text-gray-100" 
                                    : "border border-gray-200 text-gray-900 bg-white"
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={loading}
                            className={`px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 ${
                              resolvedTheme === "dark"
                                ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                                : "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                            }`}
                          >
                            {loading ? (
                              <>
                                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Save Changes</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Security Tab */}
                  {activeTab === "security" && (
                    <div className={`rounded-2xl shadow-md p-4 sm:p-6 transition-colors duration-300 border ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-800/80 border-gray-700" 
                        : "bg-white/80 border-gray-100 backdrop-blur-sm"
                    }`}>
                      <h2 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                      }`}>
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent-500)] dark:text-[var(--accent-400)]" />
                        Security Settings
                      </h2>

                      <form onSubmit={handlePasswordSubmit} className="space-y-4 sm:space-y-6 max-w-full sm:max-w-md">
                        <div>
                          <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                          }`}>
                            Current Password
                          </label>
                          <div className="relative">
                            <Lock className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${
                              resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                            }`} />
                            <input
                              type="password"
                              required
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                              className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                                resolvedTheme === "dark" 
                                  ? "bg-gray-700 border-gray-600 text-gray-100" 
                                  : "border border-gray-200 text-gray-900 bg-white"
                              }`}
                              placeholder="Enter current password"
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                          }`}>
                            New Password
                          </label>
                          <div className="relative">
                            <Key className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${
                              resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                            }`} />
                            <input
                              type="password"
                              required
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                                resolvedTheme === "dark" 
                                  ? "bg-gray-700 border-gray-600 text-gray-100" 
                                  : "border border-gray-200 text-gray-900 bg-white"
                              }`}
                              placeholder="Enter new password"
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                          }`}>
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <Key className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${
                              resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                            }`} />
                            <input
                              type="password"
                              required
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                              className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                                resolvedTheme === "dark" 
                                  ? "bg-gray-700 border-gray-600 text-gray-100" 
                                  : "border border-gray-200 text-gray-900 bg-white"
                              }`}
                              placeholder="Confirm new password"
                            />
                          </div>
                          {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                            <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">Passwords do not match</p>
                          )}
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={loading}
                            className={`px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 ${
                              resolvedTheme === "dark"
                                ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                                : "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                            }`}
                          >
                            {loading ? (
                              <>
                                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Update Password</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Billing Tab */}
                  {activeTab === "billing" && (
                    <div className={`rounded-2xl shadow-md p-4 sm:p-6 transition-colors duration-300 border ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-800/80 border-gray-700" 
                        : "bg-white/80 border-gray-100 backdrop-blur-sm"
                    }`}>
                      <h2 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                      }`}>
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent-500)] dark:text-[var(--accent-400)]" />
                        Subscription & Billing
                      </h2>

                      <div className="mb-4 sm:mb-6">
                        <div className={`rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 transition-colors duration-300 ${
                          resolvedTheme === "dark" 
                            ? "bg-gray-700" 
                            : "bg-gradient-to-r from-blue-50 to-[var(--accent-50)]"
                        }`}>
                          <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2">
                            <div>
                              <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                                resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                              }`}>
                                Current Plan
                              </p>
                              <p className={`text-xl sm:text-2xl font-bold capitalize transition-colors duration-300 ${
                                resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                              }`}>
                                {formData.subscriptionTier}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                                resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                              }`}>
                                {formData.maxProperties} Properties • {formData.maxTeamMembers} Team Members
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {subscriptionPlans.map((plan) => (
                            <div
                              key={plan.tier}
                              className={`border rounded-xl p-3 sm:p-4 transition ${
                                formData.subscriptionTier === plan.tier
                                  ? `border-[var(--accent-500)] dark:border-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-[var(--accent-950)]/20`
                                  : `border-gray-200 dark:border-gray-700 hover:border-[var(--accent-300)] dark:hover:border-[var(--accent-500)] ${
                                      resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
                                    }`
                              }`}
                            >
                              <h3 className={`text-base sm:text-lg font-bold transition-colors duration-300 ${
                                resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                              }`}>
                                {plan.name}
                              </h3>
                              <div className="mt-1 sm:mt-2">
                                <span className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
                                  resolvedTheme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                                }`}>
                                  {plan.price}
                                </span>
                                <span className={`text-xs sm:text-sm transition-colors duration-300 ${
                                  resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                                }`}>
                                  {plan.period}
                                </span>
                              </div>
                              <ul className="mt-2 sm:mt-4 space-y-1 sm:space-y-2">
                                {plan.features.map((feature, index) => (
                                  <li key={index} className={`text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors duration-300 ${
                                    resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                                  }`}>
                                    <CheckCircle className={`w-3 h-3 flex-shrink-0 ${
                                      resolvedTheme === "dark" ? "text-green-400" : "text-green-500"
                                    }`} />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                              {formData.subscriptionTier !== plan.tier && (
                                <button
                                  disabled
                                  className={`mt-3 sm:mt-4 w-full py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg cursor-not-allowed transition-colors duration-300 ${
                                    resolvedTheme === "dark" 
                                      ? "bg-gray-700 text-gray-400" 
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  Contact Sales
                                </button>
                              )}
                              {formData.subscriptionTier === plan.tier && (
                                <div className={`mt-3 sm:mt-4 w-full py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg text-center transition-colors duration-300 ${
                                  resolvedTheme === "dark" 
                                    ? "bg-green-900/30 text-green-400" 
                                    : "bg-green-100 text-green-700"
                                }`}>
                                  Current Plan
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preferences Tab */}
                  {activeTab === "preferences" && (
                    <div className={`rounded-2xl shadow-md p-4 sm:p-6 transition-colors duration-300 border ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-800/80 border-gray-700" 
                        : "bg-white/80 border-gray-100 backdrop-blur-sm"
                    }`}>
                      <h2 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                      }`}>
                        <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent-500)] dark:text-[var(--accent-400)]" />
                        Preferences
                      </h2>

                      <div className="space-y-6 sm:space-y-8">
                        {/* Theme Selection */}
                        <div>
                          <label className={`block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                          }`}>
                            Theme
                          </label>
                          <div className="flex flex-wrap gap-2 sm:gap-4">
                            <button
                              onClick={toggleTheme}
                              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border-2 transition ${
                                theme !== "dark"
                                  ? `border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-950)]/20`
                                  : `border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500`
                              }`}
                            >
                              <Sun className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                                resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                              }`} />
                              <span className={resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"}>Light</span>
                            </button>
                            <button
                              onClick={toggleTheme}
                              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border-2 transition ${
                                resolvedTheme === "dark"
                                  ? `border-[var(--accent-400)] bg-[var(--accent-950)]/20`
                                  : `border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500`
                              }`}
                            >
                              <Moon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                                resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                              }`} />
                              <span className={resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"}>Dark</span>
                            </button>
                          </div>
                        </div>

                        {/* Accent Color Selection */}
                        <div>
                          <label className={`block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                          }`}>
                            Accent Color
                          </label>
                          <div className="flex flex-wrap gap-2 sm:gap-3">
                            {accentColors.map((color) => (
                              <button
                                key={color.id}
                                onClick={() => setAccentColor(color.id as any)}
                                className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full ${color.class} transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                                  accentColor === color.id
                                    ? `ring-2 sm:ring-4 ring-offset-2 ring-[var(--accent-500)] dark:ring-[var(--accent-400)] scale-110`
                                    : `ring-1 ring-gray-200 dark:ring-gray-600 hover:ring-gray-300 dark:hover:ring-gray-500`
                                }`}
                                aria-label={`Select ${color.label} accent color`}
                                title={color.label}
                              >
                                {accentColor === color.id && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white drop-shadow-sm" />
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                          <p className={`text-[10px] sm:text-xs mt-2 transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>
                            Current: <span className="font-medium capitalize">{accentColor}</span>
                          </p>
                        </div>

                        {/* Preview Section */}
                        <div className={`p-3 sm:p-4 rounded-xl transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
                        }`}>
                          <p className={`text-xs sm:text-sm mb-2 sm:mb-3 transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}>
                            Preview
                          </p>
                          <div className="flex flex-wrap gap-2 sm:gap-3">
                            <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white text-xs sm:text-sm rounded-lg transition-colors">
                              Primary Button
                            </button>
                            <button className={`px-3 sm:px-4 py-1.5 sm:py-2 border-2 text-xs sm:text-sm rounded-lg bg-transparent transition-colors ${
                              resolvedTheme === "dark"
                                ? "border-[var(--accent-400)] text-[var(--accent-400)] hover:bg-[var(--accent-950)]/20"
                                : "border-[var(--accent-500)] text-[var(--accent-600)] hover:bg-[var(--accent-50)]"
                            }`}>
                              Outline Button
                            </button>
                            <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-sm rounded-full transition-colors duration-300 ${
                              resolvedTheme === "dark"
                                ? "bg-[var(--accent-950)]/30 text-[var(--accent-300)]"
                                : "bg-[var(--accent-100)] text-[var(--accent-700)]"
                            }`}>
                              <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Badge
                            </span>
                          </div>
                        </div>

                        {/* Notification Preferences */}
                        <div>
                          <label className={`block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                          }`}>
                            Notification Preferences
                          </label>
                          <div className="space-y-2 sm:space-y-3">
                            {[
                              { label: "Email Notifications", defaultChecked: true },
                              { label: "SMS Notifications", defaultChecked: false },
                              { label: "Marketing Communications", defaultChecked: true },
                            ].map((item, index) => (
                              <label
                                key={index}
                                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg cursor-pointer transition-colors duration-300 ${
                                  resolvedTheme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${
                                    resolvedTheme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                                  }`} />
                                  <span className={`text-xs sm:text-sm transition-colors duration-300 ${
                                    resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                                  }`}>
                                    {item.label}
                                  </span>
                                </div>
                                <div className="relative">
                                  <input type="checkbox" className="sr-only peer" defaultChecked={item.defaultChecked} />
                                  <div className={`w-8 h-4 sm:w-9 sm:h-5 rounded-full transition-colors duration-300 ${
                                    resolvedTheme === "dark" ? "bg-gray-600" : "bg-gray-300"
                                  } peer peer-checked:bg-[var(--accent-500)] dark:peer-checked:bg-[var(--accent-400)] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 sm:after:h-4 sm:after:w-4 after:transition-all`} />
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className={`w-[340px] max-w-full transition-colors duration-300 ${
            resolvedTheme === "dark" 
              ? "bg-gray-800/95 backdrop-blur-md" 
              : "bg-white/95 backdrop-blur-md"
          } rounded-2xl shadow-2xl overflow-hidden`}>
            <div className={`px-6 py-4 relative overflow-hidden ${
              resolvedTheme === "dark" 
                ? "bg-gray-700" 
                : "bg-gradient-to-r from-blue-800 to-[var(--accent-500)]"
            }`}>
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl ${
                resolvedTheme === "dark" ? "bg-gray-500/20" : "bg-[var(--accent-500)]/20"
              }`} />
              <div className="relative text-center">
                <div className={`inline-block p-2.5 rounded-full mb-2 ${
                  resolvedTheme === "dark" ? "bg-gray-600/50" : "bg-white/10"
                }`}>
                  <LogOut className={`w-6 h-6 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-[var(--accent-400)]"
                  }`} />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Sign Out?</h2>
                <p className={`text-xs ${
                  resolvedTheme === "dark" ? "text-gray-300" : "text-blue-200"
                }`}>You'll need to sign in again</p>
              </div>
            </div>

            <div className="p-5">
              <p className={`text-center text-sm mb-5 transition-colors duration-300 ${
                resolvedTheme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>
                Are you sure you want to sign out of your account?
              </p>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full h-px transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "bg-gray-600" : "bg-gray-200"
                  }`} />
                </div>
                <div className="relative flex justify-center">
                  <span className={`px-2 text-[10px] transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "bg-gray-800/95 text-gray-400" : "bg-white/95 text-gray-400"
                  }`}>Are you sure?</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md ${
                    resolvedTheme === "dark"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {isLoggingOut ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Signing Out...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <LogOut className="w-4 h-4" />
                      <span>Yes, Sign Out</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setShowLogoutModal(false)}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] ${
                    resolvedTheme === "dark"
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}