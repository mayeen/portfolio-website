// Azure AI calls for CV ingestion, via the Foundry resource (one endpoint + key for both services).
//   analyzeLayout: Document Intelligence prebuilt-layout -> markdown
//   extractCv:     Azure OpenAI chat completion with a strict JSON schema -> structured CV
// fetch and sleep are injectable so tests run without Azure.

const DI_API_VERSION = '2024-11-30';
const OPENAI_API_VERSION = '2024-10-21';

const base = (endpoint) => (endpoint.endsWith('/') ? endpoint : `${endpoint}/`);
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function errorText(response) {
    try {
        const body = await response.json();
        return body?.error?.message ?? JSON.stringify(body).slice(0, 300);
    } catch {
        return response.statusText;
    }
}

/** PDF bytes -> markdown (headings, lists, reading order across columns). */
export async function analyzeLayout(pdf, { endpoint, key, fetchImpl = fetch, sleep = defaultSleep, pollMs = 1000, maxPolls = 60 }) {
    const url = `${base(endpoint)}documentintelligence/documentModels/prebuilt-layout:analyze?api-version=${DI_API_VERSION}&outputContentFormat=markdown`;
    const start = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Source: Buffer.from(pdf).toString('base64') }),
    });
    if (start.status !== 202) throw new Error(`Document Intelligence rejected the PDF (HTTP ${start.status}): ${await errorText(start)}`);

    const operation = start.headers.get('operation-location');
    if (!operation) throw new Error('Document Intelligence did not return an operation-location header');

    for (let i = 0; i < maxPolls; i += 1) {
        await sleep(pollMs);
        const poll = await fetchImpl(operation, { headers: { 'Ocp-Apim-Subscription-Key': key } });
        if (!poll.ok) throw new Error(`Document Intelligence polling failed (HTTP ${poll.status}): ${await errorText(poll)}`);
        const result = await poll.json();
        if (result.status === 'succeeded') return result.analyzeResult.content;
        if (result.status === 'failed') throw new Error(`Document Intelligence failed: ${result.error?.message ?? 'unknown error'}`);
    }
    throw new Error(`Document Intelligence did not finish after ${maxPolls} polls`);
}

// ---------------------------------------------------------------- extraction

const str = { type: 'string' };
const nullableStr = { type: ['string', 'null'] };
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const list = (items) => ({ type: 'array', items });

/** Strict JSON schema: the model must return exactly this shape (Azure OpenAI structured outputs). */
export const CV_SCHEMA = obj({
    headline: str,
    summary: str,
    contact: obj({ email: nullableStr, phone: nullableStr, location: nullableStr, website: nullableStr, linkedin: nullableStr, github: nullableStr }),
    experience: list(obj({ role: str, company: str, startDate: str, endDate: nullableStr, bullets: list(str) })),
    education: list(obj({ degree: str, institution: str, startDate: nullableStr, endDate: nullableStr })),
    projects: list(obj({ title: str, bullets: list(str) })),
    skills: list(obj({ category: str, items: list(str) })),
    certifications: list(obj({ name: str, code: nullableStr, issuer: nullableStr, issued: nullableStr, credentialId: nullableStr })),
    languages: list(obj({ language: str, level: str })),
});

export const SYSTEM_PROMPT = `You extract structured data from a CV that was converted to markdown.
Rules:
- Copy wording VERBATIM. Do not rephrase, shorten, summarise, translate or fix grammar. Only remove markdown symbols and join lines that were wrapped.
- The markdown comes from text recognition and can contain character errors. Fix ONLY these obvious ones: "Al" written for "AI" (artificial intelligence), "APIS" for "APIs", ". NET" for ".NET", "℃" for "°C", words split by a stray space or hyphen at a line break. Change nothing else.
- Never invent anything. If a value is not in the CV, use null (or an empty list).
- Dates: "YYYY-MM" (e.g. "May 2025" -> "2025-05"); a year only -> "YYYY". A current position ("present", "today") has endDate null.
- headline: the job title under the name (e.g. "AI/ML Engineer"), in normal capitalisation even if the CV shows it in capitals.
- summary: the "About Me" / profile paragraph.
- experience: in the order shown; role and company separately; bullets as a list of the bullet texts.
- projects: title and bullets. skills: each category label with its items. languages: language and level text as written (e.g. "B1 - Conversational").
- certifications: name, exam code (e.g. "AI-901") if shown, issuer, issue date as YYYY-MM, credential ID.
- contact.website/linkedin/github: full URL as written; add "https://" if the CV omits the scheme.`;

/**
 * Deterministic fixes for OCR errors seen on the real CV PDFs. The prompt asks the model to fix these too,
 * but models copy "verbatim" text literally, so code makes sure.
 */
export function cleanOcrText(text) {
    return text
        .replace(/℃/g, '°C')
        .replace(/\b(Open)?Al\b/g, '$1AI') // OCR reads a capital I as a lowercase l: "Al", "OpenAl"
        .replace(/\bAPIS\b/g, 'APIs')
        .replace(/(^|[\s(])\.\s+NET\b/g, '$1.NET');
}

/** Apply cleanOcrText to every string in the extraction. */
export const cleanExtraction = (value) => {
    if (typeof value === 'string') return cleanOcrText(value);
    if (Array.isArray(value)) return value.map(cleanExtraction);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanExtraction(v)]));
    return value;
};

/** markdown -> { data (matches CV_SCHEMA, OCR-cleaned), usage } */
export async function extractCv(markdown, { endpoint, key, deployment, fetchImpl = fetch }) {
    const url = `${base(endpoint)}openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${OPENAI_API_VERSION}`;
    const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            temperature: 0,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `CV markdown:\n\n${markdown}` },
            ],
            response_format: { type: 'json_schema', json_schema: { name: 'cv_extract', strict: true, schema: CV_SCHEMA } },
        }),
    });
    if (!response.ok) throw new Error(`Azure OpenAI request failed (HTTP ${response.status}): ${await errorText(response)}`);

    const body = await response.json();
    const choice = body.choices?.[0];
    if (choice?.message?.refusal) throw new Error(`Azure OpenAI refused: ${choice.message.refusal}`);
    if (choice?.finish_reason !== 'stop') throw new Error(`Azure OpenAI stopped early (finish_reason: ${choice?.finish_reason})`);
    return { data: cleanExtraction(JSON.parse(choice.message.content)), usage: body.usage };
}
