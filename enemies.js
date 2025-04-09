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

        // Sprites für verschiedene Feindtypen
        this.enemySprites = {};
    }

    updatePath(newPath) {
        this.path = newPath;
    }

    startNextWave(callback) {
        if (this.waveInProgress) return;

        this.waveNumber++;
        this.waveInProgress = true;
        this.onWaveComplete = callback; // Callback speichern

        // Welle basierend auf dem aktuellen Fortschritt generieren
        this.spawnWave();

        return this.waveNumber;
    }

    spawnWave() {
        const enemiesCount = Math.min(5 + this.waveNumber * 2, 30); // Maximal 30 Feinde pro Welle
        this.enemiesRemaining = enemiesCount;
        let enemiesSpawned = 0;

        // Verschiedene Feindtypen je nach Welle
        const availableTypes = [];
        availableTypes.push('normal');

        if (this.waveNumber >= 3) availableTypes.push('fast');
        if (this.waveNumber >= 5) availableTypes.push('tank');
        if (this.waveNumber >= 8 && this.waveNumber % 5 === 0) availableTypes.push('boss');

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

            // Gesundheit mit Wellennummer skalieren
            let health = enemyData.health;
            if (this.waveNumber > 1) {
                health += Math.round(health * (this.waveNumber - 1) * 0.2);
            }

            // Neuen Feind erstellen
            this.createEnemy(enemyType, enemyData, health);
            enemiesSpawned++;
        }, 800); // Feind alle 800ms spawnen
    }

    createEnemy(type, enemyData, health) {
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
            speed: enemyData.speed,
            baseSpeed: enemyData.speed, // Ursprüngliche Geschwindigkeit für Slow-Effekte speichern
            size: enemyData.size,
            color: enemyData.color,
            reward: enemyData.reward,
            pathIndex: 0,
            slowed: false,
            slowUntil: 0,
            effects: [] // Für visuelle Effekte wie Slow, Gift, etc.
        };

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
}