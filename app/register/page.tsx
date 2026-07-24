"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";

import { useTheme } from "@/contexts/theme-context";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { storage } from "@/lib/appwrite/config";
import { ID } from "appwrite";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  User,
} from "lucide-react";

export default function SimpleRegisterPage() {
  const { register } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
const [formData, setFormData] = useState({
  name: "",
  username: "",
  email: "",
  city: "",
  phone: "",
  password: "",
  confirmPassword: "",
  avatar: "",
  avatarFileId: "",

  type_of: "",
  otherType: "",
});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate consistent color based on name
  const getInitialsColor = (name: string): string => {
    const colors = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
      "#F97316",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const handleAvatarUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/jpg,image/webp";

    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setUploadingAvatar(true);
        const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
          throw new Error("Only JPG, PNG and WEBP images are allowed.");
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Logo must be smaller than 5MB.");
        }

        const uploadedFile = await storage.createFile(
          "69a20709002844cb4f69",
          ID.unique(),
          file,
        );

        const previewUrl = storage
          .getFileView("69a20709002844cb4f69", uploadedFile.$id)
          .toString();

        setFormData((prev) => ({
          ...prev,
          avatar: previewUrl,
          avatarFileId: uploadedFile.$id,
        }));
        setError("");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to upload logo");
      } finally {
        setUploadingAvatar(false);
      }
    };
    input.click();
  };

  const removeAvatar = () => {
    setFormData((prev) => ({
      ...prev,
      avatar: "",
      avatarFileId: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

if (
  !formData.name ||
  !formData.city ||
  !formData.username ||
  !formData.email ||
  !formData.phone ||
  !formData.password ||
  !formData.type_of
) {
  setError("Please fill in all fields");
  return;
}

// If "Other" was selected, make sure they entered a custom type
if (
  formData.type_of === "other" &&
  (!formData.otherType || !formData.otherType.trim())
) {
  setError("Please specify the organization type");
  return;
}
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setError("");
    setLoading(true);

    try {
await register({
  name: formData.name,
  username: formData.username,
  email: formData.email,
  password: formData.password,
  phone: formData.phone,
  avatar: formData.avatar,
  city : formData.city,
  avatarFileId: formData.avatarFileId,

  type_of:
    formData.type_of === "other"
      ? formData.otherType.trim().toLowerCase()
      : formData.type_of,
});
    } catch (err: unknown) {
      console.error("Registration error:", err);
      if (!formData.type_of) {
  setError("Please select your organization type");
  return;
}

if (
  formData.type_of === "other" &&
  formData.otherType.trim() === ""
) {
  setError("Please specify your organization type");
  return;
}
      setError(err instanceof Error ? err.message : "Failed to register");
      setLoading(false);
    }
  };

  const displayInitials = formData.name && !formData.avatar ? getInitials(formData.name) : "";
  const initialsColor = formData.name ? getInitialsColor(formData.name) : "#F97316";

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 transition-colors duration-300">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image src="/nightHouse2.jpg" alt="Beautiful property" fill className="object-cover" priority />
        <div className={`absolute inset-0 transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-800/60" 
            : "bg-gradient-to-br from-[#1e3a5f]/80 via-[#1e3a5f]/70 to-[var(--accent-500)]/30"
        }`} />
      </div>

      {/* Animated accent circles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse transition-colors duration-300 ${
          theme === "dark" ? "bg-gray-600/10" : "bg-[var(--accent-500)]/10"
        }`} />
        <div className={`absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 transition-colors duration-300 ${
          theme === "dark" ? "bg-gray-500/10" : "bg-blue-600/10"
        }`} />
      </div>

      {/* Main Card - Small and Centered */}
      <div className="relative z-10 w-[450px] max-w-full">
        <div className={`backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300 ${
          theme === "dark" ? "bg-gray-800/95" : "bg-white/95"
        }`}>
          {/* Header */}
          <div className={`bg-gradient-to-r px-8 py-6 relative overflow-hidden transition-colors duration-300 ${
            theme === "dark" 
              ? "from-gray-700 via-gray-700 to-gray-600" 
              : "from-[#1e3a5f] via-[#1e3a5f] to-[var(--accent-500)]"
          }`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl transition-colors duration-300 ${
              theme === "dark" ? "bg-gray-500/20" : "bg-[var(--accent-500)]/20"
            }`} />
            <div className="relative text-center">
              <div className={`inline-block p-2.5 rounded-full mb-3 transition-colors duration-300 ${
                theme === "dark" ? "bg-gray-600/50" : "bg-white/10"
              }`}>
                <Building2 className={`w-6 h-6 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-[var(--accent-400)]"
                }`} />
              </div>
              <h2 className="text-2xl font-bold text-white">Nookly</h2>
              <p className={`text-sm mt-1 transition-colors duration-300 ${
                theme === "dark" ? "text-gray-300" : "text-blue-200"
              }`}>
                Create your organization account
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Avatar Upload */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="cursor-pointer"
                  >
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center relative overflow-hidden border-2 shadow-md transition-colors duration-300 ${
                      theme === "dark" 
                        ? "border-gray-500 bg-gray-700" 
                        : "border-[var(--accent-500)] bg-gray-100"
                    }`}>
                      {uploadingAvatar ? (
                        <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin transition-colors duration-300 ${
                          theme === "dark" ? "border-gray-400" : "border-[var(--accent-500)]"
                        }`} />
                      ) : formData.avatar ? (
                        <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : formData.name ? (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: initialsColor }}>
                          <span className="text-white text-2xl font-bold">{displayInitials}</span>
                        </div>
                      ) : (
                        <Upload size={32} className="text-gray-400 dark:text-gray-500" />
                      )}
                      <div className={`absolute bottom-0 right-0 rounded-full p-1.5 shadow-md transition-colors duration-300 ${
                        theme === "dark" ? "bg-gray-600" : "bg-[var(--accent-500)]"
                      }`}>
                        <Upload size={12} className="text-white" />
                      </div>
                    </div>
                  </button>
                  {formData.avatar && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  )}
                </div>
                <div className="text-center mt-3">
                  <p className={`text-sm font-medium transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    {uploadingAvatar ? "Uploading..." : formData.avatar ? "Change Photo" : "Organization Logo"}
                  </p>
                  <p className={`text-xs mt-1 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-400"
                  }`}>
                    {!formData.avatar && "Optional - Your initials will be used"}
                  </p>
                </div>
              </div>

              {/* Organization Name */}
              <div className="mb-4">
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] focus:border-[var(--accent-500)] transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-300 text-gray-900 bg-white"
                    }`}
                    placeholder="Enter your organization name"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
  <label
    className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
      theme === "dark"
        ? "text-gray-300"
        : "text-gray-700"
    }`}
  >
    Organization Type <span className="text-red-500">*</span>
  </label>

  <select
    value={formData.type_of}
    onChange={(e) =>
      setFormData({
        ...formData,
        type_of: e.target.value,
      })
    }
    className={`w-full px-4 py-2.5 rounded-lg border transition-colors duration-300 ${
      theme === "dark"
        ? "bg-gray-700 border-gray-600 text-white"
        : "bg-white border-gray-300 text-gray-900"
    }`}
    required
  >
    <option value="">Select organization type</option>

    <option value="school">School</option>

    <option value="real_estate">
      Real Estate
    </option>

    <option value="hospitality">
      Hospitality
    </option>

    <option value="government">
      Government
    </option>

    <option value="ngo">
      NGO
    </option>

    <option value="social">
      Social Organization
    </option>

    <option value="housing_cooperative">
      Housing Cooperative
    </option>

    <option value="other">
      Other
    </option>
  </select>
</div>

{formData.type_of === "other" && (
  <div className="mt-3">
    <input
      type="text"
      placeholder="Specify organization type"
      value={formData.otherType}
      onChange={(e) =>
        setFormData({
          ...formData,
          otherType: e.target.value,
        })
      }
      className={`w-full px-4 py-2.5 rounded-lg border transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gray-700 border-gray-600 text-white"
          : "bg-white border-gray-300 text-gray-900"
      }`}
    />
  </div>
)}

{/* City */}
<div className="mb-4">
  <label
    className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
      theme === "dark" ? "text-gray-300" : "text-gray-700"
    }`}
  >
    City <span className="text-red-500">*</span>
  </label>

  <div className="relative">
    <MapPin
      size={18}
      className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
        theme === "dark" ? "text-gray-500" : "text-gray-400"
      }`}
    />

    <input
      type="text"
      value={formData.city}
      onChange={(e) =>
        setFormData({
          ...formData,
          city: e.target.value,
        })
      }
      className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] focus:border-[var(--accent-500)] transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
          : "border border-gray-300 text-gray-900 bg-white"
      }`}
      placeholder="e.g. Harare"
      autoComplete="address-level2"
      required
    />
  </div>
</div>

              {/* Username */}
              <div className="mb-4">
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] focus:border-[var(--accent-500)] transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-300 text-gray-900 bg-white"
                    }`}
                    placeholder="Choose a unique username"
                    required
                  />
                </div>
                <p className={`text-xs mt-1 flex items-center gap-1 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  <AlertCircle size={12} />
                  Make sure you remember it for future logins
                </p>
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] focus:border-[var(--accent-500)] transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-300 text-gray-900 bg-white"
                    }`}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="mb-4">
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] focus:border-[var(--accent-500)] transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-300 text-gray-900 bg-white"
                    }`}
                    placeholder="+1 234 567 8900"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full pl-10 pr-12 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] focus:border-[var(--accent-500)] transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-300 text-gray-900 bg-white"
                    }`}
                    placeholder="Create a password (min. 8 characters)"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff size={18} className="text-gray-400 dark:text-gray-500" /> : <Eye size={18} className="text-gray-400 dark:text-gray-500" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-4">
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full pl-10 pr-12 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] focus:border-[var(--accent-500)] transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-300 text-gray-900 bg-white"
                    }`}
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? <EyeOff size={18} className="text-gray-400 dark:text-gray-500" /> : <Eye size={18} className="text-gray-400 dark:text-gray-500" />}
                  </button>
                </div>
              </div>

              {/* Password Hint */}
              {formData.password.length > 0 && formData.password.length < 8 && (
                <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} />
                  Password must be at least 8 characters
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || uploadingAvatar}
                className="w-full py-3 bg-[var(--accent-500)] text-white rounded-lg font-semibold hover:bg-[var(--accent-600)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading || uploadingAvatar ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Create Organization Account
                  </>
                )}
              </button>

              {/* Sign In Link */}
              <p className={`text-center text-sm mt-4 transition-colors duration-300 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}>
                Already have an account?{" "}
                <a href="/login" className="text-[var(--accent-500)] dark:text-[var(--accent-400)] font-semibold hover:underline">
                  Sign In
                </a>
              </p>
            </form>
          </div>
        </div>

        {/* Features Banner */}
        <div className="mt-4 text-center">
          <p className="text-white/80 text-xs flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-[var(--accent-400)] rounded-full" />
            Join thousands of organizations managing properties with Nookly
            <span className="w-1.5 h-1.5 bg-[var(--accent-400)] rounded-full" />
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.05); opacity: 0.2; }
        }
        .animate-pulse {
          animation: pulse 3s ease-in-out infinite;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}