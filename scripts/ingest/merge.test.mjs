// Tests for merging an extracted CV into cv.md. No Azure needed: extractions are built from the real cv.md.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildContent, CV_PATH } from '../build-content.mjs';
import { mergeExtraction, formatReport, normalize, readBlock } from './merge.mjs';

const source = readFileSync(CV_PATH, 'utf8');
const { data } = buildContent(source);
const plain = (s) => s.replace(/\*\*/g, '');

/** What a perfect extraction of the AI CV would return (no bold: PDFs lose it). */
function perfectExtraction() {
    const socials = Object.fromEntries(data.profile.socials.map((s) => [s.platform.toLowerCase(), s.url]));
    return {
        headline: data.profile.title,
        summary: plain(data.profile.summary),
        contact: { email: data.profile.contact.email, phone: data.profile.contact.phone, location: data.profile.location, website: data.profile.website, linkedin: socials.linkedin, github: socials.github },
        experience: data.experience.map((e) => ({ role: e.role, company: e.company, startDate: e.startDate, endDate: e.endDate, bullets: e.bullets.map(plain) })),
        education: data.education.map((e) => ({ degree: e.degree, institution: e.institution, startDate: e.startDate, endDate: e.endDate })),
        projects: data.projects.map((p, i) => ({ title: p.title, bullets: (readBlock(source, 'Projects', i, 'ai') ?? readBlock(source, 'Projects', i, 'software')).bullets.map(plain) })),
        skills: data.skills.map((c) => ({ category: c.name, items: c.skills.map((s) => s.name) })),
        certifications: data.certifications.map((c) => ({ name: c.name, code: c.code, issuer: c.issuer, issued: c.issueDate, credentialId: c.credentialId })),
        languages: data.profile.languages.map((l) => ({ language: l.language, level: l.level })),
    };
}

const merge = (extracted, role = 'ai', cv = source) => mergeExtraction(cv, extracted, role);

describe('perfect extraction', () => {
    const { cv, report } = merge(perfectExtraction());

    test('changes nothing: missing bold, dashes and spacing do not count as changes', () => {
        assert.equal(cv, source);
        assert.deepEqual(report.updated, []);
        assert.deepEqual(report.conflicts, []);
    });

    test('is idempotent', () => assert.equal(merge(perfectExtraction(), 'ai', cv).cv, cv));
});

describe('wording updates (allowed)', () => {
    test('a reworded bullet replaces only that role block; unchanged bullets keep their **bold**', () => {
        const extracted = perfectExtraction();
        extracted.experience[2].bullets[1] = 'Integrated 40 third-party APIs into the workflow platform.';
        const { cv, report } = merge(extracted);

        assert.deepEqual(report.updated, [`Experience: ${data.experience[2].role} @ ${data.experience[2].company}`]);
        const ai = readBlock(cv, 'Experience', 2, 'ai').bullets;
        assert.equal(ai[1], 'Integrated 40 third-party APIs into the workflow platform.');
        assert.equal(ai[0], readBlock(source, 'Experience', 2, 'ai').bullets[0], 'bold kept on unchanged bullet');
        assert.match(ai[0], /\*\*/);
        assert.deepEqual(readBlock(cv, 'Experience', 2, 'details'), readBlock(source, 'Experience', 2, 'details'), 'details untouched');
        assert.deepEqual(buildContent(cv).errors, []);
    });

    test('ai role: a project that only has software wording, with the same text -> no duplicate ai block', () => {
        const { cv, report } = merge(perfectExtraction(), 'ai');
        assert.equal(readBlock(cv, 'Projects', 2, 'ai'), null, 'Portfolio Website has no ai block');
        assert.ok(report.unchanged.includes('Project: Portfolio Website with CV Chatbot (same as software wording)'));
    });

    test('software role: perfect software extraction -> nothing written; jobs without a software block match the ai wording', () => {
        const extracted = perfectExtraction();
        extracted.headline = plain(readBlock(source, 'Headline', null, 'software').text.join(' '));
        extracted.summary = plain(readBlock(source, 'Summary', null, 'software').text.join(' '));
        extracted.experience.forEach((e, i) => {
            e.bullets = (readBlock(source, 'Experience', i, 'software') ?? readBlock(source, 'Experience', i, 'ai')).bullets.map(plain);
        });
        const { cv, report } = merge(extracted, 'software');
        assert.equal(cv, source);
        assert.ok(report.unchanged.some((u) => u.includes('(same as ai wording)')));
    });

    test('software role: different wording -> new #### software block before #### details, ai untouched', () => {
        const extracted = perfectExtraction();
        extracted.experience[2].bullets = ['Built scalable C# (.NET) backends.', 'Led Angular frontend work.'];
        const { cv } = merge(extracted, 'software');
        assert.deepEqual(readBlock(cv, 'Experience', 2, 'software').bullets, ['Built scalable C# (.NET) backends.', 'Led Angular frontend work.']);
        assert.deepEqual(readBlock(cv, 'Experience', 2, 'ai'), readBlock(source, 'Experience', 2, 'ai'));
        const lines = cv.split('\n');
        assert.ok(lines.indexOf('#### software') < lines.indexOf('#### details', lines.indexOf('#### software')), 'software before details');
        assert.deepEqual(buildContent(cv).errors, []);
    });

    test('headline update touches only the Headline ai block', () => {
        const extracted = perfectExtraction();
        extracted.headline = 'AI Engineer';
        const { cv, report } = merge(extracted);
        assert.deepEqual(report.updated, ['Headline']);
        assert.equal(buildContent(cv).data.profile.title, 'AI Engineer');
        assert.deepEqual(readBlock(cv, 'Headline', null, 'software'), readBlock(source, 'Headline', null, 'software'));
    });
});

describe('facts (never changed, only reported)', () => {
    const cases = [
        ['job end date', (x) => { x.experience[0].endDate = '2026-12'; }, /end date/],
        ['job title', (x) => { x.experience[1].role = 'Senior Integration Engineer'; }, /title/],
        ['education end date', (x) => { x.education[0].endDate = '2026-06'; }, /Education: M\.Sc\..*end date/],
        ['certificate code', (x) => { x.certifications[0].code = 'AI-900'; }, /code/],
        ['website', (x) => { x.contact.website = 'https://kazishahriar.netlify.app/'; }, /website/],
        ['language level', (x) => { x.languages[0].level = 'B2 - Upper Intermediate'; }, /Language German: level/],
        ['phone', (x) => { x.contact.phone = '+49 000 000'; }, /phone/],
    ];
    for (const [name, mutate, pattern] of cases) {
        test(`${name}: reported as conflict, cv.md unchanged`, () => {
            const extracted = perfectExtraction();
            mutate(extracted);
            const { cv, report } = merge(extracted);
            assert.ok(report.conflicts.some((c) => pattern.test(c.what)), JSON.stringify(report.conflicts));
            assert.equal(cv, source);
        });
    }

    test('dates compare at month precision (2026-07-22 vs 2026-07 is not a conflict)', () => {
        const extracted = perfectExtraction();
        extracted.education[0].endDate = '2026-07';
        assert.deepEqual(merge(extracted).report.conflicts, []);
    });

    test('two degrees from the same college (HSC, SSC) are matched by degree, not mixed up', () => {
        const extracted = perfectExtraction();
        extracted.education.reverse(); // order in the PDF must not matter
        assert.deepEqual(merge(extracted).report.conflicts, []);
        extracted.education.find((e) => e.degree === 'Secondary School Certificate').endDate = '2009';
        const { conflicts } = merge(extracted).report;
        assert.deepEqual(conflicts.map((c) => c.what), ['Education: Secondary School Certificate: end date']);
    });

    test('phone numbers compare by digits only', () => {
        const extracted = perfectExtraction();
        extracted.contact.phone = '+49-152-1233-6476';
        assert.deepEqual(merge(extracted).report.conflicts, []);
    });

    test('new job, new project and unknown skills are reported, never added', () => {
        const extracted = perfectExtraction();
        extracted.experience.push({ role: 'ML Engineer', company: 'NewCo', startDate: '2027-01', endDate: null, bullets: ['x'] });
        extracted.projects.push({ title: 'Brand New Project', bullets: ['y'] });
        extracted.skills.push({ category: 'Extra', items: ['Rust', 'Python'] });
        const { cv, report } = merge(extracted);
        assert.equal(cv, source);
        assert.ok(report.notes.some((n) => n.includes('ML Engineer @ NewCo')));
        assert.ok(report.notes.some((n) => n.includes('Brand New Project')));
        assert.ok(report.notes.some((n) => /Skills in the PDF, not in cv\.md: Rust$/.test(n)), 'Python is known, Rust is not');
    });

    test('skills from hidden (site: no) categories count as known', () => {
        const extracted = perfectExtraction();
        extracted.skills.push({ category: 'Old', items: ['Scala', 'SOAP'] });
        assert.ok(!merge(extracted).report.notes.some((n) => n.startsWith('Skills in the PDF')));
    });
});

describe('helpers', () => {
    test('normalize ignores bold, dash style, spacing, case and trailing period', () => {
        assert.equal(normalize('Built **React** dashboards – fast.'), normalize('built react  dashboards - fast'));
    });

    test('normalize absorbs OCR artifacts seen on the real CV PDFs', () => {
        assert.equal(normalize('RMSE of 1.3℃'), normalize('RMSE of 1.3°C'));
        assert.equal(normalize('an agentic Al chatbot'), normalize('an agentic AI chatbot'));
        assert.equal(normalize('Backend: . NET, React'), normalize('Backend: .NET, React'));
        assert.equal(normalize('Ahsanullah University of Science & Technology'), normalize('Ahsanullah University of Science and Technology'));
        assert.equal(normalize('RESTful APIS'), normalize('RESTful APIs'));
        assert.notEqual(normalize('Totally real'), normalize('Totaiiy real'), 'only a standalone "Al" is mapped');
    });

    test('education matches despite "&"/"and", an added country and an abbreviated degree', () => {
        const extracted = perfectExtraction();
        extracted.education[1] = { degree: 'B.Sc. in C.S.E', institution: 'Ahsanullah University of Science and Technology, Bangladesh', startDate: '2013-07', endDate: '2017-06' };
        const { report } = merge(extracted);
        assert.ok(!report.notes.some((n) => n.includes('Ahsanullah')), report.notes.join('\n'));
        assert.deepEqual(report.conflicts, []);
    });

    test('formatReport lists conflicts as a table', () => {
        const extracted = perfectExtraction();
        extracted.education[0].endDate = '2026-06';
        const text = formatReport([{ role: 'ai', file: 'cv.pdf', report: merge(extracted).report }]);
        assert.match(text, /Fact conflicts \(1\)/);
        assert.match(text, /\| Education: M\.Sc\. in Web and Data Science: end date \| 2026-07-22 \| 2026-06 \|/);
    });
});
