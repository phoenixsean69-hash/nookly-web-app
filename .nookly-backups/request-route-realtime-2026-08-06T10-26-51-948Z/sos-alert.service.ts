"use client";

import { Channel, Query, TablesDB } from "appwrite";

import { rawClient, rawRealtime } from "@/lib/appwrite/config";
import type {
  SosRealtimeEvent,
  SosRealtimeState,
  StudentSosAlert,
} from "@/types/sos-alert";

const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";

const NOTIFICATIONS_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_TABLE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID ||
  "notifications";

const tablesDB = new TablesDB(rawClient);

interface NotificationRow extends Record<string, unknown> {
  $id?: string;
  $createdAt?: string;
  $updatedAt?: string;
  userId?: unknown;
  title?: unknown;
  message?: unknown;
  type?: unknown;
  read?: unknown;
  data?: unknown;
}

interface RealtimeEnvelope {
  events?: string[];
  payload?: unknown;
}

interface RealtimeSubscription {
  unsubscribe: () => Promise<void> | void;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return Boolean(value);
}

function parseData(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function readableIncident(value: string): string {
  if (!value) return "Emergency";

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isValidCoordinatePair(
  latitude: number | null,
  longitude: number | null,
): boolean {
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function parseStudentSosRow(
  value: unknown,
): StudentSosAlert | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as NotificationRow;

  if (text(row.type).toLowerCase() !== "student_sos") {
    return null;
  }

  const data = parseData(row.data);
  const notificationId = text(row.$id);
  const recipientUserId = text(row.userId);

  if (!notificationId || !recipientUserId) {
    return null;
  }

  const incidentType = text(data.incidentType).toLowerCase();
  const title = text(row.title) || "Emergency SOS";
  const titleIncident = title
    .replace(/^emergency\s+sos\s*:\s*/i, "")
    .trim();

  const incidentLabel =
    text(data.incidentLabel) ||
    titleIncident ||
    readableIncident(incidentType);

  const latitude = numberOrNull(data.latitude);
  const longitude = numberOrNull(data.longitude);

  return {
    notificationId,
    alertId: text(data.alertId) || notificationId,
    clientRequestId: text(data.clientRequestId),
    recipientUserId,

    title,
    message:
      text(row.message) ||
      `${text(data.studentName) || "A student"} reported an emergency.`,

    incidentType,
    incidentLabel,

    studentId: text(data.studentId),
    studentName: text(data.studentName) || "Student",
    studentPhone: text(data.studentPhone),
    studentEmail: text(data.studentEmail),

    organizationId: text(data.organizationId),
    organizationName: text(data.organizationName),

    latitude: isValidCoordinatePair(latitude, longitude) ? latitude : null,
    longitude: isValidCoordinatePair(latitude, longitude) ? longitude : null,
    accuracy: numberOrNull(data.accuracy),
    address: text(data.address) || "GPS location received",

    capturedAt: text(data.capturedAt),
    reportedAt: text(data.reportedAt) || text(row.$createdAt),
    createdAt: text(row.$createdAt),
    updatedAt: text(row.$updatedAt),
    mapUrl: text(data.mapUrl),

    read: booleanValue(row.read),
  };
}

function sortAlerts(alerts: StudentSosAlert[]): StudentSosAlert[] {
  return [...alerts].sort((first, second) => {
    const firstTime = new Date(
      first.reportedAt || first.createdAt || 0,
    ).getTime();
    const secondTime = new Date(
      second.reportedAt || second.createdAt || 0,
    ).getTime();

    return secondTime - firstTime;
  });
}

function requireConfiguration(): void {
  if (!DATABASE_ID) {
    throw new Error(
      "NEXT_PUBLIC_APPWRITE_DATABASE_ID is not configured.",
    );
  }

  if (!NOTIFICATIONS_TABLE_ID) {
    throw new Error(
      "The Appwrite notifications table ID is not configured.",
    );
  }
}

export function getSosNotificationsTableId(): string {
  return NOTIFICATIONS_TABLE_ID;
}

export async function listStudentSosAlerts(
  recipientUserId: string,
  maximum = 500,
): Promise<StudentSosAlert[]> {
  requireConfiguration();

  const normalizedUserId = recipientUserId.trim();

  if (!normalizedUserId) return [];

  const rows: NotificationRow[] = [];
  const pageSize = 100;

  for (let offset = 0; offset < maximum; offset += pageSize) {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: NOTIFICATIONS_TABLE_ID,
      queries: [
        Query.orderDesc("$createdAt"),
        Query.limit(pageSize),
        Query.offset(offset),
      ],
    });

    const pageRows = Array.isArray(response.rows)
      ? (response.rows as unknown as NotificationRow[])
      : [];

    rows.push(...pageRows);

    if (
      pageRows.length < pageSize ||
      rows.length >= Number(response.total ?? rows.length)
    ) {
      break;
    }
  }

  return sortAlerts(
    rows
      .map(parseStudentSosRow)
      .filter(
        (alert): alert is StudentSosAlert =>
          Boolean(alert) &&
          alert.recipientUserId === normalizedUserId,
      ),
  );
}

export async function markStudentSosRead(
  notificationId: string,
): Promise<StudentSosAlert | null> {
  requireConfiguration();

  const updated = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: NOTIFICATIONS_TABLE_ID,
    rowId: notificationId,
    data: {
      read: true,
    },
  });

  return parseStudentSosRow(updated);
}

export function subscribeToStudentSosAlerts({
  recipientUserId,
  onEvent,
  onState,
}: {
  recipientUserId: string;
  onEvent: (event: SosRealtimeEvent) => void;
  onState: (
    state: SosRealtimeState,
    error?: Error,
  ) => void;
}): () => void {
  requireConfiguration();

  let active = true;
  let subscription: RealtimeSubscription | null = null;

  const channel = Channel.tablesdb(DATABASE_ID)
    .table(NOTIFICATIONS_TABLE_ID)
    .row();

  const subscribe = rawRealtime.subscribe.bind(
    rawRealtime,
  ) as unknown as (
    channels: string | string[],
    callback: (event: RealtimeEnvelope) => void,
  ) => Promise<RealtimeSubscription>;

  onState("connecting");

  void subscribe(channel, (event) => {
    const events = Array.isArray(event.events)
      ? event.events
      : [];
    const payload = event.payload;

    const action: SosRealtimeEvent["action"] =
      events.some((name) => name.endsWith(".delete"))
        ? "delete"
        : events.some((name) => name.endsWith(".create"))
          ? "create"
          : "update";

    const payloadRecord =
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload)
        ? (payload as NotificationRow)
        : null;

    const notificationId = text(payloadRecord?.$id);
    const alert = parseStudentSosRow(payloadRecord);

    if (action === "delete") {
      if (notificationId) {
        onEvent({
          action,
          notificationId,
          alert: null,
        });
      }
      return;
    }

    if (
      !alert ||
      alert.recipientUserId !== recipientUserId
    ) {
      return;
    }

    onEvent({
      action,
      notificationId: alert.notificationId,
      alert,
    });
  })
    .then((nextSubscription) => {
      if (!active) {
        void nextSubscription.unsubscribe();
        return;
      }

      subscription = nextSubscription;
      onState("connected");
    })
    .catch((caught) => {
      const error =
        caught instanceof Error
          ? caught
          : new Error(
              "Unable to start the SOS realtime subscription.",
            );

      onState("error", error);
    });

  return () => {
    active = false;

    if (subscription) {
      void subscription.unsubscribe();
    }
  };
}
