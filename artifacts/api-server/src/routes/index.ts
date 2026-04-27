import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fhirRouter from "./fhir";

const router: IRouter = Router();

router.use(healthRouter);
router.use(fhirRouter);

export default router;
