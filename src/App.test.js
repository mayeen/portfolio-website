import React from 'react';
import { render, screen, within } from '@testing-library/react';
import App from './App';
import { profile, experience, education, skills, projects, certifications } from './data';

// Whole-page smoke test: every section renders from src/data without crashing.
describe('App', () => {
    beforeEach(() => render(<App />));

    test('renders the AI/ML positioning from the data', () => {
        expect(screen.getByRole('heading', { level: 1, name: new RegExp(profile.name) })).toBeInTheDocument();
        expect(screen.getAllByText(profile.title).length).toBeGreaterThan(0);
        expect(screen.getByText(profile.about)).toBeInTheDocument();
    });

    test('has every section the nav links to', () => {
        const nav = screen.getByRole('navigation');
        for (const link of within(nav).getAllByRole('link').filter((a) => a.getAttribute('href').startsWith('#') && a.getAttribute('href') !== '#home')) {
            const id = link.getAttribute('href').slice(1);
            expect(document.getElementById(id)).not.toBeNull();
        }
    });

    test('lists every job and degree', () => {
        for (const job of experience) expect(screen.getByText(job.role)).toBeInTheDocument();
        for (const degree of education) expect(screen.getByText(degree.degree)).toBeInTheDocument();
    });

    test('lists every skill category, without languages', () => {
        const section = document.getElementById('skills');
        for (const category of skills) expect(within(section).getByText(category.name)).toBeInTheDocument();
        for (const { language } of profile.languages) expect(within(section).queryByText(language)).toBeNull();
    });

    test('has a separate Languages section after Skills', () => {
        const section = document.getElementById('languages');
        expect(section).not.toBeNull();
        expect(document.getElementById('skills').compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        for (const { language } of profile.languages) {
            expect(within(section).getByRole('heading', { name: language })).toBeInTheDocument();
        }
    });

    test('shows every project, each with an image', () => {
        const section = document.getElementById('projects');
        for (const project of projects) {
            expect(within(section).getByRole('img', { name: project.title })).toHaveAttribute('src', project.image);
        }
    });

    test('shows the AI-901 certificate', () => {
        const section = document.getElementById('certifications');
        expect(within(section).getByText(certifications[0].name)).toBeInTheDocument();
        expect(within(section).getByText(/AI-901/)).toBeInTheDocument();
    });

    test('offers the AI CV in English and German', () => {
        expect(screen.getByRole('link', { name: /download cv/i })).toHaveAttribute('href', profile.cv.en);
        expect(screen.getByRole('link', { name: /lebenslauf \(deutsch\)/i })).toHaveAttribute('href', profile.cv.de);
    });
});
