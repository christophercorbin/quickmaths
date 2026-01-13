/**
 * CollisionFeedbackSystem - Handles visual feedback and animations for collisions
 * Provides visual highlights for correct collisions, error feedback for incorrect collisions,
 * and smooth animations for moving elements
 */
class CollisionFeedbackSystem {
    constructor(config = {}) {
        this.config = {
            correctFeedbackDuration: 800, // milliseconds
            incorrectFeedbackDuration: 1000, // milliseconds
            particleCount: 8,
            particleLifetime: 1000, // milliseconds
            animationEasing: 'easeOutQuart',
            enableParticles: true,
            enableScreenShake: true,
            screenShakeIntensity: 5,
            screenShakeDuration: 300,
            ...config
        };
        
        // System references
        this.gameEngine = null;
        
        // Active feedback effects
        this.activeFeedbacks = [];
        this.particles = [];
        this.animations = [];
        
        // Screen shake effect
        this.screenShake = {
            active: false,
            intensity: 0,
            duration: 0,
            elapsed: 0,
            offsetX: 0,
            offsetY: 0
        };
        
        // Animation timing
        this.lastUpdateTime = 0;
        
        console.log('CollisionFeedbackSystem initialized with config:', this.config);
    }
    
    /**
     * Initialize the system with the game engine
     * @param {GameEngine} gameEngine - The game engine instance
     */
    init(gameEngine) {
        this.gameEngine = gameEngine;
        
        // Register collision callback for feedback
        const physicsSystem = gameEngine.getSystem('physics');
        if (physicsSystem) {
            physicsSystem.registerCollisionCallback('collisionFeedback', this.handleCollision.bind(this));
        }
        
        console.log('CollisionFeedbackSystem initialized with game engine');
    }
    
    /**
     * Handle collision between entities and trigger appropriate feedback
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
        
        // If we have a player-tile collision, create feedback
        if (player && tile) {
            this.createCollisionFeedback(player, tile);
        }
    }
    
    /**
     * Create visual feedback for a player-tile collision
     * @param {PlayerCharacter} player - The player character
     * @param {NumberTile} tile - The number tile
     */
    createCollisionFeedback(player, tile) {
        // Get current math problem to determine if answer is correct
        const mathContentSystem = this.gameEngine.getSystem('mathContent');
        const currentProblem = mathContentSystem ? mathContentSystem.getCurrentProblem() : null;
        
        if (!currentProblem) {
            console.warn('No current problem available for collision feedback');
            return;
        }
        
        const isCorrect = tile.getValue() === currentProblem.correctAnswer;
        const collisionPoint = {
            x: (player.position.x + tile.position.x) / 2 + (player.size.x + tile.size.x) / 4,
            y: (player.position.y + tile.position.y) / 2 + (player.size.y + tile.size.y) / 4
        };
        
        if (isCorrect) {
            this.createCorrectFeedback(player, tile, collisionPoint);
        } else {
            this.createIncorrectFeedback(player, tile, collisionPoint);
        }
    }
    
    /**
     * Create visual feedback for correct answer collision
     * @param {PlayerCharacter} player - The player character
     * @param {NumberTile} tile - The correct answer tile
     * @param {Object} collisionPoint - The collision point coordinates
     */
    createCorrectFeedback(player, tile, collisionPoint) {
        // Create highlight effect on player
        this.createPlayerHighlight(player, '#27ae60', this.config.correctFeedbackDuration);
        
        // Create tile highlight effect
        this.createTileHighlight(tile, '#2ecc71', this.config.correctFeedbackDuration);
        
        // Create success particles
        if (this.config.enableParticles) {
            this.createParticleEffect(collisionPoint, {
                color: '#27ae60',
                count: this.config.particleCount,
                speed: 100,
                spread: Math.PI * 2,
                lifetime: this.config.particleLifetime,
                type: 'success'
            });
        }
        
        // Create floating text feedback
        this.createFloatingText(collisionPoint, 'Correct!', {
            color: '#27ae60',
            fontSize: 24,
            duration: this.config.correctFeedbackDuration,
            animation: 'float-up'
        });
        
        // Create pulse animation on collision point
        this.createPulseAnimation(collisionPoint, {
            color: '#27ae60',
            maxRadius: 40,
            duration: 600,
            opacity: 0.6
        });
    }
    
    /**
     * Create visual feedback for incorrect answer collision
     * @param {PlayerCharacter} player - The player character
     * @param {NumberTile} tile - The incorrect answer tile
     * @param {Object} collisionPoint - The collision point coordinates
     */
    createIncorrectFeedback(player, tile, collisionPoint) {
        // Create highlight effect on player
        this.createPlayerHighlight(player, '#e74c3c', this.config.incorrectFeedbackDuration);
        
        // Create tile highlight effect
        this.createTileHighlight(tile, '#ec7063', this.config.incorrectFeedbackDuration);
        
        // Create error particles
        if (this.config.enableParticles) {
            this.createParticleEffect(collisionPoint, {
                color: '#e74c3c',
                count: this.config.particleCount * 1.5,
                speed: 80,
                spread: Math.PI * 2,
                lifetime: this.config.particleLifetime * 1.2,
                type: 'error'
            });
        }
        
        // Create floating text feedback
        this.createFloatingText(collisionPoint, 'Wrong!', {
            color: '#e74c3c',
            fontSize: 24,
            duration: this.config.incorrectFeedbackDuration,
            animation: 'shake-fade'
        });
        
        // Create screen shake effect
        if (this.config.enableScreenShake) {
            this.triggerScreenShake(this.config.screenShakeIntensity, this.config.screenShakeDuration);
        }
        
        // Create error pulse animation
        this.createPulseAnimation(collisionPoint, {
            color: '#e74c3c',
            maxRadius: 50,
            duration: 800,
            opacity: 0.4,
            pulseCount: 2
        });
    }
    
    /**
     * Create a highlight effect on the player character
     * @param {PlayerCharacter} player - The player to highlight
     * @param {string} color - The highlight color
     * @param {number} duration - Duration in milliseconds
     */
    createPlayerHighlight(player, color, duration) {
        const originalColor = player.originalColor;
        
        const feedback = {
            type: 'player-highlight',
            target: player,
            originalColor: originalColor,
            highlightColor: color,
            duration: duration,
            elapsed: 0,
            startTime: Date.now()
        };
        
        this.activeFeedbacks.push(feedback);
        
        // Immediately apply highlight and trigger animations
        player.color = color;
        player.triggerPulse(1.0);
        player.triggerGlow(0.8);
    }
    
    /**
     * Create a highlight effect on a number tile
     * @param {NumberTile} tile - The tile to highlight
     * @param {string} color - The highlight color
     * @param {number} duration - Duration in milliseconds
     */
    createTileHighlight(tile, color, duration) {
        const feedback = {
            type: 'tile-highlight',
            target: tile,
            originalHighlighted: tile.isHighlighted,
            highlightColor: color,
            duration: duration,
            elapsed: 0,
            startTime: Date.now()
        };
        
        this.activeFeedbacks.push(feedback);
        
        // Apply highlight and trigger animations
        tile.setHighlight(true);
        tile.highlightColor = color;
        tile.triggerGlow(1.0);
        tile.triggerScaleAnimation(1.15, duration / 1000);
    }
    
    /**
     * Create a particle effect at the specified position
     * @param {Object} position - Position {x, y}
     * @param {Object} config - Particle configuration
     */
    createParticleEffect(position, config) {
        for (let i = 0; i < config.count; i++) {
            const angle = (Math.PI * 2 * i) / config.count + Math.random() * 0.5;
            const speed = config.speed * (0.5 + Math.random() * 0.5);
            
            const particle = {
                x: position.x,
                y: position.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: config.color,
                size: 3 + Math.random() * 4,
                lifetime: config.lifetime,
                elapsed: 0,
                type: config.type,
                gravity: config.type === 'success' ? -50 : 20, // Success particles float up
                friction: 0.95
            };
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Create floating text feedback
     * @param {Object} position - Position {x, y}
     * @param {string} text - Text to display
     * @param {Object} config - Text configuration
     */
    createFloatingText(position, text, config) {
        const floatingText = {
            type: 'floating-text',
            x: position.x,
            y: position.y,
            text: text,
            color: config.color,
            fontSize: config.fontSize,
            duration: config.duration,
            elapsed: 0,
            animation: config.animation,
            startY: position.y,
            opacity: 1.0
        };
        
        this.activeFeedbacks.push(floatingText);
    }
    
    /**
     * Create a pulse animation at the specified position
     * @param {Object} position - Position {x, y}
     * @param {Object} config - Pulse configuration
     */
    createPulseAnimation(position, config) {
        const pulse = {
            type: 'pulse',
            x: position.x,
            y: position.y,
            color: config.color,
            maxRadius: config.maxRadius,
            duration: config.duration,
            elapsed: 0,
            opacity: config.opacity,
            pulseCount: config.pulseCount || 1,
            currentPulse: 0
        };
        
        this.animations.push(pulse);
    }
    
    /**
     * Trigger screen shake effect
     * @param {number} intensity - Shake intensity
     * @param {number} duration - Duration in milliseconds
     */
    triggerScreenShake(intensity, duration) {
        this.screenShake = {
            active: true,
            intensity: intensity,
            duration: duration,
            elapsed: 0,
            offsetX: 0,
            offsetY: 0
        };
    }
    
    /**
     * Update all active feedback effects and animations
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        const currentTime = Date.now();
        const deltaMs = deltaTime * 1000;
        
        // Update active feedback effects
        this.updateFeedbackEffects(deltaMs);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update animations
        this.updateAnimations(deltaMs);
        
        // Update screen shake
        this.updateScreenShake(deltaMs);
        
        // Clean up expired effects
        this.cleanupExpiredEffects();
    }
    
    /**
     * Update feedback effects (highlights, floating text)
     * @param {number} deltaMs - Time elapsed in milliseconds
     */
    updateFeedbackEffects(deltaMs) {
        for (const feedback of this.activeFeedbacks) {
            feedback.elapsed += deltaMs;
            const progress = feedback.elapsed / feedback.duration;
            
            if (feedback.type === 'player-highlight') {
                this.updatePlayerHighlight(feedback, progress);
            } else if (feedback.type === 'tile-highlight') {
                this.updateTileHighlight(feedback, progress);
            } else if (feedback.type === 'floating-text') {
                this.updateFloatingText(feedback, progress);
            }
        }
    }
    
    /**
     * Update player highlight effect
     * @param {Object} feedback - Feedback object
     * @param {number} progress - Animation progress (0-1)
     */
    updatePlayerHighlight(feedback, progress) {
        if (progress >= 1.0) {
            // Restore original color
            if (feedback.target && feedback.target.isActive()) {
                feedback.target.resetColor();
            }
        } else {
            // Interpolate between highlight and original color
            const alpha = this.easeOutQuart(1 - progress);
            if (feedback.target && feedback.target.isActive()) {
                feedback.target.color = this.interpolateColor(
                    feedback.originalColor,
                    feedback.highlightColor,
                    alpha
                );
            }
        }
    }
    
    /**
     * Update tile highlight effect
     * @param {Object} feedback - Feedback object
     * @param {number} progress - Animation progress (0-1)
     */
    updateTileHighlight(feedback, progress) {
        if (progress >= 1.0) {
            // Restore original highlight state
            if (feedback.target && feedback.target.isActive()) {
                feedback.target.setHighlight(feedback.originalHighlighted);
            }
        }
        // Tile highlight remains active during the duration
    }
    
    /**
     * Update floating text effect
     * @param {Object} feedback - Feedback object
     * @param {number} progress - Animation progress (0-1)
     */
    updateFloatingText(feedback, progress) {
        if (feedback.animation === 'float-up') {
            feedback.y = feedback.startY - (progress * 50);
            feedback.opacity = 1 - this.easeInQuart(progress);
        } else if (feedback.animation === 'shake-fade') {
            const shakeAmount = (1 - progress) * 3;
            feedback.x += (Math.random() - 0.5) * shakeAmount;
            feedback.opacity = 1 - this.easeInQuart(progress);
        }
    }
    
    /**
     * Update particle effects
     * @param {number} deltaTime - Time elapsed in seconds
     */
    updateParticles(deltaTime) {
        for (const particle of this.particles) {
            particle.elapsed += deltaTime * 1000;
            
            // Update position
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            
            // Apply gravity
            particle.vy += particle.gravity * deltaTime;
            
            // Apply friction
            particle.vx *= particle.friction;
            particle.vy *= particle.friction;
            
            // Update size (shrink over time)
            const progress = particle.elapsed / particle.lifetime;
            particle.currentSize = particle.size * (1 - progress);
            particle.opacity = 1 - this.easeInQuart(progress);
        }
    }
    
    /**
     * Update animation effects
     * @param {number} deltaMs - Time elapsed in milliseconds
     */
    updateAnimations(deltaMs) {
        for (const animation of this.animations) {
            animation.elapsed += deltaMs;
            
            if (animation.type === 'pulse') {
                this.updatePulseAnimation(animation);
            }
        }
    }
    
    /**
     * Update pulse animation
     * @param {Object} animation - Animation object
     */
    updatePulseAnimation(animation) {
        const progress = animation.elapsed / animation.duration;
        const pulseProgress = (progress * animation.pulseCount) % 1;
        
        // Create pulsing effect
        animation.currentRadius = animation.maxRadius * this.easeOutQuart(pulseProgress);
        animation.currentOpacity = animation.opacity * (1 - pulseProgress);
    }
    
    /**
     * Update screen shake effect
     * @param {number} deltaMs - Time elapsed in milliseconds
     */
    updateScreenShake(deltaMs) {
        if (!this.screenShake.active) return;
        
        this.screenShake.elapsed += deltaMs;
        const progress = this.screenShake.elapsed / this.screenShake.duration;
        
        if (progress >= 1.0) {
            this.screenShake.active = false;
            this.screenShake.offsetX = 0;
            this.screenShake.offsetY = 0;
        } else {
            const intensity = this.screenShake.intensity * (1 - this.easeOutQuart(progress));
            this.screenShake.offsetX = (Math.random() - 0.5) * intensity * 2;
            this.screenShake.offsetY = (Math.random() - 0.5) * intensity * 2;
        }
    }
    
    /**
     * Clean up expired effects
     */
    cleanupExpiredEffects() {
        // Remove expired feedback effects
        this.activeFeedbacks = this.activeFeedbacks.filter(
            feedback => feedback.elapsed < feedback.duration
        );
        
        // Remove expired particles
        this.particles = this.particles.filter(
            particle => particle.elapsed < particle.lifetime
        );
        
        // Remove expired animations
        this.animations = this.animations.filter(
            animation => animation.elapsed < animation.duration
        );
    }
    
    /**
     * Render all visual feedback effects
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    render(context) {
        context.save();
        
        // Apply screen shake offset
        if (this.screenShake.active) {
            context.translate(this.screenShake.offsetX, this.screenShake.offsetY);
        }
        
        // Render animations (behind other elements)
        this.renderAnimations(context);
        
        // Render particles
        this.renderParticles(context);
        
        // Render floating text
        this.renderFloatingText(context);
        
        context.restore();
    }
    
    /**
     * Render animation effects
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    renderAnimations(context) {
        for (const animation of this.animations) {
            if (animation.type === 'pulse') {
                this.renderPulseAnimation(context, animation);
            }
        }
    }
    
    /**
     * Render pulse animation
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     * @param {Object} animation - Animation object
     */
    renderPulseAnimation(context, animation) {
        if (animation.currentRadius <= 0 || animation.currentOpacity <= 0) return;
        
        context.save();
        context.globalAlpha = animation.currentOpacity;
        context.strokeStyle = animation.color;
        context.lineWidth = 3;
        
        context.beginPath();
        context.arc(animation.x, animation.y, animation.currentRadius, 0, Math.PI * 2);
        context.stroke();
        
        context.restore();
    }
    
    /**
     * Render particle effects
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    renderParticles(context) {
        for (const particle of this.particles) {
            if (particle.currentSize <= 0 || particle.opacity <= 0) continue;
            
            context.save();
            context.globalAlpha = particle.opacity;
            context.fillStyle = particle.color;
            
            context.beginPath();
            context.arc(particle.x, particle.y, particle.currentSize, 0, Math.PI * 2);
            context.fill();
            
            context.restore();
        }
    }
    
    /**
     * Render floating text effects
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    renderFloatingText(context) {
        for (const feedback of this.activeFeedbacks) {
            if (feedback.type !== 'floating-text' || feedback.opacity <= 0) continue;
            
            context.save();
            context.globalAlpha = feedback.opacity;
            context.fillStyle = feedback.color;
            context.font = `bold ${feedback.fontSize}px Arial`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            // Add text shadow for better visibility
            context.shadowColor = 'rgba(0, 0, 0, 0.5)';
            context.shadowBlur = 4;
            context.shadowOffsetX = 2;
            context.shadowOffsetY = 2;
            
            context.fillText(feedback.text, feedback.x, feedback.y);
            
            context.restore();
        }
    }
    
    /**
     * Interpolate between two colors
     * @param {string} color1 - First color (hex)
     * @param {string} color2 - Second color (hex)
     * @param {number} factor - Interpolation factor (0-1)
     * @returns {string} Interpolated color
     */
    interpolateColor(color1, color2, factor) {
        // Simple color interpolation for hex colors
        if (factor <= 0) return color1;
        if (factor >= 1) return color2;
        
        // For simplicity, return the target color if interpolation is complex
        return factor > 0.5 ? color2 : color1;
    }
    
    /**
     * Easing function: ease out quart
     * @param {number} t - Time parameter (0-1)
     * @returns {number} Eased value
     */
    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }
    
    /**
     * Easing function: ease in quart
     * @param {number} t - Time parameter (0-1)
     * @returns {number} Eased value
     */
    easeInQuart(t) {
        return t * t * t * t;
    }
    
    /**
     * Clear all active feedback effects
     */
    clearAllEffects() {
        this.activeFeedbacks = [];
        this.particles = [];
        this.animations = [];
        this.screenShake.active = false;
    }
    
    /**
     * Get feedback system statistics
     * @returns {Object} Statistics about active effects
     */
    getStats() {
        return {
            activeFeedbacks: this.activeFeedbacks.length,
            activeParticles: this.particles.length,
            activeAnimations: this.animations.length,
            screenShakeActive: this.screenShake.active
        };
    }
}

// Make CollisionFeedbackSystem available globally
window.CollisionFeedbackSystem = CollisionFeedbackSystem;