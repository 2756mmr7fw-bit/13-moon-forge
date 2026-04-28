export type MoonEvent =
  | "purchased"
  | "granted"
  | "refilled"
  | "refunded"
  | "expired"
  | "cancelled";

export interface MoonWebhookPayload {
  event: MoonEvent;
  userId: string;
  moon: string;
  isBundle?: boolean;
  messagesRemaining?: number;
  expiresAt?: string | null;
  reason?: string;
}

export interface EntitlementRecord {
  userId: string;
  moons: string[];
  isActive: boolean;
  messagesRemaining?: number;
  expiresAt?: string | null;
  updatedAt: string;
}

export interface LookupResponse {
  userId: string;
  isActive: boolean;
  moons: string[];
  messagesRemaining?: number;
  expiresAt?: string | null;
}

export interface NotFoundLookupResponse {
  userId: string;
  isActive: false;
  moons: [];
  found: false;
}

export interface IntegrationStatusResponse {
  ok: true;
  app: string;
  version: string;
  relevantMoons: string[];
}

export interface WebhookAckResponse {
  ok: true;
  entitled: boolean;
  userId: string;
  moons: string[];
}

export interface WebhookErrorResponse {
  ok: false;
  error: string;
}
