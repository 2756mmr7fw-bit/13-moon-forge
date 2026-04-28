import { Router } from "express";
import { db, referralsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { randomBytes } from "crypto";

const router = Router();

function makeCode(userId: string): string {
  const hash = Buffer.from(userId).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `${hash}${rand}`;
}

// GET /api/referral — get or create my referral code + count
router.get("/referral", async (req, res) => {
  const userId = req.userId;
  if (!userId || userId.startsWith("anon-")) return res.status(401).json({ error: "Unauthorized" });

  try {
    const existing = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.referrerId, userId))
      .limit(1);

    let code: string;
    if (existing.length > 0) {
      code = existing[0].code;
    } else {
      code = makeCode(userId);
      await db.insert(referralsTable).values({ referrerId: userId, code });
    }

    const [claimedRow] = await db
      .select({ count: count() })
      .from(referralsTable)
      .where(eq(referralsTable.referrerId, userId));

    const claimed = Math.max(0, (claimedRow?.count ?? 1) - 1);

    const domain =
      process.env.REPLIT_DOMAINS?.split(",")[0] ??
      process.env.APP_DOMAIN ??
      "13moonforge.ai";

    res.json({
      code,
      referralUrl: `https://${domain}/?ref=${code}`,
      successfulReferrals: claimed,
      bonusMessages: claimed * 50,
    });
  } catch (err) {
    req.log?.error({ err }, "referral: get failed");
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/referral/claim — claim a referral code (called when a new user signs up with ?ref=)
router.post("/referral/claim", async (req, res) => {
  const userId = req.userId;
  const { code } = req.body ?? {};
  if (!userId || userId.startsWith("anon-") || !code) return res.status(400).json({ error: "Invalid" });

  try {
    const [referral] = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.code, String(code).toUpperCase()))
      .limit(1);

    if (!referral) return res.status(404).json({ error: "Code not found" });
    if (referral.referrerId === userId) return res.status(400).json({ error: "Cannot refer yourself" });
    if (referral.claimedAt) return res.status(409).json({ error: "Already claimed" });

    await db
      .update(referralsTable)
      .set({ referredUserId: userId, claimedAt: new Date() })
      .where(eq(referralsTable.code, referral.code));

    res.json({ success: true, bonusMessages: 50 });
  } catch (err) {
    req.log?.error({ err }, "referral: claim failed");
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
