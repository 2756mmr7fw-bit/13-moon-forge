import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({ ...data, build: "v3-cdn-test" });
});

router.get("/healthz/trace", (_req, res) => {
  res.json({ trace: true, ts: Date.now(), pid: process.pid, build: "d583c794-v2" });
});

export default router;
