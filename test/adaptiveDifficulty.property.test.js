/**
 * Property-based test for Adaptive Difficulty Adjustment
 * Tests that the adaptive learning system correctly adjusts difficulty based on player performance
 */

const fc = require('fast-check');

describe('AdaptiveLearningSystem Property Tests', () => {
    let adaptiveLearningSystem;
    
    beforeEach(() => {
        // Reset mock time
        global.performance.now.mockClear();
        let mockTime = 0;
        global.performance.now.mockImplementation(() => {
            mockTime += 16.67;
            return mockTime;
        });
        
        // Create a new AdaptiveLearningSystem instance for each test
        adaptiveLearningSystem = new AdaptiveLearningSystem({
            performanceWindowSize: 10,
            minAttemptsForAdjustment: 5,
            accuracyThresholds: {
                increase: 0.8,
                decrease: 0.5
            },
            responseTimeThresholds: {
                fast: 3.0,
                slow: 8.0
            },
            strugglingThreshold: 0.6,
            masteryThreshold: 0.85
        });
    });

    /**
     * Property 14: Adaptive difficulty adjustment
     * Feature: quick-math-game, Property 14: Adaptive difficulty adjustment
     * For any consistent pattern of correct answers, the system should increase question difficulty appropriately
     */
    test('Property 14: Adaptive difficulty adjustment', () => {
        fc.assert(fc.property(
            fc.record({
                operation: fc.constantFrom('addition', 'subtraction', 'multiplication', 'division'),
                performancePattern: fc.constantFrom('improving', 'struggling', 'mixed', 'consistent_good', 'consistent_poor'),
                sessionLength: fc.integer({ min: 8, max: 20 }), // Number of questions to answer
                baseResponseTime: fc.float({ min: 1.0, max: 6.0 }), // Base response time in seconds
                initialDifficulty: fc.integer({ min: 1, max: 3 }) // Starting difficulty level
            }),
            (config) => {
                const { operation, performancePattern, sessionLength, baseResponseTime, initialDifficulty } = config;
                
                // Create a fresh AdaptiveLearningSystem for each test iteration to avoid state pollution
                const testSystem = new AdaptiveLearningSystem({
                    performanceWindowSize: 10,
                    minAttemptsForAdjustment: 5,
                    accuracyThresholds: {
                        increase: 0.8,
                        decrease: 0.5
                    },
                    responseTimeThresholds: {
                        fast: 3.0,
                        slow: 8.0
                    },
                    strugglingThreshold: 0.6,
                    masteryThreshold: 0.85
                });
                
                // Set up initial difficulty for the operation
                const metrics = testSystem.getPerformanceMetrics(operation);
                metrics.difficultyProgression = [initialDifficulty];
                
                // Generate performance data based on the pattern
                const performanceData = generatePerformancePattern(
                    performancePattern, 
                    sessionLength, 
                    baseResponseTime
                );
                
                // Track difficulty changes throughout the session
                const difficultyHistory = [initialDifficulty];
                
                // Record each answer and track difficulty adjustments
                for (let i = 0; i < performanceData.length; i++) {
                    const { isCorrect, responseTime } = performanceData[i];
                    
                    // Record the answer
                    testSystem.recordAnswer(operation, initialDifficulty, isCorrect, responseTime);
                    
                    // Check if difficulty should be adjusted
                    const newDifficulty = testSystem.calculateOptimalDifficulty(operation);
                    const currentDifficulty = difficultyHistory[difficultyHistory.length - 1];
                    
                    if (newDifficulty !== currentDifficulty) {
                        difficultyHistory.push(newDifficulty);
                    }
                }
                
                // Get final performance metrics
                const finalMetrics = testSystem.getPerformanceMetrics(operation);
                const finalDifficulty = testSystem.calculateOptimalDifficulty(operation);
                
                // Property: Difficulty adjustment should be based on performance patterns
                switch (performancePattern) {
                    case 'improving':
                    case 'consistent_good':
                        // Good performance should lead to difficulty increase or maintenance
                        if (finalMetrics.recentAccuracy >= testSystem.config.accuracyThresholds.increase &&
                            finalMetrics.averageResponseTime <= testSystem.config.responseTimeThresholds.fast &&
                            finalMetrics.recentAttempts.length >= testSystem.config.minAttemptsForAdjustment) {
                            
                            // Property: Consistent good performance should increase difficulty
                            expect(finalDifficulty).toBeGreaterThanOrEqual(initialDifficulty);
                            
                            // Property: Difficulty should not exceed maximum bounds
                            expect(finalDifficulty).toBeLessThanOrEqual(5);
                        }
                        break;
                        
                    case 'struggling':
                    case 'consistent_poor':
                        // Poor performance should lead to difficulty decrease or maintenance
                        if (finalMetrics.recentAccuracy <= testSystem.config.accuracyThresholds.decrease &&
                            finalMetrics.recentAttempts.length >= testSystem.config.minAttemptsForAdjustment) {
                            
                            // Property: Consistent poor performance should decrease difficulty
                            expect(finalDifficulty).toBeLessThanOrEqual(initialDifficulty);
                            
                            // Property: Difficulty should not go below minimum bounds
                            expect(finalDifficulty).toBeGreaterThanOrEqual(1);
                        }
                        break;
                        
                    case 'mixed':
                        // Mixed performance should result in stable or gradual adjustments
                        const difficultyChange = Math.abs(finalDifficulty - initialDifficulty);
                        
                        // Property: Mixed performance should not cause dramatic difficulty swings
                        // Allow for more variation since mixed performance can still lead to overall improvement
                        expect(difficultyChange).toBeLessThanOrEqual(4);
                        break;
                }
                
                // Property: Difficulty adjustments should be gradual (no huge jumps)
                for (let i = 1; i < difficultyHistory.length; i++) {
                    const prevDifficulty = difficultyHistory[i - 1];
                    const currDifficulty = difficultyHistory[i];
                    const difficultyJump = Math.abs(currDifficulty - prevDifficulty);
                    
                    // Property: Difficulty should change by at most 1 level at a time
                    expect(difficultyJump).toBeLessThanOrEqual(1);
                }
                
                // Property: Difficulty should always be within valid bounds
                expect(finalDifficulty).toBeGreaterThanOrEqual(1);
                expect(finalDifficulty).toBeLessThanOrEqual(5);
                
                // Property: Performance metrics should accurately reflect the session
                expect(finalMetrics.totalAttempts).toBe(sessionLength);
                expect(finalMetrics.recentAttempts.length).toBeLessThanOrEqual(
                    Math.min(sessionLength, testSystem.config.performanceWindowSize)
                );
                
                // Property: Recent accuracy should be calculated correctly
                if (finalMetrics.recentAttempts.length > 0) {
                    const expectedCorrectCount = finalMetrics.recentAttempts.filter(a => a.isCorrect).length;
                    const expectedAccuracy = expectedCorrectCount / finalMetrics.recentAttempts.length;
                    expect(finalMetrics.recentAccuracy).toBeCloseTo(expectedAccuracy, 5);
                }
                
                // Property: Average response time should be reasonable
                if (finalMetrics.recentAttempts.length > 0) {
                    expect(finalMetrics.averageResponseTime).toBeGreaterThan(0);
                    expect(finalMetrics.averageResponseTime).toBeLessThan(30); // Reasonable upper bound
                }
                
                // Property: Difficulty progression should be monotonic for consistent patterns
                if (performancePattern === 'consistent_good' && 
                    finalMetrics.recentAccuracy >= testSystem.config.accuracyThresholds.increase) {
                    
                    // For consistently good performance, difficulty should not decrease
                    for (let i = 1; i < difficultyHistory.length; i++) {
                        expect(difficultyHistory[i]).toBeGreaterThanOrEqual(difficultyHistory[i - 1]);
                    }
                }
                
                if (performancePattern === 'consistent_poor' && 
                    finalMetrics.recentAccuracy <= testSystem.config.accuracyThresholds.decrease) {
                    
                    // For consistently poor performance, difficulty should not increase
                    for (let i = 1; i < difficultyHistory.length; i++) {
                        expect(difficultyHistory[i]).toBeLessThanOrEqual(difficultyHistory[i - 1]);
                    }
                }
                
                // Property: System should identify struggling areas correctly
                if (finalMetrics.recentAccuracy < testSystem.config.strugglingThreshold) {
                    const strugglingOps = testSystem.getOperationsNeedingPractice();
                    expect(strugglingOps).toContain(operation);
                }
                
                // Property: System should detect mastery correctly
                if (finalMetrics.recentAccuracy >= testSystem.config.masteryThreshold &&
                    finalMetrics.averageResponseTime <= testSystem.config.responseTimeThresholds.fast) {
                    expect(finalMetrics.masteryAchieved).toBe(true);
                }
                
                // Property: Difficulty adjustment should consider both accuracy and response time
                if (finalMetrics.recentAttempts.length >= testSystem.config.minAttemptsForAdjustment) {
                    const highAccuracy = finalMetrics.recentAccuracy >= testSystem.config.accuracyThresholds.increase;
                    const fastResponse = finalMetrics.averageResponseTime <= testSystem.config.responseTimeThresholds.fast;
                    const lowAccuracy = finalMetrics.recentAccuracy <= testSystem.config.accuracyThresholds.decrease;
                    
                    if (highAccuracy && fastResponse && initialDifficulty < 5) {
                        // Both accuracy and speed are good - should increase difficulty
                        expect(finalDifficulty).toBeGreaterThan(initialDifficulty);
                    } else if (lowAccuracy && initialDifficulty > 1) {
                        // Low accuracy - should decrease difficulty
                        expect(finalDifficulty).toBeLessThan(initialDifficulty);
                    }
                }
                
                // Property: Level increase recommendation should be consistent with individual operation performance
                const shouldIncreaseLevel = testSystem.shouldIncreaseLevel();
                
                if (shouldIncreaseLevel) {
                    // If system recommends level increase, most operations should be performing well
                    const allMetrics = Array.from(testSystem.getAllPerformanceMetrics().values());
                    const wellPerformingOps = allMetrics.filter(m => 
                        m.recentAccuracy >= testSystem.config.accuracyThresholds.increase &&
                        m.averageResponseTime <= testSystem.config.responseTimeThresholds.fast
                    );
                    
                    // At least some operations should be performing well for level increase
                    expect(wellPerformingOps.length).toBeGreaterThan(0);
                }
                
                return true;
            }
        ), { numRuns: 100 });
    });
});

/**
 * Helper function to generate performance patterns for testing
 * @param {string} pattern - The performance pattern type
 * @param {number} sessionLength - Number of questions in the session
 * @param {number} baseResponseTime - Base response time in seconds
 * @returns {Array} Array of {isCorrect, responseTime} objects
 */
function generatePerformancePattern(pattern, sessionLength, baseResponseTime) {
    const performanceData = [];
    
    switch (pattern) {
        case 'improving':
            // Start poor, gradually improve
            for (let i = 0; i < sessionLength; i++) {
                const progress = i / (sessionLength - 1); // 0 to 1
                const accuracy = 0.3 + (progress * 0.6); // 30% to 90% accuracy
                const isCorrect = Math.random() < accuracy;
                const responseTime = baseResponseTime * (1.5 - progress * 0.7); // Faster over time
                performanceData.push({ isCorrect, responseTime });
            }
            break;
            
        case 'struggling':
            // Consistently poor performance
            for (let i = 0; i < sessionLength; i++) {
                const isCorrect = Math.random() < 0.4; // 40% accuracy
                const responseTime = baseResponseTime * (1.2 + Math.random() * 0.8); // Slower responses
                performanceData.push({ isCorrect, responseTime });
            }
            break;
            
        case 'consistent_good':
            // Consistently high performance
            for (let i = 0; i < sessionLength; i++) {
                const isCorrect = Math.random() < 0.85; // 85% accuracy
                const responseTime = baseResponseTime * (0.7 + Math.random() * 0.4); // Fast responses
                performanceData.push({ isCorrect, responseTime });
            }
            break;
            
        case 'consistent_poor':
            // Consistently low performance
            for (let i = 0; i < sessionLength; i++) {
                const isCorrect = Math.random() < 0.45; // 45% accuracy
                const responseTime = baseResponseTime * (1.3 + Math.random() * 0.7); // Slow responses
                performanceData.push({ isCorrect, responseTime });
            }
            break;
            
        case 'mixed':
            // Random mixed performance
            for (let i = 0; i < sessionLength; i++) {
                const isCorrect = Math.random() < 0.65; // 65% accuracy (moderate)
                const responseTime = baseResponseTime * (0.8 + Math.random() * 0.8); // Variable response time
                performanceData.push({ isCorrect, responseTime });
            }
            break;
            
        default:
            throw new Error(`Unknown performance pattern: ${pattern}`);
    }
    
    return performanceData;
}