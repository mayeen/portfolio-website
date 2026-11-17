import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useContent } from '../../content/ContentProvider';
import RichText from '../../utils/RichText';
import { createVerifier } from './turnstile';
import './chat.css';

// Floating chat about Kazi's experience. Answers come from POST /api/chat (Azure OpenAI, grounded on cv.md).
// The conversation lives only in this component's state; nothing is stored in the browser. The API logs each
// question anonymously (no IP, emails/phones masked) to see what visitors ask.
// Bot protection: with REACT_APP_TURNSTILE_SITE_KEY set, the first question carries a Cloudflare Turnstile
// token; the API answers with a session that covers the next questions for 10 minutes.

export const MAX_CHARS = 1000; // same limit as the API
export const MAX_HISTORY = 10; // messages sent per request (the API keeps the same number)
export const SUGGESTIONS = [
    'What AI/ML experience does he have?',
    'Which projects has he built?',
    'Is he available, and where?',
    'Spricht er Deutsch?',
];

const TOKEN_TIMEOUT_MS = 15000;
const errorReply = (content) => ({ role: 'assistant', content, error: true });

/** Only images from the site's own public/chat/ folder are shown (never a URL chosen by the model). */
export const safeMedia = (media) => (
    typeof media?.src === 'string' && /^\/chat\/[\w.-]+\.(jpe?g|png|webp|gif)$/i.test(media.src)
        ? { src: media.src, alt: typeof media.alt === 'string' ? media.alt : '' }
        : undefined
);

/**
 * Sends the conversation to the API. Never throws; resolves to
 * { message (answer or friendly error), session?, verificationFailed? }.
 * auth: { session } or { turnstileToken } (both optional).
 */
export async function askChat(messages, { fetchImpl, timeoutMs, email, auth = {} }) {
    const unavailable = `The assistant is unavailable right now. You can reach Kazi directly at ${email}.`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, ...auth }),
            signal: controller.signal,
        });
        let body = null;
        try {
            body = await response.json();
        } catch {
            body = null; // e.g. the dev server answering with HTML
        }
        if (response.ok && body?.answer) {
            const media = safeMedia(body.media);
            return { message: { role: 'assistant', content: body.answer, ...(media && { media }) }, session: body.session };
        }
        if (response.status === 403 && body?.code === 'verification') return { message: errorReply(body.error), verificationFailed: true };
        if (response.status === 429) return { message: errorReply('You have asked a lot of questions. Please try again in a while.') };
        if ((response.status === 400 || response.status === 422) && body?.error) return { message: errorReply(body.error) };
        return { message: errorReply(unavailable) };
    } catch {
        return { message: errorReply(unavailable) }; // network error or timeout
    } finally {
        clearTimeout(timer);
    }
}

const ChatWidget = ({
    fetchImpl = (...args) => fetch(...args),
    timeoutMs = 30000,
    siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY,
    createVerifierImpl = createVerifier,
}) => {
    const { profile } = useContent();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]); // { role, content, error? }
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const turnstileRef = useRef(null);
    const verifierRef = useRef(null); // Promise<{ getToken, remove }> while the panel is open
    const sessionRef = useRef(null); // signed session from the API, kept while the page is open

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages, loading]);

    // Turnstile widget lives inside the open panel (an interactive check, if needed, appears there).
    useEffect(() => {
        if (!open || !siteKey || !turnstileRef.current) return undefined;
        const verifier = createVerifierImpl(turnstileRef.current, siteKey);
        verifier.catch(() => {}); // a failed load surfaces as a missing token -> the API answers 403
        verifierRef.current = verifier;
        return () => {
            verifierRef.current = null;
            verifier.then((v) => v.remove()).catch(() => {});
        };
    }, [open, siteKey, createVerifierImpl]);

    const getToken = async () => {
        if (!siteKey || !verifierRef.current) return undefined;
        let timer;
        try {
            return await Promise.race([
                verifierRef.current.then((v) => v.getToken()),
                new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), TOKEN_TIMEOUT_MS); }),
            ]);
        } catch {
            return undefined;
        } finally {
            clearTimeout(timer);
        }
    };

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
        const options = { fetchImpl, timeoutMs, email: profile.contact.email };
        const withToken = async () => askChat(history, { ...options, auth: { turnstileToken: await getToken() } });
        let result = sessionRef.current
            ? await askChat(history, { ...options, auth: { session: sessionRef.current } })
            : await withToken();
        if (result.verificationFailed && sessionRef.current) {
            sessionRef.current = null; // session expired: verify again once
            result = await withToken();
        }
        if (result.session) sessionRef.current = result.session;
        setMessages((prev) => [...prev, result.message]);
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
                                {m.media && <img className="chat__media" src={m.media.src} alt={m.media.alt} loading="lazy" />}
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

                    {siteKey && <div ref={turnstileRef} className="chat__turnstile" />}

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
                    <p className="chat__note">
                        AI answers can be wrong; the CV is authoritative. Questions are processed by Azure OpenAI and stored
                        anonymously (no IP address) to improve this assistant.{siteKey && ' Protected by Cloudflare Turnstile.'}
                    </p>
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
    siteKey: PropTypes.string,
    createVerifierImpl: PropTypes.func,
};

export default ChatWidget;
