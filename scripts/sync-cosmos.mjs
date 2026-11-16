#!/usr/bin/env node
// Syncs content/cv.md into Azure Cosmos DB (database "portfolio", container "content", partition key /type).
//
//   npm run sync              upsert changed documents, delete removed ones
//   npm run sync -- --dry-run show what would change, write nothing
//
// Needs COSMOS_ENDPOINT and COSMOS_KEY (read-write key) in the environment or in .env (see .env.example).
// In CI the GitHub Action passes them from repository secrets.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { buildContent, CV_PATH } from './build-content.mjs';

const LIST_TYPES = ['experience', 'education', 'projects', 'skills', 'certifications'];

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

/**
 * One Cosmos document per item, so the API can query one type at a time:
 *   profile                 -> { id: "profile", type: "profile", ... }
 *   experience[i] etc.      -> { id: <item id>, type: "experience", order: i, ... }
 *   raw cv.md (for chatbot) -> { id: "cv-md", type: "cv", markdown }
 *   summary                 -> { id: "meta", type: "meta", contentHash } (used by the API as an ETag)
 * Every document carries contentHash so unchanged documents are skipped on the next sync.
 */
export function toDocuments(data, cvMarkdown) {
    const docs = [{ id: 'profile', type: 'profile', ...data.profile }];
    for (const type of LIST_TYPES) {
        data[type].forEach((item, order) => docs.push({ ...item, id: item.id, type, order }));
    }
    docs.push({ id: 'cv-md', type: 'cv', markdown: cvMarkdown });

    const withHashes = docs.map((doc) => ({ ...doc, contentHash: hash(doc) }));
    withHashes.push({ id: 'meta', type: 'meta', contentHash: hash(withHashes.map((d) => d.contentHash)) });
    return withHashes;
}

const key = (doc) => `${doc.type}/${doc.id}`;

/** Decide what to write: upsert new or changed documents, delete documents no longer in cv.md. */
export function planSync(docs, existing) {
    const existingHashes = new Map(existing.map((doc) => [key(doc), doc.contentHash]));
    const wanted = new Set(docs.map(key));
    return {
        upserts: docs.filter((doc) => existingHashes.get(key(doc)) !== doc.contentHash),
        deletes: existing.filter((doc) => !wanted.has(key(doc))).map(({ id, type }) => ({ id, type })),
        unchanged: docs.filter((doc) => existingHashes.get(key(doc)) === doc.contentHash).length,
    };
}

/** Apply the plan to a Cosmos container (or anything with the same items/item API). */
export async function syncContainer(container, docs, { dryRun = false } = {}) {
    const { resources: existing } = await container.items
        .query('SELECT c.id, c.type, c.contentHash FROM c')
        .fetchAll();
    const plan = planSync(docs, existing);
    if (dryRun) return plan;

    for (const doc of plan.upserts) await container.items.upsert(doc);
    for (const { id, type } of plan.deletes) await container.item(id, type).delete();
    return plan;
}

// ---------------------------------------------------------------- CLI

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const source = readFileSync(CV_PATH, 'utf8');
    const { data, errors } = buildContent(source);
    if (errors.length) {
        console.error(`content/cv.md is invalid, nothing synced:\n  ${errors.join('\n  ')}`);
        process.exit(1);
    }

    const { COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE = 'portfolio', COSMOS_CONTAINER = 'content' } = process.env;
    if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
        console.error('Missing COSMOS_ENDPOINT or COSMOS_KEY. Copy .env.example to .env and fill them in.');
        process.exit(1);
    }

    const { CosmosClient } = await import('@azure/cosmos');
    const container = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY })
        .database(COSMOS_DATABASE)
        .container(COSMOS_CONTAINER);

    const plan = await syncContainer(container, toDocuments(data, source), { dryRun });
    const verb = dryRun ? 'would' : 'did';
    console.log(`${dryRun ? '[dry run] ' : ''}${COSMOS_DATABASE}/${COSMOS_CONTAINER}: ${verb} upsert ${plan.upserts.length}, ${verb} delete ${plan.deletes.length}, unchanged ${plan.unchanged}`);
    for (const doc of plan.upserts) console.log(`  upsert ${key(doc)}`);
    for (const doc of plan.deletes) console.log(`  delete ${key(doc)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        // Never print the key; the SDK error message does not contain it.
        console.error(`Sync failed: ${error.code ?? ''} ${error.message}`);
        process.exit(1);
    });
}
