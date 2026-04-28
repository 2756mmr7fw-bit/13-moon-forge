import { Router } from "express";
import { getVoiceId } from "../lib/moonVoices";

const router = Router();

const ELEVENLABS_MODEL = "eleven_turbo_v2_5";
const MAX_CHARS = 2500;

router.post("/tts", async (req, res) => {
  const { text, moon } = req.body as { text?: string; moon?: string };

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "TTS not configured" });
  }

  const voiceId = getVoiceId(moon);

  const clean = text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`{1,3}[a-z]*\n?/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, MAX_CHARS);

  if (!clean) return res.status(400).json({ error: "text is empty after cleaning" });

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text: clean,
          model_id: ELEVENLABS_MODEL,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      req.log?.warn({ status: upstream.status, detail, voiceId, moon }, "ElevenLabs TTS error");
      return res.status(502).json({ error: "TTS request failed" });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Transfer-Encoding", "chunked");

    const reader = upstream.body!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    req.log?.error({ err }, "TTS proxy error");
    if (!res.headersSent) {
      res.status(500).json({ error: "TTS failed" });
    }
  }
});

export default router;
