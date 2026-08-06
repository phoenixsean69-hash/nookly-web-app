"use client";

export type SosRealtimeState =
  | "disabled"
  | "offline"
  | "connecting"
  | "connected"
  | "error";

export type SosNotificationPermission =
  | NotificationPermission
  | "unsupported";

export interface StudentSosAlert {
  notificationId: string;
  alertId: string;
  clientRequestId: string;
  recipientUserId: string;

  title: string;
  message: string;

  incidentType: string;
  incidentLabel: string;

  studentId: string;
  studentName: string;
  studentPhone: string;
  studentEmail: string;

  organizationId: string;
  organizationName: string;

  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string;

  capturedAt: string;
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
  mapUrl: string;

  read: boolean;
}

export interface SosRealtimeEvent {
  action: "create" | "update" | "delete";
  notificationId: string;
  alert: StudentSosAlert | null;
}
