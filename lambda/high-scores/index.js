const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'terramino-scores';
const REGION = process.env.AWS_REGION || 'us-east-1';

exports.handler = async (event) => {
    console.log('High Scores Event:', JSON.stringify(event, null, 2));
    
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    const path = event.path || event.rawPath || event.requestContext?.http?.path || '';
    
    try {
        // Health check endpoint
        if (path === '/health' || path.endsWith('/health')) {
            return response(200, { 
                status: 'healthy',
                service: 'terramino-api',
                region: REGION,
                timestamp: new Date().toISOString()
            });
        }
        
        switch (httpMethod) {
            case 'GET':
                return await getHighScores(event);
            case 'POST':
                return await submitScore(event);
            case 'OPTIONS':
                return corsResponse();
            default:
                return response(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return response(500, { error: 'Internal server error', message: error.message });
    }
};

async function getHighScores(event) {
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit) || 10;
    const region = queryParams.region || REGION;
    
    try {
        const params = {
            TableName: TABLE_NAME,
            IndexName: 'region-score-index',
            KeyConditionExpression: 'region = :region',
            ExpressionAttributeValues: {
                ':region': region
            },
            ScanIndexForward: false, // Sort descending (highest scores first)
            Limit: limit
        };
        
        const result = await dynamodb.send(new QueryCommand(params));
        
        const scores = result.Items.map((item, index) => ({
            rank: index + 1,
            playerId: item.player_id,
            playerName: item.player_name || item.player_id,
            score: item.score,
            linesCleared: item.lines_cleared || 0,
            region: item.region,
            date: item.game_date || new Date(item.timestamp).toISOString()
        }));
        
        return response(200, {
            scores,
            region,
            count: scores.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('DynamoDB Query Error:', error);
        
        try {
            const scanParams = {
                TableName: TABLE_NAME,
                Limit: limit
            };
            
            const result = await dynamodb.send(new ScanCommand(scanParams));
            
            const sortedScores = result.Items
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
                .map((item, index) => ({
                    rank: index + 1,
                    playerId: item.player_id,
                    playerName: item.player_name || item.player_id,
                    score: item.score,
                    linesCleared: item.lines_cleared || 0,
                    region: item.region,
                    date: item.game_date || new Date(item.timestamp).toISOString()
                }));
            
            return response(200, {
                scores: sortedScores,
                region,
                count: sortedScores.length,
                timestamp: new Date().toISOString(),
                note: 'Using scan fallback'
            });
            
        } catch (scanError) {
            console.error('DynamoDB Scan Error:', scanError);
            return response(500, { error: 'Failed to retrieve high scores' });
        }
    }
}

async function submitScore(event) {
    const body = JSON.parse(event.body || '{}');
    const { playerId, playerName, score, linesCleared } = body;
    
    if (!playerId || score === undefined) {
        return response(400, { 
            error: 'Missing required fields',
            required: ['playerId', 'score']
        });
    }
    
    if (typeof score !== 'number' || score < 0) {
        return response(400, { error: 'Invalid score value' });
    }
    
    const timestamp = Date.now();
    
    const params = {
        TableName: TABLE_NAME,
        Item: {
            player_id: playerId,
            player_name: playerName || playerId,
            timestamp: timestamp,
            score: score,
            lines_cleared: linesCleared || 0,
            region: REGION,
            game_date: new Date().toISOString()
        }
    };
    
    try {
        await dynamodb.send(new PutCommand(params));
        
        const rank = await getPlayerRank(playerId, score);
        
        return response(201, {
            message: 'Score submitted successfully',
            playerId,
            score,
            rank,
            timestamp,
            region: REGION
        });
        
    } catch (error) {
        console.error('DynamoDB Put Error:', error);
        return response(500, { error: 'Failed to submit score' });
    }
}

async function getPlayerRank(playerId, score) {
    try {
        const params = {
            TableName: TABLE_NAME,
            IndexName: 'region-score-index',
            KeyConditionExpression: 'region = :region AND score > :score',
            ExpressionAttributeValues: {
                ':region': REGION,
                ':score': score
            },
            Select: 'COUNT'
        };
        
        const result = await dynamodb.send(new QueryCommand(params));
        return result.Count + 1;
        
    } catch (error) {
        console.error('Error getting rank:', error);
        return null;
    }
}

function corsResponse() {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        body: ''
    };
}

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}
