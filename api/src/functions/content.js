import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { createContentHandler } from '../content-handler.js';

// One client per function instance, reused across requests.
// COSMOS_* app settings are configured on the Function App; COSMOS_KEY is the read-only key.
let container;
const getContainer = () => {
    if (!container) {
        const { COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE = 'portfolio', COSMOS_CONTAINER = 'content' } = process.env;
        if (!COSMOS_ENDPOINT || !COSMOS_KEY) throw new Error('COSMOS_ENDPOINT / COSMOS_KEY app settings missing');
        container = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY })
            .database(COSMOS_DATABASE)
            .container(COSMOS_CONTAINER);
    }
    return container;
};

const handler = createContentHandler({ getContainer });

app.http('content', {
    methods: ['GET'],
    authLevel: 'anonymous', // public portfolio data; the key is read-only
    route: 'content',
    handler: (request, context) => {
        context.log(`GET /api/content`);
        return handler(request);
    },
});
