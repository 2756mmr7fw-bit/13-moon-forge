import { createReceiverRouter, DrizzleEntitlementStore } from "../lib/moonReceiver";
import { TPTS_INBOUND_KEY, FORGE_MOONS } from "../lib/moonApi";

const store = new DrizzleEntitlementStore();

const APP_DOMAIN =
  process.env.APP_DOMAIN ??
  process.env.REPLIT_DOMAINS?.split(",")[0] ??
  "13moonforge.ai";

// createReceiverRouter mounts three routes:
//   GET  /api/moon/integration-status   — probe used by Ezekiel / TPTS dashboard
//   POST /api/moon/webhook              — inbound events from TPTS
//   GET  /api/moon/lookup-user/:userId  — TPTS can confirm a user's entitlement
const router = createReceiverRouter({
  apiKey:        TPTS_INBOUND_KEY,
  appName:       "13 Moon Forge",
  relevantMoons: [...FORGE_MOONS],
  store,
  version:       "2.0.0",
  onApplied: (event, record) => {
    console.log(
      `[forge] ${record.userId} → active=${record.isActive}, ` +
      `moons=${record.moons.join(",") || "(none)"} (event: ${event.event}), ` +
      `domain=${APP_DOMAIN}`,
    );
  },
});

export default router;
