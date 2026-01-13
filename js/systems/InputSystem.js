/**
 * InputSystem - Handles keyboard and touch input for the game
 * Normalizes different input types into consistent movement commands
 */
class InputSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.keyState = new Map();
        this.touchState = {
            isActive: false,
            startPosition: null,
            currentPosition: null,
            deltaPosition: null
        };
        
        // System references
        this.responsiveSystem = null;
        
        // Input configuration
        this.keyBindings = new Map([
            ['ArrowUp', 'up'],
            ['ArrowDown', 'down'],
            ['ArrowLeft', 'left'],
            ['ArrowRight', 'right'],
            ['KeyW', 'up'],
            ['KeyS', 'down'],
            ['KeyA', 'left'],
            ['KeyD', 'right']
        ]);
        
        // Movement state
        this.movementVector = new Vector2D(0, 0);
        this.isInputActive = false;
        
        // Event listeners
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundTouchStart = this.handleTouchStart.bind(this);
        this.boundTouchMove = this.handleTouchMove.bind(this);
        this.boundTouchEnd = this.handleTouchEnd.bind(this);
        this.boundMouseDown = this.handleMouseDown.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);
        
        this.initialize();
    }
    
    /**
     * Initialize input event listeners
     */
    initialize() {
        // Keyboard events
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.boundTouchEnd, { passive: false });
        
        // Mouse events for desktop drag controls
        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        this.canvas.addEventListener('mouseup', this.boundMouseUp);
        
        console.log('InputSystem initialized with keyboard and touch/mouse support');
    }
    
    /**
     * Initialize with game engine (to get responsive system reference)
     * @param {GameEngine} gameEngine - The game engine instance
     */
    init(gameEngine) {
        this.responsiveSystem = gameEngine.getSystem('responsive');
    }
    
    /**
     * Convert screen coordinates to canvas coordinates using responsive system
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} Canvas coordinates {x, y}
     */
    screenToCanvas(screenX, screenY) {
        if (this.responsiveSystem) {
            return this.responsiveSystem.screenToCanvas(screenX, screenY);
        }
        
        // Fallback to basic conversion
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: screenX - rect.left,
            y: screenY - rect.top
        };
    }
    
    /**
     * Handle keyboard key down events
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyDown(event) {
        const action = this.keyBindings.get(event.code);
        if (action) {
            event.preventDefault();
            this.keyState.set(action, true);
            this.updateMovementFromKeys();
        }
    }
    
    /**
     * Handle keyboard key up events
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyUp(event) {
        const action = this.keyBindings.get(event.code);
        if (action) {
            event.preventDefault();
            this.keyState.set(action, false);
            this.updateMovementFromKeys();
        }
    }
    
    /**
     * Handle touch start events
     * @param {TouchEvent} event - The touch event
     */
    handleTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            const canvasPos = this.screenToCanvas(touch.clientX, touch.clientY);
            
            this.touchState.isActive = true;
            this.touchState.startPosition = new Vector2D(canvasPos.x, canvasPos.y);
            this.touchState.currentPosition = this.touchState.startPosition.clone();
            this.touchState.deltaPosition = new Vector2D(0, 0);
        }
    }
    
    /**
     * Handle touch move events
     * @param {TouchEvent} event - The touch event
     */
    handleTouchMove(event) {
        event.preventDefault();
        
        if (this.touchState.isActive && event.touches.length > 0) {
            const touch = event.touches[0];
            const canvasPos = this.screenToCanvas(touch.clientX, touch.clientY);
            
            const newPosition = new Vector2D(canvasPos.x, canvasPos.y);
            
            this.touchState.deltaPosition = newPosition.subtract(this.touchState.currentPosition);
            this.touchState.currentPosition = newPosition;
            
            this.updateMovementFromTouch();
        }
    }
    
    /**
     * Handle touch end events
     * @param {TouchEvent} event - The touch event
     */
    handleTouchEnd(event) {
        event.preventDefault();
        
        this.touchState.isActive = false;
        this.touchState.startPosition = null;
        this.touchState.currentPosition = null;
        this.touchState.deltaPosition = new Vector2D(0, 0);
        
        // Clear movement when touch ends
        this.movementVector.set(0, 0);
        this.isInputActive = false;
    }
    
    /**
     * Handle mouse down events (for desktop drag controls)
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseDown(event) {
        const canvasPos = this.screenToCanvas(event.clientX, event.clientY);
        
        this.touchState.isActive = true;
        this.touchState.startPosition = new Vector2D(canvasPos.x, canvasPos.y);
        this.touchState.currentPosition = this.touchState.startPosition.clone();
        this.touchState.deltaPosition = new Vector2D(0, 0);
    }
    
    /**
     * Handle mouse move events
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseMove(event) {
        if (this.touchState.isActive) {
            const canvasPos = this.screenToCanvas(event.clientX, event.clientY);
            
            const newPosition = new Vector2D(canvasPos.x, canvasPos.y);
            
            this.touchState.deltaPosition = newPosition.subtract(this.touchState.currentPosition);
            this.touchState.currentPosition = newPosition;
            
            this.updateMovementFromTouch();
        }
    }
    
    /**
     * Handle mouse up events
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseUp(event) {
        this.touchState.isActive = false;
        this.touchState.startPosition = null;
        this.touchState.currentPosition = null;
        this.touchState.deltaPosition = new Vector2D(0, 0);
        
        // Clear movement when mouse is released
        this.movementVector.set(0, 0);
        this.isInputActive = false;
    }
    
    /**
     * Update movement vector based on keyboard input
     */
    updateMovementFromKeys() {
        let x = 0;
        let y = 0;
        
        if (this.keyState.get('left')) x -= 1;
        if (this.keyState.get('right')) x += 1;
        if (this.keyState.get('up')) y -= 1;
        if (this.keyState.get('down')) y += 1;
        
        this.movementVector.set(x, y);
        this.isInputActive = x !== 0 || y !== 0;
        
        // Normalize diagonal movement
        if (this.isInputActive && Math.abs(x) + Math.abs(y) > 1) {
            const normalized = this.movementVector.normalize();
            this.movementVector.set(normalized.x, normalized.y);
        }
    }
    
    /**
     * Update movement vector based on touch/mouse drag input
     */
    updateMovementFromTouch() {
        if (!this.touchState.isActive || !this.touchState.startPosition || !this.touchState.currentPosition) {
            return;
        }
        
        // Calculate movement direction from start to current position
        const dragVector = this.touchState.currentPosition.subtract(this.touchState.startPosition);
        
        // Minimum drag distance to register movement
        const minDragDistance = 10;
        
        if (dragVector.magnitude() > minDragDistance) {
            // Normalize the drag vector for consistent movement speed
            const normalized = dragVector.normalize();
            this.movementVector.set(normalized.x, normalized.y);
            this.isInputActive = true;
        } else {
            this.movementVector.set(0, 0);
            this.isInputActive = false;
        }
    }
    
    /**
     * Get the current input state
     * @returns {Object} Object containing movement vector and input status
     */
    getInputState() {
        return {
            movementVector: this.movementVector.clone(),
            isActive: this.isInputActive,
            inputType: this.touchState.isActive ? 'touch' : 'keyboard'
        };
    }
    
    /**
     * Check if a specific key is currently pressed
     * @param {string} key - The key action name (up, down, left, right)
     * @returns {boolean} True if the key is pressed
     */
    isKeyPressed(key) {
        return this.keyState.get(key) || false;
    }
    
    /**
     * Get the current touch position (if active)
     * @returns {Vector2D|null} The current touch position or null if not touching
     */
    getTouchPosition() {
        return this.touchState.isActive ? this.touchState.currentPosition?.clone() : null;
    }
    
    /**
     * Add a custom key binding
     * @param {string} keyCode - The keyboard event code
     * @param {string} action - The action name
     */
    addKeyBinding(keyCode, action) {
        this.keyBindings.set(keyCode, action);
    }
    
    /**
     * Remove a key binding
     * @param {string} keyCode - The keyboard event code
     */
    removeKeyBinding(keyCode) {
        this.keyBindings.delete(keyCode);
    }
    
    /**
     * Update method called by the game engine
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Input system doesn't need per-frame updates as it's event-driven
        // This method is here for consistency with other systems
    }
    
    /**
     * Clean up event listeners
     */
    destroy() {
        // Remove keyboard events
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
        
        // Remove touch events
        this.canvas.removeEventListener('touchstart', this.boundTouchStart);
        this.canvas.removeEventListener('touchmove', this.boundTouchMove);
        this.canvas.removeEventListener('touchend', this.boundTouchEnd);
        
        // Remove mouse events
        this.canvas.removeEventListener('mousedown', this.boundMouseDown);
        this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        this.canvas.removeEventListener('mouseup', this.boundMouseUp);
        
        console.log('InputSystem destroyed');
    }
}

// Make InputSystem available globally
window.InputSystem = InputSystem;