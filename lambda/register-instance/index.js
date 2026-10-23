const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const REGISTRY_REGION = process.env.REGISTRY_REGION || 'us-east-1';
const client = new DynamoDBClient({ region: REGISTRY_REGION });
const dynamodb = DynamoDBDocumentClient.from(client);

const REGISTRY_TABLE = process.env.REGISTRY_TABLE;
const TTL_DAYS = 30; // Entries expire after 30 days

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event));
    
    // Parse body from API Gateway v2 format
    let payload = {};
    
    if (event.body) {
        // API Gateway v2 format - body is a string
        if (typeof event.body === 'string') {
            try {
                payload = JSON.parse(event.body);
                console.log('Parsed body:', payload);
            } catch (e) {
                console.error('Failed to parse body:', e);
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: 'Invalid JSON in request body',
                        message: e.message
                    })
                };
            }
        } else {
            payload = event.body;
        }
    } else {
        // Direct invocation or test event
        payload = event;
    }
    
    // Extract parameters from payload or environment variables
    const regionId = payload.regionId || process.env.REGION_ID;
    const apiEndpoint = payload.apiEndpoint || process.env.API_ENDPOINT;
    const regionName = payload.regionName || process.env.REGION_NAME;

    console.log('Extracted parameters:', { regionId, apiEndpoint, regionName });

    if (!regionId || !apiEndpoint || !regionName) {
        console.error('Missing required parameters:', { regionId, apiEndpoint, regionName });
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'Missing required parameters',
                required: ['regionId', 'apiEndpoint', 'regionName']
            })
        };
    }
    
    try {
        const now = Math.floor(Date.now() / 1000);
        const ttl = now + (TTL_DAYS * 24 * 60 * 60);
        
        const item = {
            region_id: regionId,
            region_name: regionName,
            endpoint: apiEndpoint,
            last_updated: new Date().toISOString(),
            ttl: ttl,
            status: 'active'
        };
        
        await dynamodb.send(new PutCommand({
            TableName: REGISTRY_TABLE,
            Item: item
        }));
        
        console.log('Environment registered successfully');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Environment registered successfully',
                region_id: regionId,
                endpoint: apiEndpoint
            })
        };
        
    } catch (error) {
        console.error('Error registering environment:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to register environment',
                message: error.message
            })
        };
    }
};
