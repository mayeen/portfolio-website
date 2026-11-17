import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatWidget, { askChat, SUGGESTIONS, MAX_CHARS, MAX_HISTORY } from './ChatWidget';

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
        const message = await ask(impl);
        expect(message.error).toBe(true);
        expect(message.content).toMatch(pattern);
    });

    test('times out instead of waiting forever', async () => {
        jest.useFakeTimers();
        const fetchImpl = jest.fn((url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))));
        const pending = askChat([{ role: 'user', content: 'q' }], opts(fetchImpl));
        jest.advanceTimersByTime(1000);
        jest.useRealTimers();
        expect((await pending).content).toMatch(/unavailable/);
    });
});
