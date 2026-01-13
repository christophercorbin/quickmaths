/**
 * PhysicsSystem - Handles object movement, collision detection, and spatial relationships
 * Implements AABB collision detection with spatial hashing for performance optimization
 */
class PhysicsSystem {
    constructor(worldBounds, config = {}) {
        this.worldBounds = worldBounds;
        this.config = {
            cellSize: 64, // Size of spatial hash grid cells
            maxEntitiesPerCell: 10, // Maximum entities per cell before subdivision
            enableSpatialHashing: true,
            ...config
        };
        
        // Spatial hashing grid for collision optimization
        this.spatialHash = new SpatialHashGrid(
            this.worldBounds.width,
            this.worldBounds.height,
            this.config.cellSize
        );
        
        // Collision response callbacks
        this.collisionCallbacks = new Map();
        
        // Performance tracking
        this.collisionChecks = 0;
        this.actualCollisions = 0;
        
        console.log('PhysicsSystem initialized with world bounds:', worldBounds);
    }
    
    /**
     * Initialize the physics system with the game engine
     * @param {GameEngine} gameEngine - The game engine instance
     */
    init(gameEngine) {
        this.gameEngine = gameEngine;
        console.log('PhysicsSystem initialized with game engine');
    }
    
    /**
     * Update physics for all entities
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        if (!this.gameEngine) return;
        
        // Reset performance counters
        this.collisionChecks = 0;
        this.actualCollisions = 0;
        
        // Get all active entities
        const entities = this.getActiveEntities();
        
        // Update positions based on velocity
        this.updatePositions(entities, deltaTime);
        
        // Update spatial hash with new positions
        if (this.config.enableSpatialHashing) {
            this.updateSpatialHash(entities);
        }
        
        // Check for collisions
        this.checkAllCollisions(entities);
    }
    
    /**
     * Get all active entities from the game engine
     * @returns {Array} Array of active entities
     */
    getActiveEntities() {
        const entities = [];
        for (const [id, entity] of this.gameEngine.entities) {
            if (entity.isActive()) {
                entities.push(entity);
            }
        }
        return entities;
    }
    
    /**
     * Update positions of entities based on their velocity
     * @param {Array} entities - Array of entities to update
     * @param {number} deltaTime - Time elapsed since last update
     */
    updatePositions(entities, deltaTime) {
        for (const entity of entities) {
            this.applyVelocity(entity, deltaTime);
        }
    }
    
    /**
     * Apply velocity to an entity's position
     * @param {Entity} entity - The entity to update
     * @param {number} deltaTime - Time elapsed since last update
     */
    applyVelocity(entity, deltaTime) {
        if (!entity.velocity || entity.velocity.magnitude() === 0) {
            return;
        }
        
        // Calculate new position
        const displacement = entity.velocity.multiply(deltaTime);
        entity.position = entity.position.add(displacement);
        
        // Constrain to world bounds if needed
        this.constrainToWorldBounds(entity);
    }
    
    /**
     * Constrain an entity to world boundaries
     * @param {Entity} entity - The entity to constrain
     */
    constrainToWorldBounds(entity) {
        const bounds = entity.getBounds();
        
        // Constrain X position
        if (bounds.x < 0) {
            entity.position.x = 0;
            entity.velocity.x = 0;
        } else if (bounds.x + bounds.width > this.worldBounds.width) {
            entity.position.x = this.worldBounds.width - bounds.width;
            entity.velocity.x = 0;
        }
        
        // Constrain Y position
        if (bounds.y < 0) {
            entity.position.y = 0;
            entity.velocity.y = 0;
        } else if (bounds.y + bounds.height > this.worldBounds.height) {
            entity.position.y = this.worldBounds.height - bounds.height;
            entity.velocity.y = 0;
        }
    }
    
    /**
     * Update the spatial hash grid with current entity positions
     * @param {Array} entities - Array of entities to hash
     */
    updateSpatialHash(entities) {
        this.spatialHash.clear();
        
        for (const entity of entities) {
            this.spatialHash.insert(entity);
        }
    }
    
    /**
     * Check collisions between all entities
     * @param {Array} entities - Array of entities to check
     */
    checkAllCollisions(entities) {
        if (this.config.enableSpatialHashing) {
            this.checkCollisionsWithSpatialHash();
        } else {
            this.checkCollisionsBruteForce(entities);
        }
    }
    
    /**
     * Check collisions using spatial hashing for optimization
     */
    checkCollisionsWithSpatialHash() {
        const checkedPairs = new Set();
        
        // Get all occupied cells
        const occupiedCells = this.spatialHash.getOccupiedCells();
        
        for (const cell of occupiedCells) {
            const entities = this.spatialHash.getEntitiesInCell(cell.x, cell.y);
            
            // Check collisions within this cell
            for (let i = 0; i < entities.length; i++) {
                for (let j = i + 1; j < entities.length; j++) {
                    const entityA = entities[i];
                    const entityB = entities[j];
                    
                    // Create unique pair identifier
                    const pairId = this.createPairId(entityA.id, entityB.id);
                    if (checkedPairs.has(pairId)) continue;
                    
                    checkedPairs.add(pairId);
                    this.checkCollisionBetween(entityA, entityB);
                }
            }
        }
    }
    
    /**
     * Check collisions using brute force method (for comparison/fallback)
     * @param {Array} entities - Array of entities to check
     */
    checkCollisionsBruteForce(entities) {
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                this.checkCollisionBetween(entities[i], entities[j]);
            }
        }
    }
    
    /**
     * Check collision between two specific entities
     * @param {Entity} entityA - First entity
     * @param {Entity} entityB - Second entity
     */
    checkCollisionBetween(entityA, entityB) {
        this.collisionChecks++;
        
        if (this.detectCollision(entityA, entityB)) {
            this.actualCollisions++;
            this.handleCollision(entityA, entityB);
        }
    }
    
    /**
     * Detect collision between two entities using AABB
     * @param {Entity} entityA - First entity
     * @param {Entity} entityB - Second entity
     * @returns {boolean} True if entities are colliding
     */
    detectCollision(entityA, entityB) {
        const boundsA = entityA.getBounds();
        const boundsB = entityB.getBounds();
        
        return this.aabbCollision(boundsA, boundsB);
    }
    
    /**
     * Axis-Aligned Bounding Box collision detection
     * @param {Object} boundsA - Bounds of first entity {x, y, width, height}
     * @param {Object} boundsB - Bounds of second entity {x, y, width, height}
     * @returns {boolean} True if bounding boxes overlap
     */
    aabbCollision(boundsA, boundsB) {
        return (
            boundsA.x < boundsB.x + boundsB.width &&
            boundsA.x + boundsA.width > boundsB.x &&
            boundsA.y < boundsB.y + boundsB.height &&
            boundsA.y + boundsA.height > boundsB.y
        );
    }
    
    /**
     * Handle collision between two entities
     * @param {Entity} entityA - First entity
     * @param {Entity} entityB - Second entity
     */
    handleCollision(entityA, entityB) {
        // Call registered collision callbacks
        this.invokeCollisionCallbacks(entityA, entityB);
        
        // Call entity-specific collision handlers if they exist
        if (entityA.onCollision) {
            entityA.onCollision(entityB);
        }
        if (entityB.onCollision) {
            entityB.onCollision(entityA);
        }
    }
    
    /**
     * Invoke all registered collision callbacks
     * @param {Entity} entityA - First entity
     * @param {Entity} entityB - Second entity
     */
    invokeCollisionCallbacks(entityA, entityB) {
        for (const [id, callback] of this.collisionCallbacks) {
            try {
                callback(entityA, entityB);
            } catch (error) {
                console.error(`Error in collision callback ${id}:`, error);
            }
        }
    }
    
    /**
     * Register a collision response callback
     * @param {string} id - Unique identifier for the callback
     * @param {Function} callback - Callback function (entityA, entityB) => void
     */
    registerCollisionCallback(id, callback) {
        this.collisionCallbacks.set(id, callback);
        console.log(`Collision callback '${id}' registered`);
    }
    
    /**
     * Unregister a collision response callback
     * @param {string} id - Identifier of the callback to remove
     * @returns {boolean} True if callback was removed
     */
    unregisterCollisionCallback(id) {
        const removed = this.collisionCallbacks.delete(id);
        if (removed) {
            console.log(`Collision callback '${id}' unregistered`);
        }
        return removed;
    }
    
    /**
     * Create a unique identifier for an entity pair
     * @param {string} idA - First entity ID
     * @param {string} idB - Second entity ID
     * @returns {string} Unique pair identifier
     */
    createPairId(idA, idB) {
        return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
    }
    
    /**
     * Get collision performance statistics
     * @returns {Object} Performance statistics
     */
    getPerformanceStats() {
        return {
            collisionChecks: this.collisionChecks,
            actualCollisions: this.actualCollisions,
            spatialHashEnabled: this.config.enableSpatialHashing,
            cellCount: this.spatialHash.getCellCount(),
            occupiedCells: this.spatialHash.getOccupiedCells().length
        };
    }
    
    /**
     * Enable or disable spatial hashing
     * @param {boolean} enabled - Whether to enable spatial hashing
     */
    setSpatialHashingEnabled(enabled) {
        this.config.enableSpatialHashing = enabled;
        console.log(`Spatial hashing ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Render debug information for the physics system
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    render(context) {
        if (this.config.showDebugInfo) {
            this.renderDebugInfo(context);
        }
        
        if (this.config.showSpatialGrid) {
            this.spatialHash.renderGrid(context);
        }
    }
    
    /**
     * Render debug information
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    renderDebugInfo(context) {
        const stats = this.getPerformanceStats();
        
        context.fillStyle = '#2c3e50';
        context.font = '12px monospace';
        
        const debugInfo = [
            `Collision Checks: ${stats.collisionChecks}`,
            `Actual Collisions: ${stats.actualCollisions}`,
            `Spatial Hash: ${stats.spatialHashEnabled ? 'ON' : 'OFF'}`,
            `Occupied Cells: ${stats.occupiedCells}/${stats.cellCount}`
        ];
        
        for (let i = 0; i < debugInfo.length; i++) {
            context.fillText(debugInfo[i], 10, 100 + i * 14);
        }
    }
}

/**
 * SpatialHashGrid - Spatial hashing implementation for efficient collision detection
 */
class SpatialHashGrid {
    constructor(worldWidth, worldHeight, cellSize) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.cellSize = cellSize;
        
        this.cols = Math.ceil(worldWidth / cellSize);
        this.rows = Math.ceil(worldHeight / cellSize);
        
        // Grid storage - Map of "x,y" -> Array of entities
        this.grid = new Map();
        
        console.log(`SpatialHashGrid created: ${this.cols}x${this.rows} cells (${this.cellSize}px each)`);
    }
    
    /**
     * Clear all entities from the grid
     */
    clear() {
        this.grid.clear();
    }
    
    /**
     * Insert an entity into the spatial hash grid
     * @param {Entity} entity - The entity to insert
     */
    insert(entity) {
        const bounds = entity.getBounds();
        const cells = this.getCellsForBounds(bounds);
        
        for (const cell of cells) {
            const key = `${cell.x},${cell.y}`;
            
            if (!this.grid.has(key)) {
                this.grid.set(key, []);
            }
            
            this.grid.get(key).push(entity);
        }
    }
    
    /**
     * Get all cells that a bounding box overlaps
     * @param {Object} bounds - Bounding box {x, y, width, height}
     * @returns {Array} Array of cell coordinates {x, y}
     */
    getCellsForBounds(bounds) {
        const cells = [];
        
        const startX = Math.max(0, Math.floor(bounds.x / this.cellSize));
        const endX = Math.min(this.cols - 1, Math.floor((bounds.x + bounds.width) / this.cellSize));
        const startY = Math.max(0, Math.floor(bounds.y / this.cellSize));
        const endY = Math.min(this.rows - 1, Math.floor((bounds.y + bounds.height) / this.cellSize));
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                cells.push({ x, y });
            }
        }
        
        return cells;
    }
    
    /**
     * Get all entities in a specific cell
     * @param {number} cellX - Cell X coordinate
     * @param {number} cellY - Cell Y coordinate
     * @returns {Array} Array of entities in the cell
     */
    getEntitiesInCell(cellX, cellY) {
        const key = `${cellX},${cellY}`;
        return this.grid.get(key) || [];
    }
    
    /**
     * Get all occupied cells
     * @returns {Array} Array of cell coordinates that contain entities
     */
    getOccupiedCells() {
        const cells = [];
        
        for (const key of this.grid.keys()) {
            const [x, y] = key.split(',').map(Number);
            cells.push({ x, y });
        }
        
        return cells;
    }
    
    /**
     * Get the total number of cells in the grid
     * @returns {number} Total cell count
     */
    getCellCount() {
        return this.cols * this.rows;
    }
    
    /**
     * Render the spatial grid for debugging
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    renderGrid(context) {
        context.strokeStyle = '#bdc3c7';
        context.lineWidth = 1;
        context.globalAlpha = 0.3;
        
        // Draw vertical lines
        for (let x = 0; x <= this.cols; x++) {
            const xPos = x * this.cellSize;
            context.beginPath();
            context.moveTo(xPos, 0);
            context.lineTo(xPos, this.worldHeight);
            context.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= this.rows; y++) {
            const yPos = y * this.cellSize;
            context.beginPath();
            context.moveTo(0, yPos);
            context.lineTo(this.worldWidth, yPos);
            context.stroke();
        }
        
        // Highlight occupied cells
        context.fillStyle = '#3498db';
        context.globalAlpha = 0.1;
        
        for (const cell of this.getOccupiedCells()) {
            const x = cell.x * this.cellSize;
            const y = cell.y * this.cellSize;
            context.fillRect(x, y, this.cellSize, this.cellSize);
        }
        
        context.globalAlpha = 1.0;
    }
}

// Make classes available globally
window.PhysicsSystem = PhysicsSystem;
window.SpatialHashGrid = SpatialHashGrid;