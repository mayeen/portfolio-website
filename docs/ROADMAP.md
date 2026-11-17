# Portfolio Roadmap: Data-Driven + Azure AI

Living plan for turning the portfolio into a CV-driven, AI-powered site.
Last updated: 2026-11-16.

## Goals

1. All portfolio content (profile, experience, education, skills, projects, certifications) lives in structured data, not hardcoded JSX.
2. A new CV (PDF) is converted automatically into a reviewed `content/cv.md`, which then updates the database.
3. A chatbot on the site answers questions about my experience, grounded only in my CV.
4. Recruiters can paste a job post and get a match score with matched skills and gaps.
5. Use Azure AI services wherever sensible (building on the AZ AI-900 certification), at the lowest possible cost.

## Decisions

| Topic | Decision | Reason |
|---|---|---|
| Source of truth | `content/cv.md` committed to git | Version history, human review via PR, AI can't silently publish wrong facts |
| Hosting | **Netlify** (free) for the React site at `kazishahriar.dev` (Cloudflare DNS); `/api/*` proxied to Azure | Azure for Students subscription only allows Sweden Central, Belgium Central, Italy North, Poland Central, Austria East; Static Web Apps is not offered in any of them. Azure alternatives in Sweden cost $13–35/month or lack HTTPS on custom domains |
| Azure region | **Sweden Central** for all Azure resources (Functions, Cosmos DB, OpenAI, Document Intelligence) | Allowed by the student subscription; a primary Azure OpenAI region |
| API | Standalone **Azure Function App** (Consumption plan, Sweden Central), reached via Netlify proxy `/api/*` | Same origin for the browser (no CORS); free monthly grant covers portfolio traffic |
| Database | Azure Cosmos DB free tier (NoSQL) | 1000 RU/s + 25 GB free forever; CV sections map naturally to JSON documents |
| PDF to markdown | Azure AI Document Intelligence (prebuilt-layout, markdown output), F0 tier | 500 pages/month free |
| LLM | Azure OpenAI via AI Foundry, cheapest capable mini model | About $0.001–0.003 per chat |
| Retrieval | **No RAG / vector DB.** Whole `cv.md` goes into the system prompt | CV is ~3–5k tokens; cheaper, simpler, more accurate |
| Guardrails | Azure AI Content Safety (Prompt Shields), F0 tier | Protects against prompt injection in pasted job posts |
| Bot protection | Cloudflare Turnstile + per-IP rate limits | Free |
| Files (CV PDF, badges) | Azure Blob Storage | Cents per month |
| Job-match score | LLM returns structured fields; **score is computed in code** | Consistent and explainable, not a vibe number |
| Email cover letter + CV | **Deferred** to a later iteration | Highest abuse risk; build after guardrails are proven |
| Book a call | **Skipped** this iteration | Not needed yet |
| Multiple CV versions | One master `cv.md` holds role-specific wording (`ai`, `software`, later `frontend`) per job/project; facts (title, company, dates, location) stored once | Each CV version tailors wording, not facts; a single place for facts prevents drift |
| Website positioning | Website shows **only the AI Engineer wording**; no role toggle. All roles and dates always shown | AI Engineer is the target role; recruiters cross-check CV/LinkedIn, so facts are never hidden |
| Role-aware chatbot | Chatbot and job match read **all** role versions and answer from the most relevant one | e.g. a .NET question is answered from the `software` wording |

## Architecture

```
CV ingestion (GitHub Action ingest-cv.yml, on push of a PDF in public/cv/)
  cv.pdf
    -> Azure AI Document Intelligence (prebuilt-layout, markdown output)
    -> Azure OpenAI (structured output)
    -> content/cv.md
    -> GitHub pull request (manual review of the diff)
    -> merge
    -> GitHub Action: parse cv.md -> upsert Cosmos DB
    -> Netlify deploys the site

Runtime
  Visitor -> kazishahriar.dev (Cloudflare DNS) -> Netlify (React)
          -> /api/* proxied by Netlify to Azure Functions (Sweden Central; API keys stay server-side)
               GET  /api/content  -> Cosmos DB
               POST /api/chat     -> Azure OpenAI with cv.md as context (streaming)
               POST /api/match    -> structured match result + computed score
             Every AI endpoint: Turnstile, rate limit, Prompt Shields, max_tokens cap
```

## Data model

One Cosmos DB container per type (or one container partitioned by `type`):

- `profile`: name, title, summary, about, stats[], contact, socials[], cvUrl
- `experience`: role, company, location, startDate, endDate, summary, bullets[], technologies[], order
- `education`: degree, institution, location, startDate, endDate, coursework[], order
- `skillCategories`: name, skills[{ name, level }], order
- `projects`: title, description, image, technologies[], github, demo, order
- `certifications`: name, code, issuer, issueDate, credentialId, verifyUrl, badge, order

Dates use `YYYY-MM` (or `YYYY`); `endDate: null` means "present".
Inline emphasis uses `**bold**` markdown in strings.

## Phases

| # | Phase | Output | Status |
|---|---|---|---|
| 1 | Refactor frontend to render from JSON data; add Certifications section | Same site, data in `src/data/` | Done |
| 2 | Define master `content/cv.md` format (shared facts + per-role wording) + parser that outputs the `ai` version as site JSON | Single source of truth | Done |
| 3 | Connect `kazishahriar.dev` to Netlify (+ redirect from netlify.app); Azure Function App `/api/content` + Cosmos DB in Sweden Central; sync on push; `useContent()` with bundled-JSON fallback | Site reads from DB | Done |
| 4 | Ingestion script: one or more role CV PDFs -> Document Intelligence -> Azure OpenAI -> merge into `cv.md` (flag fact conflicts between CVs) -> PR. GitHub Action `ingest-cv.yml` runs it when a PDF in `public/cv/` changes and opens the PR | Upload CVs, review, merge | Built; first live Action run pending |
| 5 | Chatbot `/api/chat`: streaming, grounded on cv.md, guardrails | Q&A about experience | Todo |
| 6 | Job match `/api/match` + UI (score, matched/missing skills) | Match score | Todo |
| 7 | Extras: German/English toggle, recruiter-question analytics, GitHub project auto-sync | — | Todo |
| 8 | (Later) Apply flow: cover letter + CV email via Azure Communication Services | — | Deferred |

## Feature notes

### Chatbot
- Role-aware: picks the role wording (`ai`, `software`, ...) that best fits the question.
- System prompt: answer only from `cv.md`; say so when information is not in the CV; never invent facts.
- Keep ~10 turns of history; cap `max_tokens`.

### Job match
Structured output from the model:
```json
{ "required_skills": [], "nice_to_have": [], "matched": [], "missing": [],
  "experience_fit": 0.0, "summary": "" }
```
The score (0–100) is computed in code from weighted required / nice-to-have matches and experience fit.

### Extras (approved)
1. **German/English toggle**: LLM answers in the visitor's language at no extra cost.
2. **Recruiter-question analytics**: log anonymized questions and match gaps to Cosmos DB; weekly review.
3. ~~Tailored CV view~~: dropped; the website shows one (AI Engineer) version and the chatbot handles role-specific questions.
4. **GitHub auto-sync**: daily GitHub Action refreshes project stars, languages, last update.

### Apply flow (deferred): required safeguards when built
- Turnstile CAPTCHA, per-IP limit (e.g. 3/day), global daily cap (e.g. 30).
- Recipient verification (confirmation link) before sending the CV.
- BCC copy to myself; fixed email template; LLM only writes the letter body.
- Prompt Shields on the pasted job post; cover letter grounded strictly on `cv.md`.

## Cost estimate

| Service | Tier | Expected monthly cost |
|---|---|---|
| Netlify (site hosting) | Free | $0 |
| Azure Functions | Consumption, free grant | $0 |
| Document Intelligence | F0 (500 pages) | $0 |
| Azure OpenAI | Pay-as-you-go, mini model | ~$1–3 per 1k chats |
| Cosmos DB | Free tier | $0 |
| Blob Storage | Standard | < $0.10 |
| AI Content Safety | F0 (5k records) | $0 |
| Cloudflare Turnstile | Free | $0 |
| **Total** | | **~$0–5** |

Cost controls: check **Azure for Students** ($100 credit, no card); set an Azure budget alert at $5 on day one; rate-limit every AI endpoint; cap `max_tokens`.

## Housekeeping (from project review)
- Remove unused `puppeteer` dependency.
- ~~Remove debug `console.log` in `ProjectsCard.jsx`.~~ Done (Phase 1).
- Consider migrating Create React App -> Vite (CRA is deprecated).
- ~~Header `window.addEventListener` runs on every render; move into `useEffect`.~~ Done (Phase 1).
