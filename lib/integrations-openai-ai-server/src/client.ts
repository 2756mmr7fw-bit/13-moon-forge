import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (_openai) return _openai;

  // Replit AI Integration (dev / Replit-hosted production)
  if (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
    return _openai;
  }

  // Standard OpenAI key — used in self-hosted / Coolify production deployments
  if (process.env.OPENAI_API_KEY) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    });
    return _openai;
  }

  throw new Error(
    "No OpenAI credentials found. Set AI_INTEGRATIONS_OPENAI_BASE_URL + AI_INTEGRATIONS_OPENAI_API_KEY " +
    "(Replit integration) or OPENAI_API_KEY (self-hosted / Coolify).",
  );
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
