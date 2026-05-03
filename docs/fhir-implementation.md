# FHIR / SMART on FHIR Implementation

## Overview

DoseGraph integrates with Epic and Cerner EHR platforms using the **SMART on FHIR** (HL7 FHIR R4) standard. This allows clinicians to securely import a patient's active medication list directly from a hospital or clinic's EHR system without manual re-entry.

The integration is server-side: all OAuth token exchanges happen on the API server so that access tokens are never exposed to the browser.

---

## Architecture

```
Browser (DoseGraph frontend)
    │
    │  1. User selects EHR system and clicks "Connect"
    │  2. GET /api/fhir/auth/start?ehrId=epic-sandbox&redirectUri=...
    │
    ▼
API Server (artifacts/api-server)
    │
    │  3. Generates PKCE code_verifier / code_challenge, state
    │  4. Stores pending state in DB (fhir_pending_states)
    │  5. Returns authorize URL to browser
    │
    ▼
Browser
    │
    │  6. Redirects user to EHR authorization server
    │
    ▼
EHR Authorization Server (Epic / Cerner)
    │
    │  7. User authenticates and grants scope
    │  8. Redirects back to our redirectUri with ?code=...&state=...
    │
    ▼
Browser (redirectUri callback page)
    │
    │  9. POST /api/fhir/auth/callback  { code, state }
    │
    ▼
API Server
    │
    │ 10. Validates state, exchanges code for access token (PKCE)
    │ 11. Stores FHIR session in DB (fhir_sessions)
    │ 12. Returns sessionId to browser
    │
    ▼
Browser
    │
    │ 13. GET /api/fhir/medications?sessionId=...
    │
    ▼
API Server
    │
    │ 14. Looks up session, calls EHR FHIR R4 endpoint
    │     GET {fhirBaseUrl}/MedicationRequest?patient={patientId}
    │     GET {fhirBaseUrl}/MedicationStatement?patient={patientId}
    │ 15. Returns normalized medication list
    │
    ▼
Browser — displays imported medications for review
```

---

## Key Files

| File | Purpose |
|------|---------|
| `artifacts/api-server/src/routes/fhir-smart.ts` | SMART OAuth routes: `/fhir/auth/start`, `/fhir/auth/callback`, `/fhir/config`, plus the EHR registry |
| `artifacts/api-server/src/routes/fhir.ts` | FHIR R4 data-fetch routes: `/fhir/medications`, `/fhir/patient` |
| `lib/db/src/schema/fhir-sessions.ts` | Database schema for `fhir_pending_states` and `fhir_sessions` tables |

---

## EHR Registry

The server maintains a static registry of known EHR systems in `fhir-smart.ts`. Each entry contains:

- **id** — unique slug used in API calls (e.g. `epic-sandbox`, `cerner-production`)
- **name** — human-readable label shown in the UI
- **fhirBaseUrl** — FHIR R4 base URL for the system
- **authorizeUrl** — OAuth 2.0 authorize endpoint
- **tokenUrl** — OAuth 2.0 token endpoint
- **clientId** — the app's registered client ID for that system
- **scopes** — SMART scopes requested (see below)

### Sandbox entries (always enabled)

| ID | System | Notes |
|----|--------|-------|
| `epic-sandbox` | Epic open.epic.com sandbox | Uses public `non_prod` client ID |
| `cerner-sandbox` | Cerner code-console sandbox | Uses public sandbox tenant UUID |

### Production entries (enabled by environment secrets)

| ID | System | Required secrets |
|----|--------|-----------------|
| `epic-production` | Epic Production | `EPIC_CLIENT_ID` |
| `cerner-production` | Cerner Production | `CERNER_CLIENT_ID` + `CERNER_PROD_TENANT_ID` |

Production entries appear in the registry **only when all required secrets are set and differ from the sandbox defaults**. If a secret is missing or set to a sandbox placeholder, the entry is silently omitted and the sandbox entry remains available.

SMART on FHIR live EHR connection should currently be treated as a **beta workflow**, not the core MVP promise. Manual FHIR bundle paste/upload import remains available even when live EHR connection is disabled for a deployment environment.

---

## Environment Secrets

Set these via your server environment or secrets manager (never commit actual values):

| Secret | Description | Where to get it |
|--------|-------------|----------------|
| `EPIC_CLIENT_ID` | Client ID for the Epic App Orchard registration | [Epic App Orchard](https://appmarket.epic.com/) |
| `CERNER_CLIENT_ID` | Client ID from Cerner Code Console | [Cerner Code Console](https://code.cerner.com/) |
| `CERNER_PROD_TENANT_ID` | Organization-specific Cerner tenant UUID | Cerner Code Console → your app → Tenant ID |

When any of these secrets are absent the app falls back gracefully to sandbox mode.

Additional deployment flags:

| Secret | Description |
|--------|-------------|
| `ENABLE_FHIR_SMART` | Enables the live SMART-on-FHIR EHR connection endpoints for the environment |
| `ENABLE_CUSTOM_FHIR_EHR` | Allows user-entered custom FHIR base/auth/token URLs; keep `false` for production by default |
| `ALLOWED_APP_ORIGINS` | Comma-separated list of allowed frontend origins that may start the SMART redirect flow |
| `APP_BASE_URL` | Primary public frontend origin for the deployment |

---

## Redirect URIs

The redirect URI is sent by the frontend when starting the OAuth flow. It must:
1. Match an origin the server trusts (built from `ALLOWED_APP_ORIGINS`, plus safe local defaults)
2. Be registered in the EHR vendor's developer portal

### Development redirect URI
```
http://localhost:8080/frontend-react/
```

### Production redirect URI
```
https://dosegraph.io/
```

Register both URIs in:
- **Epic App Orchard**: App registration → Redirect URIs
- **Cerner Code Console**: App registration → Redirect URIs

The server validates incoming `redirectUri` values at `/api/fhir/auth/start` against an allowlist of known app origins and rejects requests from unknown origins. Custom FHIR server URLs are also disabled by default and require explicit backend enablement.

---

## SMART Scopes Requested

```
launch/patient
openid
fhirUser
patient/MedicationRequest.read
patient/MedicationStatement.read
patient/Patient.read
```

---

## Database Tables

### `fhir_pending_states`

Stores in-flight PKCE state for the duration of the OAuth redirect (max 10 minutes TTL).

| Column | Type | Description |
|--------|------|-------------|
| `state` | text PK | Random hex nonce |
| `ehr_id` | text | Registry entry ID |
| `fhir_base_url` | text | FHIR R4 base URL |
| `token_url` | text | Token endpoint |
| `client_id` | text | App client ID |
| `scopes` | text | Requested scopes |
| `code_verifier` | text | PKCE verifier (never leaves server) |
| `redirect_uri` | text | Validated redirect URI |
| `created_at` | integer | Unix ms timestamp |

### `fhir_sessions`

Stores active FHIR access tokens after a successful token exchange (max 8 hour TTL).

| Column | Type | Description |
|--------|------|-------------|
| `session_id` | text PK | Random hex session identifier |
| `ehr_id` | text | Registry entry ID |
| `fhir_base_url` | text | FHIR R4 base URL |
| `access_token` | text | EHR access token (encrypted at rest if DB encryption is enabled) |
| `patient_id` | text | FHIR patient logical ID |
| `created_at` | integer | Unix ms timestamp |

---

## Security Notes

- PKCE (`code_challenge_method=S256`) is always used — no implicit flow
- `state` nonces are single-use and expire after 10 minutes
- All custom URLs submitted by clients are validated against an SSRF blocklist
- Redirect URIs are validated against a server-side allowlist built from `ALLOWED_APP_ORIGINS`
- Access tokens are stored server-side only; the browser receives only an opaque `sessionId`
- Sessions expire after 8 hours and are purged by a background cleanup task
- Live EHR connection can be disabled per environment while retaining manual FHIR bundle import

---

## Adding a New EHR System

1. Register the app with the EHR vendor and obtain a client ID
2. Add the credentials as deployment secrets
3. Add a new entry to `EHR_REGISTRY` in `artifacts/api-server/src/routes/fhir-smart.ts`, gated on the relevant env var
4. Register the redirect URI with the vendor
5. Restart the API server workflow
