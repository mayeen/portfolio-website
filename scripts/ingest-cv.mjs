#!/usr/bin/env node
// CV ingestion: PDF -> Azure AI Document Intelligence -> Azure OpenAI -> merge into content/cv.md.
//
//   npm run ingest -- ai public/cv/Kazi_Mostafa_Shahriar_CV_AI_Engineer_EN.pdf
//   npm run ingest -- ai <ai.pdf> software <software.pdf>      several CVs, merged in order
//   npm run ingest -- ... --dry-run                             report only, cv.md untouched
//   npm run ingest -- ... --cached                              reuse content/ingest/* (no Azure calls, no cost)
//   npm run ingest -- --files <pdf> [<pdf> ...]                 role from the file name (used by the GitHub Action)
//
// Needs AZURE_AI_ENDPOINT, AZURE_AI_KEY, AZURE_OPENAI_DEPLOYMENT (in .env, see .env.example).
// Only this role's wording is updated; fact differences are reported, never applied. Review with `git diff`.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, CV_PATH, buildContent } from './build-content.mjs';
import { analyzeLayout, extractCv, cleanExtraction } from './ingest/azure.mjs';
import { mergeExtraction, formatReport } from './ingest/merge.mjs';

const ROLES = ['ai', 'software', 'frontend'];
const CACHE_DIR = join(ROOT, 'content', 'ingest'); // gitignored: intermediate results for inspection

// File name part -> role. Only English CVs are ingested: the German ones are translations of them,
// so every translated title would show up as a "conflict".
const FILE_ROLES = [[/AI_Engineer/i, 'ai'], [/Software_Engineer/i, 'software'], [/Frontend/i, 'frontend']];

/** "Kazi_..._CV_AI_Engineer_EN.pdf" -> { role: 'ai' } or { skip: reason } */
export function roleFromFilename(file) {
    const name = basename(file);
    if (!/\.pdf$/i.test(name)) return { skip: 'not a PDF' };
    if (!/_EN\.pdf$/i.test(name)) return { skip: 'not an English CV (_EN.pdf)' };
    const match = FILE_ROLES.find(([pattern]) => pattern.test(name));
    return match ? { role: match[1] } : { skip: `no role in the file name (expected ${FILE_ROLES.map(([p]) => p.source).join(', ')})` };
}

export function parseArgs(argv) {
    const flags = new Set(argv.filter((a) => a.startsWith('--')));
    const positional = argv.filter((a) => !a.startsWith('--'));
    const options = { dryRun: flags.has('--dry-run'), cached: flags.has('--cached') };

    if (flags.has('--files')) {
        const jobs = [];
        const skipped = [];
        for (const file of positional) {
            const { role, skip } = roleFromFilename(file);
            if (role) jobs.push({ role, file });
            else skipped.push({ file, reason: skip });
        }
        // ai first: the software merge compares against the ai wording.
        jobs.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));
        return { jobs, skipped, ...options };
    }

    if (!positional.length || positional.length % 2) throw new Error('Usage: npm run ingest -- <role> <pdf> [<role> <pdf> ...] [--dry-run] [--cached]  |  --files <pdf> ...');
    const jobs = [];
    for (let i = 0; i < positional.length; i += 2) {
        const [role, file] = [positional[i], positional[i + 1]];
        if (!ROLES.includes(role)) throw new Error(`Unknown role "${role}" (allowed: ${ROLES.join(', ')})`);
        jobs.push({ role, file });
    }
    return { jobs, skipped: [], ...options };
}

async function main() {
    const { jobs, skipped, dryRun, cached } = parseArgs(process.argv.slice(2));
    for (const { file, reason } of skipped) console.log(`Skipped ${file}: ${reason}`);
    if (!jobs.length) {
        console.log('Nothing to ingest.');
        return;
    }
    const { AZURE_AI_ENDPOINT: endpoint, AZURE_AI_KEY: key, AZURE_OPENAI_DEPLOYMENT: deployment } = process.env;
    if (!cached && (!endpoint || !key || !deployment)) {
        throw new Error('Missing AZURE_AI_ENDPOINT, AZURE_AI_KEY or AZURE_OPENAI_DEPLOYMENT. See .env.example.');
    }
    mkdirSync(CACHE_DIR, { recursive: true });

    let cv = readFileSync(CV_PATH, 'utf8');
    const results = [];
    for (const { role, file } of jobs) {
        const stem = basename(file, '.pdf');
        const layoutPath = join(CACHE_DIR, `${stem}.layout.md`);
        const extractPath = join(CACHE_DIR, `${stem}.extracted.json`);

        let markdown;
        let extracted;
        if (cached) {
            if (!existsSync(extractPath)) throw new Error(`No cached extraction for ${file}; run once without --cached`);
            extracted = cleanExtraction(JSON.parse(readFileSync(extractPath, 'utf8')));
        } else {
            console.log(`[${role}] Document Intelligence: ${file}`);
            markdown = await analyzeLayout(readFileSync(file), { endpoint, key });
            writeFileSync(layoutPath, markdown);
            console.log(`[${role}] Azure OpenAI (${deployment}): extracting`);
            const { data, usage } = await extractCv(markdown, { endpoint, key, deployment });
            extracted = data;
            writeFileSync(extractPath, `${JSON.stringify(extracted, null, 2)}\n`);
            console.log(`[${role}] tokens: ${usage?.prompt_tokens} in, ${usage?.completion_tokens} out`);
        }

        const merged = mergeExtraction(cv, extracted, role);
        cv = merged.cv;
        results.push({ role, file: relative(ROOT, file) || file, report: merged.report });
    }

    const { errors } = buildContent(cv);
    if (errors.length) throw new Error(`Merged cv.md would be invalid, nothing written:\n  ${errors.join('\n  ')}`);

    const report = formatReport(results);
    writeFileSync(join(CACHE_DIR, 'report.md'), `${report}\n`);
    console.log(`\n${report}`);

    if (dryRun) {
        console.log('[dry run] content/cv.md not changed.');
    } else {
        writeFileSync(CV_PATH, cv);
        console.log('content/cv.md updated. Review with `git diff content/cv.md`, then run `npm run content`.');
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(`Ingestion failed: ${error.message}`);
        process.exit(1);
    });
}
