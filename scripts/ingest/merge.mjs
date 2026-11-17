// Merges one extracted CV (one role) into content/cv.md. Plain code, no AI.
//
// May change:  the wording block of THIS role (#### ai / #### software ...) for headline, summary,
//              matched jobs and matched projects.
// Never changes: facts (titles, companies, dates, education, certificates, contact, skills, languages)
//              and never adds or removes items. Differences are reported for a human to decide.

import { buildContent } from '../build-content.mjs';

const WORDING_ROLES = ['ai', 'software', 'frontend'];

/**
 * Comparable form of a text: no markdown bold, unified dashes/quotes/spaces, lower case, no trailing period.
 * Also absorbs PDF/OCR artifacts seen on the real CVs: "℃" vs "°C", "Al" (lowercase L) for "AI",
 * ". NET" for ".NET", "&" vs "and".
 */
export const normalize = (text) =>
    String(text ?? '')
        .replace(/\*\*/g, '')
        .replace(/℃/g, '°C')
        .replace(/&/g, ' and ')
        .replace(/[‐-―]/g, '-')
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/(^|\s)\.\s+(?=\w)/g, '$1.')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\.$/, '')
        .toLowerCase()
        .replace(/\bal\b/g, 'ai');

const sameList = (a, b) => a.length === b.length && a.every((x, i) => normalize(x) === normalize(b[i]));
const month = (date) => (date ? date.slice(0, 7) : null); // compare at month precision
const digits = (s) => String(s ?? '').replace(/\D/g, '');
const urlKey = (u) => (u ? String(u).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '') : null);

// ---------------------------------------------------------------- locating blocks in cv.md lines

function sectionRange(lines, name) {
    const start = lines.findIndex((l) => l.trim() === `## ${name}`);
    if (start === -1) return null;
    let end = lines.findIndex((l, i) => i > start && /^## /.test(l.trim()));
    if (end === -1) end = lines.length;
    return { start, end };
}

/** Items (### headings) of a section, with their line ranges [start, end). */
export function locateItems(lines, sectionName) {
    const range = sectionRange(lines, sectionName);
    if (!range) return [];
    const items = [];
    for (let i = range.start + 1; i < range.end; i += 1) {
        if (/^### /.test(lines[i].trim())) {
            if (items.length) items[items.length - 1].end = i;
            items.push({ title: lines[i].trim().slice(4), start: i, end: range.end });
        }
    }
    return items;
}

function variantRange(lines, owner, variant) {
    const start = lines.findIndex((l, i) => i > owner.start && i < owner.end && l.trim() === `#### ${variant}`);
    if (start === -1) return null;
    let end = lines.findIndex((l, i) => i > start && i < owner.end && /^#{2,4} /.test(l.trim()));
    if (end === -1) end = owner.end;
    while (end - 1 > start && lines[end - 1].trim() === '') end -= 1; // keep trailing blank lines
    return { start, end };
}

/** Current wording of a variant block: bullets (without "- ") and paragraph lines. */
function readVariant(lines, owner, variant) {
    const range = variantRange(lines, owner, variant);
    if (!range) return null;
    const body = lines.slice(range.start + 1, range.end).map((l) => l.trim()).filter(Boolean);
    return { bullets: body.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)), text: body.filter((l) => !l.startsWith('- ')) };
}

/** Replace (or insert) a variant block; returns new lines. New blocks go before "#### details", else at the item end. */
function writeVariant(lines, owner, variant, bodyLines) {
    const block = [`#### ${variant}`, ...bodyLines];
    const range = variantRange(lines, owner, variant);
    if (range) return [...lines.slice(0, range.start), ...block, ...lines.slice(range.end)];

    const details = variantRange(lines, owner, 'details');
    let at = details ? details.start : owner.end;
    if (!details) while (at - 1 > owner.start && lines[at - 1].trim() === '') at -= 1;
    return [...lines.slice(0, at), ...(details ? [] : ['']), ...block, ...(details ? [''] : []), ...lines.slice(at)];
}

/** Wording of one block in cv.md source, e.g. readBlock(src, 'Experience', 0, 'ai'). itemIndex null = section-level. */
export function readBlock(source, sectionName, itemIndex, variant) {
    const lines = source.split('\n');
    const owner = itemIndex === null ? sectionRange(lines, sectionName) : locateItems(lines, sectionName)[itemIndex];
    return owner ? readVariant(lines, owner, variant) : null;
}

// ---------------------------------------------------------------- merge

/**
 * @param cvSource  current content/cv.md text
 * @param extracted output of extractCv (CV_SCHEMA shape)
 * @param role      'ai' | 'software' | 'frontend'
 * @returns { cv, report: { updated, unchanged, conflicts, notes } }
 */
export function mergeExtraction(cvSource, extracted, role) {
    const { data, errors } = buildContent(cvSource);
    if (errors.length) throw new Error(`content/cv.md is invalid before merging:\n  ${errors.join('\n  ')}`);

    let lines = cvSource.split('\n');
    const report = { updated: [], unchanged: [], conflicts: [], notes: [] };
    const conflict = (what, cvValue, pdfValue) => report.conflicts.push({ what, cv: cvValue ?? '(none)', pdf: pdfValue ?? '(none)' });

    // Wording: update this role's block unless identical; for non-ai roles, skip text identical to the ai wording.
    const applyWording = (label, sectionName, itemIndex, newBullets, newText) => {
        const owner = itemIndex === null ? sectionRange(lines, sectionName) : locateItems(lines, sectionName)[itemIndex];
        const current = readVariant(lines, owner, role);
        const proposed = newBullets ?? [newText];
        const currentList = current ? (newBullets ? current.bullets : [current.text.join(' ')]) : null;

        if (currentList && sameList(currentList, proposed)) return report.unchanged.push(label);
        // No block for this role yet: if another role already has exactly this wording, don't duplicate it
        // (the website falls back ai -> software, the chatbot reads every block).
        const others = WORDING_ROLES.filter((r) => r !== role)
            .map((r) => ({ r, v: readVariant(lines, owner, r) }))
            .filter(({ v }) => v);
        if (!current) {
            const same = others.find(({ v }) => sameList(newBullets ? v.bullets : [v.text.join(' ')], proposed));
            if (same) return report.unchanged.push(`${label} (same as ${same.r} wording)`);
        }
        // Keep existing **bold** where a bullet's text did not change.
        const known = new Map([...(currentList ?? []), ...others.flatMap(({ v }) => [...v.bullets, v.text.join(' ')])].map((t) => [normalize(t), t]));
        const body = newBullets ? newBullets.map((b) => `- ${known.get(normalize(b)) ?? b}`) : [known.get(normalize(newText)) ?? newText];
        lines = writeVariant(lines, owner, role, body);
        report.updated.push(label);
    };

    applyWording('Headline', 'Headline', null, null, extracted.headline);
    applyWording('Summary', 'Summary', null, null, extracted.summary);

    // Experience: match by company (+ start date), compare facts, update wording.
    const usedJobs = new Set();
    extracted.experience.forEach((job) => {
        const candidates = data.experience.map((e, i) => ({ e, i })).filter(({ e }) => normalize(e.company) === normalize(job.company));
        const match = candidates.find(({ e }) => month(e.startDate) === month(job.startDate)) ?? candidates[0];
        if (!match) return report.notes.push(`New job in the PDF, not in cv.md (add it by hand): ${job.role} @ ${job.company}`);
        usedJobs.add(match.i);
        const label = `Experience: ${match.e.role} @ ${match.e.company}`;
        if (normalize(match.e.role) !== normalize(job.role)) conflict(`${label}: title`, match.e.role, job.role);
        if (month(match.e.startDate) !== month(job.startDate)) conflict(`${label}: start date`, match.e.startDate, job.startDate);
        if (month(match.e.endDate) !== month(job.endDate)) conflict(`${label}: end date`, match.e.endDate ?? 'present', job.endDate ?? 'present');
        applyWording(label, 'Experience', match.i, job.bullets);
    });
    data.experience.forEach((e, i) => {
        if (!usedJobs.has(i)) report.notes.push(`Job in cv.md but not in this PDF (fine if the CV leaves it out): ${e.role} @ ${e.company}`);
    });

    // Projects: match by title.
    const usedProjects = new Set();
    extracted.projects.forEach((project) => {
        const i = data.projects.findIndex((p) => normalize(p.title) === normalize(project.title));
        if (i === -1) return report.notes.push(`New project in the PDF, not in cv.md (add it by hand): ${project.title}`);
        usedProjects.add(i);
        applyWording(`Project: ${data.projects[i].title}`, 'Projects', i, project.bullets);
    });
    data.projects.forEach((p, i) => {
        if (!usedProjects.has(i)) report.notes.push(`Project in cv.md but not in this PDF: ${p.title}`);
    });

    // Education: compare dates for matching institutions.
    extracted.education.forEach((edu) => {
        // Same institution can appear twice (e.g. HSC and SSC at one college): prefer degree + institution,
        // fall back to institution alone only when it is unambiguous.
        const sameInstitution = data.education.filter((e) => normalize(edu.institution).includes(normalize(e.institution)) || normalize(e.institution).includes(normalize(edu.institution)));
        const sameDegree = (e) => normalize(e.degree) === normalize(edu.degree) || normalize(e.degree).includes(normalize(edu.degree)) || normalize(edu.degree).includes(normalize(e.degree));
        const match = sameInstitution.find(sameDegree) ?? (sameInstitution.length === 1 ? sameInstitution[0] : undefined);
        if (!match) return report.notes.push(`Education in the PDF, not matched in cv.md: ${edu.degree} @ ${edu.institution}`);
        const label = `Education: ${match.degree}`;
        if (month(match.startDate) !== month(edu.startDate)) conflict(`${label}: start date`, match.startDate, edu.startDate);
        if (month(match.endDate) !== month(edu.endDate)) conflict(`${label}: end date`, match.endDate, edu.endDate);
    });

    // Certifications: match by code or name.
    extracted.certifications.forEach((cert) => {
        const match = data.certifications.find((c) => (cert.code && normalize(c.code) === normalize(cert.code)) || normalize(c.name).includes(normalize(cert.name)) || normalize(cert.name).includes(normalize(c.name)));
        if (!match) return report.notes.push(`Certification in the PDF, not in cv.md: ${cert.name}`);
        if (cert.code && normalize(match.code) !== normalize(cert.code)) conflict(`Certification ${match.name}: code`, match.code, cert.code);
        if (month(match.issueDate) !== month(cert.issued)) conflict(`Certification ${match.name}: issued`, match.issueDate, cert.issued);
        if (cert.credentialId && match.credentialId !== cert.credentialId) conflict(`Certification ${match.name}: credential ID`, match.credentialId, cert.credentialId);
    });

    // Languages.
    extracted.languages.forEach((lang) => {
        const match = data.profile.languages.find((l) => normalize(l.language) === normalize(lang.language));
        if (!match) return report.notes.push(`Language in the PDF, not in cv.md: ${lang.language} (${lang.level})`);
        if (normalize(match.level) !== normalize(lang.level)) conflict(`Language ${match.language}: level`, match.level, lang.level);
    });

    // Contact.
    const { contact } = extracted;
    const socials = Object.fromEntries(data.profile.socials.map((s) => [s.platform.toLowerCase(), s.url]));
    if (contact.email && normalize(contact.email) !== normalize(data.profile.contact.email)) conflict('Contact: email', data.profile.contact.email, contact.email);
    if (contact.phone && digits(contact.phone) !== digits(data.profile.contact.phone)) conflict('Contact: phone', data.profile.contact.phone, contact.phone);
    if (contact.location && normalize(contact.location) !== normalize(data.profile.location)) conflict('Contact: location', data.profile.location, contact.location);
    if (contact.website && urlKey(contact.website) !== urlKey(data.profile.website)) conflict('Contact: website', data.profile.website, contact.website);
    if (contact.linkedin && urlKey(contact.linkedin) !== urlKey(socials.linkedin)) conflict('Contact: LinkedIn', socials.linkedin, contact.linkedin);
    if (contact.github && urlKey(contact.github) !== urlKey(socials.github)) conflict('Contact: GitHub', socials.github, contact.github);

    // Skills: report items the PDF lists that cv.md does not mention anywhere in Skills.
    const { data: all } = buildContent(cvSource.replace(/- site: no\n/g, '')); // include hidden categories
    const known = new Set(all.skills.flatMap((c) => c.skills.map((s) => normalize(s.name))));
    const unknown = extracted.skills.flatMap((c) => c.items).filter((s) => !known.has(normalize(s)));
    if (unknown.length) report.notes.push(`Skills in the PDF, not in cv.md: ${[...new Set(unknown)].join(', ')}`);

    return { cv: lines.join('\n'), report };
}

/** Human-readable report (markdown) for the terminal or a pull request. */
export function formatReport(results) {
    const out = [];
    for (const { role, file, report } of results) {
        out.push(`### ${role}: ${file}`, '');
        out.push(`**Wording updated (${report.updated.length}):** ${report.updated.join('; ') || 'none'}`, '');
        out.push(`**Unchanged:** ${report.unchanged.length}`, '');
        if (report.conflicts.length) {
            out.push(`**⚠️ Fact conflicts (${report.conflicts.length}), cv.md NOT changed, decide by hand:**`, '', '| What | cv.md | PDF |', '|---|---|---|');
            for (const c of report.conflicts) out.push(`| ${c.what} | ${c.cv} | ${c.pdf} |`);
            out.push('');
        }
        if (report.notes.length) out.push('**Notes:**', ...report.notes.map((n) => `- ${n}`), '');
    }
    return out.join('\n');
}
