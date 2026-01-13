/**
 * Entity - Base class for all game objects
 * Provides common functionality for position, velocity, size, and component management
 */
class Entity {
    constructor(x = 0, y = 0, width = 32, height = 32) {
        this.id = this.generateId();
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        this.size = new Vector2D(width, height);
        this.rotation = 0;
        this.components = new Map();
        this.active = true;
    }
    
    /**
     * Generate a unique ID for this entity
     * @returns {string} A unique identifier
     */
    generateId() {
        return 'entity_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    /**
     * Update the entity's state
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        if (!this.active) return;
        
        // Apply velocity to position
        this.position = this.position.add(this.velocity.multiply(deltaTime));
        
        // Update all components
        for (const [type, component] of this.components) {
            if (component.update) {
                component.update(deltaTime);
            }
        }
    }
    
    /**
     * Render the entity
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    render(context) {
        if (!this.active) return;
        
        context.save();
        
        // Apply transformations
        context.translate(this.position.x + this.size.x / 2, this.position.y + this.size.y / 2);
        context.rotate(this.rotation);
        context.translate(-this.size.x / 2, -this.size.y / 2);
        
        // Render all components
        for (const [type, component] of this.components) {
            if (component.render) {
                component.render(context);
            }
        }
        
        // Default rendering (simple rectangle)
        this.renderDefault(context);
        
        context.restore();
    }
    
    /**
     * Default rendering method - draws a simple rectangle
     * @param {CanvasRenderingContext2D} context - The canvas rendering context
     */
    renderDefault(context) {
        context.fillStyle = '#3498db';
        context.strokeStyle = '#2980b9';
        context.lineWidth = 2;
        
        context.fillRect(0, 0, this.size.x, this.size.y);
        context.strokeRect(0, 0, this.size.x, this.size.y);
    }
    
    /**
     * Add a component to this entity
     * @param {string} type - The component type identifier
     * @param {Object} component - The component instance
     */
    addComponent(type, component) {
        this.components.set(type, component);
        if (component.setEntity) {
            component.setEntity(this);
        }
    }
    
    /**
     * Get a component by type
     * @param {string} type - The component type identifier
     * @returns {Object|null} The component instance or null if not found
     */
    getComponent(type) {
        return this.components.get(type) || null;
    }
    
    /**
     * Remove a component by type
     * @param {string} type - The component type identifier
     * @returns {boolean} True if component was removed, false if not found
     */
    removeComponent(type) {
        return this.components.delete(type);
    }
    
    /**
     * Check if this entity has a specific component
     * @param {string} type - The component type identifier
     * @returns {boolean} True if component exists
     */
    hasComponent(type) {
        return this.components.has(type);
    }
    
    /**
     * Get the bounding box of this entity
     * @returns {Object} Object with x, y, width, height properties
     */
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.size.x,
            height: this.size.y
        };
    }
    
    /**
     * Get the center position of this entity
     * @returns {Vector2D} The center position
     */
    getCenter() {
        return new Vector2D(
            this.position.x + this.size.x / 2,
            this.position.y + this.size.y / 2
        );
    }
    
    /**
     * Set the position of this entity
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    setPosition(x, y) {
        this.position.set(x, y);
    }
    
    /**
     * Set the velocity of this entity
     * @param {number} x - The x velocity
     * @param {number} y - The y velocity
     */
    setVelocity(x, y) {
        this.velocity.set(x, y);
    }
    
    /**
     * Destroy this entity (mark as inactive)
     */
    destroy() {
        this.active = false;
    }
    
    /**
     * Check if this entity is active
     * @returns {boolean} True if entity is active
     */
    isActive() {
        return this.active;
    }
}

// Make Entity available globally
window.Entity = Entity;