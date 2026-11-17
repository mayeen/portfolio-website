#!/usr/bin/env node
// Parses content/cv.md (the master CV) and writes the website data in src/data/*.json.
//
//   npm run content          regenerate src/data/*.json
//   npm run content:check    fail if src/data/*.json is out of date (used by prebuild/CI)
//   npm run test:content     run the parser tests (scripts/build-content.test.mjs)
//
// Format reference: docs/CV_FORMAT.md

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CV_PATH = join(ROOT, 'content', 'cv.md');
export const DATA_DIR = join(ROOT, 'src', 'data');
const PUBLIC_DIR = join(ROOT, 'public');

// Role wording shown on the website, in fallback order.
export const SITE_ROLES = ['ai', 'software'];
// All allowed variant names. "details" is extra context for the chatbot only.
const VARIANTS = new Set(['ai', 'software', 'frontend', 'details']);
const SKILL_LEVELS = new Set(['Basic', 'Intermediate', 'Advanced', 'Expert']);
const DATE_RE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;

// Allowed fields per section ("required" must be present).
const SCHEMA = {
    Profile: { kind: 'fields', required: ['name', 'shortName', 'email'], optional: ['location', 'phone', 'whatsapp', 'website', 'availability'] },
    Headline: { kind: 'variants' },
    Summary: { kind: 'variants' },
    About: { kind: 'variants', optionalSection: true },
    Stats: { kind: 'items', required: ['value', 'icon'], optional: [] },
    Socials: { kind: 'items', required: ['url', 'icon'], optional: ['handle'] },
    Languages: { kind: 'items', required: ['level'], optional: [] },
    Downloads: { kind: 'items', required: ['role', 'lang', 'file'], optional: [] },
    Experience: { kind: 'items', withId: true, required: ['id', 'dates', 'location', 'technologies'], optional: ['summary'] },
    Education: { kind: 'items', withId: true, required: ['id', 'dates', 'location'], optional: ['coursework'] },
    Projects: { kind: 'items', withId: true, required: ['id', 'technologies'], optional: ['image', 'github', 'demo'] },
    Skills: { kind: 'items', withId: true, required: ['id', 'skills'], optional: ['site'] },
    Certifications: { kind: 'items', withId: true, required: ['id', 'issuer'], optional: ['code', 'issued', 'credentialId', 'certificationNumber', 'image', 'icon', 'verifyUrl'] },
};

// ---------------------------------------------------------------- parse

function parse(source, fail) {
    const sections = {};
    let section = null;
    let item = null;
    let variant = null;

    // Blank out comments but keep their newlines so line numbers stay correct.
    const lines = source.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, '')).split('\n');

    lines.forEach((raw, index) => {
        const lineNo = index + 1;
        const line = raw.trim();
        if (!line || /^# /.test(line)) return;

        let m;
        if ((m = line.match(/^## (.+)$/))) {
            const name = m[1].trim();
            if (!SCHEMA[name]) fail(lineNo, `unknown section "## ${name}" (allowed: ${Object.keys(SCHEMA).join(', ')})`);
            if (sections[name]) fail(lineNo, `section "## ${name}" appears twice`);
            section = sections[name] = { name, line: lineNo, fields: {}, variants: {}, items: [] };
            item = null;
            variant = null;
            return;
        }
        if (!section) {
            fail(lineNo, 'content before the first "## Section" heading');
            return;
        }

        if ((m = line.match(/^### (.+)$/))) {
            item = { title: m[1].trim(), line: lineNo, fields: {}, variants: {} };
            section.items.push(item);
            variant = null;
            return;
        }

        if ((m = line.match(/^#### (.+)$/))) {
            const name = m[1].trim();
            if (!VARIANTS.has(name)) fail(lineNo, `unknown variant "#### ${name}" (allowed: ${[...VARIANTS].join(', ')})`);
            const owner = item || section;
            if (owner.variants[name]) fail(lineNo, `variant "#### ${name}" appears twice`);
            variant = owner.variants[name] = { bullets: [], text: [], line: lineNo };
            return;
        }

        if (variant) {
            if (line.startsWith('- ')) variant.bullets.push(line.slice(2).trim());
            else variant.text.push(line);
            return;
        }

        if ((m = line.match(/^- ([A-Za-z]+):\s*(.*)$/))) {
            const owner = item || section;
            if (m[1] in owner.fields) fail(lineNo, `field "${m[1]}" appears twice`);
            owner.fields[m[1]] = { value: m[2].trim(), line: lineNo };
            return;
        }

        fail(lineNo, `unexpected line: "${line}" (expected "- key: value", a heading, or text under "#### variant")`);
    });

    return sections;
}

// ---------------------------------------------------------------- build

const field = (owner, key) => (owner.fields[key] ? owner.fields[key].value : null);
const list = (owner, key) => (field(owner, key) || '').split(',').map((s) => s.trim()).filter(Boolean);
const variantText = (v) => (v ? [...v.text, ...v.bullets].join(' ') : '');

/**
 * Turns cv.md source into website data.
 * Returns { data, errors }; errors is a list of "cv.md:<line>: <problem>" strings.
 */
export function buildContent(source, { publicDir = PUBLIC_DIR } = {}) {
    const errors = [];
    const fail = (line, message) => errors.push(`cv.md:${line}: ${message}`);

    const checkFields = (owner, spec, where) => {
        for (const key of spec.required || []) {
            if (!owner.fields[key] || owner.fields[key].value === '') fail(owner.line, `${where}: missing required field "${key}"`);
        }
        const allowed = new Set([...(spec.required || []), ...(spec.optional || [])]);
        for (const [key, { line }] of Object.entries(owner.fields)) {
            if (!allowed.has(key)) fail(line, `${where}: unknown field "${key}" (allowed: ${[...allowed].join(', ')})`);
        }
    };

    const checkPath = (owner, key) => {
        const value = field(owner, key);
        if (!value) return;
        if (value.startsWith('/')) {
            if (!existsSync(join(publicDir, value))) fail(owner.fields[key].line, `"${key}" file not found: public${value}`);
        } else if (!/^https?:\/\//.test(value)) {
            fail(owner.fields[key].line, `"${key}" must be an http(s) URL or a /path inside public/`);
        }
    };

    const parseDates = (owner) => {
        const f = owner.fields.dates;
        if (!f) return { startDate: null, endDate: null };
        const [start, end] = f.value.split(/\s+to\s+/);
        const check = (d) => {
            if (!DATE_RE.test(d)) fail(f.line, `invalid date "${d}" (use YYYY, YYYY-MM or YYYY-MM-DD)`);
            return d;
        };
        if (end === undefined) return { startDate: null, endDate: check(start) };
        const startDate = check(start);
        const endDate = end === 'present' ? null : check(end);
        if (endDate && startDate > endDate) fail(f.line, `start date ${startDate} is after end date ${endDate}`);
        return { startDate, endDate };
    };

    // Website wording: first available of SITE_ROLES.
    const siteVariant = (owner, where, required = true) => {
        for (const role of SITE_ROLES) {
            const v = owner.variants[role];
            if (v && (v.bullets.length || v.text.length)) return v;
        }
        if (required) fail(owner.line, `${where}: needs a "#### ${SITE_ROLES.join('" or "#### ')}" block for the website`);
        return null;
    };

    const splitTitle = (item, where) => {
        const [left, right] = item.title.split(/\s+@\s+/);
        if (!right) fail(item.line, `${where}: title must be "### <title> @ <organisation>"`);
        return [left, right || ''];
    };

    const checkIds = (section) => {
        const seen = new Map();
        for (const item of section.items) {
            const id = field(item, 'id');
            if (!id) continue;
            if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) fail(item.fields.id.line, `id "${id}" must be kebab-case`);
            if (seen.has(id)) fail(item.fields.id.line, `duplicate id "${id}" (also on line ${seen.get(id)})`);
            seen.set(id, item.fields.id.line);
        }
    };

    const sections = parse(source, fail);

    for (const [name, spec] of Object.entries(SCHEMA)) {
        const section = sections[name];
        if (!section) {
            if (!spec.optionalSection) fail(1, `missing section "## ${name}"`);
            continue;
        }
        if (spec.kind === 'fields') checkFields(section, spec, name);
        if (spec.kind === 'items') {
            section.items.forEach((item) => checkFields(item, spec, `${name} "${item.title}"`));
            if (spec.withId) checkIds(section);
        }
    }

    const get = (name) => sections[name] || { fields: {}, variants: {}, items: [], line: 1 };
    const profileSection = get('Profile');
    const socials = get('Socials').items;
    const linkedin = socials.find((s) => s.title === 'LinkedIn');

    const downloads = get('Downloads').items.map((d) => {
        checkPath(d, 'file');
        return { label: d.title, role: field(d, 'role'), lang: field(d, 'lang'), file: field(d, 'file') };
    });

    const summary = variantText(siteVariant(get('Summary'), 'Summary'));
    const about = variantText(siteVariant(get('About'), 'About', false));

    const profile = {
        name: field(profileSection, 'name'),
        shortName: field(profileSection, 'shortName'),
        title: variantText(siteVariant(get('Headline'), 'Headline')),
        location: field(profileSection, 'location'),
        availability: field(profileSection, 'availability'),
        summary,
        about: about || summary.replace(/\*\*/g, ''),
        stats: get('Stats').items.map((s) => ({ icon: field(s, 'icon'), label: s.title, value: field(s, 'value') })),
        contact: {
            email: field(profileSection, 'email'),
            phone: field(profileSection, 'phone'),
            whatsapp: field(profileSection, 'whatsapp'),
            linkedinHandle: linkedin ? field(linkedin, 'handle') : null,
        },
        website: field(profileSection, 'website'),
        socials: socials.map((s) => {
            checkPath(s, 'url');
            return { platform: s.title, url: field(s, 'url'), icon: field(s, 'icon') };
        }),
        languages: get('Languages').items.map((l) => ({ language: l.title, level: field(l, 'level') })),
        downloads,
        cv: {
            en: downloads.find((d) => d.role === SITE_ROLES[0] && d.lang === 'en')?.file || null,
            de: downloads.find((d) => d.role === SITE_ROLES[0] && d.lang === 'de')?.file || null,
        },
    };

    const experience = get('Experience').items.map((item) => {
        const [role, company] = splitTitle(item, `Experience "${item.title}"`);
        const v = siteVariant(item, `Experience "${item.title}"`);
        return {
            id: field(item, 'id'),
            role,
            company,
            location: field(item, 'location'),
            ...parseDates(item),
            summary: field(item, 'summary'),
            bullets: v ? [...v.bullets, ...v.text] : [],
            technologies: list(item, 'technologies'),
        };
    });

    const education = get('Education').items.map((item) => {
        const [degree, institution] = splitTitle(item, `Education "${item.title}"`);
        return {
            id: field(item, 'id'),
            degree,
            institution,
            location: field(item, 'location'),
            ...parseDates(item),
            coursework: list(item, 'coursework'),
        };
    });

    const projects = get('Projects').items.map((item) => {
        ['image', 'github', 'demo'].forEach((k) => checkPath(item, k));
        return {
            id: field(item, 'id'),
            image: field(item, 'image'),
            title: item.title,
            description: variantText(siteVariant(item, `Projects "${item.title}"`)),
            technologies: list(item, 'technologies'),
            github: field(item, 'github'),
            demo: field(item, 'demo'),
        };
    });

    // Validate every category (including site: no ones, which the chatbot still uses), then drop hidden ones.
    const skills = get('Skills').items
        .map((item) => {
            const site = field(item, 'site');
            if (site && !['yes', 'no'].includes(site)) fail(item.fields.site.line, '"site" must be "yes" or "no"');
            return {
                site: site !== 'no',
                id: field(item, 'id'),
                name: item.title,
                skills: list(item, 'skills').map((entry) => {
                    const m = entry.match(/^(.+?)\s*\((\w+)\)$/);
                    if (!m) return { name: entry };
                    if (!SKILL_LEVELS.has(m[2])) fail(item.fields.skills.line, `unknown skill level "${m[2]}" (allowed: ${[...SKILL_LEVELS].join(', ')})`);
                    return { name: m[1], level: m[2] };
                }),
            };
        })
        .filter((category) => category.site)
        .map(({ id, name, skills: entries }) => ({ id, name, skills: entries }));

    const certifications = get('Certifications').items.map((item) => {
        ['image', 'verifyUrl'].forEach((k) => checkPath(item, k));
        const issued = item.fields.issued;
        if (issued && !DATE_RE.test(issued.value)) fail(issued.line, `invalid date "${issued.value}"`);
        return {
            id: field(item, 'id'),
            name: item.title,
            code: field(item, 'code'),
            issuer: field(item, 'issuer'),
            icon: field(item, 'icon'),
            image: field(item, 'image'),
            issueDate: field(item, 'issued'),
            credentialId: field(item, 'credentialId'),
            certificationNumber: field(item, 'certificationNumber'),
            verifyUrl: field(item, 'verifyUrl'),
        };
    });

    return { data: { profile, experience, education, skills, projects, certifications }, errors };
}

/** JSON text exactly as written to src/data/<name>.json */
export const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;

// ---------------------------------------------------------------- CLI

function main() {
    const checkOnly = process.argv.includes('--check');
    const cvPath = process.env.CV_FILE || CV_PATH;
    const { data, errors } = buildContent(readFileSync(cvPath, 'utf8'));

    if (errors.length) {
        console.error(`${relative(ROOT, cvPath) || cvPath} has ${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
        process.exit(1);
    }

    const stale = [];
    for (const [name, value] of Object.entries(data)) {
        const path = join(DATA_DIR, `${name}.json`);
        const next = serialize(value);
        const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
        if (current === next) continue;
        if (checkOnly) stale.push(relative(ROOT, path));
        else {
            writeFileSync(path, next);
            console.log(`updated ${relative(ROOT, path)}`);
        }
    }

    if (checkOnly && stale.length) {
        console.error(`Out of date (run "npm run content"):\n  ${stale.join('\n  ')}`);
        process.exit(1);
    }
    console.log(checkOnly ? 'content is up to date' : 'content build complete');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
