// Enemy Types and Management
const enemyTypes = {
    normal: {
        name: 'Bauer',
        health: 50,
        speed: 1,
        reward: 10,
        color: 0x7f8c8d,
        size: 15
    },
    fast: {
        name: 'Späher',
        health: 30,
        speed: 2,
        reward: 15,
        color: 0x9b59b6,
        size: 12
    },
    tank: {
        name: 'Ritter',
        health: 150,
        speed: 0.5,
        reward: 20,
        color: 0x2c3e50,
        size: 18
    },
    boss: {
        name: 'Kriegsherr',
        health: 300,
        speed: 0.7,
        reward: 50,
        color: 0xc0392b,
        size: 25
    },
    // Neuer Gegnertyp: Immun gegen Verlangsamung
    immune: {
        name: 'Hexer',
        health: 120,
        speed: 1.2,
        reward: 25,
        color: 0x8e44ad,
        size: 16,
        immuneToSlow: true
    },
    // Neuer Gegnertyp: Regeneriert seine Gesundheit
    regen: {
        name: 'Kleriker',
        health: 100,
        speed: 0.8,
        reward: 30,
        color: 0x27ae60,
        size: 17,
        regeneration: 0.2 // Gesundheit pro Sekunde
    }
};

class EnemyManager {
    constructor(app, path) {
        this.app = app;
        this.container = new PIXI.Container();
        this.effectsContainer = new PIXI.Container(); // Für Effekte und Partikel

        this.app.stage.addChild(this.container);
        this.app.stage.addChild(this.effectsContainer);

        this.enemies = [];
        this.path = path;
        this.waveNumber = 0;
        this.waveInProgress = false; // Indicates if enemies are currently active or being spawned
        this.enemiesRemaining = 0; // Total enemies expected in the current cycle
        this.spawnInterval = null;
        this.autoStartTimer = null;
        this.countdownTime = 0;
        this.onWaveComplete = null; // Callback for when the entire batch of waves is clear

        this.pendingWaves = 0; // Number of waves waiting to be processed
        this.enemiesToSpawnQueue = []; // Queue of enemy definitions to spawn

        // Sprites für verschiedene Feindtypen (if needed, otherwise remove)
        // this.enemySprites = {}; // Currently unused
    }

    updatePath(newPath) {
        this.path = newPath;
    }

    // Queue one or more waves to start
    queueWaves(count, callback) {
        if (count <= 0) return this.waveNumber + this.pendingWaves;

        this.pendingWaves += count;

        // If not currently processing waves, start the cycle
        if (!this.waveInProgress && !this.spawnInterval) {
            // Use a small delay to allow multiple clicks in the same frame/tick
            setTimeout(() => {
                // Double check if another process started in the meantime
                if (!this.waveInProgress && !this.spawnInterval && this.pendingWaves > 0) {
                    this._startProcessingPendingWaves(callback);
                }
            }, 10); // 10ms delay
        }

        // Return the highest wave number expected after this queue request
        return this.waveNumber + this.pendingWaves;
    }

    // Internal function to start spawning all currently pending waves
    _startProcessingPendingWaves(callback) {
        if (this.pendingWaves <= 0 || this.waveInProgress) return; // Don't start if nothing pending or already running

        console.log(`Starting processing for ${this.pendingWaves} pending waves. Current wave: ${this.waveNumber}`);

        this.waveInProgress = true;
        this.onWaveComplete = callback; // Store the callback for when the *entire* batch is done
        this.enemiesToSpawnQueue = []; // Reset the spawn queue for this new batch
        let totalEnemiesThisCycle = 0;

        // Process all pending waves
        while (this.pendingWaves > 0) {
            this.waveNumber++;
            this.pendingWaves--;

            // Generate enemies for the current wave number
            const waveEnemies = this._generateEnemiesForWave(this.waveNumber);
            this.enemiesToSpawnQueue.push(...waveEnemies); // Add enemies to the main queue
            totalEnemiesThisCycle += waveEnemies.length;
        }

        this.enemiesRemaining = totalEnemiesThisCycle; // Total enemies for this entire batch

        console.log(`Total enemies to spawn in this cycle: ${this.enemiesRemaining}`);

        // Start the single spawn interval for this batch
        this._startSpawnInterval();
    }

    // Generates an array of enemy definitions for a specific wave number
    _generateEnemiesForWave(waveNum) {
        const waveEnemiesList = [];
        const waveDifficulty = this.calculateWaveDifficulty(waveNum); // Pass waveNum

        const enemiesCount = Math.min(5 + waveNum * 2, 40); // Base count on specific wave

        const availableTypes = [];
        availableTypes.push('normal');
        if (waveNum >= 3) availableTypes.push('fast');
        if (waveNum >= 5) availableTypes.push('tank');
        if (waveNum >= 8) availableTypes.push('immune');
        if (waveNum >= 10) availableTypes.push('regen');
        if (waveNum >= 8 && waveNum % 5 === 0) {
            availableTypes.push('boss');
            if (waveNum >= 15) availableTypes.push('boss');
            if (waveNum >= 25) availableTypes.push('boss');
        }

        for (let i = 0; i < enemiesCount; i++) {
            const randomTypeIndex = Math.floor(Math.random() * availableTypes.length);
            const enemyType = availableTypes[randomTypeIndex];
            const enemyData = enemyTypes[enemyType];

            let health = enemyData.health;
            if (waveNum > 1) {
                const healthMultiplier = 1 + (waveNum - 1) * 0.2 + Math.pow(waveNum / 10, 2);
                health = Math.round(health * healthMultiplier);
            }

            let speed = enemyData.speed;
            if (waveNum > 10) {
                speed = enemyData.speed * (1 + (waveNum - 10) * 0.01);
            }

            const variation = 0.85 + Math.random() * 0.3;
            health = Math.round(health * variation);

            // Add enemy definition to the list for this wave
            waveEnemiesList.push({
                type: enemyType,
                data: enemyData,
                health: health,
                speed: speed
            });
        }
        return waveEnemiesList;
    }

    // Starts the interval that spawns enemies from the queue
    _startSpawnInterval() {
        // Clear any existing interval (shouldn't be necessary with checks, but safe)
        clearInterval(this.spawnInterval);
        this.spawnInterval = null;

        if (this.enemiesToSpawnQueue.length === 0) {
            console.log("Spawn queue is empty, not starting interval.");
            // If queue is empty but we thought we were starting, check completion state
            if (this.enemies.length === 0 && this.enemiesRemaining <= 0) {
                this._checkWaveCompletion();
            }
            return;
        }

        // Calculate spawn delay (e.g., based on the highest wave number processed)
        const spawnDelay = Math.max(800 - this.waveNumber * 10, 300);

        console.log(`Starting spawn interval with delay ${spawnDelay}ms for ${this.enemiesToSpawnQueue.length} enemies.`);

        this.spawnInterval = setInterval(() => {
            if (this.enemiesToSpawnQueue.length === 0) {
                console.log("Spawn queue emptied, clearing interval.");
                clearInterval(this.spawnInterval);
                this.spawnInterval = null;
                // Do NOT reset waveInProgress here, wait for enemies to be cleared
                this._checkWaveCompletion(); // Check if wave is complete now that spawning finished
                return;
            }

            // Dequeue and spawn one enemy
            const enemyDef = this.enemiesToSpawnQueue.shift();
            this.createEnemy(enemyDef.type, enemyDef.data, enemyDef.health, enemyDef.speed);

        }, spawnDelay);
    }


    // Renamed from calculateWaveDifficulty - ensure it accepts waveNum if needed, or uses this.waveNumber
    calculateWaveDifficulty(waveNum) { // Added parameter
        let difficulty = 1.0;
        if (waveNum <= 10) {
            difficulty = 1.0 + (waveNum - 1) * 0.1;
        } else if (waveNum <= 20) {
            difficulty = 2.0 + (waveNum - 10) * 0.2;
        } else {
            difficulty = 4.0 + (waveNum - 20) * 0.3;
        }
        return difficulty;
    }

    createEnemy(type, enemyData, health, speed = null) {
        // ... (rest of createEnemy remains the same)
        const enemyContainer = new PIXI.Container();
        enemyContainer.x = this.path[0].x;
        enemyContainer.y = this.path[0].y;

        // Grafiken für den Feind erstellen
        const enemyGraphics = new PIXI.Graphics();

        // Gesundheitsbalken-Hintergrund
        const healthBarBackground = new PIXI.Graphics();
        healthBarBackground.beginFill(0xFF0000);
        healthBarBackground.drawRect(-enemyData.size, -enemyData.size - 10, enemyData.size * 2, 5);
        healthBarBackground.endFill();

        // Gesundheitsbalken-Vordergrund
        const healthBar = new PIXI.Graphics();
        healthBar.beginFill(0x00FF00);
        healthBar.drawRect(-enemyData.size, -enemyData.size - 10, enemyData.size * 2, 5);
        healthBar.endFill();

        // Zum Container hinzufügen
        enemyContainer.addChild(enemyGraphics);
        enemyContainer.addChild(healthBarBackground);
        enemyContainer.addChild(healthBar);

        // Verwende übergebene Geschwindigkeit oder Standard
        const actualSpeed = speed !== null ? speed : enemyData.speed; // Use provided speed if available

        // Feind-Daten
        const enemy = {
            sprite: enemyContainer,
            graphics: enemyGraphics,
            healthBar: healthBar,
            x: this.path[0].x,
            y: this.path[0].y,
            type: type,
            typeName: enemyData.name,
            health: health,
            maxHealth: health,
            speed: actualSpeed,
            baseSpeed: actualSpeed, // Ursprüngliche Geschwindigkeit für Slow-Effekte speichern
            size: enemyData.size,
            color: enemyData.color,
            reward: enemyData.reward,
            pathIndex: 0,
            slowed: false,
            slowUntil: 0,
            effects: [], // Für visuelle Effekte wie Slow, Gift, etc.
            // Neue Eigenschaften für erweiterte Gegnertypen
            immuneToSlow: enemyData.immuneToSlow || false,
            regeneration: enemyData.regeneration || 0,
            lastRegenTime: Date.now() // Zeitstempel für Regeneration
        };

        // Spezielle Markierungen für Immunität gegen Verlangsamung
        if (enemy.immuneToSlow) {
            const immuneMarker = new PIXI.Graphics();
            immuneMarker.beginFill(0xFFFFFF, 0.6);
            immuneMarker.drawStar(0, 0, 5, 8, 3);
            immuneMarker.endFill();
            immuneMarker.x = 0;
            immuneMarker.y = -enemy.size - 15;
            enemyContainer.addChild(immuneMarker);
        }

        // Zeichne den Feind basierend auf seinem Typ
        this.drawEnemyByType(enemy);

        // Zum Container hinzufügen
        this.container.addChild(enemyContainer);
        this.enemies.push(enemy);

        return enemy;
        // ... (rest of createEnemy remains the same)
    }

    scheduleNextWave(waitTime, callback) {
        this.countdownTime = waitTime;

        clearInterval(this.autoStartTimer);
        this.autoStartTimer = setInterval(() => {
            this.countdownTime -= 1000;

            if (this.countdownTime <= 0) {
                clearInterval(this.autoStartTimer);
                // Automatically queue 1 wave when timer runs out
                this.queueWaves(1, callback);
                // Update UI immediately after queuing
                if (window.game && window.game.gameUI) { // Access UI safely
                    window.game.gameUI.updateUI();
                }
            }
            // Update countdown display every second
            if (window.game && window.game.gameUI) { // Access UI safely
                window.game.gameUI.updateCountdownDisplay();
            }

        }, 1000);

        // Initial countdown display update
        if (window.game && window.game.gameUI) { // Access UI safely
            window.game.gameUI.updateCountdownDisplay();
        }

        return this.countdownTime;
    }

    cancelWaveTimer() {
        clearInterval(this.autoStartTimer);
        this.autoStartTimer = null; // Clear the interval ID
        this.countdownTime = 0;
        // Update countdown display
        if (window.game && window.game.gameUI) { // Access UI safely
            window.game.gameUI.updateCountdownDisplay();
        }
    }

    getCurrentCountdown() {
        return this.countdownTime;
    }

    update(onEnemyEscape, onEnemyDeath) {
        const deltaTime = this.app.ticker.deltaMS; // Zeit seit dem letzten Frame
        const timeScale = deltaTime / (1000 / 60); // Anpassung für 60 FPS

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // ... (enemy logic: regeneration, slow check, movement) ...
            // Gesundheits-Regeneration für bestimmte Gegnertypen
            if (enemy.regeneration > 0) {
                const currentTime = Date.now();
                const timeDiff = currentTime - enemy.lastRegenTime;

                if (timeDiff >= 1000) { // Jede Sekunde regenerieren
                    // Gesundheit nur regenerieren, wenn nicht voll
                    if (enemy.health < enemy.maxHealth) {
                        enemy.health += enemy.regeneration * (timeDiff / 1000);
                        // Nicht über maximale Gesundheit hinausgehen
                        enemy.health = Math.min(enemy.health, enemy.maxHealth);

                        // Gesundheitsbalken aktualisieren
                        const healthPercentage = enemy.health / enemy.maxHealth;
                        enemy.healthBar.clear();
                        enemy.healthBar.beginFill(0x00FF00);
                        enemy.healthBar.drawRect(-enemy.size, -enemy.size - 10, enemy.size * 2 * healthPercentage, 5);
                        enemy.healthBar.endFill();
                    }
                    enemy.lastRegenTime = currentTime;

                    // Visuelle Anzeige der Regeneration
                    if (enemy.health < enemy.maxHealth) {
                        this.createRegenerationEffect(enemy);
                    }
                }
            }

            // Prüfen, ob Slow-Effekt abgelaufen ist
            if (enemy.slowed && Date.now() > enemy.slowUntil) {
                enemy.slowed = false;
                enemy.speed = enemy.baseSpeed; // Ursprüngliche Geschwindigkeit wiederherstellen
            }

            // Zielrichtung auf dem Pfad berechnen
            const targetPoint = this.path[enemy.pathIndex];
            const dx = targetPoint.x - enemy.x;
            const dy = targetPoint.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Wenn nahe genug am Wegpunkt, zum nächsten Wegpunkt übergehen
            // Adjust threshold based on speed and timeScale to prevent skipping points
            const threshold = Math.max(enemy.speed * 2 * timeScale, enemy.speed);
            if (distance < threshold) {
                enemy.pathIndex++;

                // Wenn das Ende des Pfades erreicht ist
                if (enemy.pathIndex >= this.path.length) {
                    // Feind entkommt, Spieler verliert Leben
                    onEnemyEscape(enemy);

                    // Feind entfernen
                    this.removeEnemy(i);
                    this.enemiesRemaining--; // Decrement remaining count
                    console.log(`Enemy escaped. Remaining: ${this.enemiesRemaining}`);
                    continue; // Skip rest of update for this enemy
                }
                // Ensure the enemy snaps to the waypoint to avoid path deviations
                enemy.x = targetPoint.x;
                enemy.y = targetPoint.y;
            }

            // Ensure there's a next target point before calculating movement towards it
            if (enemy.pathIndex < this.path.length) {
                const newTargetPoint = this.path[enemy.pathIndex];
                const newDx = newTargetPoint.x - enemy.x;
                const newDy = newTargetPoint.y - enemy.y;
                const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);

                // Normalisierte Richtung
                if (newDistance > 0) {
                    const dirX = newDx / newDistance;
                    const dirY = newDy / newDistance;

                    // Feind bewegen
                    const moveAmount = Math.min(enemy.speed * timeScale, newDistance); // Don't overshoot
                    enemy.x += dirX * moveAmount;
                    enemy.y += dirY * moveAmount;


                    // Sprite-Position aktualisieren
                    enemy.sprite.x = enemy.x;
                    enemy.sprite.y = enemy.y;

                    // Gesundheitsbalken aktualisieren
                    const healthPercentage = enemy.health / enemy.maxHealth;
                    enemy.healthBar.clear();
                    enemy.healthBar.beginFill(0x00FF00);
                    enemy.healthBar.drawRect(-enemy.size, -enemy.size - 10, enemy.size * 2 * healthPercentage, 5);
                    enemy.healthBar.endFill();
                }
            }


            // Feind entfernen, wenn er tot ist
            if (enemy.health <= 0) {
                // Gold für das Töten des Feindes geben
                onEnemyDeath(enemy);

                // Feind entfernen
                this.removeEnemy(i);
                this.enemiesRemaining--; // Decrement remaining count
                console.log(`Enemy killed. Remaining: ${this.enemiesRemaining}`);
            }
        }

        // Effekte aktualisieren
        this.updateEffects();

        // Prüfen, ob die Welle/der Zyklus abgeschlossen ist
        // Moved the completion check to a separate function
        const cycleComplete = this._checkWaveCompletion();

        return cycleComplete; // Return true if the entire cycle is complete
    }

    // Checks if the current wave cycle is complete
    _checkWaveCompletion() {
        // Completion condition:
        // 1. waveInProgress was set to true (meaning a cycle started)
        // 2. No enemies are left on the screen
        // 3. The total expected number of enemies for this cycle has reached zero or less
        // 4. The spawn queue is empty
        // 5. The spawn interval is not running
        if (this.waveInProgress &&
            this.enemies.length === 0 &&
            this.enemiesRemaining <= 0 &&
            this.enemiesToSpawnQueue.length === 0 &&
            !this.spawnInterval) {
            console.log(`Wave cycle ending (Wave ${this.waveNumber} finished).`);
            this.waveInProgress = false;

            // Trigger the callback stored when the cycle started
            if (this.onWaveComplete) {
                this.onWaveComplete(); // Call the callback (e.g., scheduleNextWave in UI)
                this.onWaveComplete = null; // Clear callback once used
            }

            // Automatically start processing next pending waves if any were added *during* the last cycle
            if (this.pendingWaves > 0) {
                console.log(`Found ${this.pendingWaves} more pending waves. Starting next cycle.`);
                // Need a way to get the UI callback here if we want auto-scheduling
                // For now, let's rely on the manual start or the timer.
                // Or, assume the original callback is reusable? Let's try that.
                // This might cause issues if the callback logic isn't designed for re-use.
                // A safer approach is to require manual start for subsequent batches.
                // Let's stick to manual/timer starts for now.
                // this._startProcessingPendingWaves(this.onWaveComplete); // Potentially problematic re-use

                // Update UI to reflect pending waves are ready
                if (window.game && window.game.gameUI) {
                    window.game.gameUI.updateUI();
                }
            }


            return true; // Cycle completed
        }
        return false; // Cycle still in progress
    }

    removeEnemy(index) {
        if (index >= 0 && index < this.enemies.length) {
            const enemy = this.enemies[index];
            this.container.removeChild(enemy.sprite);
            this.enemies.splice(index, 1);
        }
    }

    // ... (applyEffect, showImmuneEffect, createRegenerationEffect, addSlowEffect, updateEffects remain the same) ...
    applyEffect(enemy, effect, duration, value) {
        switch (effect) {
            case 'slow':
                // Prüfen, ob der Feind immun gegen Verlangsamung ist
                if (enemy.immuneToSlow) {
                    // Immunitäts-Effekt anzeigen
                    this.showImmuneEffect(enemy);
                    return;
                }

                // Apply slow only if not already slowed or if the new slow is stronger/longer?
                // Simple approach: Overwrite existing slow if new one is applied.
                if (!enemy.slowed || (Date.now() + duration > enemy.slowUntil)) {
                    enemy.slowed = true;
                    // Ensure baseSpeed is set correctly if slowed multiple times
                    enemy.baseSpeed = enemy.baseSpeed || enemy.speed;
                    enemy.speed = enemy.baseSpeed * value; // Apply slow factor
                    enemy.slowUntil = Date.now() + duration;

                    // Visuellen Effekt hinzufügen (only if not already visually slowed?)
                    // Maybe check enemy.effects? For simplicity, let's re-add visual for now.
                    this.addSlowEffect(enemy); // Consider optimizing this later

                    // Zum Effekte-Array hinzufügen (or update existing)
                    // Simple approach: just add, update loop will handle cleanup later
                    enemy.effects.push({
                        type: 'slow',
                        until: enemy.slowUntil
                    });
                }
                break;

            // Weitere Effekte hier hinzufügen nach Bedarf
        }
    }

    // Neuer Effekt zur Anzeige der Immunität
    showImmuneEffect(enemy) {
        // Immunitäts-Anzeige (gelbes Aufleuchten)
        const immuneEffect = new PIXI.Graphics();
        immuneEffect.beginFill(0xFFFF00, 0.5);
        immuneEffect.drawCircle(0, 0, enemy.size + 5);
        immuneEffect.endFill();

        immuneEffect.x = enemy.x;
        immuneEffect.y = enemy.y;

        this.effectsContainer.addChild(immuneEffect);

        // Effekt nach kurzer Zeit wieder entfernen
        setTimeout(() => {
            if (immuneEffect.parent) { // Check if still attached before removing
                this.effectsContainer.removeChild(immuneEffect);
            }
        }, 300);
    }

    // Neuer Effekt für die Regeneration
    createRegenerationEffect(enemy) {
        // Grüne Partikel, die nach oben steigen
        const particleCount = 3;

        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(0x2ecc71, 0.7);
            particle.drawCircle(0, 0, 2);
            particle.endFill();

            // Zufällige Position um den Feind herum
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * enemy.size * 0.8;

            particle.x = enemy.x + Math.cos(angle) * distance;
            particle.y = enemy.y + Math.sin(angle) * distance;

            this.effectsContainer.addChild(particle);

            // Animation: Nach oben schweben und verblassen
            let duration = 0;
            const animate = (delta) => { // Pass delta
                const deltaMS = this.app.ticker.deltaMS; // Use Pixi's deltaMS
                duration += deltaMS / 1000;

                if (duration >= 1) {
                    if (particle.parent) { // Check parent before removing
                        this.effectsContainer.removeChild(particle);
                    }
                    this.app.ticker.remove(animate);
                    return;
                }

                // Ensure enemy still exists before accessing position
                if (!enemy || enemy.health <= 0) {
                    if (particle.parent) this.effectsContainer.removeChild(particle);
                    this.app.ticker.remove(animate);
                    return;
                }

                particle.y -= 15 * deltaMS / 1000; // Nach oben bewegen
                particle.alpha = 1 - duration; // Transparenter werden
            };

            this.app.ticker.add(animate);
        }
    }

    addSlowEffect(enemy) {
        // Prevent adding multiple visual effects for the same slow instance if possible
        // Check if a visual slow effect already exists for this enemy
        // For simplicity now, we allow multiple visuals, but this could be optimized

        // Langsam-Effekt (blauer Ring)
        const slowEffect = new PIXI.Graphics();
        slowEffect.lineStyle(2, 0x1abc9c); // Line style for the ring
        slowEffect.drawCircle(0, 0, enemy.size + 3); // Draw the ring slightly larger than the enemy

        // Schnee-Partikel
        const particles = [];
        for (let i = 0; i < 3; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(0xFFFFFF, 0.7);
            particle.drawCircle(0, 0, 1.5);
            particle.endFill();
            particles.push(particle);
            slowEffect.addChild(particle); // Add particles to the slow effect graphic
        }

        // Attach the effect to the effects container (not the enemy container)
        // Position it initially at the enemy's current location
        slowEffect.x = enemy.x;
        slowEffect.y = enemy.y;
        this.effectsContainer.addChild(slowEffect);

        // Animation hinzufügen
        const animate = (delta) => { // Pass delta
            // Check if enemy still exists and is slowed
            if (!enemy || enemy.health <= 0 || !enemy.slowed || Date.now() > enemy.slowUntil) {
                if (slowEffect.parent) { // Check parent before removing
                    this.effectsContainer.removeChild(slowEffect);
                }
                this.app.ticker.remove(animate);
                return;
            }

            // Effekt mit dem Feind bewegen
            slowEffect.x = enemy.x;
            slowEffect.y = enemy.y;

            // Partikelanimation
            const time = Date.now() / 300;
            for (let i = 0; i < particles.length; i++) {
                const angle = time + i * Math.PI * 2 / 3;
                // Adjust particle distance and movement for better visual effect
                const dist = enemy.size * 0.5 + Math.sin(time * 1.5 + i) * 2; // Smaller orbit, slightly different speed
                particles[i].x = Math.cos(angle) * dist;
                particles[i].y = Math.sin(angle) * dist;
            }
        };

        this.app.ticker.add(animate);
    }

    updateEffects() {
        // Clean up expired effects from enemy.effects array if needed
        // (Currently handled by direct property checks like enemy.slowed)
    }


    // ... (drawEnemyByType and specific drawing functions remain the same) ...
    drawEnemyByType(enemy) {
        // Grafik zurücksetzen
        enemy.graphics.clear();
        // Add line style for potential outlines
        enemy.graphics.lineStyle(1, 0x000000, 0.3); // Faint black outline

        switch (enemy.type) {
            case 'normal': // Bauer
                this.drawNormalEnemy(enemy);
                break;

            case 'fast': // Späher
                this.drawFastEnemy(enemy);
                break;

            case 'tank': // Ritter
                this.drawTankEnemy(enemy);
                break;

            case 'boss': // Kriegsherr
                this.drawBossEnemy(enemy);
                break;

            case 'immune': // Hexer - immun gegen Slow
                this.drawImmuneEnemy(enemy);
                break;

            case 'regen': // Kleriker - regeneriert Gesundheit
                this.drawRegenEnemy(enemy);
                break;

            default:
                // Fallback zu einfachem Kreis
                enemy.graphics.beginFill(enemy.color);
                enemy.graphics.drawCircle(0, 0, enemy.size);
                enemy.graphics.endFill();
        }
    }

    drawNormalEnemy(enemy) {
        // Körper
        enemy.graphics.beginFill(0x7f8c8d); // Grauer Körper
        enemy.graphics.drawCircle(0, 0, enemy.size);
        enemy.graphics.endFill();

        // Gesicht (einfacher)
        enemy.graphics.beginFill(0xf5d7b5); // Hautfarbe
        enemy.graphics.drawCircle(0, -enemy.size * 0.1, enemy.size * 0.6); // Etwas höher
        enemy.graphics.endFill();

        // Hut (Strohhut-Look)
        enemy.graphics.beginFill(0xDAA520); // Goldgelb
        enemy.graphics.drawEllipse(0, -enemy.size * 0.5, enemy.size * 0.9, enemy.size * 0.4); // Breiter Rand
        enemy.graphics.endFill();
        enemy.graphics.beginFill(0xB8860B); // Dunkleres Gelb für Hutkrone
        enemy.graphics.drawCircle(0, -enemy.size * 0.7, enemy.size * 0.5); // Krone
        enemy.graphics.endFill();
    }

    drawFastEnemy(enemy) {
        // Bewegungsrichtung berechnen (optional, could be complex)
        // let moveAngle = 0;
        // if (enemy.pathIndex < this.path.length) {
        //     moveAngle = Math.atan2(
        //         this.path[enemy.pathIndex].y - enemy.y,
        //         this.path[enemy.pathIndex].x - enemy.x
        //     );
        // }

        // Körper (Dreiecksform für Geschwindigkeit)
        enemy.graphics.beginFill(0x9b59b6); // Lila
        enemy.graphics.moveTo(enemy.size, 0); // Spitze nach vorne (angenommen Bewegung nach rechts initial)
        enemy.graphics.lineTo(-enemy.size * 0.5, enemy.size * 0.8);
        enemy.graphics.lineTo(-enemy.size * 0.5, -enemy.size * 0.8);
        enemy.graphics.closePath();
        enemy.graphics.endFill();

        // Bewegungsunschärfe-Effekt (einfach)
        enemy.graphics.beginFill(0x9b59b6, 0.4);
        enemy.graphics.drawEllipse(-enemy.size, 0, enemy.size * 1.5, enemy.size * 0.6); // Ellipse hinter dem Körper
        enemy.graphics.endFill();

        // Auge
        enemy.graphics.beginFill(0xffffff); // Weiß
        enemy.graphics.drawCircle(enemy.size * 0.3, 0, enemy.size * 0.2);
        enemy.graphics.endFill();
        enemy.graphics.beginFill(0x000000); // Schwarz
        enemy.graphics.drawCircle(enemy.size * 0.4, 0, enemy.size * 0.1);
        enemy.graphics.endFill();
    }

    drawTankEnemy(enemy) {
        // Robuster Körper (Rechteckig)
        enemy.graphics.beginFill(0x2c3e50); // Dunkelgrau/Blau
        enemy.graphics.drawRoundedRect(-enemy.size * 0.8, -enemy.size * 0.8, enemy.size * 1.6, enemy.size * 1.6, enemy.size * 0.2);
        enemy.graphics.endFill();

        // Verstärkungsplatten
        enemy.graphics.lineStyle(2, 0x7f8c8d); // Hellere Linie
        enemy.graphics.moveTo(-enemy.size * 0.8, 0);
        enemy.graphics.lineTo(enemy.size * 0.8, 0);
        enemy.graphics.moveTo(0, -enemy.size * 0.8);
        enemy.graphics.lineTo(0, enemy.size * 0.8);

        // Nieten
        enemy.graphics.beginFill(0x7f8c8d);
        enemy.graphics.drawCircle(-enemy.size * 0.6, -enemy.size * 0.6, 2);
        enemy.graphics.drawCircle(enemy.size * 0.6, -enemy.size * 0.6, 2);
        enemy.graphics.drawCircle(-enemy.size * 0.6, enemy.size * 0.6, 2);
        enemy.graphics.drawCircle(enemy.size * 0.6, enemy.size * 0.6, 2);
        enemy.graphics.endFill();
    }

    drawBossEnemy(enemy) {
        const time = Date.now() / 400; // Slightly faster pulsation

        // Pulsierende Aura
        const auraSize = enemy.size * 1.4 + Math.sin(time) * 4;
        enemy.graphics.beginFill(0xc0392b, 0.15 + Math.abs(Math.sin(time * 0.8)) * 0.1); // Pulsierende Transparenz
        enemy.graphics.drawCircle(0, 0, auraSize);
        enemy.graphics.endFill();

        // Körper (gezackt)
        enemy.graphics.beginFill(0xc0392b); // Rot
        const points = 8; // Anzahl der Zacken
        enemy.graphics.moveTo(enemy.size, 0);
        for (let i = 1; i <= points; i++) {
            const angle = (i * Math.PI * 2) / points;
            const radius = i % 2 === 0 ? enemy.size : enemy.size * 0.8; // Abwechselnd lang/kurz
            enemy.graphics.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        enemy.graphics.closePath();
        enemy.graphics.endFill();


        // Krone
        enemy.graphics.beginFill(0xFFD700); // Gold
        const crownPoints = 5;
        const crownBaseY = -enemy.size * 0.7;
        const crownHeight = enemy.size * 0.5;
        const crownWidth = enemy.size * 0.8;
        enemy.graphics.moveTo(-crownWidth, crownBaseY);
        for (let i = 0; i <= crownPoints; i++) {
            const peakX = -crownWidth + (i * (crownWidth * 2) / crownPoints);
            const peakY = crownBaseY - (i % 2 === 0 ? crownHeight * 0.5 : crownHeight);
            enemy.graphics.lineTo(peakX, peakY);
        }
        enemy.graphics.lineTo(crownWidth, crownBaseY);
        enemy.graphics.closePath(); // Close the crown shape at the bottom
        enemy.graphics.endFill();

        // Böses Auge (Zyklop)
        enemy.graphics.beginFill(0xFFFFFF); // Weiß
        enemy.graphics.drawEllipse(0, -enemy.size * 0.1, enemy.size * 0.4, enemy.size * 0.3);
        enemy.graphics.endFill();
        enemy.graphics.beginFill(0xFF0000); // Rot (Pupille)
        const pupilXOffset = Math.cos(time * 1.5) * enemy.size * 0.1; // Auge bewegt sich
        enemy.graphics.drawCircle(pupilXOffset, -enemy.size * 0.1, enemy.size * 0.15);
        enemy.graphics.endFill();
    }

    drawImmuneEnemy(enemy) {
        const time = Date.now() / 500; // Slower rotation/pulse

        // Körper (Sechseck)
        enemy.graphics.beginFill(0x8e44ad); // Dunkleres Lila
        const sides = 6;
        enemy.graphics.moveTo(enemy.size, 0);
        for (let i = 1; i <= sides; i++) {
            const angle = (i * Math.PI * 2) / sides;
            enemy.graphics.lineTo(Math.cos(angle) * enemy.size, Math.sin(angle) * enemy.size);
        }
        enemy.graphics.closePath();
        enemy.graphics.endFill();

        // Magischer Kern (pulsierend)
        const coreSize = enemy.size * 0.4 + Math.sin(time) * 2;
        enemy.graphics.beginFill(0xffffff, 0.7 + Math.sin(time * 1.2) * 0.2); // Pulsierende Helligkeit
        enemy.graphics.drawCircle(0, 0, coreSize);
        enemy.graphics.endFill();

        // Rotierende Runen/Symbole
        enemy.graphics.lineStyle(1.5, 0xffffff, 0.6);
        const runeRadius = enemy.size * 0.7;
        const runeCount = 3;
        for (let i = 0; i < runeCount; i++) {
            const angle = time + (i * Math.PI * 2 / runeCount);
            const runeX = Math.cos(angle) * runeRadius;
            const runeY = Math.sin(angle) * runeRadius;
            // Einfaches Kreuz-Symbol als Rune
            enemy.graphics.moveTo(runeX - 3, runeY);
            enemy.graphics.lineTo(runeX + 3, runeY);
            enemy.graphics.moveTo(runeX, runeY - 3);
            enemy.graphics.lineTo(runeX, runeY + 3);
        }

        // Keine Kapuze/Gesicht, Fokus auf magische Natur
    }

    drawRegenEnemy(enemy) {
        const time = Date.now() / 600; // Gentle pulse

        // Pulsierender Heiligenschein
        const haloSize = enemy.size * 1.2 + Math.sin(time) * 2;
        enemy.graphics.beginFill(0x27ae60, 0.1 + Math.abs(Math.sin(time * 0.8)) * 0.1); // Sanfter Puls
        enemy.graphics.drawCircle(0, 0, haloSize);
        enemy.graphics.endFill();

        // Körper (Tropfenform)
        enemy.graphics.beginFill(0x27ae60); // Grün
        enemy.graphics.drawEllipse(0, 0, enemy.size * 0.8, enemy.size); // Vertikale Ellipse
        enemy.graphics.endFill();

        // Gesicht (freundlich)
        enemy.graphics.beginFill(0xf5d7b5); // Hautfarbe
        enemy.graphics.drawCircle(0, -enemy.size * 0.3, enemy.size * 0.4); // Positioniert im oberen Teil
        enemy.graphics.endFill();

        // Augen (geschlossen/lächelnd)
        enemy.graphics.lineStyle(1, 0x333333);
        enemy.graphics.arc(-enemy.size * 0.15, -enemy.size * 0.35, enemy.size * 0.1, Math.PI * 0.2, Math.PI * 0.8); // Linkes Auge Bogen
        enemy.graphics.arc(enemy.size * 0.15, -enemy.size * 0.35, enemy.size * 0.1, Math.PI * 0.2, Math.PI * 0.8);  // Rechtes Auge Bogen

        // Heilungssymbol (Herz oder einfaches Kreuz)
        enemy.graphics.beginFill(0xffffff, 0.9); // Weißes Symbol
        enemy.graphics.drawCircle(0, enemy.size * 0.2, enemy.size * 0.3); // Kleiner Kreis unten
        // Optional: Kreuz darauf
        enemy.graphics.lineStyle(1.5, 0x27ae60); // Grüne Linien im Kreis
        enemy.graphics.moveTo(0, enemy.size * 0.2 - enemy.size * 0.2);
        enemy.graphics.lineTo(0, enemy.size * 0.2 + enemy.size * 0.2);
        enemy.graphics.moveTo(-enemy.size * 0.2, enemy.size * 0.2);
        enemy.graphics.lineTo(enemy.size * 0.2, enemy.size * 0.2);
        enemy.graphics.endFill(); // End fill for the circle
    }
} // End of EnemyManager Class