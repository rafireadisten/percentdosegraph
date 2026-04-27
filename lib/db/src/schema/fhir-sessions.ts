import { bigint, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const fhirPendingStatesTable = pgTable("fhir_pending_states", {
  state: text("state").primaryKey(),
  ehrId: text("ehr_id").notNull(),
  fhirBaseUrl: text("fhir_base_url").notNull(),
  tokenUrl: text("token_url").notNull(),
  clientId: text("client_id").notNull(),
  scopes: text("scopes").notNull(),
  codeVerifier: text("code_verifier").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const fhirSessionsTable = pgTable("fhir_sessions", {
  sessionId: text("session_id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  patientId: text("patient_id"),
  patientName: text("patient_name"),
  ehrId: text("ehr_id").notNull(),
  fhirBaseUrl: text("fhir_base_url").notNull(),
  tokenUrl: text("token_url").notNull(),
  clientId: text("client_id").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type FhirPendingState = typeof fhirPendingStatesTable.$inferSelect;
export type FhirSession = typeof fhirSessionsTable.$inferSelect;
