import { logger } from "./logger";

const FROM = "13 Moon Forge <noreply@updates.thepeoplestownsq.com>";

export interface EmailTag {
  name: string;
  value: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
  tags?: EmailTag[],
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.error("RESEND_API_KEY not set");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      text,
      html,
      ...(tags && tags.length > 0 ? { tags } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ status: res.status, err }, "Resend sendEmail failed");
    return false;
  }

  return true;
}
