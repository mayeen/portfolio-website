# `content/cv.md` format

`content/cv.md` is the master CV and the single source of truth.

- **Website:** `npm run content` turns it into `src/data/*.json`. The site shows the `ai` wording.
- **Chatbot (Phase 5):** reads the whole file, including every role's wording and the `details` blocks.
- **Ingestion (Phase 4):** Azure OpenAI must produce exactly this format.

`npm run build` runs `npm run content:check` first. The build fails if `src/data/` is out of date or `cv.md` is invalid.

## Grammar

Four building blocks, nothing else:

| Line | Meaning |
|---|---|
| `## Section` | One of the fixed sections below |
| `### Title` | An item inside a section (a job, a project, ...) |
| `- key: value` | A field of the current section or item |
| `#### variant` | A wording block; following `- ` lines are bullets, other lines are paragraph text |

- `# Heading` and `<!-- comments -->` are ignored.
- List fields (`technologies`, `skills`, `coursework`) are comma-separated.
- Inline emphasis: `**bold**`. No other markdown is rendered.
- Dates: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. Ranges: `2019-04 to 2022-03`, `2025-05 to present`. A single date means "completed in".
- Paths starting with `/` must exist in `public/`. Other links must be `http(s)://`.

## Variants (role wording)

| Variant | Shown on website | Used by chatbot |
|---|---|---|
| `ai` | ✅ (preferred) | ✅ |
| `software` | Only if no `ai` block exists | ✅ |
| `frontend` | ❌ (reserved for a future CV) | ✅ |
| `details` | ❌ | ✅ Extra facts, older wording |

Facts (title, organisation, dates, location, technologies) are written **once** per item. Only the wording changes per variant.

## Sections

| Section | Kind | Required | Optional |
|---|---|---|---|
| `Profile` | fields | `name`, `shortName`, `email` | `location`, `phone`, `whatsapp`, `website`, `availability` (used by the chatbot) |
| `Headline` | variants | `ai` or `software` | |
| `Summary` | variants (supports `**bold**`) | `ai` or `software` | |
| `About` | variants | | falls back to Summary |
| `Stats` | items: `### Label` | `value`, `icon` | |
| `Socials` | items: `### Platform` | `url`, `icon` | `handle` |
| `Languages` | items: `### Language` | `level` | |
| `Downloads` | items: `### Label` | `role`, `lang`, `file` | |
| `Experience` | items: `### Role @ Company` | `id`, `dates`, `location`, `technologies`, `ai`/`software` block | `summary`, other variants |
| `Education` | items: `### Degree @ Institution` | `id`, `dates`, `location` | `coursework` |
| `Projects` | items: `### Title` | `id`, `technologies`, `ai`/`software` block | `image`, `github`, `demo` |
| `Skills` | items: `### Category` | `id`, `skills` | `site: no` hides it from the website |
| `Certifications` | items: `### Name` | `id`, `issuer` | `code`, `issued`, `credentialId`, `certificationNumber`, `image`, `icon`, `verifyUrl` |

Notes:
- `id` is kebab-case and unique within its section.
- Skills may carry a level: `C# (Advanced)`. Allowed levels: Basic, Intermediate, Advanced, Expert.
- The website "Download CV" button uses the `Downloads` entry with `role: ai`, `lang: en`. The German link uses `lang: de`.
- Order in the file is the order on the website.

## Example

```markdown
## Experience

### System Developer @ Hogarth Dhaka
- id: hogarth
- dates: 2019-04 to 2022-03
- location: Bangladesh
- summary: Software solution provider for foreign clients
- technologies: C#, .NET Core, Angular, SQL Server

#### ai
- Built **.NET** backend services and an **Angular** dashboard ...

#### software
- Built scalable **C# (.NET)** backends and **RESTful APIs** ...

#### details
- Integrated **30+ third-party APIs** ...
```

## Validation

The parser stops with `cv.md:<line>: <problem>` for: unknown sections, fields or variants; missing required fields; bad dates or start after end; duplicate or non-kebab-case ids; missing website wording; unknown skill levels; missing files in `public/`; malformed lines.

Test a draft without touching the site: `CV_FILE=path/to/draft.md node scripts/build-content.mjs --check`

## Tests

| Command | What it runs |
|---|---|
| `npm run test:content` | Parser tests in `scripts/build-content.test.mjs`: every validation rule, variant fallback, dates, and that the real `cv.md` is valid and `src/data/` is up to date |
| `npm run test:app` | React tests in `src/**/*.test.js`: the whole page renders from the data, plus unit tests for helpers and components |
| `npm run test:all` | Both |

When you add a field or rule to the parser, add a case to the `validation errors` table in `scripts/build-content.test.mjs`.
