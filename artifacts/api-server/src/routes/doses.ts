import { Router, type Request } from "express";
import { LogDoseBody } from "@workspace/api-zod";
import type { Logger } from "pino";
import logger from "../lib/logger.js";
import { createDose, deleteDoseById, listDoses } from "../lib/store.js";

type LoggedRequest = Request & { log?: Logger };

const router = Router();

function getLogger(req: Request) {
  return (req as LoggedRequest).log ?? logger;
}

router.get("/doses", async (req, res) => {
  try {
    const doses = await listDoses();
    res.json(doses);
  } catch (err) {
    getLogger(req).error({ err }, "Failed to list doses");
    res.status(500).json({ error: "Failed to list doses" });
  }
});

router.post("/doses", async (req, res) => {
  try {
    const parsed = LogDoseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const dose = await createDose(parsed.data);
    res.status(201).json(dose);
  } catch (err) {
    getLogger(req).error({ err }, "Failed to create dose");
    res.status(500).json({ error: "Failed to create dose" });
  }
});

router.delete("/doses/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const deletedDose = await deleteDoseById(id);
    if (!deletedDose) {
      res.status(404).json({ error: "Dose not found" });
      return;
    }

    res.json(deletedDose);
  } catch (err) {
    getLogger(req).error({ err }, "Failed to delete dose");
    res.status(500).json({ error: "Failed to delete dose" });
  }
});

export default router;
