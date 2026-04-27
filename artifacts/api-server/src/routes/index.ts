import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fhirRouter from "./fhir";
import fhirSmartRouter from "./fhir-smart";

const router: IRouter = Router();

router.use(healthRouter);
router.use(fhirRouter);
router.use(fhirSmartRouter);

export default router;
