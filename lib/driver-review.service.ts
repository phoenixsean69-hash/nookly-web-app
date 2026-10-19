"use client";

import { Functions } from "appwrite";

import { rawClient } from "@/lib/appwrite/config";
import type {
  DriverReviewApplication,
  DriverSuspensionResult,
} from "@/types/driver-review";

const functions = new Functions(rawClient);

const driverReviewFunctionId =
  process.env.NEXT_PUBLIC_APPWRITE_RIDES_DRIVER_FUNCTION_ID?.trim() ||
  "rides-driver-api";

type HttpMethod = "GET" | "POST";

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface FunctionExecutionLike {
  responseStatusCode?: number;
  responseBody?: string;
  response?: string;
  stdout?: string;
}

interface FunctionsAdapter {
  createExecution(args: {
    functionId: string;
    body: string;
    async: boolean;
    xpath: string;
    method: HttpMethod;
    headers: Record<string, string>;
  }): Promise<FunctionExecutionLike>;
}

function parseExecutionBody<T>(execution: FunctionExecutionLike): T {
  const statusCode = Number(execution.responseStatusCode ?? 200);
  const rawBody =
    execution.responseBody ??
    execution.response ??
    execution.stdout ??
    "";

  let payload: ApiEnvelope<T>;

  try {
    payload = JSON.parse(rawBody || "{}") as ApiEnvelope<T>;
  } catch {
    throw new Error(
      statusCode >= 400
        ? "Driver approval request failed."
        : "Driver approval service returned an invalid response.",
    );
  }

  if (statusCode >= 400 || payload.ok === false) {
    throw new Error(
      payload.error ||
        payload.message ||
        `Driver approval request failed with status ${statusCode}.`,
    );
  }

  if (payload.data === undefined) {
    throw new Error("Driver approval service returned no data.");
  }

  return payload.data;
}

async function executeDriverReviewRequest<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: Record<string, unknown>,
): Promise<T> {
  const execution = await (
    functions as unknown as FunctionsAdapter
  ).createExecution({
    functionId: driverReviewFunctionId,
    body: body ? JSON.stringify(body) : "",
    async: false,
    xpath: path,
    method,
    headers: {
      "content-type": "application/json",
    },
  });

  return parseExecutionBody<T>(execution);
}

export async function listDriverReviewApplications(): Promise<
  DriverReviewApplication[]
> {
  return executeDriverReviewRequest<DriverReviewApplication[]>(
    "/organization/drivers",
    "GET",
  );
}

export async function getDriverReviewApplication(
  driverId: string,
): Promise<DriverReviewApplication> {
  return executeDriverReviewRequest<DriverReviewApplication>(
    `/organization/drivers/${encodeURIComponent(driverId)}`,
    "GET",
  );
}

export async function approveDriverReviewApplication(
  driverId: string,
): Promise<DriverReviewApplication> {
  return executeDriverReviewRequest<DriverReviewApplication>(
    `/organization/drivers/${encodeURIComponent(driverId)}/approve`,
    "POST",
  );
}

export async function suspendDriverReviewApplication(
  driverId: string,
  reason: string,
): Promise<DriverSuspensionResult> {
  return executeDriverReviewRequest<DriverSuspensionResult>(
    `/organization/drivers/${encodeURIComponent(driverId)}/suspend`,
    "POST",
    { reason },
  );
}

export async function reinstateDriverReviewApplication(
  driverId: string,
): Promise<DriverReviewApplication> {
  return executeDriverReviewRequest<DriverReviewApplication>(
    `/organization/drivers/${encodeURIComponent(driverId)}/reinstate`,
    "POST",
  );
}

export function getDriverStoredFileUrl(fileId?: string): string {
  const normalizedFileId = fileId?.trim() || "";
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.replace(/\/+$/, "");
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID?.trim();
  const bucketId =
    process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID?.trim() ||
    process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID?.trim();

  if (!normalizedFileId || !endpoint || !projectId || !bucketId) {
    return "";
  }

  return `${endpoint}/storage/buckets/${encodeURIComponent(
    bucketId,
  )}/files/${encodeURIComponent(
    normalizedFileId,
  )}/view?project=${encodeURIComponent(projectId)}`;
}

export function isDriverApplicationApproved(
  application: DriverReviewApplication,
): boolean {
  const vehicle = application.primaryVehicle;

  return (
    application.profile.verificationStatus === "verified" &&
    application.profile.status === "active" &&
    ["approved", "active", "acknowledged", "verified"].includes(
      application.institution.status,
    ) &&
    vehicle !== null &&
    vehicle.status === "active" &&
    vehicle.conditionStatus === "approved" &&
    vehicle.roadworthinessStatus === "approved"
  );
}

export function isDriverApplicationSuspended(
  application: DriverReviewApplication,
): boolean {
  return application.institution.status === "suspended";
}
