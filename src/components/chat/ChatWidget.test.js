import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatWidget, { askChat, safeMedia, SUGGESTIONS, MAX_CHARS, MAX_HISTORY } from './ChatWidget';

// Netlify builds with REACT_APP_TURNSTILE_SITE_KEY set; these tests must not load the real Cloudflare script.
// Tests that need Turnstile pass siteKey and a fake verifier explicitly.
delete process.env.REACT_APP_TURNSTILE_SITE_KEY;

const reply = (status, body) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
const answer = (text) => () => reply(200, { answer: text });
const sentMessages = (fetchImpl, call = 0) => JSON.parse(fetchImpl.mock.calls[call][1].body).messages;

function setup(impl = answer('He has 1.5 years of applied AI.')) {
    const fetchImpl = jest.fn(impl);
    render(<ChatWidget fetchImpl={fetchImpl} />);
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }));
    return fetchImpl;
}

const type = (text) => fireEvent.change(screen.getByLabelText('Your question'), { target: { value: text } });
const pressEnter = () => fireEvent.keyDown(screen.getByLabelText('Your question'), { key: 'Enter' });

describe('ChatWidget', () => {
    test('starts closed; the button opens a dialog with a greeting, suggestions and a focused input', () => {
        render(<ChatWidget fetchImpl={jest.fn()} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /open chat/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/Ask me anything about my experience/)).toBeInTheDocument();
        for (const s of SUGGESTIONS) expect(screen.getByRole('button', { name: s })).toBeInTheDocument();
        expect(screen.getByLabelText('Your question')).toHaveFocus();
    });

    test('a suggestion asks that question and shows the answer; suggestions disappear', async () => {
        const fetchImpl = setup();
        fireEvent.click(screen.getByRole('button', { name: SUGGESTIONS[0] }));

        expect(screen.getByText(SUGGESTIONS[0])).toHaveClass('chat__message--user');
        expect(await screen.findByText('He has 1.5 years of applied AI.')).toHaveClass('chat__message--assistant');
        expect(screen.queryByRole('button', { name: SUGGESTIONS[1] })).not.toBeInTheDocument();
        expect(fetchImpl).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST', signal: expect.anything() }));
        expect(sentMessages(fetchImpl)).toEqual([{ role: 'user', content: SUGGESTIONS[0] }]);
    });

    test('Enter sends, Shift+Enter does not; the input is cleared and the history goes with the next question', async () => {
        const fetchImpl = setup(answer('First answer'));
        type('  Does he know Python?  ');
        fireEvent.keyDown(screen.getByLabelText('Your question'), { key: 'Enter', shiftKey: true });
        expect(fetchImpl).not.toHaveBeenCalled();

        pressEnter();
        expect(screen.getByLabelText('Your question')).toHaveValue('');
        await screen.findByText('First answer');

        type('And .NET?');
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
        expect(sentMessages(fetchImpl, 1)).toEqual([
            { role: 'user', content: 'Does he know Python?' },
            { role: 'assistant', content: 'First answer' },
            { role: 'user', content: 'And .NET?' },
        ]);
    });

    test('shows a typing indicator and blocks sending while waiting', async () => {
        let resolve;
        const fetchImpl = setup(() => new Promise((r) => { resolve = r; }));
        type('q1');
        pressEnter();
        expect(screen.getByRole('status', { name: /typing/i })).toBeInTheDocument();
        await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));

        type('q2');
        expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
        pressEnter();
        expect(fetchImpl).toHaveBeenCalledTimes(1);

        resolve({ ok: true, status: 200, json: () => Promise.resolve({ answer: 'done' }) });
        await screen.findByText('done');
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('empty input is not sent; the input is limited to the API maximum', () => {
        const fetchImpl = setup();
        type('   ');
        pressEnter();
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
        expect(screen.getByLabelText('Your question')).toHaveAttribute('maxLength', String(MAX_CHARS));
    });

    test('errors are shown but never sent back to the model', async () => {
        const fetchImpl = setup();
        fetchImpl.mockImplementationOnce(() => reply(500, { error: 'x' })).mockImplementationOnce(answer('ok'));
        type('q1');
        pressEnter();
        expect(await screen.findByText(/unavailable right now/)).toHaveClass('chat__message--error');

        type('q2');
        pressEnter();
        await screen.findByText('ok');
        expect(sentMessages(fetchImpl, 1)).toEqual([{ role: 'user', content: 'q1' }, { role: 'user', content: 'q2' }]);
    });

    test('sends at most MAX_HISTORY messages', async () => {
        const fetchImpl = setup(answer('a'));
        for (let i = 0; i < 7; i += 1) {
            type(`q${i}`);
            pressEnter();
            // eslint-disable-next-line no-await-in-loop
            await waitFor(() => expect(screen.getAllByText('a')).toHaveLength(i + 1));
        }
        const last = sentMessages(fetchImpl, 6);
        expect(last).toHaveLength(MAX_HISTORY);
        expect(last.at(-1)).toEqual({ role: 'user', content: 'q6' });
    });

    test('closes with the close button and with Escape, keeping the conversation', async () => {
        setup(answer('kept'));
        type('hi');
        pressEnter();
        await screen.findByText('kept');

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /open chat/i }));
        expect(screen.getByText('kept')).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('button', { name: 'Close chat' })[0]);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders **bold** from answers without injecting HTML', async () => {
        setup(answer('Uses **Python** <img src=x onerror=alert(1)>'));
        type('hi');
        pressEnter();
        const bold = await screen.findByText('Python');
        expect(bold.tagName).toBe('B');
        expect(document.querySelector('.chat__messages img')).toBeNull();
    });
});

describe('askChat', () => {
    const opts = (fetchImpl) => ({ fetchImpl, timeoutMs: 1000, email: 'kazi@example.com' });
    const ask = (impl) => askChat([{ role: 'user', content: 'q' }], opts(jest.fn(impl)));

    test.each([
        ['429 rate limit', () => reply(429, { error: 'Too many' }), /asked a lot of questions/],
        ['422 content filter: server message', () => reply(422, { error: 'I can only answer questions about Kazi.' }), /^I can only answer/],
        ['400 validation: server message', () => reply(400, { error: 'message too long (max 1000 characters)' }), /too long/],
        ['500 server error', () => reply(500, { error: 'internal' }), /unavailable.*kazi@example\.com/],
        ['network error', () => Promise.reject(new TypeError('Failed to fetch')), /unavailable/],
        ['HTML instead of JSON (local dev server)', () => Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new SyntaxError('<')) }), /unavailable/],
        ['200 without an answer', () => reply(200, {}), /unavailable/],
    ])('%s -> friendly error message', async (_, impl, pattern) => {
        const { message } = await ask(impl);
        expect(message.error).toBe(true);
        expect(message.content).toMatch(pattern);
    });

    test('times out instead of waiting forever', async () => {
        jest.useFakeTimers();
        const fetchImpl = jest.fn((url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))));
        const pending = askChat([{ role: 'user', content: 'q' }], opts(fetchImpl));
        jest.advanceTimersByTime(1000);
        jest.useRealTimers();
        expect((await pending).message.content).toMatch(/unavailable/);
    });
});

describe('ChatWidget with Turnstile', () => {
    /** Fake verifier: hands out token-1, token-2, ... and records render/remove. */
    function fakeVerifier() {
        const state = { created: 0, removed: 0, issued: 0 };
        const impl = jest.fn(async (container, siteKey) => {
            state.created += 1;
            state.siteKey = siteKey;
            state.container = container;
            return {
                getToken: async () => { state.issued += 1; return `token-${state.issued}`; },
                remove: () => { state.removed += 1; },
            };
        });
        return { state, impl };
    }
    const body = (fetchImpl, call) => JSON.parse(fetchImpl.mock.calls[call][1].body);

    function open(fetchImpl, verifier) {
        render(<ChatWidget fetchImpl={fetchImpl} siteKey="site-key" createVerifierImpl={verifier.impl} />);
        fireEvent.click(screen.getByRole('button', { name: /open chat/i }));
    }

    test('loads Turnstile only when the chat opens, inside the panel, and removes it on close', async () => {
        const verifier = fakeVerifier();
        render(<ChatWidget fetchImpl={jest.fn()} siteKey="site-key" createVerifierImpl={verifier.impl} />);
        expect(verifier.impl).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /open chat/i }));
        expect(verifier.state.siteKey).toBe('site-key');
        expect(screen.getByRole('dialog')).toContainElement(verifier.state.container);
        expect(screen.getByText(/Protected by Cloudflare Turnstile/)).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Escape' });
        await waitFor(() => expect(verifier.state.removed).toBe(1));
    });

    test('first question sends a token; follow-ups send the session from the API instead', async () => {
        const verifier = fakeVerifier();
        const fetchImpl = jest.fn(() => reply(200, { answer: 'ok', session: 'sess-1' }));
        open(fetchImpl, verifier);

        type('q1');
        pressEnter();
        await screen.findByText('ok');
        type('q2');
        pressEnter();
        await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

        expect(body(fetchImpl, 0)).toMatchObject({ turnstileToken: 'token-1' });
        expect(body(fetchImpl, 0).session).toBeUndefined();
        expect(body(fetchImpl, 1)).toMatchObject({ session: 'sess-1' });
        expect(body(fetchImpl, 1).turnstileToken).toBeUndefined();
        expect(verifier.state.issued).toBe(1);
    });

    test('expired session (403 verification) -> retries once with a fresh token', async () => {
        const verifier = fakeVerifier();
        const fetchImpl = jest.fn()
            .mockImplementationOnce(() => reply(200, { answer: 'first', session: 'old' }))
            .mockImplementationOnce(() => reply(403, { error: 'Could not verify', code: 'verification' }))
            .mockImplementationOnce(() => reply(200, { answer: 'second', session: 'new' }));
        open(fetchImpl, verifier);

        type('q1');
        pressEnter();
        await screen.findByText('first');
        type('q2');
        pressEnter();
        await screen.findByText('second');

        expect(body(fetchImpl, 1)).toMatchObject({ session: 'old' });
        expect(body(fetchImpl, 2)).toMatchObject({ turnstileToken: 'token-2' });
        expect(screen.queryByText('Could not verify')).not.toBeInTheDocument();
    });

    test('verification failing with a fresh token is shown, not retried forever', async () => {
        const verifier = fakeVerifier();
        const fetchImpl = jest.fn(() => reply(403, { error: 'Could not verify that you are human.', code: 'verification' }));
        open(fetchImpl, verifier);
        type('q1');
        pressEnter();
        expect(await screen.findByText(/Could not verify/)).toHaveClass('chat__message--error');
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    test('Turnstile failing to load -> question still sent (without token) so the API can answer 403', async () => {
        const fetchImpl = jest.fn(() => reply(403, { error: 'Could not verify that you are human.', code: 'verification' }));
        open(fetchImpl, { impl: jest.fn(() => Promise.reject(new Error('blocked by an ad blocker'))) });
        type('q1');
        pressEnter();
        await screen.findByText(/Could not verify/);
        expect(body(fetchImpl, 0).turnstileToken).toBeUndefined();
    });

    test('without a site key nothing is loaded and no token is sent', async () => {
        const verifier = fakeVerifier();
        const fetchImpl = jest.fn(() => reply(200, { answer: 'ok' }));
        render(<ChatWidget fetchImpl={fetchImpl} siteKey="" createVerifierImpl={verifier.impl} />);
        fireEvent.click(screen.getByRole('button', { name: /open chat/i }));
        type('q');
        pressEnter();
        await screen.findByText('ok');
        expect(verifier.impl).not.toHaveBeenCalled();
        expect(body(fetchImpl, 0)).toEqual({ messages: [{ role: 'user', content: 'q' }] });
        expect(screen.queryByText(/Turnstile/)).not.toBeInTheDocument();
    });
});

describe('answers with an image (salary meme)', () => {
    test('shows the image under the text; only the text goes back to the model', async () => {
        const fetchImpl = setup(() => reply(200, { answer: "I want a competitive salary… I don't mean :p", media: { src: '/chat/competitive-salary.png', alt: 'Meme about competitive salary' } }));
        type('Salary?');
        pressEnter();
        const img = await screen.findByRole('img', { name: 'Meme about competitive salary' });
        expect(img).toHaveAttribute('src', '/chat/competitive-salary.png');
        expect(img.closest('.chat__message')).toHaveTextContent("I don't mean :p");

        type('ok');
        pressEnter();
        await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
        expect(sentMessages(fetchImpl, 1)[1]).toEqual({ role: 'assistant', content: "I want a competitive salary… I don't mean :p" });
    });

    test.each([
        ['https://evil.example/x.jpg'],
        ['//evil.example/x.jpg'],
        ['/chat/../secret.jpg'],
        ['javascript:alert(1)'],
        ['/static/js/main.js'],
    ])('ignores media outside /chat/: %s', (src) => {
        expect(safeMedia({ src, alt: 'x' })).toBeUndefined();
    });

    test('accepts site images in /chat/', () => {
        expect(safeMedia({ src: '/chat/competitive-salary.png', alt: 'a' })).toEqual({ src: '/chat/competitive-salary.png', alt: 'a' });
        expect(safeMedia({ src: '/chat/x.png' })).toEqual({ src: '/chat/x.png', alt: '' });
    });
});
