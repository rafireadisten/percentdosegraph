import { Router } from "express";
import { getPersistenceMode } from "../lib/persistence.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    persistence: {
      mode: getPersistenceMode(),
      seededOnBoot: process.env.PERSISTENCE_SEED_ON_BOOT !== "false",
    },
  });
});

export default router;
