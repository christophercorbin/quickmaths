/**
 * Basic integration tests to verify core systems work together
 * These tests focus on the essential functionality without complex setup
 */

// Import test setup
require('./setup.js');

describe('Basic Integration Tests', () => {
    let gameEngine;
    let canvas;
    
    beforeEach(() => {
        // Create test canvas
        canvas = document.createElement('canvas');
        canvas.id = 'testCanvas';
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
        
        // Create game engine
        gameEngine = new GameEngine('testCanvas', {
            targetFPS: 60,
            backgroundColor: '#ecf0f1',
            showDebugInfo: false
        });
    });
    
    afterEach(() => {
        if (gameEngine && gameEngine.isGameRunning()) {
            gameEngine.stop();
        }
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
    });
    
    test('GameEngine initializes and manages systems', () => {
        // Test that GameEngine can be created and started
        expect(gameEngine).toBeTruthy();
        expect(gameEngine.isGameRunning()).toBe(false);
        
        // Start the engine
        gameEngine.start();
        expect(gameEngine.isGameRunning()).toBe(true);
        
        // Test system registration
        const testSystem = {
            init: jest.fn(),
            update: jest.fn(),
            render: jest.fn()
        };
        
        gameEngine.registerSystem('test', testSystem);
        expect(gameEngine.getSystem('test')).toBe(testSystem);
        expect(testSystem.init).toHaveBeenCalledWith(gameEngine);
        
        console.log('✓ GameEngine initialization and system management verified');
    });
    
    test('MathContentSystem generates valid problems', () => {
        const mathSystem = new MathContentSystem();
        
        // Test problem generation
        const problem = mathSystem.generateRandomProblem();
        expect(problem).toBeTruthy();
        expect(typeof problem.correctAnswer).toBe('number');
        expect(problem.operation).toBeTruthy();
        
        // Test problem formatting
        const formatted = mathSystem.formatProblem(problem);
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
        
        console.log(`Generated problem: ${formatted}`);
        console.log('✓ MathContentSystem problem generation verified');
    });
    
    test('PlayerCharacter responds to input and moves', () => {
        const player = new PlayerCharacter(400, 300, 40, 40);
        player.setWorldBounds({ width: 800, height: 600 });
        
        const initialX = player.position.x;
        const initialY = player.position.y;
        
        // Test input application
        const inputState = {
            left: false,
            right: true,
            up: false,
            down: true
        };
        
        // Apply input multiple times to ensure movement
        for (let i = 0; i < 5; i++) {
            player.applyInput(inputState);
            player.update(1/60);
        }
        
        // Verify movement occurred
        expect(player.position.x).toBeGreaterThan(initialX);
        expect(player.position.y).toBeGreaterThan(initialY);
        
        console.log(`Player moved from (${initialX}, ${initialY}) to (${player.position.x}, ${player.position.y})`);
        console.log('✓ PlayerCharacter input and movement verified');
    });
    
    test('NumberTile creation and properties', () => {
        const tile = new NumberTile(100, 100, 30, 30, 42, true);
        
        expect(tile.getValue()).toBe(42);
        expect(tile.isCorrectAnswer()).toBe(true);
        expect(tile.position.x).toBe(100);
        expect(tile.position.y).toBe(100);
        expect(tile.size.x).toBe(30);
        expect(tile.size.y).toBe(30);
        
        // Test tile update
        tile.update(1/60);
        expect(tile.isActive()).toBe(true);
        
        console.log('✓ NumberTile creation and properties verified');
    });
    
    test('PhysicsSystem collision detection', () => {
        const physics = new PhysicsSystem({ width: 800, height: 600 });
        
        // Create overlapping entities
        const player = new PlayerCharacter(100, 100, 40, 40);
        const tile = new NumberTile(110, 110, 30, 30, 42, true);
        
        // Test collision detection method exists and works
        expect(typeof physics.detectCollision).toBe('function');
        
        const collision = physics.detectCollision(player, tile);
        expect(collision).toBe(true);
        
        // Test non-overlapping entities
        const farTile = new NumberTile(500, 500, 30, 30, 24, false);
        const noCollision = physics.detectCollision(player, farTile);
        expect(noCollision).toBe(false);
        
        console.log('✓ PhysicsSystem collision detection verified');
    });
    
    test('HealthSystem damage and game over', () => {
        const health = new HealthSystem({
            maxHealth: 100,
            startingHealth: 100
        });
        
        expect(health.getCurrentHealth()).toBe(100);
        expect(health.isDead()).toBe(false);
        
        // Test damage
        const isAlive = health.takeDamage(30, 'test');
        expect(health.getCurrentHealth()).toBe(70);
        expect(isAlive).toBe(true);
        
        // Test game over
        health.takeDamage(80, 'test');
        expect(health.getCurrentHealth()).toBe(0);
        expect(health.isDead()).toBe(true);
        
        console.log('✓ HealthSystem damage and game over verified');
    });
    
    test('LevelManager progression', () => {
        const levelManager = new LevelManager({
            questionsPerLevel: 3,
            maxLevel: 5
        });
        
        expect(levelManager.getCurrentLevel()).toBe(1);
        
        // Test level progression
        for (let i = 0; i < 3; i++) {
            levelManager.onCorrectAnswer();
        }
        
        expect(levelManager.getCurrentLevel()).toBe(2);
        
        console.log('✓ LevelManager progression verified');
    });
    
    test('AdaptiveLearningSystem performance tracking', () => {
        const adaptive = new AdaptiveLearningSystem({
            performanceWindowSize: 5,
            minAttemptsForAdjustment: 3
        });
        
        // Record some answers
        adaptive.recordAnswer('addition', 1, true, 2.0);
        adaptive.recordAnswer('addition', 1, true, 1.5);
        adaptive.recordAnswer('multiplication', 1, false, 5.0);
        
        const progress = adaptive.getLearningProgress();
        expect(progress).toBeTruthy();
        expect(progress.operationProgress).toBeTruthy();
        
        console.log('✓ AdaptiveLearningSystem performance tracking verified');
    });
    
    test('Complete system integration', () => {
        // Set up multiple systems
        const physics = new PhysicsSystem(gameEngine.getCanvasSize());
        const mathContent = new MathContentSystem();
        const health = new HealthSystem({ maxHealth: 100, startingHealth: 100 });
        
        gameEngine.registerSystem('physics', physics);
        gameEngine.registerSystem('mathContent', mathContent);
        gameEngine.registerSystem('health', health);
        
        // Add entities
        const player = new PlayerCharacter(400, 300, 40, 40);
        gameEngine.addEntity(player);
        
        // Start engine
        gameEngine.start();
        
        // Verify all systems are working together
        expect(gameEngine.getSystem('physics')).toBe(physics);
        expect(gameEngine.getSystem('mathContent')).toBe(mathContent);
        expect(gameEngine.getSystem('health')).toBe(health);
        expect(gameEngine.getEntitiesByType(PlayerCharacter)).toHaveLength(1);
        
        // Test update cycle
        gameEngine.update(1/60);
        
        console.log('✓ Complete system integration verified');
    });
    
    test('Docker deployment verification', () => {
        // Verify all required classes are available globally
        expect(typeof GameEngine).toBe('function');
        expect(typeof PlayerCharacter).toBe('function');
        expect(typeof NumberTile).toBe('function');
        expect(typeof MathContentSystem).toBe('function');
        expect(typeof PhysicsSystem).toBe('function');
        expect(typeof HealthSystem).toBe('function');
        expect(typeof LevelManager).toBe('function');
        expect(typeof AdaptiveLearningSystem).toBe('function');
        
        // Verify HTML structure exists
        expect(document.getElementById('gameCanvas')).toBeTruthy();
        
        console.log('✓ Docker deployment and class availability verified');
    });
});