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

        // Positioniere Effekt-Container vor Türmen/Projektilen, falls möglich
        const towerContainerIndex = this.app.stage.getChildIndex(this.app.stage.getChildByName("towerContainer"));
        const projectileContainerIndex = this.app.stage.getChildIndex(this.app.stage.getChildByName("projectileContainer"));
        let targetIndex = -1;
        if (towerContainerIndex > -1 && projectileContainerIndex > -1) { targetIndex = Math.min(towerContainerIndex, projectileContainerIndex); }
        else if (towerContainerIndex > -1) { targetIndex = towerContainerIndex; }
        else if (projectileContainerIndex > -1) { targetIndex = projectileContainerIndex; }
        if (targetIndex > -1) { this.app.stage.addChildAt(this.effectsContainer, targetIndex); }
        else { const enemyContainerIndex = this.app.stage.getChildIndex(this.container); if (enemyContainerIndex > -1) { this.app.stage.addChildAt(this.effectsContainer, enemyContainerIndex); } else { this.app.stage.addChild(this.effectsContainer); } }


        this.enemies = [];
        this.path = path;
        this.waveNumber = 0;
        this.waveInProgress = false; // True, solange *irgendein* Gegner aktiv ist oder gespawnt wird
        this.enemiesRemaining = 0; // Gesamtzahl *aller* aktiven/zu spawnenden Gegner über *alle* laufenden Wellen
        this.autoStartTimer = null;
        this.countdownTime = 0;
        this.countdownEndTime = 0;
        this.onWaveComplete = null; // Callback, wenn ALLE Gegner weg sind

        this.activeSpawnIntervals = []; // Speichert IDs der laufenden Spawn-Intervalle
    }

    updatePath(newPath) {
        this.path = newPath;
        // Pfadänderung während des Spiels ist hier nicht vorgesehen
    }

    startNextWave(callback) {
        this.waveNumber++;
        this.waveInProgress = true; // Signalisiert, dass Aktivität stattfindet
        this.onWaveComplete = callback; // Callback für das Ende aller Aktivitäten speichern

        // Neue Welle spawnen (startet eigenen Timer)
        this.spawnWave();

        // Automatischen Start abbrechen, falls aktiv
        this.cancelWaveTimer();

        return this.waveNumber;
    }

    spawnWave() {
        // Diese Funktion startet das Spawnen für EINE spezifische Welle
        const currentWaveNumber = this.waveNumber; // Welle merken, für die gespawnt wird

        // Dynamischer Schwierigkeitsgrad
        const waveDifficulty = this.calculateWaveDifficulty(currentWaveNumber);

        // Gegnerzahl für DIESE Welle
        const enemiesCount = Math.min(5 + currentWaveNumber * 2, 40);
        let enemiesSpawned = 0;

        // WICHTIG: Gesamtanzahl aktiver/zu spawnender Gegner erhöhen
        this.enemiesRemaining += enemiesCount;

        // Feindtypen bestimmen
        const availableTypes = ['normal'];
        if (currentWaveNumber >= 3) availableTypes.push('fast');
        if (currentWaveNumber >= 5) availableTypes.push('tank');
        if (currentWaveNumber >= 8) availableTypes.push('immune');
        if (currentWaveNumber >= 10) availableTypes.push('regen');
        if (currentWaveNumber >= 8 && currentWaveNumber % 5 === 0) {
            availableTypes.push('boss');
            if (currentWaveNumber >= 15) availableTypes.push('boss');
            if (currentWaveNumber >= 25) availableTypes.push('boss');
        }

        // Spawn-Intervall für DIESE Welle
        const spawnDelay = Math.max(800 - currentWaveNumber * 10, 300);

        // Lokales Intervall für DIESE Welle
        let waveSpawnIntervalId = null; // ID speichern
        const spawnLoop = () => {
            if (enemiesSpawned >= enemiesCount) {
                this.clearSpawnInterval(waveSpawnIntervalId); // Intervall für diese Welle beenden
                return;
            }

            // Nur spawnen, wenn das Spiel noch läuft (relevant bei Reset)
            if (!this.app || this.app.ticker.started === false) {
                this.clearSpawnInterval(waveSpawnIntervalId);
                return;
            }

            const randomTypeIndex = Math.floor(Math.random() * availableTypes.length);
            const enemyType = availableTypes[randomTypeIndex];
            const enemyData = enemyTypes[enemyType];

            // Gesundheit & Geschwindigkeit skalieren
            let health = enemyData.health;
            if (currentWaveNumber > 1) {
                const healthMultiplier = 1 + (currentWaveNumber - 1) * 0.2 + Math.pow(currentWaveNumber / 10, 2);
                health = Math.round(health * healthMultiplier);
            }
            let speed = enemyData.speed;
            if (currentWaveNumber > 10) {
                speed = enemyData.speed * (1 + (currentWaveNumber - 10) * 0.01);
            }
            const variation = 0.85 + Math.random() * 0.3;
            health = Math.round(health * variation);

            this.createEnemy(enemyType, enemyData, health, speed);
            enemiesSpawned++;
        };

        // Starte das Intervall und speichere die ID
        waveSpawnIntervalId = setInterval(spawnLoop, spawnDelay);
        this.activeSpawnIntervals.push(waveSpawnIntervalId); // ID zur Liste hinzufügen
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
        let difficulty = 1.0;
        if (waveNum <= 10) { difficulty = 1.0 + (waveNum - 1) * 0.1; }
        else if (waveNum <= 20) { difficulty = 2.0 + (waveNum - 10) * 0.2; }
        else { difficulty = 4.0 + (waveNum - 20) * 0.3; }
        return difficulty;
    }

    createEnemy(type, enemyData, health, speed = null) {
        const enemyContainer = new PIXI.Container();
        if (this.path && this.path.length > 0) {
            enemyContainer.x = this.path[0].x;
            enemyContainer.y = this.path[0].y;
        } else {
            console.error("Enemy path is invalid!");
            return null; // Kann keinen Feind erstellen
        }

        const enemyGraphics = new PIXI.Graphics();
        enemyContainer.addChild(enemyGraphics);

        const healthBarBackground = new PIXI.Graphics();
        healthBarBackground.beginFill(0xFF0000, 0.7);
        healthBarBackground.drawRect(-enemyData.size, -enemyData.size - 12, enemyData.size * 2, 5);
        healthBarBackground.endFill();

        const healthBar = new PIXI.Graphics();
        healthBar.beginFill(0x00FF00, 0.9);
        healthBar.drawRect(-enemyData.size, -enemyData.size - 12, enemyData.size * 2, 5);
        healthBar.endFill();

        enemyContainer.addChild(healthBarBackground);
        enemyContainer.addChild(healthBar);

        const actualSpeed = speed !== null ? speed : enemyData.speed;

        const enemy = {
            id: Math.random().toString(36).substring(2, 9), // Eindeutigere ID
            sprite: enemyContainer,
            graphics: enemyGraphics,
            healthBar: healthBar,
            x: enemyContainer.x,
            y: enemyContainer.y,
            type: type,
            typeName: enemyData.name,
            health: health,
            maxHealth: health,
            speed: actualSpeed,
            baseSpeed: actualSpeed,
            size: enemyData.size,
            color: enemyData.color,
            reward: enemyData.reward,
            pathIndex: 0,
            slowed: false,
            slowUntil: 0,
            effects: [], // Für visuelle Effekte etc.
            immuneToSlow: enemyData.immuneToSlow || false,
            regeneration: enemyData.regeneration || 0,
            lastRegenTime: Date.now()
        };

        if (enemy.immuneToSlow) {
            const immuneMarker = new PIXI.Graphics();
            immuneMarker.beginFill(0xFFFFFF, 0.8);
            immuneMarker.lineStyle(1, 0x8e44ad);
            const markerSize = enemy.size * 0.3;
            // Globale Funktion drawStar verwenden
            if (typeof drawStar === 'function') {
                drawStar(immuneMarker, 0, -enemy.size - 15, 5, markerSize * 0.7, markerSize * 0.3);
            } else {
                console.warn("drawStar function not found for immune marker!");
                immuneMarker.drawCircle(0, -enemy.size - 15, markerSize * 0.5); // Fallback
            }
            immuneMarker.endFill();
            enemyContainer.addChild(immuneMarker);
        }

        this.drawEnemy(enemy);

        this.container.addChild(enemyContainer);
        this.enemies.push(enemy);

        return enemy;
    }

    drawEnemy(enemy) {
        if (!enemy.graphics || enemy.graphics._destroyed) return;
        enemy.graphics.clear();
        const drawFunc = enemyDrawFunctions[enemy.type];
        if (drawFunc) {
            if (enemy.type === 'fast') {
                drawFunc(enemy, enemy.graphics, this.path);
            } else {
                drawFunc(enemy, enemy.graphics);
            }
        } else {
            // Fallback
            enemy.graphics.beginFill(enemy.color || 0xFF00FF);
            enemy.graphics.drawCircle(0, 0, enemy.size);
            enemy.graphics.endFill();
        }
    }

    scheduleNextWave(delay, autoStartCallback) {
        this.cancelWaveTimer(); // Bestehenden Timer löschen
        this.countdownTime = delay;
        this.countdownEndTime = Date.now() + delay;

        const update = () => {
            // Prüfen, ob Timer noch aktiv sein soll
            if (!this.autoStartTimer) return; // Timer wurde extern gestoppt

            const remaining = this.countdownEndTime - Date.now();
            if (remaining <= 0) {
                // Stoppe diesen Timer
                const timerId = this.autoStartTimer;
                this.autoStartTimer = null; // Wichtig: Zuerst null setzen
                cancelAnimationFrame(timerId); // Dann den Frame abbrechen

                // Automatisch starten, falls keine Welle läuft UND Spiel nicht vorbei
                if (!this.waveInProgress && window.game?.gameUI?.lives > 0) {
                    this.startNextWave(this.onWaveComplete);
                    if (autoStartCallback) {
                        autoStartCallback();
                    }
                }
                this.countdownEndTime = 0;
            } else {
                // Timer läuft weiter - prüfe ob er noch existiert
                if (this.autoStartTimer) {
                    this.autoStartTimer = requestAnimationFrame(update);
                }
            }
        };
        this.autoStartTimer = requestAnimationFrame(update);
    }

    cancelWaveTimer() {
        if (this.autoStartTimer) {
            cancelAnimationFrame(this.autoStartTimer);
            this.autoStartTimer = null;
        }
        this.countdownTime = 0;
        this.countdownEndTime = 0;
    }

    getCurrentCountdown() {
        // Verwendet präzise Methode getCurrentCountdownPrecise
        return this.getCurrentCountdownPrecise();
    }
    // Präzise Methode existiert bereits in ui.js und wird EnemyManager hinzugefügt

    update(onEnemyEscape, onEnemyDeath) {
        const deltaTime = this.app.ticker.deltaMS;
        if (deltaTime <= 0) return false; // Nichts tun, wenn keine Zeit vergangen ist
        const timeScale = Math.min(deltaTime / (1000 / 60), 3); // Anpassung für 60 FPS Basis

        // Rückwärts iterieren, um Entfernen zu ermöglichen
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Robuster Check auf Gültigkeit des Gegners
            if (!enemy || !enemy.sprite || enemy.sprite._destroyed) {
                // console.warn("Found invalid enemy in update loop, skipping/removing.");
                // Wenn Feind noch im Array, aber ungültig, entfernen
                if (enemy && this.enemies[i] === enemy) {
                    this.removeEnemy(i); // Entfernt Grafiken etc.
                }
                continue;
            }

            // --- Regeneration Logic ---
            if (enemy.regeneration > 0) {
                const currentTime = Date.now();
                const timeDiff = currentTime - enemy.lastRegenTime;
                if (timeDiff >= 100) {
                    if (enemy.health < enemy.maxHealth) {
                        const healAmount = enemy.regeneration * (timeDiff / 1000);
                        enemy.health = Math.min(enemy.health + healAmount, enemy.maxHealth);
                        this.updateHealthBar(enemy);
                    }
                    if (enemy.health < enemy.maxHealth || timeDiff >= 1000) {
                        enemy.lastRegenTime = currentTime - (timeDiff % 100);
                    }
                }
            }

            // --- Slow Effect Logic ---
            if (enemy.slowed && Date.now() > enemy.slowUntil) {
                enemy.slowed = false;
                enemy.speed = enemy.baseSpeed;
                const slowEffectIndex = enemy.effects.findIndex(e => e.type === 'slowVisual');
                if (slowEffectIndex > -1) {
                    this.removeEnemyEffect(enemy, slowEffectIndex); // Effekt sicher entfernen
                }
            }

            // --- Movement Logic ---
            if (!this.path || this.path.length <= enemy.pathIndex) {
                // console.warn(`Enemy ${enemy.id} reached invalid path index ${enemy.pathIndex}. Escaping.`);
                onEnemyEscape(enemy);
                this.enemiesRemaining--; // Wichtig: Zähler reduzieren
                this.removeEnemy(i);
                continue;
            }
            const targetPoint = this.path[enemy.pathIndex];
            const dx = targetPoint.x - enemy.x;
            const dy = targetPoint.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const moveDistance = enemy.speed * timeScale; // Bewegung basierend auf Skalierung

            if (distance <= moveDistance || distance === 0) { // Ziel erreicht oder schon da
                enemy.x = targetPoint.x;
                enemy.y = targetPoint.y;
                enemy.pathIndex++;
                if (enemy.pathIndex >= this.path.length) { // Pfadende erreicht
                    onEnemyEscape(enemy);
                    this.enemiesRemaining--; // Wichtig: Zähler reduzieren
                    this.removeEnemy(i);
                    continue;
                }
            } else { // Zum Ziel bewegen
                const dirX = dx / distance;
                const dirY = dy / distance;
                enemy.x += dirX * moveDistance;
                enemy.y += dirY * moveDistance;
            }

            // --- Update Sprite & Health Bar ---
            if (enemy.sprite && !enemy.sprite._destroyed) {
                enemy.sprite.x = enemy.x;
                enemy.sprite.y = enemy.y;
                this.updateHealthBar(enemy);
            }

            // --- Neuzeichnen des Gegners (für Animationen) ---
            this.drawEnemy(enemy);

            // --- Tod prüfen ---
            if (enemy.health <= 0) {
                onEnemyDeath(enemy);
                this.enemiesRemaining--; // Wichtig: Zähler reduzieren
                this.removeEnemy(i);
                continue; // Nächster Feind
            }
        }

        // --- Wellenabschluss prüfen ---
        // Wird ausgelöst, wenn KEINE Gegner mehr auf dem Feld sind UND
        // die Zählung der verbleibenden Gegner (über alle Wellen) auf 0 ist UND
        // keine Spawn-Intervalle mehr laufen.
        if (this.waveInProgress && this.enemies.length === 0 && this.enemiesRemaining <= 0 && this.activeSpawnIntervals.length === 0) {
            const wasInProgress = this.waveInProgress;
            this.waveInProgress = false; // Keine Welle mehr aktiv

            // Callback nur ausführen, wenn eine Welle lief und ein Callback existiert
            if (wasInProgress && this.onWaveComplete) {
                const callback = this.onWaveComplete;
                this.onWaveComplete = null; // Callback zurücksetzen
                callback(); // UI etc. informieren
            }
            return true; // Signalisiert, dass ALLE aktiven Wellen abgeschlossen wurden
        }

        return false; // Mindestens eine Welle noch im Gange oder am Spawnen
    }

    updateHealthBar(enemy) {
        if (!enemy.healthBar || !enemy.sprite || enemy.sprite._destroyed || enemy.healthBar._destroyed) return;
        const healthPercentage = Math.max(0, enemy.health / enemy.maxHealth);
        enemy.healthBar.clear();
        enemy.healthBar.beginFill(0x00FF00, 0.9);
        enemy.healthBar.drawRect(-enemy.size, -enemy.size - 12, Math.max(0, enemy.size * 2 * healthPercentage), 5);
        enemy.healthBar.endFill();
    }


    removeEnemy(index) {
        if (index >= 0 && index < this.enemies.length) {
            const enemy = this.enemies[index];
            if (!enemy) return; // Bereits entfernt?

            // Alle visuellen Effekte entfernen
            if (enemy.effects) {
                for (let j = enemy.effects.length - 1; j >= 0; j--) {
                    this.removeEnemyEffect(enemy, j);
                }
                enemy.effects = []; // Sicherstellen, dass Array leer ist
            }


            // Sprite zerstören
            if (enemy.sprite && !enemy.sprite._destroyed) {
                if (enemy.sprite.parent) {
                    this.container.removeChild(enemy.sprite);
                }
                enemy.sprite.destroy({ children: true }); // Sprite und Kinder (Grafik, Healthbar) zerstören
            }

            // Aus dem Hauptarray entfernen (nur wenn es der erwartete Feind ist)
            if (this.enemies[index] === enemy) {
                this.enemies.splice(index, 1);
            }

        }
    }

    removeEnemyEffect(enemy, effectIndex) {
        if (!enemy || !enemy.effects || effectIndex < 0 || effectIndex >= enemy.effects.length) {
            return;
        }
        const effectData = enemy.effects[effectIndex];
        if (!effectData) return; // Effekt existiert nicht an diesem Index

        // Ticker stoppen, falls vorhanden
        if (effectData.tickerCallback && this.app?.ticker) {
            this.app.ticker.remove(effectData.tickerCallback);
        }

        // Grafik entfernen und zerstören, falls vorhanden
        if (effectData.graphics && !effectData.graphics._destroyed) {
            if (effectData.graphics.parent) {
                // Versuche sicher zu entfernen
                try {
                    if (this.effectsContainer && this.effectsContainer.removeChild) {
                        this.effectsContainer.removeChild(effectData.graphics);
                    }
                } catch (e) {
                    console.warn("Fehler beim Entfernen der Effektgrafik:", e);
                }
            }
            effectData.graphics.destroy({ children: true }); // Grafik und eventuelle Kinder zerstören
        }

        // Effekt aus dem Array des Feindes entfernen
        enemy.effects.splice(effectIndex, 1);
    }


    applyEffect(enemy, effect, duration, value) {
        // Effekt nicht auf tote/zerstörte Gegner anwenden
        if (!enemy || enemy.health <= 0 || !enemy.sprite || enemy.sprite._destroyed) return;

        switch (effect) {
            case 'slow':
                if (enemy.immuneToSlow) {
                    this.showImmuneEffect(enemy);
                    return;
                }
                if (!enemy.slowed) { // Nur anwenden, wenn nicht bereits verlangsamt
                    enemy.slowed = true;
                    // baseSpeed wird beim Erstellen gesetzt, hier nicht ändern
                    enemy.speed = Math.min(enemy.speed, enemy.baseSpeed * value); // Stärkere Verlangsamung gewinnt
                    enemy.slowUntil = Date.now() + duration;
                    this.addSlowEffect(enemy); // Visuellen Effekt hinzufügen
                } else {
                    // Wenn bereits verlangsamt, Dauer verlängern und evtl. Stärke anpassen
                    enemy.speed = Math.min(enemy.speed, enemy.baseSpeed * value); // Stärkere gewinnt
                    enemy.slowUntil = Math.max(enemy.slowUntil, Date.now() + duration); // Längere Dauer gewinnt
                }
                break;
            // Zukünftige Effekte hier...
        }
    }

    showImmuneEffect(enemy) {
        // Nur anzeigen, wenn Feind und Container gültig sind
        if (!enemy || !enemy.sprite || enemy.sprite._destroyed || !this.effectsContainer) return;

        const immuneEffect = new PIXI.Graphics();
        immuneEffect.beginFill(0xFFFF00, 0.6);
        immuneEffect.drawCircle(0, 0, enemy.size + 5);
        immuneEffect.endFill();
        immuneEffect.x = enemy.x; // An die aktuelle Position des Feindes
        immuneEffect.y = enemy.y;
        this.effectsContainer.addChild(immuneEffect);

        let scale = 1.0;
        let tickerCallback;
        tickerCallback = () => {
            // Check: wurde Effekt schon zerstört?
            if (!immuneEffect || immuneEffect._destroyed) {
                if (this.app?.ticker) this.app.ticker.remove(tickerCallback);
                return;
            }
            // Check: Ist der Feind noch da?
            const currentEnemy = this.enemies.find(e => e && e.id === enemy.id);
            if (!currentEnemy) {
                if (immuneEffect.parent) this.effectsContainer.removeChild(immuneEffect);
                immuneEffect.destroy();
                if (this.app?.ticker) this.app.ticker.remove(tickerCallback);
                return;
            }
            // Effekt an Feindposition binden
            immuneEffect.x = currentEnemy.x;
            immuneEffect.y = currentEnemy.y;

            scale += 0.1;
            immuneEffect.scale.set(scale);
            immuneEffect.alpha = Math.max(0, 1 - (scale - 1) * 2);
            if (immuneEffect.alpha <= 0) {
                if (immuneEffect.parent) this.effectsContainer.removeChild(immuneEffect);
                immuneEffect.destroy();
                if (this.app?.ticker) this.app.ticker.remove(tickerCallback);
            }
        };
        if (this.app?.ticker) this.app.ticker.add(tickerCallback);
    }

    addSlowEffect(enemy) {
        if (!enemy || enemy.effects.some(e => e.type === 'slowVisual')) return;

        const slowEffectGraphics = new PIXI.Graphics();
        // Füge Effekt zum Effekt-Container hinzu, nicht zum Feind-Sprite
        this.effectsContainer.addChild(slowEffectGraphics);

        const particles = [];
        const particleCount = 5;
        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(0x1abc9c, 0.8);
            particle.drawCircle(0, 0, 2);
            particle.endFill();
            particles.push({ graphics: particle, angle: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() });
            slowEffectGraphics.addChild(particle); // Partikel sind Kinder des Effekt-Containers
        }

        let tickerCallback;
        tickerCallback = () => {
            const currentEnemy = this.enemies.find(e => e && e.id === enemy.id);
            const effectData = currentEnemy?.effects.find(e => e.tickerCallback === tickerCallback);

            // Beenden, wenn: Grafik zerstört, Feind weg, Feind nicht mehr slowed, oder Effekt nicht mehr im Array
            if (!slowEffectGraphics || slowEffectGraphics._destroyed || !currentEnemy || !currentEnemy.slowed || !effectData) {
                // Effekt sicher entfernen (Grafik, Ticker, Eintrag im Array)
                this.removeEnemyEffect(currentEnemy, currentEnemy?.effects.indexOf(effectData));
                return;
            }

            // Effekt-Position an Feind binden
            slowEffectGraphics.x = currentEnemy.x;
            slowEffectGraphics.y = currentEnemy.y;

            // Partikel animieren
            const time = Date.now() / 1000;
            particles.forEach(p => {
                if (p.graphics && !p.graphics._destroyed) {
                    p.angle += p.speed * 0.05;
                    const radius = currentEnemy.size + 3 + Math.sin(p.angle * 3 + time) * 2;
                    p.graphics.x = Math.cos(p.angle) * radius;
                    p.graphics.y = Math.sin(p.angle) * radius;
                    p.graphics.alpha = 0.5 + Math.sin(time * 2 + p.angle) * 0.3;
                }
            });
        };

        const newEffectData = { type: 'slowVisual', graphics: slowEffectGraphics, tickerCallback: tickerCallback };
        enemy.effects.push(newEffectData);
        if (this.app?.ticker) this.app.ticker.add(tickerCallback);
    }

    // Wird von GameUI.resetGame aufgerufen
    resetGame() {
        this.waveNumber = 0;
        this.waveInProgress = false;
        this.enemiesRemaining = 0;
        this.cancelWaveTimer();

        // Alle aktiven Spawn-Intervalle stoppen
        this.activeSpawnIntervals.forEach(intervalId => clearInterval(intervalId));
        this.activeSpawnIntervals = [];

        // Feinde und ihre Effekte entfernen
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.removeEnemy(i);
        }
        this.enemies = [];
    }
}

// Globale Funktionen (sollten in ui.js oder global sein, hier zur Vollständigkeit)
// EnemyManager.prototype.getCurrentCountdownPrecise = function () { ... };
// EnemyManager.prototype.scheduleNextWave = function (delay, autoStartCallback) { ... };