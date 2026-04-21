import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SYSTEM_PROMPT = `You are Site Forge — an expert web designer who builds complete, professional, mobile-responsive single-page business websites as a single HTML file.

OUTPUT RULES (critical — follow exactly):
- Output ONLY the complete HTML document — no markdown, no code fences, no explanation before or after
- Start immediately with <!DOCTYPE html> and end with </html>
- Embed ALL CSS inside a <style> tag in <head>
- Load Google Fonts via @import url() inside the <style> tag
- Use vanilla JS only if needed — no frameworks, no external JS libraries
- The page must work perfectly when saved as a .html file and uploaded to Cloudflare Pages

DESIGN REQUIREMENTS:
- Include <meta name="viewport" content="width=device-width, initial-scale=1.0"> for mobile
- Mobile-first responsive layout using CSS Grid and Flexbox
- Modern typography with clear visual hierarchy — no system fonts, use Google Fonts
- Brand color used for: primary buttons, section accents, borders, highlights
- Smooth hover effects and transitions on all interactive elements
- Subtle fade-in / slide-up CSS animations for a premium feel
- High contrast ratio — all text must be clearly readable
- Clean, professional, looks like a real $2,000+ agency build

REQUIRED SECTIONS (build all of these):
1. Sticky <header> — business name on the left as logo text, phone number and CTA button on the right
2. Full-viewport #hero — powerful headline (never "Welcome to X"), one-line subheadline, large CTA button, decorative gradient or shape
3. #services — "What We Do" or "Our Services" — 3–4 service cards in a CSS Grid with icons (unicode or HTML entities)
4. #about — "Why Choose Us" — 2 short paragraphs + 3 trust bullets with ✓ or ★ icons
5. #contact — phone, email, location displayed cleanly + a styled contact form (name, email, message, submit)
6. <footer> — copyright 2025, business name, quick nav links

CONTENT RULES:
- Use the EXACT business name, phone, email, and location provided — never use placeholders or "Your Business"
- Write compelling, specific marketing copy for this business type — not generic content
- The hero headline must be specific and powerful (e.g. "Austin's Most Trusted AC Repair" not "Welcome to Smith HVAC")
- Services must be specific to this business type
- If the business has special highlights provided, feature them prominently
- Every page section must feel complete — no Lorem Ipsum, no placeholder text anywhere`;

router.post("/site-forge/generate", async (req, res) => {
  const {
    businessName, type, location, phone, email,
    cta, style, color, currentUrl, extra,
  } = req.body as {
    businessName: string;
    type: string;
    location?: string;
    phone?: string;
    email?: string;
    cta?: string;
    style?: string;
    color?: string;
    currentUrl?: string;
    extra?: string;
  };

  if (!businessName || !type) {
    return res.status(400).json({ error: "Business name and type are required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const userMessage = `Build a complete professional website for this business:

Business Name: ${businessName}
Type of Business: ${type}
Location: ${location || "Not specified"}
Phone: ${phone || "Not provided"}
Email: ${email || "Not provided"}
Primary Call-to-Action button text: ${cta || "Contact Us"}
Design Style: ${style || "Clean & Professional"}
Brand Color (hex): ${color || "#7c3aed"}
Special Highlights / Notes: ${extra || "None"}
${currentUrl ? `Current website they are moving away from: ${currentUrl}` : ""}

Generate the complete, deployment-ready HTML file now. Output only raw HTML starting with <!DOCTYPE html>.`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) send({ choices: [{ delta: { content: delta } }] });
    }

    send("[DONE]");
    res.end();
  } catch (err) {
    req.log.error({ err }, "site-forge stream error");
    send({ error: "AI request failed" });
    res.end();
  }
});

export default router;
