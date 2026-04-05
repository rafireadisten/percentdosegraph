import { Router, type Request } from 'express';
import type * as Express from 'express';
import passport from 'passport';
import { CreateAccountBody, LoginBody } from '@workspace/api-zod';
import type { Logger } from 'pino';
import logger from '../lib/logger.js';
import { hashPassword, issueAuthToken } from '../lib/auth.js';
import { createAccount, getAccountByEmail, sanitizeAccount } from '../lib/store.js';

type LoggedRequest = Request & { log?: Logger };

const router = Router();

function getLogger(req: Request) {
  return (req as LoggedRequest).log ?? logger;
}

router.post('/auth/register', async (req, res) => {
  try {
    const parsed = CreateAccountBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
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
    res.status(500).json({ error: 'Failed to register account' });
  }
});

router.post('/auth/login', async (req, res, next) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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
