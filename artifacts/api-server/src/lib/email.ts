const FROM = "13 Moon Forge <noreply@updates.thepeoplestownsq.com>";

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, text, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend failed (${res.status}):`, err);
    return false;
  }

  return true;
}
