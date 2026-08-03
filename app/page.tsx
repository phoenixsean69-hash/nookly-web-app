"use client";

import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, Key, Eye, EyeOff, AlertCircle, LogOut, User, Mail } from "lucide-react";
import { account } from "@/lib/appwrite/config";

export default function Home() {
  const { user, organization, loading, logout, isOffline } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (user) {
        // If offline, skip password prompt and go directly to dashboard
        if (isOffline || !navigator.onLine) {
          console.log('📴 Offline - skipping verification, using cached auth');
          router.replace("/dashboard");
          return;
        }
        // User is logged in and online, show verification prompt
        setShowPasswordPrompt(true);
      } else {
        router.replace("/register");
      }
    }
  }, [user, loading, router, isOffline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Double check if online
    if (!navigator.onLine) {
      setError("You're offline. Please connect to the internet to verify.");
      return;
    }

    setIsVerifying(true);

    try {
      // Verify the user's identity
      await account.get();
      
      sessionStorage.setItem('password_verified', 'true');
      setShowPasswordPrompt(false);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Verification failed:", err);
      setError("Unable to verify. Please try again.");
      setPassword("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push("/register");
  };

  // If still loading, show loading spinner
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        resolvedTheme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--accent-700)] mx-auto mb-4" />
          <p className={`transition-colors duration-300 ${
            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}>
            Loading Nookly...
          </p>
        </div>
      </div>
    );
  }

  // If user is logged in and we're showing the verification prompt (online only)
  if (showPasswordPrompt) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        resolvedTheme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <div className={`w-[380px] max-w-full transition-colors duration-300 ${
          resolvedTheme === "dark" 
            ? "bg-gray-800/95 backdrop-blur-md" 
            : "bg-white/95 backdrop-blur-md"
        } rounded-2xl shadow-2xl overflow-hidden`}>
          {/* Header */}
          <div className={`px-6 py-5 relative overflow-hidden ${
            resolvedTheme === "dark" 
              ? "bg-gray-700" 
              : "bg-gradient-to-r from-blue-800 to-[var(--accent-700)]"
          }`}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl ${
              resolvedTheme === "dark" ? "bg-gray-500/20" : "bg-[var(--accent-700)]/20"
            }`} />
            <div className="relative text-center">
              <div className={`inline-block p-2 rounded-full mb-2 ${
                resolvedTheme === "dark" ? "bg-gray-600/50" : "bg-white/10"
              }`}>
                <Lock className={`w-5 h-5 ${
                  resolvedTheme === "dark" ? "text-gray-400" : "text-[var(--accent-400)]"
                }`} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                Verify Your Identity
              </h2>
              <p className={`text-xs ${
                resolvedTheme === "dark" ? "text-gray-300" : "text-blue-200"
              }`}>
                Enter your credentials to continue
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-5">
            {error && (
              <div className={`mb-3 border-l-4 rounded-lg overflow-hidden transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-red-900/30 border-red-500" 
                  : "bg-red-50 border-red-500"
              }`}>
                <div className="p-2.5 flex items-center gap-2">
                  <AlertCircle className={`w-4 h-4 ${
                    resolvedTheme === "dark" ? "text-red-400" : "text-red-600"
                  }`} />
                  <span className={`text-xs ${
                    resolvedTheme === "dark" ? "text-red-300" : "text-red-700"
                  }`}>
                    {error}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Username
                </label>
                <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "bg-gray-700" : "bg-white"
                }`}>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                    }`} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className={`w-full pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--accent-700)] transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                          : "border border-gray-200 text-gray-900 bg-white"
                      }`}
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Password
                </label>
                <div className={`rounded-lg overflow-hidden transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "bg-gray-700" : "bg-white"
                }`}>
                  <div className="relative">
                    <Key className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                    }`} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className={`w-full pl-10 pr-12 py-2.5 text-sm focus:ring-2 focus:ring-[var(--accent-700)] transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "bg-gray-700 text-gray-100 placeholder-gray-400" 
                          : "border border-gray-200 text-gray-900 bg-white"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className={`w-4 h-4 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                      ) : (
                        <Eye className={`w-4 h-4 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-400"
                        }`} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md ${
                  resolvedTheme === "dark"
                    ? "bg-[var(--accent-700)]  text-white"
                    : "bg-[var(--accent-700)]  text-white"
                }`}
              >
                {isVerifying ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Key className="w-4 h-4" />
                    <span>Verify & Unlock</span>
                  </div>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full h-px transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "bg-gray-600" : "bg-gray-200"
                  }`} />
                </div>
                <div className="relative flex justify-center">
                  <span className={`px-2 text-[10px] transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "bg-gray-800/95 text-gray-400" : "bg-white/95 text-gray-400"
                  }`}>
                    Secure
                  </span>
                </div>
              </div>

              {/* Sign Out Option */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={`text-xs transition-colors duration-300 flex items-center justify-center gap-1.5 mx-auto ${
                    resolvedTheme === "dark" 
                      ? "text-gray-400 hover:text-gray-300" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  Not you? Sign out
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (should never reach here)
  return null;
}