"use client";

export type WebPushRegistrationState =
  | "unsupported"
  | "checking"
  | "unregistered"
  | "registering"
  | "registered"
  | "blocked"
  | "error";

export interface WebPushPublicKeyResult {
  ready: boolean;
  publicKey: string;
}

export interface WebPushRegistrationResult {
  created: boolean;
  subscriptionRowId: string;
  userId: string;
  isActive: boolean;
  subscriptionsDeactivated: number;
}

export interface WebPushDeliveryResult {
  requested: number;
  accepted: number;
  failed: number;
  failures: Array<{
    subscriptionRowId?: string;
    statusCode?: number;
    message?: string;
  }>;
  message?: string;
}
