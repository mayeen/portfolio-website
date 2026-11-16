import React from 'react';
import { render, screen } from '@testing-library/react';
import SkillCategory from './SkillCategory';

const groups = (container) => [...container.querySelectorAll('.skills__group')].map((g) => g.querySelectorAll('.skills__data').length);

describe('SkillCategory', () => {
    test('splits skills into two columns, the first taking the extra one', () => {
        const { container } = render(
            <SkillCategory category={{ name: 'Core', skills: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }} />,
        );
        expect(groups(container)).toEqual([2, 1]);
    });

    test('shows the level only when there is one', () => {
        render(<SkillCategory category={{ name: 'Mixed', skills: [{ name: 'Python', level: 'Advanced' }, { name: 'RAG' }] }} />);
        expect(screen.getByText('Advanced')).toBeInTheDocument();
        expect(document.querySelectorAll('.skills__level')).toHaveLength(1);
    });
});
