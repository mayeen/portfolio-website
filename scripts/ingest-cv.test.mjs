// Tests for the ingestion CLI arguments (role/file pairs, and --files mode used by the GitHub Action).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './build-content.mjs';
import { parseArgs, roleFromFilename } from './ingest-cv.mjs';

describe('parseArgs', () => {
    test('role/file pairs and flags', () => {
        assert.deepEqual(parseArgs(['ai', 'a.pdf', 'software', 'b.pdf', '--dry-run']), {
            jobs: [{ role: 'ai', file: 'a.pdf' }, { role: 'software', file: 'b.pdf' }], skipped: [], dryRun: true, cached: false,
        });
        assert.throws(() => parseArgs(['ai']), /Usage/);
        assert.throws(() => parseArgs([]), /Usage/);
        assert.throws(() => parseArgs(['manager', 'a.pdf']), /Unknown role/);
    });

    test('--files: roles from file names, ai sorted first, others skipped with a reason', () => {
        const { jobs, skipped, dryRun } = parseArgs([
            '--files',
            'public/cv/X_CV_Software_Engineer_EN.pdf',
            'public/cv/X_CV_AI_Engineer_DE.pdf',
            'public/cv/X_CV_AI_Engineer_EN.pdf',
            'public/cv/X_CV_Manager_EN.pdf',
        ]);
        assert.deepEqual(jobs, [
            { role: 'ai', file: 'public/cv/X_CV_AI_Engineer_EN.pdf' },
            { role: 'software', file: 'public/cv/X_CV_Software_Engineer_EN.pdf' },
        ]);
        assert.deepEqual(skipped.map((s) => s.file), ['public/cv/X_CV_AI_Engineer_DE.pdf', 'public/cv/X_CV_Manager_EN.pdf']);
        assert.equal(dryRun, false);
    });

    test('--files with no files is not an error (nothing changed)', () => {
        assert.deepEqual(parseArgs(['--files']).jobs, []);
    });
});

describe('roleFromFilename', () => {
    const cases = [
        ['Kazi_Mostafa_Shahriar_CV_AI_Engineer_EN.pdf', { role: 'ai' }],
        ['Kazi_Mostafa_Shahriar_CV_Software_Engineer_EN.pdf', { role: 'software' }],
        ['Kazi_Mostafa_Shahriar_CV_Frontend_Developer_EN.pdf', { role: 'frontend' }],
        ['public/cv/cv_ai_engineer_en.PDF', { role: 'ai' }],
    ];
    for (const [file, expected] of cases) test(`${file} -> ${expected.role}`, () => assert.deepEqual(roleFromFilename(file), expected));

    test('German, unknown role and non-PDF files are skipped', () => {
        assert.match(roleFromFilename('X_AI_Engineer_DE.pdf').skip, /English/);
        assert.match(roleFromFilename('X_Manager_EN.pdf').skip, /no role/);
        assert.match(roleFromFilename('notes.txt').skip, /not a PDF/);
    });

    test('every English CV in public/cv maps to a role (the workflow relies on it)', () => {
        const english = readdirSync(join(ROOT, 'public', 'cv')).filter((f) => f.endsWith('_EN.pdf'));
        assert.ok(english.length >= 2);
        for (const f of english) assert.ok(roleFromFilename(f).role, `${f} has no role`);
    });
});
