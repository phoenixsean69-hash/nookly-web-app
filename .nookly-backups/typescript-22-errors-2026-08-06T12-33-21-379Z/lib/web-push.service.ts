"use client";

import {
  ExecutionMethod,
  Functions,
} from "appwrite";

import { rawClient } from "@/lib/appwrite/config";
import type {
  WebPushDeliveryResult,
  WebPushPublicKeyResult,
  WebPushRegistrationResult,
} from "@/types/web-push";

const functions =
  new Functions(rawClient);

const PUSH_FUNCTION_ID =
  process.env
    .NEXT_PUBLIC_APPWRITE_PUSH_FUNCTION_ID
    ?.trim() ||
  "6a31d988001bf962fb57";

interface FunctionEnvelope<T> {
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
    method:
      | ExecutionMethod.GET
      | ExecutionMethod.POST;
    headers: Record<string, string>;
  }): Promise<FunctionExecutionLike>;
}

function parseExecutionBody<T>(
  execution: FunctionExecutionLike,
): T {
  const statusCode = Number(
    execution.responseStatusCode ?? 200,
  );

  const rawBody =
    execution.responseBody ??
    execution.response ??
    execution.stdout ??
    "";

  let payload: FunctionEnvelope<T>;

  try {
    payload = JSON.parse(
      rawBody || "{}",
    ) as FunctionEnvelope<T>;
  } catch {
    throw new Error(
      statusCode >= 400
        ? "The Nookly Push API request failed."
        : "The Nookly Push API returned invalid JSON.",
    );
  }

  if (
    statusCode < 200 ||
    statusCode >= 300 ||
    payload.ok === false
  ) {
    throw new Error(
      payload.error ||
        payload.message ||
        `The Nookly Push API returned HTTP ${statusCode}.`,
    );
  }

  if (payload.data === undefined) {
    throw new Error(
      "The Nookly Push API returned no data.",
    );
  }

  return payload.data;
}

async function executeWebPushRoute<T>(
  path: string,
  method:
    | ExecutionMethod.GET
    | ExecutionMethod.POST,
  body: Record<string, unknown> = {},
): Promise<T> {
  const execution = await (
    functions as unknown as FunctionsAdapter
  ).createExecution({
    functionId: PUSH_FUNCTION_ID,
    body: JSON.stringify(body),
    async: false,
    xpath: path,
    method,
    headers: {
      "content-type": "application/json",
    },
  });

  return parseExecutionBody<T>(
    execution,
  );
}

function requireBrowserSupport(): void {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    throw new Error(
      "This browser does not support Web Push notifications.",
    );
  }

  if (
    !window.isSecureContext &&
    window.location.hostname !==
      "localhost"
  ) {
    throw new Error(
      "Web Push requires HTTPS or localhost.",
    );
  }
}

function decodeBase64Url(
  value: string,
): Uint8Array {
  const padding =
    "=".repeat(
      (4 - (value.length % 4)) % 4,
    );

  const base64 = (
    value + padding
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const raw = window.atob(base64);

  return Uint8Array.from(
    raw,
    (character) =>
      character.charCodeAt(0),
  );
}

function arrayBuffersEqual(
  left: ArrayBuffer | null,
  right: Uint8Array,
): boolean {
  if (!left) return false;

  const leftBytes =
    new Uint8Array(left);

  if (
    leftBytes.length !==
    right.length
  ) {
    return false;
  }

  return leftBytes.every(
    (value, index) =>
      value === right[index],
  );
}

function subscriptionStorageKey(
  userId: string,
): string {
  return `nookly:web-push-registered:${userId}`;
}

function setLocallyRegistered(
  userId: string,
  registered: boolean,
): void {
  try {
    if (registered) {
      localStorage.setItem(
        subscriptionStorageKey(userId),
        "true",
      );
    } else {
      localStorage.removeItem(
        subscriptionStorageKey(userId),
      );
    }
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function hasRegisteredWebPush(
  userId?: string | null,
): boolean {
  const normalizedUserId =
    userId?.trim();

  if (!normalizedUserId) {
    return false;
  }

  try {
    return (
      localStorage.getItem(
        subscriptionStorageKey(
          normalizedUserId,
        ),
      ) === "true"
    );
  } catch {
    return false;
  }
}

async function getReadyServiceWorker(): Promise<ServiceWorkerRegistration> {
  requireBrowserSupport();

  await navigator.serviceWorker.register(
    "/sw.js",
  );

  return navigator.serviceWorker.ready;
}

async function getPublicKey(): Promise<string> {
  const result =
    await executeWebPushRoute<WebPushPublicKeyResult>(
      "/web-push/public-key",
      ExecutionMethod.GET,
    );

  if (
    !result.ready ||
    !result.publicKey
  ) {
    throw new Error(
      "The Nookly Push API has not been configured with VAPID keys.",
    );
  }

  return result.publicKey;
}

function serializeSubscription(
  subscription: PushSubscription,
): Record<string, unknown> {
  const json =
    subscription.toJSON();

  const p256dh =
    json.keys?.p256dh || "";

  const auth =
    json.keys?.auth || "";

  if (
    !json.endpoint ||
    !p256dh ||
    !auth
  ) {
    throw new Error(
      "The browser returned an incomplete PushSubscription.",
    );
  }

  return {
    endpoint: json.endpoint,
    expirationTime:
      json.expirationTime ?? null,
    keys: {
      p256dh,
      auth,
    },
    userAgent:
      navigator.userAgent.slice(
        0,
        1000,
      ),
  };
}

async function registerSubscriptionWithServer(
  userId: string,
  subscription: PushSubscription,
): Promise<WebPushRegistrationResult> {
  const result =
    await executeWebPushRoute<WebPushRegistrationResult>(
      "/web-push/register",
      ExecutionMethod.POST,
      {
        subscription:
          serializeSubscription(
            subscription,
          ),
      },
    );

  setLocallyRegistered(
    userId,
    true,
  );

  return result;
}

export function webPushIsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    (
      window.isSecureContext ||
      window.location.hostname ===
        "localhost"
    )
  );
}

export async function getCurrentBrowserPushSubscription(): Promise<PushSubscription | null> {
  if (!webPushIsSupported()) {
    return null;
  }

  const registration =
    await getReadyServiceWorker();

  return registration.pushManager.getSubscription();
}

export async function synchronizeExistingWebPushSubscription(
  userId: string,
): Promise<boolean> {
  const normalizedUserId =
    userId.trim();

  if (
    !normalizedUserId ||
    !webPushIsSupported() ||
    Notification.permission !==
      "granted"
  ) {
    setLocallyRegistered(
      normalizedUserId,
      false,
    );
    return false;
  }

  const registration =
    await getReadyServiceWorker();

  const subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    setLocallyRegistered(
      normalizedUserId,
      false,
    );
    return false;
  }

  await registerSubscriptionWithServer(
    normalizedUserId,
    subscription,
  );

  return true;
}

export async function enableWebPushForCurrentBrowser(
  userId: string,
): Promise<WebPushRegistrationResult> {
  requireBrowserSupport();

  const normalizedUserId =
    userId.trim();

  if (!normalizedUserId) {
    throw new Error(
      "An authenticated organization account is required.",
    );
  }

  const permission =
    Notification.permission ===
    "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Browser notifications are blocked for Nookly."
        : "Browser notification permission was not granted.",
    );
  }

  const [
    registration,
    publicKey,
  ] = await Promise.all([
    getReadyServiceWorker(),
    getPublicKey(),
  ]);

  const applicationServerKey =
    decodeBase64Url(publicKey);

  let subscription =
    await registration.pushManager.getSubscription();

  if (
    subscription &&
    !arrayBuffersEqual(
      subscription.options
        .applicationServerKey,
      applicationServerKey,
    )
  ) {
    await subscription.unsubscribe();
    subscription = null;
  }

  if (!subscription) {
    subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
  }

  return registerSubscriptionWithServer(
    normalizedUserId,
    subscription,
  );
}

export async function deactivateCurrentWebPushSubscription({
  userId,
  unsubscribe = true,
}: {
  userId?: string | null;
  unsubscribe?: boolean;
} = {}): Promise<number> {
  if (!webPushIsSupported()) {
    return 0;
  }

  const normalizedUserId =
    userId?.trim() || "";

  const registration =
    await getReadyServiceWorker();

  const subscription =
    await registration.pushManager.getSubscription();

  let deactivated = 0;

  if (subscription) {
    try {
      const result =
        await executeWebPushRoute<{
          deactivated: number;
        }>(
          "/web-push/deactivate",
          ExecutionMethod.POST,
          {
            endpoint:
              subscription.endpoint,
          },
        );

      deactivated =
        result.deactivated;
    } finally {
      if (unsubscribe) {
        await subscription.unsubscribe();
      }
    }
  }

  if (normalizedUserId) {
    setLocallyRegistered(
      normalizedUserId,
      false,
    );
  }

  return deactivated;
}

export async function sendCurrentUserWebPushTest(): Promise<WebPushDeliveryResult> {
  return executeWebPushRoute<WebPushDeliveryResult>(
    "/web-push/test",
    ExecutionMethod.POST,
  );
}
