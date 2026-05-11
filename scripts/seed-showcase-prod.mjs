// Run with: DATABASE_URL=$DATABASE_URL_PROD node scripts/seed-showcase-prod.mjs
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const pg = require(path.resolve("lib/db/node_modules/.pnpm/pg@8.13.3/node_modules/pg/lib/index.js"));

const Pool = pg.Pool ?? require("pg").Pool;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const apps = [
    // ── Featured: The Forge & 13 Moons family ───────────────────────────
    {
      name: "The People's Town Square",
      tagline: "A digital commons for real community",
      description:
        "The People's Town Square is a place where community comes first — no ads, no algorithm, no hidden agenda. A gathering space for real conversations, local connections, and collective action. Built for the people, by the people.",
      website_url: "https://thepeoplestownsquare.com",
      category: "social",
      listing_type: "hosted",
      is_featured: true,
      is_active: true,
      is_placeholder: false,
      builder_name: "13 Moons",
    },
    {
      name: "13 Moon Forge",
      tagline: "AI-powered building platform for the self-sovereign creator",
      description:
        "The Forge is where builders bring their ideas to life — AI assistance, project management, self-hosting tools, and more. Build what you own, own what you build.",
      website_url: "https://13moonforge.ai",
      category: "tools",
      listing_type: "hosted",
      is_featured: true,
      is_active: true,
      is_placeholder: false,
      builder_name: "13 Moons",
    },
    {
      name: "13 Moon Antivirus",
      tagline: "AI-powered protection built for the people",
      description:
        "Real-time threat detection and file scanning powered by the 13 Moons AI system. Lightweight, fast, and built with your privacy in mind — no data sold, no subscriptions required.",
      website_url: "https://13moonantivirus.ai",
      category: "tools",
      listing_type: "hosted",
      is_featured: true,
      is_active: true,
      is_placeholder: false,
      builder_name: "13 Moons",
    },
    {
      name: "13 Moon Call Guardian",
      tagline: "Stop scam calls before they stop you",
      description:
        "AI-powered call screening that identifies and blocks scam calls in real time. Built for families, seniors, and anyone tired of being targeted by fraudsters. Your phone, protected.",
      website_url: "https://13mooncallguardian.ai",
      category: "tools",
      listing_type: "hosted",
      is_featured: true,
      is_active: true,
      is_placeholder: false,
      builder_name: "13 Moons",
    },
    {
      name: "13 Moon Film Editor",
      tagline: "A cinematic editor with an AI co-director built in",
      description:
        "Professional multi-track video editing meets AI guidance from the 13 Moons system. Cut, trim, layer audio and visuals, then ask your AI co-director for direction — built for independent filmmakers and creators.",
      website_url: null,
      category: "creative",
      listing_type: "hosted",
      is_featured: true,
      is_active: true,
      is_placeholder: false,
      builder_name: "13 Moons",
    },
    // ── Placeholders in community (until 12 real apps join) ──────────────
    {
      name: "The People's Town Square",
      tagline: "A digital commons for real community",
      description:
        "No ads, no algorithm, no hidden agenda. A gathering space for real conversations and collective action.",
      website_url: "https://thepeoplestownsquare.com",
      category: "social",
      listing_type: "hosted",
      is_featured: false,
      is_active: true,
      is_placeholder: true,
      builder_name: "13 Moons",
    },
    {
      name: "13 Moon Antivirus",
      tagline: "AI-powered protection built for the people",
      description: "Real-time threat detection and file scanning by 13 Moons.",
      website_url: "https://13moonantivirus.ai",
      category: "tools",
      listing_type: "hosted",
      is_featured: false,
      is_active: true,
      is_placeholder: true,
      builder_name: "13 Moons",
    },
    {
      name: "13 Moon Call Guardian",
      tagline: "Stop scam calls before they stop you",
      description: "AI-powered call screening that blocks scam calls in real time.",
      website_url: "https://13mooncallguardian.ai",
      category: "tools",
      listing_type: "hosted",
      is_featured: false,
      is_active: true,
      is_placeholder: true,
      builder_name: "13 Moons",
    },
  ];

  for (const app of apps) {
    await pool.query(
      `INSERT INTO showcase_apps
        (name,tagline,description,website_url,category,listing_type,is_featured,is_active,is_placeholder,builder_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        app.name, app.tagline, app.description, app.website_url ?? null,
        app.category, app.listing_type, app.is_featured, app.is_active,
        app.is_placeholder, app.builder_name,
      ]
    );
    console.log(`✓  ${app.name}  featured=${app.is_featured}  placeholder=${app.is_placeholder}`);
  }

  await pool.end();
  console.log("\nAll done — production showcase seeded.");
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
