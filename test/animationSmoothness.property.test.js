/**
 * Property-based test for Animation Smoothness
 * Tests that all moving elements in the game have smooth position updates over time
 */

const fc = require('fast-check');

describe('Animation Smoothness Property Tests', () => {
    let canvas;
    let gameEngine;
    let collisionFeedbackSystem;
    let physicsSystem;
    let playerCharacter;
    let numberTiles;
    
    beforeEach(() => {
        // Create a fresh canvas for each test
        canvas = document.createElement('canvas');
        canvas.id = 'testCanvas';
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
        
        // Create game engine and systems
        gameEngine = new GameEngine('testCanvas');
        physicsSystem = new PhysicsSystem({ width: 800, height: 600 });
        collisionFeedbackSystem = new CollisionFeedbackSystem({
            enableParticles: true,
            enableScreenShake: true
        });
        
        // Register systems
        gameEngine.registerSystem('physics', physicsSystem);
        gameEngine.registerSystem('collisionFeedback', collisionFeedbackSystem);
        
        // Initialize systems
        physicsSystem.init(gameEngine);
        collisionFeedbackSystem.init(gameEngine);
        
        // Create player character
        playerCharacter = new PlayerCharacter(400, 300, 40, 40);
        gameEngine.addEntity(playerCharacter);
        
        // Initialize number tiles array
        numberTiles = [];
        
        // Reset performance.now mock
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        // Clean up canvas
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
        
        // Stop game engine if running
        if (gameEngine && gameEngine.isGameRunning()) {
            gameEngine.stop();
        }
        
        // Clear all effects
        if (collisionFeedbackSystem) {
            collisionFeedbackSystem.clearAllEffects();
        }
        
        // Clean up number tiles
        for (const tile of numberTiles) {
            gameEngine.removeEntity(tile);
        }
        numberTiles = [];
    });

    /**
     * Property 12: Animation smoothness
     * Feature: quick-math-game, Property 12: Animation smoothness
     * For any moving element in the game, position updates should occur smoothly over time without jarring jumps
     */
    test('Property 12: Animation smoothness', () => {
        fc.assert(fc.property(
            fc.record({
                frameCount: fc.integer({ min: 10, max: 60 }), // Test over multiple frames
                movingElementCount: fc.integer({ min: 1, max: 8 }), // Multiple moving elements
                targetFPS: fc.integer({ min: 30, max: 120 }), // Different frame rates
                movementSpeed: fc.float({ min: 50, max: 400 }), // Various movement speeds
                animationTypes: fc.array(
                    fc.constantFrom('player_movement', 'tile_movement', 'particles', 'pulse_animation', 'floating_text'),
                    { minLength: 1, maxLength: 3 }
                )
            }),
            (config) => {
                const { frameCount, movingElementCount, targetFPS, movementSpeed, animationTypes } = config;
                
                // Configure game engine for target FPS
                gameEngine.config.targetFPS = targetFPS;
                const targetDeltaTime = 1 / targetFPS;
                
                // Create moving elements based on test configuration
                const movingElements = [];
                
                // Add player movement if requested
                if (animationTypes.includes('player_movement')) {
                    playerCharacter.setVelocity(movementSpeed * 0.7, movementSpeed * 0.5);
                    movingElements.push({
                        type: 'player',
                        entity: playerCharacter,
                        positions: []
                    });
                }
                
                // Add number tiles if requested
                if (animationTypes.includes('tile_movement')) {
                    for (let i = 0; i < Math.min(movingElementCount, 5); i++) {
                        const tile = new NumberTile(
                            100 + i * 120, // x position
                            100 + i * 80,  // y position
                            i + 1,         // value
                            false,         // isCorrect
                            30,            // width
                            30             // height
                        );
                        
                        // Set random movement pattern and speed
                        tile.setSpeed(movementSpeed * (0.5 + Math.random() * 0.5));
                        tile.setMovementPattern(['linear', 'sine', 'circular'][i % 3]);
                        tile.setVelocity(
                            (Math.random() - 0.5) * movementSpeed,
                            (Math.random() - 0.5) * movementSpeed
                        );
                        
                        gameEngine.addEntity(tile);
                        numberTiles.push(tile);
                        
                        movingElements.push({
                            type: 'tile',
                            entity: tile,
                            positions: []
                        });
                    }
                }
                
                // Process entity additions
                gameEngine.processEntityChanges();
                
                // Create animations if requested
                let animationEffects = [];
                if (animationTypes.includes('particles')) {
                    collisionFeedbackSystem.createParticleEffect(
                        { x: 400, y: 300 },
                        {
                            color: '#27ae60',
                            count: 6,
                            speed: movementSpeed * 0.8,
                            spread: Math.PI * 2,
                            lifetime: 2000,
                            type: 'success'
                        }
                    );
                    animationEffects.push('particles');
                }
                
                if (animationTypes.includes('pulse_animation')) {
                    collisionFeedbackSystem.createPulseAnimation(
                        { x: 300, y: 200 },
                        {
                            color: '#e74c3c',
                            maxRadius: 50,
                            duration: 1000,
                            opacity: 0.6,
                            pulseCount: 2
                        }
                    );
                    animationEffects.push('pulse');
                }
                
                if (animationTypes.includes('floating_text')) {
                    collisionFeedbackSystem.createFloatingText(
                        { x: 500, y: 400 },
                        'Test!',
                        {
                            color: '#3498db',
                            fontSize: 24,
                            duration: 1500,
                            animation: 'float-up'
                        }
                    );
                    animationEffects.push('floating_text');
                }
                
                // Track animation data over multiple frames
                const frameData = [];
                let previousTime = 0;
                
                // Simulate multiple frames with consistent timing
                for (let frame = 0; frame < frameCount; frame++) {
                    const currentTime = frame * (targetDeltaTime * 1000); // Convert to milliseconds
                    const actualDeltaTime = frame === 0 ? targetDeltaTime : (currentTime - previousTime) / 1000;
                    
                    // Capture positions before update
                    const frameSnapshot = {
                        frameNumber: frame,
                        deltaTime: actualDeltaTime,
                        timestamp: currentTime,
                        elementPositions: {},
                        animationStates: {},
                        velocities: {}
                    };
                    
                    // Record positions of moving elements
                    for (const element of movingElements) {
                        const pos = { x: element.entity.position.x, y: element.entity.position.y };
                        const vel = { x: element.entity.velocity.x, y: element.entity.velocity.y };
                        
                        frameSnapshot.elementPositions[element.type + '_' + element.entity.id] = pos;
                        frameSnapshot.velocities[element.type + '_' + element.entity.id] = vel;
                        
                        element.positions.push(pos);
                    }
                    
                    // Record animation states
                    if (animationEffects.includes('particles')) {
                        frameSnapshot.animationStates.particleCount = collisionFeedbackSystem.particles.length;
                        frameSnapshot.animationStates.particlePositions = collisionFeedbackSystem.particles.map(p => ({
                            x: p.x, y: p.y, vx: p.vx, vy: p.vy
                        }));
                    }
                    
                    if (animationEffects.includes('pulse')) {
                        const pulseAnimations = collisionFeedbackSystem.animations.filter(a => a.type === 'pulse');
                        frameSnapshot.animationStates.pulseRadius = pulseAnimations.length > 0 ? 
                            pulseAnimations[0].currentRadius : 0;
                        frameSnapshot.animationStates.pulseOpacity = pulseAnimations.length > 0 ? 
                            pulseAnimations[0].currentOpacity : 0;
                    }
                    
                    if (animationEffects.includes('floating_text')) {
                        const textEffects = collisionFeedbackSystem.activeFeedbacks.filter(f => f.type === 'floating-text');
                        frameSnapshot.animationStates.textY = textEffects.length > 0 ? textEffects[0].y : 0;
                        frameSnapshot.animationStates.textOpacity = textEffects.length > 0 ? textEffects[0].opacity : 0;
                    }
                    
                    frameData.push(frameSnapshot);
                    
                    // Update all systems and entities
                    gameEngine.update(actualDeltaTime);
                    collisionFeedbackSystem.update(actualDeltaTime);
                    
                    previousTime = currentTime;
                }
                
                // Property 1: Position changes should be smooth (no jarring jumps)
                for (const element of movingElements) {
                    if (element.positions.length >= 3) {
                        for (let i = 2; i < element.positions.length; i++) {
                            const pos1 = element.positions[i - 2];
                            const pos2 = element.positions[i - 1];
                            const pos3 = element.positions[i];
                            
                            // Calculate movement distances
                            const dist1 = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
                            const dist2 = Math.sqrt(Math.pow(pos3.x - pos2.x, 2) + Math.pow(pos3.y - pos2.y, 2));
                            
                            // Property: Movement distance should not vary dramatically between frames
                            // Allow for some variation due to movement patterns, but no huge jumps
                            if (dist1 > 0 && dist2 > 0) {
                                const distanceRatio = Math.max(dist1, dist2) / Math.min(dist1, dist2);
                                expect(distanceRatio).toBeLessThan(5.0); // No more than 5x difference
                            }
                            
                            // Property: Movement should not exceed reasonable bounds per frame
                            const maxReasonableDistance = movementSpeed * targetDeltaTime * 2; // 2x buffer
                            expect(dist1).toBeLessThan(maxReasonableDistance);
                            expect(dist2).toBeLessThan(maxReasonableDistance);
                        }
                    }
                }
                
                // Property 2: Delta time should be consistent for smooth animation
                if (frameData.length >= 2) {
                    const deltaTimes = frameData.slice(1).map(frame => frame.deltaTime);
                    const avgDeltaTime = deltaTimes.reduce((sum, dt) => sum + dt, 0) / deltaTimes.length;
                    
                    for (const deltaTime of deltaTimes) {
                        // Property: Delta time should not vary wildly (affects animation smoothness)
                        const deltaTimeRatio = Math.max(deltaTime, avgDeltaTime) / Math.min(deltaTime, avgDeltaTime);
                        expect(deltaTimeRatio).toBeLessThan(2.0); // No more than 2x variation
                        
                        // Property: Delta time should be reasonable for the target FPS
                        expect(deltaTime).toBeGreaterThan(0);
                        expect(deltaTime).toBeLessThan(1.0); // No frame should take more than 1 second
                    }
                }
                
                // Property 3: Particle animations should move smoothly
                if (animationEffects.includes('particles')) {
                    const particleFrames = frameData.filter(frame => 
                        frame.animationStates.particlePositions && 
                        frame.animationStates.particlePositions.length > 0
                    );
                    
                    if (particleFrames.length >= 2) {
                        // Track individual particles across frames
                        for (let particleIndex = 0; particleIndex < Math.min(3, particleFrames[0].animationStates.particlePositions.length); particleIndex++) {
                            const particlePositions = particleFrames.map(frame => 
                                frame.animationStates.particlePositions[particleIndex]
                            ).filter(pos => pos !== undefined);
                            
                            if (particlePositions.length >= 3) {
                                for (let i = 2; i < particlePositions.length; i++) {
                                    const pos1 = particlePositions[i - 2];
                                    const pos2 = particlePositions[i - 1];
                                    const pos3 = particlePositions[i];
                                    
                                    // Calculate particle movement distances
                                    const dist1 = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
                                    const dist2 = Math.sqrt(Math.pow(pos3.x - pos2.x, 2) + Math.pow(pos3.y - pos2.y, 2));
                                    
                                    // Property: Particle movement should be smooth
                                    if (dist1 > 0 && dist2 > 0) {
                                        const particleDistanceRatio = Math.max(dist1, dist2) / Math.min(dist1, dist2);
                                        expect(particleDistanceRatio).toBeLessThan(3.0); // Particles can have more variation due to physics
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Property 4: Pulse animations should have smooth radius changes
                if (animationEffects.includes('pulse')) {
                    const pulseFrames = frameData.filter(frame => 
                        frame.animationStates.pulseRadius !== undefined && 
                        frame.animationStates.pulseRadius > 0
                    );
                    
                    if (pulseFrames.length >= 3) {
                        for (let i = 2; i < pulseFrames.length; i++) {
                            const radius1 = pulseFrames[i - 2].animationStates.pulseRadius;
                            const radius2 = pulseFrames[i - 1].animationStates.pulseRadius;
                            const radius3 = pulseFrames[i].animationStates.pulseRadius;
                            
                            // Property: Pulse radius should change smoothly
                            const radiusChange1 = Math.abs(radius2 - radius1);
                            const radiusChange2 = Math.abs(radius3 - radius2);
                            
                            // Radius changes should be reasonable (not huge jumps)
                            const maxRadiusChange = 20; // pixels per frame
                            expect(radiusChange1).toBeLessThan(maxRadiusChange);
                            expect(radiusChange2).toBeLessThan(maxRadiusChange);
                        }
                    }
                }
                
                // Property 5: Floating text should move smoothly
                if (animationEffects.includes('floating_text')) {
                    const textFrames = frameData.filter(frame => 
                        frame.animationStates.textY !== undefined && 
                        frame.animationStates.textY > 0
                    );
                    
                    if (textFrames.length >= 3) {
                        for (let i = 2; i < textFrames.length; i++) {
                            const y1 = textFrames[i - 2].animationStates.textY;
                            const y2 = textFrames[i - 1].animationStates.textY;
                            const y3 = textFrames[i].animationStates.textY;
                            
                            // Property: Text should float upward smoothly
                            expect(y2).toBeLessThanOrEqual(y1); // Should move up (decreasing Y)
                            expect(y3).toBeLessThanOrEqual(y2); // Should continue moving up
                            
                            // Property: Text movement should be smooth
                            const textMove1 = Math.abs(y2 - y1);
                            const textMove2 = Math.abs(y3 - y2);
                            
                            if (textMove1 > 0 && textMove2 > 0) {
                                const textMoveRatio = Math.max(textMove1, textMove2) / Math.min(textMove1, textMove2);
                                expect(textMoveRatio).toBeLessThan(2.0); // Smooth text movement
                            }
                        }
                    }
                }
                
                // Property 6: Animation opacity changes should be smooth
                const opacityFrames = frameData.filter(frame => 
                    frame.animationStates.textOpacity !== undefined ||
                    frame.animationStates.pulseOpacity !== undefined
                );
                
                if (opacityFrames.length >= 3) {
                    for (let i = 2; i < opacityFrames.length; i++) {
                        const frame1 = opacityFrames[i - 2].animationStates;
                        const frame2 = opacityFrames[i - 1].animationStates;
                        const frame3 = opacityFrames[i].animationStates;
                        
                        // Check text opacity smoothness
                        if (frame1.textOpacity !== undefined && frame2.textOpacity !== undefined && frame3.textOpacity !== undefined) {
                            const opacityChange1 = Math.abs(frame2.textOpacity - frame1.textOpacity);
                            const opacityChange2 = Math.abs(frame3.textOpacity - frame2.textOpacity);
                            
                            // Property: Opacity should change smoothly
                            expect(opacityChange1).toBeLessThan(0.5); // No huge opacity jumps
                            expect(opacityChange2).toBeLessThan(0.5);
                        }
                        
                        // Check pulse opacity smoothness
                        if (frame1.pulseOpacity !== undefined && frame2.pulseOpacity !== undefined && frame3.pulseOpacity !== undefined) {
                            const pulseOpacityChange1 = Math.abs(frame2.pulseOpacity - frame1.pulseOpacity);
                            const pulseOpacityChange2 = Math.abs(frame3.pulseOpacity - frame2.pulseOpacity);
                            
                            // Property: Pulse opacity should change smoothly
                            expect(pulseOpacityChange1).toBeLessThan(0.3);
                            expect(pulseOpacityChange2).toBeLessThan(0.3);
                        }
                    }
                }
                
                // Property 7: Overall animation system should maintain consistency
                expect(frameData.length).toBe(frameCount);
                
                // Property: All frames should have valid timestamps
                for (let i = 1; i < frameData.length; i++) {
                    expect(frameData[i].timestamp).toBeGreaterThan(frameData[i - 1].timestamp);
                }
                
                // Property: Animation system should handle multiple concurrent animations without interference
                if (animationEffects.length > 1) {
                    const finalFrame = frameData[frameData.length - 1];
                    
                    // Verify that multiple animation types can coexist
                    let activeAnimationTypes = 0;
                    if (finalFrame.animationStates.particleCount > 0) activeAnimationTypes++;
                    if (finalFrame.animationStates.pulseRadius > 0) activeAnimationTypes++;
                    if (finalFrame.animationStates.textOpacity > 0) activeAnimationTypes++;
                    
                    // Should have multiple active animations if we requested them
                    expect(activeAnimationTypes).toBeGreaterThanOrEqual(Math.min(animationEffects.length, 2));
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });
});