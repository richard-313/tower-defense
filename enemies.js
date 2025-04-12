// --- START OF FILE enemies.js ---
// enemies.js

// Mapping der Zeichefunktionen (Globale Funktionen aus den separaten Dateien)
const enemyDrawFunctions = {
    normal: drawNormalEnemy,
    fast: drawFastEnemy,
    tank: drawTankEnemy,
    boss: drawBossEnemy,
    immune: drawImmuneEnemy,
    regen: drawRegenEnemy
};

class EnemyManager {
    constructor(app, path) {
        this.app = app;
        this.container = new PIXI.Container();
        this.effectsContainer = new PIXI.Container(); // Für Effekte wie Slow, Immune-Flash etc.

        this.app.stage.addChild(this.container);
        this.positionEffectsContainer(); // Call after adding main container

        this.enemies = [];
        this.path = path;
        this.waveNumber = 0;
        this.waveInProgress = false;
        this.enemiesRemaining = 0;
        this.autoStartTimer = null; // Stores requestAnimationFrame ID
        this.countdownTime = 0; // Original countdown duration (for display maybe)
        this.countdownEndTime = 0; // Precise end time using Date.now()
        this.onWaveComplete = null; // Callback after *all* enemies gone
        this.activeSpawnIntervals = []; // Stores setInterval IDs
    }

    positionEffectsContainer() {
        // (Keep the existing logic from previous version)
        const towerContainer = this.app.stage.getChildByName("towerContainer");
        const projectileContainer = this.app.stage.getChildByName("projectileContainer");
        const towerContainerIndex = towerContainer ? this.app.stage.getChildIndex(towerContainer) : -1;
        const projectileContainerIndex = projectileContainer ? this.app.stage.getChildIndex(projectileContainer) : -1;

        let targetIndex = -1;
        if (towerContainerIndex > -1 && projectileContainerIndex > -1) {
            targetIndex = Math.min(towerContainerIndex, projectileContainerIndex);
        } else if (towerContainerIndex > -1) { targetIndex = towerContainerIndex; }
        else if (projectileContainerIndex > -1) { targetIndex = projectileContainerIndex; }

        if (targetIndex > -1) { this.app.stage.addChildAt(this.effectsContainer, targetIndex); }
        else {
            const enemyContainerIndex = this.app.stage.getChildIndex(this.container);
            if (enemyContainerIndex > -1) { this.app.stage.addChildAt(this.effectsContainer, enemyContainerIndex); }
            else { this.app.stage.addChild(this.effectsContainer); }
        }
        this.effectsContainer.name = "enemyEffectsContainer";
    }

    updatePath(newPath) {
        this.path = newPath;
        // If path changes mid-wave, existing enemies might need adjustment (complex)
        // For now, path updates are mainly for game setup/map changes.
    }

    startNextWave(callback) {
        this.waveNumber++;
        this.waveInProgress = true;
        this.onWaveComplete = callback; // Store the callback for when wave fully ends
        this.spawnWave(); // Start spawning enemies for this specific wave
        this.cancelWaveTimer(); // Stop any automatic next wave countdown
        // UI update (showing new wave number) is triggered by the caller (GameUI)
        return this.waveNumber;
    }

    spawnWave() {
        const currentWaveNumber = this.waveNumber;
        const enemiesCount = Math.min(5 + currentWaveNumber * 2, 40);
        let enemiesSpawned = 0;

        this.enemiesRemaining += enemiesCount; // Increment total count
        // console.log(`Wave ${currentWaveNumber} starting. Spawning ${enemiesCount}. Total remaining: ${this.enemiesRemaining}`);

        // Determine available enemy types based on wave number
        const availableTypes = ['normal'];
        if (currentWaveNumber >= 3) availableTypes.push('fast');
        if (currentWaveNumber >= 5) availableTypes.push('tank');
        if (currentWaveNumber >= 8) availableTypes.push('immune');
        if (currentWaveNumber >= 10) availableTypes.push('regen');
        if (currentWaveNumber >= 8 && currentWaveNumber % 5 === 0) {
            const bossCount = Math.floor(currentWaveNumber / 10) + 1;
            for (let b = 0; b < bossCount; b++) availableTypes.push('boss');
        }

        const spawnDelay = Math.max(800 - currentWaveNumber * 15, 250); // Slightly faster scaling, minimum 250ms
        let waveSpawnIntervalId = null;

        const spawnLoop = () => {
            // Stop condition for this specific wave's spawning
            if (enemiesSpawned >= enemiesCount) {
                this.clearSpawnInterval(waveSpawnIntervalId);
                // console.log(`Wave ${currentWaveNumber} finished spawning.`);
                return;
            }

            // Stop if game isn't running
            if (!this.app || !this.app.ticker.started || !window.game?.running) {
                this.clearSpawnInterval(waveSpawnIntervalId);
                // console.log(`Wave ${currentWaveNumber} spawning interrupted.`);
                // Decrement remaining count if interrupted? Maybe not, let reset handle it.
                return;
            }

            // Select enemy type and data
            const randomTypeIndex = Math.floor(Math.random() * availableTypes.length);
            const enemyTypeKey = availableTypes[randomTypeIndex];
            const enemyData = enemyTypes[enemyTypeKey];
            if (!enemyData) {
                console.error(`Enemy data not found for type key: ${enemyTypeKey}`);
                return; // Skip this spawn
            }

            // Calculate health and speed scaling
            let health = enemyData.health;
            const healthMultiplier = 1 + (currentWaveNumber - 1) * 0.2 + Math.pow(currentWaveNumber / 10, 2);
            health = Math.round(health * healthMultiplier);
            let speed = enemyData.speed;
            if (currentWaveNumber > 10) speed *= (1 + (currentWaveNumber - 10) * 0.015); // Slightly faster speed scaling
            const variation = 0.9 + Math.random() * 0.2; // 90% to 110% health variation
            health = Math.max(1, Math.round(health * variation));

            // Create the enemy
            this.createEnemy(enemyTypeKey, enemyData, health, speed);
            enemiesSpawned++;
        };

        // Start the interval timer for this wave
        waveSpawnIntervalId = setInterval(spawnLoop, spawnDelay);
        this.activeSpawnIntervals.push(waveSpawnIntervalId); // Keep track of the active timer
    }

    clearSpawnInterval(intervalId) {
        if (intervalId !== null) {
            clearInterval(intervalId);
            const index = this.activeSpawnIntervals.indexOf(intervalId);
            if (index > -1) {
                this.activeSpawnIntervals.splice(index, 1);
            }
        }
    }

    calculateWaveDifficulty(waveNum) {
        // Placeholder - not directly used in spawning logic currently
        return 1.0 + (waveNum - 1) * 0.1;
    }

    createEnemy(typeKey, enemyData, health, speed = null) {
        const enemyContainer = new PIXI.Container();
        if (!this.path || this.path.length === 0) {
            console.error("Cannot create enemy: Path is invalid!");
            return null;
        }
        enemyContainer.x = this.path[0].x;
        enemyContainer.y = this.path[0].y;

        const enemyGraphics = new PIXI.Graphics();
        enemyContainer.addChild(enemyGraphics);

        const healthBarWidth = enemyData.size * 2;
        const healthBarHeight = 5 * (mapConfig.tileSize / 40); // Scale height slightly with tile size
        const healthBarYOffset = -enemyData.size - (12 * (mapConfig.tileSize / 40)); // Adjust offset based on tile size

        const healthBarBackground = new PIXI.Graphics();
        healthBarBackground.beginFill(0xFF0000, 0.7);
        healthBarBackground.drawRect(-healthBarWidth / 2, healthBarYOffset, healthBarWidth, healthBarHeight);
        healthBarBackground.endFill();

        const healthBar = new PIXI.Graphics();
        healthBar.beginFill(0x00FF00, 0.9);
        healthBar.drawRect(-healthBarWidth / 2, healthBarYOffset, healthBarWidth, healthBarHeight);
        healthBar.endFill();

        enemyContainer.addChild(healthBarBackground);
        enemyContainer.addChild(healthBar);

        const actualSpeed = speed !== null ? speed : enemyData.speed;

        const enemy = {
            id: Math.random().toString(36).substring(2, 9),
            sprite: enemyContainer, graphics: enemyGraphics,
            healthBar: healthBar, healthBarWidth: healthBarWidth, healthBarYOffset: healthBarYOffset,
            x: enemyContainer.x, y: enemyContainer.y,
            type: typeKey, // The key, e.g., 'normal'
            typeNameKey: enemyData.name, // The translation key, e.g., 'enemy.normal.name'
            health: health, maxHealth: health,
            speed: actualSpeed, baseSpeed: actualSpeed,
            size: enemyData.size, color: enemyData.color, reward: enemyData.reward,
            pathIndex: 0,
            slowed: false, slowUntil: 0, effects: [],
            immuneToSlow: enemyData.immuneToSlow || false,
            regeneration: enemyData.regeneration || 0, // HP per second
            lastRegenTime: Date.now() // Not strictly needed for per-frame regen, but keep for now
        };

        // Add immune marker if needed
        if (enemy.immuneToSlow && typeof drawStar === 'function') {
            const immuneMarker = new PIXI.Graphics();
            immuneMarker.beginFill(0xFFFFFF, 0.8);
            immuneMarker.lineStyle(1, 0x8e44ad);
            const markerSize = enemy.size * 0.3;
            drawStar(immuneMarker, 0, -enemy.size - 15, 5, markerSize * 0.7, markerSize * 0.3);
            immuneMarker.endFill();
            enemyContainer.addChild(immuneMarker);
        } else if (enemy.immuneToSlow) {
            // Fallback if drawStar is missing
            const immuneMarkerFallback = new PIXI.Graphics();
            immuneMarkerFallback.beginFill(0xFFFFFF, 0.8).lineStyle(1, 0x8e44ad).drawCircle(0, -enemy.size - 15, enemy.size * 0.2).endFill();
            enemyContainer.addChild(immuneMarkerFallback);
        }


        this.drawEnemy(enemy); // Initial draw
        this.container.addChild(enemyContainer);
        this.enemies.push(enemy);
        return enemy;
    }

    drawEnemy(enemy) {
        if (!enemy.graphics || enemy.graphics._destroyed) return;
        enemy.graphics.clear();
        const drawFunc = enemyDrawFunctions[enemy.type];
        if (drawFunc) {
            if (enemy.type === 'fast' && this.path && this.path.length > enemy.pathIndex) {
                drawFunc(enemy, enemy.graphics, this.path);
            } else {
                drawFunc(enemy, enemy.graphics);
            }
        } else { // Fallback
            enemy.graphics.beginFill(enemy.color || 0xFF00FF).drawCircle(0, 0, enemy.size).endFill();
        }
    }

    // *** MOVED METHODS FROM UI PROTOTYPE EXTENSION ***
    cancelWaveTimer() {
        if (this.autoStartTimer) {
            cancelAnimationFrame(this.autoStartTimer); // Use cancelAnimationFrame
            this.autoStartTimer = null;
        }
        this.countdownTime = 0;
        this.countdownEndTime = 0;
    }

    getCurrentCountdownPrecise() {
        if (!this.autoStartTimer || !this.countdownEndTime) return 0;
        return Math.max(0, this.countdownEndTime - Date.now());
    };

    scheduleNextWave(delay, autoStartCallback) {
        this.cancelWaveTimer(); // Clear existing timer first
        this.countdownTime = delay;
        this.countdownEndTime = Date.now() + delay;

        const update = () => {
            // Stop if timer was cancelled externally
            if (!this.autoStartTimer) return;

            const remaining = this.countdownEndTime - Date.now();
            if (remaining <= 0) {
                // Timer finished
                const timerId = this.autoStartTimer; // Store id just in case (though not strictly needed now)
                this.autoStartTimer = null; // Mark timer as inactive *before* potentially starting new wave
                // No need to cancelAnimationFrame(timerId) here, the check above handles it

                this.countdownEndTime = 0; // Reset end time

                // Check game state via global game object (or pass UI state if preferred)
                const uiLives = window.game?.gameUI?.lives;
                // Start next wave ONLY if no wave is currently active and game is not over
                if (!this.waveInProgress && uiLives !== undefined && uiLives > 0) {
                    // console.log("Auto-starting next wave.");
                    this.startNextWave(this.onWaveComplete); // Start the wave logic
                    if (autoStartCallback) {
                        autoStartCallback(); // Notify UI or other listeners
                    }
                } else {
                    // console.log("Auto-start condition not met (wave in progress or game over).");
                }
            } else {
                // Timer still running, request next frame
                this.autoStartTimer = requestAnimationFrame(update);
            }
        };
        // Start the requestAnimationFrame loop
        this.autoStartTimer = requestAnimationFrame(update);
    }
    // *** END OF MOVED METHODS ***


    update(onEnemyEscape, onEnemyDeath) {
        const deltaTime = this.app.ticker.deltaMS;
        if (deltaTime <= 0) return false;
        const timeScale = Math.min(deltaTime / (1000 / 60), 5); // Allow up to 5x speed catch-up

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            if (!enemy || !enemy.sprite || enemy.sprite._destroyed) {
                if (this.enemies[i]) this.enemies.splice(i, 1);
                continue;
            }

            // Regeneration
            if (enemy.regeneration > 0 && enemy.health < enemy.maxHealth) {
                const healAmount = (enemy.regeneration / 1000) * deltaTime; // Heal per ms
                enemy.health = Math.min(enemy.health + healAmount, enemy.maxHealth);
                // Health bar updated later in the loop
            }

            // Slow Effect Expiry
            if (enemy.slowed && Date.now() > enemy.slowUntil) {
                enemy.slowed = false;
                enemy.speed = enemy.baseSpeed;
                const slowEffectIndex = enemy.effects.findIndex(e => e.type === 'slowVisual');
                if (slowEffectIndex > -1) this.removeEnemyEffect(enemy, slowEffectIndex);
            }

            // Movement
            if (!this.path || enemy.pathIndex >= this.path.length) {
                onEnemyEscape(enemy);
                this.enemiesRemaining--;
                this.removeEnemy(i);
                continue;
            }
            const targetPoint = this.path[enemy.pathIndex];
            const dx = targetPoint.x - enemy.x;
            const dy = targetPoint.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Adjust speed by timeScale factor
            const moveDistance = enemy.speed * timeScale;

            if (distance <= moveDistance || distance < 0.1) { // Added small tolerance
                enemy.x = targetPoint.x;
                enemy.y = targetPoint.y;
                enemy.pathIndex++;
                if (enemy.pathIndex >= this.path.length) {
                    onEnemyEscape(enemy);
                    this.enemiesRemaining--;
                    this.removeEnemy(i);
                    continue;
                }
            } else {
                const dirX = dx / distance;
                const dirY = dy / distance;
                enemy.x += dirX * moveDistance;
                enemy.y += dirY * moveDistance;
            }

            // Update Sprite Position & Health Bar Fill
            if (enemy.sprite && !enemy.sprite._destroyed) {
                enemy.sprite.x = enemy.x;
                enemy.sprite.y = enemy.y;
                this.updateHealthBar(enemy); // Update health bar display
            }

            // Redraw Enemy Graphics (for animation/rotation)
            this.drawEnemy(enemy);

            // Check Death
            if (enemy.health <= 0) {
                onEnemyDeath(enemy);
                this.enemiesRemaining--;
                this.removeEnemy(i);
                continue;
            }
        } // End enemy loop

        // Wave Completion Check
        if (this.waveInProgress && this.enemies.length === 0 && this.enemiesRemaining <= 0 && this.activeSpawnIntervals.length === 0) {
            // console.log(`Wave ${this.waveNumber} fully completed. Remaining count: ${this.enemiesRemaining}`);
            const wasInProgress = this.waveInProgress;
            this.waveInProgress = false;

            if (wasInProgress && this.onWaveComplete) {
                const callback = this.onWaveComplete;
                this.onWaveComplete = null;
                // console.log("Wave complete, executing callback.");
                callback(); // Trigger UI actions (schedule next wave, add bonus gold)
            }
            return true; // Signal completion
        }

        return false; // Still active
    }

    updateHealthBar(enemy) {
        if (!enemy.healthBar || enemy.healthBar._destroyed || !enemy.sprite || enemy.sprite._destroyed) return;
        const healthPercentage = Math.max(0, enemy.health / enemy.maxHealth);
        const currentBarWidth = enemy.healthBarWidth * healthPercentage;
        enemy.healthBar.clear();
        enemy.healthBar.beginFill(0x00FF00, 0.9);
        enemy.healthBar.drawRect(-enemy.healthBarWidth / 2, enemy.healthBarYOffset, currentBarWidth, 5 * (mapConfig.tileSize / 40)); // Use stored offset/width
        enemy.healthBar.endFill();
    }

    removeEnemy(index) {
        if (index < 0 || index >= this.enemies.length) return;
        const enemy = this.enemies[index];
        if (!enemy) {
            if (this.enemies[index]) this.enemies.splice(index, 1);
            return;
        }
        // console.log(`Removing enemy ${enemy.id} at index ${index}`);
        this.removeAllEffectsForEnemy(enemy);
        if (enemy.sprite && !enemy.sprite._destroyed) {
            if (enemy.sprite.parent) enemy.sprite.parent.removeChild(enemy.sprite);
            enemy.sprite.destroy({ children: true });
        }
        // Remove from array LAST
        this.enemies.splice(index, 1);
    }

    removeAllEffectsForEnemy(enemy) {
        if (!enemy || !enemy.effects) return;
        for (let j = enemy.effects.length - 1; j >= 0; j--) {
            this.removeEnemyEffect(enemy, j); // This handles ticker removal and graphics destruction
        }
        enemy.effects = [];
    }

    removeEnemyEffect(enemy, effectIndex) {
        if (!enemy || !enemy.effects || effectIndex < 0 || effectIndex >= enemy.effects.length) return;
        const effectData = enemy.effects[effectIndex];
        if (!effectData) return;

        if (effectData.tickerCallback && this.app?.ticker) {
            this.app.ticker.remove(effectData.tickerCallback);
        }
        if (effectData.graphics && !effectData.graphics._destroyed) {
            // Remove from the dedicated effects container
            if (effectData.graphics.parent === this.effectsContainer) {
                this.effectsContainer.removeChild(effectData.graphics);
            } else if (effectData.graphics.parent) {
                // Fallback if parent isn't the expected container
                effectData.graphics.parent.removeChild(effectData.graphics);
            }
            effectData.graphics.destroy({ children: true });
        }
        // Remove from array AFTER cleanup
        enemy.effects.splice(effectIndex, 1);
    }

    applyEffect(enemy, effect, duration, value) {
        if (!enemy || enemy.health <= 0 || !enemy.sprite || enemy.sprite._destroyed) return;
        switch (effect) {
            case 'slow':
                if (enemy.immuneToSlow) {
                    this.showImmuneEffect(enemy); return;
                }
                const newSlowEndTime = Date.now() + duration;
                // Apply if not slowed, or if new slow is stronger, or if duration extends
                if (!enemy.slowed || value < (enemy.speed / enemy.baseSpeed)) {
                    enemy.speed = enemy.baseSpeed * value; // Apply potentially stronger slow
                }
                enemy.slowUntil = Math.max(enemy.slowUntil, newSlowEndTime); // Extend duration
                if (!enemy.slowed) { // Add visual only on initial application
                    enemy.slowed = true;
                    this.addSlowEffect(enemy);
                }
                break;
            // ... other effects
        }
    }

    showImmuneEffect(enemy) {
        // (Keep existing logic)
        if (!enemy || !enemy.sprite || enemy.sprite._destroyed || !this.effectsContainer) return;
        const immuneEffect = new PIXI.Graphics();
        immuneEffect.beginFill(0xFFFF00, 0.6).drawCircle(0, 0, enemy.size + 5).endFill();
        immuneEffect.x = enemy.x; immuneEffect.y = enemy.y;
        this.effectsContainer.addChild(immuneEffect);
        let tickerCallback; const duration = 300; const startTime = Date.now();
        tickerCallback = () => {
            const currentEnemy = this.enemies.find(e => e?.id === enemy.id);
            if (!immuneEffect || immuneEffect._destroyed || !currentEnemy) {
                if (immuneEffect && !immuneEffect._destroyed) { if (immuneEffect.parent) immuneEffect.parent.removeChild(immuneEffect); immuneEffect.destroy(); }
                if (this.app?.ticker) this.app.ticker.remove(tickerCallback); return;
            }
            immuneEffect.x = currentEnemy.x; immuneEffect.y = currentEnemy.y;
            const elapsed = Date.now() - startTime; const progress = Math.min(elapsed / duration, 1);
            immuneEffect.scale.set(1.0 + progress * 0.5); immuneEffect.alpha = 1.0 - progress;
            if (progress >= 1) {
                if (immuneEffect.parent) immuneEffect.parent.removeChild(immuneEffect); immuneEffect.destroy();
                if (this.app?.ticker) this.app.ticker.remove(tickerCallback);
            }
        };
        if (this.app?.ticker) this.app.ticker.add(tickerCallback);
    }

    addSlowEffect(enemy) {
        // (Keep existing logic, ensures effect is added to effectsContainer)
        if (!enemy || enemy.effects.some(e => e.type === 'slowVisual')) return;
        const slowEffectGraphics = new PIXI.Graphics();
        this.effectsContainer.addChild(slowEffectGraphics); // Add to correct container
        const particles = []; const particleCount = 5;
        for (let i = 0; i < particleCount; i++) {
            const pGraph = new PIXI.Graphics().beginFill(0x1abc9c, 0.8).drawCircle(0, 0, 2).endFill();
            particles.push({ graphics: pGraph, angle: Math.random() * Math.PI * 2, radiusOffset: Math.random() * 4, speed: (0.5 + Math.random()) * (Math.random() < 0.5 ? 1 : -1) });
            slowEffectGraphics.addChild(pGraph);
        }
        let tickerCallback;
        tickerCallback = () => {
            const currentEnemy = this.enemies.find(e => e?.id === enemy.id);
            const effectData = currentEnemy?.effects.find(e => e.tickerCallback === tickerCallback);
            if (!slowEffectGraphics || slowEffectGraphics._destroyed || !currentEnemy || !currentEnemy.slowed || !effectData) {
                const indexToRemove = currentEnemy?.effects.indexOf(effectData) ?? -1;
                if (currentEnemy && indexToRemove > -1) this.removeEnemyEffect(currentEnemy, indexToRemove);
                else if (slowEffectGraphics && !slowEffectGraphics._destroyed) { // Fallback cleanup
                    if (slowEffectGraphics.parent) slowEffectGraphics.parent.removeChild(slowEffectGraphics);
                    slowEffectGraphics.destroy({ children: true });
                    if (this.app?.ticker) this.app.ticker.remove(tickerCallback);
                }
                return;
            }
            slowEffectGraphics.x = currentEnemy.x; slowEffectGraphics.y = currentEnemy.y;
            const time = Date.now() / 1000;
            particles.forEach(p => {
                if (p.graphics && !p.graphics._destroyed) {
                    p.angle += p.speed * 0.03;
                    const baseRadius = currentEnemy.size + 4 * (mapConfig.tileSize / 40); // Scale radius slightly
                    const radius = baseRadius + p.radiusOffset + Math.sin(p.angle * 2 + time) * 1.5;
                    p.graphics.x = Math.cos(p.angle) * radius; p.graphics.y = Math.sin(p.angle) * radius;
                    p.graphics.alpha = 0.6 + Math.sin(time * 1.5 + p.angle) * 0.3;
                }
            });
        };
        const newEffectData = { type: 'slowVisual', graphics: slowEffectGraphics, tickerCallback: tickerCallback };
        enemy.effects.push(newEffectData);
        if (this.app?.ticker) this.app.ticker.add(tickerCallback);
    }

    resetGame() {
        // Stop spawning intervals
        this.activeSpawnIntervals.forEach(intervalId => clearInterval(intervalId));
        this.activeSpawnIntervals = [];
        // Remove existing enemies & their effects
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.removeEnemy(i); // Handles sprite/effect cleanup
        }
        this.enemies = [];
        // Reset wave state
        this.waveNumber = 0;
        this.waveInProgress = false;
        this.enemiesRemaining = 0;
        this.cancelWaveTimer(); // Stop countdown timer
        this.onWaveComplete = null;
        // Effects container is cleared by removeEnemyEffect calls
    }

} // End EnemyManager Class
// --- END OF FILE enemies.js ---