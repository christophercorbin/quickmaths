/**
 * AdaptiveLearningSystem - Analyzes player performance and adjusts difficulty dynamically
 * Tracks accuracy and response times per operation type to provide personalized learning
 */
class AdaptiveLearningSystem {
    constructor(config = {}) {
        this.config = {
            // Performance tracking settings
            performanceWindowSize: 10, // Number of recent attempts to consider
            minAttemptsForAdjustment: 5, // Minimum attempts before adjusting difficulty
            
            // Difficulty adjustment thresholds
            accuracyThresholds: {
                increase: 0.8, // Increase difficulty if accuracy > 80%
                decrease: 0.5  // Decrease difficulty if accuracy < 50%
            },
            responseTimeThresholds: {
                fast: 3.0,     // Consider response fast if < 3 seconds
                slow: 8.0      // Consider response slow if > 8 seconds
            },
            
            // Adaptive learning settings
            strugglingThreshold: 0.6,    // Accuracy below 60% indicates struggling
            masteryThreshold: 0.85,      // Accuracy above 85% indicates mastery
            practiceBoostMultiplier: 2,  // How much more practice for struggling areas
            
            // Performance decay settings
            performanceDecayRate: 0.95,  // How much to decay old performance data
            sessionTimeout: 300000,      // 5 minutes - reset session if inactive
            
            ...config
        };
        
        // Performance tracking data
        this.performanceMetrics = new Map(); // operation -> PerformanceMetrics
        this.sessionData = {
            startTime: Date.now(),
            totalAttempts: 0,
            correctAnswers: 0,
            lastActivityTime: Date.now()
        };
        
        // Adaptive learning state
        this.currentFocusOperation = null;
        this.practiceQueue = [];
        this.difficultyAdjustments = new Map(); // operation -> difficulty adjustment
        
        // Initialize performance metrics for all operations
        this.initializePerformanceMetrics();
        
        console.log('AdaptiveLearningSystem initialized with config:', this.config);
    }
    
    /**
     * Initialize performance metrics for all supported operations
     */
    initializePerformanceMetrics() {
        const operations = ['addition', 'subtraction', 'multiplication', 'division'];
        
        for (const operation of operations) {
            this.performanceMetrics.set(operation, {
                operation,
                totalAttempts: 0,
                correctAnswers: 0,
                recentAttempts: [], // Array of {isCorrect, responseTime, difficulty, timestamp}
                averageResponseTime: 0,
                recentAccuracy: 0,
                difficultyProgression: [1], // Track difficulty changes over time
                lastUpdated: Date.now(),
                strugglingCount: 0, // How many times marked as struggling
                masteryAchieved: false
            });
        }
    }
    
    /**
     * Record a player's answer attempt
     * @param {string} operation - The operation type
     * @param {number} difficulty - The difficulty level of the question
     * @param {boolean} isCorrect - Whether the answer was correct
     * @param {number} responseTime - Time taken to answer in seconds
     */
    recordAnswer(operation, difficulty, isCorrect, responseTime) {
        if (!this.performanceMetrics.has(operation)) {
            console.warn(`Unknown operation: ${operation}`);
            return;
        }
        
        const metrics = this.performanceMetrics.get(operation);
        const timestamp = Date.now();
        
        // Update session data
        this.sessionData.totalAttempts++;
        this.sessionData.lastActivityTime = timestamp;
        if (isCorrect) {
            this.sessionData.correctAnswers++;
        }
        
        // Update operation-specific metrics
        metrics.totalAttempts++;
        if (isCorrect) {
            metrics.correctAnswers++;
        }
        
        // Add to recent attempts (maintain window size)
        const attempt = { isCorrect, responseTime, difficulty, timestamp };
        metrics.recentAttempts.push(attempt);
        
        if (metrics.recentAttempts.length > this.config.performanceWindowSize) {
            metrics.recentAttempts.shift(); // Remove oldest attempt
        }
        
        // Update calculated metrics
        this.updateCalculatedMetrics(operation);
        
        // Check for struggling areas and mastery
        this.analyzePerformancePatterns(operation);
        
        // Update practice queue based on performance
        this.updatePracticeQueue();
        
        metrics.lastUpdated = timestamp;
        
        console.log(`Recorded answer for ${operation}: ${isCorrect ? 'correct' : 'incorrect'} in ${responseTime.toFixed(2)}s`);
    }
    
    /**
     * Update calculated metrics for an operation
     * @param {string} operation - The operation to update
     */
    updateCalculatedMetrics(operation) {
        const metrics = this.performanceMetrics.get(operation);
        
        if (metrics.recentAttempts.length === 0) return;
        
        // Calculate recent accuracy
        const recentCorrect = metrics.recentAttempts.filter(a => a.isCorrect).length;
        metrics.recentAccuracy = recentCorrect / metrics.recentAttempts.length;
        
        // Calculate average response time (weighted toward recent attempts)
        let totalTime = 0;
        let totalWeight = 0;
        
        for (let i = 0; i < metrics.recentAttempts.length; i++) {
            const weight = (i + 1) / metrics.recentAttempts.length; // More weight to recent attempts
            totalTime += metrics.recentAttempts[i].responseTime * weight;
            totalWeight += weight;
        }
        
        metrics.averageResponseTime = totalWeight > 0 ? totalTime / totalWeight : 0;
    }
    
    /**
     * Analyze performance patterns to identify struggling areas and mastery
     * @param {string} operation - The operation to analyze
     */
    analyzePerformancePatterns(operation) {
        const metrics = this.performanceMetrics.get(operation);
        
        // Need minimum attempts for reliable analysis
        if (metrics.recentAttempts.length < this.config.minAttemptsForAdjustment) {
            return;
        }
        
        // Check for struggling pattern
        if (metrics.recentAccuracy < this.config.strugglingThreshold) {
            metrics.strugglingCount++;
            
            // Mark as current focus if struggling consistently
            if (metrics.strugglingCount >= 2 && 
                (!this.currentFocusOperation || 
                 this.getPerformanceMetrics(this.currentFocusOperation).recentAccuracy > metrics.recentAccuracy)) {
                this.currentFocusOperation = operation;
                console.log(`Focus shifted to struggling operation: ${operation}`);
            }
        } else {
            // Reset struggling count if performance improves
            metrics.strugglingCount = Math.max(0, metrics.strugglingCount - 1);
        }
        
        // Check for mastery
        if (metrics.recentAccuracy >= this.config.masteryThreshold && 
            metrics.averageResponseTime <= this.config.responseTimeThresholds.fast) {
            if (!metrics.masteryAchieved) {
                metrics.masteryAchieved = true;
                console.log(`Mastery achieved for ${operation}!`);
                
                // Remove from focus if this was the focus operation
                if (this.currentFocusOperation === operation) {
                    this.currentFocusOperation = null;
                }
            }
        }
    }
    
    /**
     * Update the practice queue based on current performance patterns
     */
    updatePracticeQueue() {
        this.practiceQueue = [];
        
        // Add operations that need practice, prioritizing struggling areas
        const operations = Array.from(this.performanceMetrics.keys());
        
        // Sort operations by need for practice (struggling operations first)
        operations.sort((a, b) => {
            const metricsA = this.performanceMetrics.get(a);
            const metricsB = this.performanceMetrics.get(b);
            
            // Prioritize by struggling count, then by accuracy (lower first)
            if (metricsA.strugglingCount !== metricsB.strugglingCount) {
                return metricsB.strugglingCount - metricsA.strugglingCount;
            }
            
            return metricsA.recentAccuracy - metricsB.recentAccuracy;
        });
        
        // Add operations to practice queue with appropriate frequency
        for (const operation of operations) {
            const metrics = this.performanceMetrics.get(operation);
            
            // Skip if mastered and no recent struggles
            if (metrics.masteryAchieved && metrics.strugglingCount === 0) {
                continue;
            }
            
            // Determine practice frequency based on performance
            let practiceCount = 1;
            
            if (metrics.recentAccuracy < this.config.strugglingThreshold) {
                practiceCount = this.config.practiceBoostMultiplier;
            } else if (metrics.recentAccuracy < this.config.masteryThreshold) {
                practiceCount = 1;
            }
            
            // Add to practice queue
            for (let i = 0; i < practiceCount; i++) {
                this.practiceQueue.push(operation);
            }
        }
        
        // Shuffle the practice queue to avoid predictable patterns
        this.shuffleArray(this.practiceQueue);
    }
    
    /**
     * Get performance metrics for a specific operation
     * @param {string} operation - The operation name
     * @returns {Object} Performance metrics object
     */
    getPerformanceMetrics(operation) {
        return this.performanceMetrics.get(operation) || null;
    }
    
    /**
     * Get all performance metrics
     * @returns {Map} Map of operation -> metrics
     */
    getAllPerformanceMetrics() {
        return new Map(this.performanceMetrics);
    }
    
    /**
     * Calculate optimal difficulty for an operation based on performance
     * @param {string} operation - The operation name
     * @returns {number} Recommended difficulty level (1-5)
     */
    calculateOptimalDifficulty(operation) {
        const metrics = this.performanceMetrics.get(operation);
        if (!metrics || metrics.recentAttempts.length === 0) {
            return 1; // Start with easiest difficulty
        }
        
        const currentDifficulty = metrics.difficultyProgression[metrics.difficultyProgression.length - 1] || 1;
        let newDifficulty = currentDifficulty;
        
        // Need minimum attempts for adjustment
        if (metrics.recentAttempts.length < this.config.minAttemptsForAdjustment) {
            return currentDifficulty;
        }
        
        const accuracy = metrics.recentAccuracy;
        const avgResponseTime = metrics.averageResponseTime;
        
        // Increase difficulty if performing well
        if (accuracy >= this.config.accuracyThresholds.increase && 
            avgResponseTime <= this.config.responseTimeThresholds.fast && 
            currentDifficulty < 5) {
            newDifficulty = Math.min(5, currentDifficulty + 1);
        }
        // Decrease difficulty if struggling
        else if (accuracy <= this.config.accuracyThresholds.decrease && 
                 currentDifficulty > 1) {
            newDifficulty = Math.max(1, currentDifficulty - 1);
        }
        
        // Update difficulty progression if changed
        if (newDifficulty !== currentDifficulty) {
            metrics.difficultyProgression.push(newDifficulty);
            console.log(`Difficulty adjusted for ${operation}: ${currentDifficulty} -> ${newDifficulty}`);
        }
        
        return newDifficulty;
    }
    
    /**
     * Determine if difficulty should be increased for overall game
     * @returns {boolean} True if level should increase
     */
    shouldIncreaseLevel() {
        // Check overall session performance
        const sessionAccuracy = this.sessionData.totalAttempts > 0 ? 
            this.sessionData.correctAnswers / this.sessionData.totalAttempts : 0;
        
        // Need minimum attempts and good performance
        if (this.sessionData.totalAttempts < this.config.minAttemptsForAdjustment) {
            return false;
        }
        
        // Check if most operations are performing well
        const operations = Array.from(this.performanceMetrics.values());
        const wellPerformingOps = operations.filter(metrics => 
            metrics.recentAccuracy >= this.config.accuracyThresholds.increase &&
            metrics.averageResponseTime <= this.config.responseTimeThresholds.fast
        );
        
        // Increase level if majority of operations are performing well
        return wellPerformingOps.length >= operations.length * 0.6 && 
               sessionAccuracy >= this.config.accuracyThresholds.increase;
    }
    
    /**
     * Get the next recommended operation for practice
     * @returns {string|null} Operation name or null if no specific recommendation
     */
    getNextRecommendedOperation() {
        // Return focus operation if set
        if (this.currentFocusOperation) {
            return this.currentFocusOperation;
        }
        
        // Return next from practice queue
        if (this.practiceQueue.length > 0) {
            return this.practiceQueue.shift();
        }
        
        // No specific recommendation
        return null;
    }
    
    /**
     * Get operations that need additional practice
     * @returns {Array} Array of operation names that need practice
     */
    getOperationsNeedingPractice() {
        const needingPractice = [];
        
        for (const [operation, metrics] of this.performanceMetrics) {
            if (metrics.recentAccuracy < this.config.strugglingThreshold || 
                metrics.strugglingCount > 0) {
                needingPractice.push(operation);
            }
        }
        
        return needingPractice;
    }
    
    /**
     * Reset session data (called when starting a new session)
     */
    resetSession() {
        this.sessionData = {
            startTime: Date.now(),
            totalAttempts: 0,
            correctAnswers: 0,
            lastActivityTime: Date.now()
        };
        
        console.log('AdaptiveLearningSystem session reset');
    }
    
    /**
     * Check if session has timed out due to inactivity
     * @returns {boolean} True if session has timed out
     */
    hasSessionTimedOut() {
        return Date.now() - this.sessionData.lastActivityTime > this.config.sessionTimeout;
    }
    
    /**
     * Get summary of current learning progress
     * @returns {Object} Learning progress summary
     */
    getLearningProgress() {
        const progress = {
            sessionAccuracy: this.sessionData.totalAttempts > 0 ? 
                this.sessionData.correctAnswers / this.sessionData.totalAttempts : 0,
            totalAttempts: this.sessionData.totalAttempts,
            operationProgress: {},
            strugglingOperations: this.getOperationsNeedingPractice(),
            masteredOperations: [],
            currentFocus: this.currentFocusOperation
        };
        
        // Add per-operation progress
        for (const [operation, metrics] of this.performanceMetrics) {
            progress.operationProgress[operation] = {
                accuracy: metrics.recentAccuracy,
                averageTime: metrics.averageResponseTime,
                attempts: metrics.totalAttempts,
                difficulty: metrics.difficultyProgression[metrics.difficultyProgression.length - 1] || 1,
                mastered: metrics.masteryAchieved
            };
            
            if (metrics.masteryAchieved) {
                progress.masteredOperations.push(operation);
            }
        }
        
        return progress;
    }
    
    /**
     * Shuffle an array using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle (modified in place)
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    /**
     * System update method (called by GameEngine)
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Check for session timeout
        if (this.hasSessionTimedOut()) {
            console.log('Learning session timed out, resetting...');
            this.resetSession();
        }
        
        // Apply performance decay to old data
        this.applyPerformanceDecay();
    }
    
    /**
     * Apply decay to old performance data to keep metrics current
     */
    applyPerformanceDecay() {
        const now = Date.now();
        const decayInterval = 60000; // Apply decay every minute
        
        for (const [operation, metrics] of this.performanceMetrics) {
            if (now - metrics.lastUpdated > decayInterval) {
                // Remove very old attempts from recent attempts
                const cutoffTime = now - (this.config.sessionTimeout * 2);
                metrics.recentAttempts = metrics.recentAttempts.filter(
                    attempt => attempt.timestamp > cutoffTime
                );
                
                // Recalculate metrics if attempts were removed
                if (metrics.recentAttempts.length > 0) {
                    this.updateCalculatedMetrics(operation);
                }
                
                metrics.lastUpdated = now;
            }
        }
    }
    
    /**
     * System render method (called by GameEngine)
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    render(context) {
        // AdaptiveLearningSystem doesn't render directly
        // This method exists for GameEngine compatibility
    }
}

// Make AdaptiveLearningSystem available globally
window.AdaptiveLearningSystem = AdaptiveLearningSystem;