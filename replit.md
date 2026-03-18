# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5-mini)

## Artifacts

### `artifacts/resume-analyzer` — AI Resume Analyzer (React + Vite, deployed at `/`)
- PDF upload + drag & drop (react-dropzone)
- Job description input
- Match score, matched/missing keywords, AI suggestions
- Frontend: React, Vite, Tailwind, framer-motion

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── resume-analyzer/    # React frontend (AI Resume Analyzer)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-openai-ai-server/  # OpenAI SDK wrapper
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## API Routes

- `GET /api/healthz` — Health check
- `POST /api/resume/analyze` — Analyze resume PDF against job description
  - multipart/form-data: `resume` (PDF file) + `jobDescription` (text)
  - Returns: `matchScore`, `matchedKeywords`, `missingKeywords`, `suggestions`, `extractedText`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- `pnpm run typecheck:libs` runs `tsc --build` for the composite libs.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with resume analysis route.

- PDF parsing via `pdf-parse` (CJS interop via `createRequire`)
- Keyword extraction and match scoring (NLP)
- AI suggestions via OpenAI gpt-5-mini
- File uploads via `multer` (memory storage, PDF only, 10MB limit)

### `artifacts/resume-analyzer` (`@workspace/resume-analyzer`)

React + Vite frontend for the AI Resume Analyzer.

- File drag & drop with `react-dropzone`
- Animated results with `framer-motion`
- Score ring component, keyword badges (matched=green, missing=red)
- Collapsible extracted text section

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec and Orval codegen config.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks from the OpenAPI spec.

### `lib/integrations-openai-ai-server` (`@workspace/integrations-openai-ai-server`)

Pre-configured OpenAI SDK client using Replit AI Integrations env vars.

### `scripts` (`@workspace/scripts`)

Utility scripts package.
