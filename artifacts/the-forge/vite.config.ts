import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    // Inject a clerk-js preload script at build time.
    //
    // @clerk/clerk-react@5.61.3 dynamically loads clerk-js with async:true and
    // then polls for window.Clerk for up to 15 s. This is normally fine, but in
    // practice the first page load is slow because the script fetch hasn't started
    // yet when the poll begins.
    //
    // By injecting a <script defer> tag with data-clerk-js-script BEFORE the React
    // module script, the browser fetches clerk-js in parallel with the HTML parse.
    // When loadClerkJsScript runs it finds the existing script via
    //   document.querySelector("script[data-clerk-js-script]")
    // and reuses it instead of creating a second one.  The poll resolves as soon
    // as clerk-js finishes loading (window.Clerk is set), typically in < 1 s.
    //
    // Using a Vite plugin (not document.write) is required because Chrome 55+
    // blocks document.write() calls that inject parser-blocking cross-origin
    // scripts on HTTP/2 pages.
    {
      name: "clerk-js-preload",
      transformIndexHtml: {
        order: "pre",
        handler(html: string) {
          const pk = process.env.VITE_CLERK_PUBLISHABLE_KEY;
          if (!pk) return html;
          try {
            const part = pk.split("_")[2];
            if (!part) return html;
            const host = Buffer.from(part, "base64")
              .toString("utf8")
              .replace(/\$+$/, "");
            if (!host || !host.includes(".")) return html;
            const url = `https://${host}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
            const tag = `  <script src="${url}" defer data-clerk-js-script data-clerk-publishable-key="${pk}" crossorigin="anonymous"></script>`;
            return html.replace("</head>", `${tag}\n  </head>`);
          } catch {
            return html;
          }
        },
      },
    },
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/x-auth": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/x-auth/, "/api/auth"),
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/x-auth": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/x-auth/, "/api/auth"),
      },
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
