import { CosmosClient } from '@azure/cosmos';

// One client per function instance, reused across requests and functions.
// COSMOS_* app settings are configured on the Function App; COSMOS_KEY is the read-only key.
let container;
export const getContainer = () => {
    if (!container) {
        const { COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE = 'portfolio', COSMOS_CONTAINER = 'content' } = process.env;
        if (!COSMOS_ENDPOINT || !COSMOS_KEY) throw new Error('COSMOS_ENDPOINT / COSMOS_KEY app settings missing');
        container = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY })
            .database(COSMOS_DATABASE)
            .container(COSMOS_CONTAINER);
    }
    return container;
};
