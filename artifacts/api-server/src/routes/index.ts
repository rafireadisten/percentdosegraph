import { Router } from "express";
import healthRouter from "./health.js";
import drugsRouter from "./drugs.js";
import dosesRouter from "./doses.js";
import profilesRouter from "./profiles.js";
import usDrugsRouter from "./us-drugs.js";

const router = Router();

router.use(healthRouter);
router.use(drugsRouter);
router.use(dosesRouter);
router.use(profilesRouter);
router.use(usDrugsRouter);

export default router;
