import { app } from '@azure/functions';
import { getContainer } from '../cosmos.js';
import { createChatHandler, cachedLoader } from '../chat-handler.js';

// App settings on the Function App: AZURE_AI_* (Foundry resource aif-kazishahriar),
// TURNSTILE_SECRET_KEY (Cloudflare Turnstile; bot protection is off while it is missing).
const { AZURE_AI_ENDPOINT, AZURE_AI_KEY, AZURE_OPENAI_DEPLOYMENT = 'gpt-4.1-mini', TURNSTILE_SECRET_KEY } = process.env;

const getCvMarkdown = cachedLoader(async () => {
    const { resource } = await getContainer().item('cv-md', 'cv').read();
    return resource?.markdown;
});

const handler = createChatHandler({
    getCvMarkdown,
    config: { endpoint: AZURE_AI_ENDPOINT, key: AZURE_AI_KEY, deployment: AZURE_OPENAI_DEPLOYMENT, turnstileSecret: TURNSTILE_SECRET_KEY },
});

app.http('chat', {
    methods: ['POST'],
    authLevel: 'anonymous', // public chatbot; protected by Turnstile, input and rate limits and the Azure content filter
    route: 'chat',
    handler: (request, context) => handler(request, context),
});
