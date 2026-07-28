"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useRouter } from "next/navigation";
import { account, storage } from "@/lib/appwrite/config";
import { ID } from "appwrite";
import Image from "next/image";
import {
  User,
  Mail,
  Phone,
  Save,
  XCircle,
  CheckCircle,
  Upload,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Lock,
  Key,
  Shield,
  Award,
} from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

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
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: (user.prefs as any)?.phone || "",
      });
      
      // Get avatar from user prefs
      const avatar = (user.prefs as any)?.avatar;
      if (avatar) {
        // If it's a full URL, use it directly
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
          setAvatarPreview(avatar);
        } else {
          // If it's a file ID, construct the URL
          try {
            const avatarUrl = storage.getFileView(
              process.env.NEXT_PUBLIC_APPWRITE_AVATARS_BUCKET_ID!,
              avatar
            ).toString();
            setAvatarPreview(avatarUrl);
          } catch (error) {
            console.error("Error constructing avatar URL:", error);
            setAvatarPreview("");
          }
        }
      } else {
        setAvatarPreview("");
      }
    }
  }, [user]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setAvatarFile(file);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview("");
    setAvatarFile(null);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      let avatarUrl = (user?.prefs as any)?.avatar || "";

      if (avatarFile) {
        // Delete old avatar if exists
        if (avatarUrl) {
          try {
            // Try to delete old file (if it's a file ID)
            await storage.deleteFile(
              process.env.NEXT_PUBLIC_APPWRITE_AVATARS_BUCKET_ID!,
              avatarUrl
            );
          } catch (error) {
            console.error("Error deleting old avatar:", error);
          }
        }

        // Upload new avatar
        const uploadedFile = await storage.createFile(
          process.env.NEXT_PUBLIC_APPWRITE_AVATARS_BUCKET_ID!,
          ID.unique(),
          avatarFile
        );
        avatarUrl = uploadedFile.$id; // Store the file ID, not the URL
      }

      // Update user name
      await account.updateName(formData.name);
      
      // Update user preferences (phone and avatar)
      await account.updatePrefs({
        phone: formData.phone,
        avatar: avatarUrl,
      });

      setSuccess("Profile updated successfully!");
      
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

    setLoading(true);

    try {
      await account.updatePassword(passwordData.newPassword, passwordData.currentPassword);
      
      setSuccess("Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
    } catch (err: unknown) {
      console.error("Error updating password:", err);
      let errorMessage = "Failed to update password";
      if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get avatar URL
  const getAvatarUrl = () => {
    if (avatarPreview) {
      return avatarPreview;
    }
    if (user?.prefs && (user.prefs as any)?.avatar) {
      const avatar = (user.prefs as any).avatar;
      if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return avatar;
      }
      try {
        return storage.getFileView(
          process.env.NEXT_PUBLIC_APPWRITE_AVATARS_BUCKET_ID!,
          avatar
        ).toString();
      } catch {
        return "";
      }
    }
    return "";
  };

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${
        resolvedTheme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <Sidebar />
        <div className="ml-64">
          <Header />
          <main className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className={`p-2 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                  }`}>
                    Profile Settings
                  </h1>
                  <p className={`text-sm mt-1 transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Manage your personal account information
                  </p>
                </div>
              </div>
            </div>

            {success && (
              <div className={`mb-6 border-l-4 rounded-xl overflow-hidden transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-green-900/30 border-green-500" 
                  : "bg-green-50 border-green-500"
              }`}>
                <div className="p-4 flex items-center gap-2">
                  <CheckCircle className={`w-5 h-5 transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-green-400" : "text-green-600"
                  }`} />
                  <span className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-green-300" : "text-green-800"
                  }`}>
                    {success}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className={`mb-6 border-l-4 rounded-xl overflow-hidden transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-red-900/30 border-red-500" 
                  : "bg-red-50 border-red-500"
              }`}>
                <div className="p-4 flex items-center gap-2">
                  <AlertCircle className={`w-5 h-5 transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-red-400" : "text-red-600"
                  }`} />
                  <span className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-red-300" : "text-red-800"
                  }`}>
                    {error}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Info Card - Premium */}
              <div className={`rounded-2xl shadow-md p-6 transition-colors duration-300 border ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                }`}>
                  <User className={`w-5 h-5 transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                  }`} />
                  Profile Information
                </h2>

                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Avatar Upload - Premium */}
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <label className="cursor-pointer">
                        <div className={`w-28 h-28 rounded-full overflow-hidden border-4 transition-colors duration-300 bg-gray-100 dark:bg-gray-700 flex items-center justify-center ${
                          resolvedTheme === "dark" 
                            ? "border-[var(--accent-500)]" 
                            : "border-[var(--accent-500)]"
                        }`}>
                          {getAvatarUrl() ? (
                            <Image
                              src={getAvatarUrl()}
                              alt="Avatar"
                              width={112}
                              height={112}
                              className="w-full h-full object-cover"
                              unoptimized
                              onError={() => {
                                // If image fails to load, clear the preview
                                setAvatarPreview("");
                              }}
                            />
                          ) : (
                            <User className={`w-14 h-14 transition-colors duration-300 ${
                              resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                            }`} />
                          )}
                        </div>
                        <div className={`absolute bottom-1 right-1 rounded-full p-2 shadow-lg transition-colors duration-300 ${
                          resolvedTheme === "dark" 
                            ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)]" 
                            : "bg-[var(--accent-500)] hover:bg-[var(--accent-600)]"
                        }`}>
                          <Upload className="w-4 h-4 text-white" />
                        </div>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleAvatarSelect}
                          className="hidden"
                        />
                      </label>
                      {(avatarPreview || (user?.prefs as any)?.avatar) && (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 hover:bg-red-600 transition shadow-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}
                    </div>
                    <p className={`text-xs mt-2 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Profile photo (max 2MB)
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                    }`}>
                      Full Name *
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`} />
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            resolvedTheme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-200 text-gray-900 bg-white"
                          }`}
                          placeholder="Your full name"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                    }`}>
                      Email Address *
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`} />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          className={`w-full pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 cursor-not-allowed ${
                            resolvedTheme === "dark" 
                              ? "bg-gray-700 text-gray-400" 
                              : "border border-gray-200 text-gray-500 bg-gray-50"
                          }`}
                          placeholder="your@email.com"
                          disabled
                        />
                      </div>
                    </div>
                    <p className={`text-xs mt-1 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                    }`}>
                      Email cannot be changed
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                    }`}>
                      Phone Number
                    </label>
                    <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "bg-gray-700" : "bg-white"
                    }`}>
                      <div className="relative">
                        <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`} />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                            resolvedTheme === "dark" 
                              ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                              : "border border-gray-200 text-gray-900 bg-white"
                          }`}
                          placeholder="+1 234 567 8900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-6 py-2.5 rounded-lg transition disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm hover:shadow-md ${
                        resolvedTheme === "dark"
                          ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                          : "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                      }`}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Password Card - Premium */}
              <div className={`rounded-2xl shadow-md p-6 transition-colors duration-300 border ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                }`}>
                  <Lock className={`w-5 h-5 transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                  }`} />
                  Password
                </h2>

                {!showPasswordForm ? (
                  <div className="text-center py-8">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                    }`}>
                      <Key className={`w-10 h-10 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`} />
                    </div>
                    <p className={`mb-4 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}>
                      Change your password to keep your account secure
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(true)}
                      className={`px-6 py-2.5 rounded-lg transition font-medium ${
                        resolvedTheme === "dark"
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Change Password
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                      }`}>
                        Current Password
                      </label>
                      <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-white"
                      }`}>
                        <div className="relative">
                          <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`} />
                          <input
                            type="password"
                            required
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className={`w-full pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                              resolvedTheme === "dark" 
                                ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                                : "border border-gray-200 text-gray-900 bg-white"
                            }`}
                            placeholder="Enter current password"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                      }`}>
                        New Password
                      </label>
                      <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-white"
                      }`}>
                        <div className="relative">
                          <Key className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`} />
                          <input
                            type="password"
                            required
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className={`w-full pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                              resolvedTheme === "dark" 
                                ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                                : "border border-gray-200 text-gray-900 bg-white"
                            }`}
                            placeholder="Enter new password"
                          />
                        </div>
                      </div>
                      <p className={`text-xs mt-1 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        Minimum 8 characters
                      </p>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-300" : "text-gray-800"
                      }`}>
                        Confirm New Password
                      </label>
                      <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-white"
                      }`}>
                        <div className="relative">
                          <Key className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`} />
                          <input
                            type="password"
                            required
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className={`w-full pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                              resolvedTheme === "dark" 
                                ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                                : "border border-gray-200 text-gray-900 bg-white"
                            }`}
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className={`flex-1 px-4 py-2.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md ${
                          resolvedTheme === "dark"
                            ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                            : "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                        }`}
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Update Password
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordData({
                            currentPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                          });
                        }}
                        className={`flex-1 px-4 py-2.5 rounded-lg transition font-medium ${
                          resolvedTheme === "dark"
                            ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}