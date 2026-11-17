# kazishahriar.dev

Personal portfolio of **Kazi Mostafa Shahriar**, AI/ML Engineer.
Live at **[kazishahriar.dev](https://kazishahriar.dev)**.

The site is driven by a single Markdown CV (`content/cv.md`) and is extended step by step with Azure AI: automatic CV ingestion (Document Intelligence + Azure OpenAI), a chatbot that answers questions about my experience ("Ask my AI", grounded on the CV), and later a job-post match score.

## How it works

```
CV PDFs (public/cv/)
   │  npm run ingest  (Azure AI Document Intelligence -> Azure OpenAI -> merge)
   ▼
content/cv.md  ── single source of truth, reviewed in git ──┐
   │  npm run content                                        │  push to main
   ▼                                                         ▼
src/data/*.json  ── bundled into the React site      GitHub Action: sync -> Azure Cosmos DB
   │                                                         │
   ▼                                                         ▼
kazishahriar.dev (Netlify)  ── /api/content, /api/chat ──► Azure Function (Sweden Central) ──► Cosmos DB
                                                                        └─► Azure OpenAI gpt-4.1-mini (chat)
```

- The page renders instantly from the bundled data, then swaps in fresh content from `/api/content` if it is newer. If the API is slow or down, visitors notice nothing.
- `content/cv.md` stores every fact once, with role-specific wording per job (`ai`, `software`, `details`). The website shows the AI Engineer wording; the chatbot reads all of it and picks the wording that fits the question.
- The chatbot (`POST /api/chat`) sends the whole cv.md (about 4k tokens) to gpt-4.1-mini with every question; no vector search needed. Job status and durations are computed in code so the model never does date arithmetic. Guardrails: Cloudflare Turnstile (invisible bot check on the first question, then a signed 10-minute session), input and history limits, `max_tokens`, per-IP and daily rate limits, and the Azure content filter with Prompt Shields.
- Every question is logged anonymously to Application Insights (no IP, emails and phone numbers masked) to see what recruiters ask. See [Recruiter questions](#recruiter-questions).
- CV ingestion only updates wording. Fact differences between a PDF and `cv.md` (dates, titles, contact details) are reported, never applied automatically.

## Tech stack

| Area | Technology |
|---|---|
| Frontend | React 19 (Create React App), plain CSS |
| Hosting | Netlify, custom domain via Cloudflare DNS |
| API | Azure Functions (Node.js 22, Flex Consumption, Sweden Central) |
| Database | Azure Cosmos DB for NoSQL (free tier) |
| AI | Azure AI Foundry: Document Intelligence (prebuilt-layout), Azure OpenAI `gpt-4.1-mini` |
| CI/CD | GitHub Actions, Netlify builds |
| Tests | Node test runner, Jest + React Testing Library |

## Getting started

```bash
npm install            # website and scripts
cd api && npm install  # Azure Functions API (only needed to work on the API)
cp .env.example .env   # then fill in the keys (only needed for sync and ingest)
npm start              # http://localhost:3000
```

Locally, `/api` does not exist: the site uses the bundled data, and the chat widget shows its "unavailable" message.

## Commands

### Website

| Command | What it does |
|---|---|
| `npm start` | Development server at http://localhost:3000 |
| `npm run build` | Production build into `build/`. Runs `content:check` first and fails if `content/cv.md` is invalid or `src/data` is stale |

### Content

| Command | What it does |
|---|---|
| `npm run content` | Validate `content/cv.md` and regenerate `src/data/*.json`. Run after every edit of `cv.md` |
| `npm run content:check` | Validate only; fail if `src/data` is out of date (used by the build) |
| `npm run sync` | Push the content to Azure Cosmos DB (upserts changed documents, deletes removed ones). Needs `COSMOS_*` in `.env` |
| `npm run sync -- --dry-run` | Show what the sync would change, write nothing |

### CV ingestion (Azure AI)

| Command | What it does |
|---|---|
| `npm run ingest -- ai <pdf> software <pdf>` | Read the CV PDFs with Document Intelligence, extract them with Azure OpenAI, merge each role's wording into `content/cv.md`, print a report. Review with `git diff content/cv.md`, then run `npm run content` |
| `npm run ingest -- ... --dry-run` | Report only, `cv.md` unchanged |
| `npm run ingest -- ... --cached` | Reuse the last extraction from `content/ingest/` (no Azure calls, no cost) |
| `npm run ingest -- --files <pdf> ...` | Role taken from the file name (`*_AI_Engineer_EN.pdf` -> `ai`, `*_Software_Engineer_EN.pdf` -> `software`); German CVs are skipped. Used by the GitHub Action |

Example:

```bash
npm run ingest -- ai public/cv/Kazi_Mostafa_Shahriar_CV_AI_Engineer_EN.pdf \
                  software public/cv/Kazi_Mostafa_Shahriar_CV_Software_Engineer_EN.pdf --dry-run
```

Roles: `ai`, `software`, `frontend`. Usually you do not run this yourself: replace a PDF in `public/cv/`, push, and the **Ingest CV PDFs** GitHub Action opens a pull request with the merged wording and the report (fact conflicts included). Merge it and the site and Cosmos DB update. Intermediate files (layout markdown, extracted JSON, report) are written to `content/ingest/` (gitignored).

### Tests

| Command | What it runs |
|---|---|
| `npm run test:all` | Everything below (also runs on every Netlify deploy) |
| `npm run test:content` | Content parser, Cosmos sync, CV ingestion (merge + Azure calls with fakes) |
| `npm run test:api` | Azure Functions `GET /api/content` and `POST /api/chat` (fake Azure OpenAI) |
| `npm run test:app` | React components (incl. the chat widget) and the content provider |
| `npm test` | React tests in watch mode |

No test needs Azure access or keys.

## Environment variables

Copy `.env.example` to `.env` (gitignored). Never commit real keys.

| Variable | Used by | Where to find it |
|---|---|---|
| `COSMOS_ENDPOINT`, `COSMOS_KEY` | `npm run sync` | Azure portal > Cosmos DB account > Keys (read-write key) |
| `AZURE_AI_ENDPOINT`, `AZURE_AI_KEY` | `npm run ingest` | Azure portal > Foundry resource > Keys and Endpoint |
| `AZURE_OPENAI_DEPLOYMENT` | `npm run ingest` | Foundry portal > Models (deployment name, e.g. `gpt-4.1-mini`) |

| `REACT_APP_TURNSTILE_SITE_KEY` | Website build (public) | Cloudflare > Turnstile > widget. Set in `netlify.toml`; locally optional |

In the cloud, the same values live in GitHub repository secrets (`COSMOS_ENDPOINT`, `COSMOS_KEY`, `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`, `AZURE_AI_ENDPOINT`, `AZURE_AI_KEY`, `AZURE_OPENAI_DEPLOYMENT`) and in the Function App's settings (`COSMOS_*` with the **read-only** key, `AZURE_AI_*` for the chatbot, `TURNSTILE_SECRET_KEY` for bot protection; without it the check is off).

## Recruiter questions

Each chat question is one trace line `chat-question {json}` in Application Insights (`appi-kazishahriar` > Logs):

```kusto
traces
| where message startswith "chat-question "
| extend d = parse_json(substring(message, 14))
| project timestamp, question = tostring(d.q), status = tostring(d.status), turn = toint(d.turn), tokensIn = toint(d.tokensIn), tokensOut = toint(d.tokensOut)
| order by timestamp desc
```

`status` is `answered`, `filtered` (content filter), `error` or `rate-limited`; `turn` 1 is the first question of a conversation. Data is deleted automatically after the Application Insights retention period.

## Deployment

Everything deploys on push to `main`:

| What | How | Triggered by |
|---|---|---|
| Website | Netlify runs `npm run test:all && npm run build` (`netlify.toml`) | any push |
| CV ingestion PR | `.github/workflows/ingest-cv.yml`: tests, ingest the changed English PDFs, open a PR with `cv.md` + report | changes to `public/cv/*.pdf` |
| Content database | `.github/workflows/sync-content.yml`: tests, then `npm run sync` | changes to `content/cv.md` or the sync code |
| API | `.github/workflows/deploy-api.yml`: tests, deploy to the Function App, live smoke test | changes to `api/` |

`netlify.toml` also proxies `/api/*` to the Azure Function App, adds security headers, and redirects the old `kazishahriar.netlify.app` address to `kazishahriar.dev`.

## Project structure

```
content/cv.md            Master CV (source of truth). Format: docs/CV_FORMAT.md
public/cv/               CV PDFs offered for download (AI / Software Engineer, EN / DE)
src/
  components/            One folder per page section
  content/               ContentProvider + useContent() (bundled data, then /api/content)
  data/                  Generated from cv.md by `npm run content`; do not edit by hand
  utils/                 Date formatting, **bold** rendering
scripts/
  build-content.mjs      cv.md parser and validator
  sync-cosmos.mjs        Cosmos DB sync
  ingest-cv.mjs          CV ingestion CLI
  ingest/                Azure AI calls and the merge logic
api/                     Azure Functions app (GET /api/content, POST /api/chat)
docs/
  ROADMAP.md             Plan, decisions, costs and phase status
  CV_FORMAT.md           cv.md format reference
.github/workflows/       CV ingestion PR, content sync, API deployment
```

## Roadmap

| Phase | Status |
|---|---|
| 1. Data-driven frontend, certifications section | Done |
| 2. `content/cv.md` as single source of truth | Done |
| 3. Custom domain, Cosmos DB, Azure Function API, live content | Done |
| 4. CV ingestion with Azure AI Document Intelligence + Azure OpenAI | Done |
| 5. Chatbot about my experience, grounded on my CV | Live (hardening next: Turnstile, streaming) |
| 6. Job-post match score | Planned |
| 7. German/English, recruiter-question analytics, GitHub project sync | Planned |

Details, decisions and costs: [docs/ROADMAP.md](docs/ROADMAP.md).
