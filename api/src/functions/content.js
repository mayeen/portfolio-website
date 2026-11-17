import { app } from '@azure/functions';
import { getContainer } from '../cosmos.js';
import { createContentHandler } from '../content-handler.js';

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
