/**
 * NumberTileSystem - Manages spawning, updating, and lifecycle of NumberTile entities
 * Integrates with MathContentSystem to create tiles with appropriate answer options
 */
class NumberTileSystem {
    constructor(config = {}) {
        this.config = {
            maxTiles: 5, // Maximum number of tiles on screen at once
            spawnInterval: 2.0, // Seconds between spawns
            tileLifetime: 10.0, // Maximum lifetime for tiles in seconds
            spawnMargin: 50, // Margin from screen edges for spawning
            speedVariation: 0.3, // Speed variation factor (0-1)
            ...config
        };
        
        // System state
        this.gameEngine = null;
        this.mathContentSystem = null;
        this.worldBounds = null;
        this.activeTiles = [];
        this.spawnTimer = 0;
        this.currentAnswerOptions = [];
        
        // Spawn locations (edges of screen)
        this.spawnLocations = [];
        
        console.log('NumberTileSystem initialized with config:', this.config);
    }
    
    /**
     * Initialize the system with the game engine
     * @param {GameEngine} gameEngine - The game engine instance
     */
    init(gameEngine) {
        this.gameEngine = gameEngine;
        this.worldBounds = gameEngine.getCanvasSize();
        
        // Get reference to MathContentSystem
        this.mathContentSystem = gameEngine.getSystem('mathContent');
        if (!this.mathContentSystem) {
            console.warn('MathContentSystem not found - NumberTileSystem may not function properly');
        }
        
        // Initialize spawn locations
        this.initializeSpawnLocations();
        
        console.log('NumberTileSystem initialized with game engine');
    }
    
    /**
     * Initialize spawn locations around the screen edges
     */
    initializeSpawnLocations() {
        if (!this.worldBounds) return;
        
        const margin = this.config.spawnMargin;
        const { width, height } = this.worldBounds;
        
        this.spawnLocations = [
            // Top edge
            { x: width / 4, y: -margin, direction: new Vector2D(0, 1) },
            { x: (3 * width) / 4, y: -margin, direction: new Vector2D(0, 1) },
            
            // Bottom edge
            { x: width / 4, y: height + margin, direction: new Vector2D(0, -1) },
            { x: (3 * width) / 4, y: height + margin, direction: new Vector2D(0, -1) },
            
            // Left edge
            { x: -margin, y: height / 4, direction: new Vector2D(1, 0) },
            { x: -margin, y: (3 * height) / 4, direction: new Vector2D(1, 0) },
            
            // Right edge
            { x: width + margin, y: height / 4, direction: new Vector2D(-1, 0) },
            { x: width + margin, y: (3 * height) / 4, direction: new Vector2D(-1, 0) }
        ];
    }
    
    /**
     * Update the number tile system
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        if (!this.gameEngine || !this.mathContentSystem) return;
        
        // Update spawn timer
        this.spawnTimer += deltaTime;
        
        // Update active tiles list
        this.updateActiveTilesList();
        
        // Check if we should spawn new tiles
        if (this.shouldSpawnTiles()) {
            this.spawnTilesForCurrentProblem();
            this.spawnTimer = 0;
        }
        
        // Update tile speeds based on difficulty or game state
        this.updateTileSpeeds();
    }
    
    /**
     * Update the list of active tiles by removing destroyed ones
     */
    updateActiveTilesList() {
        this.activeTiles = this.activeTiles.filter(tile => tile.isActive());
    }
    
    /**
     * Check if new tiles should be spawned
     * @returns {boolean} True if tiles should be spawned
     */
    shouldSpawnTiles() {
        // Don't spawn if we have too many tiles already
        if (this.activeTiles.length >= this.config.maxTiles) {
            return false;
        }
        
        // Don't spawn if not enough time has passed
        if (this.spawnTimer < this.config.spawnInterval) {
            return false;
        }
        
        // Don't spawn if no current problem
        const currentProblem = this.mathContentSystem.getCurrentProblem();
        if (!currentProblem) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Spawn tiles for the current math problem
     */
    spawnTilesForCurrentProblem() {
        const currentProblem = this.mathContentSystem.getCurrentProblem();
        if (!currentProblem) return;
        
        // Generate answer options if we don't have them or if problem changed
        if (this.currentAnswerOptions.length === 0 || 
            this.currentAnswerOptions.correctAnswer !== currentProblem.correctAnswer) {
            
            const difficulty = this.mathContentSystem.getCurrentDifficulty();
            const answerCount = this.getDifficultyBasedAnswerCount(difficulty);
            
            this.currentAnswerOptions = this.mathContentSystem.generateAnswerOptions(
                currentProblem.correctAnswer,
                answerCount,
                difficulty
            );
            
            // Store correct answer for comparison
            this.currentAnswerOptions.correctAnswer = currentProblem.correctAnswer;
        }
        
        // Spawn tiles for each answer option
        this.spawnTilesFromAnswerOptions();
    }
    
    /**
     * Get the number of answer options based on difficulty
     * @param {number} difficulty - Current difficulty level
     * @returns {number} Number of answer options to generate
     */
    getDifficultyBasedAnswerCount(difficulty) {
        const baseCounts = {
            1: 3,
            2: 4,
            3: 4,
            4: 5,
            5: 5
        };
        
        return baseCounts[difficulty] || 4;
    }
    
    /**
     * Spawn tiles from the current answer options
     */
    spawnTilesFromAnswerOptions() {
        const tilesToSpawn = Math.min(
            this.currentAnswerOptions.length,
            this.config.maxTiles - this.activeTiles.length
        );
        
        // Ensure we always spawn at least the correct answer if we have room
        if (tilesToSpawn > 0 && this.currentAnswerOptions.length > 0) {
            // Find the correct answer in the options
            const correctAnswerIndex = this.currentAnswerOptions.findIndex(
                value => value === this.currentAnswerOptions.correctAnswer
            );
            
            // If correct answer exists, make sure it's included in spawning
            let optionsToSpawn = [...this.currentAnswerOptions];
            if (correctAnswerIndex !== -1 && tilesToSpawn < this.currentAnswerOptions.length) {
                // Ensure correct answer is first in the list to guarantee it gets spawned
                optionsToSpawn = [
                    this.currentAnswerOptions.correctAnswer,
                    ...this.currentAnswerOptions.filter(value => value !== this.currentAnswerOptions.correctAnswer)
                ];
            }
            
            // Shuffle spawn locations to add variety
            const shuffledLocations = this.shuffleArray([...this.spawnLocations]);
            
            // Track which options we've spawned
            const spawnedOptions = [];
            
            for (let i = 0; i < tilesToSpawn && i < optionsToSpawn.length; i++) {
                const value = optionsToSpawn[i];
                const isCorrect = value === this.currentAnswerOptions.correctAnswer;
                const spawnLocation = shuffledLocations[i % shuffledLocations.length];
                
                this.spawnTile(value, isCorrect, spawnLocation);
                spawnedOptions.push(value);
            }
            
            // Only clear answer options if we've spawned all of them
            // This ensures the correct answer is always available
            if (spawnedOptions.length >= this.currentAnswerOptions.length) {
                this.currentAnswerOptions = [];
            } else {
                // Remove spawned options from the list, keeping unspawned ones for next time
                this.currentAnswerOptions = this.currentAnswerOptions.filter(
                    value => !spawnedOptions.includes(value)
                );
                // Preserve the correct answer reference
                const correctAnswer = this.currentAnswerOptions.correctAnswer;
                this.currentAnswerOptions.correctAnswer = correctAnswer;
            }
        }
    }
    
    /**
     * Spawn a single number tile at the specified location
     * @param {number} value - The numeric value for the tile
     * @param {boolean} isCorrect - Whether this tile represents the correct answer
     * @param {Object} spawnLocation - Spawn location with x, y, and direction
     */
    spawnTile(value, isCorrect, spawnLocation) {
        // Add some randomization to spawn position
        const randomOffset = 30;
        let x = spawnLocation.x + (Math.random() - 0.5) * randomOffset;
        let y = spawnLocation.y + (Math.random() - 0.5) * randomOffset;
        
        // Ensure tiles don't spawn too close to existing tiles to prevent overlap
        const minDistance = 80; // Minimum distance between tiles
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            let tooClose = false;
            
            for (const existingTile of this.activeTiles) {
                const dx = x - existingTile.position.x;
                const dy = y - existingTile.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                break; // Found a good position
            }
            
            // Try a new position
            x = spawnLocation.x + (Math.random() - 0.5) * randomOffset * 2;
            y = spawnLocation.y + (Math.random() - 0.5) * randomOffset * 2;
            attempts++;
        }
        
        // Create the tile
        const tile = new NumberTile(x, y, value, isCorrect);
        
        // Set world bounds for the tile
        tile.setWorldBounds(this.worldBounds);
        
        // Apply speed variation based on difficulty
        const baseSpeed = this.getBaseSpeedForDifficulty();
        const speedVariation = 1 + (Math.random() - 0.5) * this.config.speedVariation;
        tile.setSpeed(baseSpeed * speedVariation);
        
        // Set initial velocity based on spawn direction with some randomization
        const direction = spawnLocation.direction;
        const randomAngle = (Math.random() - 0.5) * 0.5; // ±0.25 radians variation
        const cos = Math.cos(randomAngle);
        const sin = Math.sin(randomAngle);
        
        const finalDirection = new Vector2D(
            direction.x * cos - direction.y * sin,
            direction.x * sin + direction.y * cos
        );
        
        const velocity = finalDirection.multiply(tile.getSpeed());
        tile.setVelocity(velocity.x, velocity.y);
        
        // Add tile to game engine and track it
        this.gameEngine.addEntity(tile);
        this.activeTiles.push(tile);
        
        console.log(`Spawned NumberTile: value=${value}, correct=${isCorrect}, speed=${tile.getSpeed().toFixed(1)}, pos=(${x.toFixed(1)}, ${y.toFixed(1)})`);
    }
    
    /**
     * Get base speed for tiles based on current difficulty
     * @returns {number} Base speed in pixels per second
     */
    getBaseSpeedForDifficulty() {
        const difficulty = this.mathContentSystem ? this.mathContentSystem.getCurrentDifficulty() : 1;
        
        const baseSpeeds = {
            1: 60,  // Slow for beginners
            2: 80,  // Slightly faster
            3: 100, // Medium speed
            4: 120, // Fast
            5: 150  // Very fast
        };
        
        const baseSpeed = baseSpeeds[difficulty] || 100;
        
        // Apply level-based speed multiplier if available
        const levelMultiplier = this.config.levelSpeedMultiplier || 1.0;
        
        return baseSpeed * levelMultiplier;
    }
    
    /**
     * Update tile speeds based on current game state
     */
    updateTileSpeeds() {
        const targetSpeed = this.getBaseSpeedForDifficulty();
        
        for (const tile of this.activeTiles) {
            // Gradually adjust tile speed towards target
            const currentSpeed = tile.getSpeed();
            const speedDiff = targetSpeed - currentSpeed;
            const adjustmentRate = 0.1; // How quickly to adjust speed
            
            if (Math.abs(speedDiff) > 1) {
                const newSpeed = currentSpeed + speedDiff * adjustmentRate;
                tile.setSpeed(newSpeed);
                
                // Update velocity to match new speed
                const currentVelocity = tile.velocity;
                if (currentVelocity.magnitude() > 0) {
                    const direction = currentVelocity.normalize();
                    const newVelocity = direction.multiply(newSpeed);
                    tile.setVelocity(newVelocity.x, newVelocity.y);
                }
            }
        }
    }
    
    /**
     * Clear all active tiles (useful for level transitions)
     */
    clearAllTiles() {
        for (const tile of this.activeTiles) {
            tile.destroy();
            this.gameEngine.removeEntity(tile);
        }
        
        this.activeTiles = [];
        this.currentAnswerOptions = [];
        console.log('All number tiles cleared');
    }
    
    /**
     * Get all active number tiles
     * @returns {Array} Array of active NumberTile entities
     */
    getActiveTiles() {
        return [...this.activeTiles];
    }
    
    /**
     * Get the number of active tiles
     * @returns {number} Count of active tiles
     */
    getActiveTileCount() {
        return this.activeTiles.length;
    }
    
    /**
     * Force spawn tiles immediately (useful for testing or special events)
     */
    forceSpawnTiles() {
        this.spawnTimer = this.config.spawnInterval;
        this.spawnTilesForCurrentProblem();
    }
    
    /**
     * Set the maximum number of tiles allowed on screen
     * @param {number} maxTiles - Maximum tile count
     */
    setMaxTiles(maxTiles) {
        this.config.maxTiles = Math.max(1, maxTiles);
    }
    
    /**
     * Set the spawn interval between tile generations
     * @param {number} interval - Spawn interval in seconds
     */
    setSpawnInterval(interval) {
        this.config.spawnInterval = Math.max(0.1, interval);
    }
    
    /**
     * Shuffle an array using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    /**
     * System render method (for debug information)
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    render(context) {
        if (this.config.showDebugInfo) {
            this.renderDebugInfo(context);
        }
    }
    
    /**
     * Render debug information about the tile system
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    renderDebugInfo(context) {
        context.fillStyle = '#2c3e50';
        context.font = '12px monospace';
        
        const debugInfo = [
            `Active Tiles: ${this.activeTiles.length}/${this.config.maxTiles}`,
            `Spawn Timer: ${this.spawnTimer.toFixed(1)}s`,
            `Answer Options: ${this.currentAnswerOptions.length}`,
            `Base Speed: ${this.getBaseSpeedForDifficulty()}px/s`
        ];
        
        for (let i = 0; i < debugInfo.length; i++) {
            context.fillText(debugInfo[i], 10, 150 + i * 14);
        }
    }
}

// Make NumberTileSystem available globally
window.NumberTileSystem = NumberTileSystem;