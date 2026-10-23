const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'terramino-scores';
const REGION = process.env.AWS_REGION || 'us-east-1';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

exports.handler = async (event) => {
    console.log('Session Management Event:', JSON.stringify(event, null, 2));
    
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    
    try {
        switch (httpMethod) {
            case 'POST':
                return await createSession(event);
            case 'GET':
                return await getSession(event);
            case 'PUT':
                return await updateSession(event);
            case 'DELETE':
                return await endSession(event);
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

async function createSession(event) {
    const body = JSON.parse(event.body || '{}');
    const { playerId, playerName } = body;
    
    if (!playerId) {
        return response(400, { error: 'playerId is required' });
    }
    
    const sessionId = generateSessionId();
    const timestamp = Date.now();
    
    const session = {
        session_id: sessionId,
        player_id: playerId,
        player_name: playerName || 'Anonymous',
        region: REGION,
        status: 'active',
        created_at: timestamp,
        last_activity: timestamp,
        expires_at: timestamp + SESSION_TIMEOUT,
        score: 0,
        lines_cleared: 0
    };
    
    const params = {
        TableName: TABLE_NAME,
        Item: session
    };
    
    try {
        await dynamodb.send(new PutCommand(params));
        
        return response(201, {
            message: 'Session created successfully',
            session: {
                sessionId: session.session_id,
                playerId: session.player_id,
                playerName: session.player_name,
                region: session.region,
                expiresAt: session.expires_at
            }
        });
        
    } catch (error) {
        console.error('DynamoDB Put Error:', error);
        return response(500, { error: 'Failed to create session' });
    }
}

async function getSession(event) {
    const sessionId = event.pathParameters?.sessionId || 
                     event.queryStringParameters?.sessionId;
    
    if (!sessionId) {
        return response(400, { error: 'sessionId is required' });
    }
    
    const params = {
        TableName: TABLE_NAME,
        Key: {
            session_id: sessionId
        }
    };
    
    try {
        const result = await dynamodb.send(new GetCommand(params));
        
        if (!result.Item) {
            return response(404, { error: 'Session not found' });
        }
        
        const session = result.Item;
        
        // Check if session has expired
        if (session.expires_at < Date.now()) {
            return response(410, { 
                error: 'Session has expired',
                sessionId: session.session_id
            });
        }
        
        return response(200, {
            session: {
                sessionId: session.session_id,
                playerId: session.player_id,
                playerName: session.player_name,
                region: session.region,
                status: session.status,
                score: session.score || 0,
                linesCleared: session.lines_cleared || 0,
                createdAt: session.created_at,
                lastActivity: session.last_activity,
                expiresAt: session.expires_at
            }
        });
        
    } catch (error) {
        console.error('DynamoDB Get Error:', error);
        return response(500, { error: 'Failed to retrieve session' });
    }
}

async function updateSession(event) {
    const body = JSON.parse(event.body || '{}');
    const { sessionId, score, linesCleared } = body;
    
    if (!sessionId) {
        return response(400, { error: 'sessionId is required' });
    }
    
    const timestamp = Date.now();
    
    const params = {
        TableName: TABLE_NAME,
        Key: {
            session_id: sessionId
        },
        UpdateExpression: 'SET last_activity = :timestamp, expires_at = :expires',
        ExpressionAttributeValues: {
            ':timestamp': timestamp,
            ':expires': timestamp + SESSION_TIMEOUT
        },
        ReturnValues: 'ALL_NEW'
    };
    
    if (score !== undefined) {
        params.UpdateExpression += ', score = :score';
        params.ExpressionAttributeValues[':score'] = score;
    }
    
    if (linesCleared !== undefined) {
        params.UpdateExpression += ', lines_cleared = :lines';
        params.ExpressionAttributeValues[':lines'] = linesCleared;
    }
    
    try {
        const result = await dynamodb.send(new UpdateCommand(params));
        
        return response(200, {
            message: 'Session updated successfully',
            session: {
                sessionId: result.Attributes.session_id,
                lastActivity: result.Attributes.last_activity,
                expiresAt: result.Attributes.expires_at,
                score: result.Attributes.score || 0,
                linesCleared: result.Attributes.lines_cleared || 0
            }
        });
        
    } catch (error) {
        console.error('DynamoDB Update Error:', error);
        return response(500, { error: 'Failed to update session' });
    }
}

async function endSession(event) {
    const sessionId = event.pathParameters?.sessionId || 
                     event.queryStringParameters?.sessionId;
    
    if (!sessionId) {
        return response(400, { error: 'sessionId is required' });
    }
    
    const params = {
        TableName: TABLE_NAME,
        Key: {
            session_id: sessionId
        },
        UpdateExpression: 'SET #status = :status, ended_at = :timestamp',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':status': 'ended',
            ':timestamp': Date.now()
        },
        ReturnValues: 'ALL_NEW'
    };
    
    try {
        const result = await dynamodb.send(new UpdateCommand(params));
        
        return response(200, {
            message: 'Session ended successfully',
            session: {
                sessionId: result.Attributes.session_id,
                status: result.Attributes.status,
                endedAt: result.Attributes.ended_at,
                finalScore: result.Attributes.score || 0,
                totalLines: result.Attributes.lines_cleared || 0
            }
        });
        
    } catch (error) {
        console.error('DynamoDB Update Error:', error);
        return response(500, { error: 'Failed to end session' });
    }
}

function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomStr}`;
}

function corsResponse() {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
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
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}
