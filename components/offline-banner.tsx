"use client";

import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { WifiOff, RefreshCw, X } from "lucide-react";
import { useState, useEffect } from "react";

export function OfflineBanner() {
  const { isOffline, refreshCache } = useAuth();
  const { resolvedTheme } = useTheme();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!isOffline) {
      setIsDismissed(false);
      setShowSuccess(false);
    }
  }, [isOffline]);

  const handleRefresh = async () => {
    if (!navigator.onLine) {
      alert("You're offline. Please connect to the internet to refresh the cache.");
      return;
    }

    setIsRefreshing(true);
    try {
      await refreshCache();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to refresh cache:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOffline || isDismissed) return null;

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 mt-1">
      <div className={`rounded-full shadow-lg border border-yellow-500/30 px-3 py-1 transition-colors duration-300 ${
        resolvedTheme === "dark"
          ? "bg-gray-800 text-white"
          : "bg-gradient-to-r from-gray-800 to-gray-900 text-white"
      }`}>
        <div className="flex items-center gap-1.5">
          {/* Icon */}
          <div className="relative flex-shrink-0">
            <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
          </div>

          {/* Message */}
          <p className="text-[10px] font-medium text-gray-200">
            Offline
          </p>

          {/* Divider */}
          <span className="w-px h-3 bg-white/20"></span>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded-full text-[10px] transition disabled:opacity-50"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '' : 'Sync'}
          </button>

          {/* Success indicator */}
          {showSuccess && (
            <span className="text-[10px] text-green-300">✓</span>
          )}

          {/* Dismiss Button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="p-0 hover:bg-white/10 rounded-full transition"
          >
            <X className="w-3 h-3 text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}