/** Integration adapter layer — shared types.
 *
 *  Server-only. These types describe third-party providers the platform can
 *  connect to. Adapters are intentionally stubbed until real credentials are
 *  wired (see src/lib/integrations/google/index.ts for the env vars needed).
 *  Nothing here reads a secret value; status is reported as booleans only. */

export type ProviderId =
  | "google-calendar"
  | "gmail"
  | "google-contacts"
  | "google-drive"
  | "google-docs"
  | "google-maps"
  | "google-reviews"
  | "google-business-profile"
  | "square"
  | "resend"
  | "anthropic";

export type IntegrationCategory = "google" | "payments" | "email" | "ai";

export type IntegrationStatus = {
  id: ProviderId;
  label: string;
  connected: boolean;
  category: IntegrationCategory;
  note?: string;
};

/** Thrown by every stub method until an integration is credentialed.
 *  The message names the provider and the exact env var(s) still required so a
 *  future engineer (or a surfaced API error) points straight at the fix. */
export class NotConnectedError extends Error {
  readonly provider: string;
  readonly requiredEnv: string[];

  constructor(providerLabel: string, requiredEnv: string[]) {
    super(
      `${providerLabel} is not connected. Set ${requiredEnv.join(
        ", ",
      )} (server-only) to enable this integration.`,
    );
    this.name = "NotConnectedError";
    this.provider = providerLabel;
    this.requiredEnv = requiredEnv;
  }
}

/** Generic adapter envelope: a set of capability methods plus a label and the
 *  env vars it depends on. `Caps` is the capability interface for the provider. */
export interface Integration<Caps> {
  readonly id: ProviderId;
  readonly label: string;
  readonly requiredEnv: string[];
  readonly connected: boolean;
  readonly capabilities: Caps;
}
