// GET /api/content: portfolio content from Cosmos DB, in the same shape as src/data/*.json.
// Kept free of Azure SDK imports so it can be tested with a fake container.

const LIST_TYPES = ['experience', 'education', 'projects', 'skills', 'certifications'];
// Fields added by Cosmos or by the sync script that the website does not need.
const INTERNAL_FIELDS = ['type', 'order', 'contentHash', '_rid', '_self', '_etag', '_attachments', '_ts'];

const strip = (doc, extra = []) => {
    const copy = { ...doc };
    for (const key of [...INTERNAL_FIELDS, ...extra]) delete copy[key];
    return copy;
};

/** Turn Cosmos documents back into { profile, experience, ... }, ordered as in cv.md. */
export function assemble(docs) {
    const profile = docs.find((d) => d.type === 'profile');
    if (!profile) throw new Error('profile document missing');

    const content = { profile: strip(profile, ['id']) };
    for (const type of LIST_TYPES) {
        content[type] = docs
            .filter((d) => d.type === type)
            .sort((a, b) => a.order - b.order)
            .map((d) => strip(d));
    }
    return content;
}

const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=86400';

/**
 * Builds the HTTP handler. getContainer() returns a Cosmos container (or a fake in tests).
 * Per request: one 1-RU point read of the meta document; the full query only runs when the content changed.
 */
export function createContentHandler({ getContainer, log = console }) {
    let cache = null; // { version, body }

    return async function handler(request) {
        try {
            const container = getContainer();
            const { resource: meta } = await container.item('meta', 'meta').read();
            if (!meta) return { status: 503, jsonBody: { error: 'Content not synced yet' } };

            const version = meta.contentHash;
            const etag = `"${version}"`;
            const headers = { ETag: etag, 'Cache-Control': CACHE_CONTROL };

            if (request.headers.get('if-none-match') === etag) return { status: 304, headers };

            if (cache?.version !== version) {
                const { resources } = await container.items
                    .query("SELECT * FROM c WHERE c.type NOT IN ('cv', 'meta')")
                    .fetchAll();
                cache = { version, body: { version, ...assemble(resources) } };
            }
            return { status: 200, headers, jsonBody: cache.body };
        } catch (error) {
            log.error(`content: ${error.code ?? ''} ${error.message}`);
            return { status: 500, jsonBody: { error: 'Could not load content' } };
        }
    };
}
