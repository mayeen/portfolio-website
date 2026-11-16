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
| Hosting | Azure Static Web Apps (Free) | Hosts React + managed Azure Functions API at $0 |
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

## Architecture

```
CV ingestion (run when a new CV is uploaded)
  cv.pdf
    -> Azure AI Document Intelligence (prebuilt-layout, markdown output)
    -> Azure OpenAI (structured output)
    -> content/cv.md
    -> GitHub pull request (manual review of the diff)
    -> merge
    -> GitHub Action: parse cv.md -> upsert Cosmos DB, upload files to Blob Storage

Runtime
  Visitor -> Azure Static Web Apps (React)
          -> /api/* (managed Azure Functions; API keys stay server-side)
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
| 2 | Define `content/cv.md` format + parser that produces the JSON | Single source of truth | Todo |
| 3 | Move hosting Netlify -> Azure Static Web Apps; `/api/content` + Cosmos DB seed; local JSON fallback | Site reads from DB | Todo |
| 4 | Ingestion script: PDF -> Document Intelligence -> Azure OpenAI -> `cv.md` -> PR | Upload CV, review, merge | Todo |
| 5 | Chatbot `/api/chat`: streaming, grounded on cv.md, guardrails | Q&A about experience | Todo |
| 6 | Job match `/api/match` + UI (score, matched/missing skills) | Match score | Todo |
| 7 | Extras: German/English toggle, recruiter-question analytics, tailored CV view, GitHub project auto-sync | — | Todo |
| 8 | (Later) Apply flow: cover letter + CV email via Azure Communication Services | — | Deferred |

## Feature notes

### Chatbot
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
3. **Tailored CV view**: after a match, a shareable link showing the CV reordered for that job.
4. **GitHub auto-sync**: daily GitHub Action refreshes project stars, languages, last update.

### Apply flow (deferred): required safeguards when built
- Turnstile CAPTCHA, per-IP limit (e.g. 3/day), global daily cap (e.g. 30).
- Recipient verification (confirmation link) before sending the CV.
- BCC copy to myself; fixed email template; LLM only writes the letter body.
- Prompt Shields on the pasted job post; cover letter grounded strictly on `cv.md`.

## Cost estimate

| Service | Tier | Expected monthly cost |
|---|---|---|
| Azure Static Web Apps | Free | $0 |
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
