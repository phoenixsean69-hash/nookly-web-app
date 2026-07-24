// components/NotificationTest.tsx
"use client";

import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/contexts/theme-context';

export function NotificationTest() {
  const { isEnabled, sendNotification } = useNotifications();
  const { theme } = useTheme();

  if (!isEnabled) return null;

  const testNotifications = [
    {
      title: '🏠 New Property Request',
      body: 'John Doe is requesting information about Beach House',
      type: 'property',
    },
    {
      title: '✅ Query Resolved',
      body: 'The query for Beach House has been resolved',
      type: 'status',
    },
    {
      title: '💬 New Response',
      body: 'A response was added to your query',
      type: 'response',
    },
  ];

  return (
    <div className={`p-4 rounded-lg ${
      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
    }`}>
      <h3 className={`text-sm font-semibold mb-3 ${
        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
      }`}>
        🔔 Test Notifications
      </h3>
      <div className="flex flex-wrap gap-2">
        {testNotifications.map((test, index) => (
          <button
            key={index}
            onClick={() => sendNotification(test.title, test.body)}
            className={`px-3 py-1.5 rounded text-xs transition ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {test.type}
          </button>
        ))}
      </div>
    </div>
  );
}