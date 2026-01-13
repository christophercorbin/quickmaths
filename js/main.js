/**
 * Main entry point for the Quick Math Game
 * Initializes the game engine and sets up basic demonstration
 */

// Game engine instance
let gameEngine;
let gameStateManager;
let responsiveSystem;
let inputSystem;
let physicsSystem;
let mathContentSystem;
let questionDisplaySystem;
let numberTileSystem;
let gameLogicSystem;
let scoreSystem;
let healthSystem;
let collisionFeedbackSystem;
let levelManager;
let adaptiveLearningSystem;
let playerCharacter;

/**
 * Initialize the game when the page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Quick Math Game...');
    
    try {
        // Create game engine instance
        gameEngine = new GameEngine('gameCanvas', {
            targetFPS: 60,
            backgroundColor: '#ecf0f1',
            showDebugInfo: true // Enable debug info for development
        });
        
        // Initialize game state manager first
        gameStateManager = new GameStateManager({
            menuBackgroundColor: '#2c3e50',
            menuTextColor: '#ecf0f1'
        });
        gameEngine.registerSystem('gameState', gameStateManager);
        
        console.log('GameStateManager registered, current state:', gameStateManager.getCurrentState());
        
        // Verify the GameStateManager is properly initialized
        console.log('GameStateManager buttons after init:', gameStateManager.buttons ? gameStateManager.buttons.length : 'no buttons property');
        console.log('GameStateManager render method exists:', typeof gameStateManager.render === 'function');
        
        // Initialize responsive system
        responsiveSystem = new ResponsiveSystem({
            baseWidth: 800,
            baseHeight: 600,
            minScale: 0.4,
            maxScale: 2.0,
            enableTouchControls: true
        });
        gameEngine.registerSystem('responsive', responsiveSystem);
        
        // Initialize input system
        inputSystem = new InputSystem(gameEngine.canvas);
        gameEngine.registerSystem('input', inputSystem);
        
        // Initialize physics system
        physicsSystem = new PhysicsSystem(gameEngine.getCanvasSize(), {
            enableSpatialHashing: true,
            cellSize: 64,
            showDebugInfo: true,
            showSpatialGrid: false // Set to true to visualize spatial grid
        });
        gameEngine.registerSystem('physics', physicsSystem);
        
        // Initialize math content system
        mathContentSystem = new MathContentSystem({
            difficultyLevels: {
                1: { min: 1, max: 10, answerOptions: 3 },
                2: { min: 1, max: 20, answerOptions: 4 },
                3: { min: 1, max: 50, answerOptions: 4 },
                4: { min: 1, max: 100, answerOptions: 5 },
                5: { min: 10, max: 200, answerOptions: 5 }
            }
        });
        gameEngine.registerSystem('mathContent', mathContentSystem);
        
        // Initialize question display system
        questionDisplaySystem = new QuestionDisplaySystem({
            fontSize: 28,
            textColor: '#2c3e50',
            backgroundColor: '#ffffff',
            topMargin: 30
        });
        gameEngine.registerSystem('questionDisplay', questionDisplaySystem);
        
        // Initialize number tile system
        numberTileSystem = new NumberTileSystem({
            maxTiles: 4,
            spawnInterval: 3.0,
            spawnMargin: 50,
            speedVariation: 0.3,
            showDebugInfo: true
        });
        gameEngine.registerSystem('numberTile', numberTileSystem);
        
        // Initialize score system
        scoreSystem = new ScoreSystem({
            correctAnswerScore: 10,
            streakBonus: 1,
            maxStreakBonus: 5,
            showScore: true,
            fontSize: 20,
            position: { x: 10, y: 30 }
        });
        gameEngine.registerSystem('score', scoreSystem);
        
        // Initialize health system
        healthSystem = new HealthSystem({
            maxHealth: 100,
            startingHealth: 100,
            showHealthBar: true,
            healthBarWidth: 200,
            healthBarHeight: 20,
            healthBarMargin: 10
        });
        gameEngine.registerSystem('health', healthSystem);
        
        // Initialize collision feedback system
        collisionFeedbackSystem = new CollisionFeedbackSystem({
            correctFeedbackDuration: 800,
            incorrectFeedbackDuration: 1000,
            particleCount: 8,
            enableParticles: true,
            enableScreenShake: true,
            screenShakeIntensity: 5,
            screenShakeDuration: 300
        });
        gameEngine.registerSystem('collisionFeedback', collisionFeedbackSystem);
        
        // Initialize level manager
        levelManager = new LevelManager({
            questionsPerLevel: 5,
            maxLevel: 10,
            messageDisplayDuration: 3000
        });
        gameEngine.registerSystem('levelManager', levelManager);
        
        // Initialize adaptive learning system
        adaptiveLearningSystem = new AdaptiveLearningSystem({
            performanceWindowSize: 10,
            minAttemptsForAdjustment: 5,
            accuracyThresholds: {
                increase: 0.8,
                decrease: 0.5
            },
            responseTimeThresholds: {
                fast: 3.0,
                slow: 8.0
            },
            strugglingThreshold: 0.6,
            masteryThreshold: 0.85
        });
        gameEngine.registerSystem('adaptiveLearning', adaptiveLearningSystem);
        
        // Initialize game logic system
        gameLogicSystem = new GameLogicSystem({
            correctAnswerScore: 10,
            incorrectAnswerPenalty: 10,
            showFeedback: true,
            feedbackDuration: 2000
        });
        gameEngine.registerSystem('gameLogic', gameLogicSystem);
        
        // Register collision callback for demonstration
        // physicsSystem.registerCollisionCallback('demo', handleCollision);
        
        // Create player character (but don't add to engine yet - wait for game start)
        playerCharacter = new PlayerCharacter(100, 100, 40, 40);
        playerCharacter.setWorldBounds(gameEngine.getCanvasSize());
        
        // Make player character globally accessible for GameStateManager
        window.playerCharacter = playerCharacter;
        
        // Don't create test entities or add player yet - let the game state manager handle this
        // createTestEntities();
        
        // Start the game engine
        gameEngine.start();
        
        // The game should start in menu state by default
        console.log('Game started in state:', gameStateManager.getCurrentState());
        
        console.log('Quick Math Game initialized successfully!');
        
        // Add keyboard controls for testing
        setupTestControls();
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Failed to initialize the game. Please check the console for details.');
    }
});

/**
 * Handle collision between entities
 * @param {Entity} entityA - First entity in collision
 * @param {Entity} entityB - Second entity in collision
 */
function handleCollision(entityA, entityB) {
    console.log(`Collision detected between ${entityA.id} and ${entityB.id}`);
    
    // Add visual feedback for collisions
    if (entityA instanceof PlayerCharacter) {
        entityA.color = '#f39c12'; // Change player color on collision
        setTimeout(() => {
            entityA.color = '#e74c3c'; // Reset color after 200ms
        }, 200);
    }
    
    if (entityB instanceof PlayerCharacter) {
        entityB.color = '#f39c12'; // Change player color on collision
        setTimeout(() => {
            entityB.color = '#e74c3c'; // Reset color after 200ms
        }, 200);
    }
}

/**
 * Create test entities to demonstrate the game engine functionality
 */
function createTestEntities() {
    // Create a test entity that moves around
    const testEntity1 = new Entity(100, 100, 50, 50);
    testEntity1.setVelocity(50, 30); // Move right and down slowly
    
    // Override the default render to make it more visible
    testEntity1.renderDefault = function(context) {
        context.fillStyle = '#e74c3c';
        context.strokeStyle = '#c0392b';
        context.lineWidth = 2;
        
        context.fillRect(0, 0, this.size.x, this.size.y);
        context.strokeRect(0, 0, this.size.x, this.size.y);
        
        // Add a label
        context.fillStyle = '#ffffff';
        context.font = '12px Arial';
        context.textAlign = 'center';
        context.fillText('Test 1', this.size.x / 2, this.size.y / 2 - 6);
    };
    
    // Create another test entity with different behavior
    const testEntity2 = new Entity(300, 200, 40, 40);
    testEntity2.setVelocity(-30, 50); // Move left and down
    
    testEntity2.renderDefault = function(context) {
        context.fillStyle = '#2ecc71';
        context.strokeStyle = '#27ae60';
        context.lineWidth = 2;
        
        context.fillRect(0, 0, this.size.x, this.size.y);
        context.strokeRect(0, 0, this.size.x, this.size.y);
        
        // Add a label
        context.fillStyle = '#ffffff';
        context.font = '12px Arial';
        context.textAlign = 'center';
        context.fillText('Test 2', this.size.x / 2, this.size.y / 2 - 6);
    };
    
    // Add boundary bouncing behavior
    const canvasSize = gameEngine.getCanvasSize();
    
    const addBoundaryBouncing = (entity) => {
        const originalUpdate = entity.update.bind(entity);
        entity.update = function(deltaTime) {
            originalUpdate(deltaTime);
            
            // Bounce off boundaries
            if (this.position.x <= 0 || this.position.x + this.size.x >= canvasSize.width) {
                this.velocity.x = -this.velocity.x;
                this.position.x = Math.max(0, Math.min(this.position.x, canvasSize.width - this.size.x));
            }
            
            if (this.position.y <= 0 || this.position.y + this.size.y >= canvasSize.height) {
                this.velocity.y = -this.velocity.y;
                this.position.y = Math.max(0, Math.min(this.position.y, canvasSize.height - this.size.y));
            }
        };
    };
    
    addBoundaryBouncing(testEntity1);
    addBoundaryBouncing(testEntity2);
    
    // Add entities to the game engine
    gameEngine.addEntity(testEntity1);
    gameEngine.addEntity(testEntity2);
    
    console.log('Test entities created and added to game engine');
}

/**
 * Set up keyboard controls for testing the game engine
 */
function setupTestControls() {
    document.addEventListener('keydown', function(event) {
        switch(event.code) {
            case 'Space':
                event.preventDefault();
                const gameStateManager = gameEngine.getSystem('gameState');
                if (gameStateManager) {
                    if (gameStateManager.isPlaying()) {
                        gameStateManager.pauseGame();
                    } else if (gameStateManager.isPaused()) {
                        gameStateManager.resumeGame();
                    }
                } else {
                    // Fallback to old behavior
                    if (gameEngine.isGamePaused()) {
                        gameEngine.resume();
                    } else {
                        gameEngine.pause();
                    }
                }
                break;
                
            case 'KeyR':
                event.preventDefault();
                // Restart by stopping and starting again
                gameEngine.stop();
                setTimeout(() => {
                    gameEngine.start();
                }, 100);
                break;
                
            case 'KeyD':
                event.preventDefault();
                // Toggle debug info
                gameEngine.config.showDebugInfo = !gameEngine.config.showDebugInfo;
                break;
                
            case 'KeyG':
                event.preventDefault();
                // Toggle spatial grid visualization
                if (physicsSystem) {
                    physicsSystem.config.showSpatialGrid = !physicsSystem.config.showSpatialGrid;
                }
                break;
                
            case 'KeyH':
                event.preventDefault();
                // Toggle spatial hashing
                if (physicsSystem) {
                    physicsSystem.setSpatialHashingEnabled(!physicsSystem.config.enableSpatialHashing);
                }
                break;
                
            case 'KeyN':
                event.preventDefault();
                // Generate new question (for testing)
                if (questionDisplaySystem) {
                    questionDisplaySystem.forceNewQuestion();
                }
                break;
                
            case 'KeyC':
                event.preventDefault();
                // Simulate correct answer (for testing)
                if (questionDisplaySystem) {
                    questionDisplaySystem.onCorrectAnswer();
                }
                break;
                
            case 'KeyT':
                event.preventDefault();
                // Force spawn tiles (for testing)
                if (numberTileSystem) {
                    numberTileSystem.forceSpawnTiles();
                }
                break;
                
            case 'KeyL':
                event.preventDefault();
                // Clear all tiles (for testing)
                if (numberTileSystem) {
                    numberTileSystem.clearAllTiles();
                }
                break;
                
            case 'KeyX':
                event.preventDefault();
                // Reset game (for testing)
                if (gameLogicSystem) {
                    gameLogicSystem.resetGame();
                }
                break;
                
            case 'KeyP':
                event.preventDefault();
                // Force level progression (for testing)
                if (levelManager) {
                    levelManager.setLevel(levelManager.getCurrentLevel() + 1);
                }
                break;
                
            case 'KeyM':
                event.preventDefault();
                // Show level stats (for testing)
                if (levelManager) {
                    console.log('Level Stats:', levelManager.getLevelStats());
                }
                break;
                
            case 'KeyA':
                event.preventDefault();
                // Show adaptive learning progress (for testing)
                if (adaptiveLearningSystem) {
                    const progress = adaptiveLearningSystem.getLearningProgress();
                    console.log('=== ADAPTIVE LEARNING PROGRESS ===');
                    console.log('Session Accuracy:', (progress.sessionAccuracy * 100).toFixed(1) + '%');
                    console.log('Total Attempts:', progress.totalAttempts);
                    console.log('Current Focus:', progress.currentFocus || 'None');
                    console.log('Struggling Operations:', progress.strugglingOperations);
                    console.log('Mastered Operations:', progress.masteredOperations);
                    console.log('Operation Progress:');
                    for (const [op, data] of Object.entries(progress.operationProgress)) {
                        console.log(`  ${op}: ${(data.accuracy * 100).toFixed(1)}% accuracy, ${data.averageTime.toFixed(2)}s avg time, difficulty ${data.difficulty}`);
                    }
                }
                break;
        }
    });
    
    console.log('Test controls set up:');
    console.log('- SPACE: Pause/Resume');
    console.log('- R: Restart');
    console.log('- D: Toggle debug info');
    console.log('- G: Toggle spatial grid visualization');
    console.log('- H: Toggle spatial hashing on/off');
    console.log('- N: Generate new question (testing)');
    console.log('- C: Simulate correct answer (testing)');
    console.log('- T: Force spawn tiles (testing)');
    console.log('- L: Clear all tiles (testing)');
    console.log('- X: Reset game (testing)');
    console.log('- P: Force level progression (testing)');
    console.log('- M: Show level stats (testing)');
    console.log('- A: Show adaptive learning progress (testing)');
}

/**
 * Handle window resize to maintain canvas aspect ratio
 */
window.addEventListener('resize', function() {
    // For now, we'll keep the canvas at fixed size
    // In a full implementation, we might want to handle responsive resizing
    console.log('Window resized - canvas remains at fixed size');
});

/**
 * Handle page visibility changes to pause/resume game
 */
document.addEventListener('visibilitychange', function() {
    if (gameEngine) {
        if (document.hidden) {
            gameEngine.pause();
            console.log('Page hidden - game paused');
        } else {
            gameEngine.resume();
            console.log('Page visible - game resumed');
        }
    }
});