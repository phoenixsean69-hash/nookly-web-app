"use client";

export type MessageRealtimeState =
  | "disabled"
  | "connecting"
  | "connected"
  | "offline"
  | "error";

export type MessageRealtimeAction =
  | "create"
  | "update"
  | "delete";

export interface OrganizationMessageRealtimeEvent {
  action: MessageRealtimeAction;
  queryId: string;
  referenceProperty: string;
  writer: string;
  body: string;
  payload: Record<string, unknown> | null;
}
