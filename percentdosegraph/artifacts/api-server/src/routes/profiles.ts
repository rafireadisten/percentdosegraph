import { Router, type Request } from 'express';
import passport from 'passport';
import { CreateProfileBody, UpdateProfileBody } from '@workspace/api-zod';
import type { Logger } from 'pino';
import logger from '../lib/logger.js';
import {
  createProfile,
  deleteProfileById,
  getProfileById,
  listProfiles,
  updateProfileById,
} from '../lib/store.js';

type LoggedRequest = Request & { log?: Logger };

const router = Router();

function getLogger(req: Request) {
  return (req as LoggedRequest).log ?? logger;
}

function canAccessAccount(req: Request, accountId?: number) {
  const user = req.user as { id?: number; role?: string } | undefined;
  if (!accountId) {
    return true;
  }

  return user?.role === 'admin' || user?.role === 'system' || user?.id === accountId;
}

router.get('/profiles', passport.authenticate('bearer', { session: false }), async (req, res) => {
  try {
    const accountId = req.query.accountId
      ? Number.parseInt(String(req.query.accountId), 10)
      : undefined;

    if (req.query.accountId && Number.isNaN(accountId)) {
      res.status(400).json({ error: 'Invalid accountId' });
      return;
    }

    if (!canAccessAccount(req, accountId)) {
      res.status(403).json({ error: 'Not authorized for this account' });
      return;
    }

    const profiles = await listProfiles(accountId);
    res.json(profiles);
  } catch (err) {
    getLogger(req).error({ err }, 'Failed to list profiles');
    res.status(500).json({ error: 'Failed to list profiles' });
  }
});

router.post('/profiles', passport.authenticate('bearer', { session: false }), async (req, res) => {
  try {
    const parsed = CreateProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    if (!canAccessAccount(req, parsed.data.accountId)) {
      res.status(403).json({ error: 'Not authorized for this account' });
      return;
    }

    const profile = await createProfile(parsed.data);
    res.status(201).json(profile);
  } catch (err) {
    getLogger(req).error({ err }, 'Failed to create profile');
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

router.put(
  '/profiles/:id',
  passport.authenticate('bearer', { session: false }),
  async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      const existing = await getProfileById(id);
      if (!existing) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      if (!canAccessAccount(req, existing.accountId)) {
        res.status(403).json({ error: 'Not authorized for this account' });
        return;
      }

      const parsed = UpdateProfileBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      if (!canAccessAccount(req, parsed.data.accountId ?? existing.accountId)) {
        res.status(403).json({ error: 'Not authorized for this account' });
        return;
      }

      const existingPatientId = String(existing.payload?.patientId ?? existing.id);
      const updatedPatientId = parsed.data.payload?.patientId;
      if (
        updatedPatientId !== undefined &&
        String(updatedPatientId) !== existingPatientId
      ) {
        res.status(400).json({ error: 'Patient ID cannot be changed for an existing profile.' });
        return;
      }

      const profile = await updateProfileById(id, parsed.data);

      res.json(profile);
    } catch (err) {
      getLogger(req).error({ err }, 'Failed to update profile');
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

router.delete(
  '/profiles/:id',
  passport.authenticate('bearer', { session: false }),
  async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      const existing = await getProfileById(id);
      if (!existing) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      if (!canAccessAccount(req, existing.accountId)) {
        res.status(403).json({ error: 'Not authorized for this account' });
        return;
      }

      const deletedProfile = await deleteProfileById(id);
      res.json(deletedProfile);
    } catch (err) {
      getLogger(req).error({ err }, 'Failed to delete profile');
      res.status(500).json({ error: 'Failed to delete profile' });
    }
  }
);

export default router;
