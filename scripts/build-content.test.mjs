// Tests for the cv.md parser. Run with: npm run test:content
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildContent, serialize, CV_PATH, DATA_DIR } from './build-content.mjs';

// Smallest cv.md that passes validation. Each failure test breaks exactly one thing.
const MINIMAL = `
## Profile
- name: Jane Doe
- shortName: Jane
- email: jane@example.com

## Headline
#### ai
AI Engineer

## Summary
#### ai
**AI engineer** building things.

## Stats
### Experience
- value: 3 years
- icon: bx bx-award

## Socials
### LinkedIn
- url: https://www.linkedin.com/in/jane/
- handle: jane
- icon: bx bxl-linkedin

## Languages
### English
- level: C1

## Downloads

## Experience
### Engineer @ Acme
- id: acme
- dates: 2020-01 to present
- location: Berlin
- technologies: Python, Docker
#### ai
- Built **models**.
#### software
- Built **APIs**.
#### details
- Chatbot-only fact.

## Education
### M.Sc. @ Uni
- id: msc
- dates: 2018-10 to 2020-09-15
- location: Germany
- coursework: ML, Data

### School @ City School
- id: school
- dates: 2012
- location: Germany

## Projects
### Only Software Wording
- id: soft-project
- technologies: C#
#### software
- First line.
- Second line.

## Skills
### Core
- id: core
- skills: Python, RAG
### Hidden
- id: hidden
- site: no
- skills: C# (Advanced)

## Certifications
### Some Cert
- id: some-cert
- issuer: Microsoft
- code: AI-901
- issued: 2026-10-07
`;

const build = (source) => buildContent(source);
const breakWith = (from, to) => {
    assert.ok(MINIMAL.includes(from), `fixture must contain: ${from}`);
    return build(MINIMAL.replace(from, to));
};
const assertError = (result, pattern) => {
    assert.ok(
        result.errors.some((e) => pattern.test(e)),
        `expected an error matching ${pattern}, got:\n  ${result.errors.join('\n  ') || '(no errors)'}`,
    );
};

describe('valid input', () => {
    const { data, errors } = build(MINIMAL);

    test('has no errors', () => assert.deepEqual(errors, []));

    test('builds profile with ai headline and bold summary', () => {
        assert.equal(data.profile.title, 'AI Engineer');
        assert.equal(data.profile.summary, '**AI engineer** building things.');
        assert.equal(data.profile.about, 'AI engineer building things.', 'About falls back to Summary without bold markers');
        assert.equal(data.profile.contact.linkedinHandle, 'jane');
        assert.deepEqual(data.profile.languages, [{ language: 'English', level: 'C1' }]);
    });

    test('website shows the ai wording, not software or details', () => {
        assert.deepEqual(data.experience[0].bullets, ['Built **models**.']);
    });

    test('parses dates: range, present, full date, single year', () => {
        assert.equal(data.experience[0].startDate, '2020-01');
        assert.equal(data.experience[0].endDate, null);
        assert.equal(data.education[0].endDate, '2020-09-15');
        assert.deepEqual([data.education[1].startDate, data.education[1].endDate], [null, '2012']);
    });

    test('splits "Title @ Organisation"', () => {
        assert.equal(data.experience[0].role, 'Engineer');
        assert.equal(data.experience[0].company, 'Acme');
        assert.equal(data.education[0].institution, 'Uni');
    });

    test('falls back to software wording when there is no ai block', () => {
        assert.equal(data.projects[0].description, 'First line. Second line.');
        assert.equal(data.projects[0].image, null);
    });

    test('hides "site: no" skill categories from the website', () => {
        assert.deepEqual(data.skills.map((s) => s.id), ['core']);
        assert.deepEqual(data.skills[0].skills, [{ name: 'Python' }, { name: 'RAG' }]);
    });

    test('ignores HTML comments without shifting line numbers', () => {
        const result = build(`<!--\n\n\n-->\n${MINIMAL.replace('- dates: 2012', '- dates: 20xx')}`);
        const line = `${MINIMAL}`.split('\n').findIndex((l) => l === '- dates: 2012') + 1 + 4;
        assertError(result, new RegExp(`^cv\\.md:${line}: invalid date "20xx"`));
    });
});

describe('validation errors', () => {
    const cases = [
        ['invalid month', '- dates: 2020-01 to present', '- dates: 2020-13 to present', /invalid date "2020-13"/],
        ['start after end', '- dates: 2018-10 to 2020-09-15', '- dates: 2021-10 to 2020-09-15', /start date 2021-10 is after end date/],
        ['duplicate id', '- id: school', '- id: msc', /duplicate id "msc"/],
        ['non-kebab id', '- id: acme', '- id: Acme_Corp', /id "Acme_Corp" must be kebab-case/],
        ['misspelled field', '- location: Berlin', '- locaton: Berlin', /unknown field "locaton"/],
        ['missing required field', '- location: Berlin', '', /missing required field "location"/],
        ['unknown variant', '#### software\n- Built **APIs**.', '#### sofware\n- Built **APIs**.', /unknown variant "#### sofware"/],
        ['unknown section', '## Downloads', '## Download', /unknown section "## Download"/],
        ['missing section', '## Downloads\n', '', /missing section "## Downloads"/],
        ['no website wording', '#### software\n- First line.', '#### details\n- First line.', /needs a "#### ai" or "#### software" block/],
        ['missing headline wording', '## Headline\n#### ai\nAI Engineer', '## Headline', /Headline: needs a "#### ai"/],
        ['title without @', '### Engineer @ Acme', '### Engineer at Acme', /title must be "### <title> @ <organisation>"/],
        ['bad skill level in hidden category', 'C# (Advanced)', 'C# (Guru)', /unknown skill level "Guru"/],
        ['bad site flag', '- site: no', '- site: maybe', /"site" must be "yes" or "no"/],
        ['missing public file', '- technologies: C#', '- technologies: C#\n- image: /images/does-not-exist.png', /"image" file not found: public\/images\/does-not-exist\.png/],
        ['bad link', '- url: https://www.linkedin.com/in/jane/', '- url: linkedin.com/in/jane', /"url" must be an http\(s\) URL/],
        ['bad certificate date', '- issued: 2026-10-07', '- issued: Oct 2026', /invalid date "Oct 2026"/],
        ['malformed line', '- location: Berlin', '- location: Berlin\nrandom text', /unexpected line: "random text"/],
        ['duplicate field', '- location: Berlin', '- location: Berlin\n- location: Munich', /field "location" appears twice/],
    ];

    for (const [name, from, to, pattern] of cases) {
        test(name, () => assertError(breakWith(from, to), pattern));
    }

    test('errors carry the line number of the problem', () => {
        const result = breakWith('- id: acme', '- id: acme\n- colour: blue');
        const line = MINIMAL.replace('- id: acme', '- id: acme\n- colour: blue').split('\n').indexOf('- colour: blue') + 1;
        assertError(result, new RegExp(`^cv\\.md:${line}: `));
    });
});

describe('the real content/cv.md', () => {
    const { data, errors } = build(readFileSync(CV_PATH, 'utf8'));

    test('is valid', () => assert.deepEqual(errors, []));

    test('src/data/*.json is up to date (run "npm run content" if this fails)', () => {
        for (const [name, value] of Object.entries(data)) {
            const committed = readFileSync(join(DATA_DIR, `${name}.json`), 'utf8');
            assert.equal(committed, serialize(value), `src/data/${name}.json is stale`);
        }
    });

    test('website is positioned as AI/ML Engineer', () => {
        assert.equal(data.profile.title, 'AI/ML Engineer');
        assert.match(data.profile.cv.en, /AI_Engineer_EN\.pdf$/);
        assert.match(data.profile.cv.de, /AI_Engineer_DE\.pdf$/);
    });

    test('every project has an image and every job has bullets', () => {
        for (const p of data.projects) assert.ok(p.image, `${p.id} has no image`);
        for (const e of data.experience) assert.ok(e.bullets.length > 0, `${e.id} has no bullets`);
    });

    test('links point to kazishahriar.dev, never the old netlify.app address', () => {
        assert.equal(data.profile.website, 'https://kazishahriar.dev/');
        assert.doesNotMatch(JSON.stringify(data), /netlify\.app/);
    });

    test('certification is AI-901', () => {
        assert.equal(data.certifications[0].code, 'AI-901');
    });
});
