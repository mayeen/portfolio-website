// Tests for GET /api/content. Run with: npm run test:api (from the repo root). No Azure connection needed.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createContentHandler, assemble } from '../src/content-handler.js';
import { buildContent, CV_PATH, DATA_DIR } from '../../scripts/build-content.mjs';
import { toDocuments } from '../../scripts/sync-cosmos.mjs';

const source = readFileSync(CV_PATH, 'utf8');
const { data } = buildContent(source);
// What Cosmos returns: the synced documents plus Cosmos system fields.
const cosmosDocs = toDocuments(data, source).map((d) => ({ ...d, _rid: 'r', _etag: '"e"', _ts: 1 }));
const meta = cosmosDocs.find((d) => d.type === 'meta');

function fakeContainer(docs = cosmosDocs) {
    const calls = { reads: 0, queries: 0 };
    return {
        calls,
        item: (id, type) => ({
            read: async () => {
                calls.reads += 1;
                return { resource: docs.find((d) => d.id === id && d.type === type) };
            },
        }),
        items: {
            query: (sql) => ({
                fetchAll: async () => {
                    calls.queries += 1;
                    assert.match(sql, /NOT IN \('cv', 'meta'\)/);
                    return { resources: docs.filter((d) => !['cv', 'meta'].includes(d.type)).reverse() };
                },
            }),
        },
    };
}

const request = (headers = {}) => ({ headers: new Map(Object.entries(headers)) });
const silent = { error: () => {} };

describe('assemble', () => {
    test('round trip: cv.md -> sync documents -> API equals the website data in src/data', () => {
        const content = assemble(cosmosDocs);
        for (const name of Object.keys(data)) {
            const site = JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
            assert.deepEqual(content[name], site, `${name} differs from src/data/${name}.json`);
        }
    });

    test('restores cv.md order even when Cosmos returns documents shuffled', () => {
        const content = assemble([...cosmosDocs].reverse());
        assert.deepEqual(content.experience.map((e) => e.id), data.experience.map((e) => e.id));
    });

    test('fails clearly without a profile document', () => {
        assert.throws(() => assemble(cosmosDocs.filter((d) => d.type !== 'profile')), /profile document missing/);
    });
});

describe('GET /api/content', () => {
    test('200 with content, version, ETag and cache headers', async () => {
        const handler = createContentHandler({ getContainer: () => fakeContainer(), log: silent });
        const res = await handler(request());
        assert.equal(res.status, 200);
        assert.equal(res.headers.ETag, `"${meta.contentHash}"`);
        assert.match(res.headers['Cache-Control'], /max-age=60/);
        assert.equal(res.jsonBody.version, meta.contentHash);
        assert.equal(res.jsonBody.profile.title, data.profile.title);
        assert.equal(res.jsonBody.cv, undefined, 'raw cv.md is not sent to browsers');
    });

    test('304 when the browser already has this version, without querying all documents', async () => {
        const container = fakeContainer();
        const handler = createContentHandler({ getContainer: () => container, log: silent });
        const res = await handler(request({ 'if-none-match': `"${meta.contentHash}"` }));
        assert.equal(res.status, 304);
        assert.equal(res.jsonBody, undefined);
        assert.deepEqual(container.calls, { reads: 1, queries: 0 });
    });

    test('unchanged content is served from memory: one 1-RU read per request, one query in total', async () => {
        const container = fakeContainer();
        const handler = createContentHandler({ getContainer: () => container, log: silent });
        await handler(request());
        await handler(request());
        await handler(request());
        assert.deepEqual(container.calls, { reads: 3, queries: 1 });
    });

    test('changed content (new meta hash) is queried again', async () => {
        let docs = cosmosDocs;
        const handler = createContentHandler({ getContainer: () => fakeContainer(docs), log: silent });
        const first = await handler(request());

        const edited = structuredClone(data);
        edited.profile.title = 'Changed Title';
        docs = toDocuments(edited, source);
        const second = await handler(request());

        assert.notEqual(second.jsonBody.version, first.jsonBody.version);
        assert.equal(second.jsonBody.profile.title, 'Changed Title');
    });

    test('503 when nothing has been synced yet', async () => {
        const handler = createContentHandler({ getContainer: () => fakeContainer([]), log: silent });
        assert.equal((await handler(request())).status, 503);
    });

    test('500 without leaking details when Cosmos fails', async () => {
        const errors = [];
        const broken = { item: () => ({ read: async () => { throw Object.assign(new Error('secret detail'), { code: 401 }); } }) };
        const handler = createContentHandler({ getContainer: () => broken, log: { error: (m) => errors.push(m) } });
        const res = await handler(request());
        assert.deepEqual([res.status, res.jsonBody], [500, { error: 'Could not load content' }]);
        assert.match(errors[0], /401 secret detail/, 'details go to the log (Application Insights), not the response');
    });
});
