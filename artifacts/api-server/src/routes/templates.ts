export type TemplateName = "blank" | "react-vite" | "express" | "static-html" | "nextjs";

export interface TemplateFile {
  path: string;
  content: string;
}

export interface Template {
  name: TemplateName;
  label: string;
  description: string;
  files: TemplateFile[];
}

const REACT_VITE: TemplateFile[] = [
  {
    path: ".gitignore",
    content: `node_modules
dist
.env
.env.local
`,
  },
  {
    path: "package.json",
    content: JSON.stringify({
      name: "my-app",
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: { dev: "vite", build: "tsc -b && vite build", preview: "vite preview" },
      dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
      devDependencies: {
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^4.3.4",
        typescript: "~5.6.2",
        vite: "^6.0.5",
      },
    }, null, 2),
  },
  {
    path: "tsconfig.json",
    content: JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        isolatedModules: true,
        moduleDetection: "force",
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
      },
      include: ["src"],
    }, null, 2),
  },
  {
    path: "vite.config.ts",
    content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`,
  },
  {
    path: "index.html",
    content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  },
  {
    path: "src/main.tsx",
    content: `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
  },
  {
    path: "src/App.tsx",
    content: `function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1>Welcome to My App</h1>
      <p>Edit <code>src/App.tsx</code> to get started.</p>
    </div>
  )
}

export default App
`,
  },
];

const EXPRESS_API: TemplateFile[] = [
  {
    path: ".gitignore",
    content: `node_modules
dist
.env
`,
  },
  {
    path: "package.json",
    content: JSON.stringify({
      name: "my-api",
      version: "0.0.0",
      private: true,
      scripts: {
        dev: "tsx watch src/index.ts",
        build: "tsc",
        start: "node dist/index.js",
      },
      dependencies: { express: "^4.21.0" },
      devDependencies: {
        "@types/express": "^5.0.0",
        "@types/node": "^22.0.0",
        tsx: "^4.19.0",
        typescript: "~5.6.2",
      },
    }, null, 2),
  },
  {
    path: "tsconfig.json",
    content: JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "CommonJS",
        lib: ["ES2022"],
        outDir: "dist",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ["src"],
    }, null, 2),
  },
  {
    path: "src/index.ts",
    content: `import express from 'express'

const app = express()
const port = process.env.PORT ?? 3000

app.use(express.json())

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Hello from my API!' })
})

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`)
})
`,
  },
];

const STATIC_HTML: TemplateFile[] = [
  {
    path: ".gitignore",
    content: ".DS_Store\n",
  },
  {
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Site</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <h1>My Site</h1>
    <nav>
      <a href="#">Home</a>
      <a href="#">About</a>
      <a href="#">Contact</a>
    </nav>
  </header>

  <main>
    <section class="hero">
      <h2>Welcome</h2>
      <p>Edit this page to build your site.</p>
    </section>
  </main>

  <footer>
    <p>&copy; 2025 My Site</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>
`,
  },
  {
    path: "style.css",
    content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, sans-serif;
  color: #1a1a2e;
  background: #f9f9f9;
  line-height: 1.6;
}

header {
  background: #1a1a2e;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

header nav a {
  color: white;
  text-decoration: none;
  margin-left: 1.5rem;
  opacity: 0.8;
}

header nav a:hover { opacity: 1; }

main { max-width: 900px; margin: 4rem auto; padding: 0 1.5rem; }

.hero { text-align: center; padding: 3rem 0; }
.hero h2 { font-size: 2.5rem; margin-bottom: 1rem; }

footer { text-align: center; padding: 2rem; color: #666; font-size: 0.875rem; }
`,
  },
  {
    path: "script.js",
    content: `console.log('My site loaded!')

document.addEventListener('DOMContentLoaded', () => {
  // Your JavaScript goes here
})
`,
  },
];

const NEXTJS: TemplateFile[] = [
  {
    path: ".gitignore",
    content: `node_modules
.next
out
.env
.env.local
`,
  },
  {
    path: "package.json",
    content: JSON.stringify({
      name: "my-nextjs-app",
      version: "0.1.0",
      private: true,
      scripts: { dev: "next dev", build: "next build", start: "next start", lint: "next lint" },
      dependencies: { next: "15.1.0", react: "^19.0.0", "react-dom": "^19.0.0" },
      devDependencies: {
        "@types/node": "^22",
        "@types/react": "^19",
        "@types/react-dom": "^19",
        typescript: "^5",
      },
    }, null, 2),
  },
  {
    path: "tsconfig.json",
    content: JSON.stringify({
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./src/*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    }, null, 2),
  },
  {
    path: "next.config.js",
    content: `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
`,
  },
  {
    path: "src/app/layout.tsx",
    content: `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My App',
  description: 'Built with Next.js',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`,
  },
  {
    path: "src/app/page.tsx",
    content: `export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1>Welcome to My Next.js App</h1>
      <p>Edit <code>src/app/page.tsx</code> to get started.</p>
    </main>
  )
}
`,
  },
];

export const TEMPLATES: Record<TemplateName, Template> = {
  blank: {
    name: "blank",
    label: "Blank",
    description: "Empty repo — start from scratch",
    files: [],
  },
  "react-vite": {
    name: "react-vite",
    label: "React + Vite",
    description: "React 19 with Vite, TypeScript, ready to deploy",
    files: REACT_VITE,
  },
  express: {
    name: "express",
    label: "Express API",
    description: "Node.js REST API with Express and TypeScript",
    files: EXPRESS_API,
  },
  "static-html": {
    name: "static-html",
    label: "Static HTML",
    description: "Plain HTML, CSS, and JS — no build step needed",
    files: STATIC_HTML,
  },
  nextjs: {
    name: "nextjs",
    label: "Next.js",
    description: "Full-stack React with Next.js App Router",
    files: NEXTJS,
  },
};
