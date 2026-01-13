/**
 * Unit tests for AdaptiveLearningSystem
 * Tests performance tracking, difficulty adjustment, and adaptive learning features
 */

describe('AdaptiveLearningSystem', () => {
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
            performanceWindowSize: 5,
            minAttemptsForAdjustment: 3,
            accuracyThresholds: {
                increase: 0.8,
                decrease: 0.5
            },
            strugglingThreshold: 0.6,
            masteryThreshold: 0.85
        });
    });
    
    describe('Performance Tracking', () => {
        test('should initialize with empty performance metrics', () => {
            const metrics = adaptiveLearningSystem.getPerformanceMetrics('addition');
            
            expect(metrics).toBeDefined();
            expect(metrics.totalAttempts).toBe(0);
            expect(metrics.correctAnswers).toBe(0);
            expect(metrics.recentAccuracy).toBe(0);
            expect(metrics.averageResponseTime).toBe(0);
        });
        
        test('should record correct answers and update metrics', () => {
            // Record some correct answers
            adaptiveLearningSystem.recordAnswer('addition', 1, true, 2.5);
            adaptiveLearningSystem.recordAnswer('addition', 1, true, 3.0);
            adaptiveLearningSystem.recordAnswer('addition', 1, true, 2.0);
            
            const metrics = adaptiveLearningSystem.getPerformanceMetrics('addition');
            
            expect(metrics.totalAttempts).toBe(3);
            expect(metrics.correctAnswers).toBe(3);
            expect(metrics.recentAccuracy).toBe(1.0); // 100% accuracy
            expect(metrics.averageResponseTime).toBeCloseTo(2.42, 1); // Weighted average
        });
        
        test('should record incorrect answers and update metrics', () => {
            // Record mixed answers
            adaptiveLearningSystem.recordAnswer('subtraction', 1, true, 2.0);
            adaptiveLearningSystem.recordAnswer('subtraction', 1, false, 4.0);
            adaptiveLearningSystem.recordAnswer('subtraction', 1, false, 3.5);
            
            const metrics = adaptiveLearningSystem.getPerformanceMetrics('subtraction');
            
            expect(metrics.totalAttempts).toBe(3);
            expect(metrics.correctAnswers).toBe(1);
            expect(metrics.recentAccuracy).toBeCloseTo(0.33, 1); // 33% accuracy
        });
        
        test('should maintain performance window size', () => {
            // Record more answers than window size
            for (let i = 0; i < 8; i++) {
                adaptiveLearningSystem.recordAnswer('multiplication', 1, true, 2.0);
            }
            
            const metrics = adaptiveLearningSystem.getPerformanceMetrics('multiplication');
            
            expect(metrics.recentAttempts.length).toBe(5); // Window size limit
            expect(metrics.totalAttempts).toBe(8); // Total count still accurate
        });
    });
    
    describe('Difficulty Adjustment', () => {
        test('should increase difficulty for good performance', () => {
            // Record good performance (high accuracy, fast response)
            for (let i = 0; i < 5; i++) {
                adaptiveLearningSystem.recordAnswer('addition', 1, true, 2.0);
            }
            
            const newDifficulty = adaptiveLearningSystem.calculateOptimalDifficulty('addition');
            
            expect(newDifficulty).toBe(2); // Should increase from 1 to 2
        });
        
        test('should decrease difficulty for poor performance', () => {
            // Start at higher difficulty
            const metrics = adaptiveLearningSystem.getPerformanceMetrics('division');
            metrics.difficultyProgression = [3]; // Start at difficulty 3
            
            // Record poor performance
            for (let i = 0; i < 5; i++) {
                adaptiveLearningSystem.recordAnswer('division', 3, false, 8.0);
            }
            
            const newDifficulty = adaptiveLearningSystem.calculateOptimalDifficulty('division');
            
            expect(newDifficulty).toBe(2); // Should decrease from 3 to 2
        });
        
        test('should not adjust difficulty with insufficient attempts', () => {
            // Set initial difficulty progression
            const metrics = adaptiveLearningSystem.getPerformanceMetrics('multiplication');
            metrics.difficultyProgression = [2]; // Start at difficulty 2
            
            // Record only 2 attempts (below minimum of 3)
            adaptiveLearningSystem.recordAnswer('multiplication', 2, true, 2.0);
            adaptiveLearningSystem.recordAnswer('multiplication', 2, true, 2.5);
            
            const newDifficulty = adaptiveLearningSystem.calculateOptimalDifficulty('multiplication');
            
            expect(newDifficulty).toBe(2); // Should stay at current difficulty
        });
    });
    
    describe('Adaptive Learning Features', () => {
        test('should identify struggling operations', () => {
            // Create struggling performance for subtraction
            for (let i = 0; i < 5; i++) {
                adaptiveLearningSystem.recordAnswer('subtraction', 1, false, 6.0);
            }
            
            const strugglingOps = adaptiveLearningSystem.getOperationsNeedingPractice();
            
            expect(strugglingOps).toContain('subtraction');
        });
        
        test('should recommend struggling operations for practice', () => {
            // Create struggling performance
            for (let i = 0; i < 5; i++) {
                adaptiveLearningSystem.recordAnswer('division', 2, false, 7.0);
            }
            
            const recommendedOp = adaptiveLearningSystem.getNextRecommendedOperation();
            
            expect(recommendedOp).toBe('division');
        });
        
        test('should detect mastery achievement', () => {
            // Create mastery-level performance
            for (let i = 0; i < 5; i++) {
                adaptiveLearningSystem.recordAnswer('addition', 1, true, 1.5);
            }
            
            const metrics = adaptiveLearningSystem.getPerformanceMetrics('addition');
            
            expect(metrics.masteryAchieved).toBe(true);
        });
        
        test('should provide learning progress summary', () => {
            // Record some performance data
            adaptiveLearningSystem.recordAnswer('addition', 1, true, 2.0);
            adaptiveLearningSystem.recordAnswer('subtraction', 1, false, 5.0);
            adaptiveLearningSystem.recordAnswer('multiplication', 2, true, 3.0);
            
            const progress = adaptiveLearningSystem.getLearningProgress();
            
            expect(progress).toHaveProperty('sessionAccuracy');
            expect(progress).toHaveProperty('totalAttempts');
            expect(progress).toHaveProperty('operationProgress');
            expect(progress.totalAttempts).toBe(3);
            expect(progress.sessionAccuracy).toBeCloseTo(0.67, 1); // 2/3 correct
        });
    });
    
    describe('Session Management', () => {
        test('should reset session data', () => {
            // Record some data
            adaptiveLearningSystem.recordAnswer('addition', 1, true, 2.0);
            adaptiveLearningSystem.recordAnswer('addition', 1, false, 3.0);
            
            // Reset session
            adaptiveLearningSystem.resetSession();
            
            const progress = adaptiveLearningSystem.getLearningProgress();
            
            expect(progress.totalAttempts).toBe(0);
            expect(progress.sessionAccuracy).toBe(0);
        });
        
        test('should maintain operation metrics across session resets', () => {
            // Record some data
            adaptiveLearningSystem.recordAnswer('multiplication', 1, true, 2.0);
            
            // Reset session
            adaptiveLearningSystem.resetSession();
            
            // Operation metrics should still exist
            const metrics = adaptiveLearningSystem.getPerformanceMetrics('multiplication');
            expect(metrics.totalAttempts).toBe(1); // Operation data persists
        });
    });
    
    describe('Integration Features', () => {
        test('should determine when to increase level', () => {
            // Record good performance across multiple operations
            const operations = ['addition', 'subtraction', 'multiplication'];
            
            for (const op of operations) {
                for (let i = 0; i < 5; i++) {
                    adaptiveLearningSystem.recordAnswer(op, 1, true, 2.0);
                }
            }
            
            const shouldIncrease = adaptiveLearningSystem.shouldIncreaseLevel();
            
            expect(shouldIncrease).toBe(true);
        });
        
        test('should not increase level with poor performance', () => {
            // Record poor performance
            for (let i = 0; i < 5; i++) {
                adaptiveLearningSystem.recordAnswer('addition', 1, false, 6.0);
            }
            
            const shouldIncrease = adaptiveLearningSystem.shouldIncreaseLevel();
            
            expect(shouldIncrease).toBe(false);
        });
    });
});