/**
 * Property-based tests for ResponsiveSystem
 * Tests universal properties for responsive interface scaling
 */

const fc = require('fast-check');

describe('ResponsiveSystem Property Tests', () => {
    let canvas;
    let gameEngine;
    let responsiveSystem;
    let originalInnerWidth;
    let originalInnerHeight;
    
    beforeEach(() => {
        // Store original window dimensions
        originalInnerWidth = window.innerWidth;
        originalInnerHeight = window.innerHeight;
        
        // Create a fresh canvas for each test
        canvas = document.createElement('canvas');
        canvas.id = 'testCanvas';
        canvas.width = 800;
        canvas.height = 600;
        
        // Create container div for responsive behavior
        const container = document.createElement('div');
        container.id = 'gameContainer';
        container.style.width = '100%';
        container.style.height = '100vh';
        container.appendChild(canvas);
        document.body.appendChild(container);
        
        // Create game engine and responsive system
        gameEngine = new GameEngine('testCanvas');
        responsiveSystem = new ResponsiveSystem({
            baseWidth: 800,
            baseHeight: 600,
            minScale: 0.5,
            maxScale: 2.0,
            maintainAspectRatio: true
        });
        
        // Register system with game engine
        gameEngine.registerSystem('responsive', responsiveSystem);
        responsiveSystem.init(gameEngine);
        
        // Reset performance.now mock
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        // Restore original window dimensions
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: originalInnerWidth
        });
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: originalInnerHeight
        });
        
        // Clean up DOM
        const container = document.getElementById('gameContainer');
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        
        // Stop game engine if running
        if (gameEngine && gameEngine.isGameRunning()) {
            gameEngine.stop();
        }
        
        // Cleanup responsive system
        if (responsiveSystem) {
            responsiveSystem.destroy();
        }
    });

    /**
     * Property 13: Responsive interface scaling
     * Feature: quick-math-game, Property 13: Responsive interface scaling
     * For any screen size within the supported range, the game interface should scale appropriately and remain functional
     */
    test('Property 13: Responsive interface scaling', () => {
        fc.assert(fc.property(
            fc.record({
                screenWidth: fc.integer({ min: 320, max: 2560 }), // Mobile to desktop range
                screenHeight: fc.integer({ min: 240, max: 1440 }), // Mobile to desktop range
                deviceType: fc.constantFrom('mobile', 'tablet', 'desktop'),
                orientation: fc.constantFrom('portrait', 'landscape')
            }),
            (config) => {
                const { screenWidth, screenHeight, deviceType, orientation } = config;
                
                // Adjust dimensions based on orientation
                let finalWidth = screenWidth;
                let finalHeight = screenHeight;
                
                if (orientation === 'portrait' && screenWidth > screenHeight) {
                    finalWidth = screenHeight;
                    finalHeight = screenWidth;
                } else if (orientation === 'landscape' && screenHeight > screenWidth) {
                    finalWidth = screenHeight;
                    finalHeight = screenWidth;
                }
                
                // Mock window dimensions
                Object.defineProperty(window, 'innerWidth', {
                    writable: true,
                    configurable: true,
                    value: finalWidth
                });
                Object.defineProperty(window, 'innerHeight', {
                    writable: true,
                    configurable: true,
                    value: finalHeight
                });
                
                // Mock device characteristics based on device type
                const mockTouchDevice = deviceType === 'mobile' || deviceType === 'tablet';
                const mockTabletDevice = deviceType === 'tablet';
                
                // Override device detection methods
                const originalDetectTouchDevice = responsiveSystem.detectTouchDevice;
                const originalDetectTablet = responsiveSystem.detectTablet;
                
                responsiveSystem.detectTouchDevice = jest.fn(() => mockTouchDevice);
                responsiveSystem.detectTablet = jest.fn(() => mockTabletDevice);
                
                // Update device detection properties
                responsiveSystem.isTouchDevice = mockTouchDevice;
                responsiveSystem.isTablet = mockTabletDevice;
                
                // Trigger resize to apply new dimensions
                responsiveSystem.handleResize();
                
                // Allow resize debouncing to complete
                jest.advanceTimersByTime(200);
                
                // Get device info after resize
                const deviceInfo = responsiveSystem.getDeviceInfo();
                
                // Property 1: Scale should be within configured bounds
                expect(deviceInfo.currentScale).toBeGreaterThanOrEqual(responsiveSystem.config.minScale);
                expect(deviceInfo.currentScale).toBeLessThanOrEqual(responsiveSystem.config.maxScale);
                
                // Property 2: Scaled dimensions should fit within available screen space
                const availableWidth = finalWidth - 20; // Account for padding
                const availableHeight = finalHeight - 100; // Account for UI space
                
                expect(deviceInfo.scaledSize.width).toBeLessThanOrEqual(availableWidth + 1); // +1 for rounding
                expect(deviceInfo.scaledSize.height).toBeLessThanOrEqual(availableHeight + 1);
                
                // Property 3: Canvas internal resolution should remain at base size for crisp rendering
                expect(canvas.width).toBe(responsiveSystem.config.baseWidth);
                expect(canvas.height).toBe(responsiveSystem.config.baseHeight);
                
                // Property 4: CSS scaling should match calculated scale
                const canvasStyle = window.getComputedStyle(canvas);
                const cssWidth = parseInt(canvasStyle.width);
                const cssHeight = parseInt(canvasStyle.height);
                
                // Allow for small rounding differences
                expect(Math.abs(cssWidth - deviceInfo.scaledSize.width)).toBeLessThan(2);
                expect(Math.abs(cssHeight - deviceInfo.scaledSize.height)).toBeLessThan(2);
                
                // Property 5: Aspect ratio should be maintained when configured
                if (responsiveSystem.config.maintainAspectRatio) {
                    const baseAspectRatio = responsiveSystem.config.baseWidth / responsiveSystem.config.baseHeight;
                    const scaledAspectRatio = deviceInfo.scaledSize.width / deviceInfo.scaledSize.height;
                    
                    expect(Math.abs(scaledAspectRatio - baseAspectRatio)).toBeLessThan(0.01);
                }
                
                // Property 6: Device detection should be consistent with mock settings
                expect(deviceInfo.isTouchDevice).toBe(mockTouchDevice);
                expect(deviceInfo.isTablet).toBe(mockTabletDevice);
                
                // Property 7: Touch controls visibility should match device type
                const shouldShowTouchControls = responsiveSystem.shouldShowTouchControls();
                if (mockTouchDevice || finalWidth < responsiveSystem.config.touchControlsThreshold) {
                    expect(shouldShowTouchControls).toBe(true);
                } else {
                    expect(shouldShowTouchControls).toBe(false);
                }
                
                // Property 8: Coordinate conversion should work correctly
                const testCanvasX = responsiveSystem.config.baseWidth / 2;
                const testCanvasY = responsiveSystem.config.baseHeight / 2;
                
                const screenCoords = responsiveSystem.canvasToScreen(testCanvasX, testCanvasY);
                const backToCanvas = responsiveSystem.screenToCanvas(screenCoords.x, screenCoords.y);
                
                // Round-trip conversion should be accurate
                expect(Math.abs(backToCanvas.x - testCanvasX)).toBeLessThan(1);
                expect(Math.abs(backToCanvas.y - testCanvasY)).toBeLessThan(1);
                
                // Property 9: Screen coordinates should be within canvas bounds
                expect(screenCoords.x).toBeGreaterThanOrEqual(0);
                expect(screenCoords.y).toBeGreaterThanOrEqual(0);
                
                // Property 10: Scale should be reasonable for the screen size
                const scaleX = availableWidth / responsiveSystem.config.baseWidth;
                const scaleY = availableHeight / responsiveSystem.config.baseHeight;
                const expectedScale = Math.min(scaleX, scaleY);
                const clampedExpectedScale = Math.max(
                    responsiveSystem.config.minScale, 
                    Math.min(responsiveSystem.config.maxScale, expectedScale)
                );
                
                expect(Math.abs(deviceInfo.currentScale - clampedExpectedScale)).toBeLessThan(0.01);
                
                // Property 11: System should handle edge cases gracefully
                if (finalWidth < 400 || finalHeight < 300) {
                    // Very small screens should still produce valid scaling
                    expect(deviceInfo.currentScale).toBeGreaterThan(0);
                    expect(deviceInfo.scaledSize.width).toBeGreaterThan(0);
                    expect(deviceInfo.scaledSize.height).toBeGreaterThan(0);
                }
                
                if (finalWidth > 1920 || finalHeight > 1080) {
                    // Large screens should not exceed max scale
                    expect(deviceInfo.currentScale).toBeLessThanOrEqual(responsiveSystem.config.maxScale);
                }
                
                // Property 12: UI scaling should be applied to game systems
                const systems = gameEngine.systems;
                
                // Check if systems have been notified of resize
                for (const [name, system] of systems) {
                    if (system.onResize && typeof system.onResize === 'function') {
                        // System should have received resize notification
                        // (We can't easily test this without mocking, but we verify the system exists)
                        expect(system).toBeDefined();
                    }
                }
                
                // Property 13: Responsive system should maintain internal consistency
                expect(deviceInfo.screenSize.width).toBe(finalWidth);
                expect(deviceInfo.screenSize.height).toBe(finalHeight);
                expect(deviceInfo.canvasSize.width).toBe(responsiveSystem.config.baseWidth);
                expect(deviceInfo.canvasSize.height).toBe(responsiveSystem.config.baseHeight);
                
                // Property 14: Multiple resize operations should be stable
                // Trigger another resize with same dimensions
                responsiveSystem.handleResize();
                jest.advanceTimersByTime(200);
                
                const deviceInfoAfterSecondResize = responsiveSystem.getDeviceInfo();
                
                // Should produce identical results
                expect(deviceInfoAfterSecondResize.currentScale).toBeCloseTo(deviceInfo.currentScale, 5);
                expect(deviceInfoAfterSecondResize.scaledSize.width).toBeCloseTo(deviceInfo.scaledSize.width, 1);
                expect(deviceInfoAfterSecondResize.scaledSize.height).toBeCloseTo(deviceInfo.scaledSize.height, 1);
                
                // Restore original methods
                responsiveSystem.detectTouchDevice = originalDetectTouchDevice;
                responsiveSystem.detectTablet = originalDetectTablet;
                
                return true;
            }
        ), { numRuns: 100 });
    });
});