// components/NotificationBanner.tsx
"use client";

import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/contexts/theme-context';
import { Bell, BellOff, Check, X, Settings } from 'lucide-react';
import { useState } from 'react';

export function NotificationBanner() {
  const { 
    isSupported, 
    isEnabled, 
    permission, 
    isLoading, 
    requestPermission,
    openSettings,
    sendNotification,
  } = useNotifications();
  const { theme } = useTheme();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if not supported or dismissed
  if (!isSupported || isDismissed) return null;

  // Show if notifications are enabled
  if (isEnabled) {
    return (
      <div className={`flex items-center justify-between gap-3 text-sm px-4 py-3 rounded-lg ${
        theme === 'dark' 
          ? 'bg-green-900/30 text-green-300 border border-green-800' 
          : 'bg-green-50 text-green-700 border border-green-200'
      }`}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <span>🔔 Notifications are enabled</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sendNotification(
                '🔔 Test Notification',
                'Your notifications are working!',
                {
                  icon: '/logo-192.png',
                  requireInteraction: false,
                }
              );
            }}
            className={`px-3 py-1 rounded text-xs transition ${
              theme === 'dark'
                ? 'bg-green-800 hover:bg-green-700 text-green-200'
                : 'bg-green-200 hover:bg-green-300 text-green-800'
            }`}
          >
            Test
          </button>
          <button
            onClick={openSettings}
            className={`p-1 rounded transition ${
              theme === 'dark'
                ? 'hover:bg-green-800'
                : 'hover:bg-green-200'
            }`}
            title="Open notification settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className={`p-1 rounded transition ${
              theme === 'dark'
                ? 'hover:bg-green-800'
                : 'hover:bg-green-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Show if permission is denied
  if (permission === 'denied') {
    return (
      <div className={`flex items-center justify-between gap-3 text-sm px-4 py-3 rounded-lg ${
        theme === 'dark' 
          ? 'bg-red-900/30 text-red-300 border border-red-800' 
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}>
        <div className="flex items-center gap-2">
          <BellOff className="w-4 h-4" />
          <span>Notifications are blocked in your browser</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openSettings}
            className={`px-3 py-1 rounded text-xs transition ${
              theme === 'dark'
                ? 'bg-red-800 hover:bg-red-700 text-red-200'
                : 'bg-red-200 hover:bg-red-300 text-red-800'
            }`}
          >
            Enable in Settings
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className={`p-1 rounded transition ${
              theme === 'dark'
                ? 'hover:bg-red-800'
                : 'hover:bg-red-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Show permission request (default state)
  return (
    <div className={`flex items-center justify-between gap-3 text-sm px-4 py-3 rounded-lg ${
      theme === 'dark' 
        ? 'bg-blue-900/30 text-blue-300 border border-blue-800' 
        : 'bg-blue-50 text-blue-700 border border-blue-200'
    }`}>
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4" />
        <span>Get notified when new property requests arrive</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={requestPermission}
          disabled={isLoading}
          className={`px-4 py-1.5 rounded transition flex items-center gap-2 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            theme === 'dark'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isLoading ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Loading...
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              Enable Notifications
            </>
          )}
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className={`p-1 rounded transition ${
            theme === 'dark'
              ? 'hover:bg-blue-800'
              : 'hover:bg-blue-200'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}