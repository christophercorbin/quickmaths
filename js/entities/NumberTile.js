/**
 * NumberTile - Moving tile entities that represent answer options for math problems
 * Extends Entity with value display, movement patterns, and collision handling
 */
class NumberTile extends Entity {
    constructor(x = 0, y = 0, value = 0, isCorrectAnswer = false, width = 60, height = 60) {
        super(x, y, width, height);
        
        // Core properties
        this.value = value;
        this.isCorrectAnswer = isCorrectAnswer;
        
        // Visual properties
        this.baseColor = isCorrectAnswer ? '#27ae60' : '#3498db';
        this.highlightColor = isCorrectAnswer ? '#2ecc71' : '#5dade2';
        this.borderColor = isCorrectAnswer ? '#1e8449' : '#2980b9';
        this.textColor = '#ffffff';
        this.isHighlighted = false;
        
        // Movement properties
        this.movementPattern = this.generateMovementPattern();
        this.baseSpeed = this.randomFloat(50, 150); // pixels per second
        this.currentSpeed = this.baseSpeed;
        this.movementTime = 0; // Time accumulator for pattern calculations
        
        // Animation properties
        this.pulsePhase = Math.random() * Math.PI * 2; // Random starting phase
        this.rotationSpeed = this.randomFloat(-1, 1); // radians per second
        this.animationTime = 0; // Animation time accumulator
        this.scaleAnimation = 1.0; // Scale animation factor
        this.glowIntensity = 0; // Glow effect intensity
        
        // Boundary constraints
        this.worldBounds = null;
        this.removeWhenOffScreen = true;
        
        console.log(`NumberTile created: value=${value}, correct=${isCorrectAnswer}, pattern=${this.movementPattern.type}`);
    }
    
    /**
     * Generate a random movement pattern for this tile
     * @returns {Object} Movement pattern configuration
     */
    generateMovementPattern() {
        const patterns = [
            { type: 'linear', direction: this.randomDirection() },
            { type: 'sine', direction: this.randomDirection(), amplitude: this.randomFloat(20, 60), frequency: this.randomFloat(1, 3) },
            { type: 'circular', radius: this.randomFloat(30, 80), angularSpeed: this.randomFloat(1, 4) },
            { type: 'zigzag', direction: this.randomDirection(), changeInterval: this.randomFloat(0.5, 2.0) },
            { type: 'spiral', direction: this.randomDirection(), spiralRate: this.randomFloat(0.1, 0.5) }
        ];
        
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        // Add some randomization to the selected pattern
        if (selectedPattern.type === 'linear') {
            // Add slight variation to linear movement
            selectedPattern.variation = this.randomFloat(0.1, 0.3);
        }
        
        return selectedPattern;
    }
    
    /**
     * Generate a random direction vector
     * @returns {Vector2D} Normalized direction vector
     */
    randomDirection() {
        const angle = Math.random() * Math.PI * 2;
        return new Vector2D(Math.cos(angle), Math.sin(angle));
    }
    
    /**
     * Generate a random float between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random float
     */
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    /**
     * Set the world boundaries for movement constraint
     * @param {Object} bounds - Object with width and height properties
     */
    setWorldBounds(bounds) {
        this.worldBounds = bounds;
    }
    
    /**
     * Update the number tile's movement and animation
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        // Update movement time accumulator
        this.movementTime += deltaTime;
        
        // Update animation time
        this.animationTime += deltaTime;
        
        // Update animations
        this.updateAnimations(deltaTime);
        
        // Update movement based on pattern
        this.updateMovement(deltaTime);
        
        // Apply collision avoidance with other tiles
        this.applyCollisionAvoidance(deltaTime);
        
        // Update rotation animation
        this.rotation += this.rotationSpeed * deltaTime;
        
        // Call parent update to apply velocity to position
        super.update(deltaTime);
        
        // Check if tile should be removed when off-screen
        if (this.removeWhenOffScreen && this.isOffScreen()) {
            this.destroy();
        }
    }
    
    /**
     * Update animation properties for smooth visual effects
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    updateAnimations(deltaTime) {
        // Decay glow intensity over time
        if (this.glowIntensity > 0) {
            this.glowIntensity = Math.max(0, this.glowIntensity - deltaTime * 2);
        }
        
        // Smooth scale animation (breathing effect)
        const breathingSpeed = 2.0;
        const breathingAmount = 0.03;
        this.scaleAnimation = 1.0 + Math.sin(this.animationTime * breathingSpeed) * breathingAmount;
        
        // Enhanced pulse for correct answers
        if (this.isCorrectAnswer) {
            const correctPulse = Math.sin(this.animationTime * 3) * 0.02;
            this.scaleAnimation += correctPulse;
        }
    }
    
    /**
     * Apply collision avoidance with other tiles to prevent stacking
     * @param {number} deltaTime - Time elapsed since last update
     */
    applyCollisionAvoidance(deltaTime) {
        // Get reference to game engine to find other tiles
        if (!window.gameEngine) return;
        
        const avoidanceRadius = 70; // Distance to start avoiding other tiles
        const avoidanceForce = 100; // Strength of avoidance force
        
        let avoidanceVelocity = new Vector2D(0, 0);
        let nearbyTileCount = 0;
        
        // Check all entities for other NumberTiles
        for (const [id, entity] of window.gameEngine.entities) {
            if (entity instanceof NumberTile && entity !== this && entity.isActive()) {
                const dx = this.position.x - entity.position.x;
                const dy = this.position.y - entity.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < avoidanceRadius && distance > 0) {
                    // Calculate avoidance direction (away from other tile)
                    const avoidanceDirection = new Vector2D(dx / distance, dy / distance);
                    
                    // Stronger avoidance for closer tiles
                    const avoidanceStrength = (avoidanceRadius - distance) / avoidanceRadius;
                    const avoidanceVector = avoidanceDirection.multiply(avoidanceForce * avoidanceStrength);
                    
                    avoidanceVelocity = avoidanceVelocity.add(avoidanceVector);
                    nearbyTileCount++;
                }
            }
        }
        
        // Apply avoidance velocity if there are nearby tiles
        if (nearbyTileCount > 0) {
            // Average the avoidance force
            avoidanceVelocity = avoidanceVelocity.multiply(1 / nearbyTileCount);
            
            // Apply avoidance as a temporary velocity adjustment
            const avoidanceAdjustment = avoidanceVelocity.multiply(deltaTime);
            this.velocity = this.velocity.add(avoidanceAdjustment);
            
            // Limit velocity to prevent excessive speeds
            const maxSpeed = this.currentSpeed * 1.5;
            if (this.velocity.magnitude() > maxSpeed) {
                this.velocity = this.velocity.normalize().multiply(maxSpeed);
            }
        }
    }
    
    /**
     * Update movement based on the tile's movement pattern
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateMovement(deltaTime) {
        const pattern = this.movementPattern;
        let targetVelocity = new Vector2D(0, 0);
        
        switch (pattern.type) {
            case 'linear':
                targetVelocity = this.updateLinearMovement(pattern, deltaTime);
                break;
                
            case 'sine':
                targetVelocity = this.updateSineMovement(pattern, deltaTime);
                break;
                
            case 'circular':
                targetVelocity = this.updateCircularMovement(pattern, deltaTime);
                break;
                
            case 'zigzag':
                targetVelocity = this.updateZigzagMovement(pattern, deltaTime);
                break;
                
            case 'spiral':
                targetVelocity = this.updateSpiralMovement(pattern, deltaTime);
                break;
                
            default:
                // Fallback to simple linear movement
                targetVelocity = pattern.direction.multiply(this.currentSpeed);
        }
        
        // Apply velocity smoothing to prevent jarring movement changes
        const smoothingFactor = Math.min(1.0, deltaTime * 8); // Smooth over ~0.125 seconds
        const currentVelocity = this.velocity || new Vector2D(0, 0);
        
        // Interpolate between current and target velocity
        const smoothedVelocity = new Vector2D(
            currentVelocity.x + (targetVelocity.x - currentVelocity.x) * smoothingFactor,
            currentVelocity.y + (targetVelocity.y - currentVelocity.y) * smoothingFactor
        );
        
        // Limit maximum velocity change per frame for smoothness
        const maxVelocityChange = this.currentSpeed * 2 * deltaTime; // Max 2x speed change per second
        const velocityChange = smoothedVelocity.subtract(currentVelocity);
        const velocityChangeMagnitude = velocityChange.magnitude();
        
        if (velocityChangeMagnitude > maxVelocityChange) {
            const limitedVelocityChange = velocityChange.normalize().multiply(maxVelocityChange);
            this.setVelocity(
                currentVelocity.x + limitedVelocityChange.x,
                currentVelocity.y + limitedVelocityChange.y
            );
        } else {
            this.setVelocity(smoothedVelocity.x, smoothedVelocity.y);
        }
    }
    
    /**
     * Update linear movement with optional variation
     * @param {Object} pattern - Movement pattern configuration
     * @param {number} deltaTime - Time elapsed since last update
     * @returns {Vector2D} New velocity vector
     */
    updateLinearMovement(pattern, deltaTime) {
        let direction = pattern.direction;
        
        // Add slight variation if configured
        if (pattern.variation) {
            const variationAngle = Math.sin(this.movementTime * 2) * pattern.variation;
            const cos = Math.cos(variationAngle);
            const sin = Math.sin(variationAngle);
            
            direction = new Vector2D(
                direction.x * cos - direction.y * sin,
                direction.x * sin + direction.y * cos
            );
        }
        
        return direction.multiply(this.currentSpeed);
    }
    
    /**
     * Update sine wave movement
     * @param {Object} pattern - Movement pattern configuration
     * @param {number} deltaTime - Time elapsed since last update
     * @returns {Vector2D} New velocity vector
     */
    updateSineMovement(pattern, deltaTime) {
        // Base movement in the primary direction
        const baseMovement = pattern.direction.multiply(this.currentSpeed);
        
        // Perpendicular sine wave motion - calculate velocity, not position
        const perpendicular = new Vector2D(-pattern.direction.y, pattern.direction.x);
        
        // Calculate sine wave velocity (derivative of sine position)
        const sineVelocity = Math.cos(this.movementTime * pattern.frequency) * 
                            pattern.frequency * pattern.amplitude;
        const sineMovement = perpendicular.multiply(sineVelocity);
        
        return baseMovement.add(sineMovement);
    }
    
    /**
     * Update circular movement
     * @param {Object} pattern - Movement pattern configuration
     * @param {number} deltaTime - Time elapsed since last update
     * @returns {Vector2D} New velocity vector
     */
    updateCircularMovement(pattern, deltaTime) {
        // Calculate current angle and angular velocity
        const angle = this.movementTime * pattern.angularSpeed;
        
        // Calculate tangent velocity for smooth circular motion
        const tangentVelocityX = -pattern.radius * pattern.angularSpeed * Math.sin(angle);
        const tangentVelocityY = pattern.radius * pattern.angularSpeed * Math.cos(angle);
        
        // Scale velocity to match the desired speed
        const tangentVelocity = new Vector2D(tangentVelocityX, tangentVelocityY);
        const currentMagnitude = tangentVelocity.magnitude();
        
        if (currentMagnitude > 0) {
            const scaleFactor = this.currentSpeed / currentMagnitude;
            return tangentVelocity.multiply(scaleFactor);
        }
        
        return new Vector2D(0, 0);
    }
    
    /**
     * Update zigzag movement
     * @param {Object} pattern - Movement pattern configuration
     * @param {number} deltaTime - Time elapsed since last update
     * @returns {Vector2D} New velocity vector
     */
    updateZigzagMovement(pattern, deltaTime) {
        // Change direction at intervals
        const intervalCount = Math.floor(this.movementTime / pattern.changeInterval);
        const shouldReverse = intervalCount % 2 === 1;
        
        let direction = pattern.direction;
        if (shouldReverse) {
            // Reverse perpendicular component for zigzag effect
            const perpendicular = new Vector2D(-pattern.direction.y, pattern.direction.x);
            direction = pattern.direction.add(perpendicular.multiply(0.5));
            direction = direction.normalize();
        }
        
        return direction.multiply(this.currentSpeed);
    }
    
    /**
     * Update spiral movement
     * @param {Object} pattern - Movement pattern configuration
     * @param {number} deltaTime - Time elapsed since last update
     * @returns {Vector2D} New velocity vector
     */
    updateSpiralMovement(pattern, deltaTime) {
        // Combine linear movement with increasing circular component
        const spiralFactor = this.movementTime * pattern.spiralRate;
        const angle = this.movementTime * 2; // Angular speed for spiral
        
        const linearComponent = pattern.direction.multiply(this.currentSpeed);
        const spiralComponent = new Vector2D(
            Math.cos(angle) * spiralFactor * 20,
            Math.sin(angle) * spiralFactor * 20
        );
        
        return linearComponent.add(spiralComponent);
    }
    
    /**
     * Check if the tile is off-screen
     * @returns {boolean} True if tile is completely off-screen
     */
    isOffScreen() {
        if (!this.worldBounds) return false;
        
        const bounds = this.getBounds();
        const margin = 50; // Allow some margin before removal
        
        return (
            bounds.x + bounds.width < -margin ||
            bounds.x > this.worldBounds.width + margin ||
            bounds.y + bounds.height < -margin ||
            bounds.y > this.worldBounds.height + margin
        );
    }
    
    /**
     * Set highlight state for visual feedback
     * @param {boolean} highlighted - Whether the tile should be highlighted
     */
    setHighlight(highlighted) {
        this.isHighlighted = highlighted;
    }
    
    /**
     * Handle collision with another entity
     * @param {Entity} otherEntity - The entity this tile collided with
     */
    onCollision(otherEntity) {
        // This method will be called by the PhysicsSystem when a collision occurs
        console.log(`NumberTile ${this.value} collided with entity ${otherEntity.constructor.name}`);
        
        // The collision handling logic will be implemented in task 5.3
        // For now, just log the collision
    }
    
    /**
     * Render the number tile with its value and visual effects
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    render(context) {
        context.save();
        
        // Apply transformations
        context.translate(this.position.x + this.size.x / 2, this.position.y + this.size.y / 2);
        context.rotate(this.rotation);
        context.translate(-this.size.x / 2, -this.size.y / 2);
        
        // Render the tile
        this.renderTile(context);
        
        context.restore();
    }
    
    /**
     * Render the tile appearance with value display and smooth animations
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    renderTile(context) {
        // Calculate pulse effect for visual appeal
        const pulseScale = 1 + Math.sin(this.movementTime * 4 + this.pulsePhase) * 0.05;
        const totalScale = pulseScale * this.scaleAnimation;
        const currentColor = this.isHighlighted ? this.highlightColor : this.baseColor;
        
        // Apply scaling for animations
        context.save();
        context.scale(totalScale, totalScale);
        const scaledSize = {
            x: this.size.x / totalScale,
            y: this.size.y / totalScale
        };
        
        // Add glow effect if active
        if (this.glowIntensity > 0 || this.isHighlighted) {
            const glowAmount = Math.max(this.glowIntensity, this.isHighlighted ? 0.5 : 0);
            context.shadowColor = currentColor;
            context.shadowBlur = 15 * glowAmount;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;
        }
        
        // Draw tile background
        context.fillStyle = currentColor;
        context.strokeStyle = this.borderColor;
        context.lineWidth = 3;
        
        // Draw rounded rectangle for the tile
        this.drawRoundedRect(context, 0, 0, scaledSize.x, scaledSize.y, 8);
        context.fill();
        context.stroke();
        
        // Reset shadow
        context.shadowBlur = 0;
        
        // Add subtle gradient effect
        if (this.isCorrectAnswer) {
            const gradient = context.createRadialGradient(
                scaledSize.x / 2, scaledSize.y / 2, 0,
                scaledSize.x / 2, scaledSize.y / 2, scaledSize.x / 2
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            context.fillStyle = gradient;
            context.fill();
        }
        
        // Draw the value text
        this.renderValue(context, scaledSize);
        
        // Add visual indicator for correct answer
        if (this.isCorrectAnswer) {
            this.renderCorrectIndicator(context, scaledSize);
        }
        
        context.restore();
    }
    
    /**
     * Render the tile's value as text
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     * @param {Object} size - The scaled size of the tile
     */
    renderValue(context, size) {
        context.fillStyle = this.textColor;
        context.font = 'bold 18px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Add text shadow for better readability
        context.shadowColor = 'rgba(0, 0, 0, 0.5)';
        context.shadowBlur = 2;
        context.shadowOffsetX = 1;
        context.shadowOffsetY = 1;
        
        // Draw the value
        context.fillText(
            this.value.toString(),
            size.x / 2,
            size.y / 2
        );
        
        // Reset shadow
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
    }
    
    /**
     * Render a subtle indicator for correct answers
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     * @param {Object} size - The scaled size of the tile
     */
    renderCorrectIndicator(context, size) {
        // Draw a small star or checkmark in the corner
        const indicatorSize = 8;
        const margin = 4;
        
        context.fillStyle = '#f1c40f';
        context.strokeStyle = '#f39c12';
        context.lineWidth = 1;
        
        // Draw a small star
        const centerX = size.x - margin - indicatorSize;
        const centerY = margin + indicatorSize;
        
        this.drawStar(context, centerX, centerY, indicatorSize / 2, 5);
        context.fill();
        context.stroke();
    }
    
    /**
     * Draw a rounded rectangle
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
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
     * Draw a star shape
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {number} radius - Star radius
     * @param {number} points - Number of star points
     */
    drawStar(context, centerX, centerY, radius, points) {
        const innerRadius = radius * 0.4;
        const angleStep = Math.PI / points;
        
        context.beginPath();
        
        for (let i = 0; i < points * 2; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const currentRadius = i % 2 === 0 ? radius : innerRadius;
            const x = centerX + Math.cos(angle) * currentRadius;
            const y = centerY + Math.sin(angle) * currentRadius;
            
            if (i === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        }
        
        context.closePath();
    }
    
    /**
     * Get the tile's value
     * @returns {number} The tile's numeric value
     */
    getValue() {
        return this.value;
    }
    
    /**
     * Check if this tile represents the correct answer
     * @returns {boolean} True if this is the correct answer
     */
    isCorrect() {
        return this.isCorrectAnswer;
    }
    
    /**
     * Set the movement speed of the tile
     * @param {number} speed - New speed in pixels per second
     */
    setSpeed(speed) {
        this.currentSpeed = Math.max(0, speed);
    }
    
    /**
     * Get the current movement speed
     * @returns {number} Current speed in pixels per second
     */
    getSpeed() {
        return this.currentSpeed;
    }
    
    /**
     * Set the movement pattern type (for testing purposes)
     * @param {string} patternType - The movement pattern type
     */
    setMovementPattern(patternType) {
        // Update the movement pattern type
        const currentPattern = this.movementPattern;
        
        switch (patternType) {
            case 'linear':
                this.movementPattern = { 
                    type: 'linear', 
                    direction: currentPattern.direction || this.randomDirection(),
                    variation: this.randomFloat(0.1, 0.3)
                };
                break;
            case 'sine':
                this.movementPattern = { 
                    type: 'sine', 
                    direction: currentPattern.direction || this.randomDirection(),
                    amplitude: this.randomFloat(20, 60),
                    frequency: this.randomFloat(1, 3)
                };
                break;
            case 'circular':
                this.movementPattern = { 
                    type: 'circular', 
                    radius: this.randomFloat(30, 80),
                    angularSpeed: this.randomFloat(1, 4)
                };
                break;
            case 'zigzag':
                this.movementPattern = { 
                    type: 'zigzag', 
                    direction: currentPattern.direction || this.randomDirection(),
                    changeInterval: this.randomFloat(0.5, 2.0)
                };
                break;
            case 'spiral':
                this.movementPattern = { 
                    type: 'spiral', 
                    direction: currentPattern.direction || this.randomDirection(),
                    spiralRate: this.randomFloat(0.1, 0.5)
                };
                break;
            default:
                // Keep current pattern if unknown type
                break;
        }
    }

    /**
     * Get the movement pattern type
     * @returns {string} The movement pattern type
     */
    getMovementPatternType() {
        return this.movementPattern.type;
    }
    
    /**
     * Trigger a glow animation effect
     * @param {number} intensity - Glow intensity (0-1)
     */
    triggerGlow(intensity = 1.0) {
        this.glowIntensity = Math.max(this.glowIntensity, intensity);
    }
    
    /**
     * Trigger a scale animation effect
     * @param {number} scale - Scale factor
     * @param {number} duration - Animation duration in seconds
     */
    triggerScaleAnimation(scale = 1.2, duration = 0.5) {
        // Simple scale animation - could be enhanced with easing
        this.scaleAnimation = scale;
        
        // Reset scale over time (simplified)
        setTimeout(() => {
            this.scaleAnimation = 1.0;
        }, duration * 1000);
    }
}

// Make NumberTile available globally
window.NumberTile = NumberTile;