import { Router } from "express";
import { createRequire } from "module";
import { db } from "@workspace/db";
import { paymentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sq = require("square") as any;
const { SquareClient, SquareEnvironment } = sq;

const router = Router();

const squareClient = new SquareClient({
  token: process.env.SQUARE_API_KEY!,
  environment: SquareEnvironment?.Production ?? "production",
});

const PLANS = {
  creator: { name: "Creator", priceCents: 1500 },
  pro:     { name: "Pro",     priceCents: 2900 },
  studio:  { name: "Studio",  priceCents: 5900 },
} as const;

type PlanKey = keyof typeof PLANS;

const getBaseUrl = () => {
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return "http://localhost:8080";
};

// ─── Create checkout payment link ─────────────────────────────────────────────
router.post("/payments/checkout", async (req, res) => {
  const { plan, email } = req.body as { plan: string; email?: string };

  if (!plan || !(plan in PLANS)) {
    return res.status(400).json({ error: "Invalid plan. Choose: creator, pro, or studio." });
  }

  const selectedPlan = PLANS[plan as PlanKey];

  try {
    const idempotencyKey = `forge-${plan}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey,
      quickPay: {
        name: `The Forge — ${selectedPlan.name} Plan`,
        priceMoney: {
          amount: BigInt(selectedPlan.priceCents),
          currency: "USD",
        },
        locationId: undefined,
      },
      checkoutOptions: {
        redirectUrl: `${getBaseUrl()}/payment/success?plan=${plan}`,
        askForShippingAddress: false,
      },
      prePopulatedData: email ? { buyerEmail: email } : undefined,
    });

    const paymentLink = response?.paymentLink ?? response?.result?.paymentLink;

    if (!paymentLink?.url) {
      throw new Error("No payment link returned from Square");
    }

    await db.insert(paymentsTable).values({
      email: email || null,
      plan,
      squarePaymentLinkId: paymentLink.id,
      squareOrderId: paymentLink.orderId || null,
      amountCents: selectedPlan.priceCents,
      status: "pending",
      paid: false,
    });

    res.json({ url: paymentLink.url, plan: selectedPlan.name });
  } catch (err: unknown) {
    req.log.error({ err }, "Square checkout failed");
    const message = err instanceof Error ? err.message : "Payment setup failed";
    res.status(500).json({ error: message });
  }
});

// ─── Square webhook ───────────────────────────────────────────────────────────
router.post("/payments/webhook", async (req, res) => {
  try {
    const event = req.body as {
      type?: string;
      data?: { object?: { payment?: { id?: string; order_id?: string } } };
    };

    if (event.type === "payment.completed") {
      const payment = event.data?.object?.payment;
      if (payment?.order_id) {
        await db
          .update(paymentsTable)
          .set({ status: "completed", paid: true, squarePaymentId: payment.id, updatedAt: new Date() })
          .where(eq(paymentsTable.squareOrderId, payment.order_id));
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Webhook handling failed");
    res.status(500).json({ error: "Webhook error" });
  }
});

// ─── Payment status ───────────────────────────────────────────────────────────
router.get("/payments/status/:orderId", async (req, res) => {
  try {
    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.squareOrderId, req.params.orderId));

    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json({ status: payment.status, paid: payment.paid, plan: payment.plan });
  } catch (err) {
    req.log.error({ err }, "Payment status check failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
