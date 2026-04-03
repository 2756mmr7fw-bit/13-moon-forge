import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import dashboardRouter from "./dashboard";
import forgeRouter from "./forge";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(dashboardRouter);
router.use(forgeRouter);

export default router;
