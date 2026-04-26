import { Router, type Request } from 'express';
import type * as Express from 'express';
import passport from 'passport';
import { CreateAccountBody, LoginBody } from '@workspace/api-zod';
import type { Logger } from 'pino';
import logger from '../lib/logger.js';
import {
  hashPassword,
  isSupabaseAuthEnabled,
  issueAuthToken,
  loginWithSupabase,
  registerWithSupabase,
  syncSupabaseUserAccount,
} from '../lib/auth.js';
import { createAccount, getAccountByEmail, sanitizeAccount } from '../lib/store.js';

type LoggedRequest = Request & { log?: Logger };

const router = Router();

function getLogger(req: Request) {
  return (req as LoggedRequest).log ?? logger;
}

function getAuthErrorDetails(error: unknown) {
  if (error && typeof error === 'object') {
    const candidate = error as { message?: string; status?: number };
    return {
      message: candidate.message ?? 'Authentication request failed',
      status: typeof candidate.status === 'number' ? candidate.status : 500,
    };
  }

  return {
    message: 'Authentication request failed',
    status: 500,
  };
}

router.post('/auth/register', async (req, res) => {
  try {
    const parsed = CreateAccountBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    if (isSupabaseAuthEnabled()) {
      const data = await registerWithSupabase({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        password: parsed.data.password,
      });
      const account = data.user ? await syncSupabaseUserAccount(data.user) : null;

      if (!account) {
        res.status(500).json({ error: 'Supabase registration succeeded but no local account could be created' });
        return;
      }

      const accessToken = data.session?.access_token ?? '';
      res.status(accessToken ? 201 : 202).json({
        account,
        token: accessToken,
        requiresEmailConfirmation: !accessToken,
        message: accessToken
          ? 'Signed in with Supabase.'
          : 'Check your email to confirm the account, then sign in.',
      });
      return;
    }

    const existing = await getAccountByEmail(parsed.data.email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }

    const account = await createAccount({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role ?? 'user',
      isActive: parsed.data.isActive ?? true,
    });

    const publicAccount = sanitizeAccount(account);
    res.status(201).json({
      account: publicAccount,
      token: issueAuthToken(publicAccount!),
    });
  } catch (err) {
    getLogger(req).error({ err }, 'Failed to register account');
    const details = getAuthErrorDetails(err);
    res.status(details.status).json({ error: details.message });
  }
});

router.post('/auth/login', async (req, res, next) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isSupabaseAuthEnabled()) {
    try {
      const data = await loginWithSupabase({
        email: parsed.data.email.toLowerCase(),
        password: parsed.data.password,
      });
      const account = data.user ? await syncSupabaseUserAccount(data.user) : null;

      if (!data.session?.access_token || !account) {
        res.status(401).json({ error: 'Supabase sign-in did not return an active session' });
        return;
      }

      res.json({
        account,
        token: data.session.access_token,
      });
    } catch (error) {
      getLogger(req).error({ error }, 'Failed to authenticate account with Supabase');
      const details = getAuthErrorDetails(error);
      res.status(details.status >= 400 ? details.status : 401).json({ error: details.message });
    }
    return;
  }

  passport.authenticate(
    'local',
    { session: false },
    (error: Error | null, account: Express.User | false, info?: { message?: string }) => {
      if (error) {
        getLogger(req).error({ error }, 'Failed to authenticate account');
        res.status(500).json({ error: 'Failed to authenticate account' });
        return;
      }

      if (!account) {
        res.status(401).json({ error: info?.message ?? 'Invalid credentials' });
        return;
      }

      const publicAccount = account as {
        id: number;
        email: string;
        role?: string;
      };

      res.json({
        account: publicAccount,
        token: issueAuthToken(publicAccount),
      });
    }
  )(req, res, next);
});

router.get('/auth/me', passport.authenticate('bearer', { session: false }), (req, res) => {
  res.json({ account: req.user ?? null });
});

export default router;
