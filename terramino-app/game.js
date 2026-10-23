/**
 * Terramino Game Logic
 * A Tetris clone for multi-instance deployment demonstration
 */

// Game state
let game = {
    board: [],
    currentPiece: null,
    nextPiece: null,
    score: 0,
    lines: 0,
    gameOver: false,
    paused: false,
    dropInterval: null,
    sessionId: null
};

// Tetromino shapes
const SHAPES = {
    I: [[1,1,1,1]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1]],
    S: [[0,1,1],[1,1,0]],
    Z: [[1,1,0],[0,1,1]],
    J: [[1,0,0],[1,1,1]],
    L: [[0,0,1],[1,1,1]]
};

const COLORS = {
    Z: '#14C6CB',
    J: '#EC585D',
    L: '#7B42BC',
    S: '#00CA8E',
    I: '#DC477D',
    O: '#2E71E5',
    T: '#FFCF25'
};

// Canvas elements
let canvas, ctx, nextCanvas, nextCtx;

// Initialize game

// Bootstrap: Discover environments on page load
let environmentsLoaded = false;

async function initializeApp() {
    console.log('Initializing Terramino...');
    
    // Show loading state
    showLoadingState();
    
    try {
        // Try to load from cache first
        const hasCached = loadCachedEnvironments();
        
        if (hasCached) {
            console.log('Loaded environments from cache');
            populateRegionSelector();
            CONFIG.activeRegion = getActiveRegion();
            updateRegionSelector();
        }
        
        // Discover environments (will use cache if fresh)
        const environments = await discoverEnvironments();
        
        // Update UI with discovered environments
        populateRegionSelector();
        
        // Set active region
        CONFIG.activeRegion = getActiveRegion();
        updateRegionSelector();
        
        // Update connection status
        await updateAllConnectionStatus();
        
        environmentsLoaded = true;
        hideLoadingState();
        
        console.log('App initialized successfully');
        
        // Load high scores after successful initialization
        if (CONFIG.environments.length > 0) {
            await loadHighScores();
        }

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showErrorState('Failed to discover game environments. Please refresh the page.');
    }
}

function showLoadingState() {
    const regionSelect = document.getElementById('region-select');
    regionSelect.disabled = true;
    regionSelect.innerHTML = '<option>Loading instances...</option>';
    
    document.getElementById('connection-status').textContent = '⟳ Discovering...';
    document.getElementById('connection-status').className = 'status-loading';
}

function hideLoadingState() {
    const regionSelect = document.getElementById('region-select');
    regionSelect.disabled = false;
}

function showErrorState(message) {
    document.getElementById('connection-status').textContent = '✗ Error';
    document.getElementById('connection-status').className = 'status-error';
    
    // Show error message to user
    alert(message);
}

function populateRegionSelector() {
    const regionSelect = document.getElementById('region-select');
    regionSelect.innerHTML = '';
    
    // Defensive check: ensure environments array exists
    if (!CONFIG.environments || CONFIG.environments.length === 0) {
        regionSelect.innerHTML = '<option>No environments available</option>';
        return;
    }
    
    CONFIG.environments.forEach(environment => {
        const option = document.createElement('option');
        option.value = environment.region_id;
        
        // Add status indicator
        let statusIcon = '';
        switch (environment.status) {
            case 'healthy':
                statusIcon = '✓';
                break;
            case 'unhealthy':
                statusIcon = '⚠';
                break;
            case 'timeout':
            case 'unreachable':
                statusIcon = '✗';
                break;
            default:
                statusIcon = '?';
        }
        
        // Add deployment indicator
        const isCurrentDeployment = environment.region_id === CONFIG.CURRENT_REGION;
        const deploymentBadge = isCurrentDeployment ? ' 🏠' : '';
        
        // Add latency info
        const latencyInfo = environment.latency ? ` (${environment.latency}ms)` : '';
        
        option.textContent = `${statusIcon} ${environment.region_name}${deploymentBadge}${latencyInfo}`;
        
        // Disable unhealthy environments
        if (environment.status !== 'healthy') {
            option.disabled = true;
        }
        
        regionSelect.appendChild(option);
    });
}

function updateRegionSelector() {
    const regionSelect = document.getElementById('region-select');
    regionSelect.value = CONFIG.activeRegion;
}

// Region switching handler
async function handleRegionSwitch(newRegionId) {
    console.log(`Switching to environment: ${newRegionId}`);
    
    const oldRegion = CONFIG.activeRegion;
    
    // Update active region
    setActiveRegion(newRegionId);
    
    // Update UI
    document.getElementById('connection-status').textContent = '⟳ Switching...';
    document.getElementById('connection-status').className = 'status-loading';
    
    try {
        // Check health of new region
        const environment = CONFIG.environments.find(i => i.region_id === newRegionId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        
        // Test connection
        const health = await checkRegionHealth(newRegionId);
        if (!health) {
            throw new Error('Environment is not available');
        }
        
        // Reload high scores from new region
        await loadHighScores();
        
        // Update connection status
        updateConnectionStatus(environment);
        
        // Show notification
        showNotification(`Switched to ${environment.region_name}`, 'success');
        
    } catch (error) {
        console.error('Failed to switch environment:', error);
        
        // Revert to old region
        setActiveRegion(oldRegion);
        updateRegionSelector();
        
        showNotification(`Failed to switch environment: ${error.message}`, 'error');
        
        document.getElementById('connection-status').textContent = '✗ Switch Failed';
        document.getElementById('connection-status').className = 'status-error';
    }
}

async function checkRegionHealth(regionId) {
    const environment = CONFIG.environments.find(i => i.region_id === regionId);
    if (!environment) return false;
    
    try {
        const response = await fetch(`${environment.endpoint}${CONFIG.ENDPOINTS.HEALTH}`, {
            method: 'GET'
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function updateAllConnectionStatus() {
    // Update status for all environments
    const updates = CONFIG.environments.map(async (environment) => {
        const health = await checkRegionHealth(environment.region_id);
        environment.status = health ? 'healthy' : 'unhealthy';
    });
    
    await Promise.all(updates);
    
    // Update UI
    populateRegionSelector();
    
    // Update current connection status
    const activeEnvironment = CONFIG.environments.find(i => i.region_id === CONFIG.activeRegion);
    if (activeEnvironment) {
        updateConnectionStatus(activeEnvironment);
    }
}

function updateConnectionStatus(environment) {
    const statusElement = document.getElementById('connection-status');
    
    switch (environment.status) {
        case 'healthy':
            statusElement.textContent = `● Connected (${environment.latency}ms)`;
            statusElement.className = 'status-connected';
            break;
        case 'unhealthy':
            statusElement.textContent = '⚠ Degraded';
            statusElement.className = 'status-warning';
            break;
        default:
            statusElement.textContent = '✗ Disconnected';
            statusElement.className = 'status-error';
    }
}

function showNotification(message, type = 'info') {
    // Simple notification - can be enhanced with a proper notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create toast notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Periodic health checks (every 30 seconds)
setInterval(() => {
    if (environmentsLoaded) {
        updateAllConnectionStatus();
    }
}, 30000);


document.addEventListener('DOMContentLoaded', async () => {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('next-canvas');
    nextCtx = nextCanvas.getContext('2d');
    
    // Initialize app and discover environments
    await initializeApp();
    
    // Set up player info
    const playerId = getPlayerId();
    document.getElementById('player-id').textContent = playerId;
    
    // Set player name (auto-generated or saved)
    const playerName = getPlayerName();
    document.getElementById('player-name').value = playerName;
    
    // Event listeners
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('player-name').addEventListener('change', (e) => {
        savePlayerName(e.target.value || 'Anonymous');
    });
    document.getElementById('refresh-scores').addEventListener('click', loadHighScores);
    document.getElementById('region-select').addEventListener('change', (e) => {
        handleRegionSwitch(e.target.value);
    });
    
    // Refresh discovery button
    const refreshDiscoveryBtn = document.getElementById('refresh-discovery');
    if (refreshDiscoveryBtn) {
        refreshDiscoveryBtn.addEventListener('click', async () => {
            await discoverEnvironments();
            populateRegionSelector();
            await updateAllConnectionStatus();
        });
    }
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    
    // Initialize
    initBoard();
    drawBoard();
    updateDisplay();
});

// Initialize game board
function initBoard() {
    game.board = Array(CONFIG.GAME.BOARD_HEIGHT).fill(null)
        .map(() => Array(CONFIG.GAME.BOARD_WIDTH).fill(0));
}

// Start new game
function startGame() {
    if (game.dropInterval) {
        return; // Game already running
    }
    
    initBoard();
    game.score = 0;
    game.lines = 0;
    game.gameOver = false;
    game.paused = false;
    
    game.nextPiece = createPiece();
    spawnPiece();
    
    updateDisplay();
    drawBoard();
    drawNextPiece();
    
    document.getElementById('start-btn').disabled = true;
    document.getElementById('pause-btn').disabled = false;
    
    startDropping();
}

// Create random piece
function createPiece() {
    const shapes = Object.keys(SHAPES);
    const type = shapes[Math.floor(Math.random() * shapes.length)];
    return {
        type: type,
        shape: SHAPES[type],
        color: COLORS[type],
        x: Math.floor(CONFIG.GAME.BOARD_WIDTH / 2) - 1,
        y: 0
    };
}

// Spawn new piece
function spawnPiece() {
    game.currentPiece = game.nextPiece;
    game.nextPiece = createPiece();
    
    if (checkCollision(game.currentPiece)) {
        endGame();
    }
    
    drawNextPiece();
}

// Start automatic dropping
function startDropping() {
    // Speed increases every 10 lines completed
    const speedLevel = Math.floor(game.lines / 10);
    const speed = CONFIG.GAME.INITIAL_SPEED - (speedLevel * CONFIG.GAME.SPEED_INCREASE);
    game.dropInterval = setInterval(() => {
        if (!game.paused && !game.gameOver) {
            moveDown();
        }
    }, Math.max(speed, 100));
}

// Stop automatic dropping
function stopDropping() {
    if (game.dropInterval) {
        clearInterval(game.dropInterval);
        game.dropInterval = null;
    }
}

// Move piece down
function moveDown() {
    game.currentPiece.y++;
    
    if (checkCollision(game.currentPiece)) {
        game.currentPiece.y--;
        lockPiece();
        clearLines();
        spawnPiece();
    }
    
    drawBoard();
}

// Move piece left
function moveLeft() {
    game.currentPiece.x--;
    if (checkCollision(game.currentPiece)) {
        game.currentPiece.x++;
    }
    drawBoard();
}

// Move piece right
function moveRight() {
    game.currentPiece.x++;
    if (checkCollision(game.currentPiece)) {
        game.currentPiece.x--;
    }
    drawBoard();
}

// Rotate piece
function rotate() {
    const rotated = game.currentPiece.shape[0].map((_, i) =>
        game.currentPiece.shape.map(row => row[i]).reverse()
    );
    
    const original = game.currentPiece.shape;
    game.currentPiece.shape = rotated;
    
    if (checkCollision(game.currentPiece)) {
        game.currentPiece.shape = original;
    }
    
    drawBoard();
}

// Hard drop
function hardDrop() {
    while (!checkCollision(game.currentPiece)) {
        game.currentPiece.y++;
    }
    game.currentPiece.y--;
    lockPiece();
    clearLines();
    spawnPiece();
    drawBoard();
}

// Check collision
function checkCollision(piece) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const boardX = piece.x + x;
                const boardY = piece.y + y;
                
                if (boardX < 0 || boardX >= CONFIG.GAME.BOARD_WIDTH ||
                    boardY >= CONFIG.GAME.BOARD_HEIGHT ||
                    (boardY >= 0 && game.board[boardY][boardX])) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Lock piece to board
function lockPiece() {
    const piece = game.currentPiece;
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const boardY = piece.y + y;
                const boardX = piece.x + x;
                if (boardY >= 0) {
                    game.board[boardY][boardX] = piece.color;
                }
            }
        }
    }
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;
    
    for (let y = game.board.length - 1; y >= 0; y--) {
        if (game.board[y].every(cell => cell !== 0)) {
            game.board.splice(y, 1);
            game.board.unshift(Array(CONFIG.GAME.BOARD_WIDTH).fill(0));
            linesCleared++;
            y++; // Check same row again
        }
    }
    
    if (linesCleared > 0) {
        game.lines += linesCleared;
        
        // Calculate score: (lines cleared)^2
        const points = linesCleared * linesCleared;
        game.score += points;
        
        // Restart dropping with new speed every 10 lines
        if (game.lines % 10 === 0 && game.lines > 0) {
            stopDropping();
            startDropping();
        }
        
        updateDisplay();
    }
}

// Draw game board
function drawBoard() {
    const blockSize = CONFIG.GAME.BLOCK_SIZE;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw locked pieces
    for (let y = 0; y < game.board.length; y++) {
        for (let x = 0; x < game.board[y].length; x++) {
            if (game.board[y][x]) {
                ctx.fillStyle = game.board[y][x];
                ctx.fillRect(x * blockSize, y * blockSize, blockSize - 1, blockSize - 1);
            }
        }
    }
    
    // Draw current piece
    if (game.currentPiece) {
        ctx.fillStyle = game.currentPiece.color;
        for (let y = 0; y < game.currentPiece.shape.length; y++) {
            for (let x = 0; x < game.currentPiece.shape[y].length; x++) {
                if (game.currentPiece.shape[y][x]) {
                    const boardX = game.currentPiece.x + x;
                    const boardY = game.currentPiece.y + y;
                    if (boardY >= 0) {
                        ctx.fillRect(
                            boardX * blockSize,
                            boardY * blockSize,
                            blockSize - 1,
                            blockSize - 1
                        );
                    }
                }
            }
        }
    }
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CONFIG.GAME.BOARD_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * blockSize, 0);
        ctx.lineTo(x * blockSize, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.GAME.BOARD_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * blockSize);
        ctx.lineTo(canvas.width, y * blockSize);
        ctx.stroke();
    }
}

// Draw next piece
function drawNextPiece() {
    if (!game.nextPiece) return;
    
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    const blockSize = 20;
    const offsetX = (nextCanvas.width - game.nextPiece.shape[0].length * blockSize) / 2;
    const offsetY = (nextCanvas.height - game.nextPiece.shape.length * blockSize) / 2;
    
    nextCtx.fillStyle = game.nextPiece.color;
    for (let y = 0; y < game.nextPiece.shape.length; y++) {
        for (let x = 0; x < game.nextPiece.shape[y].length; x++) {
            if (game.nextPiece.shape[y][x]) {
                nextCtx.fillRect(
                    offsetX + x * blockSize,
                    offsetY + y * blockSize,
                    blockSize - 1,
                    blockSize - 1
                );
            }
        }
    }
}

// Update display
function updateDisplay() {
    document.getElementById('score').textContent = game.score;
    document.getElementById('lines').textContent = game.lines;
}

// Handle keyboard input
function handleKeyPress(e) {
    if (game.gameOver || game.paused || !game.currentPiece) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            moveLeft();
            break;
        case 'ArrowRight':
            e.preventDefault();
            moveRight();
            break;
        case 'ArrowDown':
            e.preventDefault();
            moveDown();
            break;
        case 'ArrowUp':
            e.preventDefault();
            rotate();
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            break;
    }
}

// Toggle pause
function togglePause() {
    game.paused = !game.paused;
    document.getElementById('pause-btn').textContent = game.paused ? 'Resume' : 'Pause';
}

// Reset game
function resetGame() {
    stopDropping();
    initBoard();
    game.currentPiece = null;
    game.nextPiece = null;
    game.score = 0;
    game.lines = 0;
    game.gameOver = false;
    game.paused = false;
    
    updateDisplay();
    drawBoard();
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
}

// End game
async function endGame() {
    game.gameOver = true;
    stopDropping();
    
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
    
    // Check if new high score
    const isNewHigh = saveLocalHighScore(game.score);
    
    // Submit score to API
    await submitScore();
    
    alert(`Game Over!\n\nScore: ${game.score}\nLines: ${game.lines}${isNewHigh ? '\n\n🎉 New Personal Best!' : ''}`);
    
    // Reload high scores
    loadHighScores();
}

// API Functions

// Check API connection
async function checkApiConnection() {
    try {
        const response = await fetch(`${CONFIG.API_ENDPOINT}${CONFIG.ENDPOINTS.SCORES}?limit=1`);
        if (response.ok) {
            document.getElementById('connection-status').className = 'status-connected';
            document.getElementById('connection-status').textContent = '● Connected';
        } else {
            throw new Error('API not responding');
        }
    } catch (error) {
        console.error('API connection error:', error);
        document.getElementById('connection-status').className = 'status-disconnected';
        document.getElementById('connection-status').textContent = '● Disconnected';
    }
}

// Submit score to API
async function submitScore() {
    try {
        const response = await fetch(`${getActiveEndpoint()}${CONFIG.ENDPOINTS.SCORES}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerId: getPlayerId(),
                playerName: getPlayerName(),
                score: game.score,
                linesCleared: game.lines
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Score submitted:', data);
        }
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

// Load high scores
async function loadHighScores() {
    const listElement = document.getElementById('highscores-list');
    
    listElement.innerHTML = '<p class="loading">Loading high scores...</p>';
    
    try {
        const response = await fetch(
            `${getActiveEndpoint()}${CONFIG.ENDPOINTS.SCORES}?limit=10`
        );
        
        if (!response.ok) {
            throw new Error('Failed to load scores');
        }
        
        const data = await response.json();
        displayHighScores(data.scores);
        
    } catch (error) {
        console.error('Error loading high scores:', error);
        listElement.innerHTML = '<p class="error">Failed to load high scores. Please try again.</p>';
    }
}

// Display high scores
function displayHighScores(scores) {
    const listElement = document.getElementById('highscores-list');
    
    if (!scores || scores.length === 0) {
        listElement.innerHTML = '<p class="loading">No scores yet. Be the first!</p>';
        return;
    }
    
    listElement.innerHTML = scores.map(score => `
        <div class="score-entry rank-${score.rank}">
            <span class="score-rank">#${score.rank}</span>
            <div style="flex: 1;">
                <div class="score-player">${(score.playerName || score.playerId).substring(0, 20)}</div>
                <div class="score-details">${score.linesCleared} lines cleared</div>
            </div>
            <span class="score-value">${score.score.toLocaleString()}</span>
        </div>
    `).join('');
}
