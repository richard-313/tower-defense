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
        this.waveInProgress = false;
        this.enemiesRemaining = 0;
        this.spawnInterval = null;
        this.autoStartTimer = null;
        this.countdownTime = 0;
        this.onWaveComplete = null; // Callback, wenn die Welle fertig ist

        // Neue Eigenschaften für mehrere Wellen
        this.pendingWaves = 0; // Anzahl der wartenden Wellen
        this.continuousSpawn = false; // Flag für kontinuierliches Spawnen

        // Sprites für verschiedene Feindtypen
        this.enemySprites = {};
    }

    updatePath(newPath) {
        this.path = newPath;
    }

    // Neue Methode: Mehrere Wellen starten
    queueWaves(count) {
        this.pendingWaves += count;

        // Starte die erste Welle, wenn keine im Gange ist
        if (!this.waveInProgress) {
            this.startNextWave(this.onWaveComplete);
        }
    }

    startNextWave(callback) {
        if (this.waveInProgress) {
            // Wenn bereits eine Welle läuft, erhöhen wir nur pendingWaves
            this.pendingWaves++;
            return this.waveNumber;
        }

        this.waveNumber++;
        this.waveInProgress = true;
        this.onWaveComplete = callback; // Callback speichern

        // Welle basierend auf dem aktuellen Fortschritt generieren
        this.spawnWave();

        // Wenn pendingWaves > 0 ist, werden weitere Wellen nach dieser automatisch starten
        if (this.pendingWaves > 0) {
            this.pendingWaves--;
        }

        return this.waveNumber;
    }

    spawnWave() {
        // Dynamischer Schwierigkeitsgrad basierend auf der Wellennummer
        const waveDifficulty = this.calculateWaveDifficulty();

        // Basismenge an Gegnern plus Wellennummer-Faktor
        const enemiesCount = Math.min(5 + this.waveNumber * 2, 40); // Erhöhtes Maximum auf 40
        this.enemiesRemaining = enemiesCount;
        let enemiesSpawned = 0;

        // Verschiedene Feindtypen je nach Welle
        const availableTypes = [];
        availableTypes.push('normal');

        if (this.waveNumber >= 3) availableTypes.push('fast');
        if (this.waveNumber >= 5) availableTypes.push('tank');
        if (this.waveNumber >= 8) availableTypes.push('immune'); // Neuer Gegnertyp ab Welle 8
        if (this.waveNumber >= 10) availableTypes.push('regen'); // Neuer Gegnertyp ab Welle 10

        // Bosse erscheinen jetzt häufiger in späteren Wellen
        if (this.waveNumber >= 8) {
            if (this.waveNumber % 5 === 0) { // Alle 5 Wellen
                availableTypes.push('boss');
                // Mehr Bosse in höheren Wellen
                if (this.waveNumber >= 15) availableTypes.push('boss');
                if (this.waveNumber >= 25) availableTypes.push('boss');
            }
        }

        // Spawn-Intervall verringert sich mit höheren Wellen (schnellere Spawns)
        const spawnDelay = Math.max(800 - this.waveNumber * 10, 300); // Minimum 300ms

        // Spawn-Timer für Feinde
        clearInterval(this.spawnInterval);
        this.spawnInterval = setInterval(() => {
            if (enemiesSpawned >= enemiesCount) {
                clearInterval(this.spawnInterval);
                return;
            }

            // Zufälligen Feindtyp auswählen
            const randomTypeIndex = Math.floor(Math.random() * availableTypes.length);
            const enemyType = availableTypes[randomTypeIndex];
            const enemyData = enemyTypes[enemyType];

            // Gesundheit mit Wellennummer skalieren - jetzt exponentiell
            // Erhöht die Schwierigkeit in späteren Wellen deutlicher
            let health = enemyData.health;
            if (this.waveNumber > 1) {
                // Neue, stärkere Skalierung mit exponentiellem Wachstum
                const healthMultiplier = 1 + (this.waveNumber - 1) * 0.2 + Math.pow(this.waveNumber / 10, 2);
                health = Math.round(health * healthMultiplier);
            }

            // Geschwindigkeit leicht erhöhen in späteren Wellen
            let speed = enemyData.speed;
            if (this.waveNumber > 10) {
                speed = enemyData.speed * (1 + (this.waveNumber - 10) * 0.01);
            }

            // Zufällige Variation für mehr Vielfalt
            const variation = 0.85 + Math.random() * 0.3; // 0.85 - 1.15
            health = Math.round(health * variation);

            // Neuen Feind erstellen mit angepasster Geschwindigkeit
            this.createEnemy(enemyType, enemyData, health, speed);
            enemiesSpawned++;
        }, spawnDelay);
    }

    // Neue Methode zur Berechnung des Schwierigkeitsgrads basierend auf der Wellennummer
    calculateWaveDifficulty() {
        // Einfache lineare Funktion mit einem höheren Faktor in späteren Wellen
        let difficulty = 1.0;

        if (this.waveNumber <= 10) {
            difficulty = 1.0 + (this.waveNumber - 1) * 0.1; // 1.0 - 1.9
        } else if (this.waveNumber <= 20) {
            difficulty = 2.0 + (this.waveNumber - 10) * 0.2; // 2.0 - 3.8
        } else {
            difficulty = 4.0 + (this.waveNumber - 20) * 0.3; // 4.0+
        }

        return difficulty;
    }

    createEnemy(type, enemyData, health, speed = null) {
        // PIXI Container erstellen
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
        const actualSpeed = speed || enemyData.speed;

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
    }

    scheduleNextWave(waitTime, callback) {
        this.countdownTime = waitTime;

        clearInterval(this.autoStartTimer);
        this.autoStartTimer = setInterval(() => {
            this.countdownTime -= 1000;

            if (this.countdownTime <= 0) {
                clearInterval(this.autoStartTimer);
                this.startNextWave(callback);
            }
        }, 1000);

        return this.countdownTime;
    }

    cancelWaveTimer() {
        clearInterval(this.autoStartTimer);
        this.countdownTime = 0;
    }

    getCurrentCountdown() {
        return this.countdownTime;
    }

    update(onEnemyEscape, onEnemyDeath) {
        const deltaTime = this.app.ticker.deltaMS; // Zeit seit dem letzten Frame
        const timeScale = deltaTime / (1000 / 60); // Anpassung für 60 FPS

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

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
            if (distance < enemy.speed * 2 * timeScale) {
                enemy.pathIndex++;

                // Wenn das Ende des Pfades erreicht ist
                if (enemy.pathIndex >= this.path.length) {
                    // Feind entkommt, Spieler verliert Leben
                    onEnemyEscape(enemy);

                    // Feind entfernen
                    this.removeEnemy(i);
                    this.enemiesRemaining--;
                    continue;
                }
            }

            // Feind zum aktuellen Wegpunkt bewegen
            const newTargetPoint = this.path[enemy.pathIndex];
            const newDx = newTargetPoint.x - enemy.x;
            const newDy = newTargetPoint.y - enemy.y;
            const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);

            // Normalisierte Richtung
            if (newDistance > 0) {
                const dirX = newDx / newDistance;
                const dirY = newDy / newDistance;

                // Feind bewegen
                enemy.x += dirX * enemy.speed * timeScale;
                enemy.y += dirY * enemy.speed * timeScale;

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

            // Feind entfernen, wenn er tot ist
            if (enemy.health <= 0) {
                // Gold für das Töten des Feindes geben
                onEnemyDeath(enemy);

                // Feind entfernen
                this.removeEnemy(i);
                this.enemiesRemaining--;
            }
        }

        // Effekte aktualisieren
        this.updateEffects();

        // Prüfen, ob die Welle abgeschlossen ist
        if (this.waveInProgress && this.enemies.length === 0 && this.enemiesRemaining <= 0) {
            this.waveInProgress = false;

            // Wenn pendingWaves > 0 ist, direkt die nächste Welle starten
            if (this.pendingWaves > 0) {
                setTimeout(() => {
                    this.startNextWave(this.onWaveComplete);
                }, 500); // Kurze Verzögerung zwischen Wellen
            } else if (this.onWaveComplete) {
                this.onWaveComplete();
            }

            return true; // Welle abgeschlossen
        }

        return false; // Welle noch im Gange
    }

    removeEnemy(index) {
        if (index >= 0 && index < this.enemies.length) {
            // Sprite von der Stage entfernen
            const enemy = this.enemies[index];
            this.container.removeChild(enemy.sprite);

            // Aus dem Array entfernen
            this.enemies.splice(index, 1);
        }
    }

    applyEffect(enemy, effect, duration, value) {
        switch (effect) {
            case 'slow':
                // Prüfen, ob der Feind immun gegen Verlangsamung ist
                if (enemy.immuneToSlow) {
                    // Immunitäts-Effekt anzeigen
                    this.showImmuneEffect(enemy);
                    return;
                }

                enemy.slowed = true;
                enemy.baseSpeed = enemy.baseSpeed || enemy.speed; // Ursprüngliche Geschwindigkeit speichern
                enemy.speed = enemy.baseSpeed * value; // Um Faktor verlangsamen
                enemy.slowUntil = Date.now() + duration;

                // Visuellen Effekt hinzufügen
                this.addSlowEffect(enemy);

                // Zum Effekte-Array hinzufügen
                enemy.effects.push({
                    type: 'slow',
                    until: enemy.slowUntil
                });
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
            this.effectsContainer.removeChild(immuneEffect);
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
            const animate = () => {
                duration += this.app.ticker.deltaMS / 1000;

                if (duration >= 1) {
                    this.effectsContainer.removeChild(particle);
                    this.app.ticker.remove(animate);
                    return;
                }

                particle.y -= 15 * this.app.ticker.deltaMS / 1000; // Nach oben bewegen
                particle.alpha = 1 - duration; // Transparenter werden
            };

            this.app.ticker.add(animate);
        }
    }

    addSlowEffect(enemy) {
        // Langsam-Effekt (blauer Ring)
        const slowEffect = new PIXI.Graphics();
        slowEffect.lineStyle(2, 0x1abc9c);
        slowEffect.drawCircle(0, 0, enemy.size + 3);

        // Schnee-Partikel
        const particles = [];
        for (let i = 0; i < 3; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(0xFFFFFF, 0.7);
            particle.drawCircle(0, 0, 1.5);
            particle.endFill();
            particles.push(particle);
            slowEffect.addChild(particle);
        }

        // Effekt zur Position des Feindes verschieben
        slowEffect.x = enemy.x;
        slowEffect.y = enemy.y;

        // Zum Effekt-Container hinzufügen
        this.effectsContainer.addChild(slowEffect);

        // Animation hinzufügen
        const animate = () => {
            // Effekt mit dem Feind bewegen
            slowEffect.x = enemy.x;
            slowEffect.y = enemy.y;

            // Partikelanimation
            const time = Date.now() / 300;
            for (let i = 0; i < particles.length; i++) {
                const angle = time + i * Math.PI * 2 / 3;
                const dist = 5 + Math.sin(time * 2) * 2;
                particles[i].x = Math.cos(angle) * dist;
                particles[i].y = Math.sin(angle) * dist;
            }

            // Effekt beenden, wenn der Slow-Effekt abgelaufen ist oder der Feind tot ist
            if (!enemy.slowed || enemy.health <= 0) {
                this.effectsContainer.removeChild(slowEffect);
                this.app.ticker.remove(animate);
            }
        };

        this.app.ticker.add(animate);
    }

    updateEffects() {
        // Hier könnten später weitere Effektaktualisierungen hinzugefügt werden
    }

    drawEnemyByType(enemy) {
        // Grafik zurücksetzen
        enemy.graphics.clear();

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
        enemy.graphics.beginFill(0x7f8c8d);
        enemy.graphics.drawCircle(0, 0, enemy.size);
        enemy.graphics.endFill();

        // Gesicht
        enemy.graphics.beginFill(0xf5d7b5); // Hautfarbe
        enemy.graphics.drawCircle(0, -2, enemy.size * 0.6);
        enemy.graphics.endFill();

        // Hut
        enemy.graphics.beginFill(0x964B00);
        enemy.graphics.arc(0, -enemy.size * 0.5, enemy.size * 0.7, Math.PI, Math.PI * 2);
        enemy.graphics.endFill();
    }

    drawFastEnemy(enemy) {
        // Bewegungsrichtung berechnen
        const moveAngle = Math.atan2(
            this.path[enemy.pathIndex].y - enemy.y,
            this.path[enemy.pathIndex].x - enemy.x
        );

        // Bewegungsspur
        enemy.graphics.beginFill(0x9b59b6, 0.3);
        for (let i = 1; i <= 3; i++) {
            enemy.graphics.drawCircle(
                -Math.cos(moveAngle) * (i * 5),
                -Math.sin(moveAngle) * (i * 5),
                enemy.size - i * 2
            );
        }
        enemy.graphics.endFill();

        // Körper
        enemy.graphics.beginFill(0x9b59b6);
        enemy.graphics.drawCircle(0, 0, enemy.size);
        enemy.graphics.endFill();

        // Umhang
        enemy.graphics.beginFill(0x8e44ad);
        enemy.graphics.moveTo(0, 0);
        enemy.graphics.lineTo(
            -Math.cos(moveAngle) * enemy.size * 1.5,
            -Math.sin(moveAngle) * enemy.size * 1.5
        );
        enemy.graphics.lineTo(
            -Math.cos(moveAngle) * enemy.size * 1.2 + Math.sin(moveAngle) * enemy.size * 0.8,
            -Math.sin(moveAngle) * enemy.size * 1.2 - Math.cos(moveAngle) * enemy.size * 0.8
        );
        enemy.graphics.lineTo(
            -Math.cos(moveAngle) * enemy.size * 1.2 - Math.sin(moveAngle) * enemy.size * 0.8,
            -Math.sin(moveAngle) * enemy.size * 1.2 + Math.cos(moveAngle) * enemy.size * 0.8
        );
        enemy.graphics.closePath();
        enemy.graphics.endFill();
    }

    drawTankEnemy(enemy) {
        // Schild
        enemy.graphics.beginFill(0x34495e);
        enemy.graphics.drawCircle(0, 0, enemy.size);
        enemy.graphics.endFill();

        // Schilddetails
        enemy.graphics.lineStyle(3, 0x2c3e50);
        enemy.graphics.drawCircle(0, 0, enemy.size - 3);

        // Helm
        enemy.graphics.beginFill(0x7f8c8d);
        enemy.graphics.drawCircle(0, -2, enemy.size * 0.6);
        enemy.graphics.endFill();

        // Gesichtsspalt im Helm
        enemy.graphics.beginFill(0x000000);
        enemy.graphics.drawRect(-enemy.size * 0.4, -5, enemy.size * 0.8, 3);
        enemy.graphics.endFill();
    }

    drawBossEnemy(enemy) {
        const time = Date.now() / 300;

        // Aura
        enemy.graphics.beginFill(0xc0392b, 0.2);
        enemy.graphics.drawCircle(0, 0, enemy.size * 1.5 + Math.sin(time) * 3);
        enemy.graphics.endFill();

        // Körper
        enemy.graphics.beginFill(0xc0392b);
        enemy.graphics.drawCircle(0, 0, enemy.size);
        enemy.graphics.endFill();

        // Krone
        enemy.graphics.beginFill(0xFFD700);
        const crownHeight = enemy.size * 0.6;

        enemy.graphics.moveTo(-enemy.size * 0.6, -enemy.size * 0.5);
        enemy.graphics.lineTo(-enemy.size * 0.6, -enemy.size * 0.5 - crownHeight * 0.6);
        enemy.graphics.lineTo(-enemy.size * 0.4, -enemy.size * 0.5 - crownHeight * 0.3);
        enemy.graphics.lineTo(-enemy.size * 0.2, -enemy.size * 0.5 - crownHeight * 0.8);
        enemy.graphics.lineTo(0, -enemy.size * 0.5 - crownHeight * 0.4);
        enemy.graphics.lineTo(enemy.size * 0.2, -enemy.size * 0.5 - crownHeight * 0.8);
        enemy.graphics.lineTo(enemy.size * 0.4, -enemy.size * 0.5 - crownHeight * 0.3);
        enemy.graphics.lineTo(enemy.size * 0.6, -enemy.size * 0.5 - crownHeight * 0.6);
        enemy.graphics.lineTo(enemy.size * 0.6, -enemy.size * 0.5);
        enemy.graphics.closePath();
        enemy.graphics.endFill();

        // Gesicht
        enemy.graphics.beginFill(0x7d241e);
        enemy.graphics.drawCircle(0, 0, enemy.size * 0.6);
        enemy.graphics.endFill();

        // Böse Augen
        enemy.graphics.beginFill(0xFFFFFF);
        enemy.graphics.drawCircle(-enemy.size * 0.25, -enemy.size * 0.1, 4);
        enemy.graphics.drawCircle(enemy.size * 0.25, -enemy.size * 0.1, 4);
        enemy.graphics.endFill();

        enemy.graphics.beginFill(0xFF0000);
        enemy.graphics.drawCircle(-enemy.size * 0.25, -enemy.size * 0.1, 2);
        enemy.graphics.drawCircle(enemy.size * 0.25, -enemy.size * 0.1, 2);
        enemy.graphics.endFill();
    }

    // Neuer Gegnertyp: Immun gegen Verlangsamung
    drawImmuneEnemy(enemy) {
        const time = Date.now() / 400;

        // Pulsierender Schutzschild (leichter violetter Schein)
        enemy.graphics.beginFill(0x8e44ad, 0.2);
        enemy.graphics.drawCircle(0, 0, enemy.size * 1.2 + Math.sin(time) * 2);
        enemy.graphics.endFill();

        // Körper
        enemy.graphics.beginFill(0x8e44ad);
        enemy.graphics.drawCircle(0, 0, enemy.size);
        enemy.graphics.endFill();

        // Kapuze
        enemy.graphics.beginFill(0x5b2c6f);
        enemy.graphics.arc(0, 0, enemy.size * 0.8, -Math.PI, 0);
        enemy.graphics.lineTo(0, -enemy.size * 0.8);
        enemy.graphics.closePath();
        enemy.graphics.endFill();

        // Gesicht (dunkel, nur Augen sichtbar)
        enemy.graphics.beginFill(0x2c3e50);
        enemy.graphics.drawCircle(0, 0, enemy.size * 0.5);
        enemy.graphics.endFill();

        // Leuchtende Augen
        enemy.graphics.beginFill(0xFFFFFF, 0.8);
        enemy.graphics.drawCircle(-enemy.size * 0.2, -enemy.size * 0.1, 3);
        enemy.graphics.drawCircle(enemy.size * 0.2, -enemy.size * 0.1, 3);
        enemy.graphics.endFill();

        // Magisches Symbol (rotierend)
        enemy.graphics.lineStyle(1, 0xffffff, 0.7);
        const symbolRadius = enemy.size * 0.3;
        const pointCount = 5;

        for (let i = 0; i < pointCount; i++) {
            const angle1 = time + (i * Math.PI * 2 / pointCount);
            const angle2 = time + ((i + 2) % pointCount * Math.PI * 2 / pointCount);

            enemy.graphics.moveTo(
                Math.cos(angle1) * symbolRadius,
                Math.sin(angle1) * symbolRadius
            );
            enemy.graphics.lineTo(
                Math.cos(angle2) * symbolRadius,
                Math.sin(angle2) * symbolRadius
            );
        }
    }

    // Neuer Gegnertyp: Regeneriert Gesundheit
    drawRegenEnemy(enemy) {
        const time = Date.now() / 500;

        // Pulsierender grüner Heilungsaura
        enemy.graphics.beginFill(0x27ae60, 0.15);
        enemy.graphics.drawCircle(0, 0, enemy.size * 1.3 + Math.sin(time) * 3);
        enemy.graphics.endFill();

        // Körper
        enemy.graphics.beginFill(0x27ae60);
        enemy.graphics.drawCircle(0, 0, enemy.size);
        enemy.graphics.endFill();

        // Gewand
        enemy.graphics.beginFill(0x229954);
        enemy.graphics.arc(0, 0, enemy.size * 0.9, Math.PI, Math.PI * 2);
        enemy.graphics.lineTo(0, enemy.size * 0.5);
        enemy.graphics.closePath();
        enemy.graphics.endFill();

        // Gesicht
        enemy.graphics.beginFill(0xf5d7b5);
        enemy.graphics.drawCircle(0, -enemy.size * 0.2, enemy.size * 0.45);
        enemy.graphics.endFill();

        // Heiliges Symbol (Kreuz)
        enemy.graphics.lineStyle(2, 0xffffff, 0.8);
        enemy.graphics.moveTo(0, -enemy.size * 0.6);
        enemy.graphics.lineTo(0, -enemy.size * 0.2);
        enemy.graphics.moveTo(-enemy.size * 0.2, -enemy.size * 0.4);
        enemy.graphics.lineTo(enemy.size * 0.2, -enemy.size * 0.4);

        // Heilungspartikel
        if (Math.sin(time * 3) > 0.7) {
            enemy.graphics.beginFill(0x2ecc71, 0.7);
            for (let i = 0; i < 3; i++) {
                const particleAngle = time * 2 + i * Math.PI * 2 / 3;
                const dist = enemy.size * 0.8;
                enemy.graphics.drawCircle(
                    Math.cos(particleAngle) * dist,
                    Math.sin(particleAngle) * dist,
                    2
                );
            }
            enemy.graphics.endFill();
        }
    }
}