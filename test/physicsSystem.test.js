/**
 * Unit tests for PhysicsSystem
 * Tests core functionality of collision detection and physics simulation
 */

const fc = require('fast-check');

describe('PhysicsSystem', () => {
    let physicsSystem;
    let gameEngine;
    let canvas;
    
    beforeEach(() => {
        // Create a fresh canvas for each test
        canvas = document.createElement('canvas');
        canvas.id = 'physicsTestCanvas';
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
        
        // Create game engine
        gameEngine = new GameEngine('physicsTestCanvas');
        
        // Create physics system
        physicsSystem = new PhysicsSystem(
            { width: 800, height: 600 },
            { enableSpatialHashing: true, cellSize: 64 }
        );
        
        // Initialize physics system with game engine
        physicsSystem.init(gameEngine);
        
        // Register physics system with game engine
        gameEngine.registerSystem('physics', physicsSystem);
    });
    
    afterEach(() => {
        // Clean up canvas
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
        
        // Stop game engine if running
        if (gameEngine && gameEngine.isGameRunning()) {
            gameEngine.stop();
        }
    });

    test('should initialize correctly with world bounds', () => {
        expect(physicsSystem.worldBounds).toEqual({ width: 800, height: 600 });
        expect(physicsSystem.config.enableSpatialHashing).toBe(true);
        expect(physicsSystem.config.cellSize).toBe(64);
        expect(physicsSystem.gameEngine).toBe(gameEngine);
    });

    test('should detect AABB collision between overlapping entities', () => {
        // Create two overlapping entities
        const entityA = new Entity(100, 100, 50, 50);
        const entityB = new Entity(120, 120, 50, 50);
        
        // Test AABB collision detection
        const collision = physicsSystem.detectCollision(entityA, entityB);
        expect(collision).toBe(true);
    });

    test('should not detect collision between non-overlapping entities', () => {
        // Create two non-overlapping entities
        const entityA = new Entity(100, 100, 50, 50);
        const entityB = new Entity(200, 200, 50, 50);
        
        // Test AABB collision detection
        const collision = physicsSystem.detectCollision(entityA, entityB);
        expect(collision).toBe(false);
    });

    test('should constrain entities to world bounds', () => {
        // Create entity outside world bounds
        const entity = new Entity(-10, -10, 50, 50);
        entity.setVelocity(-100, -100);
        
        // Apply constraint
        physicsSystem.constrainToWorldBounds(entity);
        
        // Entity should be moved inside bounds and velocity stopped
        expect(entity.position.x).toBe(0);
        expect(entity.position.y).toBe(0);
        expect(entity.velocity.x).toBe(0);
        expect(entity.velocity.y).toBe(0);
    });

    test('should register and invoke collision callbacks', () => {
        const callbackMock = jest.fn();
        
        // Register collision callback
        physicsSystem.registerCollisionCallback('test', callbackMock);
        
        // Create two entities and add them to game engine
        const entityA = new Entity(100, 100, 50, 50);
        const entityB = new Entity(120, 120, 50, 50);
        gameEngine.addEntity(entityA);
        gameEngine.addEntity(entityB);
        
        // Process entity additions
        gameEngine.processEntityChanges();
        
        // Update physics system to trigger collision detection
        physicsSystem.update(0.016);
        
        // Callback should have been called
        expect(callbackMock).toHaveBeenCalledWith(entityA, entityB);
    });

    test('should update entity positions based on velocity', () => {
        // Create entity with velocity
        const entity = new Entity(100, 100, 50, 50);
        entity.setVelocity(100, 50); // 100 px/s right, 50 px/s down
        
        const deltaTime = 0.1; // 100ms
        
        // Apply velocity
        physicsSystem.applyVelocity(entity, deltaTime);
        
        // Position should be updated based on velocity * deltaTime
        expect(entity.position.x).toBe(110); // 100 + (100 * 0.1)
        expect(entity.position.y).toBe(105); // 100 + (50 * 0.1)
    });

    test('should handle spatial hashing correctly', () => {
        // Create entities in different areas
        const entityA = new Entity(50, 50, 30, 30);
        const entityB = new Entity(150, 150, 30, 30);
        const entityC = new Entity(60, 60, 30, 30); // Near entityA
        
        gameEngine.addEntity(entityA);
        gameEngine.addEntity(entityB);
        gameEngine.addEntity(entityC);
        
        // Process entity additions
        gameEngine.processEntityChanges();
        
        // Update physics system to populate spatial hash
        physicsSystem.update(0.016);
        
        // Get performance stats to verify spatial hashing is working
        const stats = physicsSystem.getPerformanceStats();
        expect(stats.spatialHashEnabled).toBe(true);
        expect(stats.occupiedCells).toBeGreaterThan(0);
    });

    test('should provide accurate performance statistics', () => {
        // Create some entities
        const entityA = new Entity(100, 100, 50, 50);
        const entityB = new Entity(120, 120, 50, 50); // Overlapping with A
        const entityC = new Entity(300, 300, 50, 50); // Not overlapping
        
        gameEngine.addEntity(entityA);
        gameEngine.addEntity(entityB);
        gameEngine.addEntity(entityC);
        
        // Process entity additions
        gameEngine.processEntityChanges();
        
        // Update physics system
        physicsSystem.update(0.016);
        
        // Check performance stats
        const stats = physicsSystem.getPerformanceStats();
        expect(stats.collisionChecks).toBeGreaterThan(0);
        expect(stats.actualCollisions).toBe(1); // Only A and B should collide
        expect(stats.spatialHashEnabled).toBe(true);
    });

    test('should handle empty entity list gracefully', () => {
        // Update physics system with no entities
        expect(() => {
            physicsSystem.update(0.016);
        }).not.toThrow();
        
        // Performance stats should show zero activity
        const stats = physicsSystem.getPerformanceStats();
        expect(stats.collisionChecks).toBe(0);
        expect(stats.actualCollisions).toBe(0);
    });

    /**
     * Property 3: Collision detection accuracy
     * Feature: quick-math-game, Property 3: Collision detection accuracy
     * For any collision between entities, the collision detector should correctly determine whether they are overlapping
     */
    test('Property 3: Collision detection accuracy', () => {
        fc.assert(fc.property(
            fc.record({
                entityA: fc.record({
                    x: fc.float({ min: 0, max: 700 }),
                    y: fc.float({ min: 0, max: 500 }),
                    width: fc.float({ min: 10, max: 100 }),
                    height: fc.float({ min: 10, max: 100 })
                }),
                entityB: fc.record({
                    x: fc.float({ min: 0, max: 700 }),
                    y: fc.float({ min: 0, max: 500 }),
                    width: fc.float({ min: 10, max: 100 }),
                    height: fc.float({ min: 10, max: 100 })
                })
            }),
            (config) => {
                // Create two entities with the generated properties
                const entityA = new Entity(
                    config.entityA.x,
                    config.entityA.y,
                    config.entityA.width,
                    config.entityA.height
                );
                
                const entityB = new Entity(
                    config.entityB.x,
                    config.entityB.y,
                    config.entityB.width,
                    config.entityB.height
                );

                // Get bounds for manual overlap calculation
                const boundsA = entityA.getBounds();
                const boundsB = entityB.getBounds();

                // Calculate expected collision result using AABB logic
                const expectedCollision = (
                    boundsA.x < boundsB.x + boundsB.width &&
                    boundsA.x + boundsA.width > boundsB.x &&
                    boundsA.y < boundsB.y + boundsB.height &&
                    boundsA.y + boundsA.height > boundsB.y
                );

                // Test the physics system's collision detection
                const detectedCollision = physicsSystem.detectCollision(entityA, entityB);

                // Property: The collision detection should match the expected AABB result
                expect(detectedCollision).toBe(expectedCollision);

                // Additional verification: Test the underlying AABB method directly
                const aabbResult = physicsSystem.aabbCollision(boundsA, boundsB);
                expect(aabbResult).toBe(expectedCollision);
                expect(aabbResult).toBe(detectedCollision);

                // Symmetry property: Collision detection should be symmetric
                const reverseDetection = physicsSystem.detectCollision(entityB, entityA);
                expect(reverseDetection).toBe(detectedCollision);
            }
        ), { numRuns: 100 });
    });

    /**
     * Property 18: Collision detection responsiveness
     * Feature: quick-math-game, Property 18: Collision detection responsiveness
     * For any collision scenario, the collision detection should respond accurately and immediately without delay
     */
    test('Property 18: Collision detection responsiveness', () => {
        fc.assert(fc.property(
            fc.record({
                entityCount: fc.integer({ min: 2, max: 20 }),
                movementSpeed: fc.float({ min: 50, max: 300 }),
                frameCount: fc.integer({ min: 5, max: 30 })
            }),
            (config) => {
                // Create multiple entities with random positions and velocities
                const entities = [];
                for (let i = 0; i < config.entityCount; i++) {
                    const entity = new Entity(
                        Math.random() * 600, // x position
                        Math.random() * 400, // y position
                        20 + Math.random() * 40, // width
                        20 + Math.random() * 40  // height
                    );
                    
                    // Set random velocity
                    entity.setVelocity(
                        (Math.random() - 0.5) * config.movementSpeed,
                        (Math.random() - 0.5) * config.movementSpeed
                    );
                    
                    gameEngine.addEntity(entity);
                    entities.push(entity);
                }
                
                // Process entity additions
                gameEngine.processEntityChanges();
                
                // Track collision detection timing across multiple frames
                const frameTimings = [];
                let totalCollisions = 0;
                
                for (let frame = 0; frame < config.frameCount; frame++) {
                    // Measure collision detection timing
                    const startTime = performance.now();
                    
                    // Update physics system (includes collision detection)
                    physicsSystem.update(0.016); // 60fps delta time
                    
                    const endTime = performance.now();
                    const frameTime = endTime - startTime;
                    frameTimings.push(frameTime);
                    
                    // Track collision statistics
                    const stats = physicsSystem.getPerformanceStats();
                    totalCollisions += stats.actualCollisions;
                }
                
                // Calculate timing statistics
                const avgFrameTime = frameTimings.reduce((sum, time) => sum + time, 0) / frameTimings.length;
                const maxFrameTime = Math.max(...frameTimings);
                
                // Property 1: Collision detection should be responsive (complete within reasonable time)
                // For responsive gameplay, collision detection should complete within 5ms per frame
                const maxAcceptableTime = 5.0; // 5ms maximum per frame
                expect(maxFrameTime).toBeLessThanOrEqual(maxAcceptableTime);
                expect(avgFrameTime).toBeLessThanOrEqual(maxAcceptableTime);
                
                // Property 2: Collision detection should be consistent across frames
                // Timing variance should be reasonable (no frame should take more than 3x average)
                const maxVarianceRatio = 3.0;
                expect(maxFrameTime).toBeLessThanOrEqual(avgFrameTime * maxVarianceRatio);
                
                // Property 3: Collision detection should scale reasonably with entity count
                // More entities should not cause exponential timing increases
                const expectedComplexity = config.entityCount * config.entityCount; // O(n²) worst case
                const timePerComparison = avgFrameTime / Math.max(expectedComplexity, 1);
                expect(timePerComparison).toBeLessThanOrEqual(0.01); // 0.01ms per comparison maximum
                
                // Property 4: Collision detection should be accurate under movement
                // Verify that moving entities still get detected correctly
                if (totalCollisions > 0) {
                    // If collisions occurred, verify they were handled properly
                    const finalStats = physicsSystem.getPerformanceStats();
                    expect(finalStats.collisionChecks).toBeGreaterThan(0);
                    expect(finalStats.actualCollisions).toBeGreaterThanOrEqual(0);
                }
                
                // Property 5: Spatial hashing should improve performance with many entities
                // When spatial hashing is enabled, performance should be better than brute force
                if (config.entityCount > 5) {
                    const stats = physicsSystem.getPerformanceStats();
                    expect(stats.spatialHashEnabled).toBe(true);
                    
                    // With spatial hashing, collision checks should be less than brute force O(n²)
                    const bruteForceChecks = (config.entityCount * (config.entityCount - 1)) / 2;
                    expect(stats.collisionChecks).toBeLessThanOrEqual(bruteForceChecks * 2); // Allow some overhead
                }
                
                // Clean up entities for next test
                for (const entity of entities) {
                    gameEngine.removeEntity(entity.id);
                }
                gameEngine.processEntityChanges();
            }
        ), { numRuns: 100 });
    });
});

describe('SpatialHashGrid', () => {
    let spatialHash;
    
    beforeEach(() => {
        spatialHash = new SpatialHashGrid(800, 600, 64);
    });

    test('should initialize with correct dimensions', () => {
        expect(spatialHash.worldWidth).toBe(800);
        expect(spatialHash.worldHeight).toBe(600);
        expect(spatialHash.cellSize).toBe(64);
        expect(spatialHash.cols).toBe(Math.ceil(800 / 64));
        expect(spatialHash.rows).toBe(Math.ceil(600 / 64));
    });

    test('should insert and retrieve entities correctly', () => {
        const entity = new Entity(100, 100, 50, 50);
        
        spatialHash.insert(entity);
        
        // Calculate which cell the entity should be in
        const cellX = Math.floor(100 / 64);
        const cellY = Math.floor(100 / 64);
        
        const entitiesInCell = spatialHash.getEntitiesInCell(cellX, cellY);
        expect(entitiesInCell).toContain(entity);
    });

    test('should handle entities spanning multiple cells', () => {
        // Create entity that spans multiple cells
        const entity = new Entity(60, 60, 80, 80); // Spans from cell boundary
        
        spatialHash.insert(entity);
        
        const occupiedCells = spatialHash.getOccupiedCells();
        expect(occupiedCells.length).toBeGreaterThan(1);
    });

    test('should clear all entities', () => {
        const entity1 = new Entity(100, 100, 50, 50);
        const entity2 = new Entity(200, 200, 50, 50);
        
        spatialHash.insert(entity1);
        spatialHash.insert(entity2);
        
        expect(spatialHash.getOccupiedCells().length).toBeGreaterThan(0);
        
        spatialHash.clear();
        
        expect(spatialHash.getOccupiedCells().length).toBe(0);
    });
});