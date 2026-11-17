import { createVerifier } from './turnstile';

/** Fake window.turnstile: render() stores the options; tests trigger the callbacks. */
function fakeTurnstile() {
    const api = { options: null, resets: 0, removed: [] };
    api.render = jest.fn((container, options) => { api.options = options; return 'widget-1'; });
    api.reset = jest.fn(() => { api.resets += 1; });
    api.remove = jest.fn((id) => api.removed.push(id));
    return api;
}

describe('createVerifier', () => {
    test('renders an invisible widget with the site key', async () => {
        const api = fakeTurnstile();
        const container = document.createElement('div');
        await createVerifier(container, 'site-key', async () => api);
        expect(api.render).toHaveBeenCalledWith(container, expect.objectContaining({ sitekey: 'site-key', appearance: 'interaction-only' }));
    });

    test('a ready token is handed out once, then the widget resets for the next one', async () => {
        const api = fakeTurnstile();
        const verifier = await createVerifier(document.createElement('div'), 'k', async () => api);
        api.options.callback('t1');
        await expect(verifier.getToken()).resolves.toBe('t1');
        expect(api.resets).toBe(1);

        const next = verifier.getToken(); // waits for Cloudflare
        api.options.callback('t2');
        await expect(next).resolves.toBe('t2');
        expect(api.resets).toBe(2);
    });

    test('errors reject waiting callers; expiry drops the token; remove() removes the widget', async () => {
        const api = fakeTurnstile();
        const verifier = await createVerifier(document.createElement('div'), 'k', async () => api);
        const waiting = verifier.getToken();
        api.options['error-callback']();
        await expect(waiting).rejects.toThrow('Turnstile error');

        api.options.callback('t1');
        api.options['expired-callback']();
        const fresh = verifier.getToken();
        api.options.callback('t2');
        await expect(fresh).resolves.toBe('t2');

        verifier.remove();
        expect(api.removed).toEqual(['widget-1']);
    });
});
