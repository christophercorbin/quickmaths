/**
 * MathContentSystem - Generates mathematical problems and manages educational content
 * Handles problem generation, answer options, and difficulty scaling for all operations
 */
class MathContentSystem {
    constructor(config = {}) {
        this.config = {
            // Difficulty scaling configuration
            difficultyLevels: {
                1: { min: 1, max: 10, answerOptions: 3 },
                2: { min: 1, max: 20, answerOptions: 4 },
                3: { min: 1, max: 50, answerOptions: 4 },
                4: { min: 1, max: 100, answerOptions: 5 },
                5: { min: 10, max: 200, answerOptions: 5 }
            },
            // Operation-specific configurations
            operations: {
                addition: { enabled: true, minLevel: 1 },
                subtraction: { enabled: true, minLevel: 1 },
                multiplication: { enabled: true, minLevel: 2 },
                division: { enabled: true, minLevel: 3 }
            },
            // Answer generation settings
            distractorRange: 0.5, // How far distractors can be from correct answer (as percentage)
            ensureUniqueAnswers: true,
            ...config
        };
        
        this.currentDifficulty = 1;
        this.currentProblem = null;
        this.supportedOperations = ['addition', 'subtraction', 'multiplication', 'division'];
        
        console.log('MathContentSystem initialized with config:', this.config);
    }
    
    /**
     * Generate a math problem for the specified operation and difficulty
     * @param {string} operation - The operation type ('addition', 'subtraction', 'multiplication', 'division')
     * @param {number} difficulty - The difficulty level (1-5)
     * @returns {Object} Generated math problem with operands and correct answer
     */
    generateProblem(operation, difficulty = this.currentDifficulty) {
        if (!this.supportedOperations.includes(operation)) {
            throw new Error(`Unsupported operation: ${operation}`);
        }
        
        if (!this.config.operations[operation].enabled) {
            throw new Error(`Operation ${operation} is disabled`);
        }
        
        if (difficulty < this.config.operations[operation].minLevel) {
            throw new Error(`Operation ${operation} requires minimum level ${this.config.operations[operation].minLevel}`);
        }
        
        const difficultyConfig = this.config.difficultyLevels[difficulty] || this.config.difficultyLevels[1];
        
        let operandA, operandB, correctAnswer;
        
        switch (operation) {
            case 'addition':
                operandA = this.randomInt(difficultyConfig.min, difficultyConfig.max);
                operandB = this.randomInt(difficultyConfig.min, difficultyConfig.max);
                correctAnswer = operandA + operandB;
                break;
                
            case 'subtraction':
                // Ensure positive results by making operandA >= operandB
                operandA = this.randomInt(difficultyConfig.min, difficultyConfig.max);
                operandB = this.randomInt(difficultyConfig.min, Math.min(operandA, difficultyConfig.max));
                correctAnswer = operandA - operandB;
                break;
                
            case 'multiplication':
                // Keep multiplication manageable by limiting one operand
                operandA = this.randomInt(difficultyConfig.min, Math.min(12, difficultyConfig.max));
                operandB = this.randomInt(difficultyConfig.min, Math.min(12, difficultyConfig.max));
                correctAnswer = operandA * operandB;
                break;
                
            case 'division':
                // Generate division by creating multiplication first, then reversing
                operandB = this.randomInt(Math.max(2, difficultyConfig.min), Math.min(12, difficultyConfig.max));
                correctAnswer = this.randomInt(difficultyConfig.min, Math.floor(difficultyConfig.max / operandB));
                operandA = operandB * correctAnswer;
                break;
                
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
        
        const problem = {
            operation,
            operandA,
            operandB,
            correctAnswer,
            difficulty,
            timeCreated: Date.now()
        };
        
        this.currentProblem = problem;
        return problem;
    }
    
    /**
     * Generate answer options including the correct answer and distractors
     * @param {number} correctAnswer - The correct answer to the problem
     * @param {number} count - Number of answer options to generate (including correct answer)
     * @param {number} difficulty - Difficulty level for distractor generation
     * @returns {Array} Array of answer options with correct answer included
     */
    generateAnswerOptions(correctAnswer, count = 4, difficulty = this.currentDifficulty) {
        if (count < 2) {
            throw new Error('Must generate at least 2 answer options');
        }
        
        const options = [correctAnswer];
        const difficultyConfig = this.config.difficultyLevels[difficulty] || this.config.difficultyLevels[1];
        
        // Calculate range for distractors based on correct answer and difficulty
        const range = Math.max(1, Math.floor(correctAnswer * this.config.distractorRange));
        const minDistractor = Math.max(0, correctAnswer - range);
        const maxDistractor = correctAnswer + range;
        
        // Generate distractors
        while (options.length < count) {
            let distractor;
            
            // Generate different types of distractors
            const distractorType = Math.random();
            
            if (distractorType < 0.4) {
                // Close distractors (within range)
                distractor = this.randomInt(minDistractor, maxDistractor);
            } else if (distractorType < 0.7) {
                // Off-by-one errors (common mistakes)
                distractor = correctAnswer + (Math.random() < 0.5 ? 1 : -1);
            } else {
                // Wider range distractors
                const widerRange = Math.max(range * 2, difficultyConfig.max - difficultyConfig.min);
                distractor = this.randomInt(
                    Math.max(0, correctAnswer - widerRange),
                    correctAnswer + widerRange
                );
            }
            
            // Ensure distractor is positive and unique
            if (distractor >= 0 && !options.includes(distractor)) {
                options.push(distractor);
            }
        }
        
        // Shuffle the options so correct answer isn't always in the same position
        return this.shuffleArray(options);
    }
    
    /**
     * Get the current difficulty level
     * @returns {number} Current difficulty level
     */
    getCurrentDifficulty() {
        return this.currentDifficulty;
    }
    
    /**
     * Set the current difficulty level
     * @param {number} difficulty - New difficulty level (1-5)
     */
    setDifficulty(difficulty) {
        if (difficulty < 1 || difficulty > 5) {
            throw new Error('Difficulty must be between 1 and 5');
        }
        this.currentDifficulty = difficulty;
    }
    
    /**
     * Adjust difficulty based on player performance
     * @param {Object} playerPerformance - Performance metrics object
     * @param {number} playerPerformance.accuracy - Recent accuracy percentage (0-1)
     * @param {number} playerPerformance.averageTime - Average response time in seconds
     */
    adjustDifficulty(playerPerformance) {
        const { accuracy, averageTime } = playerPerformance;
        
        // Increase difficulty if player is performing well
        if (accuracy > 0.8 && averageTime < 3.0 && this.currentDifficulty < 5) {
            this.currentDifficulty++;
            console.log(`Difficulty increased to ${this.currentDifficulty}`);
        }
        // Decrease difficulty if player is struggling
        else if (accuracy < 0.5 && this.currentDifficulty > 1) {
            this.currentDifficulty--;
            console.log(`Difficulty decreased to ${this.currentDifficulty}`);
        }
    }
    
    /**
     * Get the current problem
     * @returns {Object|null} Current math problem or null if none generated
     */
    getCurrentProblem() {
        return this.currentProblem;
    }
    
    /**
     * Format a problem as a string for display
     * @param {Object} problem - The problem object
     * @returns {string} Formatted problem string
     */
    formatProblem(problem) {
        if (!problem) return '';
        
        const { operation, operandA, operandB } = problem;
        
        switch (operation) {
            case 'addition':
                return `${operandA} + ${operandB} = ?`;
            case 'subtraction':
                return `${operandA} - ${operandB} = ?`;
            case 'multiplication':
                return `${operandA} × ${operandB} = ?`;
            case 'division':
                return `${operandA} ÷ ${operandB} = ?`;
            default:
                return `${operandA} ? ${operandB} = ?`;
        }
    }
    
    /**
     * Check if an answer is correct for the current problem
     * @param {number} answer - The answer to check
     * @returns {boolean} True if answer is correct
     */
    isCorrectAnswer(answer) {
        return this.currentProblem && this.currentProblem.correctAnswer === answer;
    }
    
    /**
     * Get available operations for the current difficulty level
     * @param {number} difficulty - Difficulty level to check (defaults to current)
     * @returns {Array} Array of available operation names
     */
    getAvailableOperations(difficulty = this.currentDifficulty) {
        return this.supportedOperations.filter(operation => {
            const opConfig = this.config.operations[operation];
            return opConfig.enabled && difficulty >= opConfig.minLevel;
        });
    }
    
    /**
     * Generate a random problem using any available operation
     * @param {number} difficulty - Difficulty level (defaults to current)
     * @returns {Object} Generated math problem
     */
    generateRandomProblem(difficulty = this.currentDifficulty) {
        const availableOperations = this.getAvailableOperations(difficulty);
        
        if (availableOperations.length === 0) {
            throw new Error(`No operations available for difficulty level ${difficulty}`);
        }
        
        const randomOperation = availableOperations[Math.floor(Math.random() * availableOperations.length)];
        return this.generateProblem(randomOperation, difficulty);
    }
    
    /**
     * Generate a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    /**
     * Shuffle an array using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     * @returns {Array} New shuffled array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    /**
     * System update method (called by GameEngine)
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // MathContentSystem doesn't need regular updates
        // This method exists for GameEngine compatibility
    }
    
    /**
     * System render method (called by GameEngine)
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    render(context) {
        // MathContentSystem doesn't render directly
        // This method exists for GameEngine compatibility
    }
}

// Make MathContentSystem available globally
window.MathContentSystem = MathContentSystem;