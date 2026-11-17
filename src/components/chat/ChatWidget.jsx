import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useContent } from '../../content/ContentProvider';
import RichText from '../../utils/RichText';
import './chat.css';

// Floating chat about Kazi's experience. Answers come from POST /api/chat (Azure OpenAI, grounded on cv.md).
// The conversation lives only in this component's state: nothing is stored in the browser or by the site.

export const MAX_CHARS = 1000; // same limit as the API
export const MAX_HISTORY = 10; // messages sent per request (the API keeps the same number)
export const SUGGESTIONS = [
    'What AI/ML experience does he have?',
    'Which projects has he built?',
    'Is he available, and where?',
    'Spricht er Deutsch?',
];

const errorReply = (content) => ({ role: 'assistant', content, error: true });

/** Sends the conversation to the API and always resolves to a message (answer or friendly error). */
export async function askChat(messages, { fetchImpl, timeoutMs, email }) {
    const unavailable = `The assistant is unavailable right now. You can reach Kazi directly at ${email}.`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
            signal: controller.signal,
        });
        let body = null;
        try {
            body = await response.json();
        } catch {
            body = null; // e.g. the dev server answering with HTML
        }
        if (response.ok && body?.answer) return { role: 'assistant', content: body.answer };
        if (response.status === 429) return errorReply('You have asked a lot of questions. Please try again in a while.');
        if ((response.status === 400 || response.status === 422) && body?.error) return errorReply(body.error);
        return errorReply(unavailable);
    } catch {
        return errorReply(unavailable); // network error or timeout
    } finally {
        clearTimeout(timer);
    }
}

const ChatWidget = ({ fetchImpl = (...args) => fetch(...args), timeoutMs = 30000 }) => {
    const { profile } = useContent();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]); // { role, content, error? }
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages, loading]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => event.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const send = async (text) => {
        const question = text.trim();
        if (!question || loading) return;
        // Error notes are shown to the visitor but never sent back to the model.
        const history = [...messages.filter((m) => !m.error), { role: 'user', content: question }]
            .slice(-MAX_HISTORY)
            .map(({ role, content }) => ({ role, content }));
        setMessages((prev) => [...prev, { role: 'user', content: question }]);
        setInput('');
        setLoading(true);
        const reply = await askChat(history, { fetchImpl, timeoutMs, email: profile.contact.email });
        setMessages((prev) => [...prev, reply]);
        setLoading(false);
        inputRef.current?.focus();
    };

    const onKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            send(input);
        }
    };

    return (
        <>
            {open && (
                <section id="chat-panel" className="chat__panel" role="dialog" aria-label={`Chat about ${profile.shortName}'s experience`}>
                    <header className="chat__header">
                        <div>
                            <h2 className="chat__title">Ask about {profile.shortName}</h2>
                            <p className="chat__subtitle">AI assistant · answers from the CV</p>
                        </div>
                        <button type="button" className="chat__close" onClick={() => setOpen(false)} aria-label="Close chat">
                            <i className="uil uil-times" />
                        </button>
                    </header>

                    <div className="chat__messages" ref={listRef} aria-live="polite">
                        <div className="chat__message chat__message--assistant">
                            Hi! Ask me anything about my experience, skills and projects, in English or German.
                        </div>
                        {messages.map((m, i) => (
                            <div key={i} className={`chat__message chat__message--${m.role}${m.error ? ' chat__message--error' : ''}`}>
                                <RichText text={m.content} />
                            </div>
                        ))}
                        {loading && (
                            <div className="chat__message chat__message--assistant chat__typing" role="status" aria-label="Assistant is typing">
                                <span /><span /><span />
                            </div>
                        )}
                    </div>

                    {messages.length === 0 && (
                        <div className="chat__suggestions">
                            {SUGGESTIONS.map((s) => (
                                <button key={s} type="button" className="chat__suggestion" onClick={() => send(s)}>{s}</button>
                            ))}
                        </div>
                    )}

                    <form className="chat__form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
                        <textarea
                            ref={inputRef}
                            className="chat__input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={onKeyDown}
                            maxLength={MAX_CHARS}
                            rows={1}
                            placeholder="Ask a question…"
                            aria-label="Your question"
                        />
                        <button type="submit" className="chat__send" disabled={loading || !input.trim()} aria-label="Send">
                            <i className="uil uil-message" />
                        </button>
                    </form>
                    <p className="chat__note">AI answers can be wrong; the CV is authoritative. Questions go to Azure OpenAI and are not stored by this site.</p>
                </section>
            )}

            <button
                type="button"
                className={`chat__toggle${open ? ' chat__toggle--open' : ''}`}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="chat-panel"
                aria-label={open ? 'Close chat' : 'Open chat: ask about my experience'}
            >
                <i className={`uil ${open ? 'uil-times' : 'uil-comment-dots'} chat__toggle-icon`} />
                {!open && <span className="chat__toggle-label">Ask my AI</span>}
            </button>
        </>
    );
};

ChatWidget.propTypes = {
    fetchImpl: PropTypes.func,
    timeoutMs: PropTypes.number,
};

export default ChatWidget;
