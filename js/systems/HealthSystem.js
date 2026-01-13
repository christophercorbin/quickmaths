/**
 * HealthSystem - Dedicated system for managing player health and visual health bar
 * Handles health tracking, damage, healing, and health bar display
 */
class HealthSystem {
    constructor(config = {}) {
        this.config = {
            maxHealth: 100,
            startingHealth: 100,
            showHealthBar: true,
            healthBarWidth: 200,
            healthBarHeight: 20,
            healthBarPosition: { x: null, y: null }, // null means auto-position
            healthBarMargin: 10,
            healthBarBorderWidth: 2,
            healthBarColors: {
                background: '#ecf0f1',
                border: '#bdc3c7',
                healthy: '#27ae60',    // Green (>60%)
                warning: '#f39c12',    // Orange (30-60%)
                critical: '#e74c3c'    // Red (<30%)
            },
            showHealthText: true,
            healthTextColor: '#2c3e50',
            healthTextFont: '12px Arial',
            ...config
        };
        
        // System references
        this.gameEngine = null;
        
        // Health state
        this.currentHealth = this.config.startingHealth;
        this.maxHealth = this.config.maxHealth;
        this.isDead = false;
        
        // Health change tracking
        this.healthHistory = [];
        this.lastDamageTime = 0;
        this.lastHealTime = 0;
        
        // Visual effects
        this.damageFlashTime = 0;
        this.damageFlashDuration = 300; // milliseconds
        
        console.log('HealthSystem initialized with config:', this.config);
    }
    
    /**
     * Initialize the system with the game engine
     * @param {GameEngine} gameEngine - The game engine instance
     */
    init(gameEngine) {
        this.gameEngine = gameEngine;
        console.log('HealthSystem initialized with game engine');
    }
    
    /**
     * Take damage and reduce health
     * @param {number} damage - Amount of damage to take
     * @param {string} source - Source of the damage (for tracking)
     * @returns {boolean} True if still alive, false if dead
     */
    takeDamage(damage, source = 'unknown') {
        if (this.isDead) return false;
        
        const requestedDamage = Math.max(0, damage);
        const previousHealth = this.currentHealth;
        
        this.currentHealth = Math.max(0, this.currentHealth - requestedDamage);
        this.lastDamageTime = Date.now();
        
        // Calculate actual damage applied (health change)
        const actualDamageApplied = previousHealth - this.currentHealth;
        
        // Trigger damage flash effect
        this.damageFlashTime = Date.now();
        
        // Record health change with actual damage applied, not requested damage
        this.recordHealthChange('damage', actualDamageApplied, source, previousHealth, this.currentHealth);
        
        // Check if dead
        if (this.currentHealth <= 0) {
            this.isDead = true;
            this.onDeath();
        }
        
        console.log(`Health: ${previousHealth} -> ${this.currentHealth} (damage: ${actualDamageApplied} from ${source})`);
        
        return !this.isDead;
    }
    
    /**
     * Heal and increase health
     * @param {number} healAmount - Amount of health to restore
     * @param {string} source - Source of the healing (for tracking)
     * @returns {number} Actual amount healed
     */
    heal(healAmount, source = 'unknown') {
        if (this.isDead) return 0;
        
        const actualHeal = Math.max(0, healAmount);
        const previousHealth = this.currentHealth;
        
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + actualHeal);
        this.lastHealTime = Date.now();
        
        const actualHealed = this.currentHealth - previousHealth;
        
        // Record health change
        this.recordHealthChange('heal', actualHealed, source, previousHealth, this.currentHealth);
        
        console.log(`Health: ${previousHealth} -> ${this.currentHealth} (healed: ${actualHealed} from ${source})`);
        
        return actualHealed;
    }
    
    /**
     * Set health to a specific value
     * @param {number} newHealth - New health value
     * @param {string} source - Source of the change
     */
    setHealth(newHealth, source = 'system') {
        const clampedHealth = Math.max(0, Math.min(this.maxHealth, newHealth));
        const previousHealth = this.currentHealth;
        
        this.currentHealth = clampedHealth;
        
        // Record health change
        const changeAmount = Math.abs(clampedHealth - previousHealth);
        const changeType = clampedHealth > previousHealth ? 'heal' : 'damage';
        this.recordHealthChange(changeType, changeAmount, source, previousHealth, this.currentHealth);
        
        // Check death state
        if (this.currentHealth <= 0 && !this.isDead) {
            this.isDead = true;
            this.onDeath();
        } else if (this.currentHealth > 0 && this.isDead) {
            this.isDead = false;
            this.onRevive();
        }
        
        console.log(`Health set: ${previousHealth} -> ${this.currentHealth} (source: ${source})`);
    }
    
    /**
     * Reset health to maximum
     */
    resetHealth() {
        this.currentHealth = this.maxHealth;
        this.isDead = false;
        this.healthHistory = [];
        this.lastDamageTime = 0;
        this.lastHealTime = 0;
        this.damageFlashTime = 0;
        
        console.log('Health system reset to full health');
    }
    
    /**
     * Get current health value
     * @returns {number} Current health
     */
    getCurrentHealth() {
        return this.currentHealth;
    }
    
    /**
     * Get maximum health value
     * @returns {number} Maximum health
     */
    getMaxHealth() {
        return this.maxHealth;
    }
    
    /**
     * Get health as a percentage (0-1)
     * @returns {number} Health percentage
     */
    getHealthPercentage() {
        return this.maxHealth > 0 ? this.currentHealth / this.maxHealth : 0;
    }
    
    /**
     * Check if the entity is dead
     * @returns {boolean} True if dead
     */
    isEntityDead() {
        return this.isDead;
    }
    
    /**
     * Check if health is at maximum
     * @returns {boolean} True if at full health
     */
    isFullHealth() {
        return this.currentHealth >= this.maxHealth;
    }
    
    /**
     * Check if health is in critical range (< 30%)
     * @returns {boolean} True if in critical health
     */
    isCriticalHealth() {
        return this.getHealthPercentage() < 0.3;
    }
    
    /**
     * Check if health is in warning range (30-60%)
     * @returns {boolean} True if in warning health
     */
    isWarningHealth() {
        const percentage = this.getHealthPercentage();
        return percentage >= 0.3 && percentage <= 0.6;
    }
    
    /**
     * Record a health change event
     * @param {string} type - Type of change ('damage' or 'heal')
     * @param {number} amount - Amount of change
     * @param {string} source - Source of the change
     * @param {number} previousHealth - Health before change
     * @param {number} newHealth - Health after change
     */
    recordHealthChange(type, amount, source, previousHealth, newHealth) {
        const event = {
            type,
            amount,
            source,
            previousHealth,
            newHealth,
            timestamp: Date.now()
        };
        
        this.healthHistory.push(event);
        
        // Keep only last 50 events to prevent memory issues
        if (this.healthHistory.length > 50) {
            this.healthHistory.shift();
        }
    }
    
    /**
     * Handle death event
     */
    onDeath() {
        console.log('Entity has died');
        
        // Notify other systems about death
        if (this.gameEngine) {
            // Could emit an event or call a callback here
            // For now, we'll just log it
        }
    }
    
    /**
     * Handle revive event
     */
    onRevive() {
        console.log('Entity has been revived');
    }
    
    /**
     * Get health statistics
     * @returns {Object} Health statistics
     */
    getHealthStats() {
        const totalDamage = this.healthHistory
            .filter(event => event.type === 'damage')
            .reduce((sum, event) => sum + event.amount, 0);
            
        const totalHealing = this.healthHistory
            .filter(event => event.type === 'heal')
            .reduce((sum, event) => sum + event.amount, 0);
        
        return {
            currentHealth: this.currentHealth,
            maxHealth: this.maxHealth,
            healthPercentage: this.getHealthPercentage(),
            isDead: this.isDead,
            totalDamageTaken: totalDamage,
            totalHealingReceived: totalHealing,
            healthChanges: this.healthHistory.length,
            lastDamageTime: this.lastDamageTime,
            lastHealTime: this.lastHealTime
        };
    }
    
    /**
     * Update the health system (called each frame)
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        // Update visual effects timers
        // The damage flash effect will be handled in render()
    }
    
    /**
     * Render the health bar and related UI
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    render(context) {
        if (!this.config.showHealthBar) return;
        
        const canvasSize = this.gameEngine.getCanvasSize();
        this.renderHealthBar(context, canvasSize);
    }
    
    /**
     * Render the health bar
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     * @param {Object} canvasSize - Canvas dimensions
     */
    renderHealthBar(context, canvasSize) {
        // Calculate position
        let barX, barY;
        if (this.config.healthBarPosition.x !== null && this.config.healthBarPosition.y !== null) {
            barX = this.config.healthBarPosition.x;
            barY = this.config.healthBarPosition.y;
        } else {
            // Auto-position at top-right
            barX = canvasSize.width - this.config.healthBarWidth - this.config.healthBarMargin;
            barY = this.config.healthBarMargin;
        }
        
        const barWidth = this.config.healthBarWidth;
        const barHeight = this.config.healthBarHeight;
        
        // Draw background
        context.fillStyle = this.config.healthBarColors.background;
        context.fillRect(barX, barY, barWidth, barHeight);
        
        // Draw border
        context.strokeStyle = this.config.healthBarColors.border;
        context.lineWidth = this.config.healthBarBorderWidth;
        context.strokeRect(barX, barY, barWidth, barHeight);
        
        // Draw health fill
        const healthPercent = this.getHealthPercentage();
        const fillWidth = Math.max(0, barWidth * healthPercent);
        
        // Determine health bar color based on health level
        let fillColor;
        if (healthPercent > 0.6) {
            fillColor = this.config.healthBarColors.healthy;
        } else if (healthPercent > 0.3) {
            fillColor = this.config.healthBarColors.warning;
        } else {
            fillColor = this.config.healthBarColors.critical;
        }
        
        // Apply damage flash effect
        const currentTime = Date.now();
        if (currentTime - this.damageFlashTime < this.damageFlashDuration) {
            // Flash between normal color and white
            const flashProgress = (currentTime - this.damageFlashTime) / this.damageFlashDuration;
            const flashIntensity = Math.sin(flashProgress * Math.PI * 4) * 0.5 + 0.5;
            
            if (flashIntensity > 0.5) {
                fillColor = '#ffffff'; // Flash white
            }
        }
        
        // Only draw health fill if there's health remaining
        if (fillWidth > 0) {
            context.fillStyle = fillColor;
            context.fillRect(barX, barY, fillWidth, barHeight);
        }
        
        // Add visual indicator for zero health (death state)
        if (this.isDead || this.currentHealth <= 0) {
            // Draw a red background overlay when dead
            context.fillStyle = 'rgba(231, 76, 60, 0.8)'; // Semi-transparent red
            context.fillRect(barX, barY, barWidth, barHeight);
            
            // Draw a red "X" or skull indicator when dead
            context.strokeStyle = '#ffffff'; // White X on red background
            context.lineWidth = 4;
            
            // Draw X pattern
            const centerX = barX + barWidth / 2;
            const centerY = barY + barHeight / 2;
            const size = Math.min(barWidth, barHeight) * 0.4;
            
            context.beginPath();
            context.moveTo(centerX - size, centerY - size);
            context.lineTo(centerX + size, centerY + size);
            context.moveTo(centerX + size, centerY - size);
            context.lineTo(centerX - size, centerY + size);
            context.stroke();
            
            // Add "DEAD" text
            context.fillStyle = '#ffffff';
            context.font = 'bold 10px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'bottom';
            context.fillText('DEAD', centerX, barY - 2);
        }
        
        // Draw health text if enabled
        if (this.config.showHealthText) {
            context.fillStyle = this.config.healthTextColor;
            context.font = this.config.healthTextFont;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            const healthText = `${this.currentHealth}/${this.maxHealth}`;
            context.fillText(healthText, barX + barWidth / 2, barY + barHeight / 2);
        }
        
        // Add "HEALTH" label above the bar
        context.fillStyle = this.config.healthTextColor;
        context.font = '12px Arial';
        context.textAlign = 'left';
        context.textBaseline = 'bottom';
        context.fillText('HEALTH', barX, barY - 2);
        
        // Reset text alignment for other systems
        context.textAlign = 'left';
        context.textBaseline = 'top';
    }
    
    /**
     * Export health data for saving/analytics
     * @returns {Object} Exportable health data
     */
    exportData() {
        return {
            currentHealth: this.currentHealth,
            maxHealth: this.maxHealth,
            isDead: this.isDead,
            healthStats: this.getHealthStats(),
            healthHistory: this.healthHistory
        };
    }
}

// Make HealthSystem available globally
window.HealthSystem = HealthSystem;