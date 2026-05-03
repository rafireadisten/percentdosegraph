import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import type { Logger } from 'pino';
import logger from '../lib/logger.js';

const router = Router();

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

const FHIR_SMART_ENABLED = parseBooleanEnv(
  process.env.ENABLE_FHIR_SMART,
  process.env.NODE_ENV !== 'production'
);
const CUSTOM_FHIR_ENABLED = parseBooleanEnv(process.env.ENABLE_CUSTOM_FHIR_EHR, false);
const DEFAULT_ALLOWED_APP_ORIGINS = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://percentdosegraph.pages.dev',
  'https://dosegraph.io',
  'https://www.dosegraph.io',
];

function buildAllowedAppOrigins(): Set<string> {
  const configured = (process.env.ALLOWED_APP_ORIGINS ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  if (appBaseUrl) {
    configured.push(appBaseUrl);
  }

  return new Set(
    [...DEFAULT_ALLOWED_APP_ORIGINS, ...configured].map(origin => {
      try {
        return new URL(origin).origin;
      } catch {
        return null;
      }
    }).filter(Boolean) as string[]
  );
}

const ALLOWED_APP_ORIGINS = buildAllowedAppOrigins();

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function isBlockedPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === '0.0.0.0' ||
    normalized.endsWith('.local') ||
    normalized.startsWith('10.') ||
    normalized.startsWith('127.') ||
    normalized.startsWith('169.254.') ||
    normalized.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  );
}

function ensureSmartEnabled(res: Response): boolean {
  if (!FHIR_SMART_ENABLED) {
    res.status(503).json({
      error:
        'SMART on FHIR live EHR connections are disabled in this environment. Manual FHIR bundle import remains available.',
    });
    return false;
  }

  return true;
}

function validateRedirectUri(rawRedirectUri: string): URL {
  let redirectUrl: URL;
  try {
    redirectUrl = new URL(rawRedirectUri);
  } catch {
    throw new Error('redirectUri must be a valid absolute URL.');
  }

  const protocol = redirectUrl.protocol.toLowerCase();
  if (protocol !== 'https:' && !(protocol === 'http:' && isLoopbackHostname(redirectUrl.hostname))) {
    throw new Error('redirectUri must use https unless it targets localhost for local development.');
  }

  if (!ALLOWED_APP_ORIGINS.has(redirectUrl.origin)) {
    throw new Error(`redirectUri origin "${redirectUrl.origin}" is not in the allowed app origins list.`);
  }

  return redirectUrl;
}

function validateExternalHttpsUrl(rawUrl: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${label} must use https.`);
  }

  if (isLoopbackHostname(parsed.hostname) || isBlockedPrivateHostname(parsed.hostname)) {
    throw new Error(`${label} cannot target localhost or private-network hosts.`);
  }

  return parsed.toString().replace(/\/$/, '');
}

function buildFhirTargetUrl(baseUrl: string, fhirPath: string, query: URLSearchParams): string {
  if (!fhirPath.startsWith('/')) {
    throw new Error('FHIR path must start with "/".');
  }

  if (fhirPath.startsWith('//') || fhirPath.includes('://')) {
    throw new Error('FHIR path must be relative to the configured FHIR base URL.');
  }

  const normalizedBase = baseUrl.replace(/\/$/, '');
  const targetUrl = new URL(`${normalizedBase}${fhirPath}`);
  const baseOrigin = new URL(normalizedBase).origin;

  if (targetUrl.origin !== baseOrigin) {
    throw new Error('FHIR path resolved outside the configured FHIR origin.');
  }

  if (query.toString()) {
    targetUrl.search = query.toString();
  }

  return targetUrl.toString();
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
    id: 'epic-sandbox',
    name: 'Epic (Sandbox)',
    fhirBaseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
    authorizeUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
    tokenUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
    clientId: process.env.EPIC_CLIENT_ID ?? 'non_prod',
    scopes:
      'launch/patient openid fhirUser patient/MedicationRequest.read patient/MedicationStatement.read patient/Patient.read',
  },
  {
    id: 'cerner-sandbox',
    name: 'Cerner (Sandbox)',
    fhirBaseUrl:
      'https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
    authorizeUrl:
      'https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/personas/patient/authorize',
    tokenUrl:
      'https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/token',
    clientId:
      process.env.CERNER_CLIENT_ID ?? 'ec2458f2-1e24-41c8-b71b-0e701af7583d',
    scopes:
      'launch/patient openid fhirUser patient/MedicationRequest.read patient/MedicationStatement.read patient/Patient.read',
  },
];

// ---- In-memory State Stores ----

type PendingAuthState = {
  ehrId: string;
  fhirBaseUrl: string;
  tokenUrl: string;
  clientId: string;
  scopes: string;
  codeVerifier: string;
  redirectUri: string;
  createdAt: number;
};

type FhirSession = {
  accessToken: string;
  refreshToken: string | null;
  patientId: string | null;
  patientName: string | null;
  ehrId: string;
  fhirBaseUrl: string;
  tokenUrl: string;
  clientId: string;
  expiresAt: number;
  createdAt: number;
};

const PENDING_STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const pendingAuthStates = new Map<string, PendingAuthState>();
const fhirSessions = new Map<string, FhirSession>();

setInterval(() => {
  const now = Date.now();
  for (const [key, state] of pendingAuthStates) {
    if (now - state.createdAt > PENDING_STATE_TTL_MS) pendingAuthStates.delete(key);
  }
  for (const [key, session] of fhirSessions) {
    if (now - session.createdAt > SESSION_TTL_MS) fhirSessions.delete(key);
  }
}, 60 * 1000);

// ---- PKCE Utilities ----

function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString('base64url').slice(0, 128);
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState(): string {
  return crypto.randomBytes(24).toString('hex');
}

function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ---- Logger helper ----

type LoggedRequest = Request & { log?: Logger };

function getLogger(req: Request) {
  return (req as LoggedRequest).log ?? logger;
}

// ---- Routes ----

/**
 * @openapi
 * /fhir/smart/config:
 *   get:
 *     summary: Get EHR system registry
 *     description: Returns the list of pre-configured EHR systems for SMART on FHIR.
 *     responses:
 *       200:
 *         description: EHR system list
 */
router.get('/fhir/smart/config', (_req: Request, res: Response) => {
  res.json({
    enabled: FHIR_SMART_ENABLED,
    supportTier: 'beta',
    customSupported: CUSTOM_FHIR_ENABLED,
    message: FHIR_SMART_ENABLED
      ? 'SMART on FHIR live EHR connection is available in beta.'
      : 'SMART on FHIR live EHR connection is disabled in this environment. Manual FHIR bundle import is still available.',
    allowedOrigins: Array.from(ALLOWED_APP_ORIGINS),
    systems: FHIR_SMART_ENABLED
      ? EHR_REGISTRY.map(s => ({
          id: s.id,
          name: s.name,
          fhirBaseUrl: s.fhirBaseUrl,
          authorizeUrl: s.authorizeUrl,
          tokenUrl: s.tokenUrl,
          scopes: s.scopes,
        }))
      : [],
  });
});

/**
 * @openapi
 * /fhir/smart/auth/start:
 *   get:
 *     summary: Start SMART on FHIR OAuth flow
 *     description: |
 *       Generates PKCE parameters and returns the EHR authorization URL.
 *       The frontend should redirect or open a popup to authUrl.
 *     parameters:
 *       - in: query
 *         name: ehrId
 *         schema:
 *           type: string
 *       - in: query
 *         name: redirectUri
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authorization URL to redirect the user to
 *       400:
 *         description: Missing required parameters
 */
router.get('/fhir/smart/auth/start', (req: Request, res: Response) => {
  const log = getLogger(req);
  try {
    if (!ensureSmartEnabled(res)) {
      return;
    }

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
      res.status(400).json({ error: 'redirectUri is required' });
      return;
    }

    const validatedRedirectUri = validateRedirectUri(redirectUri).toString();

    let system: EhrSystem | undefined;
    if (ehrId && ehrId !== 'custom') {
      system = EHR_REGISTRY.find(s => s.id === ehrId);
    }

    if (ehrId === 'custom' && !CUSTOM_FHIR_ENABLED) {
      res.status(403).json({
        error:
          'Custom FHIR server connections are disabled. Use a configured sandbox/production EHR entry or enable custom EHR support explicitly.',
      });
      return;
    }

    const resolvedFhirBaseUrl = system?.fhirBaseUrl ?? (fhirBaseUrl ? validateExternalHttpsUrl(fhirBaseUrl, 'fhirBaseUrl') : undefined);
    const resolvedAuthorizeUrl = system?.authorizeUrl ?? (authorizeUrl ? validateExternalHttpsUrl(authorizeUrl, 'authorizeUrl') : undefined);
    const resolvedTokenUrl = system?.tokenUrl ?? (tokenUrl ? validateExternalHttpsUrl(tokenUrl, 'tokenUrl') : undefined);
    const resolvedClientId = system?.clientId ?? clientId;
    const resolvedScopes =
      system?.scopes ??
      scopes ??
      'launch/patient openid fhirUser patient/MedicationRequest.read patient/Patient.read';

    if (
      !resolvedAuthorizeUrl ||
      !resolvedTokenUrl ||
      !resolvedClientId ||
      !resolvedFhirBaseUrl
    ) {
      res.status(400).json({
        error:
          'Missing required FHIR authorization parameters. Provide ehrId or fhirBaseUrl, authorizeUrl, tokenUrl, and clientId.',
      });
      return;
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    pendingAuthStates.set(state, {
      ehrId: ehrId ?? 'custom',
      fhirBaseUrl: resolvedFhirBaseUrl,
      tokenUrl: resolvedTokenUrl,
      clientId: resolvedClientId,
      scopes: resolvedScopes,
      codeVerifier,
      redirectUri: validatedRedirectUri,
      createdAt: Date.now(),
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: resolvedClientId,
      redirect_uri: validatedRedirectUri,
      scope: resolvedScopes,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      aud: resolvedFhirBaseUrl,
    });

    const authUrl = `${resolvedAuthorizeUrl}?${params.toString()}`;
    log.info({ ehrId: ehrId ?? 'custom', state }, 'SMART auth flow started');
    res.json({ authUrl, state });
  } catch (err) {
    log.error({ err }, 'Failed to start SMART auth');
    res.status(500).json({ error: 'Failed to initiate EHR authorization.' });
  }
});

/**
 * @openapi
 * /fhir/smart/auth/callback:
 *   post:
 *     summary: Exchange authorization code for tokens
 *     description: |
 *       Exchanges the authorization code (from the PKCE flow) for access/refresh tokens.
 *       Stores the session server-side and returns a sessionId to the frontend.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, state]
 *             properties:
 *               code:
 *                 type: string
 *               state:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session created, returns sessionId and patient info
 *       400:
 *         description: Invalid or expired state
 *       502:
 *         description: Token exchange with EHR failed
 */
router.post('/fhir/smart/auth/callback', async (req: Request, res: Response) => {
  const log = getLogger(req);
  try {
    if (!ensureSmartEnabled(res)) {
      return;
    }

    const { code, state } = req.body as { code?: string; state?: string };

    if (!code || !state) {
      res.status(400).json({ error: 'code and state are required' });
      return;
    }

    const pending = pendingAuthStates.get(state);
    if (!pending) {
      res.status(400).json({
        error: 'Invalid or expired state parameter. Please restart the authorization flow.',
      });
      return;
    }

    pendingAuthStates.delete(state);

    const tokenRes = await fetch(pending.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: pending.redirectUri,
        client_id: pending.clientId,
        code_verifier: pending.codeVerifier,
      }).toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => 'Unknown error');
      log.warn({ status: tokenRes.status, body: errText }, 'Token exchange failed');
      res.status(502).json({ error: `Token exchange failed: ${errText}` });
      return;
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      patient?: string;
      expires_in?: number;
    };

    const sessionId = generateSessionId();
    const expiresAt = Date.now() + (tokenData.expires_in ?? 3600) * 1000;

    let patientName: string | null = null;
    if (tokenData.patient) {
      try {
        const patientRes = await fetch(
          `${pending.fhirBaseUrl}/Patient/${tokenData.patient}`,
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              Accept: 'application/fhir+json',
            },
            signal: AbortSignal.timeout(10000),
          }
        );
        if (patientRes.ok) {
          const patientData = (await patientRes.json()) as {
            name?: Array<{ text?: string; family?: string; given?: string[] }>;
          };
          const nameEntry = patientData.name?.[0];
          patientName =
            nameEntry?.text ??
            ([nameEntry?.given?.join(' '), nameEntry?.family].filter(Boolean).join(' ') || null);
        }
      } catch (patientErr) {
        log.warn({ err: patientErr }, 'Could not fetch patient demographics');
      }
    }

    fhirSessions.set(sessionId, {
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

    log.info(
      { sessionId, patientId: tokenData.patient, ehrId: pending.ehrId },
      'SMART auth callback success — session created'
    );

    res.json({
      sessionId,
      patientId: tokenData.patient ?? null,
      patientName,
      ehrId: pending.ehrId,
      expiresAt,
    });
  } catch (err) {
    log.error({ err }, 'SMART auth callback failed');
    res.status(500).json({ error: 'Authorization callback failed.' });
  }
});

/**
 * @openapi
 * /fhir/smart/auth/refresh:
 *   post:
 *     summary: Refresh a FHIR access token
 *     description: Uses the stored refresh token to obtain a new access token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId]
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 *       400:
 *         description: No refresh token available
 *       401:
 *         description: Session not found
 *       502:
 *         description: Refresh failed
 */
router.post('/fhir/smart/auth/refresh', async (req: Request, res: Response) => {
  const log = getLogger(req);
  try {
    if (!ensureSmartEnabled(res)) {
      return;
    }

    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    const session = fhirSessions.get(sessionId);
    if (!session) {
      res.status(401).json({ error: 'Session not found. Please reconnect to the EHR.' });
      return;
    }

    if (!session.refreshToken) {
      res.status(400).json({ error: 'No refresh token available. Please reconnect.' });
      return;
    }

    const tokenRes = await fetch(session.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        client_id: session.clientId,
      }).toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => 'Unknown error');
      fhirSessions.delete(sessionId);
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

    const expiresAt = Date.now() + (tokenData.expires_in ?? 3600) * 1000;
    session.accessToken = tokenData.access_token;
    if (tokenData.refresh_token) session.refreshToken = tokenData.refresh_token;
    session.expiresAt = expiresAt;

    log.info({ sessionId }, 'SMART token refreshed');
    res.json({ sessionId, expiresAt });
  } catch (err) {
    log.error({ err }, 'SMART token refresh failed');
    res.status(500).json({ error: 'Token refresh failed.' });
  }
});

/**
 * @openapi
 * /fhir/smart/session:
 *   get:
 *     summary: Get FHIR session status
 *     description: Returns the current connection status for a stored FHIR session.
 *     parameters:
 *       - in: header
 *         name: x-fhir-session
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session info
 *       400:
 *         description: Missing header
 *       404:
 *         description: Session not found
 */
router.get('/fhir/smart/session', (req: Request, res: Response) => {
  if (!ensureSmartEnabled(res)) {
    return;
  }

  const sessionId = req.headers['x-fhir-session'] as string;
  if (!sessionId) {
    res.status(400).json({ error: 'X-FHIR-Session header required' });
    return;
  }

  const session = fhirSessions.get(sessionId);
  if (!session) {
    res.status(404).json({ connected: false, error: 'Session not found' });
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

/**
 * @openapi
 * /fhir/smart/session:
 *   delete:
 *     summary: Disconnect from EHR
 *     description: Deletes the stored FHIR session, disconnecting from the EHR.
 *     parameters:
 *       - in: header
 *         name: x-fhir-session
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Disconnected
 */
router.delete('/fhir/smart/session', (req: Request, res: Response) => {
  if (!ensureSmartEnabled(res)) {
    return;
  }

  const sessionId = req.headers['x-fhir-session'] as string;
  if (sessionId) fhirSessions.delete(sessionId);
  res.json({ disconnected: true });
});

/**
 * @openapi
 * /fhir/proxy:
 *   get:
 *     summary: FHIR reverse proxy
 *     description: |
 *       Forwards a request to the connected FHIR server using the stored access token.
 *       The bearer token never leaves the server. Auto-refreshes tokens near expiry.
 *     parameters:
 *       - in: header
 *         name: x-fhir-session
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: path
 *         required: true
 *         description: FHIR resource path (e.g. /Patient/123/MedicationRequest)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FHIR resource or bundle
 *       401:
 *         description: Session not found or expired
 *       502:
 *         description: FHIR server unreachable
 */
router.get('/fhir/proxy', async (req: Request, res: Response) => {
  const log = getLogger(req);
  if (!ensureSmartEnabled(res)) {
    return;
  }

  const sessionId = req.headers['x-fhir-session'] as string;

  if (!sessionId) {
    res.status(401).json({ error: 'X-FHIR-Session header required' });
    return;
  }

  const session = fhirSessions.get(sessionId);
  if (!session) {
    res.status(401).json({ error: 'Session not found. Please reconnect to the EHR.' });
    return;
  }

  // Auto-refresh if token expires within 2 minutes
  if (Date.now() > session.expiresAt - 2 * 60 * 1000 && session.refreshToken) {
    try {
      const tokenRes = await fetch(session.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
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
        session.accessToken = td.access_token;
        if (td.refresh_token) session.refreshToken = td.refresh_token;
        session.expiresAt = Date.now() + (td.expires_in ?? 3600) * 1000;
        log.info({ sessionId }, 'Auto-refreshed FHIR token in proxy');
      }
    } catch (refreshErr) {
      log.warn({ err: refreshErr }, 'Auto-refresh failed in FHIR proxy');
    }
  }

  if (Date.now() > session.expiresAt) {
    res.status(401).json({
      error: 'Session token has expired. Please reconnect to the EHR.',
      expired: true,
    });
    return;
  }

  const { path: fhirPath, ...otherQuery } = req.query as Record<string, string>;
  if (!fhirPath) {
    res.status(400).json({ error: 'path query parameter is required' });
    return;
  }

  const forwardParams = new URLSearchParams();
  for (const [key, value] of Object.entries(otherQuery)) {
    if (typeof value === 'string') forwardParams.set(key, value);
  }

  let targetUrl = '';
  try {
    targetUrl = buildFhirTargetUrl(session.fhirBaseUrl, fhirPath, forwardParams);
    const fhirRes = await fetch(targetUrl, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'application/fhir+json',
      },
      signal: AbortSignal.timeout(30000),
    });

    const body = await fhirRes.json();
    res.status(fhirRes.status).json(body);
  } catch (err) {
    log.error({ err, targetUrl }, 'FHIR proxy request failed');
    res.status(502).json({
      error: 'FHIR server request failed. The EHR server may be unreachable.',
    });
  }
});

export default router;
