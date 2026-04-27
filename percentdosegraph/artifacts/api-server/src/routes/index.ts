import { Router } from 'express';
import authRouter from './auth.js';
import accountsRouter from './accounts.js';
import healthRouter from './health.js';
import drugsRouter from './drugs.js';
import dosesRouter from './doses.js';
import profilesRouter from './profiles.js';
import usDrugsRouter from './us-drugs.js';
import fhirRouter from './fhir.js';
import fhirSmartRouter from './fhir-smart.js';

const router = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(accountsRouter);
router.use(drugsRouter);
router.use(dosesRouter);
router.use(profilesRouter);
router.use(usDrugsRouter);
router.use(fhirRouter);
router.use(fhirSmartRouter);

export default router;
