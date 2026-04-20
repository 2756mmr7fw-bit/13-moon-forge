import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import dashboardRouter from "./dashboard";
import forgeRouter from "./forge";
import extrasRouter from "./extras";
import paymentsRouter from "./payments";
import flintRouter from "./flint";
import moonIntegrationRouter from "./moonIntegration";
import deployRouter from "./deploy";
import githubRouter from "./github";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(dashboardRouter);
router.use(forgeRouter);
router.use(extrasRouter);
router.use(paymentsRouter);
router.use(flintRouter);
router.use(moonIntegrationRouter);
router.use(deployRouter);
router.use(githubRouter);

export default router;
