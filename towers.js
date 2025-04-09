class TowerManager {
    constructor(app, gameMap) {
        this.app = app;
        this.gameMap = gameMap;
        this.towers = [];
        this.projectiles = [];
        this.selectedTower = null;
        this.hoverTower = null;

        // Container für Türme und Projektile
        this.towerContainer = new PIXI.Container();
        this.projectileContainer = new PIXI.Container();
        this.rangeCirclesContainer = new PIXI.Container(); // Für Reichweiten-Anzeigen

        // Zur Stage hinzufügen
        this.app.stage.addChild(this.rangeCirclesContainer);
        this.app.stage.addChild(this.towerContainer);
        this.app.stage.addChild(this.projectileContainer);
    }

    updateMap(gameMap) {
        this.gameMap = gameMap;
    }

    addTower(type, x, y) {
        const tileX = Math.floor(x / this.gameMap.tileSize);
        const tileY = Math.floor(y / this.gameMap.tileSize);

        // Prüfen, ob die Kachel innerhalb der Grenzen liegt
        if (tileX < 0 || tileX >= this.gameMap.width || tileY < 0 || tileY >= this.gameMap.height) {
            return false;
        }

        // Prüfen, ob die Kachel frei ist (kein Pfad und kein Turm)
        if (this.gameMap.isTileOccupied(x, y)) {
            return false;
        }

        // Prüfen, ob bereits ein Turm auf dieser Kachel steht
        for (const tower of this.towers) {
            const towerTileX = Math.floor(tower.x / this.gameMap.tileSize);
            const towerTileY = Math.floor(tower.y / this.gameMap.tileSize);
            if (towerTileX === tileX && towerTileY === tileY) {
                return false; // Hier steht bereits ein Turm
            }
        }

        // Turm-Konfiguration abrufen
        const towerType = towerTypes[type];
        if (!towerType) {
            return false;
        }

        // Mittelpunkt der Kachel
        const centerPoint = this.gameMap.getTileCenter(x, y);

        // Turm-Container erstellen
        const towerContainer = new PIXI.Container();
        towerContainer.x = centerPoint.x;
        towerContainer.y = centerPoint.y;

        // Turm-Grafik
        const towerGraphics = new PIXI.Graphics();
        towerContainer.addChild(towerGraphics);

        // Neuen Turm erstellen
        const newTower = {
            x: centerPoint.x,
            y: centerPoint.y,
            type: type,
            name: towerType.name,
            damage: towerType.damage,
            range: towerType.range,
            fireRate: towerType.fireRate,
            lastShot: 0,
            target: null,
            color: towerType.color,
            projectileColor: towerType.projectileColor,
            projectileSize: towerType.projectileSize,
            projectileSpeed: towerType.projectileSpeed,
            effect: towerType.effect || null,
            container: towerContainer,
            graphics: towerGraphics,
            selected: false,
            hover: false,
            level: 0,
            upgrades: [],
            angle: 0, // Richtung, in die der Turm zeigt
            animationState: 0,
            sellValue: Math.floor(towerType.cost * towerType.sellFactor)
        };

        // Spezifische Eigenschaften für besondere Turmtypen
        if (type === 'slow') {
            newTower.slowFactor = towerType.slowFactor;
            newTower.slowDuration = towerType.slowDuration;
        } else if (type === 'bomb') {
            newTower.splashRadius = towerType.splashRadius;
        }

        // Turm zeichnen
        this.drawTower(newTower);

        // Turm zum Container hinzufügen
        this.towerContainer.addChild(towerContainer);

        // Turm zum Array hinzufügen
        this.towers.push(newTower);

        return true;
    }

    removeTower(towerIndex) {
        if (towerIndex >= 0 && towerIndex < this.towers.length) {
            // Verkaufswert vor dem Entfernen abrufen
            const tower = this.towers[towerIndex];
            const sellValue = tower.sellValue;

            // Turm entfernen
            this.towerContainer.removeChild(tower.container);
            this.towers.splice(towerIndex, 1);

            // Goldwert zurückgeben
            return sellValue;
        }
        return 0;
    }

    getTowerAt(x, y, radius = 20) {
        for (let i = 0; i < this.towers.length; i++) {
            const tower = this.towers[i];
            const dx = tower.x - x;
            const dy = tower.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= radius) {
                return { tower, index: i };
            }
        }
        return null;
    }

    upgradeTower(towerIndex, targetLevel) {
        if (towerIndex < 0 || towerIndex >= this.towers.length) {
            return { success: false, cost: 0 };
        }

        const tower = this.towers[towerIndex];
        const towerType = towerTypes[tower.type];

        if (!towerType || targetLevel <= tower.level || targetLevel > towerType.upgrades.length) {
            return { success: false, cost: 0 };
        }

        // Gesamtkosten der Upgrades von aktuellem Level bis Ziellevel berechnen
        let totalCost = 0;
        for (let i = tower.level; i < targetLevel; i++) {
            totalCost += towerType.upgrades[i].cost;
        }

        // Alle Upgrades nacheinander anwenden
        for (let i = tower.level; i < targetLevel; i++) {
            const upgrade = towerType.upgrades[i];
            tower.upgrades.push(upgrade);

            // Turmeigenschaften aktualisieren
            for (const [key, value] of Object.entries(upgrade)) {
                if (key !== 'name' && key !== 'cost' && key !== 'description') {
                    tower[key] = value;
                }
            }
        }

        // Turmlevel aktualisieren
        tower.level = targetLevel;

        // Verkaufswert aktualisieren (Basiskosten + 70% der Upgradekosten)
        tower.sellValue = Math.floor(towerType.cost * towerType.sellFactor);
        tower.upgrades.forEach(upgrade => {
            tower.sellValue += Math.floor(upgrade.cost * towerType.sellFactor);
        });

        // Turm neu zeichnen mit den aktualisierten Eigenschaften
        this.drawTower(tower);

        return { success: true, cost: totalCost };
    }

    getUpgradeCost(tower, targetLevel) {
        const towerType = towerTypes[tower.type];

        if (!towerType || targetLevel <= tower.level || targetLevel > towerType.upgrades.length) {
            return 0;
        }

        // Gesamtkosten der Upgrades vom aktuellen Level bis zum Ziellevel berechnen
        let totalCost = 0;
        for (let i = tower.level; i < targetLevel; i++) {
            totalCost += towerType.upgrades[i].cost;
        }

        return totalCost;
    }

    update(enemies, deltaTime) {
        const currentTime = Date.now();

        // Türme aktualisieren
        for (const tower of this.towers) {
            // Animationszustand für visuelle Effekte inkrementieren
            tower.animationState += deltaTime * 0.001;

            // Nächstes Ziel in Reichweite finden
            let closestEnemy = null;
            let closestDistance = Infinity;

            for (const enemy of enemies) {
                const dx = tower.x - enemy.x;
                const dy = tower.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= tower.range && distance < closestDistance) {
                    closestEnemy = enemy;
                    closestDistance = distance;
                }
            }

            tower.target = closestEnemy;

            // Turm-Winkel zum Ziel aktualisieren
            if (tower.target) {
                const targetAngle = Math.atan2(tower.target.y - tower.y, tower.target.x - tower.x);

                // Geschmeidige Drehung
                const angleDiff = this.normalizeAngle(targetAngle - tower.angle);
                const rotationSpeed = 10 * deltaTime * 0.001; // Rotationen pro Sekunde

                if (Math.abs(angleDiff) > 0.05) {
                    if (angleDiff > 0 && angleDiff < Math.PI) {
                        tower.angle += Math.min(rotationSpeed, angleDiff);
                    } else {
                        tower.angle -= Math.min(rotationSpeed, Math.PI * 2 - Math.abs(angleDiff));
                    }

                    // Winkel zwischen 0 und 2*PI normalisieren
                    tower.angle = this.normalizeAngle(tower.angle);

                    // Turm neu zeichnen mit aktualisiertem Winkel
                    this.drawTower(tower);
                }

                // Feuern, wenn Abklingzeit abgelaufen ist
                if (currentTime - tower.lastShot >= tower.fireRate) {
                    tower.lastShot = currentTime;

                    // Anzahl der Schüsse hängt von der multishot-Eigenschaft ab
                    const shotsCount = tower.multishot || 1;
                    const angleStep = shotsCount > 1 ? 0.2 : 0; // Winkel zwischen Schüssen

                    for (let i = 0; i < shotsCount; i++) {
                        // Winkelversatz für Mehrfachschuss
                        const angleOffset = (i - (shotsCount - 1) / 2) * angleStep;

                        // Zielposition mit Versatz berechnen
                        let targetX = tower.target.x;
                        let targetY = tower.target.y;

                        if (angleOffset !== 0) {
                            const baseAngle = tower.angle;
                            const distance = closestDistance;

                            targetX = tower.x + Math.cos(baseAngle + angleOffset) * distance;
                            targetY = tower.y + Math.sin(baseAngle + angleOffset) * distance;
                        }

                        // Neues Projektil erstellen
                        this.createProjectile(tower, targetX, targetY, tower.target);
                    }
                }
            }
        }

        // Projektile aktualisieren
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];

            // Projektilposition aktualisieren
            if (projectile.type === 'bomb') {
                this.updateBombProjectile(projectile, deltaTime);
            } else {
                this.updateStandardProjectile(projectile, deltaTime);
            }

            // Prüfen, ob Projektil außerhalb der Grenzen ist
            if (
                projectile.x < -50 ||
                projectile.x > this.gameMap.width * this.gameMap.tileSize + 50 ||
                projectile.y < -50 ||
                projectile.y > this.gameMap.height * this.gameMap.tileSize + 50
            ) {
                this.removeProjectile(i);
                continue;
            }

            // Kollisionen mit Feinden prüfen
            this.checkProjectileCollisions(projectile, enemies, i);
        }
    }

    createProjectile(tower, targetX, targetY, targetEnemy) {
        // Projektil-Grafik erstellen
        const projectileGraphics = new PIXI.Graphics();
        this.projectileContainer.addChild(projectileGraphics);

        const baseProjectile = {
            x: tower.x,
            y: tower.y,
            sourceX: tower.x,
            sourceY: tower.y,
            targetX: targetX,
            targetY: targetY,
            startX: tower.x,
            startY: tower.y,
            target: targetEnemy,
            damage: tower.damage,
            speed: tower.projectileSpeed,
            size: tower.projectileSize,
            color: tower.projectileColor,
            type: tower.type,
            effect: tower.effect,
            angle: tower.angle, // Bewegungsrichtung
            timeAlive: 0,
            graphics: projectileGraphics
        };

        // Spezifische Eigenschaften für spezielle Projektile
        if (tower.type === 'slow' || tower.effect === 'slow') {
            baseProjectile.slowFactor = tower.slowFactor;
            baseProjectile.slowDuration = tower.slowDuration;
        } else if (tower.type === 'bomb' || tower.effect === 'splash') {
            baseProjectile.splashRadius = tower.splashRadius;
            // Eigenschaften für parabolische Flugbahn
            baseProjectile.flightHeight = 0;
            baseProjectile.maxHeight = 50;
            baseProjectile.flightProgress = 0;
            baseProjectile.flightDuration = this.calculateFlightDuration(tower.x, tower.y, targetX, targetY, tower.projectileSpeed);
        }

        // Durchdringungseigenschaft
        if (tower.pierce) {
            baseProjectile.pierce = tower.pierce;
            baseProjectile.hitEnemies = [];
        }

        // Projektil zeichnen
        this.drawProjectile(baseProjectile);

        this.projectiles.push(baseProjectile);
    }

    removeProjectile(index) {
        if (index >= 0 && index < this.projectiles.length) {
            const projectile = this.projectiles[index];
            this.projectileContainer.removeChild(projectile.graphics);
            this.projectiles.splice(index, 1);
        }
    }

    calculateFlightDuration(startX, startY, targetX, targetY, speed) {
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance / speed;
    }

    updateStandardProjectile(projectile, deltaTime) {
        // Prüfen, ob Ziel noch existiert und Zielposition aktualisieren
        if (projectile.target && projectile.target.health > 0) {
            projectile.targetX = projectile.target.x;
            projectile.targetY = projectile.target.y;
        }

        // Richtung berechnen
        const dx = projectile.targetX - projectile.x;
        const dy = projectile.targetY - projectile.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Projektil bewegen
        if (distance > 0) {
            const speed = projectile.speed * deltaTime * 0.06; // Nach deltaTime skalieren
            const moveDistance = Math.min(distance, speed);

            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;

            projectile.x += normalizedDx * moveDistance;
            projectile.y += normalizedDy * moveDistance;

            // Winkel für visuelle Effekte aktualisieren
            projectile.angle = Math.atan2(normalizedDy, normalizedDx);

            // Grafik aktualisieren
            projectile.graphics.x = projectile.x;
            projectile.graphics.y = projectile.y;

            // Projektil neu zeichnen
            this.drawProjectile(projectile);
        }

        projectile.timeAlive += deltaTime;
    }

    updateBombProjectile(projectile, deltaTime) {
        // Fortschritt des Flugs aktualisieren
        const flightSpeed = projectile.speed * deltaTime * 0.06; // Nach deltaTime skalieren
        projectile.timeAlive += deltaTime;

        // Richtung zum Ziel berechnen
        const dx = projectile.targetX - projectile.startX;
        const dy = projectile.targetY - projectile.startY;
        const totalDistance = Math.sqrt(dx * dx + dy * dy);

        // Aktuelle Position basierend auf zurückgelegter Distanz berechnen
        const distanceTraveled = projectile.timeAlive / projectile.flightDuration * totalDistance;
        const progress = Math.min(distanceTraveled / totalDistance, 1);

        projectile.flightProgress = progress;

        // Lineare Interpolation für x- und y-Positionen
        projectile.x = projectile.startX + dx * progress;
        projectile.y = projectile.startY + dy * progress;

        // Parabolische Höhe (Bogen) - Maximum in der Mitte des Flugs
        projectile.flightHeight = projectile.maxHeight * (4 * progress * (1 - progress));

        // Visuelle y-Position basierend auf Höhe anpassen
        projectile.visualY = projectile.y - projectile.flightHeight;

        // Grafik aktualisieren
        projectile.graphics.x = projectile.x;
        projectile.graphics.y = projectile.visualY || projectile.y;

        // Projektil neu zeichnen
        this.drawProjectile(projectile);

        // Wenn Ziel erreicht, Explosion erzeugen
        if (progress >= 1) {
            this.createExplosion(projectile);
            // Projektil entfernen
            const index = this.projectiles.indexOf(projectile);
            if (index !== -1) {
                this.removeProjectile(index);
            }
        }
    }

    createExplosion(projectile) {
        // Explosion-Effekt hinzufügen (wird in der Kollisionserkennung behandelt)

        // Explosionsgrafik
        const explosion = new PIXI.Graphics();
        explosion.beginFill(0xFF8800, 0.8);
        explosion.drawCircle(0, 0, 20);
        explosion.endFill();

        // Äußerer Ring
        explosion.beginFill(0xFF3300, 0.4);
        explosion.drawCircle(0, 0, projectile.splashRadius);
        explosion.endFill();

        explosion.x = projectile.x;
        explosion.y = projectile.y;
        this.projectileContainer.addChild(explosion);

        // Animation: Explosion verblassen lassen
        let alpha = 1;
        const fadeExplosion = () => {
            alpha -= 0.05;
            explosion.alpha = alpha;

            if (alpha <= 0) {
                this.projectileContainer.removeChild(explosion);
                this.app.ticker.remove(fadeExplosion);
            }
        };

        this.app.ticker.add(fadeExplosion);
    }

    checkProjectileCollisions(projectile, enemies, projectileIndex) {
        let hitEnemy = false;

        for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];

            // Wenn dies ein durchdringendes Projektil ist und es diesen Feind bereits getroffen hat, überspringen
            if (projectile.pierce && projectile.hitEnemies && projectile.hitEnemies.includes(j)) {
                continue;
            }

            // Abstand für Kollisionserkennung berechnen
            let detectX = projectile.x;
            let detectY = projectile.y;

            // Für Bombenprojektile die visuelle Position für Kollisionen verwenden
            if (projectile.type === 'bomb' && typeof projectile.visualY !== 'undefined') {
                detectY = projectile.visualY;
            }

            const enemyDx = enemy.x - detectX;
            const enemyDy = enemy.y - detectY;
            const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);

            // Prüfen, ob das Projektil den Feind getroffen hat
            const hitRadius = projectile.size + enemy.size;
            if (enemyDistance < hitRadius) {
                hitEnemy = true;

                // Schaden anwenden
                enemy.health -= projectile.damage;

                // Spezielle Effekte anwenden
                if (projectile.effect === 'slow') {
                    if (!enemy.slowed) {
                        enemy.slowed = true;
                        enemy.speed = enemy.baseSpeed * projectile.slowFactor;
                        enemy.slowUntil = Date.now() + projectile.slowDuration;
                    }
                } else if (projectile.effect === 'splash' || projectile.type === 'bomb') {
                    // Explosion erstellen und Flächenschaden anwenden
                    this.applySplashDamage(enemies, enemy.x, enemy.y, projectile.splashRadius, projectile.damage);
                }

                // Wenn es ein durchdringendes Projektil ist, diesen Feind als getroffen markieren
                if (projectile.pierce) {
                    if (!projectile.hitEnemies) {
                        projectile.hitEnemies = [];
                    }
                    projectile.hitEnemies.push(j);

                    // Wenn maximale Durchdringungsanzahl erreicht ist, Projektil entfernen
                    if (projectile.hitEnemies.length >= projectile.pierce) {
                        this.removeProjectile(projectileIndex);
                    }

                    // Weitermachen mit dem nächsten Projektil
                    break;
                } else if (projectile.type !== 'bomb') { // Bombenprojektile explodieren beim Aufprall mit dem ersten Feind
                    // Normales Projektil: nach einem Treffer entfernen
                    this.removeProjectile(projectileIndex);
                    break;
                } else {
                    // Bombenprojektil: explodieren und entfernen
                    this.removeProjectile(projectileIndex);
                    break;
                }
            }
        }

        return hitEnemy;
    }

    applySplashDamage(enemies, centerX, centerY, radius, baseDamage) {
        // Schaden an allen Feinden im Radius anwenden
        for (const enemy of enemies) {
            const dx = enemy.x - centerX;
            const dy = enemy.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= radius) {
                // Schaden nimmt mit Entfernung ab
                const damageMultiplier = 1 - (distance / radius) * 0.7; // Min. 30% Schaden am Rand
                const damage = baseDamage * damageMultiplier;
                enemy.health -= damage;
            }
        }
    }

    drawTower(tower) {
        // Grafik zurücksetzen
        tower.graphics.clear();

        switch (tower.type) {
            case 'basic':
                this.drawBasicTower(tower);
                break;
            case 'sniper':
                this.drawSniperTower(tower);
                break;
            case 'slow':
                this.drawSlowTower(tower);
                break;
            case 'bomb':
                this.drawBombTower(tower);
                break;
            default:
                this.drawDefaultTower(tower);
        }

        // Turmlevel-Indikatoren zeichnen
        this.drawTowerLevelIndicators(tower);
    }

    drawBasicTower(tower) {
        // Turm-Basis
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawCircle(0, 0, 15);
        tower.graphics.endFill();

        // Turm-Detail (Zentrum)
        tower.graphics.beginFill(0x2980b9);
        tower.graphics.drawCircle(0, 0, 10);
        tower.graphics.endFill();

        // Läufe basierend auf Turmlevel zeichnen
        if (tower.multishot === 2) {
            // Doppellauf
            this.drawTowerBarrel(tower, tower.angle, -5, 18);
            this.drawTowerBarrel(tower, tower.angle, 5, 18);
        } else if (tower.multishot === 3) {
            // Dreilauf
            this.drawTowerBarrel(tower, tower.angle, -8, 20);
            this.drawTowerBarrel(tower, tower.angle, 0, 22);
            this.drawTowerBarrel(tower, tower.angle, 8, 20);
        } else {
            // Einzellauf
            this.drawTowerBarrel(tower, tower.angle, 0, 20);
        }
    }

    drawSniperTower(tower) {
        // Turm-Basis
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawCircle(0, 0, 15);
        tower.graphics.endFill();

        // Turm-Detail
        tower.graphics.beginFill(0xc0392b);
        tower.graphics.drawCircle(0, 0, 10);
        tower.graphics.endFill();

        // Sniper-Lauf (länger)
        tower.graphics.lineStyle(5, 0x333333);
        tower.graphics.moveTo(0, 0);

        const barrelLength = 25 + tower.level * 5; // Längerer Lauf mit jedem Level
        tower.graphics.lineTo(
            Math.cos(tower.angle) * barrelLength,
            Math.sin(tower.angle) * barrelLength
        );

        // Level 3: Zielfernrohr-Effekt hinzufügen
        if (tower.level === 3) {
            tower.graphics.beginFill(0xFF0000, 0.6);
            tower.graphics.drawCircle(
                Math.cos(tower.angle) * (barrelLength - 5),
                Math.sin(tower.angle) * (barrelLength - 5),
                4
            );
            tower.graphics.endFill();

            // Laserzielvisier
            tower.graphics.lineStyle(1, 0xFF0000, 0.3);
            tower.graphics.moveTo(
                Math.cos(tower.angle) * barrelLength,
                Math.sin(tower.angle) * barrelLength
            );
            tower.graphics.lineTo(
                Math.cos(tower.angle) * tower.range,
                Math.sin(tower.angle) * tower.range
            );
        }
    }

    drawSlowTower(tower) {
        // Frost-Turm mit pulsierendem Effekt
        const frostColor = tower.level >= 3 ? 0xa5f3fc : 0x1abc9c;
        const time = tower.animationState * 5;
        const pulsateRadius = 10 + Math.sin(time) * 3;

        // Frost-Aura
        tower.graphics.beginFill(frostColor, 0.4);
        tower.graphics.drawCircle(0, 0, pulsateRadius + 5);
        tower.graphics.endFill();

        // Turm-Basis
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawCircle(0, 0, 15);
        tower.graphics.endFill();

        // Kristallstruktur
        tower.graphics.lineStyle(3, frostColor);
        const spikes = 3 + tower.level;

        for (let i = 0; i < spikes; i++) {
            const spikeAngle = tower.angle + (i * Math.PI * 2) / spikes;
            tower.graphics.moveTo(0, 0);
            tower.graphics.lineTo(
                Math.cos(spikeAngle) * 15,
                Math.sin(spikeAngle) * 15
            );
        }

        // Frost-Partikel
        tower.graphics.beginFill(0xFFFFFF, 0.7);
        for (let i = 0; i < spikes; i++) {
            const particleAngle = time + (i * Math.PI * 2) / spikes;
            tower.graphics.drawCircle(
                Math.cos(particleAngle) * (pulsateRadius - 2),
                Math.sin(particleAngle) * (pulsateRadius - 2),
                2
            );
        }
        tower.graphics.endFill();
    }

    drawBombTower(tower) {
        // Turm-Basis
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawCircle(0, 0, 15);
        tower.graphics.endFill();

        // Turm-Detail
        tower.graphics.beginFill(0xd35400);
        tower.graphics.drawCircle(0, 0, 10);
        tower.graphics.endFill();

        // Mörser-Lauf (zeigt aufwärts vom Turm-Winkel)
        tower.graphics.lineStyle(6, 0x333333);
        tower.graphics.moveTo(0, 0);

        // Mörser zeigt immer in einem Winkel nach oben
        const mortarAngle = tower.angle - Math.PI / 4; // 45° nach oben
        const barrelLength = 15 + tower.level * 3;

        tower.graphics.lineTo(
            Math.cos(mortarAngle) * barrelLength,
            Math.sin(mortarAngle) * barrelLength
        );

        // Mörser-Kopf zeichnen
        if (tower.level > 0) {
            tower.graphics.beginFill(tower.color);
            tower.graphics.drawCircle(
                Math.cos(mortarAngle) * (barrelLength + 3),
                Math.sin(mortarAngle) * (barrelLength + 3),
                3 + tower.level
            );
            tower.graphics.endFill();
        }
    }

    drawDefaultTower(tower) {
        // Fallback-Turm-Zeichnung
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawCircle(0, 0, 15);
        tower.graphics.endFill();

        // Einfacher Lauf
        this.drawTowerBarrel(tower, tower.angle, 0, 15);
    }

    drawTowerBarrel(tower, angle, offset, length = 18) {
        // Versatz für mehrere Läufe
        const perpX = Math.cos(angle + Math.PI / 2) * offset;
        const perpY = Math.sin(angle + Math.PI / 2) * offset;

        // Lauf-Basis
        const startX = perpX;
        const startY = perpY;

        // Lauflänge basierend auf Level
        const barrelLength = length + tower.level * 2;

        tower.graphics.lineStyle(4, 0x333333);
        tower.graphics.moveTo(startX, startY);
        tower.graphics.lineTo(
            startX + Math.cos(angle) * barrelLength,
            startY + Math.sin(angle) * barrelLength
        );
    }

    drawTowerLevelIndicators(tower) {
        if (tower.level > 0) {
            // Goldene Indikator-Ringe
            tower.graphics.lineStyle(3, 0xFFD700);

            for (let i = 0; i < tower.level; i++) {
                tower.graphics.drawCircle(0, 0, 15 + (i * 4) + 3);
            }
        }
    }

    drawProjectile(projectile) {
        // Grafik zurücksetzen
        projectile.graphics.clear();

        switch (projectile.type) {
            case 'bomb':
                this.drawBombProjectile(projectile);
                break;
            case 'slow':
                this.drawSlowProjectile(projectile);
                break;
            case 'sniper':
                if (projectile.pierce) {
                    this.drawPiercingProjectile(projectile);
                } else {
                    this.drawStandardProjectile(projectile);
                }
                break;
            default:
                this.drawStandardProjectile(projectile);
        }
    }

    drawStandardProjectile(projectile) {
        projectile.graphics.beginFill(projectile.color);
        projectile.graphics.drawCircle(0, 0, projectile.size);
        projectile.graphics.endFill();

        // Bewegungsspur
        projectile.graphics.beginFill(projectile.color, 0.3);
        const trailLength = 3;
        for (let i = 1; i <= trailLength; i++) {
            const scale = 1 - (i / trailLength);
            projectile.graphics.drawCircle(
                -Math.cos(projectile.angle) * (i * 5),
                -Math.sin(projectile.angle) * (i * 5),
                projectile.size * scale
            );
        }
        projectile.graphics.endFill();
    }

    drawPiercingProjectile(projectile) {
        // Strahleffekt für durchdringende Projektile
        const angle = projectile.angle;

        // Hauptstrahl
        projectile.graphics.beginFill(0xFF3C3C, 0.7);
        projectile.graphics.drawCircle(0, 0, projectile.size);
        projectile.graphics.endFill();

        // Leuchtender Strahl
        projectile.graphics.lineStyle(2, 0xFF3C3C, 0.5);
        projectile.graphics.moveTo(-Math.cos(angle) * 12, -Math.sin(angle) * 12);
        projectile.graphics.lineTo(Math.cos(angle) * 12, Math.sin(angle) * 12);

        // Partikeleffekte
        projectile.graphics.beginFill(0xFFC8C8, 0.7);
        const time = Date.now() / 200;
        for (let i = 0; i < 3; i++) {
            const particleAngle = time + (i * Math.PI * 2 / 3);
            const dist = 3 + Math.sin(time + i) * 1;
            projectile.graphics.drawCircle(
                Math.cos(particleAngle) * dist,
                Math.sin(particleAngle) * dist,
                1.5
            );
        }
        projectile.graphics.endFill();
    }

    drawSlowProjectile(projectile) {
        // Pulsierender Frost-Effekt
        const time = projectile.timeAlive * 0.01;
        const pulseSize = 3 + Math.sin(time) * 1;

        // Frost-Zentrum
        projectile.graphics.beginFill(0x1abc9c, 0.8);
        projectile.graphics.drawCircle(0, 0, pulseSize);
        projectile.graphics.endFill();

        // Frost-Spur
        projectile.graphics.beginFill(0x1abc9c, 0.3);
        for (let i = 1; i <= 3; i++) {
            projectile.graphics.drawCircle(
                -Math.cos(projectile.angle) * (i * 4),
                -Math.sin(projectile.angle) * (i * 4),
                pulseSize - i * 0.5
            );
        }
        projectile.graphics.endFill();

        // Schnee-Partikel
        projectile.graphics.beginFill(0xFFFFFF, 0.6);
        for (let i = 0; i < 2; i++) {
            const particleAngle = time * 3 + i * Math.PI;
            projectile.graphics.drawCircle(
                Math.cos(particleAngle) * 3,
                Math.sin(particleAngle) * 3,
                1
            );
        }
        projectile.graphics.endFill();
    }

    drawBombProjectile(projectile) {
        // Visuelle y-Position abrufen (mit Bogen)
        const visualY = projectile.visualY !== undefined ? projectile.visualY - projectile.y : 0;

        // Schatten auf dem Boden
        projectile.graphics.beginFill(0x000000, 0.3);
        projectile.graphics.drawEllipse(0, 0, projectile.size + 2, (projectile.size + 2) * 0.5);
        projectile.graphics.endFill();

        // Bombe
        projectile.graphics.beginFill(projectile.color);
        projectile.graphics.drawCircle(0, visualY, projectile.size);
        projectile.graphics.endFill();

        // Bombenzünder
        projectile.graphics.lineStyle(2, 0x7f8c8d);

        // Wackelnder Zünder
        const fuseTime = projectile.timeAlive * 0.02;
        const fuseWiggle = Math.sin(fuseTime * 6) * 2;
        const fuseLength = 6 + Math.sin(fuseTime) * 2;

        projectile.graphics.moveTo(0, visualY - projectile.size);
        projectile.graphics.bezierCurveTo(
            fuseWiggle, visualY - projectile.size - fuseLength * 0.5,
            -fuseWiggle, visualY - projectile.size - fuseLength * 0.7,
            fuseWiggle * 1.5, visualY - projectile.size - fuseLength
        );

        // Brennende Zünderspitze
        projectile.graphics.beginFill(0xFFA500);
        projectile.graphics.drawCircle(
            fuseWiggle * 1.5,
            visualY - projectile.size - fuseLength,
            2 + Math.random() * 0.5
        );
        projectile.graphics.endFill();
    }

    // Turmvorschau zeichnen (für die Platzierung)
    drawTowerPreview(x, y, type, canPlace) {
        // Bestehende Vorschau entfernen
        if (this.previewGraphics) {
            this.rangeCirclesContainer.removeChild(this.previewGraphics);
        }

        // Neue Vorschau erstellen
        this.previewGraphics = new PIXI.Graphics();

        if (!type) return;

        // Kachelzentrum abrufen
        const tileCenter = this.gameMap.getTileCenter(x, y);

        // Turmtyp abrufen
        const towerType = towerTypes[type];

        // Reichweitenkreis zeichnen
        this.previewGraphics.lineStyle(2, canPlace ? 0x00FF00 : 0xFF0000, 0.3);
        this.previewGraphics.drawCircle(tileCenter.x, tileCenter.y, towerType.range);

        // Turmplatzhalter zeichnen
        this.previewGraphics.beginFill(canPlace ? 0x00FF00 : 0xFF0000, 0.5);
        this.previewGraphics.drawCircle(tileCenter.x, tileCenter.y, 15);
        this.previewGraphics.endFill();

        // Zur Stage hinzufügen
        this.rangeCirclesContainer.addChild(this.previewGraphics);
    }

    // Reichweitenkreise für ausgewählte oder überfahrene Türme anzeigen
    updateRangeCircles() {
        // Bestehende Reichweitenkreise entfernen
        this.rangeCirclesContainer.removeChildren();

        // Für jeden Turm überprüfen, ob er ausgewählt oder überfahren ist
        for (const tower of this.towers) {
            if (tower.selected || tower.hover) {
                const rangeCircle = new PIXI.Graphics();
                rangeCircle.lineStyle(2, 0xFFFFFF, 0.4);
                rangeCircle.drawCircle(tower.x, tower.y, tower.range);
                this.rangeCirclesContainer.addChild(rangeCircle);
            }
        }

        // Turmvorschau wieder hinzufügen, falls vorhanden
        if (this.previewGraphics) {
            this.rangeCirclesContainer.addChild(this.previewGraphics);
        }
    }

    normalizeAngle(angle) {
        return (angle + Math.PI * 2) % (Math.PI * 2);
    }
}