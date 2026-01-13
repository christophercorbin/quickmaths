/**
 * ScoreSystem - Dedicated system for tracking player performance and scoring
 * Handles score calculation, display, and performance metrics
 */
class ScoreSystem {
    constructor(config = {}) {
        this.config = {
            correctAnswerScore: 10,
            streakBonus: 1,
            maxStreakBonus: 5,
            showScore: true,
            fontSize: 20,
            textColor: '#2c3e50',
            position: { x: 10, y: 30 },
            ...config
        };
        
        // System references
        this.gameEngine = null;
        
        // Score state
        this.score = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.totalAnswers = 0;
        this.correctAnswers = 0;
        this.sessionStartTime = Date.now();
        
        // Performance tracking
        this.scoreHistory = [];
        this.streakHistory = [];
        
        console.log('ScoreSystem initialized with config:', this.config);
    }
    
    /**
     * Initialize the system with the game engine
     * @param {GameEngine} gameEngine - The game engine instance
     */
    init(gameEngine) {
        this.gameEngine = gameEngine;
        console.log('ScoreSystem initialized with game engine');
    }
    
    /**
     * Add points for a correct answer
     * @param {number} basePoints - Base points for the correct answer
     * @param {boolean} updateStreak - Whether to update the streak counter
     * @returns {number} Total points awarded (including bonuses)
     */
    addCorrectAnswer(basePoints = null, updateStreak = true) {
        const points = basePoints || this.config.correctAnswerScore;
        
        // Update statistics
        this.totalAnswers++;
        this.correctAnswers++;
        
        if (updateStreak) {
            this.currentStreak++;
            this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
        }
        
        // Calculate streak bonus
        let streakBonus = 0;
        if (this.currentStreak > 1) {
            streakBonus = Math.min(
                (this.currentStreak - 1) * this.config.streakBonus,
                this.config.maxStreakBonus
            );
        }
        
        const totalPoints = points + streakBonus;
        this.score += totalPoints;
        
        // Record score event
        this.recordScoreEvent('correct', totalPoints, streakBonus);
        
        console.log(`Correct answer: +${points} base, +${streakBonus} streak bonus, total: ${totalPoints}`);
        
        return totalPoints;
    }
    
    /**
     * Handle an incorrect answer (resets streak, no points)
     */
    addIncorrectAnswer() {
        this.totalAnswers++;
        this.currentStreak = 0;
        
        // Record score event
        this.recordScoreEvent('incorrect', 0, 0);
        
        console.log('Incorrect answer: streak reset');
    }
    
    /**
     * Record a score event for analytics
     * @param {string} type - Type of event ('correct' or 'incorrect')
     * @param {number} points - Points awarded
     * @param {number} bonus - Bonus points from streak
     */
    recordScoreEvent(type, points, bonus) {
        const event = {
            type,
            points,
            bonus,
            streak: this.currentStreak,
            totalScore: this.score,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStartTime
        };
        
        this.scoreHistory.push(event);
        
        // Keep only last 100 events to prevent memory issues
        if (this.scoreHistory.length > 100) {
            this.scoreHistory.shift();
        }
        
        // Record streak milestones
        if (type === 'correct' && this.currentStreak > 0) {
            this.streakHistory.push({
                streak: this.currentStreak,
                timestamp: Date.now()
            });
            
            // Keep only last 50 streak records
            if (this.streakHistory.length > 50) {
                this.streakHistory.shift();
            }
        }
    }
    
    /**
     * Get current score
     * @returns {number} Current score
     */
    getScore() {
        return this.score;
    }
    
    /**
     * Get current streak
     * @returns {number} Current streak count
     */
    getCurrentStreak() {
        return this.currentStreak;
    }
    
    /**
     * Get best streak achieved in this session
     * @returns {number} Best streak count
     */
    getBestStreak() {
        return this.bestStreak;
    }
    
    /**
     * Get accuracy percentage
     * @returns {number} Accuracy as percentage (0-100)
     */
    getAccuracy() {
        if (this.totalAnswers === 0) return 100;
        return (this.correctAnswers / this.totalAnswers) * 100;
    }
    
    /**
     * Get comprehensive performance statistics
     * @returns {Object} Performance statistics object
     */
    getPerformanceStats() {
        const sessionDuration = Date.now() - this.sessionStartTime;
        const averageTimePerAnswer = this.totalAnswers > 0 ? sessionDuration / this.totalAnswers : 0;
        
        return {
            score: this.score,
            currentStreak: this.currentStreak,
            bestStreak: this.bestStreak,
            totalAnswers: this.totalAnswers,
            correctAnswers: this.correctAnswers,
            incorrectAnswers: this.totalAnswers - this.correctAnswers,
            accuracy: this.getAccuracy(),
            sessionDuration,
            averageTimePerAnswer,
            scorePerMinute: sessionDuration > 0 ? (this.score / (sessionDuration / 60000)) : 0
        };
    }
    
    /**
     * Reset all score data for a new game
     */
    resetScore() {
        this.score = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.totalAnswers = 0;
        this.correctAnswers = 0;
        this.sessionStartTime = Date.now();
        this.scoreHistory = [];
        this.streakHistory = [];
        
        console.log('Score system reset for new game');
    }
    
    /**
     * Update the score system (called each frame)
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        // Score system doesn't need per-frame updates currently
        // This method is here for consistency with other systems
    }
    
    /**
     * Render the score display
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    render(context) {
        if (!this.config.showScore) return;
        
        const canvasSize = this.gameEngine.getCanvasSize();
        
        // Set up text rendering
        context.fillStyle = this.config.textColor;
        context.font = `bold ${this.config.fontSize}px Arial`;
        context.textAlign = 'left';
        context.textBaseline = 'top';
        
        // Render score
        const scoreText = `Score: ${this.score}`;
        context.fillText(scoreText, this.config.position.x, this.config.position.y);
        
        // Render streak if active
        if (this.currentStreak > 1) {
            context.fillStyle = '#f39c12'; // Orange for streak
            context.font = `${this.config.fontSize - 2}px Arial`;
            const streakText = `Streak: ${this.currentStreak}`;
            context.fillText(streakText, this.config.position.x, this.config.position.y + 25);
        }
        
        // Render accuracy (smaller text)
        context.fillStyle = '#7f8c8d'; // Gray for secondary info
        context.font = `${this.config.fontSize - 6}px Arial`;
        const accuracy = this.getAccuracy().toFixed(1);
        const accuracyText = `Accuracy: ${accuracy}%`;
        context.fillText(accuracyText, this.config.position.x, this.config.position.y + 50);
        
        // Reset text alignment for other systems
        context.textAlign = 'left';
        context.textBaseline = 'top';
    }
    
    /**
     * Get recent score events for feedback display
     * @param {number} maxEvents - Maximum number of recent events to return
     * @returns {Array} Array of recent score events
     */
    getRecentEvents(maxEvents = 5) {
        return this.scoreHistory.slice(-maxEvents);
    }
    
    /**
     * Calculate points that would be awarded for a correct answer
     * @returns {Object} Object with basePoints and streakBonus
     */
    calculatePotentialPoints() {
        const basePoints = this.config.correctAnswerScore;
        let streakBonus = 0;
        
        if (this.currentStreak >= 1) {
            streakBonus = Math.min(
                this.currentStreak * this.config.streakBonus,
                this.config.maxStreakBonus
            );
        }
        
        return {
            basePoints,
            streakBonus,
            totalPoints: basePoints + streakBonus
        };
    }
    
    /**
     * Export score data for saving/analytics
     * @returns {Object} Exportable score data
     */
    exportData() {
        return {
            finalScore: this.score,
            bestStreak: this.bestStreak,
            performanceStats: this.getPerformanceStats(),
            scoreHistory: this.scoreHistory,
            streakHistory: this.streakHistory,
            sessionStartTime: this.sessionStartTime,
            sessionEndTime: Date.now()
        };
    }
}

// Make ScoreSystem available globally
window.ScoreSystem = ScoreSystem;