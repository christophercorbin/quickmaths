/**
 * ResponsiveSystem - Handles responsive canvas scaling and UI adaptation
 * Ensures the game works well on both desktop and tablet devices
 */
class ResponsiveSystem {
    constructor(config = {}) {
        this.config = {
            baseWidth: 800,
            baseHeight: 600,
            minScale: 0.5,
            maxScale: 2.0,
            maintainAspectRatio: true,
            enableTouchControls: true,
            touchControlsThreshold: 1024, // Show touch controls on screens smaller than this
            ...config
        };
        
        // System state
        this.gameEngine = null;
        this.canvas = null;
        this.container = null;
        this.currentScale = 1.0;
        this.scaledWidth = this.config.baseWidth;
        this.scaledHeight = this.config.baseHeight;
        
        // Device detection
        this.isTouchDevice = this.detectTouchDevice();
        this.isTablet = this.detectTablet();
        
        // Resize handling
        this.resizeTimeout = null;
        this.boundHandleResize = this.handleResize.bind(this);
        
        console.log('ResponsiveSystem initialized:', {
            isTouchDevice: this.isTouchDevice,
            isTablet: this.isTablet,
            screenSize: `${window.innerWidth}x${window.innerHeight}`
        });
    }
    
    /**
     * Initialize the system with game engine reference
     * @param {GameEngine} gameEngine - The game engine instance
     */
    init(gameEngine) {
        this.gameEngine = gameEngine;
        this.canvas = gameEngine.canvas;
        this.container = this.canvas.parentElement;
        
        // Set up responsive behavior
        this.setupResponsiveCanvas();
        this.setupEventListeners();
        
        // Initial resize
        this.handleResize();
        
        console.log('ResponsiveSystem initialized with game engine');
    }
    
    /**
     * Set up responsive canvas behavior
     */
    setupResponsiveCanvas() {
        if (!this.canvas || !this.container) return;
        
        // Set canvas to be responsive
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '100vh';
        this.canvas.style.display = 'block';
        
        // Update container styles for better responsive behavior
        this.container.style.width = '100%';
        this.container.style.maxWidth = '100vw';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';
        this.container.style.justifyContent = 'center';
        this.container.style.padding = '10px';
        this.container.style.boxSizing = 'border-box';
    }
    
    /**
     * Set up event listeners for responsive behavior
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.boundHandleResize);
        
        // Orientation change (mobile/tablet)
        window.addEventListener('orientationchange', () => {
            // Delay to allow orientation change to complete
            setTimeout(this.boundHandleResize, 100);
        });
        
        // Fullscreen change
        document.addEventListener('fullscreenchange', this.boundHandleResize);
        document.addEventListener('webkitfullscreenchange', this.boundHandleResize);
        document.addEventListener('mozfullscreenchange', this.boundHandleResize);
        document.addEventListener('MSFullscreenChange', this.boundHandleResize);
    }
    
    /**
     * Handle window resize events
     */
    handleResize() {
        // Debounce resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.updateCanvasSize();
            this.updateUIScale();
            this.notifySystemsOfResize();
        }, 100);
    }
    
    /**
     * Update canvas size based on available space
     */
    updateCanvasSize() {
        if (!this.canvas || !this.container) return;
        
        // Get available space
        const containerRect = this.container.getBoundingClientRect();
        const availableWidth = Math.min(window.innerWidth - 20, containerRect.width || window.innerWidth - 20);
        const availableHeight = Math.min(window.innerHeight - 100, containerRect.height || window.innerHeight - 100);
        
        // Calculate scale to fit available space
        const scaleX = availableWidth / this.config.baseWidth;
        const scaleY = availableHeight / this.config.baseHeight;
        
        let scale;
        if (this.config.maintainAspectRatio) {
            scale = Math.min(scaleX, scaleY);
        } else {
            scale = Math.min(scaleX, scaleY);
        }
        
        // Clamp scale to configured limits
        scale = Math.max(this.config.minScale, Math.min(this.config.maxScale, scale));
        
        // Update canvas size
        this.currentScale = scale;
        this.scaledWidth = this.config.baseWidth * scale;
        this.scaledHeight = this.config.baseHeight * scale;
        
        // Apply CSS scaling instead of changing canvas resolution
        this.canvas.style.width = `${this.scaledWidth}px`;
        this.canvas.style.height = `${this.scaledHeight}px`;
        
        // Keep internal canvas resolution at base size for crisp rendering
        if (this.canvas.width !== this.config.baseWidth || this.canvas.height !== this.config.baseHeight) {
            this.canvas.width = this.config.baseWidth;
            this.canvas.height = this.config.baseHeight;
            
            // Reinitialize canvas context settings
            if (this.gameEngine) {
                this.gameEngine.initializeCanvas();
            }
        }
        
        console.log(`Canvas resized: scale=${scale.toFixed(2)}, size=${this.scaledWidth}x${this.scaledHeight}`);
    }
    
    /**
     * Update UI scale for responsive elements
     */
    updateUIScale() {
        // Update font sizes and UI elements based on scale
        const systems = this.gameEngine ? this.gameEngine.systems : new Map();
        
        // Update GameStateManager UI scaling
        const gameStateManager = systems.get('gameState');
        if (gameStateManager && gameStateManager.config) {
            const baseFontSizes = {
                title: 48,
                subtitle: 24,
                button: 20,
                score: 32
            };
            
            for (const [key, baseSize] of Object.entries(baseFontSizes)) {
                gameStateManager.config.fontSize[key] = Math.round(baseSize * this.currentScale);
            }
        }
        
        // Update other systems that need scaling
        this.updateSystemScaling(systems);
    }
    
    /**
     * Update scaling for various game systems
     * @param {Map} systems - Map of game systems
     */
    updateSystemScaling(systems) {
        // Update QuestionDisplaySystem font size
        const questionDisplay = systems.get('questionDisplay');
        if (questionDisplay && questionDisplay.config) {
            questionDisplay.config.fontSize = Math.round(28 * this.currentScale);
        }
        
        // Update ScoreSystem font size
        const scoreSystem = systems.get('score');
        if (scoreSystem && scoreSystem.config) {
            scoreSystem.config.fontSize = Math.round(20 * this.currentScale);
        }
        
        // Update HealthSystem bar size
        const healthSystem = systems.get('health');
        if (healthSystem && healthSystem.config) {
            healthSystem.config.healthBarWidth = Math.round(200 * this.currentScale);
            healthSystem.config.healthBarHeight = Math.round(20 * this.currentScale);
        }
    }
    
    /**
     * Notify other systems of resize event
     */
    notifySystemsOfResize() {
        if (!this.gameEngine) return;
        
        const resizeEvent = {
            type: 'resize',
            scale: this.currentScale,
            canvasSize: {
                width: this.config.baseWidth,
                height: this.config.baseHeight
            },
            scaledSize: {
                width: this.scaledWidth,
                height: this.scaledHeight
            },
            isTouchDevice: this.isTouchDevice,
            isTablet: this.isTablet
        };
        
        // Notify systems that have onResize method
        for (const [name, system] of this.gameEngine.systems) {
            if (system.onResize && typeof system.onResize === 'function') {
                system.onResize(resizeEvent);
            }
        }
    }
    
    /**
     * Convert screen coordinates to canvas coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} Canvas coordinates {x, y}
     */
    screenToCanvas(screenX, screenY) {
        if (!this.canvas) return { x: screenX, y: screenY };
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left) * (this.config.baseWidth / rect.width);
        const y = (screenY - rect.top) * (this.config.baseHeight / rect.height);
        
        return { x, y };
    }
    
    /**
     * Convert canvas coordinates to screen coordinates
     * @param {number} canvasX - Canvas X coordinate
     * @param {number} canvasY - Canvas Y coordinate
     * @returns {Object} Screen coordinates {x, y}
     */
    canvasToScreen(canvasX, canvasY) {
        if (!this.canvas) return { x: canvasX, y: canvasY };
        
        const rect = this.canvas.getBoundingClientRect();
        const x = rect.left + (canvasX * rect.width / this.config.baseWidth);
        const y = rect.top + (canvasY * rect.height / this.config.baseHeight);
        
        return { x, y };
    }
    
    /**
     * Detect if device supports touch
     * @returns {boolean} True if touch is supported
     */
    detectTouchDevice() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 || 
               navigator.msMaxTouchPoints > 0;
    }
    
    /**
     * Detect if device is likely a tablet
     * @returns {boolean} True if device is likely a tablet
     */
    detectTablet() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isTabletUA = /tablet|ipad|playbook|silk/.test(userAgent) ||
                          (/android/.test(userAgent) && !/mobile/.test(userAgent));
        
        // Also check screen size - tablets typically have larger screens
        const hasTabletScreenSize = window.innerWidth >= 768 && window.innerWidth <= 1024;
        
        return isTabletUA || (this.isTouchDevice && hasTabletScreenSize);
    }
    
    /**
     * Check if touch controls should be shown
     * @returns {boolean} True if touch controls should be shown
     */
    shouldShowTouchControls() {
        return this.config.enableTouchControls && 
               (this.isTouchDevice || window.innerWidth < this.config.touchControlsThreshold);
    }
    
    /**
     * Get current device info
     * @returns {Object} Device information
     */
    getDeviceInfo() {
        return {
            isTouchDevice: this.isTouchDevice,
            isTablet: this.isTablet,
            shouldShowTouchControls: this.shouldShowTouchControls(),
            currentScale: this.currentScale,
            screenSize: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            canvasSize: {
                width: this.config.baseWidth,
                height: this.config.baseHeight
            },
            scaledSize: {
                width: this.scaledWidth,
                height: this.scaledHeight
            }
        };
    }
    
    /**
     * Update method (called by game engine)
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // ResponsiveSystem doesn't need regular updates
        // All work is done in event handlers
    }
    
    /**
     * Render method (called by game engine)
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    render(context) {
        // Render touch controls if needed
        if (this.shouldShowTouchControls()) {
            this.renderTouchControls(context);
        }
        
        // Render device info in debug mode
        if (this.gameEngine && this.gameEngine.config.showDebugInfo) {
            this.renderDebugInfo(context);
        }
    }
    
    /**
     * Render touch controls overlay
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    renderTouchControls(context) {
        // Only render touch controls when game is playing
        const gameStateManager = this.gameEngine ? this.gameEngine.getSystem('gameState') : null;
        if (!gameStateManager || !gameStateManager.isPlaying()) {
            return;
        }
        
        const canvasSize = this.gameEngine.getCanvasSize();
        const controlSize = 60 * this.currentScale;
        const margin = 20 * this.currentScale;
        
        // Virtual D-pad for movement
        const dpadX = margin;
        const dpadY = canvasSize.height - controlSize - margin;
        
        // Draw D-pad background
        context.fillStyle = 'rgba(0, 0, 0, 0.3)';
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.lineWidth = 2;
        
        // Draw directional arrows
        const arrowSize = controlSize / 3;
        const centerX = dpadX + controlSize / 2;
        const centerY = dpadY + controlSize / 2;
        
        // Up arrow
        context.beginPath();
        context.moveTo(centerX, centerY - arrowSize);
        context.lineTo(centerX - arrowSize/2, centerY - arrowSize/2);
        context.lineTo(centerX + arrowSize/2, centerY - arrowSize/2);
        context.closePath();
        context.fill();
        context.stroke();
        
        // Down arrow
        context.beginPath();
        context.moveTo(centerX, centerY + arrowSize);
        context.lineTo(centerX - arrowSize/2, centerY + arrowSize/2);
        context.lineTo(centerX + arrowSize/2, centerY + arrowSize/2);
        context.closePath();
        context.fill();
        context.stroke();
        
        // Left arrow
        context.beginPath();
        context.moveTo(centerX - arrowSize, centerY);
        context.lineTo(centerX - arrowSize/2, centerY - arrowSize/2);
        context.lineTo(centerX - arrowSize/2, centerY + arrowSize/2);
        context.closePath();
        context.fill();
        context.stroke();
        
        // Right arrow
        context.beginPath();
        context.moveTo(centerX + arrowSize, centerY);
        context.lineTo(centerX + arrowSize/2, centerY - arrowSize/2);
        context.lineTo(centerX + arrowSize/2, centerY + arrowSize/2);
        context.closePath();
        context.fill();
        context.stroke();
    }
    
    /**
     * Render debug information about responsive system
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    renderDebugInfo(context) {
        const deviceInfo = this.getDeviceInfo();
        
        context.fillStyle = '#2c3e50';
        context.font = '12px monospace';
        context.textAlign = 'left';
        
        const debugInfo = [
            `Scale: ${deviceInfo.currentScale.toFixed(2)}`,
            `Screen: ${deviceInfo.screenSize.width}x${deviceInfo.screenSize.height}`,
            `Canvas: ${deviceInfo.canvasSize.width}x${deviceInfo.canvasSize.height}`,
            `Scaled: ${deviceInfo.scaledSize.width}x${deviceInfo.scaledSize.height}`,
            `Touch: ${deviceInfo.isTouchDevice ? 'Yes' : 'No'}`,
            `Tablet: ${deviceInfo.isTablet ? 'Yes' : 'No'}`
        ];
        
        for (let i = 0; i < debugInfo.length; i++) {
            context.fillText(debugInfo[i], 10, 120 + i * 14);
        }
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.boundHandleResize);
        window.removeEventListener('orientationchange', this.boundHandleResize);
        document.removeEventListener('fullscreenchange', this.boundHandleResize);
        document.removeEventListener('webkitfullscreenchange', this.boundHandleResize);
        document.removeEventListener('mozfullscreenchange', this.boundHandleResize);
        document.removeEventListener('MSFullscreenChange', this.boundHandleResize);
        
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        console.log('ResponsiveSystem destroyed');
    }
}

// Make ResponsiveSystem available globally
window.ResponsiveSystem = ResponsiveSystem;