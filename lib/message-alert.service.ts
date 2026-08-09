"use client";

import { Channel } from "appwrite";

import { rawRealtime } from "@/lib/appwrite/config";
import type {
  MessageRealtimeState,
  OrganizationMessageRealtimeEvent,
} from "@/types/message-alert";

const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";

const QUERIES_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_QUERIES_TABLE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID ||
  "queries";

interface RealtimeEnvelope {
  events?: string[];
  payload?: unknown;
}

interface RealtimeSubscription {
  unsubscribe: () => Promise<void> | void;
}

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function requireConfiguration(): void {
  if (!DATABASE_ID) {
    throw new Error(
      "NEXT_PUBLIC_APPWRITE_DATABASE_ID is not configured.",
    );
  }

  if (!QUERIES_TABLE_ID) {
    throw new Error(
      "The Appwrite queries/messages table ID is not configured.",
    );
  }
}

export function getOrganizationMessagesTableId(): string {
  return QUERIES_TABLE_ID;
}

export function subscribeToOrganizationMessages({
  onEvent,
  onState,
}: {
  onEvent: (
    event: OrganizationMessageRealtimeEvent,
  ) => void;
  onState: (
    state: MessageRealtimeState,
    error?: Error,
  ) => void;
}): () => void {
  requireConfiguration();

  let active = true;
  let subscription: RealtimeSubscription | null = null;

  const channel = Channel.tablesdb(DATABASE_ID)
    .table(QUERIES_TABLE_ID)
    .row();

  const subscribe = rawRealtime.subscribe.bind(
    rawRealtime,
  ) as unknown as (
    channels: unknown,
    callback: (event: RealtimeEnvelope) => void,
  ) => Promise<RealtimeSubscription>;

  onState("connecting");

  void subscribe(channel, (event) => {
    const events = Array.isArray(event.events)
      ? event.events
      : [];

    const action: OrganizationMessageRealtimeEvent["action"] =
      events.some((name) => name.endsWith(".delete"))
        ? "delete"
        : events.some((name) => name.endsWith(".create"))
          ? "create"
          : "update";

    const payload =
      event.payload &&
      typeof event.payload === "object" &&
      !Array.isArray(event.payload)
        ? (event.payload as Record<string, unknown>)
        : null;

    const queryId = text(payload?.$id);

    if (!queryId) {
      return;
    }

    onEvent({
      action,
      queryId,
      referenceProperty: text(
        payload?.referenceProperty,
      ),
      writer:
        text(payload?.writer) ||
        "A Nookly tenant",
      body: text(payload?.body),
      payload,
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
              "Unable to start organization-message Realtime.",
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
