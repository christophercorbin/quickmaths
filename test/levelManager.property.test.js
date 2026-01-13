/**
 * Property-based tests for LevelManager
 * Tests level difficulty progression properties
 */

const fc = require('fast-check');

describe('LevelManager Property Tests', () => {
    let canvas;
    let gameEngine;
    let levelManager;
    let mathContentSystem;
    let numberTileSystem;
    
    beforeEach(() => {
        // Create a fresh canvas for each test
        canvas = document.createElement('canvas');
        canvas.id = 'testCanvas';
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
        
        // Create game engine and systems
        gameEngine = new GameEngine('testCanvas');
        mathContentSystem = new MathContentSystem();
        numberTileSystem = new NumberTileSystem();
        levelManager = new LevelManager();
        
        // Register systems with game engine
        gameEngine.registerSystem('mathContent', mathContentSystem);
        gameEngine.registerSystem('numberTile', numberTileSystem);
        gameEngine.registerSystem('levelManager', levelManager);
        
        // Initialize systems
        numberTileSystem.init(gameEngine);
        levelManager.init(gameEngine);
        
        // Reset performance.now mock
        jest.clearAllMocks();
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
        
        // Reset level manager
        if (levelManager) {
            levelManager.reset();
        }
    });

    /**
     * Property 9: Level difficulty progression
     * Feature: quick-math-game, Property 9: Level difficulty progression
     * For any level advancement, the difficulty should increase through faster tile movement, more answer options, or mixed operations
     */
    test('Property 9: Level difficulty progression', () => {
        fc.assert(fc.property(
            fc.record({
                startLevel: fc.integer({ min: 1, max: 3 }),
                levelProgression: fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }),
                questionsPerLevel: fc.integer({ min: 3, max: 7 })
            }),
            (config) => {
                const { startLevel, levelProgression, questionsPerLevel } = config;
                
                // Configure level manager
                levelManager.config.questionsPerLevel = questionsPerLevel;
                levelManager.setLevel(startLevel);
                
                // Track difficulty metrics across levels
                const levelMetrics = [];
                
                // Record initial level metrics
                let currentLevelConfig = levelManager.getLevelConfig(levelManager.getCurrentLevel());
                levelMetrics.push({
                    level: levelManager.getCurrentLevel(),
                    difficulty: currentLevelConfig.difficulty,
                    maxTiles: currentLevelConfig.maxTiles,
                    spawnInterval: currentLevelConfig.spawnInterval,
                    operations: [...currentLevelConfig.operations],
                    tileSpeedMultiplier: currentLevelConfig.tileSpeedMultiplier
                });
                
                // Simulate level progression by answering questions correctly
                for (let i = 0; i < levelProgression.length; i++) {
                    const shouldProgress = levelProgression[i];
                    
                    if (shouldProgress) {
                        const levelBefore = levelManager.getCurrentLevel();
                        
                        // Answer enough questions to complete the level
                        for (let q = 0; q < questionsPerLevel; q++) {
                            levelManager.onCorrectAnswer();
                        }
                        
                        // Allow time for level transition
                        jest.advanceTimersByTime(1100); // Wait for transition delay
                        
                        const levelAfter = levelManager.getCurrentLevel();
                        
                        // Property: Level should advance after completing required questions
                        expect(levelAfter).toBe(levelBefore + 1);
                        
                        // Record new level metrics
                        const newLevelConfig = levelManager.getLevelConfig(levelAfter);
                        levelMetrics.push({
                            level: levelAfter,
                            difficulty: newLevelConfig.difficulty,
                            maxTiles: newLevelConfig.maxTiles,
                            spawnInterval: newLevelConfig.spawnInterval,
                            operations: [...newLevelConfig.operations],
                            tileSpeedMultiplier: newLevelConfig.tileSpeedMultiplier
                        });
                    }
                }
                
                // Property: Difficulty should increase with level progression
                if (levelMetrics.length >= 2) {
                    for (let i = 1; i < levelMetrics.length; i++) {
                        const prevLevel = levelMetrics[i - 1];
                        const currLevel = levelMetrics[i];
                        
                        // Property 1: Math difficulty should increase or stay the same
                        expect(currLevel.difficulty).toBeGreaterThanOrEqual(prevLevel.difficulty);
                        
                        // Property 2: At least one difficulty metric should increase
                        const hasIncreasedDifficulty = 
                            currLevel.difficulty > prevLevel.difficulty ||
                            currLevel.maxTiles > prevLevel.maxTiles ||
                            currLevel.spawnInterval < prevLevel.spawnInterval ||
                            currLevel.tileSpeedMultiplier > prevLevel.tileSpeedMultiplier ||
                            currLevel.operations.length > prevLevel.operations.length;
                        
                        expect(hasIncreasedDifficulty).toBe(true);
                        
                        // Property 3: Tile speed should increase with levels
                        expect(currLevel.tileSpeedMultiplier).toBeGreaterThanOrEqual(prevLevel.tileSpeedMultiplier);
                        
                        // Property 4: Spawn interval should decrease (faster spawning) or stay the same
                        expect(currLevel.spawnInterval).toBeLessThanOrEqual(prevLevel.spawnInterval);
                        
                        // Property 5: Max tiles should increase or stay the same
                        expect(currLevel.maxTiles).toBeGreaterThanOrEqual(prevLevel.maxTiles);
                        
                        // Property 6: Operations should not decrease (can only add more)
                        expect(currLevel.operations.length).toBeGreaterThanOrEqual(prevLevel.operations.length);
                        
                        // Property 7: All previous operations should still be available
                        for (const operation of prevLevel.operations) {
                            expect(currLevel.operations).toContain(operation);
                        }
                    }
                }
                
                // Property: Mixed operations should be introduced in advanced levels
                if (levelMetrics.length > 0) {
                    const finalLevel = levelMetrics[levelMetrics.length - 1];
                    
                    // Property 8: Higher levels should have multiple operations
                    if (finalLevel.level >= 4) {
                        expect(finalLevel.operations.length).toBeGreaterThan(1);
                    }
                    
                    // Property 9: Very high levels should have all operations
                    if (finalLevel.level >= 6) {
                        expect(finalLevel.operations).toContain('addition');
                        expect(finalLevel.operations).toContain('subtraction');
                        expect(finalLevel.operations).toContain('multiplication');
                        
                        // Division might be introduced at level 6 or higher
                        if (finalLevel.level >= 6) {
                            expect(finalLevel.operations).toContain('division');
                        }
                    }
                }
                
                // Property: Level configuration should be consistent and valid
                for (const metrics of levelMetrics) {
                    // Property 10: All difficulty values should be within valid ranges
                    expect(metrics.difficulty).toBeGreaterThanOrEqual(1);
                    expect(metrics.difficulty).toBeLessThanOrEqual(5);
                    
                    expect(metrics.maxTiles).toBeGreaterThanOrEqual(1);
                    expect(metrics.maxTiles).toBeLessThanOrEqual(15); // Reasonable upper bound
                    
                    expect(metrics.spawnInterval).toBeGreaterThan(0);
                    expect(metrics.spawnInterval).toBeLessThanOrEqual(5.0); // Reasonable bounds
                    
                    expect(metrics.tileSpeedMultiplier).toBeGreaterThan(0);
                    expect(metrics.tileSpeedMultiplier).toBeLessThanOrEqual(5.0); // Reasonable upper bound
                    
                    // Property 11: Operations should be valid
                    const validOperations = ['addition', 'subtraction', 'multiplication', 'division'];
                    for (const operation of metrics.operations) {
                        expect(validOperations).toContain(operation);
                    }
                    expect(metrics.operations.length).toBeGreaterThan(0);
                }
                
                // Property: Level progression should be monotonic
                for (let i = 1; i < levelMetrics.length; i++) {
                    const prevLevel = levelMetrics[i - 1];
                    const currLevel = levelMetrics[i];
                    
                    // Property 12: Level numbers should increase sequentially
                    expect(currLevel.level).toBe(prevLevel.level + 1);
                }
                
                // Property: System integration should work correctly
                if (levelMetrics.length > 1) {
                    const finalMetrics = levelMetrics[levelMetrics.length - 1];
                    
                    // Property 13: Math content system should reflect current difficulty
                    expect(mathContentSystem.getCurrentDifficulty()).toBe(finalMetrics.difficulty);
                    
                    // Property 14: Number tile system should reflect current settings
                    expect(numberTileSystem.config.maxTiles).toBe(finalMetrics.maxTiles);
                    expect(numberTileSystem.config.spawnInterval).toBeCloseTo(finalMetrics.spawnInterval, 2);
                    
                    // Property 15: Level manager state should be consistent
                    expect(levelManager.getCurrentLevel()).toBe(finalMetrics.level);
                    expect(levelManager.getLevelProgress().current).toBe(0); // Should reset after level completion
                }
                
                // Property: Difficulty scaling should be reasonable
                if (levelMetrics.length >= 3) {
                    const firstLevel = levelMetrics[0];
                    const lastLevel = levelMetrics[levelMetrics.length - 1];
                    
                    // Property 16: Overall progression should show clear difficulty increase
                    const difficultyIncrease = lastLevel.difficulty - firstLevel.difficulty;
                    const speedIncrease = lastLevel.tileSpeedMultiplier - firstLevel.tileSpeedMultiplier;
                    const tileIncrease = lastLevel.maxTiles - firstLevel.maxTiles;
                    const intervalDecrease = firstLevel.spawnInterval - lastLevel.spawnInterval;
                    
                    // At least one major difficulty metric should show significant improvement
                    const hasSignificantProgression = 
                        difficultyIncrease >= 1 ||
                        speedIncrease >= 0.3 ||
                        tileIncrease >= 2 ||
                        intervalDecrease >= 0.5;
                    
                    expect(hasSignificantProgression).toBe(true);
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });
});