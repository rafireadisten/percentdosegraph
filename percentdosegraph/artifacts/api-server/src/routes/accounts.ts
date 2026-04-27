import { Router, type Request } from 'express';
import passport from 'passport';
import { CreateAccountBody, CreateProfileBody, UpdateAccountBody } from '@workspace/api-zod';
import type { Logger } from 'pino';
import logger from '../lib/logger.js';
import { hashPassword } from '../lib/auth.js';
import {
  createAccount,
  createProfile,
  deleteAccountById,
  getAccountById,
  listAccounts,
  listProfiles,
  sanitizeAccount,
  updateAccountById,
} from '../lib/store.js';

type LoggedRequest = Request & { log?: Logger };

const router = Router();

function getLogger(req: Request) {
  return (req as LoggedRequest).log ?? logger;
}

function canManageAccount(req: Request, accountId: number) {
  const user = req.user as { id?: number; role?: string } | undefined;
  return user?.role === 'admin' || user?.role === 'system' || user?.id === accountId;
}

router.get('/accounts', passport.authenticate('bearer', { session: false }), async (req, res) => {
  try {
    const accounts = await listAccounts();
    const user = req.user as { id?: number; role?: string } | undefined;
    const visibleAccounts =
      user?.role === 'admin' || user?.role === 'system'
        ? accounts
        : accounts.filter(account => account.id === user?.id);
    res.json(visibleAccounts.map(account => sanitizeAccount(account)));
  } catch (err) {
    getLogger(req).error({ err }, 'Failed to list accounts');
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

router.post('/accounts', passport.authenticate('bearer', { session: false }), async (req, res) => {
  try {
    const parsed = CreateAccountBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const requester = req.user as { role?: string } | undefined;
    if (requester?.role !== 'admin' && requester?.role !== 'system') {
      res.status(403).json({ error: 'Only admin accounts can create other accounts' });
      return;
    }

    const account = await createAccount({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role ?? 'user',
      isActive: parsed.data.isActive ?? true,
    });
    res.status(201).json(sanitizeAccount(account));
  } catch (err) {
    getLogger(req).error({ err }, 'Failed to create account');
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.get(
  '/accounts/:id',
  passport.authenticate('bearer', { session: false }),
  async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      if (!canManageAccount(req, id)) {
        res.status(403).json({ error: 'Not authorized for this account' });
        return;
      }

      const account = await getAccountById(id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      res.json(sanitizeAccount(account));
    } catch (err) {
      getLogger(req).error({ err }, 'Failed to get account');
      res.status(500).json({ error: 'Failed to get account' });
    }
  }
);

router.put(
  '/accounts/:id',
  passport.authenticate('bearer', { session: false }),
  async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      if (!canManageAccount(req, id)) {
        res.status(403).json({ error: 'Not authorized for this account' });
        return;
      }

      const parsed = UpdateAccountBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const account = await updateAccountById(id, {
        ...parsed.data,
        email: parsed.data.email?.toLowerCase(),
        passwordHash: parsed.data.password ? await hashPassword(parsed.data.password) : undefined,
      });
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      res.json(sanitizeAccount(account));
    } catch (err) {
      getLogger(req).error({ err }, 'Failed to update account');
      res.status(500).json({ error: 'Failed to update account' });
    }
  }
);

router.delete(
  '/accounts/:id',
  passport.authenticate('bearer', { session: false }),
  async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      if (!canManageAccount(req, id)) {
        res.status(403).json({ error: 'Not authorized for this account' });
        return;
      }

      const account = await deleteAccountById(id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      res.json(sanitizeAccount(account));
    } catch (err) {
      getLogger(req).error({ err }, 'Failed to delete account');
      res.status(500).json({ error: 'Failed to delete account' });
    }
  }
);

router.get(
  '/accounts/:id/profiles',
  passport.authenticate('bearer', { session: false }),
  async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      if (!canManageAccount(req, id)) {
        res.status(403).json({ error: 'Not authorized for this account' });
        return;
      }

      const account = await getAccountById(id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      const profiles = await listProfiles(id);
      res.json(profiles);
    } catch (err) {
      getLogger(req).error({ err }, 'Failed to list account profiles');
      res.status(500).json({ error: 'Failed to list account profiles' });
    }
  }
);

router.post(
  '/accounts/:id/profiles',
  passport.authenticate('bearer', { session: false }),
  async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      if (!canManageAccount(req, id)) {
        res.status(403).json({ error: 'Not authorized for this account' });
        return;
      }

      const account = await getAccountById(id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      const parsed = CreateProfileBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const profile = await createProfile({
        ...parsed.data,
        accountId: id,
      });
      res.status(201).json(profile);
    } catch (err) {
      getLogger(req).error({ err }, 'Failed to create account profile');
      res.status(500).json({ error: 'Failed to create account profile' });
    }
  }
);

export default router;
