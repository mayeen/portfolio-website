import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ContentProvider, useContent, isValidContent, loadContent, SECTIONS } from './ContentProvider';
import * as bundled from '../data';

const BUNDLED = Object.fromEntries(SECTIONS.map((name) => [name, bundled[name]]));
const withTitle = (title) => ({ version: 'v2', ...BUNDLED, profile: { ...BUNDLED.profile, title } });
const jsonResponse = (body, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });

function Title() {
    const { profile } = useContent();
    return <h1>{profile.title}</h1>;
}

const renderWith = (fetchImpl, props = {}) =>
    render(<ContentProvider fetchImpl={fetchImpl} {...props}><Title /></ContentProvider>);

describe('ContentProvider', () => {
    test('renders the bundled content immediately, before the API answers', () => {
        renderWith(() => new Promise(() => {})); // never resolves
        expect(screen.getByRole('heading')).toHaveTextContent(BUNDLED.profile.title);
    });

    test('swaps in newer content from /api/content', async () => {
        const fetchImpl = jest.fn(() => jsonResponse(withTitle('Updated From Cosmos')));
        renderWith(fetchImpl);
        expect(await screen.findByText('Updated From Cosmos')).toBeInTheDocument();
        expect(fetchImpl).toHaveBeenCalledWith('/api/content', expect.objectContaining({ signal: expect.anything() }));
    });

    test.each([
        ['HTTP error', () => jsonResponse({ error: 'Could not load content' }, false)],
        ['network error', () => Promise.reject(new TypeError('Failed to fetch'))],
        ['invalid JSON (e.g. the dev server returning index.html)', () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError('Unexpected token <')) })],
        ['missing sections', () => jsonResponse({ profile: BUNDLED.profile })],
    ])('keeps the bundled content on %s', async (_, fetchImpl) => {
        const spy = jest.fn(fetchImpl);
        renderWith(spy);
        await waitFor(() => expect(spy).toHaveBeenCalled());
        await act(async () => {});
        expect(screen.getByRole('heading')).toHaveTextContent(BUNDLED.profile.title);
    });

    test('gives up after the timeout and keeps the bundled content', async () => {
        let aborted = false;
        const slow = (url, { signal }) => new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => {
                aborted = true;
                reject(new DOMException('Aborted', 'AbortError'));
            });
            setTimeout(() => resolve({ ok: true, json: () => Promise.resolve(withTitle('Too Late')) }), 1000);
        });
        renderWith(slow, { timeoutMs: 20 });
        await waitFor(() => expect(aborted).toBe(true));
        expect(screen.getByRole('heading')).toHaveTextContent(BUNDLED.profile.title);
    });

    test('works without fetch at all (old browsers, tests)', () => {
        render(<ContentProvider><Title /></ContentProvider>); // jsdom has no window.fetch
        expect(screen.getByRole('heading')).toHaveTextContent(BUNDLED.profile.title);
    });

    test('useContent outside a provider falls back to the bundled content', () => {
        render(<Title />);
        expect(screen.getByRole('heading')).toHaveTextContent(BUNDLED.profile.title);
    });
});

describe('isValidContent', () => {
    test('accepts the bundled data and an API response', () => {
        expect(isValidContent(BUNDLED)).toBe(true);
        expect(isValidContent(withTitle('x'))).toBe(true);
    });

    test.each([
        ['null', null],
        ['a string', 'oops'],
        ['no profile', { ...BUNDLED, profile: undefined }],
        ['profile without languages', { ...BUNDLED, profile: { ...BUNDLED.profile, languages: undefined } }],
        ['experience not a list', { ...BUNDLED, experience: {} }],
    ])('rejects %s', (_, value) => {
        expect(isValidContent(value)).toBe(false);
    });
});

describe('loadContent', () => {
    test('returns only the known sections (drops version and anything extra)', async () => {
        const result = await loadContent({
            endpoint: '/api/content',
            timeoutMs: 1000,
            fetchImpl: () => jsonResponse({ ...withTitle('x'), extra: 'ignored' }),
        });
        expect(Object.keys(result).sort()).toEqual([...SECTIONS].sort());
    });
});
