import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import dashboardRouter from "./dashboard";
import forgeRouter from "./forge";
import extrasRouter from "./extras";
import paymentsRouter from "./payments";
import flintRouter from "./flint";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(dashboardRouter);
router.use(forgeRouter);
router.use(extrasRouter);
router.use(paymentsRouter);
router.use(flintRouter);

export default router;
