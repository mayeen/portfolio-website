// Tests for the Cosmos sync. Run with: npm run test:content (no Azure connection needed).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toDocuments, planSync, syncContainer } from './sync-cosmos.mjs';
import { buildContent, CV_PATH } from './build-content.mjs';

const source = readFileSync(CV_PATH, 'utf8');
const { data } = buildContent(source);
const docs = toDocuments(data, source);

// In-memory stand-in for a Cosmos container, recording every write.
function fakeContainer(initial = []) {
    const store = new Map(initial.map((doc) => [`${doc.type}/${doc.id}`, doc]));
    const writes = [];
    return {
        store,
        writes,
        items: {
            query: () => ({
                fetchAll: async () => ({
                    resources: [...store.values()].map(({ id, type, contentHash }) => ({ id, type, contentHash })),
                }),
            }),
            upsert: async (doc) => {
                writes.push(`upsert ${doc.type}/${doc.id}`);
                store.set(`${doc.type}/${doc.id}`, doc);
            },
        },
        item: (id, type) => ({
            delete: async () => {
                writes.push(`delete ${type}/${id}`);
                store.delete(`${type}/${id}`);
            },
        }),
    };
}

describe('toDocuments', () => {
    test('one document per item, each with id, partition key type and a hash', () => {
        for (const doc of docs) {
            assert.ok(doc.id, 'id');
            assert.ok(doc.type, 'type');
            assert.match(doc.contentHash, /^[0-9a-f]{16}$/);
        }
        const count = (type) => docs.filter((d) => d.type === type).length;
        assert.equal(count('profile'), 1);
        assert.equal(count('experience'), data.experience.length);
        assert.equal(count('projects'), data.projects.length);
        assert.equal(count('cv'), 1);
        assert.equal(count('meta'), 1);
    });

    test('ids are unique within each partition', () => {
        const keys = docs.map((d) => `${d.type}/${d.id}`);
        assert.equal(new Set(keys).size, keys.length);
    });

    test('keeps website order and stores the raw cv.md for the chatbot', () => {
        const experience = docs.filter((d) => d.type === 'experience');
        assert.deepEqual(experience.map((d) => d.order), experience.map((_, i) => i));
        assert.deepEqual(experience.map((d) => d.id), data.experience.map((e) => e.id));
        assert.equal(docs.find((d) => d.type === 'cv').markdown, source);
    });

    test('hashes are stable, and change only for the edited document and meta', () => {
        assert.deepEqual(toDocuments(data, source), docs);
        const edited = structuredClone(data);
        edited.experience[0].location = 'Somewhere else';
        const changed = toDocuments(edited, source).filter((d, i) => d.contentHash !== docs[i].contentHash);
        assert.deepEqual(changed.map((d) => `${d.type}/${d.id}`), [`experience/${data.experience[0].id}`, 'meta/meta']);
    });
});

describe('planSync', () => {
    test('empty container: upsert everything', () => {
        const plan = planSync(docs, []);
        assert.equal(plan.upserts.length, docs.length);
        assert.deepEqual(plan.deletes, []);
    });

    test('identical container: nothing to do', () => {
        const plan = planSync(docs, docs);
        assert.deepEqual([plan.upserts.length, plan.deletes.length, plan.unchanged], [0, 0, docs.length]);
    });

    test('removed item is deleted, by id and partition key', () => {
        const stale = { id: 'old-job', type: 'experience', contentHash: 'x' };
        assert.deepEqual(planSync(docs, [...docs, stale]).deletes, [{ id: 'old-job', type: 'experience' }]);
    });

    test('same id in another partition is a different document', () => {
        const other = { id: 'hogarth', type: 'projects', contentHash: 'x' };
        assert.deepEqual(planSync(docs, [...docs, other]).deletes, [{ id: 'hogarth', type: 'projects' }]);
    });
});

describe('syncContainer', () => {
    test('first sync writes everything, second sync writes nothing', async () => {
        const container = fakeContainer();
        await syncContainer(container, docs);
        assert.equal(container.writes.length, docs.length);

        container.writes.length = 0;
        const plan = await syncContainer(container, docs);
        assert.deepEqual(container.writes, []);
        assert.equal(plan.unchanged, docs.length);
    });

    test('dry run reports the plan but writes nothing', async () => {
        const container = fakeContainer();
        const plan = await syncContainer(container, docs, { dryRun: true });
        assert.equal(plan.upserts.length, docs.length);
        assert.deepEqual(container.writes, []);
    });

    test('removes documents that are no longer in cv.md', async () => {
        const container = fakeContainer([...docs, { id: 'old-job', type: 'experience', contentHash: 'x' }]);
        await syncContainer(container, docs);
        assert.deepEqual(container.writes, ['delete experience/old-job']);
        assert.equal(container.store.has('experience/old-job'), false);
    });
});
