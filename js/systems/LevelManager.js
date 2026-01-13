/**
 * LevelManager - Manages level progression and difficulty scaling
 * Handles level transitions, difficulty adjustments, and motivational messaging
 */
class LevelManager {
    constructor(config = {}) {
        this.config = {
            // Level progression settings
            questionsPerLevel: 5, // Questions needed to complete a level
            maxLevel: 10, // Maximum level (infinite progression after this)
            
            // Difficulty scaling per level
            levelConfigs: {
                1: { 
                    difficulty: 1, 
                    maxTiles: 3, 
                    spawnInterval: 3.0, 
                    operations: ['addition'],
                    tileSpeedMultiplier: 1.0
                },
                2: { 
                    difficulty: 1, 
                    maxTiles: 4, 
                    spawnInterval: 2.8, 
                    operations: ['addition', 'subtraction'],
                    tileSpeedMultiplier: 1.1
                },
                3: { 
                    difficulty: 2, 
                    maxTiles: 4, 
                    spawnInterval: 2.5, 
                    operations: ['addition', 'subtraction'],
                    tileSpeedMultiplier: 1.2
                },
                4: { 
                    difficulty: 2, 
                    maxTiles: 5, 
                    spawnInterval: 2.3, 
                    operations: ['addition', 'subtraction', 'multiplication'],
                    tileSpeedMultiplier: 1.3
                },
                5: { 
                    difficulty: 3, 
                    maxTiles: 5, 
                    spawnInterval: 2.0, 
                    operations: ['addition', 'subtraction', 'multiplication'],
                    tileSpeedMultiplier: 1.4
                },
                6: { 
                    difficulty: 3, 
                    maxTiles: 6, 
                    spawnInterval: 1.8, 
                    operations: ['addition', 'subtraction', 'multiplication', 'division'],
                    tileSpeedMultiplier: 1.5
                },
                7: { 
                    difficulty: 4, 
                    maxTiles: 6, 
                    spawnInterval: 1.6, 
                    operations: ['addition', 'subtraction', 'multiplication', 'division'],
                    tileSpeedMultiplier: 1.6
                },
                8: { 
                    difficulty: 4, 
                    maxTiles: 7, 
                    spawnInterval: 1.4, 
                    operations: ['addition', 'subtraction', 'multiplication', 'division'],
                    tileSpeedMultiplier: 1.7
                },
                9: { 
                    difficulty: 5, 
                    maxTiles: 7, 
                    spawnInterval: 1.2, 
                    operations: ['addition', 'subtraction', 'multiplication', 'division'],
                    tileSpeedMultiplier: 1.8
                },
                10: { 
                    difficulty: 5, 
                    maxTiles: 8, 
                    spawnInterval: 1.0, 
                    operations: ['addition', 'subtraction', 'multiplication', 'division'],
                    tileSpeedMultiplier: 2.0
                }
            },
            
            // Motivational messages
            levelCompleteMessages: [
                "Great job! Level {level} complete!",
                "Excellent work! Moving to level {level}!",
                "Outstanding! You've reached level {level}!",
                "Fantastic! Level {level} unlocked!",
                "Amazing progress! Welcome to level {level}!",
                "Superb! You're now on level {level}!",
                "Incredible! Level {level} achieved!",
                "Brilliant! Advancing to level {level}!",
                "Wonderful! You've mastered level {level}!",
                "Perfect! Level {level} is yours!"
            ],
            
            // Message display settings
            messageDisplayDuration: 3000, // milliseconds
            messageColor: '#f39c12',
            messageFontSize: 32,
            
            ...config
        };
        
        // Current state
        this.currentLevel = 1;
        this.questionsAnsweredThisLevel = 0;
        this.totalQuestionsAnswered = 0;
        this.isLevelComplete = false;
        
        // Message system
        this.currentMessage = null;
        this.messageStartTime = 0;
        
        // System references
        this.gameEngine = null;
        this.mathContentSystem = null;
        this.numberTileSystem = null;
        this.scoreSystem = null;
        
        console.log('LevelManager initialized with config:', this.config);
    }
    
    /**
     * Initialize the system with the game engine
     * @param {GameEngine} gameEngine - The game engine instance
     */
    init(gameEngine) {
        this.gameEngine = gameEngine;
        
        // Get references to other systems
        this.mathContentSystem = gameEngine.getSystem('mathContent');
        this.numberTileSystem = gameEngine.getSystem('numberTile');
        this.scoreSystem = gameEngine.getSystem('score');
        
        // Apply initial level configuration
        this.applyLevelConfiguration(this.currentLevel);
        
        console.log('LevelManager initialized with game engine');
    }
    
    /**
     * Record a correct answer and check for level progression
     */
    onCorrectAnswer() {
        this.questionsAnsweredThisLevel++;
        this.totalQuestionsAnswered++;
        
        console.log(`Correct answer recorded: ${this.questionsAnsweredThisLevel}/${this.config.questionsPerLevel} for level ${this.currentLevel}`);
        
        // Check if level is complete
        if (this.questionsAnsweredThisLevel >= this.config.questionsPerLevel) {
            this.completeLevel();
        }
    }
    
    /**
     * Complete the current level and advance to the next
     */
    completeLevel() {
        this.isLevelComplete = true;
        const completedLevel = this.currentLevel;
        
        // Advance to next level
        this.currentLevel++;
        this.questionsAnsweredThisLevel = 0;
        
        // Show motivational message
        this.showLevelCompleteMessage(this.currentLevel);
        
        // Apply new level configuration after a brief delay
        setTimeout(() => {
            this.applyLevelConfiguration(this.currentLevel);
            this.isLevelComplete = false;
        }, 1000);
        
        console.log(`Level ${completedLevel} completed! Advanced to level ${this.currentLevel}`);
        
        // Notify score system of level completion for potential bonus
        if (this.scoreSystem && this.scoreSystem.onLevelComplete) {
            this.scoreSystem.onLevelComplete(completedLevel);
        }
    }
    
    /**
     * Apply configuration for the specified level
     * @param {number} level - The level to configure for
     */
    applyLevelConfiguration(level) {
        const levelConfig = this.getLevelConfig(level);
        
        // Update math content system difficulty
        if (this.mathContentSystem) {
            this.mathContentSystem.setDifficulty(levelConfig.difficulty);
            
            // Set allowed operations for this level
            this.setAllowedOperations(levelConfig.operations);
        }
        
        // Update number tile system settings
        if (this.numberTileSystem) {
            this.numberTileSystem.setMaxTiles(levelConfig.maxTiles);
            this.numberTileSystem.setSpawnInterval(levelConfig.spawnInterval);
            
            // Update tile speed multiplier
            this.numberTileSystem.config.levelSpeedMultiplier = levelConfig.tileSpeedMultiplier;
        }
        
        console.log(`Applied level ${level} configuration:`, levelConfig);
    }
    
    /**
     * Get configuration for the specified level
     * @param {number} level - The level to get configuration for
     * @returns {Object} Level configuration object
     */
    getLevelConfig(level) {
        // Use specific config if available, otherwise extrapolate from max level
        if (this.config.levelConfigs[level]) {
            return this.config.levelConfigs[level];
        }
        
        // For levels beyond maxLevel, extrapolate based on the pattern
        const maxLevelConfig = this.config.levelConfigs[this.config.maxLevel];
        const extraLevels = level - this.config.maxLevel;
        
        return {
            difficulty: Math.min(5, maxLevelConfig.difficulty + Math.floor(extraLevels / 2)),
            maxTiles: Math.min(10, maxLevelConfig.maxTiles + Math.floor(extraLevels / 3)),
            spawnInterval: Math.max(0.5, maxLevelConfig.spawnInterval - (extraLevels * 0.1)),
            operations: maxLevelConfig.operations, // Keep all operations for high levels
            tileSpeedMultiplier: maxLevelConfig.tileSpeedMultiplier + (extraLevels * 0.1)
        };
    }
    
    /**
     * Set allowed operations for the math content system
     * @param {Array} operations - Array of operation names to allow
     */
    setAllowedOperations(operations) {
        if (!this.mathContentSystem || !this.mathContentSystem.config) return;
        
        // Enable/disable operations based on level
        const allOperations = ['addition', 'subtraction', 'multiplication', 'division'];
        
        for (const operation of allOperations) {
            if (this.mathContentSystem.config.operations[operation]) {
                this.mathContentSystem.config.operations[operation].enabled = operations.includes(operation);
            }
        }
        
        console.log(`Allowed operations for level ${this.currentLevel}:`, operations);
    }
    
    /**
     * Show a motivational message for level completion
     * @param {number} newLevel - The new level that was reached
     */
    showLevelCompleteMessage(newLevel) {
        const messages = this.config.levelCompleteMessages;
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        this.currentMessage = randomMessage.replace('{level}', newLevel.toString());
        this.messageStartTime = Date.now();
        
        console.log(`Showing level complete message: ${this.currentMessage}`);
    }
    
    /**
     * Get the current level
     * @returns {number} Current level number
     */
    getCurrentLevel() {
        return this.currentLevel;
    }
    
    /**
     * Get progress in the current level
     * @returns {Object} Object with current progress and total needed
     */
    getLevelProgress() {
        return {
            current: this.questionsAnsweredThisLevel,
            total: this.config.questionsPerLevel,
            percentage: (this.questionsAnsweredThisLevel / this.config.questionsPerLevel) * 100
        };
    }
    
    /**
     * Get total questions answered across all levels
     * @returns {number} Total questions answered
     */
    getTotalQuestionsAnswered() {
        return this.totalQuestionsAnswered;
    }
    
    /**
     * Check if a level transition is currently happening
     * @returns {boolean} True if level is being completed
     */
    isLevelTransition() {
        return this.isLevelComplete;
    }
    
    /**
     * Reset the level manager to initial state
     */
    reset() {
        this.currentLevel = 1;
        this.questionsAnsweredThisLevel = 0;
        this.totalQuestionsAnswered = 0;
        this.isLevelComplete = false;
        this.currentMessage = null;
        this.messageStartTime = 0;
        
        // Apply initial level configuration
        this.applyLevelConfiguration(this.currentLevel);
        
        console.log('LevelManager reset to initial state');
    }
    
    /**
     * Force advance to a specific level (for testing)
     * @param {number} level - Level to advance to
     */
    setLevel(level) {
        if (level < 1) {
            console.warn('Level must be at least 1');
            return;
        }
        
        this.currentLevel = level;
        this.questionsAnsweredThisLevel = 0;
        this.applyLevelConfiguration(level);
        
        console.log(`Forced level change to ${level}`);
    }
    
    /**
     * Get statistics about level progression
     * @returns {Object} Level statistics
     */
    getLevelStats() {
        const progress = this.getLevelProgress();
        const levelConfig = this.getLevelConfig(this.currentLevel);
        
        return {
            currentLevel: this.currentLevel,
            questionsThisLevel: this.questionsAnsweredThisLevel,
            questionsNeeded: this.config.questionsPerLevel,
            progressPercentage: progress.percentage,
            totalQuestions: this.totalQuestionsAnswered,
            difficulty: levelConfig.difficulty,
            maxTiles: levelConfig.maxTiles,
            operations: levelConfig.operations,
            isTransitioning: this.isLevelComplete
        };
    }
    
    /**
     * Update the level manager
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        // Update message display
        if (this.currentMessage) {
            const elapsed = Date.now() - this.messageStartTime;
            if (elapsed >= this.config.messageDisplayDuration) {
                this.currentMessage = null;
            }
        }
    }
    
    /**
     * Render level information and messages
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    render(context) {
        this.renderLevelInfo(context);
        this.renderLevelCompleteMessage(context);
    }
    
    /**
     * Render current level information
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    renderLevelInfo(context) {
        const canvasSize = this.gameEngine.getCanvasSize();
        const progress = this.getLevelProgress();
        
        // Render level number
        context.fillStyle = '#2c3e50';
        context.font = 'bold 18px Arial';
        context.textAlign = 'right';
        context.fillText(`Level ${this.currentLevel}`, canvasSize.width - 10, 25);
        
        // Render progress bar
        const barWidth = 150;
        const barHeight = 8;
        const barX = canvasSize.width - barWidth - 10;
        const barY = 35;
        
        // Background
        context.fillStyle = '#ecf0f1';
        context.fillRect(barX, barY, barWidth, barHeight);
        
        // Progress fill
        const fillWidth = (progress.current / progress.total) * barWidth;
        context.fillStyle = '#3498db';
        context.fillRect(barX, barY, fillWidth, barHeight);
        
        // Border
        context.strokeStyle = '#2c3e50';
        context.lineWidth = 1;
        context.strokeRect(barX, barY, barWidth, barHeight);
        
        // Progress text
        context.fillStyle = '#2c3e50';
        context.font = '12px Arial';
        context.textAlign = 'center';
        context.fillText(
            `${progress.current}/${progress.total}`, 
            barX + barWidth / 2, 
            barY + barHeight + 15
        );
    }
    
    /**
     * Render level complete message
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    renderLevelCompleteMessage(context) {
        if (!this.currentMessage) return;
        
        const canvasSize = this.gameEngine.getCanvasSize();
        const elapsed = Date.now() - this.messageStartTime;
        const alpha = Math.max(0, 1 - (elapsed / this.config.messageDisplayDuration));
        
        // Create semi-transparent background
        context.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
        context.fillRect(0, 0, canvasSize.width, canvasSize.height);
        
        // Render message
        context.fillStyle = this.config.messageColor;
        context.font = `bold ${this.config.messageFontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Add text shadow for better visibility
        context.shadowColor = 'rgba(0, 0, 0, 0.5)';
        context.shadowBlur = 4;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        
        context.fillText(
            this.currentMessage, 
            canvasSize.width / 2, 
            canvasSize.height / 2
        );
        
        // Reset shadow
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        
        // Reset text baseline
        context.textBaseline = 'top';
    }
}

// Make LevelManager available globally
window.LevelManager = LevelManager;