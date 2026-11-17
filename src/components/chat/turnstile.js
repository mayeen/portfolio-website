// Cloudflare Turnstile (bot protection) for the chat. The script is loaded only when the chat is opened,
// so visitors who never chat never contact Cloudflare. The widget is invisible unless Cloudflare
// needs an interactive check, which then appears inside the chat panel.

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise = null;

export function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = SCRIPT_URL;
            script.async = true;
            script.onload = () => resolve(window.turnstile);
            script.onerror = () => {
                scriptPromise = null; // allow a retry on the next open
                reject(new Error('Turnstile script failed to load'));
            };
            document.head.appendChild(script);
        });
    }
    return scriptPromise;
}

/**
 * Renders the widget into `container`. Returns { getToken, remove }:
 * getToken() resolves with a fresh single-use token (waits for Cloudflare if needed); the widget then
 * resets itself to prepare the next one.
 */
export async function createVerifier(container, siteKey, load = loadTurnstile) {
    const turnstile = await load();
    let token = null;
    let waiting = [];
    let id = null;

    const consume = () => {
        const t = token;
        token = null;
        turnstile.reset(id);
        return t;
    };

    id = turnstile.render(container, {
        sitekey: siteKey,
        appearance: 'interaction-only',
        callback: (t) => {
            token = t;
            const waiters = waiting;
            waiting = [];
            if (waiters.length) {
                const fresh = consume();
                waiters.forEach((w) => w.resolve(fresh));
            }
        },
        'error-callback': () => {
            waiting.forEach((w) => w.reject(new Error('Turnstile error')));
            waiting = [];
        },
        'expired-callback': () => {
            token = null;
            turnstile.reset(id);
        },
    });

    return {
        getToken: () => (token ? Promise.resolve(consume()) : new Promise((resolve, reject) => waiting.push({ resolve, reject }))),
        remove: () => turnstile.remove(id),
    };
}
