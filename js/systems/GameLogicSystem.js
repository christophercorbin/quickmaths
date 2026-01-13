/**
 * GameLogicSystem - Handles game logic including collision responses, scoring, and game state
 * Manages the interaction between player, tiles, and math problems
 */
class GameLogicSystem {
    constructor(config = {}) {
        this.config = {
            correctAnswerScore: 10,
            incorrectAnswerPenalty: 1,
            showFeedback: true,
            feedbackDuration: 1000, // milliseconds
            ...config
        };
        
        // System references
        this.gameEngine = null;
        this.mathContentSystem = null;
        this.numberTileSystem = null;
        this.questionDisplaySystem = null;
        this.scoreSystem = null;
        this.healthSystem = null;
        this.levelManager = null;
        this.adaptiveLearningSystem = null;
        
        // Feedback system
        this.feedbackMessages = [];
        
        // Performance tracking
        this.currentQuestionStartTime = null;
        
        console.log('GameLogicSystem initialized with config:', this.config);
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
        this.questionDisplaySystem = gameEngine.getSystem('questionDisplay');
        this.scoreSystem = gameEngine.getSystem('score');
        this.healthSystem = gameEngine.getSystem('health');
        this.levelManager = gameEngine.getSystem('levelManager');
        this.adaptiveLearningSystem = gameEngine.getSystem('adaptiveLearning');
        
        // Register collision callback for player-tile interactions
        const physicsSystem = gameEngine.getSystem('physics');
        if (physicsSystem) {
            physicsSystem.registerCollisionCallback('gameLogic', this.handleCollision.bind(this));
        }
        
        console.log('GameLogicSystem initialized with game engine');
    }
    
    /**
     * Handle collision between entities
     * @param {Entity} entityA - First entity in collision
     * @param {Entity} entityB - Second entity in collision
     */
    handleCollision(entityA, entityB) {
        // Check if this is a player-tile collision
        let player = null;
        let tile = null;
        
        if (entityA instanceof PlayerCharacter && entityB instanceof NumberTile) {
            player = entityA;
            tile = entityB;
        } else if (entityB instanceof PlayerCharacter && entityA instanceof NumberTile) {
            player = entityB;
            tile = entityA;
        }
        
        // If we have a player-tile collision, handle it
        if (player && tile) {
            this.handlePlayerTileCollision(player, tile);
        }
    }
    
    /**
     * Handle collision between player and number tile
     * @param {PlayerCharacter} player - The player character
     * @param {NumberTile} tile - The number tile
     */
    handlePlayerTileCollision(player, tile) {
        // Don't process collision if tile is already being removed
        if (!tile.isActive()) {
            return;
        }
        
        const currentProblem = this.mathContentSystem ? this.mathContentSystem.getCurrentProblem() : null;
        if (!currentProblem) {
            console.warn('No current problem available for collision handling');
            return;
        }
        
        // Calculate response time
        const responseTime = this.currentQuestionStartTime ? 
            (Date.now() - this.currentQuestionStartTime) / 1000 : 0;
        
        // Check if the tile's value is the correct answer
        const isCorrect = tile.getValue() === currentProblem.correctAnswer;
        
        // Record answer in adaptive learning system
        if (this.adaptiveLearningSystem && currentProblem.operation) {
            this.adaptiveLearningSystem.recordAnswer(
                currentProblem.operation,
                currentProblem.difficulty || 1,
                isCorrect,
                responseTime
            );
        }
        
        if (isCorrect) {
            this.handleCorrectAnswer(player, tile);
        } else {
            this.handleIncorrectAnswer(player, tile);
        }
        
        // Remove the tile after collision
        this.removeTile(tile);
        
        // Generate next question if this was correct
        if (isCorrect) {
            this.generateNextQuestion();
        }
        
        const currentScore = this.scoreSystem ? this.scoreSystem.getScore() : 0;
        const currentHealth = this.healthSystem ? this.healthSystem.getCurrentHealth() : 0;
        console.log(`Player-Tile collision: value=${tile.getValue()}, correct=${isCorrect}, responseTime=${responseTime.toFixed(2)}s, score=${currentScore}, health=${currentHealth}`);
    }
    
    /**
     * Handle correct answer collision
     * @param {PlayerCharacter} player - The player character
     * @param {NumberTile} tile - The correct answer tile
     */
    handleCorrectAnswer(player, tile) {
        // Use score system to handle scoring
        let totalPoints = 0;
        if (this.scoreSystem) {
            totalPoints = this.scoreSystem.addCorrectAnswer();
        }
        
        // Notify level manager of correct answer
        if (this.levelManager) {
            this.levelManager.onCorrectAnswer();
        }
        
        // Get current streak for feedback
        const currentStreak = this.scoreSystem ? this.scoreSystem.getCurrentStreak() : 0;
        
        // Visual feedback
        if (currentStreak > 1) {
            const streakBonus = totalPoints - this.config.correctAnswerScore;
            this.addFeedbackMessage(`Streak x${currentStreak}! +${streakBonus} bonus!`, '#f39c12');
        }
        
        this.addFeedbackMessage(`Correct! +${this.config.correctAnswerScore}`, '#27ae60');
        this.highlightPlayer(player, '#27ae60'); // Green for correct
        
        // Notify question display system
        if (this.questionDisplaySystem) {
            this.questionDisplaySystem.onCorrectAnswer();
        }
    }
    
    /**
     * Handle incorrect answer collision
     * @param {PlayerCharacter} player - The player character
     * @param {NumberTile} tile - The incorrect answer tile
     */
    handleIncorrectAnswer(player, tile) {
        // Use score system to handle incorrect answer
        if (this.scoreSystem) {
            this.scoreSystem.addIncorrectAnswer();
        }
        
        // Use health system to handle damage
        let isAlive = true;
        if (this.healthSystem) {
            isAlive = this.healthSystem.takeDamage(this.config.incorrectAnswerPenalty, 'incorrect_answer');
        }
        
        // Visual feedback
        this.addFeedbackMessage(`Wrong! -${this.config.incorrectAnswerPenalty} health`, '#e74c3c');
        this.highlightPlayer(player, '#e74c3c'); // Red for incorrect
        
        // Check for game over
        if (!isAlive) {
            this.handleGameOver();
        }
    }
    
    /**
     * Remove a tile from the game
     * @param {NumberTile} tile - The tile to remove
     */
    removeTile(tile) {
        // Mark tile as inactive and remove from game
        tile.destroy();
        this.gameEngine.removeEntity(tile);
        
        // Also remove from number tile system's active list
        if (this.numberTileSystem) {
            this.numberTileSystem.activeTiles = this.numberTileSystem.activeTiles.filter(t => t !== tile);
        }
    }
    
    /**
     * Generate the next math question
     */
    generateNextQuestion() {
        if (!this.mathContentSystem) return;
        
        // Get recommended operation from adaptive learning system
        let targetOperation = null;
        let targetDifficulty = null;
        
        if (this.adaptiveLearningSystem) {
            targetOperation = this.adaptiveLearningSystem.getNextRecommendedOperation();
            
            // If we have a target operation, get its optimal difficulty
            if (targetOperation) {
                targetDifficulty = this.adaptiveLearningSystem.calculateOptimalDifficulty(targetOperation);
            }
        }
        
        // Generate a new problem
        try {
            let newProblem;
            
            if (targetOperation && targetDifficulty) {
                // Use adaptive learning recommendations
                newProblem = this.mathContentSystem.generateProblem(targetOperation, targetDifficulty);
                console.log(`Generated adaptive problem: ${targetOperation} at difficulty ${targetDifficulty}`);
            } else {
                // Fall back to random problem generation
                newProblem = this.mathContentSystem.generateRandomProblem();
            }
            
            console.log('Generated new problem:', this.mathContentSystem.formatProblem(newProblem));
            
            // Record the start time for response time tracking
            this.currentQuestionStartTime = Date.now();
            
            // Clear existing tiles to make room for new answer options
            if (this.numberTileSystem) {
                this.numberTileSystem.clearAllTiles();
            }
            
        } catch (error) {
            console.error('Failed to generate new problem:', error);
        }
    }
    
    /**
     * Add a feedback message to display
     * @param {string} message - The message text
     * @param {string} color - The message color
     */
    addFeedbackMessage(message, color = '#2c3e50') {
        const feedback = {
            message,
            color,
            timestamp: Date.now(),
            duration: this.config.feedbackDuration
        };
        
        this.feedbackMessages.push(feedback);
        
        // Limit number of feedback messages
        if (this.feedbackMessages.length > 5) {
            this.feedbackMessages.shift();
        }
    }
    
    /**
     * Highlight the player character with a color
     * @param {PlayerCharacter} player - The player to highlight
     * @param {string} color - The highlight color
     */
    highlightPlayer(player, color) {
        const originalColor = player.color;
        player.color = color;
        
        // Reset color after a short delay
        setTimeout(() => {
            player.color = originalColor;
        }, 300);
    }
    
    /**
     * Handle game over condition
     */
    handleGameOver() {
        const finalScore = this.scoreSystem ? this.scoreSystem.getScore() : 0;
        const finalLevel = this.levelManager ? this.levelManager.getCurrentLevel() : 1;
        
        console.log('Game Over! Final score:', finalScore);
        
        // Add game over feedback
        this.addFeedbackMessage('Game Over!', '#e74c3c');
        
        // Clear all tiles
        if (this.numberTileSystem) {
            this.numberTileSystem.clearAllTiles();
        }
        
        // Get performance summary
        const performanceSummary = this.getPerformanceSummary();
        
        // Trigger game over state through GameStateManager
        const gameStateManager = this.gameEngine.getSystem('gameState');
        if (gameStateManager) {
            gameStateManager.gameOver(finalScore, finalLevel, performanceSummary);
        } else {
            // Fallback to old method
            this.gameEngine.setState('gameOver');
        }
        
        // Show final statistics
        this.showFinalStats();
    }
    
    /**
     * Show final game statistics
     */
    showFinalStats() {
        const stats = this.scoreSystem ? this.scoreSystem.getPerformanceStats() : {
            score: 0,
            totalAnswers: 0,
            correctAnswers: 0,
            accuracy: 0,
            bestStreak: 0
        };
        
        console.log('=== GAME STATISTICS ===');
        console.log(`Final Score: ${stats.score}`);
        console.log(`Total Answers: ${stats.totalAnswers}`);
        console.log(`Correct Answers: ${stats.correctAnswers}`);
        console.log(`Accuracy: ${stats.accuracy.toFixed(1)}%`);
        console.log(`Best Streak: ${stats.bestStreak}`);
    }
    
    /**
     * Reset the game state for a new game
     */
    resetGame() {
        // Reset score system
        if (this.scoreSystem) {
            this.scoreSystem.resetScore();
        }
        
        // Reset health system
        if (this.healthSystem) {
            this.healthSystem.resetHealth();
        }
        
        // Reset level manager
        if (this.levelManager) {
            this.levelManager.reset();
        }
        
        // Reset adaptive learning session
        if (this.adaptiveLearningSystem) {
            this.adaptiveLearningSystem.resetSession();
        }
        
        // Reset feedback
        this.feedbackMessages = [];
        
        // Reset performance tracking
        this.currentQuestionStartTime = null;
        
        // Clear all tiles
        if (this.numberTileSystem) {
            this.numberTileSystem.clearAllTiles();
        }
        
        // Generate first question
        this.generateNextQuestion();
        
        // Reset game state
        if (this.gameEngine) {
            this.gameEngine.setState('playing');
        }
        
        console.log('Game reset - new game started');
    }
    
    /**
     * Update the game logic system
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        // Update feedback messages (remove expired ones)
        const currentTime = Date.now();
        this.feedbackMessages = this.feedbackMessages.filter(
            feedback => currentTime - feedback.timestamp < feedback.duration
        );
        
        // Auto-generate first question if none exists
        if (this.mathContentSystem && !this.mathContentSystem.getCurrentProblem()) {
            this.generateNextQuestion();
        }
    }
    
    /**
     * Render game UI elements (score, health, feedback)
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    render(context) {
        this.renderGameUI(context);
        this.renderFeedbackMessages(context);
    }
    
    /**
     * Render the game UI
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    renderGameUI(context) {
        // GameLogicSystem no longer renders health bar - HealthSystem handles that
        // This method is kept for potential future UI elements
    }
    
    /**
     * Render feedback messages
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    renderFeedbackMessages(context) {
        const canvasSize = this.gameEngine.getCanvasSize();
        const startY = canvasSize.height / 2 - 50;
        
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        
        this.feedbackMessages.forEach((feedback, index) => {
            const age = Date.now() - feedback.timestamp;
            const alpha = Math.max(0, 1 - (age / feedback.duration));
            
            // Create color with alpha
            const color = feedback.color;
            context.fillStyle = color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
            
            // If color is hex, convert to rgba
            if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            
            // Animate position (float upward)
            const yOffset = (age / feedback.duration) * 30;
            const y = startY + (index * 35) - yOffset;
            
            context.fillText(feedback.message, canvasSize.width / 2, y);
        });
    }
    
    /**
     * Get performance summary for game over screen
     * @returns {Object} Performance summary data
     */
    getPerformanceSummary() {
        const scoreStats = this.scoreSystem ? this.scoreSystem.getPerformanceStats() : {};
        const adaptiveStats = this.adaptiveLearningSystem ? this.adaptiveLearningSystem.getLearningProgress() : {};
        
        return {
            totalQuestions: scoreStats.totalAnswers || 0,
            accuracy: scoreStats.accuracy ? scoreStats.accuracy / 100 : 0,
            averageTime: adaptiveStats.averageResponseTime || 0,
            bestStreak: scoreStats.bestStreak || 0
        };
    }
    
    /**
     * Get current game statistics
     * @returns {Object} Current game stats
     */
    getGameStats() {
        const scoreStats = this.scoreSystem ? this.scoreSystem.getPerformanceStats() : {
            score: 0,
            currentStreak: 0,
            totalAnswers: 0,
            correctAnswers: 0,
            accuracy: 0
        };
        
        const healthStats = this.healthSystem ? this.healthSystem.getHealthStats() : {
            currentHealth: 0,
            maxHealth: 100,
            isDead: false
        };
        
        return {
            ...scoreStats,
            ...healthStats
        };
    }
}

// Make GameLogicSystem available globally
window.GameLogicSystem = GameLogicSystem;