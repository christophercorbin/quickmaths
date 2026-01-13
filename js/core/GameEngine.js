/**
 * GameEngine - Core game engine that manages the game loop, systems, and state
 * Provides centralized coordination between all game systems
 */
class GameEngine {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }
        
        this.context = this.canvas.getContext('2d');
        this.config = {
            targetFPS: 60,
            backgroundColor: '#ecf0f1',
            ...config
        };
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.currentState = 'menu';
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateTime = 0;
        
        // Systems and entities
        this.systems = new Map();
        this.entities = new Map();
        this.entitiesToAdd = [];
        this.entitiesToRemove = [];
        
        // Game loop
        this.gameLoopId = null;
        this.boundGameLoop = this.gameLoop.bind(this);
        
        // Initialize canvas properties
        this.initializeCanvas();
        
        console.log('GameEngine initialized with canvas:', canvasId);
    }
    
    /**
     * Initialize canvas properties and context settings
     */
    initializeCanvas() {
        // Set up canvas for crisp pixel rendering
        this.context.imageSmoothingEnabled = false;
        
        // Set default font for text rendering
        this.context.font = '16px Arial';
        this.context.textAlign = 'left';
        this.context.textBaseline = 'top';
        
        console.log(`Canvas initialized: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    /**
     * Start the game engine and begin the game loop
     */
    start() {
        if (this.isRunning) {
            console.warn('GameEngine is already running');
            return;
        }
        
        console.log('Starting GameEngine...');
        this.isRunning = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        
        // Start the game loop
        this.gameLoopId = requestAnimationFrame(this.boundGameLoop);
        
        console.log('GameEngine started successfully');
    }
    
    /**
     * Stop the game engine and halt the game loop
     */
    stop() {
        if (!this.isRunning) {
            console.warn('GameEngine is not running');
            return;
        }
        
        console.log('Stopping GameEngine...');
        this.isRunning = false;
        
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        console.log('GameEngine stopped');
    }
    
    /**
     * Pause the game engine (stops updates but maintains loop for rendering)
     */
    pause() {
        if (!this.isRunning) {
            console.warn('Cannot pause - GameEngine is not running');
            return;
        }
        
        this.isPaused = true;
        console.log('GameEngine paused');
    }
    
    /**
     * Resume the game engine from paused state
     */
    resume() {
        if (!this.isRunning) {
            console.warn('Cannot resume - GameEngine is not running');
            return;
        }
        
        this.isPaused = false;
        this.lastFrameTime = performance.now(); // Reset frame time to avoid large delta
        console.log('GameEngine resumed');
    }
    
    /**
     * Main game loop - handles timing, updates, and rendering
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     */
    gameLoop(currentTime) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Cap delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 1/30); // Max 30 FPS minimum
        
        // Update FPS counter
        this.updateFPS(currentTime);
        
        // Process entity additions and removals
        this.processEntityChanges();
        
        // Update game state (only if not paused)
        if (!this.isPaused) {
            this.update(this.deltaTime);
        }
        
        // Always render (even when paused)
        this.render();
        
        // Continue the game loop
        this.gameLoopId = requestAnimationFrame(this.boundGameLoop);
    }
    
    /**
     * Update all game systems and entities
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        // Get game state manager to check if we should update game logic
        const gameStateManager = this.getSystem('gameState');
        const shouldUpdateGameLogic = !gameStateManager || gameStateManager.isPlaying();
        
        // Update all registered systems
        for (const [name, system] of this.systems) {
            if (system.update) {
                // Always update game state manager, but conditionally update others
                if (name === 'gameState' || shouldUpdateGameLogic) {
                    system.update(deltaTime);
                }
            }
        }
        
        // Only update game entities and input when in playing state
        if (shouldUpdateGameLogic) {
            // Apply input to player character if both exist
            const inputSystem = this.getSystem('input');
            if (inputSystem) {
                const inputState = inputSystem.getInputState();
                
                // Find player character and apply input
                for (const [id, entity] of this.entities) {
                    if (entity instanceof PlayerCharacter && entity.isActive()) {
                        entity.applyInput(inputState);
                    }
                }
            }
            
            // Update all entities
            for (const [id, entity] of this.entities) {
                if (entity.isActive()) {
                    entity.update(deltaTime);
                }
            }
        }
    }
    
    /**
     * Render all game systems and entities
     */
    render() {
        // Clear the canvas
        this.clear();
        
        // Get game state manager to check current state
        const gameStateManager = this.getSystem('gameState');
        
        if (gameStateManager) {
            const currentState = gameStateManager.getCurrentState();
            console.log(`GameEngine render - State: ${currentState}`);
            
            // Always render game state manager (it handles its own state logic)
            console.log('Calling GameStateManager render...');
            gameStateManager.render(this.context);
            
            // Only render game entities and systems when playing
            if (gameStateManager.isPlaying()) {
                // Render all entities
                for (const [id, entity] of this.entities) {
                    if (entity.isActive()) {
                        entity.render(this.context);
                    }
                }
                
                // Render all registered systems (except game state manager)
                for (const [name, system] of this.systems) {
                    if (system.render && name !== 'gameState') {
                        system.render(this.context);
                    }
                }
                
                // Render debug information if enabled
                if (this.config.showDebugInfo) {
                    this.renderDebugInfo();
                }
            }
        } else {
            console.log('GameStateManager not available');
            
            // Fallback: render game entities and systems
            for (const [id, entity] of this.entities) {
                if (entity.isActive()) {
                    entity.render(this.context);
                }
            }
            
            for (const [name, system] of this.systems) {
                if (system.render) {
                    system.render(this.context);
                }
            }
            
            if (this.config.showDebugInfo) {
                this.renderDebugInfo();
            }
        }
    }
    
    /**
     * Clear the canvas with the background color
     */
    clear() {
        this.context.fillStyle = this.config.backgroundColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Register a system with the game engine
     * @param {string} name - The system name
     * @param {Object} system - The system instance
     */
    registerSystem(name, system) {
        console.log(`Registering system '${name}':`, !!system, 'has init method:', typeof system.init === 'function');
        this.systems.set(name, system);
        
        // Initialize system if it has an init method
        if (system.init) {
            console.log(`Calling init() for system '${name}'`);
            system.init(this);
        } else {
            console.log(`System '${name}' has no init method`);
        }
        
        console.log(`System '${name}' registered successfully`);
    }
    
    /**
     * Get a registered system by name
     * @param {string} name - The system name
     * @returns {Object|null} The system instance or null if not found
     */
    getSystem(name) {
        return this.systems.get(name) || null;
    }
    
    /**
     * Remove a system from the game engine
     * @param {string} name - The system name
     * @returns {boolean} True if system was removed
     */
    removeSystem(name) {
        const system = this.systems.get(name);
        if (system && system.destroy) {
            system.destroy();
        }
        return this.systems.delete(name);
    }
    
    /**
     * Add an entity to the game
     * @param {Entity} entity - The entity to add
     */
    addEntity(entity) {
        this.entitiesToAdd.push(entity);
    }
    
    /**
     * Remove an entity from the game
     * @param {string|Entity} entityOrId - The entity instance or ID to remove
     */
    removeEntity(entityOrId) {
        const id = typeof entityOrId === 'string' ? entityOrId : entityOrId.id;
        this.entitiesToRemove.push(id);
    }
    
    /**
     * Get an entity by ID
     * @param {string} id - The entity ID
     * @returns {Entity|null} The entity instance or null if not found
     */
    getEntity(id) {
        return this.entities.get(id) || null;
    }
    
    /**
     * Get all entities of a specific type
     * @param {Function} entityClass - The entity class constructor
     * @returns {Array} Array of entities of the specified type
     */
    getEntitiesByType(entityClass) {
        const result = [];
        for (const [id, entity] of this.entities) {
            if (entity instanceof entityClass) {
                result.push(entity);
            }
        }
        return result;
    }
    
    /**
     * Process pending entity additions and removals
     */
    processEntityChanges() {
        // Add new entities
        for (const entity of this.entitiesToAdd) {
            this.entities.set(entity.id, entity);
        }
        this.entitiesToAdd.length = 0;
        
        // Remove entities
        for (const id of this.entitiesToRemove) {
            const entity = this.entities.get(id);
            if (entity) {
                entity.destroy();
                this.entities.delete(id);
            }
        }
        this.entitiesToRemove.length = 0;
    }
    
    /**
     * Set the current game state
     * @param {string} newState - The new state name
     */
    setState(newState) {
        const oldState = this.currentState;
        this.currentState = newState;
        console.log(`Game state changed: ${oldState} -> ${newState}`);
    }
    
    /**
     * Get the current game state
     * @returns {string} The current state name
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Update FPS counter
     * @param {number} currentTime - Current timestamp
     */
    updateFPS(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.fpsUpdateTime >= 1000) { // Update every second
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
        }
    }
    
    /**
     * Render debug information
     */
    renderDebugInfo() {
        this.context.fillStyle = '#2c3e50';
        this.context.font = '14px monospace';
        
        const debugInfo = [
            `FPS: ${this.fps}`,
            `Delta: ${(this.deltaTime * 1000).toFixed(2)}ms`,
            `State: ${this.currentState}`,
            `Entities: ${this.entities.size}`,
            `Systems: ${this.systems.size}`
        ];
        
        for (let i = 0; i < debugInfo.length; i++) {
            this.context.fillText(debugInfo[i], 10, 10 + i * 16);
        }
    }
    
    /**
     * Get canvas dimensions
     * @returns {Object} Object with width and height properties
     */
    getCanvasSize() {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }
    
    /**
     * Check if the game engine is running
     * @returns {boolean} True if running
     */
    isGameRunning() {
        return this.isRunning;
    }
    
    /**
     * Check if the game engine is paused
     * @returns {boolean} True if paused
     */
    isGamePaused() {
        return this.isPaused;
    }
}

// Make GameEngine available globally
window.GameEngine = GameEngine;