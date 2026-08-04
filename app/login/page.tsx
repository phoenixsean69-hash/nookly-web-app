"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import Link from "next/link";
import Image from "next/image";
import { User, Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { resolvedTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Use email for login (Appwrite uses email)
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 transition-colors duration-300">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/dayHouse.jpg"
          alt="Beautiful property"
          fill
          className="object-cover"
          priority
        />
        <div className={`absolute inset-0 transition-colors duration-300 ${
          resolvedTheme === "dark" 
            ? "bg-gradient-to-br from-gray-900/90 via-gray-800/85 to-gray-700/60" 
            : "bg-gradient-to-br from-blue-900/80 via-blue-800/70 to-[var(--accent-700)]/30"
        }`} />
      </div>

      {/* Animated accent circles */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse transition-colors duration-300 ${
          resolvedTheme === "dark" ? "bg-gray-600/20" : "bg-[var(--accent-700)]/20"
        }`} />
        <div className={`absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 transition-colors duration-300 ${
          resolvedTheme === "dark" ? "bg-gray-500/20" : "bg-blue-600/20"
        }`} />
      </div>

      {/* Main Card - Small and Centered */}
      <div className="relative z-10 w-[450px] max-w-full">
        <div className={`backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300 ${
          resolvedTheme === "dark" ? "bg-gray-800/95" : "bg-white/95"
        }`}>
          {/* Header */}
          <div className={`bg-gradient-to-r px-8 py-6 relative overflow-hidden transition-colors duration-300 ${
            resolvedTheme === "dark" 
              ? "from-gray-700 via-gray-700 to-gray-600" 
              : "from-[#1e3a5f] via-[#1e3a5f] to-[var(--accent-700)]"
          }`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl transition-colors duration-300 ${
              resolvedTheme === "dark" ? "bg-gray-500/20" : "bg-[var(--accent-700)]/20"
            }`} />
            <div className="relative text-center">
              <div className={`inline-block p-2.5 rounded-full mb-3 transition-colors duration-300 ${
                resolvedTheme === "dark" ? "bg-gray-600/50" : "bg-white/10"
              }`}>
                <svg
                  className={`w-6 h-6 transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-[var(--accent-400)]"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
              <p className={`text-sm mt-1 transition-colors duration-300 ${
                resolvedTheme === "dark" ? "text-gray-300" : "text-blue-200"
              }`}>
                Sign in to your account
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
              {/* Username Field */}
              <div className="mb-4">
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Username
                </label>
                <div className="relative">
                  <User size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-700)] focus:border-[var(--accent-700)] transition-colors duration-300 ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-700 border-gray-700 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-300 text-gray-900 bg-white"
                    }`}
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="mb-4">
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-700)] focus:border-[var(--accent-700)] transition-colors duration-300 ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-700 border-gray-700 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-300 text-gray-900 bg-white"
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="mb-4">
                <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-700)] focus:border-[var(--accent-700)] transition-colors duration-300 ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-700 border-gray-700 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-300 text-gray-900 bg-white"
                    }`}
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right mb-4">
                <Link
                  href="/forgot-password"
                  className={`text-xs transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                      : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                  } hover:underline`}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[var(--accent-700)] text-white rounded-lg font-semibold hover:bg-[var(--accent-600)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              {/* Sign Up Link */}
              <p className={`text-center text-sm mt-4 transition-colors duration-300 ${
                resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}>
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-[var(--accent-700)] dark:text-[var(--accent-400)] font-semibold hover:underline"
                >
                  Create Account
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* Features Banner */}
        <div className="mt-4 text-center">
          <p className="text-white/80 text-xs flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-[var(--accent-400)] rounded-full" />
            Manage properties, connect with tenants, grow your portfolio
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