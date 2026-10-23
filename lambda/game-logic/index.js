const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'terramino-scores';
const REGION = process.env.AWS_REGION || 'us-east-1';

exports.handler = async (event) => {
    console.log('Game Logic Event:', JSON.stringify(event, null, 2));
    
    try {
        const body = JSON.parse(event.body || '{}');
        const action = body.action;
        
        switch (action) {
            case 'validate_move':
                return await validateMove(body);
            case 'calculate_score':
                return await calculateScore(body);
            case 'end_game':
                return await endGame(body);
            default:
                return response(400, { error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Error:', error);
        return response(500, { error: 'Internal server error', message: error.message });
    }
};

async function validateMove(data) {
    const { piece, position, board } = data;
    
    // Simple validation logic
    if (!piece || !position || !board) {
        return response(400, { valid: false, error: 'Missing required fields' });
    }
    
    // Check if move is valid (simplified)
    const valid = isValidPosition(piece, position, board);
    
    return response(200, { 
        valid,
        message: valid ? 'Move is valid' : 'Invalid move'
    });
}

async function calculateScore(data) {
    const { linesCleared, combo } = data;
    
    // Tetris scoring formula (base points without level multiplier)
    const baseScore = {
        1: 100,
        2: 300,
        3: 500,
        4: 800  // Tetris!
    };
    
    const score = (baseScore[linesCleared] || 0) * (combo || 1);
    
    return response(200, {
        score,
        linesCleared,
        combo
    });
}

async function endGame(data) {
    const { playerId, score, linesCleared } = data;
    
    if (!playerId || score === undefined) {
        return response(400, { error: 'Missing required fields' });
    }
    
    const timestamp = Date.now();
    
    const params = {
        TableName: TABLE_NAME,
        Item: {
            player_id: playerId,
            timestamp: timestamp,
            score: score,
            lines_cleared: linesCleared || 0,
            region: REGION,
            game_date: new Date().toISOString()
        }
    };
    
    try {
        await dynamodb.send(new PutCommand(params));
        
        return response(200, {
            message: 'Game ended successfully',
            playerId,
            score,
            timestamp
        });
    } catch (error) {
        console.error('DynamoDB Error:', error);
        return response(500, { error: 'Failed to save game data' });
    }
}

function isValidPosition(piece, position, board) {
    // Simplified validation - in real game this would be more complex
    const { x, y } = position;
    
    // Check boundaries
    if (x < 0 || x >= 10 || y < 0 || y >= 20) {
        return false;
    }
    
    // Check collision (simplified)
    if (board && board[y] && board[y][x]) {
        return false;
    }
    
    return true;
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
