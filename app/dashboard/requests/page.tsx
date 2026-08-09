import {
  redirect,
} from "next/navigation";

interface RequestsRedirectPageProps {
  searchParams: Promise<{
    request?: string | string[];
    requestId?: string | string[];
  }>;
}

function firstValue(
  value:
    | string
    | string[]
    | undefined,
): string {
  if (Array.isArray(value)) {
    return String(
      value[0] ?? "",
    ).trim();
  }

  return String(
    value ?? "",
  ).trim();
}

export default async function RequestsRedirectPage({
  searchParams,
}: RequestsRedirectPageProps) {
  const params =
    await searchParams;

  const requestId =
    firstValue(
      params.request,
    ) ||
    firstValue(
      params.requestId,
    );

  if (requestId) {
    redirect(
      `/dashboard/requests/${encodeURIComponent(
        requestId,
      )}`,
    );
  }

  redirect(
    "/dashboard/tenants",
  );
}
