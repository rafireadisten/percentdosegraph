import { Router, type Request } from "express";
import { CreateProfileBody, UpdateProfileBody } from "@workspace/api-zod";
import type { Logger } from "pino";
import logger from "../lib/logger.js";
import {
  createProfile,
  deleteProfileById,
  listProfiles,
  updateProfileById,
} from "../lib/store.js";

type LoggedRequest = Request & { log?: Logger };

const router = Router();

function getLogger(req: Request) {
  return (req as LoggedRequest).log ?? logger;
}

router.get("/profiles", async (req, res) => {
  try {
    const profiles = await listProfiles();
    res.json(profiles);
  } catch (err) {
    getLogger(req).error({ err }, "Failed to list profiles");
    res.status(500).json({ error: "Failed to list profiles" });
  }
});

router.post("/profiles", async (req, res) => {
  try {
    const parsed = CreateProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const profile = await createProfile(parsed.data);
    res.status(201).json(profile);
  } catch (err) {
    getLogger(req).error({ err }, "Failed to create profile");
    res.status(500).json({ error: "Failed to create profile" });
  }
});

router.put("/profiles/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = UpdateProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const profile = await updateProfileById(id, parsed.data);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json(profile);
  } catch (err) {
    getLogger(req).error({ err }, "Failed to update profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.delete("/profiles/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const deletedProfile = await deleteProfileById(id);
    if (!deletedProfile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json(deletedProfile);
  } catch (err) {
    getLogger(req).error({ err }, "Failed to delete profile");
    res.status(500).json({ error: "Failed to delete profile" });
  }
});

export default router;
