/**
 * QuestionDisplaySystem - Handles display and progression of math questions
 * Manages question rendering at top of screen and transitions after correct answers
 */
class QuestionDisplaySystem {
    constructor(config = {}) {
        this.config = {
            // Display configuration
            fontSize: 32,
            fontFamily: 'Arial, sans-serif',
            textColor: '#2c3e50',
            backgroundColor: '#ffffff',
            padding: 20,
            borderRadius: 10,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            shadowBlur: 5,
            // Position configuration
            topMargin: 20,
            centerHorizontally: true,
            // Animation configuration
            transitionDuration: 500, // milliseconds
            fadeInDuration: 300,
            ...config
        };
        
        this.mathContentSystem = null;
        this.gameEngine = null;
        this.currentQuestion = null;
        this.questionText = '';
        this.isTransitioning = false;
        this.transitionStartTime = 0;
        this.fadeAlpha = 1.0;
        
        console.log('QuestionDisplaySystem initialized');
    }
    
    /**
     * Initialize the system with game engine reference
     * @param {GameEngine} gameEngine - The game engine instance
     */
    init(gameEngine) {
        this.gameEngine = gameEngine;
        this.mathContentSystem = gameEngine.getSystem('mathContent');
        
        if (!this.mathContentSystem) {
            console.warn('QuestionDisplaySystem: MathContentSystem not found. Questions will not be generated.');
            return;
        }
        
        // Generate the first question
        this.generateNewQuestion();
        
        console.log('QuestionDisplaySystem initialized with game engine');
    }
    
    /**
     * Generate a new math question
     */
    generateNewQuestion() {
        if (!this.mathContentSystem) {
            console.warn('Cannot generate question: MathContentSystem not available');
            return;
        }
        
        try {
            // Generate a random problem using current difficulty
            this.currentQuestion = this.mathContentSystem.generateRandomProblem();
            this.questionText = this.mathContentSystem.formatProblem(this.currentQuestion);
            
            console.log('New question generated:', this.questionText);
            
            // Start fade-in animation
            this.startFadeIn();
            
        } catch (error) {
            console.error('Failed to generate question:', error);
            this.questionText = 'Error generating question';
        }
    }
    
    /**
     * Handle a correct answer and transition to next question
     */
    onCorrectAnswer() {
        if (this.isTransitioning) {
            return; // Already transitioning
        }
        
        console.log('Correct answer! Transitioning to next question...');
        this.startTransition();
    }
    
    /**
     * Start transition animation to next question
     */
    startTransition() {
        this.isTransitioning = true;
        this.transitionStartTime = Date.now();
        
        // Generate new question after a brief delay
        setTimeout(() => {
            this.generateNewQuestion();
            this.isTransitioning = false;
        }, this.config.transitionDuration);
    }
    
    /**
     * Start fade-in animation for new question
     */
    startFadeIn() {
        this.fadeAlpha = 0.0;
        const startTime = Date.now();
        
        const fadeIn = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.config.fadeInDuration, 1.0);
            
            this.fadeAlpha = progress;
            
            if (progress < 1.0) {
                requestAnimationFrame(fadeIn);
            }
        };
        
        requestAnimationFrame(fadeIn);
    }
    
    /**
     * Get the current question object
     * @returns {Object|null} Current question or null if none
     */
    getCurrentQuestion() {
        return this.currentQuestion;
    }
    
    /**
     * Get the current question text
     * @returns {string} Formatted question text
     */
    getQuestionText() {
        return this.questionText;
    }
    
    /**
     * Check if an answer is correct for the current question
     * @param {number} answer - The answer to check
     * @returns {boolean} True if answer is correct
     */
    isCorrectAnswer(answer) {
        return this.mathContentSystem && this.mathContentSystem.isCorrectAnswer(answer);
    }
    
    /**
     * Update the system
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Handle transition animations if needed
        if (this.isTransitioning) {
            const elapsed = Date.now() - this.transitionStartTime;
            const progress = elapsed / this.config.transitionDuration;
            
            // Fade out during first half of transition
            if (progress < 0.5) {
                this.fadeAlpha = 1.0 - (progress * 2);
            }
        }
    }
    
    /**
     * Render the question display
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    render(context) {
        if (!this.questionText || !this.gameEngine) {
            return;
        }
        
        const canvasSize = this.gameEngine.getCanvasSize();
        
        // Set up text properties
        context.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Measure text for background sizing
        const textMetrics = context.measureText(this.questionText);
        const textWidth = textMetrics.width;
        const textHeight = this.config.fontSize;
        
        // Calculate position
        const x = this.config.centerHorizontally ? canvasSize.width / 2 : this.config.padding;
        const y = this.config.topMargin + textHeight / 2 + this.config.padding;
        
        // Calculate background dimensions
        const bgWidth = textWidth + this.config.padding * 2;
        const bgHeight = textHeight + this.config.padding * 2;
        const bgX = x - bgWidth / 2;
        const bgY = y - bgHeight / 2;
        
        // Apply fade alpha
        const alpha = this.fadeAlpha;
        
        context.save();
        context.globalAlpha = alpha;
        
        // Draw shadow
        context.shadowColor = this.config.shadowColor;
        context.shadowBlur = this.config.shadowBlur;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        
        // Draw background
        context.fillStyle = this.config.backgroundColor;
        this.drawRoundedRect(context, bgX, bgY, bgWidth, bgHeight, this.config.borderRadius);
        context.fill();
        
        // Reset shadow for text
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        
        // Draw question text
        context.fillStyle = this.config.textColor;
        context.fillText(this.questionText, x, y);
        
        context.restore();
    }
    
    /**
     * Draw a rounded rectangle
     * @param {CanvasRenderingContext2D} context - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} radius - Corner radius
     */
    drawRoundedRect(context, x, y, width, height, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
    }
    
    /**
     * Force generation of a new question (for testing/debugging)
     */
    forceNewQuestion() {
        this.generateNewQuestion();
    }
    
    /**
     * Set the math content system reference
     * @param {MathContentSystem} mathContentSystem - The math content system
     */
    setMathContentSystem(mathContentSystem) {
        this.mathContentSystem = mathContentSystem;
        if (mathContentSystem && !this.currentQuestion) {
            this.generateNewQuestion();
        }
    }
}

// Make QuestionDisplaySystem available globally
window.QuestionDisplaySystem = QuestionDisplaySystem;