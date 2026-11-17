import { app } from '@azure/functions';
import { getContainer } from '../cosmos.js';
import { createChatHandler, cachedLoader } from '../chat-handler.js';

// AZURE_AI_* app settings are configured on the Function App (Foundry resource aif-kazishahriar).
const { AZURE_AI_ENDPOINT, AZURE_AI_KEY, AZURE_OPENAI_DEPLOYMENT = 'gpt-4.1-mini' } = process.env;

const getCvMarkdown = cachedLoader(async () => {
    const { resource } = await getContainer().item('cv-md', 'cv').read();
    return resource?.markdown;
});

const handler = createChatHandler({
    getCvMarkdown,
    config: { endpoint: AZURE_AI_ENDPOINT, key: AZURE_AI_KEY, deployment: AZURE_OPENAI_DEPLOYMENT },
});

app.http('chat', {
    methods: ['POST'],
    authLevel: 'anonymous', // public chatbot; protected by input limits, rate limits and the Azure content filter
    route: 'chat',
    handler: (request, context) => handler(request, context),
});
