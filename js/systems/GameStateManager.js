/**
 * GameStateManager - Manages different game states and transitions
 * Handles menu, playing, paused, and game over states with UI updates
 */
class GameStateManager {
    constructor(config = {}) {
        this.config = {
            menuBackgroundColor: '#2c3e50',
            menuTextColor: '#ecf0f1',
            gameOverBackgroundColor: 'rgba(0, 0, 0, 0.8)',
            gameOverTextColor: '#ecf0f1',
            pauseBackgroundColor: 'rgba(0, 0, 0, 0.6)',
            pauseTextColor: '#ecf0f1',
            fontSize: {
                title: 48,
                subtitle: 24,
                button: 20,
                score: 32
            },
            buttonPadding: 20,
            buttonMargin: 15,
            ...config
        };
        
        // Game states
        this.states = {
            MENU: 'menu',
            INSTRUCTIONS: 'instructions',
            PLAYING: 'playing',
            PAUSED: 'paused',
            GAME_OVER: 'gameOver'
        };
        
        this.currentState = this.states.MENU;
        this.previousState = null;
        
        // Game engine reference
        this.gameEngine = null;
        
        // UI elements and interaction
        this.buttons = [];
        this.selectedButtonIndex = 0;
        
        // Game over data
        this.finalScore = 0;
        this.finalLevel = 1;
        this.performanceSummary = null;
        
        console.log('GameStateManager initialized');
    }
    
    /**
     * Initialize the system with game engine reference
     * @param {GameEngine} gameEngine - The game engine instance
     */
    init(gameEngine) {
        console.log('GameStateManager.init() called with gameEngine:', !!gameEngine);
        this.gameEngine = gameEngine;
        
        // Set up input handlers for state management
        this.setupInputHandlers();
        
        // Set up initial menu state
        console.log('Setting up initial menu state...');
        this.onStateEnter(this.currentState);
        
        console.log('GameStateManager initialized with game engine, buttons:', this.buttons.length);
    }
    
    /**
     * Set up input handlers for menu navigation and state transitions
     */
    setupInputHandlers() {
        if (!this.gameEngine) return;
        
        const inputSystem = this.gameEngine.getSystem('input');
        if (!inputSystem) return;
        
        // Add keyboard event listeners for menu navigation
        document.addEventListener('keydown', (event) => {
            this.handleKeyInput(event);
        });
        
        // Add mouse/touch event listeners for button clicks
        this.gameEngine.canvas.addEventListener('click', (event) => {
            this.handleMouseClick(event);
        });
        
        this.gameEngine.canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            const mouseEvent = new MouseEvent('click', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseClick(mouseEvent);
        });
    }
    
    /**
     * Handle keyboard input for menu navigation and state transitions
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyInput(event) {
        switch (this.currentState) {
            case this.states.MENU:
                this.handleMenuInput(event);
                break;
            case this.states.INSTRUCTIONS:
                this.handleInstructionsInput(event);
                break;
            case this.states.PLAYING:
                this.handlePlayingInput(event);
                break;
            case this.states.PAUSED:
                this.handlePausedInput(event);
                break;
            case this.states.GAME_OVER:
                this.handleGameOverInput(event);
                break;
        }
    }
    
    /**
     * Handle input in menu state
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleMenuInput(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                event.preventDefault();
                this.selectedButtonIndex = Math.max(0, this.selectedButtonIndex - 1);
                break;
            case 'ArrowDown':
            case 'KeyS':
                event.preventDefault();
                this.selectedButtonIndex = Math.min(this.buttons.length - 1, this.selectedButtonIndex + 1);
                break;
            case 'Enter':
            case 'Space':
                event.preventDefault();
                this.activateSelectedButton();
                break;
        }
    }
    
    /**
     * Handle input in instructions state
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleInstructionsInput(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                event.preventDefault();
                this.selectedButtonIndex = Math.max(0, this.selectedButtonIndex - 1);
                break;
            case 'ArrowDown':
            case 'KeyS':
                event.preventDefault();
                this.selectedButtonIndex = Math.min(this.buttons.length - 1, this.selectedButtonIndex + 1);
                break;
            case 'Enter':
            case 'Space':
                event.preventDefault();
                this.activateSelectedButton();
                break;
            case 'Escape':
            case 'KeyM':
                event.preventDefault();
                this.returnToMenu();
                break;
        }
    }
    
    /**
     * Handle input in playing state
     * @param {KeyboardEvent} event - The keyboard event
     */
    handlePlayingInput(event) {
        switch (event.code) {
            case 'Escape':
            case 'KeyP':
                event.preventDefault();
                this.pauseGame();
                break;
        }
    }
    
    /**
     * Handle input in paused state
     * @param {KeyboardEvent} event - The keyboard event
     */
    handlePausedInput(event) {
        switch (event.code) {
            case 'Escape':
            case 'KeyP':
            case 'Space':
                event.preventDefault();
                this.resumeGame();
                break;
            case 'KeyM':
                event.preventDefault();
                this.returnToMenu();
                break;
        }
    }
    
    /**
     * Handle input in game over state
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleGameOverInput(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                event.preventDefault();
                this.selectedButtonIndex = Math.max(0, this.selectedButtonIndex - 1);
                break;
            case 'ArrowDown':
            case 'KeyS':
                event.preventDefault();
                this.selectedButtonIndex = Math.min(this.buttons.length - 1, this.selectedButtonIndex + 1);
                break;
            case 'Enter':
            case 'Space':
                event.preventDefault();
                this.activateSelectedButton();
                break;
            case 'KeyR':
                event.preventDefault();
                this.startNewGame();
                break;
            case 'KeyM':
                event.preventDefault();
                this.returnToMenu();
                break;
        }
    }
    
    /**
     * Handle mouse clicks on buttons
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseClick(event) {
        // Get proper canvas coordinates using responsive system
        let canvasPos;
        const responsiveSystem = this.gameEngine ? this.gameEngine.getSystem('responsive') : null;
        
        if (responsiveSystem) {
            canvasPos = responsiveSystem.screenToCanvas(event.clientX, event.clientY);
        } else {
            // Fallback to basic conversion
            const rect = this.gameEngine.canvas.getBoundingClientRect();
            canvasPos = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        }
        
        // Check if click is on any button
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (canvasPos.x >= button.x && canvasPos.x <= button.x + button.width &&
                canvasPos.y >= button.y && canvasPos.y <= button.y + button.height) {
                this.selectedButtonIndex = i;
                this.activateSelectedButton();
                break;
            }
        }
    }
    
    /**
     * Activate the currently selected button
     */
    activateSelectedButton() {
        if (this.buttons.length === 0) return;
        
        const button = this.buttons[this.selectedButtonIndex];
        if (button && button.action) {
            button.action();
        }
    }
    
    /**
     * Change to a new game state
     * @param {string} newState - The new state to transition to
     */
    setState(newState) {
        if (!Object.values(this.states).includes(newState)) {
            console.warn(`Invalid state: ${newState}`);
            return;
        }
        
        this.previousState = this.currentState;
        this.currentState = newState;
        
        // Update game engine state
        if (this.gameEngine) {
            this.gameEngine.setState(newState);
        }
        
        // Handle state-specific setup
        this.onStateEnter(newState);
        
        console.log(`State changed: ${this.previousState} -> ${newState}`);
    }
    
    /**
     * Handle entering a new state
     * @param {string} state - The state being entered
     */
    onStateEnter(state) {
        console.log(`GameStateManager entering state: ${state}`);
        this.buttons = [];
        this.selectedButtonIndex = 0;
        
        switch (state) {
            case this.states.MENU:
                console.log('Setting up menu state...');
                this.setupMenuButtons();
                if (this.gameEngine) {
                    this.gameEngine.pause();
                }
                console.log('Menu state setup complete, buttons:', this.buttons.length);
                break;
            case this.states.INSTRUCTIONS:
                console.log('Setting up instructions state...');
                this.setupInstructionsButtons();
                if (this.gameEngine) {
                    this.gameEngine.pause();
                }
                break;
            case this.states.PLAYING:
                console.log('Setting up playing state...');
                if (this.gameEngine) {
                    this.gameEngine.resume();
                }
                break;
            case this.states.PAUSED:
                console.log('Setting up paused state...');
                this.setupPauseButtons();
                if (this.gameEngine) {
                    this.gameEngine.pause();
                }
                break;
            case this.states.GAME_OVER:
                console.log('Setting up game over state...');
                this.setupGameOverButtons();
                if (this.gameEngine) {
                    this.gameEngine.pause();
                }
                break;
        }
    }
    
    /**
     * Set up menu buttons
     */
    setupMenuButtons() {
        const canvasSize = this.gameEngine ? this.gameEngine.getCanvasSize() : { width: 800, height: 600 };
        const centerX = canvasSize.width / 2;
        const startY = canvasSize.height / 2 + 50; // Move buttons down a bit more
        
        this.buttons = [
            {
                text: 'Start Game',
                x: centerX - 120, // Make buttons wider
                y: startY,
                width: 240,
                height: 60, // Make buttons taller
                action: () => this.startNewGame()
            },
            {
                text: 'Instructions',
                x: centerX - 120,
                y: startY + 80, // More spacing between buttons
                width: 240,
                height: 60,
                action: () => this.showInstructions()
            }
        ];
        
        console.log('Menu buttons set up:', this.buttons.length, 'buttons at canvas size:', canvasSize);
        console.log('Button positions:', this.buttons.map(b => `"${b.text}" at (${b.x}, ${b.y}) size ${b.width}x${b.height}`));
    }
    
    /**
     * Set up pause menu buttons
     */
    setupPauseButtons() {
        const canvasSize = this.gameEngine ? this.gameEngine.getCanvasSize() : { width: 800, height: 600 };
        const centerX = canvasSize.width / 2;
        const startY = canvasSize.height / 2;
        
        this.buttons = [
            {
                text: 'Resume',
                x: centerX - 100,
                y: startY,
                width: 200,
                height: 50,
                action: () => this.resumeGame()
            },
            {
                text: 'Return to Menu',
                x: centerX - 100,
                y: startY + 70,
                width: 200,
                height: 50,
                action: () => this.returnToMenu()
            }
        ];
    }
    
    /**
     * Set up instructions screen buttons
     */
    setupInstructionsButtons() {
        const canvasSize = this.gameEngine ? this.gameEngine.getCanvasSize() : { width: 800, height: 600 };
        const centerX = canvasSize.width / 2;
        const startY = canvasSize.height - 120;
        
        this.buttons = [
            {
                text: 'Start Game',
                x: centerX - 120,
                y: startY,
                width: 240,
                height: 60,
                action: () => this.startNewGame()
            },
            {
                text: 'Back to Menu',
                x: centerX - 120,
                y: startY + 80,
                width: 240,
                height: 60,
                action: () => this.returnToMenu()
            }
        ];
    }
    
    /**
     * Set up game over buttons
     */
    setupGameOverButtons() {
        const canvasSize = this.gameEngine ? this.gameEngine.getCanvasSize() : { width: 800, height: 600 };
        const centerX = canvasSize.width / 2;
        const startY = canvasSize.height / 2 + 100;
        
        this.buttons = [
            {
                text: 'Play Again',
                x: centerX - 100,
                y: startY,
                width: 200,
                height: 50,
                action: () => this.startNewGame()
            },
            {
                text: 'Return to Menu',
                x: centerX - 100,
                y: startY + 70,
                width: 200,
                height: 50,
                action: () => this.returnToMenu()
            }
        ];
    }
    
    /**
     * Start a new game
     */
    startNewGame() {
        // Reset all game systems
        if (this.gameEngine) {
            const scoreSystem = this.gameEngine.getSystem('score');
            const healthSystem = this.gameEngine.getSystem('health');
            const levelManager = this.gameEngine.getSystem('levelManager');
            const gameLogicSystem = this.gameEngine.getSystem('gameLogic');
            const adaptiveLearningSystem = this.gameEngine.getSystem('adaptiveLearning');
            
            if (scoreSystem) scoreSystem.resetScore();
            if (healthSystem) healthSystem.resetHealth();
            if (levelManager) levelManager.resetToLevel(1);
            if (gameLogicSystem) gameLogicSystem.resetGame();
            if (adaptiveLearningSystem) adaptiveLearningSystem.startNewSession();
            
            // Add player character to the game when starting
            if (window.playerCharacter && this.gameEngine.getEntitiesByType(PlayerCharacter).length === 0) {
                this.gameEngine.addEntity(window.playerCharacter);
            }
        }
        
        this.setState(this.states.PLAYING);
    }
    
    /**
     * Pause the current game
     */
    pauseGame() {
        if (this.currentState === this.states.PLAYING) {
            this.setState(this.states.PAUSED);
        }
    }
    
    /**
     * Resume the paused game
     */
    resumeGame() {
        if (this.currentState === this.states.PAUSED) {
            this.setState(this.states.PLAYING);
        }
    }
    
    /**
     * Return to the main menu
     */
    returnToMenu() {
        this.setState(this.states.MENU);
    }
    
    /**
     * Trigger game over state
     * @param {number} finalScore - The final score achieved
     * @param {number} finalLevel - The final level reached
     * @param {Object} performanceSummary - Performance data summary
     */
    gameOver(finalScore = 0, finalLevel = 1, performanceSummary = null) {
        this.finalScore = finalScore;
        this.finalLevel = finalLevel;
        this.performanceSummary = performanceSummary;
        
        this.setState(this.states.GAME_OVER);
    }
    
    /**
     * Show instructions (placeholder for now)
     */
    showInstructions() {
        // Change to instructions state to show instruction screen
        this.setState(this.states.INSTRUCTIONS);
    }
    
    /**
     * Get the current game state
     * @returns {string} The current state
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Check if the game is in a playable state
     * @returns {boolean} True if game is in playing state
     */
    isPlaying() {
        return this.currentState === this.states.PLAYING;
    }
    
    /**
     * Check if the game is paused
     * @returns {boolean} True if game is paused
     */
    isPaused() {
        return this.currentState === this.states.PAUSED;
    }
    
    /**
     * Check if the game is in menu
     * @returns {boolean} True if game is in menu
     */
    isInMenu() {
        return this.currentState === this.states.MENU;
    }
    
    /**
     * Check if the game is over
     * @returns {boolean} True if game is over
     */
    isGameOver() {
        return this.currentState === this.states.GAME_OVER;
    }
    
    /**
     * Update method (called by game engine)
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // State-specific update logic can go here
        // For now, most state logic is handled by input events
    }
    
    /**
     * Render the current state UI
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    render(context) {
        console.log('GameStateManager render called, state:', this.currentState, 'buttons:', this.buttons.length);
        
        switch (this.currentState) {
            case this.states.MENU:
                this.renderMenu(context);
                break;
            case this.states.INSTRUCTIONS:
                this.renderInstructions(context);
                break;
            case this.states.PAUSED:
                this.renderPauseOverlay(context);
                break;
            case this.states.GAME_OVER:
                this.renderGameOver(context);
                break;
            // PLAYING state doesn't need overlay rendering
        }
    }
    
    /**
     * Render the main menu
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    renderMenu(context) {
        const canvasSize = this.gameEngine ? this.gameEngine.getCanvasSize() : { width: 800, height: 600 };
        
        console.log('renderMenu called with canvas size:', canvasSize);
        
        // Clear canvas with menu background - use a darker, more contrasting color
        context.fillStyle = '#1a252f';
        context.fillRect(0, 0, canvasSize.width, canvasSize.height);
        
        // Render title with better positioning
        context.fillStyle = '#ecf0f1';
        context.font = `bold ${this.config.fontSize.title}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('Quick Math Game', canvasSize.width / 2, 120);
        
        // Render subtitle
        context.font = `${this.config.fontSize.subtitle}px Arial`;
        context.fillStyle = '#bdc3c7';
        context.fillText('Improve your arithmetic skills!', canvasSize.width / 2, 170);
        
        // Render buttons with better spacing
        this.renderButtons(context);
        
        // Render instructions at bottom
        context.font = '18px Arial';
        context.fillStyle = '#95a5a6';
        context.fillText('Use arrow keys to navigate, Enter to select', canvasSize.width / 2, canvasSize.height - 40);
        
        console.log('Menu rendered with', this.buttons.length, 'buttons at canvas size:', canvasSize);
    }
    
    /**
     * Render the instructions screen
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    renderInstructions(context) {
        const canvasSize = this.gameEngine ? this.gameEngine.getCanvasSize() : { width: 800, height: 600 };
        
        // Clear canvas with dark background
        context.fillStyle = '#1a252f';
        context.fillRect(0, 0, canvasSize.width, canvasSize.height);
        
        // Render title
        context.fillStyle = '#ecf0f1';
        context.font = `bold ${this.config.fontSize.title}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('How to Play', canvasSize.width / 2, 80);
        
        // Render instructions
        context.font = '22px Arial';
        context.fillStyle = '#ecf0f1';
        const instructions = [
            '🎮 Use Arrow Keys or WASD to move your character',
            '',
            '✅ Collide with the correct answer to math problems',
            '',
            '❌ Avoid wrong answers or you will lose health',
            '',
            '⏸️  Press P or ESC to pause during gameplay',
            '',
            '📈 Progress through levels for increasing difficulty',
            '',
            '🎯 Try to reach higher levels and beat your score!'
        ];
        
        let yOffset = 160;
        instructions.forEach(line => {
            context.fillText(line, canvasSize.width / 2, yOffset);
            yOffset += 35;
        });
        
        // Render buttons
        this.renderButtons(context);
        
        // Render navigation hint
        context.font = '18px Arial';
        context.fillStyle = '#95a5a6';
        context.fillText('Press ESC or M to return to menu', canvasSize.width / 2, canvasSize.height - 40);
    }
    
    /**
     * Render the pause overlay
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    renderPauseOverlay(context) {
        const canvasSize = this.gameEngine ? this.gameEngine.getCanvasSize() : { width: 800, height: 600 };
        
        // Semi-transparent overlay
        context.fillStyle = this.config.pauseBackgroundColor;
        context.fillRect(0, 0, canvasSize.width, canvasSize.height);
        
        // Render pause title
        context.fillStyle = this.config.pauseTextColor;
        context.font = `${this.config.fontSize.title}px Arial`;
        context.textAlign = 'center';
        context.fillText('PAUSED', canvasSize.width / 2, 200);
        
        // Render buttons
        this.renderButtons(context);
        
        // Render instructions
        context.font = '16px Arial';
        context.fillStyle = '#bdc3c7';
        context.fillText('Press P or ESC to resume, M for menu', canvasSize.width / 2, canvasSize.height - 50);
    }
    
    /**
     * Render the game over screen
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    renderGameOver(context) {
        const canvasSize = this.gameEngine ? this.gameEngine.getCanvasSize() : { width: 800, height: 600 };
        
        // Semi-transparent overlay
        context.fillStyle = this.config.gameOverBackgroundColor;
        context.fillRect(0, 0, canvasSize.width, canvasSize.height);
        
        // Render game over title
        context.fillStyle = this.config.gameOverTextColor;
        context.font = `${this.config.fontSize.title}px Arial`;
        context.textAlign = 'center';
        context.fillText('GAME OVER', canvasSize.width / 2, 150);
        
        // Render final score
        context.font = `${this.config.fontSize.score}px Arial`;
        context.fillText(`Final Score: ${this.finalScore}`, canvasSize.width / 2, 220);
        context.fillText(`Level Reached: ${this.finalLevel}`, canvasSize.width / 2, 260);
        
        // Render performance summary if available
        if (this.performanceSummary) {
            context.font = '20px Arial';
            const summary = this.performanceSummary;
            let yOffset = 300;
            
            if (summary.totalQuestions !== undefined) {
                context.fillText(`Questions Answered: ${summary.totalQuestions}`, canvasSize.width / 2, yOffset);
                yOffset += 30;
            }
            
            if (summary.accuracy !== undefined) {
                context.fillText(`Accuracy: ${(summary.accuracy * 100).toFixed(1)}%`, canvasSize.width / 2, yOffset);
                yOffset += 30;
            }
            
            if (summary.averageTime !== undefined) {
                context.fillText(`Average Time: ${summary.averageTime.toFixed(1)}s`, canvasSize.width / 2, yOffset);
                yOffset += 30;
            }
        }
        
        // Render buttons
        this.renderButtons(context);
        
        // Render instructions
        context.font = '16px Arial';
        context.fillStyle = '#bdc3c7';
        context.fillText('Press R to play again, M for menu', canvasSize.width / 2, canvasSize.height - 50);
    }
    
    /**
     * Render buttons for the current state
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    renderButtons(context) {
        console.log('renderButtons called with', this.buttons.length, 'buttons');
        
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            const isSelected = i === this.selectedButtonIndex;
            
            console.log(`Rendering button ${i}: "${button.text}" at (${button.x}, ${button.y}) size ${button.width}x${button.height}`);
            
            // Button background - make it much more visible with bright colors
            context.fillStyle = isSelected ? '#e74c3c' : '#3498db';
            context.fillRect(button.x, button.y, button.width, button.height);
            console.log(`Button ${i} background drawn with color:`, context.fillStyle);
            
            // Button border - make it very thick and contrasting
            context.strokeStyle = isSelected ? '#c0392b' : '#2980b9';
            context.lineWidth = 4;
            context.strokeRect(button.x, button.y, button.width, button.height);
            console.log(`Button ${i} border drawn with color:`, context.strokeStyle);
            
            // Button text - make it much larger and more visible
            context.fillStyle = '#ffffff';
            context.font = `bold ${this.config.fontSize.button + 8}px Arial`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(
                button.text,
                button.x + button.width / 2,
                button.y + button.height / 2
            );
            console.log(`Button ${i} text "${button.text}" drawn at center (${button.x + button.width / 2}, ${button.y + button.height / 2})`);
        }
        
        console.log('renderButtons completed');
    }
}

// Make GameStateManager available globally
window.GameStateManager = GameStateManager;