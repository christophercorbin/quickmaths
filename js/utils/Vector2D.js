/**
 * Vector2D - A 2D vector utility class for position, velocity, and mathematical operations
 */
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    /**
     * Add another vector to this vector
     * @param {Vector2D} other - The vector to add
     * @returns {Vector2D} A new vector with the result
     */
    add(other) {
        return new Vector2D(this.x + other.x, this.y + other.y);
    }
    
    /**
     * Subtract another vector from this vector
     * @param {Vector2D} other - The vector to subtract
     * @returns {Vector2D} A new vector with the result
     */
    subtract(other) {
        return new Vector2D(this.x - other.x, this.y - other.y);
    }
    
    /**
     * Multiply this vector by a scalar
     * @param {number} scalar - The scalar to multiply by
     * @returns {Vector2D} A new vector with the result
     */
    multiply(scalar) {
        return new Vector2D(this.x * scalar, this.y * scalar);
    }
    
    /**
     * Get the magnitude (length) of this vector
     * @returns {number} The magnitude of the vector
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    /**
     * Get a normalized version of this vector (unit vector)
     * @returns {Vector2D} A new normalized vector
     */
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) {
            return new Vector2D(0, 0);
        }
        return new Vector2D(this.x / mag, this.y / mag);
    }
    
    /**
     * Get the distance to another vector
     * @param {Vector2D} other - The other vector
     * @returns {number} The distance between vectors
     */
    distanceTo(other) {
        return this.subtract(other).magnitude();
    }
    
    /**
     * Create a copy of this vector
     * @returns {Vector2D} A new vector with the same values
     */
    clone() {
        return new Vector2D(this.x, this.y);
    }
    
    /**
     * Set the values of this vector
     * @param {number} x - The x component
     * @param {number} y - The y component
     */
    set(x, y) {
        this.x = x;
        this.y = y;
    }
    
    /**
     * Check if this vector equals another vector
     * @param {Vector2D} other - The other vector
     * @returns {boolean} True if vectors are equal
     */
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }
}

// Make Vector2D available globally
window.Vector2D = Vector2D;