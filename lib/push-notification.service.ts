"use client";

import { Functions } from "appwrite";

import { rawClient } from "@/lib/appwrite/config";

const functions = new Functions(rawClient);

const pushFunctionId =
  process.env.NEXT_PUBLIC_APPWRITE_PUSH_FUNCTION_ID?.trim() ||
  "6a31d988001bf962fb57";

type HttpMethod = "POST";

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

export interface PushTicket {
  id?: string;
  status?: "ok" | "error";
  message?: string;
  details?: {
    error?: string;
  };
  tokenRowId?: string;
  token?: string;
}

export interface PushDeliveryResult {
  requested: number;
  accepted: number;
  failed: number;
  tickets: PushTicket[];
  failures: Array<{
    tokenRowId?: string;
    token?: string;
    message?: string;
    details?: {
      error?: string;
    };
  }>;
  message?: string;
}

interface SendDriverApprovedPushInput {
  recipientUserId: string;
  driverId: string;
  organizationId: string;
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
        ? "Push notification request failed."
        : "Push notification service returned an invalid response.",
    );
  }

  if (statusCode >= 400 || payload.ok === false) {
    throw new Error(
      payload.error ||
        payload.message ||
        `Push notification request failed with status ${statusCode}.`,
    );
  }

  if (payload.data === undefined) {
    throw new Error("Push notification service returned no data.");
  }

  return payload.data;
}

async function executePushRequest<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const execution = await (
    functions as unknown as FunctionsAdapter
  ).createExecution({
    functionId: pushFunctionId,
    body: JSON.stringify(body),
    async: false,
    xpath: path,
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
  });

  return parseExecutionBody<T>(execution);
}

export async function sendDriverApprovedPushNotification(
  input: SendDriverApprovedPushInput,
): Promise<PushDeliveryResult> {
  const recipientUserId = input.recipientUserId.trim();
  const driverId = input.driverId.trim();
  const organizationId = input.organizationId.trim();

  if (!recipientUserId) {
    throw new Error("The approved driver does not have a valid user ID.");
  }

  return executePushRequest<PushDeliveryResult>("/send-to-user", {
    recipientUserId,
    title: "Driver profile approved ✅",
    body: "Your Nookly driver profile has been approved. You can now go online and accept rides.",
    data: {
      type: "driver_approved",
      source: "nookly_web_organization",
      driverId,
      organizationId,
    },
  });
}


interface SendDriverSuspendedPushInput {
  recipientUserId: string;
  driverId: string;
  organizationId: string;
  organizationName: string;
  reason: string;
  activeRideContinues: boolean;
}

interface SendDriverReinstatedPushInput {
  recipientUserId: string;
  driverId: string;
  organizationId: string;
  organizationName: string;
}

export async function sendDriverSuspendedPushNotification(
  input: SendDriverSuspendedPushInput,
): Promise<PushDeliveryResult> {
  const recipientUserId = input.recipientUserId.trim();
  const organizationName = input.organizationName.trim() || "your organization";
  const reason = input.reason.trim();

  if (!recipientUserId) {
    throw new Error("The suspended driver does not have a valid user ID.");
  }

  const rideMessage = input.activeRideContinues
    ? " You may finish the ride already in progress, but you cannot accept new work from this organization."
    : " You cannot accept new work from this organization.";

  return executePushRequest<PushDeliveryResult>("/send-to-user", {
    recipientUserId,
    title: "Driver access suspended",
    body: `Your driver access with ${organizationName} has been suspended. Reason: ${reason}.${rideMessage}`,
    data: {
      type: "driver_suspended",
      source: "nookly_web_organization",
      driverId: input.driverId.trim(),
      organizationId: input.organizationId.trim(),
      reason,
      activeRideContinues: input.activeRideContinues,
    },
  });
}

export async function sendDriverReinstatedPushNotification(
  input: SendDriverReinstatedPushInput,
): Promise<PushDeliveryResult> {
  const recipientUserId = input.recipientUserId.trim();
  const organizationName = input.organizationName.trim() || "your organization";

  if (!recipientUserId) {
    throw new Error("The reinstated driver does not have a valid user ID.");
  }

  return executePushRequest<PushDeliveryResult>("/send-to-user", {
    recipientUserId,
    title: "Driver access reinstated ✅",
    body: `Your driver access with ${organizationName} has been reinstated. You may go online and accept ride work again.`,
    data: {
      type: "driver_reinstated",
      source: "nookly_web_organization",
      driverId: input.driverId.trim(),
      organizationId: input.organizationId.trim(),
    },
  });
}
