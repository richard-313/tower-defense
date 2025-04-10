// towers.js

// Globale Hilfsfunktion drawStar (sollte in utils.js sein und vorher geladen werden)
// function drawStar(graphics, x, y, points, outerRadius, innerRadius, rotation = 0) { ... }

class TowerManager {
    constructor(app, gameMap) {
        this.app = app;
        this.gameMap = gameMap;
        this.towers = [];
        this.projectiles = []; // Behalten für andere Türme
        this.selectedTower = null;
        this.hoverTower = null;

        // Container für Türme und Projektile/Effekte
        this.towerContainer = new PIXI.Container();
        this.towerContainer.name = "towerContainer"; // Namen setzen für Index-Findung
        this.projectileContainer = new PIXI.Container();
        this.projectileContainer.name = "projectileContainer";
        this.rangeCirclesContainer = new PIXI.Container();
        this.effectsContainer = new PIXI.Container(); // Separater Container für Blitze

        // Zur Stage hinzufügen (Reihenfolge beachten: Effekte über Türmen)
        this.app.stage.addChild(this.rangeCirclesContainer);
        this.app.stage.addChild(this.towerContainer);
        this.app.stage.addChild(this.effectsContainer); // Effekt-Container
        this.app.stage.addChild(this.projectileContainer);

        // Vorschaubilder
        this.previewGraphics = null;
    }

    updateMap(gameMap) {
        this.gameMap = gameMap;
    }

    addTower(type, x, y) {
        const tileX = Math.floor(x / this.gameMap.tileSize);
        const tileY = Math.floor(y / this.gameMap.tileSize);

        // Prüfen, ob die Kachel innerhalb der Grenzen liegt und frei ist
        if (tileX < 0 || tileX >= this.gameMap.width || tileY < 0 || tileY >= this.gameMap.height) return false;
        if (this.gameMap.isTileOccupied(x, y)) {
            // console.log("Tile is occupied by path");
            return false;
        }
        if (this.towers.some(tower => Math.floor(tower.x / this.gameMap.tileSize) === tileX && Math.floor(tower.y / this.gameMap.tileSize) === tileY)) {
            // console.log("Tile is occupied by another tower");
            return false; // Hier steht bereits ein Turm
        }


        // Turm-Konfiguration abrufen
        const towerType = towerTypes[type];
        if (!towerType) {
            console.error(`Tower type "${type}" not found.`);
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
            level: 0, // Start bei Level 0 (Basis)
            upgrades: [], // Array für angewendete Upgrades
            angle: 0, // Richtung, in die der Turm zeigt
            animationState: 0, // Für interne Animationen
            sellValue: Math.floor(towerType.cost * towerType.sellFactor) // Anfänglicher Verkaufswert
        };

        // Spezifische Eigenschaften hinzufügen
        if (type === 'slow') {
            newTower.slowFactor = towerType.slowFactor;
            newTower.slowDuration = towerType.slowDuration;
        } else if (type === 'bomb') {
            newTower.splashRadius = towerType.splashRadius;
        } else if (type === 'lightning') {
            newTower.chainCount = towerType.chainCount;
            newTower.chainRange = towerType.chainRange;
            newTower.lastTarget = null; // Um zu vermeiden, dass immer derselbe zuerst getroffen wird
        }
        // Direkte Eigenschaften vom Typ übernehmen (falls im Hauptobjekt definiert)
        if (towerType.pierce) {
            newTower.pierce = towerType.pierce;
        }
        if (towerType.multishot) {
            newTower.multishot = towerType.multishot;
        }


        // Turm zeichnen
        this.drawTower(newTower);

        // Turm zum Container hinzufügen
        this.towerContainer.addChild(towerContainer);

        // Turm zum Array hinzufügen
        this.towers.push(newTower);

        // console.log(`Tower ${type} added at ${tileX}, ${tileY}`);
        return true;
    }


    removeTower(towerIndex) {
        if (towerIndex >= 0 && towerIndex < this.towers.length) {
            const tower = this.towers[towerIndex];
            const sellValue = tower.sellValue;

            // Grafiken entfernen
            // Sicherstellen, dass der Container noch existiert und nicht zerstört ist
            if (tower.container && !tower.container._destroyed) {
                if (tower.container.parent) {
                    this.towerContainer.removeChild(tower.container);
                }
                tower.container.destroy({ children: true }); // Container und seine Kinder zerstören
            }


            // Aus Array entfernen
            this.towers.splice(towerIndex, 1);

            // Selektion aufheben, falls dieser Turm ausgewählt war
            if (window.game && window.game.gameUI && window.game.gameUI.selectedTowerForUpgrade?.index === towerIndex) {
                window.game.gameUI.closeUpgradePanel(); // Panel schließen, wenn der ausgewählte Turm verkauft wird
            } else if (window.game && window.game.gameUI && window.game.gameUI.selectedTowerForUpgrade?.index > towerIndex) {
                window.game.gameUI.selectedTowerForUpgrade.index--; // Index anpassen, wenn ein vorheriger Turm entfernt wurde
            }


            // Reichweitenkreise aktualisieren (um den Kreis des entfernten Turms zu löschen)
            this.updateRangeCircles();

            return sellValue;
        }
        return 0;
    }

    getTowerAt(x, y, radius = 20) {
        // Klick auf Kachelmitte prüfen
        const tileX = Math.floor(x / this.gameMap.tileSize);
        const tileY = Math.floor(y / this.gameMap.tileSize);

        for (let i = 0; i < this.towers.length; i++) {
            const tower = this.towers[i];
            const towerTileX = Math.floor(tower.x / this.gameMap.tileSize);
            const towerTileY = Math.floor(tower.y / this.gameMap.tileSize);

            if (towerTileX === tileX && towerTileY === tileY) {
                // Zusätzlich Distanzprüfung, falls die Kachel groß ist
                const dx = tower.x - x;
                const dy = tower.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                // Toleranz etwas erhöht, da tileSize jetzt kleiner ist
                if (distance <= this.gameMap.tileSize / 2 + 5) {
                    return { tower, index: i };
                }
            }
        }
        return null; // Kein Turm auf dieser Kachel gefunden
    }


    // Upgrade-Funktion anpassen, um neue Eigenschaften zu übernehmen
    upgradeTower(towerIndex, targetLevel) {
        if (towerIndex < 0 || towerIndex >= this.towers.length) {
            return { success: false, cost: 0 };
        }

        const tower = this.towers[towerIndex];
        const towerType = towerTypes[tower.type];
        const maxLevel = towerType.upgrades.length; // Max Level ist Anzahl Upgrades

        // Prüfen, ob das nächste Level gültig ist (immer nur +1)
        const nextLevelIndex = tower.level; // Index des Upgrades für das nächste Level
        if (!towerType || tower.level >= maxLevel || targetLevel !== tower.level + 1) {
            console.warn("Ungültiges Upgrade-Ziel oder bereits Max Level erreicht.");
            return { success: false, cost: 0 };
        }

        const upgradeData = towerType.upgrades[nextLevelIndex];
        const cost = upgradeData.cost;


        // Upgrade anwenden
        tower.upgrades.push(upgradeData);

        // Turmeigenschaften aktualisieren
        for (const [key, value] of Object.entries(upgradeData)) {
            if (key !== 'name' && key !== 'cost' && key !== 'description') {
                // Spezielle Behandlung für Multiplikatoren
                if (key.endsWith('Multiplier')) {
                    const baseKey = key.replace('Multiplier', '');
                    if (tower[baseKey] !== undefined) { // Sicherstellen, dass die Basiseigenschaft existiert
                        tower[baseKey] *= value;
                    }
                } else {
                    tower[key] = value;
                }
            }
        }

        tower.level++; // Level erhöhen

        // Verkaufswert aktualisieren (Basiswert + alle Upgradekosten * Faktor)
        tower.sellValue = Math.floor(towerType.cost * towerType.sellFactor);
        tower.upgrades.forEach(up => {
            tower.sellValue += Math.floor(up.cost * towerType.sellFactor);
        });

        this.drawTower(tower); // Neu zeichnen mit Upgrades
        return { success: true, cost: cost }; // Kosten des gerade durchgeführten Upgrades zurückgeben
    }


    getUpgradeCost(tower, targetLevel) {
        const towerType = towerTypes[tower.type];

        // Berechnet die Kosten für das *nächste* Level
        const nextLevelIndex = tower.level;
        if (!towerType || nextLevelIndex >= towerType.upgrades.length) {
            return 0; // Kein weiteres Upgrade möglich
        }

        return towerType.upgrades[nextLevelIndex].cost;
    }

    update(enemies, deltaTime) {
        const currentTime = Date.now();

        // --- Türme aktualisieren ---
        for (const tower of this.towers) {
            if (!tower || !tower.container || tower.container._destroyed) continue; // Überspringen, falls Turm entfernt wurde

            tower.animationState += deltaTime * 0.001;

            // --- Ziel Finden ---
            let potentialTargets = enemies.filter(enemy => {
                // Sicherstellen, dass Feind gültig ist
                if (!enemy || !enemy.sprite || enemy.sprite._destroyed || enemy.health <= 0) return false;
                const dx = tower.x - enemy.x;
                const dy = tower.y - enemy.y;
                return Math.sqrt(dx * dx + dy * dy) <= tower.range;
            });

            // Einfachstes Targeting: nächster Gegner zum Turm
            let closestEnemy = null;
            let closestDistance = Infinity;
            potentialTargets.forEach(enemy => {
                const dx = tower.x - enemy.x;
                const dy = tower.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            });

            tower.target = closestEnemy; // Kann null sein, wenn kein Ziel in Reichweite

            // --- Turm Ausrichtung ---
            if (tower.target && tower.type !== 'lightning' && tower.type !== 'slow') {
                const targetAngle = Math.atan2(tower.target.y - tower.y, tower.target.x - tower.x);
                const angleDiff = this.normalizeAngle(targetAngle - tower.angle);
                const rotationSpeed = 10 * deltaTime * 0.001; // Radian pro Sekunde

                if (Math.abs(angleDiff) > 0.05) {
                    const rotationDirection = angleDiff > Math.PI ? -1 : (angleDiff < -Math.PI ? 1 : (angleDiff > 0 ? 1 : -1));
                    const rotationAmount = Math.min(rotationSpeed, Math.abs(angleDiff > Math.PI ? angleDiff - Math.PI * 2 : (angleDiff < -Math.PI ? angleDiff + Math.PI * 2 : angleDiff)));
                    tower.angle += rotationDirection * rotationAmount;
                    tower.angle = this.normalizeAngle(tower.angle);
                    this.drawTower(tower);
                }
            } else if (tower.type === 'lightning' || tower.type === 'slow') {
                // Animation für statische Türme
                this.drawTower(tower);
            }


            // --- Feuern ---
            if (currentTime - tower.lastShot >= tower.fireRate && tower.target) { // Nur feuern, wenn Ziel vorhanden
                tower.lastShot = currentTime;

                if (tower.type === 'lightning') {
                    this.fireLightning(tower, tower.target, enemies);
                } else {
                    const shotsCount = tower.multishot || 1;
                    const angleStep = shotsCount > 1 ? 0.2 : 0;

                    for (let i = 0; i < shotsCount; i++) {
                        const angleOffset = (i - (shotsCount - 1) / 2) * angleStep;
                        const finalAngle = tower.angle + angleOffset;
                        let targetX = tower.target.x;
                        let targetY = tower.target.y;
                        this.createProjectile(tower, targetX, targetY, tower.target, finalAngle);
                    }
                }
            }
        }

        // --- Projektile aktualisieren ---
        // Rückwärts iterieren, um Elemente sicher entfernen zu können
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];

            // Sicherheitscheck: Überspringen, falls Projektil bereits entfernt/ungültig
            if (!projectile || !projectile.graphics || projectile.graphics._destroyed) {
                // Wenn es noch im Array ist, aber zerstört, dann entfernen
                if (projectile && this.projectiles[i] === projectile) { // Zusätzlicher Check
                    this.projectiles.splice(i, 1);
                }
                continue;
            }

            let removed = false;

            // Bewegung aktualisieren
            if (projectile.type === 'bomb') {
                this.updateBombProjectile(projectile, deltaTime);
                if (projectile.flightProgress >= 1) {
                    this.createExplosion(projectile, enemies);
                    this.removeProjectile(i); // Entfernt aus Array und zerstört Grafik
                    removed = true;
                }
            } else {
                this.updateStandardProjectile(projectile, deltaTime);
            }

            if (removed) continue; // Nächstes Projektil

            // Außerhalb der Grenzen prüfen
            if (
                projectile.x < -50 || projectile.x > this.gameMap.width * this.gameMap.tileSize + 50 ||
                projectile.y < -50 || projectile.y > this.gameMap.height * this.gameMap.tileSize + 50
            ) {
                this.removeProjectile(i);
                continue;
            }

            // Kollisionen prüfen (gibt true zurück, wenn entfernt)
            if (this.checkProjectileCollisions(projectile, enemies, i)) {
                // Projektil wurde bereits entfernt in checkProjectileCollisions
                continue;
            }
        }
    }

    createProjectile(tower, targetX, targetY, targetEnemy, angle) {
        const projectileGraphics = new PIXI.Graphics();
        // Projektile zum Projektilcontainer hinzufügen
        this.projectileContainer.addChild(projectileGraphics);

        const baseProjectile = {
            x: tower.x,
            y: tower.y,
            sourceX: tower.x,
            sourceY: tower.y,
            targetX: targetX, // Initiale Zielposition (wird ggf. aktualisiert)
            targetY: targetY,
            startX: tower.x,  // Für Bomben-Parabel
            startY: tower.y,
            target: targetEnemy, // Referenz auf das Ziel (kann sich bewegen)
            damage: tower.damage,
            speed: tower.projectileSpeed,
            size: tower.projectileSize,
            color: tower.projectileColor,
            type: tower.type, // Turmtyp (wichtig für spezifisches Verhalten/Zeichnung)
            effect: tower.effect, // Z.B. 'slow', 'splash', 'pierce'
            angle: angle, // Tatsächlicher Startwinkel (wichtig für Multishot)
            timeAlive: 0,
            graphics: projectileGraphics,
            // Spezifische Eigenschaften basierend auf Turm/Effekt:
            slowFactor: (tower.effect === 'slow' || tower.type === 'slow') ? tower.slowFactor : undefined,
            slowDuration: (tower.effect === 'slow' || tower.type === 'slow') ? tower.slowDuration : undefined,
            splashRadius: (tower.effect === 'splash' || tower.type === 'bomb') ? tower.splashRadius : undefined,
            pierce: tower.pierce > 0 ? tower.pierce : 0, // Verbleibende Durchdringungen
            hitEnemies: tower.pierce > 0 ? [] : null, // IDs der getroffenen Feinde (nur für Pierce)
            // Bombenspezifisch:
            flightHeight: 0,
            maxHeight: tower.type === 'bomb' ? (50 + Math.random() * 20) : 0,
            flightProgress: 0,
            flightDuration: tower.type === 'bomb' ? this.calculateFlightDuration(tower.x, tower.y, targetX, targetY, tower.projectileSpeed) : 0,
            visualY: tower.y // Für Bomben-Grafik
        };

        // Bombe zielt auf festen Punkt, nicht auf bewegliches Ziel
        if (tower.type === 'bomb') {
            baseProjectile.target = null;
        }

        // Position und Zeichnung initialisieren
        projectileGraphics.x = baseProjectile.x;
        projectileGraphics.y = baseProjectile.y;
        this.drawProjectile(baseProjectile); // Projektil initial zeichnen

        this.projectiles.push(baseProjectile);
    }


    fireLightning(tower, initialTarget, allEnemies) {
        let currentTarget = initialTarget;
        // Sicherstellen, dass initialTarget gültig ist
        if (!currentTarget || currentTarget.health <= 0 || !currentTarget.sprite || currentTarget.sprite._destroyed) {
            return; // Kein gültiges erstes Ziel
        }

        const hitEnemies = [currentTarget];
        const chainPositions = [{ x: tower.x, y: tower.y }];

        for (let i = 0; i < tower.chainCount && currentTarget; i++) {
            if (i > 0) {
                chainPositions.push({ x: currentTarget.x, y: currentTarget.y });
            }

            let nextTarget = null;
            let minDistance = tower.chainRange;

            allEnemies.forEach(enemy => {
                // Prüfen ob Feind gültig ist, noch nicht getroffen wurde und in Reichweite (beide)
                if (enemy && enemy.health > 0 && !enemy.sprite._destroyed && !hitEnemies.includes(enemy)) {
                    const dx = currentTarget.x - enemy.x;
                    const dy = currentTarget.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    const dxTower = tower.x - enemy.x;
                    const dyTower = tower.y - enemy.y;
                    const distTower = Math.sqrt(dxTower * dxTower + dyTower * dyTower);

                    if (distance <= minDistance && distTower <= tower.range) {
                        minDistance = distance;
                        nextTarget = enemy;
                    }
                }
            });

            if (nextTarget) {
                hitEnemies.push(nextTarget);
                currentTarget = nextTarget;
            } else {
                if (currentTarget) { // Nur hinzufügen, wenn es ein Ziel gab
                    chainPositions.push({ x: currentTarget.x, y: currentTarget.y });
                }
                break;
            }
        }

        // Wenn kein Sprung stattfand, aber ein gültiges Ziel da war
        if (chainPositions.length === 1 && currentTarget) {
            chainPositions.push({ x: currentTarget.x, y: currentTarget.y });
        }

        // Schaden anwenden
        hitEnemies.forEach(enemy => {
            // Erneute Prüfung, da Feind inzwischen gestorben sein könnte
            if (enemy && enemy.health > 0 && !enemy.sprite._destroyed) {
                enemy.health -= tower.damage;
            }
        });

        // Visuellen Effekt zeichnen
        this.drawLightningEffect(tower, chainPositions);
        tower.lastTarget = currentTarget; // Für Varianz
    }

    drawLightningEffect(tower, positions) {
        if (positions.length < 2) return;

        const lightning = new PIXI.Graphics();
        const boltColor = tower.projectileColor || 0xFFFFFF;
        const glowColor = 0xFFFF00;

        lightning.lineStyle(6 + tower.level, glowColor, 0.3);
        this.drawLightningSegment(lightning, positions);
        lightning.lineStyle(2 + tower.level, boltColor, 0.9);
        this.drawLightningSegment(lightning, positions);

        this.effectsContainer.addChild(lightning);

        let duration = 0;
        const maxDuration = 150; // ms
        const fadeOut = (delta) => {
            // Check: wurde lightning schon zerstört?
            if (!lightning || lightning._destroyed) {
                if (this.app?.ticker) this.app.ticker.remove(fadeOut); // Sicher ticker entfernen
                return;
            }

            duration += this.app.ticker.deltaMS;
            const alpha = Math.max(0, 1 - (duration / maxDuration));
            lightning.alpha = alpha;

            if (alpha <= 0) {
                // Robusteres Entfernen
                if (lightning.parent) {
                    this.effectsContainer.removeChild(lightning);
                }
                lightning.destroy(); // Immer zerstören
                if (this.app?.ticker) this.app.ticker.remove(fadeOut);
            }
        };
        if (this.app?.ticker) this.app.ticker.add(fadeOut); // Sicherstellen, dass Ticker existiert
    }

    drawLightningSegment(graphics, positions) {
        if (!positions || positions.length < 2) return;
        graphics.moveTo(positions[0].x, positions[0].y);
        for (let i = 1; i < positions.length; i++) {
            const start = positions[i - 1];
            const end = positions[i];
            if (!start || !end || typeof start.x !== 'number' || typeof end.x !== 'number') continue;
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 1) continue;
            const segmentCount = Math.max(3, Math.floor(distance / 15));
            const normalX = -dy / distance;
            const normalY = dx / distance;
            let currentDrawX = start.x;
            let currentDrawY = start.y;
            graphics.moveTo(currentDrawX, currentDrawY);
            for (let j = 1; j <= segmentCount; j++) {
                const progress = j / segmentCount;
                const targetX = start.x + dx * progress;
                const targetY = start.y + dy * progress;
                const deviationStrength = 10 * Math.sin(progress * Math.PI);
                const offsetX = normalX * (Math.random() - 0.5) * deviationStrength;
                const offsetY = normalY * (Math.random() - 0.5) * deviationStrength;
                graphics.lineTo(targetX + offsetX, targetY + offsetY);
            }
            graphics.lineTo(end.x, end.y);
        }
    }

    removeProjectile(index) {
        if (index >= 0 && index < this.projectiles.length) {
            const projectile = this.projectiles[index];
            if (projectile) { // Prüfen, ob das Objekt im Array überhaupt existiert
                // Grafiken zerstören, falls vorhanden und noch nicht zerstört
                if (projectile.graphics && !projectile.graphics._destroyed) {
                    if (projectile.graphics.parent) {
                        // Versuche sicher zu entfernen
                        try {
                            if (this.projectileContainer && this.projectileContainer.removeChild) {
                                this.projectileContainer.removeChild(projectile.graphics);
                            }
                        } catch (e) {
                            console.warn("Fehler beim Entfernen der Projektilgrafik:", e);
                        }
                    }
                    projectile.graphics.destroy(); // Zerstöre die Grafik auf jeden Fall
                }
                // Aus dem Array entfernen - NUR wenn es das erwartete Objekt ist
                if (this.projectiles[index] === projectile) {
                    this.projectiles.splice(index, 1);
                }
            }
        } else {
            // console.warn(`Versuch, Projektil mit ungültigem Index ${index} zu entfernen.`);
        }
    }

    calculateFlightDuration(startX, startY, targetX, targetY, speed) {
        if (speed <= 0) return Infinity;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Annahme: speed ist in pixel pro 1/60 Sekunde
        return (distance / (speed * 60)) * 1000; // Ergebnis in ms
    }

    updateStandardProjectile(projectile, deltaTime) {
        // Prüfen ob Grafik existiert und gültig ist
        if (!projectile.graphics || projectile.graphics._destroyed) return;

        // Ziel verfolgen, falls es noch existiert und im Spiel ist
        let targetStillValid = projectile.target && projectile.target.health > 0 && projectile.target.sprite && !projectile.target.sprite._destroyed;
        if (targetStillValid) {
            projectile.targetX = projectile.target.x;
            projectile.targetY = projectile.target.y;
        }
        // Wenn Ziel ungültig, fliegt es zur letzten bekannten Position weiter

        const dx = projectile.targetX - projectile.x;
        const dy = projectile.targetY - projectile.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Skalierte Geschwindigkeit für diesen Frame
        const speed = projectile.speed * deltaTime * 0.06; // Annahme: 60 FPS Basis für speed-Wert

        if (distance <= speed) {
            // Ziel fast erreicht oder überschritten
            projectile.x = projectile.targetX;
            projectile.y = projectile.targetY;
            // Kollision wird in checkProjectileCollisions geprüft
        } else {
            // Bewegen
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            projectile.x += normalizedDx * speed;
            projectile.y += normalizedDy * speed;
        }

        // Winkel für Grafik aktualisieren
        projectile.angle = Math.atan2(dy, dx);

        // Grafikposition aktualisieren
        projectile.graphics.x = projectile.x;
        projectile.graphics.y = projectile.y;
        this.drawProjectile(projectile); // Neuzeichnen für Effekte etc.


        projectile.timeAlive += deltaTime;
    }


    updateBombProjectile(projectile, deltaTime) {
        // Prüfen ob Grafik existiert und gültig ist
        if (!projectile.graphics || projectile.graphics._destroyed) return;

        projectile.timeAlive += deltaTime;
        const flightDurationMs = projectile.flightDuration || 1000; // Fallback
        const progress = Math.min(projectile.timeAlive / flightDurationMs, 1);

        projectile.flightProgress = progress;

        // Lineare Interpolation für x/y
        projectile.x = projectile.startX + (projectile.targetX - projectile.startX) * progress;
        projectile.y = projectile.startY + (projectile.targetY - projectile.startY) * progress;

        // Parabolische Höhe
        projectile.flightHeight = projectile.maxHeight * (4 * progress * (1 - progress));
        projectile.visualY = projectile.y - projectile.flightHeight; // Y-Position für die Grafik

        // Grafik aktualisieren
        projectile.graphics.x = projectile.x;
        projectile.graphics.y = projectile.visualY; // Visuelle Position verwenden
        this.drawProjectile(projectile); // Neuzeichnen für Bogen
    }

    createExplosion(projectile, enemies) {
        const explosion = new PIXI.Graphics();
        if (typeof projectile.x !== 'number' || typeof projectile.y !== 'number') return;
        explosion.x = projectile.x;
        explosion.y = projectile.y; // Explosion am Boden (nicht visualY)
        this.effectsContainer.addChild(explosion);

        let radius = 0;
        let alpha = 1;
        const maxRadius = projectile.splashRadius;
        const duration = 300; // ms
        let elapsed = 0;

        const animateExplosion = (delta) => {
            // Check: wurde explosion schon zerstört?
            if (!explosion || explosion._destroyed) {
                if (this.app?.ticker) this.app.ticker.remove(animateExplosion);
                return;
            }

            elapsed += this.app.ticker.deltaMS;
            const progress = Math.min(elapsed / duration, 1);

            radius = maxRadius * progress;
            alpha = 1 - progress * progress;

            explosion.clear();
            explosion.beginFill(0xFF8800, 0.8 * alpha);
            explosion.drawCircle(0, 0, radius * 0.5);
            explosion.endFill();
            explosion.beginFill(0xFF3300, 0.4 * alpha);
            explosion.drawCircle(0, 0, radius);
            explosion.endFill();

            if (progress >= 1) {
                // Robusteres Entfernen
                if (explosion.parent) {
                    this.effectsContainer.removeChild(explosion);
                }
                explosion.destroy(); // Immer zerstören
                if (this.app?.ticker) this.app.ticker.remove(animateExplosion);
            }
        };

        this.applySplashDamage(enemies, projectile.x, projectile.y, projectile.splashRadius, projectile.damage);
        if (this.app?.ticker) this.app.ticker.add(animateExplosion);
    }

    checkProjectileCollisions(projectile, enemies, projectileIndex) {
        if (projectile.type === 'bomb') return false; // Bomben explodieren am Zielpunkt, keine Kollision während des Flugs

        let projectileRemoved = false;
        for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];
            // Zusätzliche Prüfung: Ist der Feind überhaupt noch gültig/im Spiel?
            if (!enemy || enemy.health <= 0 || !enemy.sprite || enemy.sprite._destroyed) continue;

            // Überspringen, wenn dieser Feind von diesem Pierce-Projektil schon getroffen wurde
            if (projectile.pierce > 0 && projectile.hitEnemies && projectile.hitEnemies.includes(enemy.id)) {
                continue;
            }

            // Kollisionserkennung (Distanz zwischen Mittelpunkten)
            const dx = enemy.x - projectile.x;
            const dy = enemy.y - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const hitRadius = (projectile.size || 4) + enemy.size; // Standardgröße für Projektil falls nicht definiert

            if (distance < hitRadius) {
                // Treffer!
                enemy.health -= projectile.damage;

                // Slow-Effekt anwenden
                if (projectile.effect === 'slow' && window.game && window.game.enemyManager) {
                    window.game.enemyManager.applyEffect(enemy, 'slow', projectile.slowDuration, projectile.slowFactor);
                }

                // Pierce-Logik
                if (projectile.pierce > 0) {
                    if (!projectile.hitEnemies) projectile.hitEnemies = [];
                    projectile.hitEnemies.push(enemy.id); // Feind-ID merken
                    projectile.pierce--; // Verbleibende Durchdringungen reduzieren

                    if (projectile.pierce <= 0) {
                        // Letzte Durchdringung verbraucht -> Projektil entfernen
                        this.removeProjectile(projectileIndex);
                        projectileRemoved = true;
                        break; // Kollisionsschleife für dieses Projektil beenden
                    }
                    // Projektil fliegt weiter, nächsten Feind prüfen
                } else {
                    // Kein Pierce: Projektil entfernen
                    this.removeProjectile(projectileIndex);
                    projectileRemoved = true;
                    break; // Kollisionsschleife für dieses Projektil beenden
                }
            }
        }
        return projectileRemoved; // Gibt true zurück, wenn das Projektil in dieser Funktion entfernt wurde
    }

    applySplashDamage(enemies, centerX, centerY, radius, baseDamage) {
        enemies.forEach(enemy => {
            // Prüfen ob Feind gültig
            if (!enemy || enemy.health <= 0 || !enemy.sprite || enemy.sprite._destroyed) return;

            const dx = enemy.x - centerX;
            const dy = enemy.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= radius) {
                // Schaden nimmt mit Entfernung ab (optional)
                const damageMultiplier = Math.max(0.1, 1 - (distance / radius)); // Linear von 100% zu 10%
                const damage = baseDamage * damageMultiplier;
                enemy.health -= damage;
            }
        });
    }

    // --- Zeichnen ---

    drawTower(tower) {
        if (!tower.graphics || tower.graphics._destroyed) {
            // console.error("Tower graphics missing or destroyed for", tower);
            return;
        }
        tower.graphics.clear();

        // Basisgröße (an TileSize angepasst)
        const baseSize = this.gameMap.tileSize * 0.4; // Ca. 12.8 bei tileSize 32

        switch (tower.type) {
            case 'basic': this.drawBasicTower(tower, baseSize); break;
            case 'sniper': this.drawSniperTower(tower, baseSize); break;
            case 'slow': this.drawSlowTower(tower, baseSize); break;
            case 'bomb': this.drawBombTower(tower, baseSize); break;
            case 'lightning': this.drawLightningTower(tower, baseSize); break;
            default: this.drawDefaultTower(tower, baseSize);
        }
        this.drawTowerLevelIndicators(tower, baseSize);
    }

    drawLightningTower(tower, baseSize = 12) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        const time = tower.animationState * 4;
        tower.graphics.beginFill(0x566573);
        tower.graphics.drawCircle(0, 0, baseSize * 1.1);
        tower.graphics.endFill();
        tower.graphics.beginFill(0xEAECEE);
        tower.graphics.drawCircle(0, 0, baseSize * 0.8);
        tower.graphics.endFill();
        const corePulse = baseSize * 0.4 + Math.sin(time) * (baseSize * 0.1);
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawCircle(0, 0, corePulse);
        tower.graphics.endFill();
        tower.graphics.beginFill(tower.color, 0.3);
        tower.graphics.drawCircle(0, 0, corePulse + baseSize * 0.2 + Math.sin(time + 1) * (baseSize * 0.1));
        tower.graphics.endFill();
        const spikes = 3 + tower.level;
        const spikeLength = baseSize * 1.2 + tower.level * (baseSize * 0.1);
        tower.graphics.lineStyle(baseSize * 0.2, 0xABB2B9);
        for (let i = 0; i < spikes; i++) {
            const angle = (i * Math.PI * 2 / spikes) + time * 0.5;
            const startRadius = baseSize * 0.7;
            tower.graphics.moveTo(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);
            tower.graphics.lineTo(Math.cos(angle) * spikeLength, Math.sin(angle) * spikeLength);
            tower.graphics.beginFill(0x566573);
            tower.graphics.drawCircle(Math.cos(angle) * spikeLength, Math.sin(angle) * spikeLength, baseSize * 0.2);
            tower.graphics.endFill();
            tower.graphics.beginFill(tower.color, 0.7);
            tower.graphics.drawCircle(Math.cos(angle) * spikeLength, Math.sin(angle) * spikeLength, baseSize * 0.1 + Math.sin(time * 3 + i) * (baseSize * 0.05));
            tower.graphics.endFill();
        }
        if (tower.target && Math.random() > 0.7) {
            tower.graphics.lineStyle(1 + Math.random(), 0xFFFFFF, 0.8);
            const sparkAngle = Math.random() * Math.PI * 2;
            const sparkStartRadius = corePulse + baseSize * 0.1;
            const sparkEndRadius = sparkStartRadius + baseSize * 0.3 + Math.random() * (baseSize * 0.3);
            tower.graphics.moveTo(Math.cos(sparkAngle) * sparkStartRadius, Math.sin(sparkAngle) * sparkStartRadius);
            tower.graphics.lineTo(Math.cos(sparkAngle) * sparkEndRadius, Math.sin(sparkAngle) * sparkEndRadius);
        }
        tower.graphics.lineStyle(0);
    }

    drawBasicTower(tower, baseSize = 12) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawCircle(0, 0, baseSize);
        tower.graphics.endFill();
        tower.graphics.beginFill(0x2980b9);
        tower.graphics.drawCircle(0, 0, baseSize * 0.7);
        tower.graphics.endFill();
        const shots = tower.multishot || 1;
        const barrelBaseOffset = baseSize * 0.3;
        const barrelLength = baseSize * 1.3;
        if (shots === 2) {
            this.drawTowerBarrel(tower, tower.angle, -barrelBaseOffset, barrelLength);
            this.drawTowerBarrel(tower, tower.angle, barrelBaseOffset, barrelLength);
        } else if (shots === 3) {
            this.drawTowerBarrel(tower, tower.angle, -barrelBaseOffset * 1.5, barrelLength * 1.1);
            this.drawTowerBarrel(tower, tower.angle, 0, barrelLength * 1.2);
            this.drawTowerBarrel(tower, tower.angle, barrelBaseOffset * 1.5, barrelLength * 1.1);
        } else {
            this.drawTowerBarrel(tower, tower.angle, 0, barrelLength);
        }
    }

    drawSniperTower(tower, baseSize = 12) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawCircle(0, 0, baseSize);
        tower.graphics.endFill();
        tower.graphics.beginFill(0xc0392b);
        tower.graphics.drawCircle(0, 0, baseSize * 0.7);
        tower.graphics.endFill();
        const barrelLength = baseSize * 1.8 + tower.level * (baseSize * 0.3);
        const barrelWidth = baseSize * 0.3;
        tower.graphics.lineStyle(barrelWidth, 0x333333);
        tower.graphics.moveTo(0, 0);
        tower.graphics.lineTo(Math.cos(tower.angle) * barrelLength, Math.sin(tower.angle) * barrelLength);
        tower.graphics.lineStyle(0);
        if (tower.level === 3 && tower.pierce) {
            tower.graphics.beginFill(0x444444);
            tower.graphics.drawRect(
                Math.cos(tower.angle) * (barrelLength * 0.3) - (baseSize * 0.15),
                Math.sin(tower.angle) * (barrelLength * 0.3) - (baseSize * 0.15),
                baseSize * 0.5, baseSize * 0.3
            );
            tower.graphics.endFill();
            if (tower.target) {
                tower.graphics.lineStyle(1, 0xFF0000, 0.4);
                tower.graphics.moveTo(Math.cos(tower.angle) * barrelLength, Math.sin(tower.angle) * barrelLength);
                const targetDx = tower.target.x - tower.x;
                const targetDy = tower.target.y - tower.y;
                const targetDist = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
                const laserRange = Math.min(targetDist, tower.range);
                const laserEndX = tower.x + (targetDx / targetDist) * laserRange;
                const laserEndY = tower.y + (targetDy / targetDist) * laserRange;
                tower.graphics.lineTo(laserEndX - tower.x, laserEndY - tower.y);
                tower.graphics.beginFill(0xFF0000, 0.8);
                tower.graphics.drawCircle(laserEndX - tower.x, laserEndY - tower.y, baseSize * 0.1);
                tower.graphics.endFill();
            }
        }
        tower.graphics.lineStyle(0);
    }

    drawSlowTower(tower, baseSize = 12) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        const frostColor = tower.level >= 3 ? 0xa5f3fc : 0x1abc9c;
        const time = tower.animationState * 3;
        const pulsateRadius = baseSize * 0.8 + Math.sin(time) * (baseSize * 0.15);
        tower.graphics.beginFill(frostColor, 0.2);
        tower.graphics.drawCircle(0, 0, pulsateRadius + baseSize * 0.5);
        tower.graphics.endFill();
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawPolygon([-baseSize * 0.9, -baseSize * 0.5, baseSize * 0.9, -baseSize * 0.5, baseSize, baseSize * 0.5, 0, baseSize, -baseSize, baseSize * 0.5, -baseSize * 0.9, -baseSize * 0.5]);
        tower.graphics.endFill();
        tower.graphics.lineStyle(baseSize * 0.15, frostColor);
        const spikes = 3 + tower.level;
        for (let i = 0; i < spikes; i++) {
            const spikeAngle = -Math.PI / 2 + (i * Math.PI * 2 / spikes) + time * 0.1;
            const spikeLength = baseSize * 0.7 + tower.level * (baseSize * 0.1);
            tower.graphics.moveTo(0, 0);
            tower.graphics.lineTo(Math.cos(spikeAngle) * spikeLength, Math.sin(spikeAngle) * spikeLength);
        }
        tower.graphics.beginFill(0xFFFFFF, 0.7);
        for (let i = 0; i < 5; i++) {
            const particleAngle = time * 0.5 + (i * Math.PI * 2 / 5);
            const dist = baseSize + Math.sin(time + i);
            tower.graphics.drawCircle(Math.cos(particleAngle) * dist, Math.sin(particleAngle) * dist, baseSize * 0.1 + Math.random() * (baseSize * 0.05));
        }
        tower.graphics.endFill();
        tower.graphics.lineStyle(0);
    }

    drawBombTower(tower, baseSize = 12) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        tower.graphics.beginFill(0x784212);
        tower.graphics.drawCircle(0, 0, baseSize * 1.1);
        tower.graphics.endFill();
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawCircle(0, 0, baseSize);
        tower.graphics.endFill();
        tower.graphics.lineStyle(baseSize * 0.2, 0x566573);
        tower.graphics.drawCircle(0, 0, baseSize * 0.9);
        tower.graphics.drawCircle(0, 0, baseSize * 0.6);
        tower.graphics.lineStyle(0);
        tower.graphics.lineStyle(baseSize * 0.5, 0x34495E);
        const mortarAngle = -Math.PI / 3;
        const barrelLength = baseSize * 0.8 + tower.level * (baseSize * 0.1);
        const barrelStartX = Math.cos(mortarAngle + Math.PI / 2) * (baseSize * 0.1);
        const barrelStartY = -baseSize * 0.3 + Math.sin(mortarAngle + Math.PI / 2) * (baseSize * 0.1);
        tower.graphics.moveTo(barrelStartX, barrelStartY);
        tower.graphics.lineTo(barrelStartX + Math.cos(mortarAngle) * barrelLength, barrelStartY + Math.sin(mortarAngle) * barrelLength);
        tower.graphics.lineStyle(0);
        if (Date.now() - tower.lastShot < 100) {
            tower.graphics.beginFill(0xFFFFFF, 0.5);
            const smokeOriginX = barrelStartX + Math.cos(mortarAngle) * barrelLength;
            const smokeOriginY = barrelStartY + Math.sin(mortarAngle) * barrelLength;
            for (let i = 0; i < 3; ++i) {
                tower.graphics.drawCircle(smokeOriginX + (Math.random() - 0.5) * (baseSize * 0.5), smokeOriginY + (Math.random() - 0.5) * (baseSize * 0.5), baseSize * 0.1 + Math.random() * (baseSize * 0.15));
            }
            tower.graphics.endFill();
        }
    }

    drawDefaultTower(tower, baseSize = 12) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawCircle(0, 0, baseSize);
        tower.graphics.endFill();
        this.drawTowerBarrel(tower, tower.angle, 0, baseSize * 1.2);
    }

    drawTowerBarrel(tower, angle, offset, length = 18) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        const barrelWidth = this.gameMap.tileSize * 0.12;
        length = length || this.gameMap.tileSize * 0.5;
        offset = offset || 0;
        const perpX = Math.cos(angle + Math.PI / 2) * offset;
        const perpY = Math.sin(angle + Math.PI / 2) * offset;
        const startX = perpX;
        const startY = perpY;
        const barrelLength = length + tower.level * (this.gameMap.tileSize * 0.05);
        tower.graphics.lineStyle(barrelWidth, 0x333333);
        tower.graphics.moveTo(startX, startY);
        tower.graphics.lineTo(startX + Math.cos(angle) * barrelLength, startY + Math.sin(angle) * barrelLength);
        tower.graphics.lineStyle(0);
    }

    drawTowerLevelIndicators(tower, baseSize = 12) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        if (tower.level > 0) {
            tower.graphics.beginFill(0xFFD700);
            tower.graphics.lineStyle(1, 0xDAA520);
            const starSize = baseSize * 0.3;
            const radius = baseSize + starSize * 0.8;
            for (let i = 0; i < tower.level; i++) {
                const angle = -Math.PI / 2 + (i - (tower.level - 1) / 2) * 0.6;
                const starX = Math.cos(angle) * radius;
                const starY = Math.sin(angle) * radius;
                // Globale Funktion drawStar verwenden
                if (typeof drawStar === 'function') {
                    drawStar(tower.graphics, starX, starY, 5, starSize, starSize * 0.5, 0);
                } else {
                    console.warn("drawStar function not found!");
                    // Fallback: Einfacher Kreis als Indikator
                    tower.graphics.drawCircle(starX, starY, starSize * 0.6);
                }
            }
            tower.graphics.lineStyle(0);
            tower.graphics.endFill();
        }
    }

    drawProjectile(projectile) {
        if (!projectile.graphics || projectile.graphics._destroyed) return;
        projectile.graphics.clear();
        switch (projectile.type) {
            case 'bomb': this.drawBombProjectile(projectile); break;
            case 'slow': this.drawSlowProjectile(projectile); break;
            case 'sniper':
                if (projectile.pierce > 0) this.drawPiercingProjectile(projectile);
                else this.drawStandardProjectile(projectile);
                break;
            case 'lightning': break; // Blitze haben keine dauerhaften Projektile
            default: this.drawStandardProjectile(projectile);
        }
    }

    drawStandardProjectile(projectile) {
        if (!projectile.graphics || projectile.graphics._destroyed) return;
        const size = projectile.size || 4;
        projectile.graphics.beginFill(projectile.color);
        projectile.graphics.drawCircle(0, 0, size);
        projectile.graphics.endFill();
        projectile.graphics.lineStyle(size * 0.8, projectile.color, 0.4);
        projectile.graphics.moveTo(-Math.cos(projectile.angle) * size * 1.5, -Math.sin(projectile.angle) * size * 1.5);
        projectile.graphics.lineTo(0, 0);
        projectile.graphics.lineStyle(0);
    }

    drawPiercingProjectile(projectile) {
        if (!projectile.graphics || projectile.graphics._destroyed) return;
        const size = projectile.size || 3;
        const angle = projectile.angle;
        const beamLength = 15 + (projectile.hitEnemies?.length || 0) * 2;
        projectile.graphics.lineStyle(size, projectile.color, 0.9);
        projectile.graphics.moveTo(-Math.cos(angle) * beamLength * 0.5, -Math.sin(angle) * beamLength * 0.5);
        projectile.graphics.lineTo(Math.cos(angle) * beamLength * 0.5, Math.sin(angle) * beamLength * 0.5);
        projectile.graphics.lineStyle(size * 2.5, projectile.color, 0.2);
        projectile.graphics.moveTo(-Math.cos(angle) * beamLength * 0.4, -Math.sin(angle) * beamLength * 0.4);
        projectile.graphics.lineTo(Math.cos(angle) * beamLength * 0.4, Math.sin(angle) * beamLength * 0.4);
        projectile.graphics.lineStyle(0);
        projectile.graphics.beginFill(0xFFFFFF, 0.8);
        const tipX = Math.cos(angle) * beamLength * 0.5;
        const tipY = Math.sin(angle) * beamLength * 0.5;
        for (let i = 0; i < 3; i++) {
            projectile.graphics.drawCircle(tipX + (Math.random() - 0.5) * 4, tipY + (Math.random() - 0.5) * 4, 1 + Math.random());
        }
        projectile.graphics.endFill();
        projectile.graphics.rotation = 0;
    }

    drawSlowProjectile(projectile) {
        if (!projectile.graphics || projectile.graphics._destroyed) return;
        const size = projectile.size || 3;
        const time = projectile.timeAlive * 0.02;
        const pulseSize = size + Math.sin(time * 3) * 1.5;
        projectile.graphics.beginFill(projectile.color, 0.9);
        projectile.graphics.drawCircle(0, 0, pulseSize);
        projectile.graphics.endFill();
        projectile.graphics.beginFill(projectile.color, 0.2);
        projectile.graphics.drawCircle(0, 0, pulseSize + 4 + Math.sin(time * 2) * 2);
        projectile.graphics.endFill();
        projectile.graphics.beginFill(0xFFFFFF, 0.6);
        for (let i = 1; i <= 3; i++) {
            const trailPulse = pulseSize - i * 0.8;
            projectile.graphics.drawCircle(-Math.cos(projectile.angle) * (i * 5), -Math.sin(projectile.angle) * (i * 5), Math.max(0.5, trailPulse * (1 - i * 0.1)));
        }
        projectile.graphics.endFill();
    }

    drawBombProjectile(projectile) {
        if (!projectile.graphics || projectile.graphics._destroyed) return;
        const size = projectile.size || 5;
        const shadowSizeFactor = 1 + projectile.flightHeight * 0.01;
        const shadowAlpha = 0.4 - projectile.flightHeight * 0.003;
        projectile.graphics.beginFill(0x000000, Math.max(0.1, shadowAlpha));
        projectile.graphics.drawEllipse(0, projectile.flightHeight, (size + 2) * shadowSizeFactor, (size + 2) * 0.5 * shadowSizeFactor);
        projectile.graphics.endFill();
        projectile.graphics.beginFill(0x404040);
        projectile.graphics.drawCircle(0, 0, size);
        projectile.graphics.endFill();
        projectile.graphics.beginFill(0x606060);
        projectile.graphics.drawCircle(-size * 0.3, -size * 0.3, size * 0.5);
        projectile.graphics.endFill();
        projectile.graphics.lineStyle(2, 0x7f8c8d);
        const fuseTime = projectile.timeAlive * 0.02;
        const fuseWiggle = Math.sin(fuseTime * 6) * 2;
        const fuseLength = 6 + Math.sin(fuseTime) * 2;
        projectile.graphics.moveTo(0, -size);
        projectile.graphics.lineTo(fuseWiggle * 1.5, -size - fuseLength);
        projectile.graphics.beginFill(0xFFA500);
        projectile.graphics.drawCircle(fuseWiggle * 1.5, -size - fuseLength, 2 + Math.sin(fuseTime * 10) * 0.5);
        projectile.graphics.endFill();
        projectile.graphics.beginFill(0xFF0000, 0.7);
        projectile.graphics.drawCircle(fuseWiggle * 1.5, -size - fuseLength, 1 + Math.sin(fuseTime * 10 + 1) * 0.3);
        projectile.graphics.endFill();
        projectile.graphics.lineStyle(0);
    }

    // --- Turmvorschau und Reichweitenkreise ---

    drawTowerPreview(x, y, type, canPlace) {
        if (this.previewGraphics && !this.previewGraphics._destroyed) {
            if (this.previewGraphics.parent) {
                this.rangeCirclesContainer.removeChild(this.previewGraphics);
            }
            this.previewGraphics.destroy();
        }
        this.previewGraphics = null; // Wichtig: Referenz löschen

        if (!type) return;

        const towerType = towerTypes[type];
        if (!towerType) return;

        this.previewGraphics = new PIXI.Graphics();
        const tileCenter = this.gameMap.getTileCenter(x, y);
        const rangeColor = canPlace ? 0x00FF00 : 0xFF0000;

        this.previewGraphics.lineStyle(2, rangeColor, 0.4);
        this.previewGraphics.beginFill(rangeColor, 0.1);
        this.previewGraphics.drawCircle(tileCenter.x, tileCenter.y, towerType.range);
        this.previewGraphics.endFill();

        const previewSize = this.gameMap.tileSize * 0.4;
        this.previewGraphics.beginFill(towerType.color || 0xCCCCCC, 0.6);
        this.previewGraphics.lineStyle(2, 0x000000, 0.5);
        this.previewGraphics.drawCircle(tileCenter.x, tileCenter.y, previewSize);
        this.previewGraphics.endFill();
        this.previewGraphics.lineStyle(0);

        this.rangeCirclesContainer.addChild(this.previewGraphics);
    }

    updateRangeCircles() {
        // Temporäres Array für zu entfernende Kreise
        const circlesToRemove = [];
        this.rangeCirclesContainer.children.forEach(child => {
            // Identifiziere nur die Range-Kreise (nicht die Vorschau)
            if (child !== this.previewGraphics && child instanceof PIXI.Graphics) {
                circlesToRemove.push(child);
            }
        });

        // Entferne und zerstöre die alten Kreise
        circlesToRemove.forEach(child => {
            if (!child._destroyed) { // Nur zerstören, wenn nicht schon zerstört
                if (child.parent) {
                    this.rangeCirclesContainer.removeChild(child);
                }
                child.destroy();
            }
        });

        // Zeichne neue Kreise für ausgewählte/hovernde Türme
        for (const tower of this.towers) {
            // Sicherstellen, dass Turm noch gültig ist
            if (!tower || !tower.container || tower.container._destroyed) continue;

            if (tower.selected || tower.hover) {
                const rangeCircle = new PIXI.Graphics();
                rangeCircle.lineStyle(2, 0xFFFFFF, 0.5);
                rangeCircle.beginFill(0xFFFFFF, 0.05);
                rangeCircle.drawCircle(tower.x, tower.y, tower.range);
                rangeCircle.endFill();
                rangeCircle.lineStyle(0);

                // Füge den Kreis *vor* der Vorschau ein, falls vorhanden
                if (this.previewGraphics && this.previewGraphics.parent) {
                    const previewIndex = this.rangeCirclesContainer.getChildIndex(this.previewGraphics);
                    this.rangeCirclesContainer.addChildAt(rangeCircle, previewIndex);
                } else {
                    this.rangeCirclesContainer.addChild(rangeCircle);
                }
            }
        }
    }

    normalizeAngle(angle) {
        while (angle <= -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;
        return angle;
    }
}