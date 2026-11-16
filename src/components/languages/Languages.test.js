import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Languages, { parseLevel } from './Languages';
import { profile } from '../../data';

describe('parseLevel', () => {
    test.each([
        ['B1 - Conversational', { code: 'B1', label: 'Conversational' }],
        ['C1 - Bilingual Proficiency', { code: 'C1', label: 'Bilingual Proficiency' }],
        ['C2', { code: 'C2', label: '' }],
        ['Native', { code: null, label: 'Native' }],
    ])('%s', (input, expected) => {
        expect(parseLevel(input)).toEqual(expected);
    });
});

describe('Languages section', () => {
    beforeEach(() => render(<Languages />));

    test('shows each language with its level and a CEFR bar filled up to that level', () => {
        for (const { language, level } of profile.languages) {
            const card = screen.getByRole('heading', { name: language }).closest('article');
            const { code, label } = parseLevel(level);
            expect(within(card).getByText(label)).toBeInTheDocument();

            const bar = within(card).getByRole('img', { name: `CEFR level ${code} of C2` });
            const filled = [...bar.children].filter((step) => step.classList.contains('languages__step--on'));
            expect(filled.map((step) => step.textContent).at(-1)).toBe(code);
        }
    });
});
