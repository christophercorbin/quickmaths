/**
 * PlayerCharacter - The player-controlled character entity
 * Extends Entity with movement capabilities and input handling
 */
class PlayerCharacter extends Entity {
    constructor(x = 0, y = 0, width = 40, height = 40) {
        super(x, y, width, height);
        
        // Movement properties
        this.movementSpeed = 200; // pixels per second
        this.inputBuffer = [];
        this.animationState = 'idle';
        
        // Visual properties
        this.color = '#e74c3c';
        this.borderColor = '#c0392b';
        this.originalColor = '#e74c3c'; // Store original color for feedback system
        
        // Animation properties
        this.animationTime = 0;
        this.pulseIntensity = 0;
        this.glowIntensity = 0;
        
        // Boundary constraints
        this.worldBounds = null;
        
        console.log('PlayerCharacter created at position:', this.position);
    }
    
    /**
     * Set the world boundaries for movement constraint
     * @param {Object} bounds - Object with width and height properties
     */
    setWorldBounds(bounds) {
        this.worldBounds = bounds;
    }
    
    /**
     * Apply input commands to character movement
     * @param {Object} inputState - Input state from InputSystem
     */
    applyInput(inputState) {
        if (!inputState || !inputState.isActive) {
            this.velocity.set(0, 0);
            this.animationState = 'idle';
            return;
        }
        
        // Apply movement based on input vector
        const movement = inputState.movementVector.multiply(this.movementSpeed);
        this.setVelocity(movement.x, movement.y);
        
        // Update animation state based on movement
        if (inputState.isActive) {
            this.animationState = 'moving';
        } else {
            this.animationState = 'idle';
        }
    }
    
    /**
     * Move toward a specific target position
     * @param {Vector2D} targetPosition - The target position to move toward
     * @param {number} speed - Optional speed override
     */
    moveToward(targetPosition, speed = null) {
        const moveSpeed = speed || this.movementSpeed;
        const direction = targetPosition.subtract(this.position).normalize();
        const movement = direction.multiply(moveSpeed);
        this.setVelocity(movement.x, movement.y);
        this.animationState = 'moving';
    }
    
    /**
     * Update the player character
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        // Update animation time
        this.animationTime += deltaTime;
        
        // Update animation properties
        this.updateAnimations(deltaTime);
        
        // Call parent update to handle basic movement
        super.update(deltaTime);
        
        // Constrain movement within world boundaries
        this.constrainToWorldBounds();
        
        // Process any buffered input commands
        this.processInputBuffer(deltaTime);
    }
    
    /**
     * Update animation properties for smooth visual effects
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    updateAnimations(deltaTime) {
        // Decay pulse intensity over time
        if (this.pulseIntensity > 0) {
            this.pulseIntensity = Math.max(0, this.pulseIntensity - deltaTime * 3);
        }
        
        // Decay glow intensity over time
        if (this.glowIntensity > 0) {
            this.glowIntensity = Math.max(0, this.glowIntensity - deltaTime * 2);
        }
        
        // Smooth movement animation
        if (this.isMoving()) {
            this.animationState = 'moving';
        } else {
            this.animationState = 'idle';
        }
    }
    
    /**
     * Constrain the player character within world boundaries
     */
    constrainToWorldBounds() {
        if (!this.worldBounds) return;
        
        // Constrain X position
        if (this.position.x < 0) {
            this.position.x = 0;
            this.velocity.x = 0;
        } else if (this.position.x + this.size.x > this.worldBounds.width) {
            this.position.x = this.worldBounds.width - this.size.x;
            this.velocity.x = 0;
        }
        
        // Constrain Y position
        if (this.position.y < 0) {
            this.position.y = 0;
            this.velocity.y = 0;
        } else if (this.position.y + this.size.y > this.worldBounds.height) {
            this.position.y = this.worldBounds.height - this.size.y;
            this.velocity.y = 0;
        }
    }
    
    /**
     * Process buffered input commands
     * @param {number} deltaTime - Time elapsed since last update
     */
    processInputBuffer(deltaTime) {
        // Process any queued input commands
        while (this.inputBuffer.length > 0) {
            const command = this.inputBuffer.shift();
            this.executeInputCommand(command, deltaTime);
        }
    }
    
    /**
     * Execute a specific input command
     * @param {Object} command - The input command to execute
     * @param {number} deltaTime - Time elapsed since last update
     */
    executeInputCommand(command, deltaTime) {
        switch (command.type) {
            case 'move':
                this.applyInput(command.inputState);
                break;
            case 'moveToward':
                this.moveToward(command.target, command.speed);
                break;
            default:
                console.warn('Unknown input command type:', command.type);
        }
    }
    
    /**
     * Add an input command to the buffer
     * @param {Object} command - The input command to buffer
     */
    bufferInputCommand(command) {
        this.inputBuffer.push(command);
    }
    
    /**
     * Render the player character with visual feedback
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    render(context) {
        context.save();
        
        // Apply transformations
        context.translate(this.position.x + this.size.x / 2, this.position.y + this.size.y / 2);
        context.rotate(this.rotation);
        context.translate(-this.size.x / 2, -this.size.y / 2);
        
        // Render player character
        this.renderPlayerCharacter(context);
        
        context.restore();
    }
    
    /**
     * Render the player character appearance with smooth animations
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    renderPlayerCharacter(context) {
        // Calculate animation effects
        const pulseScale = 1 + this.pulseIntensity * 0.2;
        const movementPulse = this.animationState === 'moving' ? 
            1 + Math.sin(this.animationTime * 8) * 0.05 : 1;
        const totalScale = pulseScale * movementPulse;
        
        // Apply scaling for animations
        context.save();
        context.scale(totalScale, totalScale);
        const scaledSize = {
            x: this.size.x / totalScale,
            y: this.size.y / totalScale
        };
        
        // Add glow effect if active
        if (this.glowIntensity > 0) {
            context.shadowColor = this.color;
            context.shadowBlur = 15 * this.glowIntensity;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;
        }
        
        // Main body
        context.fillStyle = this.color;
        context.strokeStyle = this.borderColor;
        context.lineWidth = 3;
        
        // Draw rounded rectangle for more appealing look
        this.drawRoundedRect(context, 0, 0, scaledSize.x, scaledSize.y, 8);
        
        // Add visual feedback based on animation state
        if (this.animationState === 'moving') {
            // Add a subtle inner glow effect when moving
            const gradient = context.createRadialGradient(
                scaledSize.x / 2, scaledSize.y / 2, 0,
                scaledSize.x / 2, scaledSize.y / 2, scaledSize.x / 2
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            context.fillStyle = gradient;
            context.fill();
            context.fillStyle = this.color; // Reset fill style
        }
        
        context.fill();
        context.stroke();
        
        // Reset shadow
        context.shadowBlur = 0;
        
        // Add player indicator (simple dot in center)
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(scaledSize.x / 2, scaledSize.y / 2, 4, 0, Math.PI * 2);
        context.fill();
        
        // Add directional indicator if moving
        if (this.animationState === 'moving' && this.velocity.magnitude() > 0) {
            this.renderDirectionIndicator(context, scaledSize);
        }
        
        context.restore();
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
     * Render a directional indicator showing movement direction
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     * @param {Object} size - The scaled size of the player
     */
    renderDirectionIndicator(context, size = null) {
        const actualSize = size || this.size;
        const direction = this.velocity.normalize();
        const centerX = actualSize.x / 2;
        const centerY = actualSize.y / 2;
        const arrowLength = 12;
        
        context.strokeStyle = '#ffffff';
        context.lineWidth = 2;
        context.lineCap = 'round';
        
        // Draw arrow pointing in movement direction
        const endX = centerX + direction.x * arrowLength;
        const endY = centerY + direction.y * arrowLength;
        
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(endX, endY);
        context.stroke();
        
        // Draw arrowhead
        const arrowHeadSize = 4;
        const perpendicular = new Vector2D(-direction.y, direction.x);
        
        context.beginPath();
        context.moveTo(endX, endY);
        context.lineTo(
            endX - direction.x * arrowHeadSize + perpendicular.x * arrowHeadSize,
            endY - direction.y * arrowHeadSize + perpendicular.y * arrowHeadSize
        );
        context.moveTo(endX, endY);
        context.lineTo(
            endX - direction.x * arrowHeadSize - perpendicular.x * arrowHeadSize,
            endY - direction.y * arrowHeadSize - perpendicular.y * arrowHeadSize
        );
        context.stroke();
    }
    
    /**
     * Get the player's current movement speed
     * @returns {number} The movement speed in pixels per second
     */
    getMovementSpeed() {
        return this.movementSpeed;
    }
    
    /**
     * Set the player's movement speed
     * @param {number} speed - The new movement speed in pixels per second
     */
    setMovementSpeed(speed) {
        this.movementSpeed = Math.max(0, speed);
    }
    
    /**
     * Get the current animation state
     * @returns {string} The current animation state
     */
    getAnimationState() {
        return this.animationState;
    }
    
    /**
     * Check if the player is currently moving
     * @returns {boolean} True if the player is moving
     */
    isMoving() {
        return this.velocity.magnitude() > 0;
    }
    
    /**
     * Stop the player character immediately
     */
    stop() {
        this.velocity.set(0, 0);
        this.animationState = 'idle';
        this.inputBuffer.length = 0; // Clear input buffer
    }
    
    /**
     * Trigger a pulse animation effect
     * @param {number} intensity - Pulse intensity (0-1)
     */
    triggerPulse(intensity = 1.0) {
        this.pulseIntensity = Math.max(this.pulseIntensity, intensity);
    }
    
    /**
     * Trigger a glow animation effect
     * @param {number} intensity - Glow intensity (0-1)
     */
    triggerGlow(intensity = 1.0) {
        this.glowIntensity = Math.max(this.glowIntensity, intensity);
    }
    
    /**
     * Reset color to original
     */
    resetColor() {
        this.color = this.originalColor;
    }
}

// Make PlayerCharacter available globally
window.PlayerCharacter = PlayerCharacter;