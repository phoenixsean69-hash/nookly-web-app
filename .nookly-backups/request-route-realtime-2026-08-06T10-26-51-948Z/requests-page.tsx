"use client";

import {
  Loader2,
} from "lucide-react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  useEffect,
} from "react";

export default function RequestsRedirectPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const requestId =
    searchParams
      .get("request")
      ?.trim() ||
    searchParams
      .get("requestId")
      ?.trim() ||
    "";

  useEffect(() => {
    if (requestId) {
      router.replace(
        `/dashboard/requests/${encodeURIComponent(
          requestId,
        )}`,
      );

      return;
    }

    router.replace(
      "/dashboard/tenants",
    );
  }, [
    requestId,
    router,
  ]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030712] px-4 text-white">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-2xl">
        <Loader2 className="h-5 w-5 animate-spin text-orange-400" />

        <p className="text-sm font-semibold text-gray-200">
          Opening rental request details…
        </p>
      </div>
    </main>
  );
}
