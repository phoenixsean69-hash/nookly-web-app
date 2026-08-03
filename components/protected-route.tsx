"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, organization, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !organization)) {
      router.replace("/login");
    }
  }, [loading, organization, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent-700)] dark:border-gray-700" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            Loading your organization…
          </p>
        </div>
      </div>
    );
  }

  if (!user || !organization) {
    return null;
  }

  return <>{children}</>;
}
