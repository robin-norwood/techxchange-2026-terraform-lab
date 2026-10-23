const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const REGISTRY_REGION = process.env.REGISTRY_REGION || 'us-east-1';
const client = new DynamoDBClient({ region: REGISTRY_REGION });
const dynamodb = DynamoDBDocumentClient.from(client);

const REGISTRY_TABLE = process.env.REGISTRY_TABLE;
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

exports.handler = async (event) => {
    console.log('Discovery request received');
    
    try {
        const response = await dynamodb.send(new ScanCommand({
            TableName: REGISTRY_TABLE
        }));
        
        const instances = response.Items || [];
        
        const now = Math.floor(Date.now() / 1000);
        const activeInstances = instances.filter(instance => {
            return !instance.ttl || instance.ttl > now;
        });
        
        const instancesWithHealth = await Promise.all(
            activeInstances.map(async (instance) => {
                const health = await checkHealth(instance.endpoint);
                return {
                    region_id: instance.region_id,
                    region_name: instance.region_name,
                    endpoint: instance.endpoint,
                    status: health.status,
                    latency: health.latency,
                    last_updated: instance.last_updated
                };
            })
        );
        
        instancesWithHealth.sort((a, b) => 
            a.region_id.localeCompare(b.region_id)
        );
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: JSON.stringify({
                instances: instancesWithHealth,
                timestamp: new Date().toISOString(),
                count: instancesWithHealth.length
            })
        };
        
    } catch (error) {
        console.error('Error discovering instances:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to discover instances',
                message: error.message
            })
        };
    }
};

async function checkHealth(endpoint) {
    const startTime = Date.now();
    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve) => {
        const url = new URL(`${endpoint}/health`);
        const client = url.protocol === 'https:' ? https : http;
        
        const timeout = setTimeout(() => {
            resolve({ status: 'timeout', latency: HEALTH_CHECK_TIMEOUT });
        }, HEALTH_CHECK_TIMEOUT);
        
        const req = client.get(url, (res) => {
            clearTimeout(timeout);
            const latency = Date.now() - startTime;
            
            resolve({
                status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
                latency: latency
            });
            
            // Consume response to free up memory
            res.resume();
        });
        
        req.on('error', () => {
            clearTimeout(timeout);
            const latency = Date.now() - startTime;
            resolve({ status: 'unreachable', latency: latency });
        });
        
        req.end();
    });
}