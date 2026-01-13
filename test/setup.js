/**
 * Test setup file for Jest
 * Sets up the DOM environment and global utilities needed for testing
 */

// Import jest-canvas-mock to provide canvas functionality in tests
require('jest-canvas-mock');

// Enable fake timers for testing setTimeout/setInterval
jest.useFakeTimers();

// Mock requestAnimationFrame and cancelAnimationFrame for testing
global.requestAnimationFrame = jest.fn((callback) => {
    return setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
    clearTimeout(id);
});

// Mock performance.now for consistent timing in tests
let mockTime = 0;
global.performance = {
    now: jest.fn(() => {
        mockTime += 16.67; // Simulate ~60fps timing
        return mockTime;
    })
};

// Set up a basic DOM structure for canvas testing
document.body.innerHTML = `
    <canvas id="testCanvas" width="800" height="600"></canvas>
`;

// Load the game modules in the correct order
require('../js/utils/Vector2D.js');
require('../js/core/Entity.js');
require('../js/core/GameEngine.js');
require('../js/systems/InputSystem.js');
require('../js/systems/PhysicsSystem.js');
require('../js/systems/MathContentSystem.js');
require('../js/systems/QuestionDisplaySystem.js');
require('../js/entities/PlayerCharacter.js');
require('../js/entities/NumberTile.js');
require('../js/systems/NumberTileSystem.js');
require('../js/systems/HealthSystem.js');
require('../js/systems/CollisionFeedbackSystem.js');
require('../js/systems/LevelManager.js');
require('../js/systems/AdaptiveLearningSystem.js');
require('../js/systems/ResponsiveSystem.js');