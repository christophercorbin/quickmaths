/**
 * Property-based tests for GameEngine
 * Tests universal properties that should hold across all valid executions
 */

const fc = require('fast-check');

describe('GameEngine Property Tests', () => {
    let canvas;
    
    beforeEach(() => {
        // Create a fresh canvas for each test
        canvas = document.createElement('canvas');
        canvas.id = 'testCanvas';
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
        
        // Reset performance.now mock
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        // Clean up canvas
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
    });

    /**
     * Property 17: Frame rate maintenance
     * Feature: quick-math-game, Property 17: Frame rate maintenance
     * For any gameplay scenario with multiple moving elements, the game should maintain smooth frame rates above the minimum threshold
     */
    test('Property 17: Frame rate maintenance', () => {
        fc.assert(fc.property(
            fc.record({
                targetFPS: fc.integer({ min: 30, max: 120 }),
                entityCount: fc.integer({ min: 0, max: 50 }),
                runDuration: fc.integer({ min: 100, max: 1000 }) // milliseconds
            }),
            (config) => {
                // Create game engine with specified target FPS
                const gameEngine = new GameEngine('testCanvas', {
                    targetFPS: config.targetFPS,
                    backgroundColor: '#ecf0f1',
                    showDebugInfo: false
                });

                // Add multiple entities to simulate load
                for (let i = 0; i < config.entityCount; i++) {
                    const entity = new Entity(
                        Math.random() * 700, // x position
                        Math.random() * 500, // y position
                        20 + Math.random() * 30, // width
                        20 + Math.random() * 30  // height
                    );
                    entity.setVelocity(
                        (Math.random() - 0.5) * 200, // random x velocity
                        (Math.random() - 0.5) * 200  // random y velocity
                    );
                    gameEngine.addEntity(entity);
                }

                // Start the engine
                gameEngine.start();
                
                // Verify engine is running
                expect(gameEngine.isGameRunning()).toBe(true);
                expect(gameEngine.isGamePaused()).toBe(false);

                // Simulate multiple frame updates
                const frameCount = Math.floor(config.runDuration / 16.67); // Approximate frames for duration
                let frameTimeAccumulator = 0;
                let maxFrameTime = 0;
                
                for (let frame = 0; frame < frameCount; frame++) {
                    const frameStart = performance.now();
                    
                    // Manually trigger game loop update (simulating requestAnimationFrame)
                    gameEngine.update(0.0167); // ~60fps delta time
                    gameEngine.render();
                    
                    const frameEnd = performance.now();
                    const frameTime = frameEnd - frameStart;
                    
                    frameTimeAccumulator += frameTime;
                    maxFrameTime = Math.max(maxFrameTime, frameTime);
                }

                // Stop the engine
                gameEngine.stop();
                expect(gameEngine.isGameRunning()).toBe(false);

                // Calculate average frame time
                const avgFrameTime = frameTimeAccumulator / frameCount;
                
                // Property: Frame rate should be maintained
                // The maximum acceptable frame time for smooth gameplay (33ms = ~30fps minimum)
                const maxAcceptableFrameTime = 1000 / 30; // 33.33ms for 30fps minimum
                
                // Assert that frame rate is maintained above minimum threshold
                expect(maxFrameTime).toBeLessThanOrEqual(maxAcceptableFrameTime);
                expect(avgFrameTime).toBeLessThanOrEqual(maxAcceptableFrameTime);
                
                // Additional assertions for engine state consistency
                expect(gameEngine.getCurrentState()).toBeDefined();
                expect(gameEngine.getCanvasSize()).toEqual({ width: 800, height: 600 });
            }
        ), { numRuns: 100 });
    });
});

describe('MathContentSystem Property Tests', () => {
    let mathSystem;
    
    beforeEach(() => {
        // Create a fresh MathContentSystem for each test
        mathSystem = new MathContentSystem();
    });

    /**
     * Property 10: Math problem generation scaling
     * Feature: quick-math-game, Property 10: Math problem generation scaling
     * For any difficulty level and operation type (addition, subtraction, multiplication, division), 
     * generated problems should have appropriate complexity for that difficulty level
     */
    test('Property 10: Math problem generation scaling', () => {
        fc.assert(fc.property(
            fc.record({
                operation: fc.constantFrom('addition', 'subtraction', 'multiplication', 'division'),
                difficulty: fc.integer({ min: 1, max: 5 })
            }),
            (config) => {
                const { operation, difficulty } = config;
                
                // Skip operations that aren't available at this difficulty level
                const availableOps = mathSystem.getAvailableOperations(difficulty);
                if (!availableOps.includes(operation)) {
                    return true; // Skip this test case
                }
                
                // Generate a problem for this operation and difficulty
                const problem = mathSystem.generateProblem(operation, difficulty);
                
                // Get the difficulty configuration for validation
                const difficultyConfig = mathSystem.config.difficultyLevels[difficulty] || mathSystem.config.difficultyLevels[1];
                
                // Property: Generated problems should have appropriate complexity for difficulty level
                
                // 1. Operands should be within the difficulty range
                expect(problem.operandA).toBeGreaterThanOrEqual(difficultyConfig.min);
                expect(problem.operandB).toBeGreaterThanOrEqual(difficultyConfig.min);
                
                // 2. For most operations, operands should not exceed max (with some flexibility for multiplication/division)
                if (operation === 'addition' || operation === 'subtraction') {
                    expect(problem.operandA).toBeLessThanOrEqual(difficultyConfig.max);
                    expect(problem.operandB).toBeLessThanOrEqual(difficultyConfig.max);
                }
                
                // 3. Results should be reasonable for the difficulty level
                expect(problem.correctAnswer).toBeGreaterThanOrEqual(0);
                
                // 4. Operation-specific complexity validation
                switch (operation) {
                    case 'addition':
                        // Addition: result should scale with difficulty
                        expect(problem.correctAnswer).toBe(problem.operandA + problem.operandB);
                        if (difficulty === 1) {
                            expect(problem.correctAnswer).toBeLessThanOrEqual(20); // Max sum for level 1
                        }
                        break;
                        
                    case 'subtraction':
                        // Subtraction: should always produce positive results
                        expect(problem.correctAnswer).toBe(problem.operandA - problem.operandB);
                        expect(problem.correctAnswer).toBeGreaterThanOrEqual(0);
                        expect(problem.operandA).toBeGreaterThanOrEqual(problem.operandB);
                        break;
                        
                    case 'multiplication':
                        // Multiplication: operands should be reasonable to avoid huge results
                        expect(problem.correctAnswer).toBe(problem.operandA * problem.operandB);
                        expect(problem.operandA).toBeLessThanOrEqual(12); // Keep multiplication manageable
                        expect(problem.operandB).toBeLessThanOrEqual(12);
                        break;
                        
                    case 'division':
                        // Division: should produce whole number results
                        expect(problem.correctAnswer).toBe(problem.operandA / problem.operandB);
                        expect(problem.correctAnswer % 1).toBe(0); // Should be whole number
                        expect(problem.operandB).toBeGreaterThan(1); // No division by 1 or 0
                        expect(problem.operandA).toBe(problem.operandB * problem.correctAnswer); // Verify it's exact division
                        break;
                }
                
                // 5. Problem metadata should be correct
                expect(problem.operation).toBe(operation);
                expect(problem.difficulty).toBe(difficulty);
                expect(problem.timeCreated).toBeGreaterThan(0);
                
                // 6. Difficulty scaling: higher difficulty should generally produce larger numbers
                if (difficulty > 1) {
                    // For higher difficulties, at least one operand should be capable of being larger
                    const level1Max = mathSystem.config.difficultyLevels[1].max;
                    
                    // This is a probabilistic check - not every problem will be larger, 
                    // but the system should be capable of generating larger problems
                    if (operation === 'addition' || operation === 'subtraction') {
                        expect(difficultyConfig.max).toBeGreaterThan(level1Max);
                    }
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });
});

describe('QuestionDisplaySystem Property Tests', () => {
    let canvas;
    let gameEngine;
    let questionDisplaySystem;
    let mathContentSystem;
    
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
        questionDisplaySystem = new QuestionDisplaySystem();
        
        // Register systems with game engine
        gameEngine.registerSystem('mathContent', mathContentSystem);
        gameEngine.registerSystem('questionDisplay', questionDisplaySystem);
        
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
    });

    /**
     * Property 7: Question progression
     * Feature: quick-math-game, Property 7: Question progression
     * For any correctly answered question, the game engine should immediately generate and display a new question
     */
    test('Property 7: Question progression', () => {
        fc.assert(fc.property(
            fc.record({
                initialDifficulty: fc.integer({ min: 1, max: 5 }),
                correctAnswerSequence: fc.array(fc.boolean(), { minLength: 1, maxLength: 10 })
            }),
            (config) => {
                const { initialDifficulty, correctAnswerSequence } = config;
                
                // Set initial difficulty
                mathContentSystem.setDifficulty(initialDifficulty);
                
                // Ensure systems are properly initialized
                expect(questionDisplaySystem.getCurrentQuestion()).toBeTruthy();
                
                // Track question progression
                const questionHistory = [];
                let currentQuestion = questionDisplaySystem.getCurrentQuestion();
                questionHistory.push({
                    question: { ...currentQuestion },
                    timestamp: Date.now()
                });
                
                // Simulate a sequence of correct answers
                for (let i = 0; i < correctAnswerSequence.length; i++) {
                    const shouldAnswerCorrectly = correctAnswerSequence[i];
                    
                    if (shouldAnswerCorrectly) {
                        // Get the current question before answering
                        const questionBeforeAnswer = questionDisplaySystem.getCurrentQuestion();
                        expect(questionBeforeAnswer).toBeTruthy();
                        
                        // Trigger correct answer progression
                        questionDisplaySystem.onCorrectAnswer();
                        
                        // Allow time for transition (simulate async behavior)
                        // In real implementation, this would be handled by setTimeout
                        // For testing, we need to manually advance time and trigger the new question generation
                        
                        // Wait for transition to complete (simulate the setTimeout in startTransition)
                        jest.advanceTimersByTime(questionDisplaySystem.config.transitionDuration);
                        
                        // Property: After a correct answer, a new question should be generated
                        const questionAfterAnswer = questionDisplaySystem.getCurrentQuestion();
                        expect(questionAfterAnswer).toBeTruthy();
                        
                        // Property: The new question should be different from the previous one
                        // (We check multiple properties to ensure it's actually a new question)
                        const isDifferentQuestion = 
                            questionAfterAnswer.operandA !== questionBeforeAnswer.operandA ||
                            questionAfterAnswer.operandB !== questionBeforeAnswer.operandB ||
                            questionAfterAnswer.operation !== questionBeforeAnswer.operation ||
                            questionAfterAnswer.timeCreated !== questionBeforeAnswer.timeCreated;
                        
                        expect(isDifferentQuestion).toBe(true);
                        
                        // Property: The new question should have valid structure
                        expect(questionAfterAnswer.operation).toMatch(/^(addition|subtraction|multiplication|division)$/);
                        expect(questionAfterAnswer.operandA).toBeGreaterThan(0);
                        expect(questionAfterAnswer.operandB).toBeGreaterThan(0);
                        expect(questionAfterAnswer.correctAnswer).toBeGreaterThanOrEqual(0);
                        expect(questionAfterAnswer.difficulty).toBeGreaterThanOrEqual(1);
                        expect(questionAfterAnswer.difficulty).toBeLessThanOrEqual(5);
                        expect(questionAfterAnswer.timeCreated).toBeGreaterThan(0);
                        
                        // Property: The question text should be updated to reflect the new question
                        const questionText = questionDisplaySystem.getQuestionText();
                        expect(questionText).toBeTruthy();
                        expect(questionText).toContain('?');
                        
                        // Verify the question text matches the question structure
                        const { operation, operandA, operandB } = questionAfterAnswer;
                        switch (operation) {
                            case 'addition':
                                expect(questionText).toContain(`${operandA} + ${operandB}`);
                                break;
                            case 'subtraction':
                                expect(questionText).toContain(`${operandA} - ${operandB}`);
                                break;
                            case 'multiplication':
                                expect(questionText).toContain(`${operandA} × ${operandB}`);
                                break;
                            case 'division':
                                expect(questionText).toContain(`${operandA} ÷ ${operandB}`);
                                break;
                        }
                        
                        // Property: The new question should be immediately available (no delay in access)
                        expect(questionDisplaySystem.getCurrentQuestion()).toBe(questionAfterAnswer);
                        
                        // Record the new question for history tracking
                        questionHistory.push({
                            question: { ...questionAfterAnswer },
                            timestamp: Date.now()
                        });
                        
                        // Update current question reference
                        currentQuestion = questionAfterAnswer;
                    }
                }
                
                // Property: Question progression should maintain system consistency
                // All questions in history should be valid and properly formed
                for (const entry of questionHistory) {
                    const question = entry.question;
                    expect(question.operation).toMatch(/^(addition|subtraction|multiplication|division)$/);
                    expect(question.operandA).toBeGreaterThan(0);
                    expect(question.operandB).toBeGreaterThan(0);
                    expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
                    expect(question.timeCreated).toBeGreaterThan(0);
                }
                
                // Property: If we had multiple correct answers, we should have multiple different questions
                const correctAnswerCount = correctAnswerSequence.filter(Boolean).length;
                if (correctAnswerCount > 0) {
                    expect(questionHistory.length).toBeGreaterThan(1);
                    
                    // Verify that questions are actually different from each other
                    for (let i = 1; i < questionHistory.length; i++) {
                        const prevQuestion = questionHistory[i - 1].question;
                        const currQuestion = questionHistory[i].question;
                        
                        const isDifferent = 
                            prevQuestion.operandA !== currQuestion.operandA ||
                            prevQuestion.operandB !== currQuestion.operandB ||
                            prevQuestion.operation !== currQuestion.operation ||
                            prevQuestion.timeCreated !== currQuestion.timeCreated;
                        
                        expect(isDifferent).toBe(true);
                    }
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });
});

describe('NumberTileSystem Property Tests', () => {
    let canvas;
    let gameEngine;
    let numberTileSystem;
    let mathContentSystem;
    
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
        
        // Register systems with game engine
        gameEngine.registerSystem('mathContent', mathContentSystem);
        gameEngine.registerSystem('numberTile', numberTileSystem);
        
        // Initialize systems
        numberTileSystem.init(gameEngine);
        
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
        
        // Clear all tiles
        if (numberTileSystem) {
            numberTileSystem.clearAllTiles();
        }
    });

    /**
     * Property 1: Number tile movement diversity
     * Feature: quick-math-game, Property 1: Number tile movement diversity
     * For any game session, the spawned number tiles should have varying speeds and follow different movement patterns to create dynamic gameplay
     */
    test('Property 1: Number tile movement diversity', () => {
        fc.assert(fc.property(
            fc.record({
                sessionDuration: fc.integer({ min: 5, max: 20 }), // seconds
                difficulty: fc.integer({ min: 1, max: 5 }),
                spawnCount: fc.integer({ min: 10, max: 30 })
            }),
            (config) => {
                const { sessionDuration, difficulty, spawnCount } = config;
                
                // Set up the math content system with a problem
                mathContentSystem.setDifficulty(difficulty);
                const problem = mathContentSystem.generateProblem('addition', difficulty);
                // generateProblem automatically sets currentProblem, so no need to call setCurrentProblem
                
                // Configure number tile system for faster spawning to get more tiles
                numberTileSystem.setSpawnInterval(0.1); // Spawn every 100ms
                numberTileSystem.setMaxTiles(10); // Allow more tiles on screen
                
                // Collect tiles spawned during the session
                const spawnedTiles = [];
                const originalAddEntity = gameEngine.addEntity.bind(gameEngine);
                
                // Mock addEntity to capture spawned tiles
                gameEngine.addEntity = jest.fn((entity) => {
                    if (entity instanceof NumberTile) {
                        spawnedTiles.push({
                            speed: entity.getSpeed(),
                            movementPattern: entity.getMovementPatternType(),
                            position: { x: entity.position.x, y: entity.position.y },
                            velocity: { x: entity.velocity.x, y: entity.velocity.y },
                            value: entity.getValue(),
                            isCorrect: entity.isCorrect()
                        });
                    }
                    return originalAddEntity(entity);
                });
                
                // Simulate game session with regular updates
                const deltaTime = 0.016; // ~60fps
                const totalFrames = Math.floor(sessionDuration / deltaTime);
                
                for (let frame = 0; frame < totalFrames; frame++) {
                    // Force spawn tiles periodically to ensure we get enough samples
                    if (frame % 6 === 0) { // Every ~100ms at 60fps
                        numberTileSystem.forceSpawnTiles();
                    }
                    
                    // Update the system
                    numberTileSystem.update(deltaTime);
                    
                    // Stop if we have enough tiles for analysis
                    if (spawnedTiles.length >= spawnCount) {
                        break;
                    }
                }
                
                // Restore original addEntity method
                gameEngine.addEntity = originalAddEntity;
                
                // Property: Tiles should have varying speeds
                if (spawnedTiles.length >= 2) {
                    const speeds = spawnedTiles.map(tile => tile.speed);
                    const uniqueSpeeds = new Set(speeds.map(speed => Math.round(speed)));
                    
                    // Should have at least some speed variation (not all identical)
                    // Allow for some tolerance due to speed variation system
                    const speedVariationExists = uniqueSpeeds.size > 1 || 
                        (speeds.length > 1 && Math.max(...speeds) - Math.min(...speeds) > 5);
                    
                    expect(speedVariationExists).toBe(true);
                    
                    // Speeds should be within reasonable bounds
                    for (const speed of speeds) {
                        expect(speed).toBeGreaterThan(0);
                        expect(speed).toBeLessThan(300); // Reasonable upper bound
                    }
                }
                
                // Property: Tiles should have different movement patterns
                if (spawnedTiles.length >= 3) {
                    const patterns = spawnedTiles.map(tile => tile.movementPattern);
                    const uniquePatterns = new Set(patterns);
                    
                    // Should have multiple different movement patterns
                    expect(uniquePatterns.size).toBeGreaterThan(1);
                    
                    // All patterns should be valid types
                    const validPatterns = ['linear', 'sine', 'circular', 'zigzag', 'spiral'];
                    for (const pattern of patterns) {
                        expect(validPatterns).toContain(pattern);
                    }
                }
                
                // Property: Tiles should have diverse starting positions
                if (spawnedTiles.length >= 3) {
                    const positions = spawnedTiles.map(tile => tile.position);
                    
                    // Check that tiles don't all spawn at the same location
                    const uniquePositions = new Set(positions.map(pos => `${Math.round(pos.x)},${Math.round(pos.y)}`));
                    expect(uniquePositions.size).toBeGreaterThan(1);
                    
                    // Tiles should spawn around screen edges (spawn margin area)
                    const margin = 50;
                    const worldBounds = { width: 800, height: 600 };
                    
                    for (const pos of positions) {
                        const isNearEdge = 
                            pos.x < margin || pos.x > worldBounds.width - margin ||
                            pos.y < margin || pos.y > worldBounds.height - margin;
                        expect(isNearEdge).toBe(true);
                    }
                }
                
                // Property: Tiles should have diverse initial velocities
                if (spawnedTiles.length >= 3) {
                    const velocities = spawnedTiles.map(tile => tile.velocity);
                    
                    // Check velocity diversity - not all tiles moving in same direction
                    const velocityAngles = velocities.map(vel => {
                        if (vel.x === 0 && vel.y === 0) return 0;
                        return Math.atan2(vel.y, vel.x);
                    });
                    
                    const uniqueAngles = new Set(velocityAngles.map(angle => Math.round(angle * 10) / 10));
                    expect(uniqueAngles.size).toBeGreaterThan(1);
                    
                    // Velocities should be reasonable
                    for (const vel of velocities) {
                        const magnitude = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
                        expect(magnitude).toBeGreaterThan(0);
                        expect(magnitude).toBeLessThan(300); // Reasonable upper bound
                    }
                }
                
                // Property: Both correct and incorrect answer tiles should be spawned
                if (spawnedTiles.length >= 3) {
                    const correctTiles = spawnedTiles.filter(tile => tile.isCorrect);
                    const incorrectTiles = spawnedTiles.filter(tile => !tile.isCorrect);
                    
                    // Should have both correct and incorrect tiles for diversity
                    expect(correctTiles.length).toBeGreaterThan(0);
                    expect(incorrectTiles.length).toBeGreaterThan(0);
                    
                    // Correct tiles should be less frequent than incorrect ones
                    // (since there's typically 1 correct answer among multiple options)
                    expect(incorrectTiles.length).toBeGreaterThanOrEqual(correctTiles.length);
                }
                
                // Property: Tile values should be diverse
                if (spawnedTiles.length >= 3) {
                    const values = spawnedTiles.map(tile => tile.value);
                    const uniqueValues = new Set(values);
                    
                    // Should have multiple different values
                    expect(uniqueValues.size).toBeGreaterThan(1);
                    
                    // Values should be reasonable numbers
                    for (const value of values) {
                        expect(value).toBeGreaterThan(0);
                        expect(value).toBeLessThan(1000); // Reasonable upper bound
                    }
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });
});

describe('Animation Smoothness Property Tests', () => {
    let canvas;
    let gameEngine;
    let collisionFeedbackSystem;
    let physicsSystem;
    let playerCharacter;
    let numberTiles;
    
    beforeEach(() => {
        // Create a fresh canvas for each test
        canvas = document.createElement('canvas');
        canvas.id = 'testCanvas';
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
        
        // Create game engine and systems
        gameEngine = new GameEngine('testCanvas');
        physicsSystem = new PhysicsSystem({ width: 800, height: 600 });
        collisionFeedbackSystem = new CollisionFeedbackSystem({
            enableParticles: true,
            enableScreenShake: true
        });
        
        // Register systems
        gameEngine.registerSystem('physics', physicsSystem);
        gameEngine.registerSystem('collisionFeedback', collisionFeedbackSystem);
        
        // Initialize systems
        physicsSystem.init(gameEngine);
        collisionFeedbackSystem.init(gameEngine);
        
        // Create player character
        playerCharacter = new PlayerCharacter(400, 300, 40, 40);
        gameEngine.addEntity(playerCharacter);
        
        // Initialize number tiles array
        numberTiles = [];
        
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
        
        // Clear all effects
        if (collisionFeedbackSystem) {
            collisionFeedbackSystem.clearAllEffects();
        }
        
        // Clean up number tiles
        for (const tile of numberTiles) {
            gameEngine.removeEntity(tile);
        }
        numberTiles = [];
    });

    /**
     * Property 12: Animation smoothness
     * Feature: quick-math-game, Property 12: Animation smoothness
     * For any moving element in the game, position updates should occur smoothly over time without jarring jumps
     */
    test('Property 12: Animation smoothness', () => {
        fc.assert(fc.property(
            fc.record({
                frameCount: fc.integer({ min: 10, max: 60 }), // Test over multiple frames
                movingElementCount: fc.integer({ min: 1, max: 8 }), // Multiple moving elements
                targetFPS: fc.integer({ min: 30, max: 120 }), // Different frame rates
                movementSpeed: fc.float({ min: 50, max: 400 }), // Various movement speeds
                animationTypes: fc.array(
                    fc.constantFrom('player_movement', 'tile_movement', 'particles', 'pulse_animation', 'floating_text'),
                    { minLength: 1, maxLength: 3 }
                )
            }),
            (config) => {
                const { frameCount, movingElementCount, targetFPS, movementSpeed, animationTypes } = config;
                
                // Configure game engine for target FPS
                gameEngine.config.targetFPS = targetFPS;
                const targetDeltaTime = 1 / targetFPS;
                
                // Create moving elements based on test configuration
                const movingElements = [];
                
                // Add player movement if requested
                if (animationTypes.includes('player_movement')) {
                    playerCharacter.setVelocity(movementSpeed * 0.7, movementSpeed * 0.5);
                    movingElements.push({
                        type: 'player',
                        entity: playerCharacter,
                        positions: []
                    });
                }
                
                // Add number tiles if requested
                if (animationTypes.includes('tile_movement')) {
                    for (let i = 0; i < Math.min(movingElementCount, 5); i++) {
                        const tile = new NumberTile(
                            100 + i * 120, // x position
                            100 + i * 80,  // y position
                            i + 1,         // value
                            false,         // isCorrect
                            30,            // width
                            30             // height
                        );
                        
                        // Set random movement pattern and speed
                        tile.setSpeed(movementSpeed * (0.5 + Math.random() * 0.5));
                        tile.setMovementPattern(['linear', 'sine', 'circular'][i % 3]);
                        tile.setVelocity(
                            (Math.random() - 0.5) * movementSpeed,
                            (Math.random() - 0.5) * movementSpeed
                        );
                        
                        gameEngine.addEntity(tile);
                        numberTiles.push(tile);
                        
                        movingElements.push({
                            type: 'tile',
                            entity: tile,
                            positions: []
                        });
                    }
                }
                
                // Process entity additions
                gameEngine.processEntityChanges();
                
                // Create animations if requested
                let animationEffects = [];
                if (animationTypes.includes('particles')) {
                    collisionFeedbackSystem.createParticleEffect(
                        { x: 400, y: 300 },
                        {
                            color: '#27ae60',
                            count: 6,
                            speed: movementSpeed * 0.8,
                            spread: Math.PI * 2,
                            lifetime: 2000,
                            type: 'success'
                        }
                    );
                    animationEffects.push('particles');
                }
                
                if (animationTypes.includes('pulse_animation')) {
                    collisionFeedbackSystem.createPulseAnimation(
                        { x: 300, y: 200 },
                        {
                            color: '#e74c3c',
                            maxRadius: 50,
                            duration: 1000,
                            opacity: 0.6,
                            pulseCount: 2
                        }
                    );
                    animationEffects.push('pulse');
                }
                
                if (animationTypes.includes('floating_text')) {
                    collisionFeedbackSystem.createFloatingText(
                        { x: 500, y: 400 },
                        'Test!',
                        {
                            color: '#3498db',
                            fontSize: 24,
                            duration: 1500,
                            animation: 'float-up'
                        }
                    );
                    animationEffects.push('floating_text');
                }
                
                // Track animation data over multiple frames
                const frameData = [];
                let previousTime = 0;
                
                // Simulate multiple frames with consistent timing
                for (let frame = 0; frame < frameCount; frame++) {
                    const currentTime = frame * (targetDeltaTime * 1000); // Convert to milliseconds
                    const actualDeltaTime = frame === 0 ? targetDeltaTime : (currentTime - previousTime) / 1000;
                    
                    // Capture positions before update
                    const frameSnapshot = {
                        frameNumber: frame,
                        deltaTime: actualDeltaTime,
                        timestamp: currentTime,
                        elementPositions: {},
                        animationStates: {},
                        velocities: {}
                    };
                    
                    // Record positions of moving elements
                    for (const element of movingElements) {
                        const pos = { x: element.entity.position.x, y: element.entity.position.y };
                        const vel = { x: element.entity.velocity.x, y: element.entity.velocity.y };
                        
                        frameSnapshot.elementPositions[element.type + '_' + element.entity.id] = pos;
                        frameSnapshot.velocities[element.type + '_' + element.entity.id] = vel;
                        
                        element.positions.push(pos);
                    }
                    
                    // Record animation states
                    if (animationEffects.includes('particles')) {
                        frameSnapshot.animationStates.particleCount = collisionFeedbackSystem.particles.length;
                        frameSnapshot.animationStates.particlePositions = collisionFeedbackSystem.particles.map(p => ({
                            x: p.x, y: p.y, vx: p.vx, vy: p.vy
                        }));
                    }
                    
                    if (animationEffects.includes('pulse')) {
                        const pulseAnimations = collisionFeedbackSystem.animations.filter(a => a.type === 'pulse');
                        frameSnapshot.animationStates.pulseRadius = pulseAnimations.length > 0 ? 
                            pulseAnimations[0].currentRadius : 0;
                        frameSnapshot.animationStates.pulseOpacity = pulseAnimations.length > 0 ? 
                            pulseAnimations[0].currentOpacity : 0;
                    }
                    
                    if (animationEffects.includes('floating_text')) {
                        const textEffects = collisionFeedbackSystem.activeFeedbacks.filter(f => f.type === 'floating-text');
                        frameSnapshot.animationStates.textY = textEffects.length > 0 ? textEffects[0].y : 0;
                        frameSnapshot.animationStates.textOpacity = textEffects.length > 0 ? textEffects[0].opacity : 0;
                    }
                    
                    frameData.push(frameSnapshot);
                    
                    // Update all systems and entities
                    gameEngine.update(actualDeltaTime);
                    collisionFeedbackSystem.update(actualDeltaTime);
                    
                    previousTime = currentTime;
                }
                
                // Property 1: Position changes should be smooth (no jarring jumps)
                for (const element of movingElements) {
                    if (element.positions.length >= 3) {
                        for (let i = 2; i < element.positions.length; i++) {
                            const pos1 = element.positions[i - 2];
                            const pos2 = element.positions[i - 1];
                            const pos3 = element.positions[i];
                            
                            // Calculate movement distances
                            const dist1 = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
                            const dist2 = Math.sqrt(Math.pow(pos3.x - pos2.x, 2) + Math.pow(pos3.y - pos2.y, 2));
                            
                            // Property: Movement distance should not vary dramatically between frames
                            // Allow for some variation due to movement patterns, but no huge jumps
                            if (dist1 > 0 && dist2 > 0) {
                                const distanceRatio = Math.max(dist1, dist2) / Math.min(dist1, dist2);
                                expect(distanceRatio).toBeLessThan(5.0); // No more than 5x difference
                            }
                            
                            // Property: Movement should not exceed reasonable bounds per frame
                            const maxReasonableDistance = movementSpeed * targetDeltaTime * 2; // 2x buffer
                            expect(dist1).toBeLessThan(maxReasonableDistance);
                            expect(dist2).toBeLessThan(maxReasonableDistance);
                        }
                    }
                }
                
                // Property 2: Delta time should be consistent for smooth animation
                if (frameData.length >= 2) {
                    const deltaTimes = frameData.slice(1).map(frame => frame.deltaTime);
                    const avgDeltaTime = deltaTimes.reduce((sum, dt) => sum + dt, 0) / deltaTimes.length;
                    
                    for (const deltaTime of deltaTimes) {
                        // Property: Delta time should not vary wildly (affects animation smoothness)
                        const deltaTimeRatio = Math.max(deltaTime, avgDeltaTime) / Math.min(deltaTime, avgDeltaTime);
                        expect(deltaTimeRatio).toBeLessThan(2.0); // No more than 2x variation
                        
                        // Property: Delta time should be reasonable for the target FPS
                        expect(deltaTime).toBeGreaterThan(0);
                        expect(deltaTime).toBeLessThan(1.0); // No frame should take more than 1 second
                    }
                }
                
                // Property 3: Particle animations should move smoothly
                if (animationEffects.includes('particles')) {
                    const particleFrames = frameData.filter(frame => 
                        frame.animationStates.particlePositions && 
                        frame.animationStates.particlePositions.length > 0
                    );
                    
                    if (particleFrames.length >= 2) {
                        // Track individual particles across frames
                        for (let particleIndex = 0; particleIndex < Math.min(3, particleFrames[0].animationStates.particlePositions.length); particleIndex++) {
                            const particlePositions = particleFrames.map(frame => 
                                frame.animationStates.particlePositions[particleIndex]
                            ).filter(pos => pos !== undefined);
                            
                            if (particlePositions.length >= 3) {
                                for (let i = 2; i < particlePositions.length; i++) {
                                    const pos1 = particlePositions[i - 2];
                                    const pos2 = particlePositions[i - 1];
                                    const pos3 = particlePositions[i];
                                    
                                    // Calculate particle movement distances
                                    const dist1 = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
                                    const dist2 = Math.sqrt(Math.pow(pos3.x - pos2.x, 2) + Math.pow(pos3.y - pos2.y, 2));
                                    
                                    // Property: Particle movement should be smooth
                                    if (dist1 > 0 && dist2 > 0) {
                                        const particleDistanceRatio = Math.max(dist1, dist2) / Math.min(dist1, dist2);
                                        expect(particleDistanceRatio).toBeLessThan(3.0); // Particles can have more variation due to physics
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Property 4: Pulse animations should have smooth radius changes
                if (animationEffects.includes('pulse')) {
                    const pulseFrames = frameData.filter(frame => 
                        frame.animationStates.pulseRadius !== undefined && 
                        frame.animationStates.pulseRadius > 0
                    );
                    
                    if (pulseFrames.length >= 3) {
                        for (let i = 2; i < pulseFrames.length; i++) {
                            const radius1 = pulseFrames[i - 2].animationStates.pulseRadius;
                            const radius2 = pulseFrames[i - 1].animationStates.pulseRadius;
                            const radius3 = pulseFrames[i].animationStates.pulseRadius;
                            
                            // Property: Pulse radius should change smoothly
                            const radiusChange1 = Math.abs(radius2 - radius1);
                            const radiusChange2 = Math.abs(radius3 - radius2);
                            
                            // Radius changes should be reasonable (not huge jumps)
                            const maxRadiusChange = 20; // pixels per frame
                            expect(radiusChange1).toBeLessThan(maxRadiusChange);
                            expect(radiusChange2).toBeLessThan(maxRadiusChange);
                        }
                    }
                }
                
                // Property 5: Floating text should move smoothly
                if (animationEffects.includes('floating_text')) {
                    const textFrames = frameData.filter(frame => 
                        frame.animationStates.textY !== undefined && 
                        frame.animationStates.textY > 0
                    );
                    
                    if (textFrames.length >= 3) {
                        for (let i = 2; i < textFrames.length; i++) {
                            const y1 = textFrames[i - 2].animationStates.textY;
                            const y2 = textFrames[i - 1].animationStates.textY;
                            const y3 = textFrames[i].animationStates.textY;
                            
                            // Property: Text should float upward smoothly
                            expect(y2).toBeLessThanOrEqual(y1); // Should move up (decreasing Y)
                            expect(y3).toBeLessThanOrEqual(y2); // Should continue moving up
                            
                            // Property: Text movement should be smooth
                            const textMove1 = Math.abs(y2 - y1);
                            const textMove2 = Math.abs(y3 - y2);
                            
                            if (textMove1 > 0 && textMove2 > 0) {
                                const textMoveRatio = Math.max(textMove1, textMove2) / Math.min(textMove1, textMove2);
                                expect(textMoveRatio).toBeLessThan(2.0); // Smooth text movement
                            }
                        }
                    }
                }
                
                // Property 6: Animation opacity changes should be smooth
                const opacityFrames = frameData.filter(frame => 
                    frame.animationStates.textOpacity !== undefined ||
                    frame.animationStates.pulseOpacity !== undefined
                );
                
                if (opacityFrames.length >= 3) {
                    for (let i = 2; i < opacityFrames.length; i++) {
                        const frame1 = opacityFrames[i - 2].animationStates;
                        const frame2 = opacityFrames[i - 1].animationStates;
                        const frame3 = opacityFrames[i].animationStates;
                        
                        // Check text opacity smoothness
                        if (frame1.textOpacity !== undefined && frame2.textOpacity !== undefined && frame3.textOpacity !== undefined) {
                            const opacityChange1 = Math.abs(frame2.textOpacity - frame1.textOpacity);
                            const opacityChange2 = Math.abs(frame3.textOpacity - frame2.textOpacity);
                            
                            // Property: Opacity should change smoothly
                            expect(opacityChange1).toBeLessThan(0.5); // No huge opacity jumps
                            expect(opacityChange2).toBeLessThan(0.5);
                        }
                        
                        // Check pulse opacity smoothness
                        if (frame1.pulseOpacity !== undefined && frame2.pulseOpacity !== undefined && frame3.pulseOpacity !== undefined) {
                            const pulseOpacityChange1 = Math.abs(frame2.pulseOpacity - frame1.pulseOpacity);
                            const pulseOpacityChange2 = Math.abs(frame3.pulseOpacity - frame2.pulseOpacity);
                            
                            // Property: Pulse opacity should change smoothly
                            expect(pulseOpacityChange1).toBeLessThan(0.3);
                            expect(pulseOpacityChange2).toBeLessThan(0.3);
                        }
                    }
                }
                
                // Property 7: Overall animation system should maintain consistency
                expect(frameData.length).toBe(frameCount);
                
                // Property: All frames should have valid timestamps
                for (let i = 1; i < frameData.length; i++) {
                    expect(frameData[i].timestamp).toBeGreaterThan(frameData[i - 1].timestamp);
                }
                
                // Property: Animation system should handle multiple concurrent animations without interference
                if (animationEffects.length > 1) {
                    const finalFrame = frameData[frameData.length - 1];
                    
                    // Verify that multiple animation types can coexist
                    let activeAnimationTypes = 0;
                    if (finalFrame.animationStates.particleCount > 0) activeAnimationTypes++;
                    if (finalFrame.animationStates.pulseRadius > 0) activeAnimationTypes++;
                    if (finalFrame.animationStates.textOpacity > 0) activeAnimationTypes++;
                    
                    // Should have multiple active animations if we requested them
                    expect(activeAnimationTypes).toBeGreaterThanOrEqual(Math.min(animationEffects.length, 2));
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });
});

describe('HealthSystem Property Tests', () => {
    let canvas;
    let gameEngine;
    let healthSystem;
    
    beforeEach(() => {
        // Create a fresh canvas for each test
        canvas = document.createElement('canvas');
        canvas.id = 'testCanvas';
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
        
        // Create game engine and health system
        gameEngine = new GameEngine('testCanvas');
        healthSystem = new HealthSystem({
            maxHealth: 100,
            startingHealth: 100,
            enableDamageFlash: false // Disable flash effect for testing
        });
        
        // Register system with game engine
        gameEngine.registerSystem('health', healthSystem);
        healthSystem.init(gameEngine);
        
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
    });

    /**
     * Property 5: Health decrement on incorrect answers
     * Feature: quick-math-game, Property 5: Health decrement on incorrect answers
     * For any incorrect collision, the health system should decrease the player's health by the appropriate amount
     */
    test('Property 5: Health decrement on incorrect answers', () => {
        fc.assert(fc.property(
            fc.record({
                initialHealth: fc.integer({ min: 1, max: 100 }),
                damageSequence: fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 10 }),
                damageSource: fc.constantFrom('incorrect_answer', 'collision', 'timeout', 'penalty')
            }),
            (config) => {
                const { initialHealth, damageSequence, damageSource } = config;
                
                // Reset health system completely for each test iteration
                healthSystem.resetHealth();
                
                // Directly set the health without recording it as a health change event
                healthSystem.currentHealth = initialHealth;
                healthSystem.isDead = false;
                
                // Verify initial state
                expect(healthSystem.getCurrentHealth()).toBe(initialHealth);
                expect(healthSystem.isEntityDead()).toBe(false);
                
                let expectedHealth = initialHealth;
                let shouldBeDead = false;
                
                // Apply damage sequence and verify health decrements
                for (let i = 0; i < damageSequence.length; i++) {
                    const damage = damageSequence[i];
                    const healthBefore = healthSystem.getCurrentHealth();
                    
                    // Property: Taking damage should decrease health by the damage amount
                    const isAlive = healthSystem.takeDamage(damage, damageSource);
                    const healthAfter = healthSystem.getCurrentHealth();
                    
                    // Calculate expected health after damage
                    expectedHealth = Math.max(0, expectedHealth - damage);
                    
                    // Property: Health should decrease by exactly the damage amount (or to 0)
                    expect(healthAfter).toBe(expectedHealth);
                    
                    // Property: Health should never go below 0
                    expect(healthAfter).toBeGreaterThanOrEqual(0);
                    
                    // Property: Health should never exceed maximum health
                    expect(healthAfter).toBeLessThanOrEqual(healthSystem.getMaxHealth());
                    
                    // Property: Health change should be exactly the damage amount (unless clamped to 0)
                    const actualHealthChange = healthBefore - healthAfter;
                    const expectedHealthChange = Math.min(damage, healthBefore);
                    expect(actualHealthChange).toBe(expectedHealthChange);
                    
                    // Property: Death state should be consistent with health level
                    if (expectedHealth <= 0) {
                        shouldBeDead = true;
                        expect(healthSystem.isEntityDead()).toBe(true);
                        expect(isAlive).toBe(false);
                    } else {
                        expect(healthSystem.isEntityDead()).toBe(false);
                        expect(isAlive).toBe(true);
                    }
                    
                    // Property: Once dead, no further health changes should occur
                    if (shouldBeDead) {
                        // Verify that subsequent damage calls don't change health
                        const deadHealth = healthSystem.getCurrentHealth();
                        expect(deadHealth).toBe(0);
                        
                        // Try to damage again - should have no effect
                        if (i < damageSequence.length - 1) {
                            const nextDamage = damageSequence[i + 1];
                            const stillDead = healthSystem.takeDamage(nextDamage, damageSource);
                            expect(healthSystem.getCurrentHealth()).toBe(0);
                            expect(stillDead).toBe(false);
                            expect(healthSystem.isEntityDead()).toBe(true);
                        }
                        break; // No point in continuing once dead
                    }
                }
                
                // Property: Health percentage should be consistent with current health
                const finalHealthPercentage = healthSystem.getHealthPercentage();
                const expectedPercentage = expectedHealth / healthSystem.getMaxHealth();
                expect(finalHealthPercentage).toBeCloseTo(expectedPercentage, 5);
                
                // Property: Health statistics should accurately reflect damage taken
                const healthStats = healthSystem.getHealthStats();
                expect(healthStats.currentHealth).toBe(expectedHealth);
                expect(healthStats.isDead).toBe(shouldBeDead);
                
                // Property: Total damage taken should equal sum of damage applied in this test
                const totalDamageApplied = damageSequence.reduce((sum, damage, index) => {
                    // Only count damage that was actually applied (before death)
                    let runningHealth = initialHealth;
                    for (let j = 0; j <= index; j++) {
                        if (runningHealth > 0) {
                            const actualDamage = Math.min(damageSequence[j], runningHealth);
                            if (j === index) {
                                return sum + actualDamage;
                            }
                            runningHealth -= actualDamage;
                        }
                    }
                    return sum;
                }, 0);
                
                expect(healthStats.totalDamageTaken).toBe(totalDamageApplied);
                
                // Property: Health history should contain damage events from this test only
                const damageEvents = healthSystem.healthHistory.filter(event => event.type === 'damage');
                
                // Count expected damage events (stop counting after death)
                let expectedDamageEvents = 0;
                let runningHealth = initialHealth;
                for (const damage of damageSequence) {
                    if (runningHealth > 0) {
                        expectedDamageEvents++;
                        runningHealth = Math.max(0, runningHealth - damage);
                        if (runningHealth <= 0) break;
                    }
                }
                
                expect(damageEvents.length).toBe(expectedDamageEvents);
                
                // Verify each damage event is properly recorded
                for (const event of damageEvents) {
                    expect(event.type).toBe('damage');
                    expect(event.amount).toBeGreaterThan(0);
                    expect(event.source).toBe(damageSource);
                    expect(event.previousHealth).toBeGreaterThanOrEqual(event.newHealth);
                    expect(event.timestamp).toBeGreaterThan(0);
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });

    /**
     * Property 8: Health bar visual updates
     * Feature: quick-math-game, Property 8: Health bar visual updates
     * For any change in player health, the health bar display should visually reflect the current health value
     */
    test('Property 8: Health bar visual updates', () => {
        fc.assert(fc.property(
            fc.record({
                initialHealth: fc.integer({ min: 2, max: 100 }), // Start with at least 2 health to ensure visual difference
                healthChanges: fc.array(
                    fc.record({
                        type: fc.constantFrom('damage', 'heal', 'set'),
                        amount: fc.integer({ min: 1, max: 50 })
                    }),
                    { minLength: 1, maxLength: 8 }
                ),
                canvasWidth: fc.integer({ min: 400, max: 1200 }),
                canvasHeight: fc.integer({ min: 300, max: 800 })
            }),
            (config) => {
                const { initialHealth, healthChanges, canvasWidth, canvasHeight } = config;
                
                // Reset health system and set initial health
                healthSystem.resetHealth();
                healthSystem.setHealth(initialHealth);
                
                // Update canvas size for this test
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                
                // Get canvas context for rendering tests
                const context = canvas.getContext('2d');
                
                // Mock the gameEngine.getCanvasSize method to return current canvas size
                gameEngine.getCanvasSize = jest.fn(() => ({
                    width: canvasWidth,
                    height: canvasHeight
                }));
                
                // Track health bar visual state through health changes
                const visualStates = [];
                
                // Capture initial visual state
                const initialHealthPercentage = healthSystem.getHealthPercentage();
                context.clearRect(0, 0, canvasWidth, canvasHeight);
                healthSystem.render(context);
                
                visualStates.push({
                    health: healthSystem.getCurrentHealth(),
                    healthPercentage: initialHealthPercentage,
                    maxHealth: healthSystem.getMaxHealth(),
                    isDead: healthSystem.isEntityDead(),
                    canvasData: context.getImageData(0, 0, canvasWidth, canvasHeight)
                });
                
                // Apply health changes and capture visual states
                for (const change of healthChanges) {
                    const healthBefore = healthSystem.getCurrentHealth();
                    
                    // Apply health change
                    switch (change.type) {
                        case 'damage':
                            healthSystem.takeDamage(change.amount, 'test');
                            break;
                        case 'heal':
                            healthSystem.heal(change.amount, 'test');
                            break;
                        case 'set':
                            const newHealth = Math.max(0, Math.min(healthSystem.getMaxHealth(), change.amount));
                            healthSystem.setHealth(newHealth, 'test');
                            break;
                    }
                    
                    const healthAfter = healthSystem.getCurrentHealth();
                    
                    // Only capture visual state if health actually changed
                    if (healthAfter !== healthBefore) {
                        // Clear canvas and render health bar
                        context.clearRect(0, 0, canvasWidth, canvasHeight);
                        healthSystem.render(context);
                        
                        // Capture visual state
                        const healthPercentage = healthSystem.getHealthPercentage();
                        visualStates.push({
                            health: healthAfter,
                            healthPercentage: healthPercentage,
                            maxHealth: healthSystem.getMaxHealth(),
                            isDead: healthSystem.isEntityDead(),
                            canvasData: context.getImageData(0, 0, canvasWidth, canvasHeight),
                            changeType: change.type,
                            changeAmount: change.amount
                        });
                    }
                    
                    // Stop if entity is dead (no more changes possible)
                    if (healthSystem.isEntityDead()) {
                        break;
                    }
                }
                
                // Property: Health bar should be visually different for different health values
                if (visualStates.length >= 2) {
                    for (let i = 1; i < visualStates.length; i++) {
                        const prevState = visualStates[i - 1];
                        const currState = visualStates[i];
                        
                        // If health values are different, visual representation should be different
                        if (prevState.health !== currState.health) {
                            const prevData = prevState.canvasData.data;
                            const currData = currState.canvasData.data;
                            
                            // Calculate visual difference by comparing pixel data
                            let pixelDifferences = 0;
                            for (let j = 0; j < prevData.length; j += 4) {
                                // Compare RGB values (skip alpha channel)
                                if (prevData[j] !== currData[j] || 
                                    prevData[j + 1] !== currData[j + 1] || 
                                    prevData[j + 2] !== currData[j + 2]) {
                                    pixelDifferences++;
                                }
                            }
                            
                            // Property: Different health values should produce visually different health bars
                            // Special case: if one state is dead and the other isn't, they must be visually different
                            if (prevState.isDead !== currState.isDead) {
                                expect(pixelDifferences).toBeGreaterThan(0);
                            } else if (Math.abs(prevState.healthPercentage - currState.healthPercentage) > 0.05) {
                                // Only require visual difference if health percentage differs by more than 5%
                                expect(pixelDifferences).toBeGreaterThan(0);
                            }
                        }
                    }
                }
                
                // Property: Health bar visual elements should be present when health bar is enabled
                if (healthSystem.config.showHealthBar && visualStates.length > 0) {
                    const finalState = visualStates[visualStates.length - 1];
                    const imageData = finalState.canvasData.data;
                    
                    // Check that there are non-transparent pixels (health bar is rendered)
                    let hasVisiblePixels = false;
                    for (let i = 3; i < imageData.length; i += 4) { // Check alpha channel
                        if (imageData[i] > 0) {
                            hasVisiblePixels = true;
                            break;
                        }
                    }
                    expect(hasVisiblePixels).toBe(true);
                }
                
                // Property: Health bar fill should correspond to health percentage
                for (const state of visualStates) {
                    // Clear canvas and render just for this verification
                    context.clearRect(0, 0, canvasWidth, canvasHeight);
                    
                    // Temporarily set health to this state's value for rendering
                    const originalHealth = healthSystem.getCurrentHealth();
                    healthSystem.currentHealth = state.health;
                    healthSystem.isDead = state.isDead;
                    
                    // Render health bar
                    healthSystem.render(context);
                    
                    // Restore original health
                    healthSystem.currentHealth = originalHealth;
                    healthSystem.isDead = healthSystem.getCurrentHealth() <= 0;
                    
                    // Property: Health percentage should be accurately calculated
                    const expectedPercentage = state.health / state.maxHealth;
                    expect(state.healthPercentage).toBeCloseTo(expectedPercentage, 5);
                    
                    // Property: Health percentage should be between 0 and 1
                    expect(state.healthPercentage).toBeGreaterThanOrEqual(0);
                    expect(state.healthPercentage).toBeLessThanOrEqual(1);
                }
                
                // Property: Health bar should handle edge cases correctly
                const edgeCases = [
                    { health: 0, description: 'zero health' },
                    { health: healthSystem.getMaxHealth(), description: 'full health' }
                ];
                
                for (const edgeCase of edgeCases) {
                    // Set health to edge case value
                    const originalHealth = healthSystem.getCurrentHealth();
                    const originalDeadState = healthSystem.isEntityDead();
                    
                    healthSystem.currentHealth = edgeCase.health;
                    healthSystem.isDead = edgeCase.health <= 0;
                    
                    // Clear and render
                    context.clearRect(0, 0, canvasWidth, canvasHeight);
                    healthSystem.render(context);
                    
                    // Property: Edge cases should render without errors
                    const healthPercentage = healthSystem.getHealthPercentage();
                    expect(healthPercentage).toBeGreaterThanOrEqual(0);
                    expect(healthPercentage).toBeLessThanOrEqual(1);
                    
                    if (edgeCase.health === 0) {
                        expect(healthPercentage).toBe(0);
                        expect(healthSystem.isEntityDead()).toBe(true);
                    } else if (edgeCase.health === healthSystem.getMaxHealth()) {
                        expect(healthPercentage).toBe(1);
                        expect(healthSystem.isFullHealth()).toBe(true);
                    }
                    
                    // Restore original state
                    healthSystem.currentHealth = originalHealth;
                    healthSystem.isDead = originalDeadState;
                }
                
                // Property: Health bar color should change based on health level
                const healthLevels = [
                    { percentage: 0.8, expectedColorType: 'healthy' },
                    { percentage: 0.5, expectedColorType: 'warning' },
                    { percentage: 0.2, expectedColorType: 'critical' }
                ];
                
                for (const level of healthLevels) {
                    const testHealth = Math.floor(level.percentage * healthSystem.getMaxHealth());
                    
                    // Set health to test level
                    const originalHealth = healthSystem.getCurrentHealth();
                    const originalDeadState = healthSystem.isEntityDead();
                    
                    healthSystem.currentHealth = testHealth;
                    healthSystem.isDead = testHealth <= 0;
                    
                    // Property: Health level categorization should be correct
                    const healthPercentage = healthSystem.getHealthPercentage();
                    
                    if (healthPercentage > 0.6) {
                        expect(healthSystem.isCriticalHealth()).toBe(false);
                        expect(healthSystem.isWarningHealth()).toBe(false);
                    } else if (healthPercentage > 0.3) {
                        expect(healthSystem.isCriticalHealth()).toBe(false);
                        expect(healthSystem.isWarningHealth()).toBe(true);
                    } else {
                        expect(healthSystem.isCriticalHealth()).toBe(true);
                        expect(healthSystem.isWarningHealth()).toBe(false);
                    }
                    
                    // Restore original state
                    healthSystem.currentHealth = originalHealth;
                    healthSystem.isDead = originalDeadState;
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });
});

describe('CollisionFeedbackSystem Property Tests', () => {
    let canvas;
    let gameEngine;
    let collisionFeedbackSystem;
    let mathContentSystem;
    let physicsSystem;
    let playerCharacter;
    
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
        physicsSystem = new PhysicsSystem({
            worldBounds: { width: 800, height: 600 },
            cellSize: 50
        });
        collisionFeedbackSystem = new CollisionFeedbackSystem({
            correctFeedbackDuration: 800,
            incorrectFeedbackDuration: 1000,
            enableParticles: true,
            enableScreenShake: true
        });
        
        // Register systems with game engine
        gameEngine.registerSystem('mathContent', mathContentSystem);
        gameEngine.registerSystem('physics', physicsSystem);
        gameEngine.registerSystem('collisionFeedback', collisionFeedbackSystem);
        
        // Initialize systems
        physicsSystem.init(gameEngine);
        collisionFeedbackSystem.init(gameEngine);
        
        // Create player character
        playerCharacter = new PlayerCharacter(400, 300, 40, 40);
        gameEngine.addEntity(playerCharacter);
        
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
        
        // Clear all feedback effects
        if (collisionFeedbackSystem) {
            collisionFeedbackSystem.clearAllEffects();
        }
    });

    /**
     * Property 6: Collision feedback consistency
     * Feature: quick-math-game, Property 6: Collision feedback consistency
     * For any collision (correct or incorrect), the game engine should provide appropriate visual feedback that matches the collision type
     */
    test('Property 6: Collision feedback consistency', () => {
        fc.assert(fc.property(
            fc.record({
                collisionScenarios: fc.array(
                    fc.record({
                        tileValue: fc.integer({ min: 1, max: 100 }),
                        correctAnswer: fc.integer({ min: 1, max: 100 }),
                        playerPosition: fc.record({
                            x: fc.integer({ min: 50, max: 750 }),
                            y: fc.integer({ min: 50, max: 550 })
                        }),
                        tilePosition: fc.record({
                            x: fc.integer({ min: 50, max: 750 }),
                            y: fc.integer({ min: 50, max: 550 })
                        })
                    }),
                    { minLength: 1, maxLength: 5 }
                )
            }),
            (config) => {
                const { collisionScenarios } = config;
                
                // Track feedback consistency across all collision scenarios
                const feedbackResults = [];
                
                for (const scenario of collisionScenarios) {
                    const { tileValue, correctAnswer, playerPosition, tilePosition } = scenario;
                    
                    // Set up math problem with known correct answer
                    const problem = mathContentSystem.generateProblem('addition', 1);
                    // Override the problem to have our test values
                    problem.correctAnswer = correctAnswer;
                    problem.operandA = Math.floor(correctAnswer / 2);
                    problem.operandB = correctAnswer - Math.floor(correctAnswer / 2);
                    mathContentSystem.currentProblem = problem;
                    
                    // Position player character
                    playerCharacter.position.x = playerPosition.x;
                    playerCharacter.position.y = playerPosition.y;
                    
                    // Determine if this should be a correct or incorrect collision
                    const isCorrectCollision = tileValue === correctAnswer;
                    
                    // Create number tile with test value
                    const numberTile = new NumberTile(
                        tilePosition.x,
                        tilePosition.y,
                        tileValue,
                        isCorrectCollision,
                        30,
                        30
                    );
                    gameEngine.addEntity(numberTile);
                    
                    // Clear any existing feedback effects
                    collisionFeedbackSystem.clearAllEffects();
                    
                    // Get initial feedback state
                    const initialStats = collisionFeedbackSystem.getStats();
                    expect(initialStats.activeFeedbacks).toBe(0);
                    expect(initialStats.activeParticles).toBe(0);
                    expect(initialStats.activeAnimations).toBe(0);
                    expect(initialStats.screenShakeActive).toBe(false);
                    
                    // Trigger collision feedback
                    collisionFeedbackSystem.handleCollision(playerCharacter, numberTile);
                    
                    // Debug: Check what the collision feedback system thinks about this collision
                    const currentProblem = mathContentSystem.getCurrentProblem();
                    const actualTileValue = numberTile.getValue();
                    const expectedCorrect = actualTileValue === currentProblem.correctAnswer;
                    
                    // Property: Collision should always generate feedback
                    const feedbackStats = collisionFeedbackSystem.getStats();
                    expect(feedbackStats.activeFeedbacks).toBeGreaterThan(0);
                    
                    // Property: Feedback type should match collision correctness
                    if (expectedCorrect) {
                        // Correct collision should generate success feedback
                        expect(feedbackStats.activeFeedbacks).toBeGreaterThan(0);
                        
                        // Should have particles if enabled
                        if (collisionFeedbackSystem.config.enableParticles) {
                            expect(feedbackStats.activeParticles).toBeGreaterThan(0);
                        }
                        
                        // Should have animations
                        expect(feedbackStats.activeAnimations).toBeGreaterThan(0);
                        
                        // Should NOT have screen shake for correct answers
                        expect(feedbackStats.screenShakeActive).toBe(false);
                        
                        // Player should be highlighted with success color
                        expect(playerCharacter.color).toBe('#27ae60'); // Success color
                        
                        // Tile should be highlighted
                        expect(numberTile.isHighlighted).toBe(true);
                    } else {
                        // Incorrect collision should generate error feedback
                        expect(feedbackStats.activeFeedbacks).toBeGreaterThan(0);
                        
                        // Should have particles if enabled
                        if (collisionFeedbackSystem.config.enableParticles) {
                            expect(feedbackStats.activeParticles).toBeGreaterThan(0);
                        }
                        
                        // Should have animations
                        expect(feedbackStats.activeAnimations).toBeGreaterThan(0);
                        
                        // Should have screen shake if enabled
                        if (collisionFeedbackSystem.config.enableScreenShake) {
                            expect(feedbackStats.screenShakeActive).toBe(true);
                        }
                        
                        // Player should be highlighted with error color
                        expect(playerCharacter.color).toBe('#e74c3c'); // Error color
                        
                        // Tile should be highlighted
                        expect(numberTile.isHighlighted).toBe(true);
                    }
                    
                    // Property: Feedback duration should be appropriate for collision type
                    const activeFeedbacks = collisionFeedbackSystem.activeFeedbacks;
                    for (const feedback of activeFeedbacks) {
                        if (expectedCorrect) {
                            expect(feedback.duration).toBe(collisionFeedbackSystem.config.correctFeedbackDuration);
                        } else {
                            expect(feedback.duration).toBe(collisionFeedbackSystem.config.incorrectFeedbackDuration);
                        }
                        expect(feedback.elapsed).toBe(0); // Should be freshly created
                        if (feedback.startTime !== undefined) {
                            expect(feedback.startTime).toBeGreaterThan(0);
                        }
                    }
                    
                    // Property: Particles should have appropriate properties for collision type
                    const particles = collisionFeedbackSystem.particles;
                    for (const particle of particles) {
                        expect(particle.lifetime).toBeGreaterThan(0);
                        expect(particle.elapsed).toBe(0);
                        expect(particle.size).toBeGreaterThan(0);
                        expect(particle.color).toBeTruthy();
                        
                        // Particle behavior should match collision type
                        if (expectedCorrect) {
                            expect(particle.type).toBe('success');
                            expect(particle.gravity).toBeLessThan(0); // Success particles float up
                        } else {
                            expect(particle.type).toBe('error');
                            expect(particle.gravity).toBeGreaterThan(0); // Error particles fall down
                        }
                    }
                    
                    // Property: Animations should be created for collision point
                    const animations = collisionFeedbackSystem.animations;
                    expect(animations.length).toBeGreaterThan(0);
                    
                    for (const animation of animations) {
                        expect(animation.type).toBe('pulse');
                        expect(animation.elapsed).toBe(0);
                        expect(animation.duration).toBeGreaterThan(0);
                        expect(animation.maxRadius).toBeGreaterThan(0);
                        expect(animation.opacity).toBeGreaterThan(0);
                        expect(animation.x).toBeGreaterThan(0);
                        expect(animation.y).toBeGreaterThan(0);
                        
                        // Animation properties should match collision type
                        if (expectedCorrect) {
                            expect(animation.maxRadius).toBeLessThanOrEqual(40); // Smaller pulse for success
                            expect(animation.pulseCount).toBe(1);
                        } else {
                            expect(animation.maxRadius).toBeGreaterThanOrEqual(50); // Larger pulse for error
                            expect(animation.pulseCount).toBe(2);
                        }
                    }
                    
                    // Simulate some time passing to test feedback updates
                    const deltaTime = 0.1; // 100ms
                    collisionFeedbackSystem.update(deltaTime);
                    
                    // Property: Feedback should update over time
                    const updatedStats = collisionFeedbackSystem.getStats();
                    
                    // Feedback effects should still be active but progressing
                    expect(updatedStats.activeFeedbacks).toBeGreaterThan(0);
                    
                    // Check that feedback effects have progressed
                    for (const feedback of collisionFeedbackSystem.activeFeedbacks) {
                        expect(feedback.elapsed).toBeGreaterThan(0);
                        expect(feedback.elapsed).toBeLessThan(feedback.duration);
                    }
                    
                    // Check that particles have moved and updated
                    for (const particle of collisionFeedbackSystem.particles) {
                        expect(particle.elapsed).toBeGreaterThan(0);
                        expect(particle.elapsed).toBeLessThan(particle.lifetime);
                    }
                    
                    // Check that animations have progressed
                    for (const animation of collisionFeedbackSystem.animations) {
                        expect(animation.elapsed).toBeGreaterThan(0);
                        expect(animation.elapsed).toBeLessThan(animation.duration);
                    }
                    
                    // Property: Screen shake should decay over time for incorrect collisions
                    if (!expectedCorrect && collisionFeedbackSystem.config.enableScreenShake) {
                        expect(collisionFeedbackSystem.screenShake.elapsed).toBeGreaterThan(0);
                        expect(collisionFeedbackSystem.screenShake.intensity).toBeGreaterThan(0);
                    }
                    
                    // Record feedback result for consistency analysis
                    feedbackResults.push({
                        isCorrect: expectedCorrect,
                        feedbackGenerated: feedbackStats.activeFeedbacks > 0,
                        particlesGenerated: feedbackStats.activeParticles > 0,
                        animationsGenerated: feedbackStats.activeAnimations > 0,
                        screenShakeTriggered: feedbackStats.screenShakeActive,
                        playerHighlighted: playerCharacter.color === '#27ae60' || playerCharacter.color === '#e74c3c',
                        tileHighlighted: numberTile.isHighlighted
                    });
                    
                    // Clean up for next iteration
                    gameEngine.removeEntity(numberTile);
                    collisionFeedbackSystem.clearAllEffects();
                    
                    // Reset player and tile states
                    playerCharacter.resetColor();
                    numberTile.setHighlight(false);
                }
                
                // Property: Feedback consistency across multiple collisions
                const correctCollisions = feedbackResults.filter(r => r.isCorrect);
                const incorrectCollisions = feedbackResults.filter(r => !r.isCorrect);
                
                // All collisions should generate feedback
                for (const result of feedbackResults) {
                    expect(result.feedbackGenerated).toBe(true);
                    expect(result.playerHighlighted).toBe(true);
                    expect(result.tileHighlighted).toBe(true);
                }
                
                // Correct collisions should be consistent
                if (correctCollisions.length > 1) {
                    const firstCorrect = correctCollisions[0];
                    for (const correct of correctCollisions) {
                        expect(correct.screenShakeTriggered).toBe(firstCorrect.screenShakeTriggered);
                        expect(correct.particlesGenerated).toBe(firstCorrect.particlesGenerated);
                        expect(correct.animationsGenerated).toBe(firstCorrect.animationsGenerated);
                    }
                }
                
                // Incorrect collisions should be consistent
                if (incorrectCollisions.length > 1) {
                    const firstIncorrect = incorrectCollisions[0];
                    for (const incorrect of incorrectCollisions) {
                        expect(incorrect.particlesGenerated).toBe(firstIncorrect.particlesGenerated);
                        expect(incorrect.animationsGenerated).toBe(firstIncorrect.animationsGenerated);
                    }
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });
});

describe('Animation Smoothness Property Tests', () => {
    let canvas;
    let gameEngine;
    let collisionFeedbackSystem;
    let physicsSystem;
    let playerCharacter;
    let numberTiles;
    
    beforeEach(() => {
        // Create a fresh canvas for each test
        canvas = document.createElement('canvas');
        canvas.id = 'testCanvas';
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
        
        // Create game engine and systems
        gameEngine = new GameEngine('testCanvas');
        physicsSystem = new PhysicsSystem({ width: 800, height: 600 });
        collisionFeedbackSystem = new CollisionFeedbackSystem({
            enableParticles: true,
            enableScreenShake: true
        });
        
        // Register systems
        gameEngine.registerSystem('physics', physicsSystem);
        gameEngine.registerSystem('collisionFeedback', collisionFeedbackSystem);
        
        // Initialize systems
        physicsSystem.init(gameEngine);
        collisionFeedbackSystem.init(gameEngine);
        
        // Create player character
        playerCharacter = new PlayerCharacter(400, 300, 40, 40);
        gameEngine.addEntity(playerCharacter);
        
        // Initialize number tiles array
        numberTiles = [];
        
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
        
        // Clear all effects
        if (collisionFeedbackSystem) {
            collisionFeedbackSystem.clearAllEffects();
        }
        
        // Clean up number tiles
        for (const tile of numberTiles) {
            gameEngine.removeEntity(tile);
        }
        numberTiles = [];
    });

    /**
     * Property 12: Animation smoothness
     * Feature: quick-math-game, Property 12: Animation smoothness
     * For any moving element in the game, position updates should occur smoothly over time without jarring jumps
     */
    test('Property 12: Animation smoothness', () => {
        fc.assert(fc.property(
            fc.record({
                frameCount: fc.integer({ min: 10, max: 60 }), // Test over multiple frames
                movingElementCount: fc.integer({ min: 1, max: 8 }), // Multiple moving elements
                targetFPS: fc.integer({ min: 30, max: 120 }), // Different frame rates
                movementSpeed: fc.float({ min: 50, max: 400 }), // Various movement speeds
                animationTypes: fc.array(
                    fc.constantFrom('player_movement', 'tile_movement', 'particles', 'pulse_animation', 'floating_text'),
                    { minLength: 1, maxLength: 3 }
                )
            }),
            (config) => {
                const { frameCount, movingElementCount, targetFPS, movementSpeed, animationTypes } = config;
                
                // Configure game engine for target FPS
                gameEngine.config.targetFPS = targetFPS;
                const targetDeltaTime = 1 / targetFPS;
                
                // Create moving elements based on test configuration
                const movingElements = [];
                
                // Add player movement if requested
                if (animationTypes.includes('player_movement')) {
                    playerCharacter.setVelocity(movementSpeed * 0.7, movementSpeed * 0.5);
                    movingElements.push({
                        type: 'player',
                        entity: playerCharacter,
                        positions: []
                    });
                }
                
                // Add number tiles if requested
                if (animationTypes.includes('tile_movement')) {
                    for (let i = 0; i < Math.min(movingElementCount, 5); i++) {
                        const tile = new NumberTile(
                            100 + i * 120, // x position
                            100 + i * 80,  // y position
                            i + 1,         // value
                            false,         // isCorrect
                            30,            // width
                            30             // height
                        );
                        
                        // Set random movement pattern and speed
                        tile.setSpeed(movementSpeed * (0.5 + Math.random() * 0.5));
                        tile.setMovementPattern(['linear', 'sine', 'circular'][i % 3]);
                        tile.setVelocity(
                            (Math.random() - 0.5) * movementSpeed,
                            (Math.random() - 0.5) * movementSpeed
                        );
                        
                        gameEngine.addEntity(tile);
                        numberTiles.push(tile);
                        
                        movingElements.push({
                            type: 'tile',
                            entity: tile,
                            positions: []
                        });
                    }
                }
                
                // Process entity additions
                gameEngine.processEntityChanges();
                
                // Create animations if requested
                let animationEffects = [];
                if (animationTypes.includes('particles')) {
                    collisionFeedbackSystem.createParticleEffect(
                        { x: 400, y: 300 },
                        {
                            color: '#27ae60',
                            count: 6,
                            speed: movementSpeed * 0.8,
                            spread: Math.PI * 2,
                            lifetime: 2000,
                            type: 'success'
                        }
                    );
                    animationEffects.push('particles');
                }
                
                if (animationTypes.includes('pulse_animation')) {
                    collisionFeedbackSystem.createPulseAnimation(
                        { x: 300, y: 200 },
                        {
                            color: '#e74c3c',
                            maxRadius: 50,
                            duration: 1000,
                            opacity: 0.6,
                            pulseCount: 2
                        }
                    );
                    animationEffects.push('pulse');
                }
                
                if (animationTypes.includes('floating_text')) {
                    collisionFeedbackSystem.createFloatingText(
                        { x: 500, y: 400 },
                        'Test!',
                        {
                            color: '#3498db',
                            fontSize: 24,
                            duration: 1500,
                            animation: 'float-up'
                        }
                    );
                    animationEffects.push('floating_text');
                }
                
                // Track animation data over multiple frames
                const frameData = [];
                let previousTime = 0;
                
                // Simulate multiple frames with consistent timing
                for (let frame = 0; frame < frameCount; frame++) {
                    const currentTime = frame * (targetDeltaTime * 1000); // Convert to milliseconds
                    const actualDeltaTime = frame === 0 ? targetDeltaTime : (currentTime - previousTime) / 1000;
                    
                    // Capture positions before update
                    const frameSnapshot = {
                        frameNumber: frame,
                        deltaTime: actualDeltaTime,
                        timestamp: currentTime,
                        elementPositions: {},
                        animationStates: {},
                        velocities: {}
                    };
                    
                    // Record positions of moving elements
                    for (const element of movingElements) {
                        const pos = { x: element.entity.position.x, y: element.entity.position.y };
                        const vel = { x: element.entity.velocity.x, y: element.entity.velocity.y };
                        
                        frameSnapshot.elementPositions[element.type + '_' + element.entity.id] = pos;
                        frameSnapshot.velocities[element.type + '_' + element.entity.id] = vel;
                        
                        element.positions.push(pos);
                    }
                    
                    // Record animation states
                    if (animationEffects.includes('particles')) {
                        frameSnapshot.animationStates.particleCount = collisionFeedbackSystem.particles.length;
                        frameSnapshot.animationStates.particlePositions = collisionFeedbackSystem.particles.map(p => ({
                            x: p.x, y: p.y, vx: p.vx, vy: p.vy
                        }));
                    }
                    
                    if (animationEffects.includes('pulse')) {
                        const pulseAnimations = collisionFeedbackSystem.animations.filter(a => a.type === 'pulse');
                        frameSnapshot.animationStates.pulseRadius = pulseAnimations.length > 0 ? 
                            pulseAnimations[0].currentRadius : 0;
                        frameSnapshot.animationStates.pulseOpacity = pulseAnimations.length > 0 ? 
                            pulseAnimations[0].currentOpacity : 0;
                    }
                    
                    if (animationEffects.includes('floating_text')) {
                        const textEffects = collisionFeedbackSystem.activeFeedbacks.filter(f => f.type === 'floating-text');
                        frameSnapshot.animationStates.textY = textEffects.length > 0 ? textEffects[0].y : 0;
                        frameSnapshot.animationStates.textOpacity = textEffects.length > 0 ? textEffects[0].opacity : 0;
                    }
                    
                    frameData.push(frameSnapshot);
                    
                    // Update all systems and entities
                    gameEngine.update(actualDeltaTime);
                    collisionFeedbackSystem.update(actualDeltaTime);
                    
                    previousTime = currentTime;
                }
                
                // Property 1: Position changes should be smooth (no jarring jumps)
                for (const element of movingElements) {
                    if (element.positions.length >= 3) {
                        for (let i = 2; i < element.positions.length; i++) {
                            const pos1 = element.positions[i - 2];
                            const pos2 = element.positions[i - 1];
                            const pos3 = element.positions[i];
                            
                            // Calculate movement distances
                            const dist1 = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
                            const dist2 = Math.sqrt(Math.pow(pos3.x - pos2.x, 2) + Math.pow(pos3.y - pos2.y, 2));
                            
                            // Property: Movement distance should not vary dramatically between frames
                            // Allow for some variation due to movement patterns, but no huge jumps
                            if (dist1 > 0 && dist2 > 0) {
                                const distanceRatio = Math.max(dist1, dist2) / Math.min(dist1, dist2);
                                expect(distanceRatio).toBeLessThan(5.0); // No more than 5x difference
                            }
                            
                            // Property: Movement should not exceed reasonable bounds per frame
                            const maxReasonableDistance = movementSpeed * targetDeltaTime * 2; // 2x buffer
                            expect(dist1).toBeLessThan(maxReasonableDistance);
                            expect(dist2).toBeLessThan(maxReasonableDistance);
                        }
                    }
                }
                
                // Property 2: Delta time should be consistent for smooth animation
                if (frameData.length >= 2) {
                    const deltaTimes = frameData.slice(1).map(frame => frame.deltaTime);
                    const avgDeltaTime = deltaTimes.reduce((sum, dt) => sum + dt, 0) / deltaTimes.length;
                    
                    for (const deltaTime of deltaTimes) {
                        // Property: Delta time should not vary wildly (affects animation smoothness)
                        const deltaTimeRatio = Math.max(deltaTime, avgDeltaTime) / Math.min(deltaTime, avgDeltaTime);
                        expect(deltaTimeRatio).toBeLessThan(2.0); // No more than 2x variation
                        
                        // Property: Delta time should be reasonable for the target FPS
                        expect(deltaTime).toBeGreaterThan(0);
                        expect(deltaTime).toBeLessThan(1.0); // No frame should take more than 1 second
                    }
                }
                
                // Property 3: Particle animations should move smoothly
                if (animationEffects.includes('particles')) {
                    const particleFrames = frameData.filter(frame => 
                        frame.animationStates.particlePositions && 
                        frame.animationStates.particlePositions.length > 0
                    );
                    
                    if (particleFrames.length >= 2) {
                        // Track individual particles across frames
                        for (let particleIndex = 0; particleIndex < Math.min(3, particleFrames[0].animationStates.particlePositions.length); particleIndex++) {
                            const particlePositions = particleFrames.map(frame => 
                                frame.animationStates.particlePositions[particleIndex]
                            ).filter(pos => pos !== undefined);
                            
                            if (particlePositions.length >= 3) {
                                for (let i = 2; i < particlePositions.length; i++) {
                                    const pos1 = particlePositions[i - 2];
                                    const pos2 = particlePositions[i - 1];
                                    const pos3 = particlePositions[i];
                                    
                                    // Calculate particle movement distances
                                    const dist1 = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
                                    const dist2 = Math.sqrt(Math.pow(pos3.x - pos2.x, 2) + Math.pow(pos3.y - pos2.y, 2));
                                    
                                    // Property: Particle movement should be smooth
                                    if (dist1 > 0 && dist2 > 0) {
                                        const particleDistanceRatio = Math.max(dist1, dist2) / Math.min(dist1, dist2);
                                        expect(particleDistanceRatio).toBeLessThan(3.0); // Particles can have more variation due to physics
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Property 4: Pulse animations should have smooth radius changes
                if (animationEffects.includes('pulse')) {
                    const pulseFrames = frameData.filter(frame => 
                        frame.animationStates.pulseRadius !== undefined && 
                        frame.animationStates.pulseRadius > 0
                    );
                    
                    if (pulseFrames.length >= 3) {
                        for (let i = 2; i < pulseFrames.length; i++) {
                            const radius1 = pulseFrames[i - 2].animationStates.pulseRadius;
                            const radius2 = pulseFrames[i - 1].animationStates.pulseRadius;
                            const radius3 = pulseFrames[i].animationStates.pulseRadius;
                            
                            // Property: Pulse radius should change smoothly
                            const radiusChange1 = Math.abs(radius2 - radius1);
                            const radiusChange2 = Math.abs(radius3 - radius2);
                            
                            // Radius changes should be reasonable (not huge jumps)
                            const maxRadiusChange = 20; // pixels per frame
                            expect(radiusChange1).toBeLessThan(maxRadiusChange);
                            expect(radiusChange2).toBeLessThan(maxRadiusChange);
                        }
                    }
                }
                
                // Property 5: Floating text should move smoothly
                if (animationEffects.includes('floating_text')) {
                    const textFrames = frameData.filter(frame => 
                        frame.animationStates.textY !== undefined && 
                        frame.animationStates.textY > 0
                    );
                    
                    if (textFrames.length >= 3) {
                        for (let i = 2; i < textFrames.length; i++) {
                            const y1 = textFrames[i - 2].animationStates.textY;
                            const y2 = textFrames[i - 1].animationStates.textY;
                            const y3 = textFrames[i].animationStates.textY;
                            
                            // Property: Text should float upward smoothly
                            expect(y2).toBeLessThanOrEqual(y1); // Should move up (decreasing Y)
                            expect(y3).toBeLessThanOrEqual(y2); // Should continue moving up
                            
                            // Property: Text movement should be smooth
                            const textMove1 = Math.abs(y2 - y1);
                            const textMove2 = Math.abs(y3 - y2);
                            
                            if (textMove1 > 0 && textMove2 > 0) {
                                const textMoveRatio = Math.max(textMove1, textMove2) / Math.min(textMove1, textMove2);
                                expect(textMoveRatio).toBeLessThan(2.0); // Smooth text movement
                            }
                        }
                    }
                }
                
                // Property 6: Animation opacity changes should be smooth
                const opacityFrames = frameData.filter(frame => 
                    frame.animationStates.textOpacity !== undefined ||
                    frame.animationStates.pulseOpacity !== undefined
                );
                
                if (opacityFrames.length >= 3) {
                    for (let i = 2; i < opacityFrames.length; i++) {
                        const frame1 = opacityFrames[i - 2].animationStates;
                        const frame2 = opacityFrames[i - 1].animationStates;
                        const frame3 = opacityFrames[i].animationStates;
                        
                        // Check text opacity smoothness
                        if (frame1.textOpacity !== undefined && frame2.textOpacity !== undefined && frame3.textOpacity !== undefined) {
                            const opacityChange1 = Math.abs(frame2.textOpacity - frame1.textOpacity);
                            const opacityChange2 = Math.abs(frame3.textOpacity - frame2.textOpacity);
                            
                            // Property: Opacity should change smoothly
                            expect(opacityChange1).toBeLessThan(0.5); // No huge opacity jumps
                            expect(opacityChange2).toBeLessThan(0.5);
                        }
                        
                        // Check pulse opacity smoothness
                        if (frame1.pulseOpacity !== undefined && frame2.pulseOpacity !== undefined && frame3.pulseOpacity !== undefined) {
                            const pulseOpacityChange1 = Math.abs(frame2.pulseOpacity - frame1.pulseOpacity);
                            const pulseOpacityChange2 = Math.abs(frame3.pulseOpacity - frame2.pulseOpacity);
                            
                            // Property: Pulse opacity should change smoothly
                            expect(pulseOpacityChange1).toBeLessThan(0.3);
                            expect(pulseOpacityChange2).toBeLessThan(0.3);
                        }
                    }
                }
                
                // Property 7: Overall animation system should maintain consistency
                expect(frameData.length).toBe(frameCount);
                
                // Property: All frames should have valid timestamps
                for (let i = 1; i < frameData.length; i++) {
                    expect(frameData[i].timestamp).toBeGreaterThan(frameData[i - 1].timestamp);
                }
                
                // Property: Animation system should handle multiple concurrent animations without interference
                if (animationEffects.length > 1) {
                    const finalFrame = frameData[frameData.length - 1];
                    
                    // Verify that multiple animation types can coexist
                    let activeAnimationTypes = 0;
                    if (finalFrame.animationStates.particleCount > 0) activeAnimationTypes++;
                    if (finalFrame.animationStates.pulseRadius > 0) activeAnimationTypes++;
                    if (finalFrame.animationStates.textOpacity > 0) activeAnimationTypes++;
                    
                    // Should have multiple active animations if we requested them
                    expect(activeAnimationTypes).toBeGreaterThanOrEqual(Math.min(animationEffects.length, 2));
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });
});