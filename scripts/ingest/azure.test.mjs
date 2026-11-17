// Tests for the Azure AI calls with a fake fetch (no Azure, no cost).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeLayout, extractCv, cleanOcrText, cleanExtraction, CV_SCHEMA, SYSTEM_PROMPT } from './azure.mjs';

const endpoint = 'https://aif-test.cognitiveservices.azure.com'; // no trailing slash on purpose
const key = 'test-key';
const noSleep = async () => {};

const response = (status, body, headers = {}) => ({
    status,
    ok: status >= 200 && status < 300,
    statusText: `HTTP ${status}`,
    headers: new Map(Object.entries(headers)),
    json: async () => body,
});

describe('analyzeLayout (Document Intelligence)', () => {
    test('submits the PDF to prebuilt-layout with markdown output, polls until done, returns markdown', async () => {
        const calls = [];
        const replies = [
            response(202, {}, { 'operation-location': `${endpoint}/op/1` }),
            response(200, { status: 'running' }),
            response(200, { status: 'succeeded', analyzeResult: { content: '# CV\n\n- bullet' } }),
        ];
        const fetchImpl = async (url, init = {}) => {
            calls.push({ url, init });
            return replies.shift();
        };
        const markdown = await analyzeLayout(Buffer.from('%PDF-1.7 test'), { endpoint, key, fetchImpl, sleep: noSleep });

        assert.equal(markdown, '# CV\n\n- bullet');
        assert.equal(calls[0].url, `${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30&outputContentFormat=markdown`);
        assert.equal(calls[0].init.method, 'POST');
        assert.equal(calls[0].init.headers['Ocp-Apim-Subscription-Key'], key);
        assert.equal(JSON.parse(calls[0].init.body).base64Source, Buffer.from('%PDF-1.7 test').toString('base64'));
        assert.deepEqual(calls.slice(1).map((c) => c.url), [`${endpoint}/op/1`, `${endpoint}/op/1`]);
    });

    test('rejected request reports the Azure error message', async () => {
        const fetchImpl = async () => response(401, { error: { message: 'Access denied due to invalid subscription key' } });
        await assert.rejects(analyzeLayout(Buffer.from('x'), { endpoint, key, fetchImpl, sleep: noSleep }), /HTTP 401.*invalid subscription key/);
    });

    test('failed analysis reports why', async () => {
        const replies = [response(202, {}, { 'operation-location': 'op' }), response(200, { status: 'failed', error: { message: 'Corrupted file' } })];
        await assert.rejects(analyzeLayout(Buffer.from('x'), { endpoint, key, fetchImpl: async () => replies.shift(), sleep: noSleep }), /Corrupted file/);
    });

    test('gives up after maxPolls', async () => {
        const fetchImpl = async (url) => (url.includes('analyze') ? response(202, {}, { 'operation-location': 'op' }) : response(200, { status: 'running' }));
        await assert.rejects(analyzeLayout(Buffer.from('x'), { endpoint, key, fetchImpl, sleep: noSleep, maxPolls: 3 }), /did not finish after 3 polls/);
    });
});

describe('extractCv (Azure OpenAI)', () => {
    const extracted = { headline: 'AI/ML Engineer' };
    const ok = (overrides = {}) => response(200, {
        choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(extracted) }, ...overrides }],
        usage: { prompt_tokens: 1200, completion_tokens: 800 },
    });

    test('calls the deployment with the strict schema at temperature 0 and returns parsed JSON + usage', async () => {
        let call;
        const fetchImpl = async (url, init) => {
            call = { url, init };
            return ok();
        };
        const { data, usage } = await extractCv('# CV', { endpoint, key, deployment: 'gpt-4.1-mini', fetchImpl });

        assert.deepEqual(data, extracted);
        assert.equal(usage.prompt_tokens, 1200);
        assert.equal(call.url, `${endpoint}/openai/deployments/gpt-4.1-mini/chat/completions?api-version=2024-10-21`);
        assert.equal(call.init.headers['api-key'], key);
        const body = JSON.parse(call.init.body);
        assert.equal(body.temperature, 0);
        assert.equal(body.messages[0].content, SYSTEM_PROMPT);
        assert.match(body.messages[1].content, /# CV/);
        assert.deepEqual(body.response_format, { type: 'json_schema', json_schema: { name: 'cv_extract', strict: true, schema: CV_SCHEMA } });
    });

    test('HTTP errors (e.g. quota 429) report the message', async () => {
        const fetchImpl = async () => response(429, { error: { message: 'Rate limit exceeded' } });
        await assert.rejects(extractCv('x', { endpoint, key, deployment: 'd', fetchImpl }), /HTTP 429.*Rate limit/);
    });

    test('truncated output (finish_reason length) is an error, not half a CV', async () => {
        await assert.rejects(extractCv('x', { endpoint, key, deployment: 'd', fetchImpl: async () => ok({ finish_reason: 'length' }) }), /stopped early/);
    });

    test('a refusal is an error', async () => {
        await assert.rejects(extractCv('x', { endpoint, key, deployment: 'd', fetchImpl: async () => ok({ message: { refusal: 'no' } }) }), /refused/);
    });
});

describe('OCR cleanup (deterministic, after the model)', () => {
    const cases = [
        ['reaching RMSE of 1.3℃', 'reaching RMSE of 1.3°C'],
        ['Built an agentic Al chatbot', 'Built an agentic AI chatbot'],
        ['using Python and RESTful APIS.', 'using Python and RESTful APIs.'],
        ['Backend: . NET, React', 'Backend: .NET, React'],
        ['(. NET Core)', '(.NET Core)'],
        ['Document Intelligence and OpenAl.', 'Document Intelligence and OpenAI.'],
        ['Albert Allen Algorithm ALL Openly', 'Albert Allen Algorithm ALL Openly'], // only the standalone tokens "Al" / "OpenAl"
    ];
    for (const [input, expected] of cases) {
        test(`"${input}" -> "${expected}"`, () => assert.equal(cleanOcrText(input), expected));
    }

    test('extractCv returns cleaned data, everywhere in the structure', async () => {
        const raw = { headline: 'Al Engineer', experience: [{ bullets: ['RESTful APIS', '1.3℃'] }], skills: [{ items: ['. NET'] }], contact: { email: null } };
        const fetchImpl = async () => response(200, { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(raw) } }] });
        const { data } = await extractCv('x', { endpoint, key, deployment: 'd', fetchImpl });
        assert.deepEqual(data, { headline: 'AI Engineer', experience: [{ bullets: ['RESTful APIs', '1.3°C'] }], skills: [{ items: ['.NET'] }], contact: { email: null } });
        assert.deepEqual(cleanExtraction(raw).contact, { email: null }, 'null stays null');
    });
});

describe('CV_SCHEMA', () => {
    // Azure OpenAI strict mode: every object lists all properties as required and forbids extra ones.
    function* objects(schema, path = '$') {
        if (schema.type === 'object') {
            yield { schema, path };
            for (const [k, v] of Object.entries(schema.properties)) yield* objects(v, `${path}.${k}`);
        }
        if (schema.type === 'array') yield* objects(schema.items, `${path}[]`);
    }

    test('is valid for strict structured outputs', () => {
        for (const { schema, path } of objects(CV_SCHEMA)) {
            assert.equal(schema.additionalProperties, false, `${path} allows extra properties`);
            assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort(), `${path} required list`);
        }
    });

    test('covers everything the merge compares', () => {
        assert.deepEqual(Object.keys(CV_SCHEMA.properties).sort(), ['certifications', 'contact', 'education', 'experience', 'headline', 'languages', 'projects', 'skills', 'summary']);
    });
});
