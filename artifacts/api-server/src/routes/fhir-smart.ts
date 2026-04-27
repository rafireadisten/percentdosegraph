import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import { eq, lt } from "drizzle-orm";
import { db, fhirPendingStatesTable, fhirSessionsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

// ---- SSRF Protection ----

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^0\.0\.0\.0$/,
  /^metadata\.google\.internal$/i,
  /^169\.254\.169\.254$/,
];

function validateExternalUrl(raw: string | undefined, fieldName: string): void {
  if (!raw) return;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${fieldName} is not a valid URL`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`${fieldName} must use HTTPS`);
  }
  const hostname = parsed.hostname.toLowerCase();
  for (const pattern of PRIVATE_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new Error(`${fieldName} must not target a private or internal network address`);
    }
  }
}

// ---- EHR Registry ----

type EhrSystem = {
  id: string;
  name: string;
  fhirBaseUrl: string;
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  scopes: string;
};

const EHR_REGISTRY: EhrSystem[] = [
  {
    id: "epic-sandbox",
    name: "Epic (Sandbox)",
    fhirBaseUrl:
      "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    authorizeUrl:
      "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize",
    tokenUrl:
      "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
    clientId: process.env["EPIC_CLIENT_ID"] ?? "non_prod",
    scopes:
      "launch/patient openid fhirUser patient/MedicationRequest.read patient/MedicationStatement.read patient/Patient.read",
  },
  {
    id: "cerner-sandbox",
    name: "Cerner (Sandbox)",
    fhirBaseUrl:
      "https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    authorizeUrl:
      "https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/personas/patient/authorize",
    tokenUrl:
      "https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/token",
    clientId:
      process.env["CERNER_CLIENT_ID"] ??
      "ec2458f2-1e24-41c8-b71b-0e701af7583d",
    scopes:
      "launch/patient openid fhirUser patient/MedicationRequest.read patient/MedicationStatement.read patient/Patient.read",
  },
];

// ---- TTLs ----

const PENDING_STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// Periodic cleanup of expired DB rows (runs every minute)
setInterval(async () => {
  const now = Date.now();
  try {
    await db
      .delete(fhirPendingStatesTable)
      .where(lt(fhirPendingStatesTable.createdAt, now - PENDING_STATE_TTL_MS));
    await db
      .delete(fhirSessionsTable)
      .where(lt(fhirSessionsTable.createdAt, now - SESSION_TTL_MS));
  } catch (err) {
    logger.warn({ err }, "Failed to clean up expired FHIR DB rows");
  }
}, 60 * 1000);

// ---- PKCE Utilities ----

function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString("base64url").slice(0, 128);
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
  return crypto.randomBytes(24).toString("hex");
}

function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ---- Routes ----

router.get(["/fhir/smart/config", "/fhir/config"], (_req: Request, res: Response) => {
  res.json({
    systems: EHR_REGISTRY.map((s) => ({
      id: s.id,
      name: s.name,
      fhirBaseUrl: s.fhirBaseUrl,
      authorizeUrl: s.authorizeUrl,
      tokenUrl: s.tokenUrl,
      scopes: s.scopes,
    })),
  });
});

router.get(["/fhir/smart/auth/start", "/fhir/auth/start"], async (req: Request, res: Response) => {
  try {
    const {
      ehrId,
      fhirBaseUrl,
      authorizeUrl,
      tokenUrl,
      clientId,
      scopes,
      redirectUri,
    } = req.query as Record<string, string>;

    if (!redirectUri) {
      res.status(400).json({ error: "redirectUri is required" });
      return;
    }

    let system: EhrSystem | undefined;
    if (ehrId && ehrId !== "custom") {
      system = EHR_REGISTRY.find((s) => s.id === ehrId);
    }

    const resolvedFhirBaseUrl = system?.fhirBaseUrl ?? fhirBaseUrl;
    const resolvedAuthorizeUrl = system?.authorizeUrl ?? authorizeUrl;
    const resolvedTokenUrl = system?.tokenUrl ?? tokenUrl;
    const resolvedClientId = system?.clientId ?? clientId;
    const resolvedScopes =
      system?.scopes ??
      scopes ??
      "launch/patient openid fhirUser patient/MedicationRequest.read patient/Patient.read";

    if (
      !resolvedAuthorizeUrl ||
      !resolvedTokenUrl ||
      !resolvedClientId ||
      !resolvedFhirBaseUrl
    ) {
      res.status(400).json({
        error:
          "Missing required FHIR authorization parameters. Provide ehrId or fhirBaseUrl, authorizeUrl, tokenUrl, and clientId.",
      });
      return;
    }

    // SSRF protection: validate custom URLs (registry URLs are trusted; only
    // validate fields that came from the client, not from the EHR registry)
    if (!system) {
      try {
        validateExternalUrl(resolvedFhirBaseUrl, "fhirBaseUrl");
        validateExternalUrl(resolvedAuthorizeUrl, "authorizeUrl");
        validateExternalUrl(resolvedTokenUrl, "tokenUrl");
      } catch (urlErr) {
        res
          .status(400)
          .json({ error: (urlErr as Error).message });
        return;
      }
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    await db.insert(fhirPendingStatesTable).values({
      state,
      ehrId: ehrId ?? "custom",
      fhirBaseUrl: resolvedFhirBaseUrl,
      tokenUrl: resolvedTokenUrl,
      clientId: resolvedClientId,
      scopes: resolvedScopes,
      codeVerifier,
      redirectUri,
      createdAt: Date.now(),
    });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: resolvedClientId,
      redirect_uri: redirectUri,
      scope: resolvedScopes,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      aud: resolvedFhirBaseUrl,
    });

    const authUrl = `${resolvedAuthorizeUrl}?${params.toString()}`;
    logger.info({ ehrId: ehrId ?? "custom", state }, "SMART auth flow started");
    res.json({ authUrl, state });
  } catch (err) {
    logger.error({ err }, "Failed to start SMART auth");
    res.status(500).json({ error: "Failed to initiate EHR authorization." });
  }
});

router.post(
  ["/fhir/smart/auth/callback", "/fhir/auth/callback"],
  async (req: Request, res: Response) => {
    try {
      const { code, state } = req.body as {
        code?: string;
        state?: string;
      };

      if (!code || !state) {
        res.status(400).json({ error: "code and state are required" });
        return;
      }

      const [pending] = await db
        .select()
        .from(fhirPendingStatesTable)
        .where(eq(fhirPendingStatesTable.state, state))
        .limit(1);

      if (!pending) {
        res.status(400).json({
          error:
            "Invalid or expired state parameter. Please restart the authorization flow.",
        });
        return;
      }

      // Delete the pending state (single-use)
      await db
        .delete(fhirPendingStatesTable)
        .where(eq(fhirPendingStatesTable.state, state));

      const tokenRes = await fetch(pending.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: pending.redirectUri,
          client_id: pending.clientId,
          code_verifier: pending.codeVerifier,
        }).toString(),
        signal: AbortSignal.timeout(15000),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "Unknown error");
        logger.warn(
          { status: tokenRes.status, body: errText },
          "Token exchange failed"
        );
        res
          .status(502)
          .json({ error: `Token exchange failed: ${errText}` });
        return;
      }

      const tokenData = (await tokenRes.json()) as {
        access_token: string;
        refresh_token?: string;
        patient?: string;
        expires_in?: number;
      };

      const sessionId = generateSessionId();
      const expiresAt =
        Date.now() + (tokenData.expires_in ?? 3600) * 1000;

      let patientName: string | null = null;
      if (tokenData.patient) {
        try {
          const patientRes = await fetch(
            `${pending.fhirBaseUrl}/Patient/${tokenData.patient}`,
            {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: "application/fhir+json",
              },
              signal: AbortSignal.timeout(10000),
            }
          );
          if (patientRes.ok) {
            const patientData = (await patientRes.json()) as {
              name?: Array<{
                text?: string;
                family?: string;
                given?: string[];
              }>;
            };
            const nameEntry = patientData.name?.[0];
            patientName =
              nameEntry?.text ??
              ([nameEntry?.given?.join(" "), nameEntry?.family]
                .filter(Boolean)
                .join(" ") || null);
          }
        } catch (patientErr) {
          logger.warn(
            { err: patientErr },
            "Could not fetch patient demographics"
          );
        }
      }

      await db.insert(fhirSessionsTable).values({
        sessionId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        patientId: tokenData.patient ?? null,
        patientName,
        ehrId: pending.ehrId,
        fhirBaseUrl: pending.fhirBaseUrl,
        tokenUrl: pending.tokenUrl,
        clientId: pending.clientId,
        expiresAt,
        createdAt: Date.now(),
      });

      logger.info(
        {
          sessionId,
          patientId: tokenData.patient,
          ehrId: pending.ehrId,
        },
        "SMART auth callback success — session created"
      );

      res.json({
        sessionId,
        patientId: tokenData.patient ?? null,
        patientName,
        ehrId: pending.ehrId,
        expiresAt,
      });
    } catch (err) {
      logger.error({ err }, "SMART auth callback failed");
      res.status(500).json({ error: "Authorization callback failed." });
    }
  }
);

router.post(
  ["/fhir/smart/auth/refresh", "/fhir/auth/refresh"],
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body as { sessionId?: string };
      if (!sessionId) {
        res.status(400).json({ error: "sessionId is required" });
        return;
      }

      const [session] = await db
        .select()
        .from(fhirSessionsTable)
        .where(eq(fhirSessionsTable.sessionId, sessionId))
        .limit(1);

      if (!session) {
        res
          .status(401)
          .json({ error: "Session not found. Please reconnect to the EHR." });
        return;
      }

      if (!session.refreshToken) {
        res
          .status(400)
          .json({
            error: "No refresh token available. Please reconnect.",
          });
        return;
      }

      const tokenRes = await fetch(session.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: session.refreshToken,
          client_id: session.clientId,
        }).toString(),
        signal: AbortSignal.timeout(15000),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "Unknown error");
        await db
          .delete(fhirSessionsTable)
          .where(eq(fhirSessionsTable.sessionId, sessionId));
        res.status(502).json({
          error: `Token refresh failed: ${errText}. Please reconnect.`,
        });
        return;
      }

      const tokenData = (await tokenRes.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      const expiresAt =
        Date.now() + (tokenData.expires_in ?? 3600) * 1000;

      await db
        .update(fhirSessionsTable)
        .set({
          accessToken: tokenData.access_token,
          ...(tokenData.refresh_token ? { refreshToken: tokenData.refresh_token } : {}),
          expiresAt,
        })
        .where(eq(fhirSessionsTable.sessionId, sessionId));

      logger.info({ sessionId }, "SMART token refreshed");
      res.json({ sessionId, expiresAt });
    } catch (err) {
      logger.error({ err }, "SMART token refresh failed");
      res.status(500).json({ error: "Token refresh failed." });
    }
  }
);

router.get(["/fhir/smart/session", "/fhir/auth/session"], async (req: Request, res: Response) => {
  const sessionId = req.headers["x-fhir-session"] as string;
  if (!sessionId) {
    res.status(400).json({ error: "X-FHIR-Session header required" });
    return;
  }

  const [session] = await db
    .select()
    .from(fhirSessionsTable)
    .where(eq(fhirSessionsTable.sessionId, sessionId))
    .limit(1);

  if (!session) {
    res.status(404).json({ connected: false, error: "Session not found" });
    return;
  }

  res.json({
    connected: true,
    sessionId,
    patientId: session.patientId,
    patientName: session.patientName,
    ehrId: session.ehrId,
    expiresAt: session.expiresAt,
    expired: Date.now() > session.expiresAt,
  });
});

router.delete(["/fhir/smart/session", "/fhir/auth/session"], async (req: Request, res: Response) => {
  const sessionId = req.headers["x-fhir-session"] as string;
  if (sessionId) {
    await db
      .delete(fhirSessionsTable)
      .where(eq(fhirSessionsTable.sessionId, sessionId));
  }
  res.json({ disconnected: true });
});

router.get("/fhir/proxy", async (req: Request, res: Response) => {
  const sessionId = req.headers["x-fhir-session"] as string;

  if (!sessionId) {
    res.status(401).json({ error: "X-FHIR-Session header required" });
    return;
  }

  const [session] = await db
    .select()
    .from(fhirSessionsTable)
    .where(eq(fhirSessionsTable.sessionId, sessionId))
    .limit(1);

  if (!session) {
    res
      .status(401)
      .json({ error: "Session not found. Please reconnect to the EHR." });
    return;
  }

  // Auto-refresh if token expires within 2 minutes
  if (
    Date.now() > session.expiresAt - 2 * 60 * 1000 &&
    session.refreshToken
  ) {
    try {
      const tokenRes = await fetch(session.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: session.refreshToken,
          client_id: session.clientId,
        }).toString(),
        signal: AbortSignal.timeout(15000),
      });
      if (tokenRes.ok) {
        const td = (await tokenRes.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in?: number;
        };
        const newExpiresAt = Date.now() + (td.expires_in ?? 3600) * 1000;
        await db
          .update(fhirSessionsTable)
          .set({
            accessToken: td.access_token,
            ...(td.refresh_token ? { refreshToken: td.refresh_token } : {}),
            expiresAt: newExpiresAt,
          })
          .where(eq(fhirSessionsTable.sessionId, sessionId));
        session.accessToken = td.access_token;
        session.expiresAt = newExpiresAt;
        logger.info({ sessionId }, "Auto-refreshed FHIR token in proxy");
      }
    } catch (refreshErr) {
      logger.warn({ err: refreshErr }, "Auto-refresh failed in FHIR proxy");
    }
  }

  if (Date.now() > session.expiresAt) {
    res.status(401).json({
      error: "Session token has expired. Please reconnect to the EHR.",
      expired: true,
    });
    return;
  }

  const queryParams = req.query as Record<string, string>;
  const fhirPath = queryParams["path"];
  if (!fhirPath) {
    res
      .status(400)
      .json({ error: "path query parameter is required" });
    return;
  }

  const forwardParams = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (key !== "path" && typeof value === "string") {
      forwardParams.set(key, value);
    }
  }

  const targetUrl = `${session.fhirBaseUrl}${fhirPath}${
    forwardParams.toString() ? `?${forwardParams.toString()}` : ""
  }`;

  try {
    const fhirRes = await fetch(targetUrl, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/fhir+json",
      },
      signal: AbortSignal.timeout(30000),
    });

    const body = await fhirRes.json();
    res.status(fhirRes.status).json(body);
  } catch (err) {
    logger.error({ err, targetUrl }, "FHIR proxy request failed");
    res.status(502).json({
      error:
        "FHIR server request failed. The EHR server may be unreachable.",
    });
  }
});

export default router;
