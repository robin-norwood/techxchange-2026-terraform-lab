/**
 * Terramino Configuration
 * This file contains the API endpoint configuration
 * It will be updated by Terraform during deployment
 */

const CONFIG = {
    // Local API Gateway endpoint for this environment
    API_ENDPOINT: '${api_endpoint}',
    
    // Discovery endpoint (uses local API Gateway which invokes central Lambda)
    DISCOVERY_ENDPOINT: '${api_endpoint}/discovery',
    
    // Current deployment region
    CURRENT_REGION: '${region}',
    
    // Active region (user's selection)
    activeRegion: null,
    
    // Discovered environments (populated at runtime)
    environments: [],
    
    // Cache settings
    CACHE: {
        DISCOVERY_TTL: 5 * 60 * 1000, // 5 minutes
        DISCOVERY_KEY: 'terramino_environments',
        DISCOVERY_TIMESTAMP_KEY: 'terramino_environments_timestamp'
    },
    
    // Game configuration
    GAME: {
        BOARD_WIDTH: 10,
        BOARD_HEIGHT: 20,
        BLOCK_SIZE: 36,
        INITIAL_SPEED: 1000,  // milliseconds per drop
        SPEED_INCREASE: 50,   // speed increase per level
        LINES_PER_LEVEL: 10
    },
    
    // API endpoints
    ENDPOINTS: {
        HEALTH: '/health',
        SCORES: '/scores',
        GAME_LOGIC: '/game',
        SESSION: '/session',
        DISCOVERY: '/discovery'
    },
    
    // Local storage keys
    STORAGE: {
        PLAYER_ID: 'terramino_player_id',
        PLAYER_NAME: 'terramino_player_name',
        HIGH_SCORE: 'terramino_high_score',
        ACTIVE_REGION: 'terramino_active_region'
    }
};

// Get active endpoint
function getActiveEndpoint() {
    if (!CONFIG.activeRegion) {
        return CONFIG.API_ENDPOINT;
    }
    
    const environment = CONFIG.environments.find(i => i.region_id === CONFIG.activeRegion);
    return environment ? environment.endpoint : CONFIG.API_ENDPOINT;
}

// Load environments from cache
function loadCachedEnvironments() {
    try {
        const cached = localStorage.getItem(CONFIG.CACHE.DISCOVERY_KEY);
        const timestamp = localStorage.getItem(CONFIG.CACHE.DISCOVERY_TIMESTAMP_KEY);
        
        if (cached && timestamp) {
            const age = Date.now() - parseInt(timestamp);
            if (age < CONFIG.CACHE.DISCOVERY_TTL) {
                const parsed = JSON.parse(cached);
                // Ensure we have a valid array
                if (Array.isArray(parsed) && parsed.length > 0) {
                    CONFIG.environments = parsed;
                    return true;
                }
            }
        }
    } catch (error) {
        console.error('Error loading cached environments:', error);
    }
    // Ensure environments is always an array, never undefined
    if (!Array.isArray(CONFIG.environments)) {
        CONFIG.environments = [];
    }
    return false;
}

// Save environments to cache
function cacheEnvironments(environments) {
    try {
        localStorage.setItem(CONFIG.CACHE.DISCOVERY_KEY, JSON.stringify(environments));
        localStorage.setItem(CONFIG.CACHE.DISCOVERY_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
        console.error('Error caching environments:', error);
    }
}


// Register current environment with the registry
async function registerEnvironment() {
    try {
        console.log('Registering current environment with registry...');
        
        // Extract registry region from discovery endpoint
        // Discovery endpoint format: https://xxx.execute-api.{region}.amazonaws.com/...
        const registryRegion = CONFIG.DISCOVERY_ENDPOINT.match(/\.execute-api\.([^.]+)\.amazonaws\.com/)?.[1] || 'us-east-1';
        
        const registrationPayload = {
            regionId: CONFIG.CURRENT_REGION,
            apiEndpoint: CONFIG.API_ENDPOINT,
            regionName: CONFIG.CURRENT_REGION
        };
        
        console.log('Registration payload:', registrationPayload);
        console.log('Registry region:', registryRegion);
        
        // Call the register Lambda function via the local API Gateway
        const registerUrl = `$${CONFIG.API_ENDPOINT}/register`;
        
        const response = await fetch(registerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationPayload)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Environment registered successfully:', data);
            return true;
        } else {
            const errorText = await response.text();
            console.warn('Registration failed (non-critical):', response.status, errorText);
            return false;
        }
        
    } catch (error) {
        console.warn('Error registering environment (non-critical):', error);
        return false;
    }
}


// Discover available environments
async function discoverEnvironments() {
    try {
        console.log('Discovering environments...');
        console.log('Discovery URL:', CONFIG.DISCOVERY_ENDPOINT);
        
        // First, register this environment (MUST complete before discovery)
        await registerEnvironment();

        // Small delay to ensure DynamoDB consistency
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const response = await fetch(CONFIG.DISCOVERY_ENDPOINT, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Discovery response error:', response.status, errorText);
            throw new Error(`Discovery failed: $${response.status}`);
        }
        
        const data = await response.json();
        console.log('Discovery response:', data);
        
        CONFIG.environments = data.instances || [];
        
        // If no environments discovered, add current environment as fallback
        if (CONFIG.environments.length === 0) {
            console.log('No environments in registry, using current deployment as fallback');
            CONFIG.environments = [{
                region_id: CONFIG.CURRENT_REGION,
                region_name: CONFIG.CURRENT_REGION,
                endpoint: CONFIG.API_ENDPOINT,
                status: 'healthy',
                latency: 0,
                last_updated: new Date().toISOString()
            }];
        }
        
        // Cache the results
        cacheEnvironments(CONFIG.environments);
        
        console.log(`Discovered $${CONFIG.environments.length} environments:`, CONFIG.environments);
        
        return CONFIG.environments;
        
    } catch (error) {
        console.error('Error discovering environments:', error);
        
        // Try to use cached data as fallback
        if (loadCachedEnvironments() && CONFIG.environments.length > 0) {
            console.log('Using cached environments as fallback');
            return CONFIG.environments;
        }
        
        // Last resort: use current deployment
        console.log('Using current deployment as last resort fallback');
        CONFIG.environments = [{
            region_id: CONFIG.CURRENT_REGION,
            region_name: CONFIG.CURRENT_REGION,
            endpoint: CONFIG.API_ENDPOINT,
            status: 'healthy',
            latency: 0,
            last_updated: new Date().toISOString()
        }];
        
        return CONFIG.environments;
    }
}

// Get or restore active region
function getActiveRegion() {
    const stored = localStorage.getItem(CONFIG.STORAGE.ACTIVE_REGION);
    return stored || CONFIG.CURRENT_REGION;
}

// Set active region
function setActiveRegion(regionId) {
    CONFIG.activeRegion = regionId;
    localStorage.setItem(CONFIG.STORAGE.ACTIVE_REGION, regionId);
}

// Generate or retrieve player ID
function getPlayerId() {
    let playerId = localStorage.getItem(CONFIG.STORAGE.PLAYER_ID);
    if (!playerId) {
        playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(CONFIG.STORAGE.PLAYER_ID, playerId);
    }
    return playerId;
}

// Arrays for auto-generated player names
const ADJECTIVES = [
    'Swift', 'Clever', 'Mighty', 'Brave', 'Wise', 'Bold', 'Quick', 'Bright',
    'Fierce', 'Noble', 'Agile', 'Daring', 'Keen', 'Sharp', 'Steady', 'Nimble',
    'Crafty', 'Witty', 'Jolly', 'Merry', 'Speedy', 'Lucky', 'Happy', 'Cheerful'
];

const NOUNS = [
    'Penguin', 'Falcon', 'Tiger', 'Dragon', 'Phoenix', 'Eagle', 'Wolf', 'Bear',
    'Panda', 'Otter', 'Dolphin', 'Hawk', 'Raven', 'Fox', 'Lynx', 'Badger',
    'Octopus', 'Shark', 'Whale', 'Seal', 'Koala', 'Raccoon', 'Squirrel', 'Owl'
];

// Generate a random player name
function generatePlayerName() {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `$${adjective} $${noun}`;
}

// Get player name (auto-generate if not exists)
function getPlayerName() {
    let name = localStorage.getItem(CONFIG.STORAGE.PLAYER_NAME);
    if (!name) {
        name = generatePlayerName();
        localStorage.setItem(CONFIG.STORAGE.PLAYER_NAME, name);
    }
    return name;
}

// Save player name
function savePlayerName(name) {
    localStorage.setItem(CONFIG.STORAGE.PLAYER_NAME, name);
}

// Get local high score
function getLocalHighScore() {
    return parseInt(localStorage.getItem(CONFIG.STORAGE.HIGH_SCORE)) || 0;
}

// Save local high score
function saveLocalHighScore(score) {
    const currentHigh = getLocalHighScore();
    if (score > currentHigh) {
        localStorage.setItem(CONFIG.STORAGE.HIGH_SCORE, score.toString());
        return true;
    }
    return false;
}