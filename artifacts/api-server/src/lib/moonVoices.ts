/**
 * ElevenLabs voice IDs per Moon.
 * To update: Go to elevenlabs.io → Voices → click a voice → copy the Voice ID.
 * Replace each value below with the voice you want for that Moon.
 */
export const MOON_VOICES: Record<string, string> = {
  forge:   "TxGEqnHWrfWFTfGW9XjX", // Josh — deep, confident builder
  hawk:    "N2lVS1w4EtoT3dr4eOWO", // Callum — sharp, fast, intense
  sage:    "XrExE9yKIg1WjnnlVkGX", // Matilda — warm, patient teacher
  flint:   "VR6AewLTigWG4xSOukaG", // Arnold — crisp, technical
  creed:   "onwK4e9ZLuTAKqWW03F9", // Daniel — authoritative counsel
  quill:   "ErXwobaYiN019PkySvjV", // Antoni — expressive writer
};

export const DEFAULT_VOICE_ID = "29vD33N1CtxCmqQRPOHJ"; // Drew — fallback

export function getVoiceId(moon?: string): string {
  if (!moon) return DEFAULT_VOICE_ID;
  return MOON_VOICES[moon.toLowerCase()] ?? DEFAULT_VOICE_ID;
}
