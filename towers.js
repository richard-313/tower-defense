// --- START OF FILE towers.js ---
// towers.js

// Stellt sicher, dass drawStar aus utils.js geladen wurde
// function drawStar(graphics, x, y, points, outerRadius, innerRadius, rotation = 0) { ... }

class TowerManager {
    constructor(app, gameMap) {
        this.app = app;
        this.gameMap = gameMap; // Uses mapConfig.tileSize internally
        this.towers = [];
        this.projectiles = [];
        this.selectedTower = null; // Might be redundant if UI handles selection state
        this.hoverTower = null;   // Might be redundant if UI handles hover state

        // Containers
        this.rangeCirclesContainer = new PIXI.Container();
        this.towerContainer = new PIXI.Container();
        this.effectsContainer = new PIXI.Container(); // For lightning, explosions
        this.projectileContainer = new PIXI.Container();

        // Naming containers for reliable ordering/finding
        this.rangeCirclesContainer.name = "rangeCirclesContainer";
        this.towerContainer.name = "towerContainer";
        this.effectsContainer.name = "towerEffectsContainer"; // Specific name for tower effects
        this.projectileContainer.name = "projectileContainer";

        // Add containers to stage in desired order (bottom to top)
        this.app.stage.addChild(this.rangeCirclesContainer);
        this.app.stage.addChild(this.towerContainer);
        this.app.stage.addChild(this.effectsContainer);
        this.app.stage.addChild(this.projectileContainer);

        // Ensure Enemy Effects container is positioned correctly relative to these
        // This assumes enemyManager might exist already during initialization
        if (window.game?.enemyManager) {
            window.game.enemyManager.positionEffectsContainer();
        }

        // Tower preview graphic
        this.previewGraphics = null;
    }

    updateMap(gameMap) {
        this.gameMap = gameMap; // Update reference
    }

    addTower(type, x, y) {
        // x, y should already be the tile center from UI
        const tileX = Math.floor(x / this.gameMap.tileSize);
        const tileY = Math.floor(y / this.gameMap.tileSize);

        if (tileX < 0 || tileX >= this.gameMap.width || tileY < 0 || tileY >= this.gameMap.height) return false;
        if (this.gameMap.isTileOccupied(x, y)) {
            return false;
        }
        // Check if another tower occupies the *exact* center point
        if (this.towers.some(tower => tower && tower.x === x && tower.y === y)) {
            return false;
        }

        const towerType = towerTypes[type];
        if (!towerType) {
            console.error(`Tower type "${type}" not found.`);
            return false;
        }

        const centerPoint = { x: x, y: y }; // Use the provided center point

        const towerContainer = new PIXI.Container();
        towerContainer.x = centerPoint.x;
        towerContainer.y = centerPoint.y;

        const towerGraphics = new PIXI.Graphics();
        towerContainer.addChild(towerGraphics);

        // Create the base tower object
        const newTower = {
            x: centerPoint.x, y: centerPoint.y,
            type: type,
            nameKey: towerType.name, // Store translation key
            damage: towerType.damage, range: towerType.range, fireRate: towerType.fireRate,
            lastShot: 0, target: null,
            color: towerType.color,
            projectileColor: towerType.projectileColor, projectileSize: towerType.projectileSize, projectileSpeed: towerType.projectileSpeed,
            effect: towerType.effect || null,
            container: towerContainer, graphics: towerGraphics,
            selected: false, hover: false,
            level: 0, upgrades: [], // Applied upgrades
            angle: 0, animationState: 0,
            sellValue: Math.floor(towerType.cost * towerType.sellFactor),
            // --- Default specific properties to undefined or base values ---
            slowFactor: undefined, slowDuration: undefined,
            splashRadius: undefined,
            chainCount: undefined, chainRange: undefined,
            pierce: 0, // Default to 0 pierce
            multishot: undefined, // Default to undefined
            lastTarget: null, // For lightning variance
        };

        // --- Apply specific properties from towerType ---
        if (towerType.slowFactor !== undefined) newTower.slowFactor = towerType.slowFactor;
        if (towerType.slowDuration !== undefined) newTower.slowDuration = towerType.slowDuration;
        if (towerType.splashRadius !== undefined) newTower.splashRadius = towerType.splashRadius;
        if (towerType.chainCount !== undefined) newTower.chainCount = towerType.chainCount;
        if (towerType.chainRange !== undefined) newTower.chainRange = towerType.chainRange;
        if (towerType.pierce !== undefined) newTower.pierce = towerType.pierce;
        if (towerType.multishot !== undefined) newTower.multishot = towerType.multishot;

        this.drawTower(newTower); // Initial draw
        this.towerContainer.addChild(towerContainer);
        this.towers.push(newTower);
        return true;
    }

    removeTower(towerIndex) {
        if (towerIndex < 0 || towerIndex >= this.towers.length) return 0;

        const tower = this.towers[towerIndex];
        if (!tower) return 0; // Tower might already be gone

        const sellValue = tower.sellValue;

        // Destroy container and graphics robustly
        if (tower.container && !tower.container._destroyed) {
            if (tower.container.parent) {
                // Safely remove from parent if it still exists
                try {
                    tower.container.parent.removeChild(tower.container);
                } catch (e) {
                    console.warn("Error removing tower container from parent:", e);
                }
            }
            tower.container.destroy({ children: true });
        }

        // Remove from array only if it's the correct object
        if (this.towers[towerIndex] === tower) {
            this.towers.splice(towerIndex, 1);
        } else {
            // Fallback: Find and remove if index was wrong but tower exists
            const actualIndex = this.towers.indexOf(tower);
            if (actualIndex > -1) {
                this.towers.splice(actualIndex, 1);
            }
        }


        // Update UI selection if necessary (handled in ui.js sellTower)
        this.updateRangeCircles(); // Remove range circle if it was selected/hovered

        return sellValue;
    }

    getTowerAt(x, y, radius = this.gameMap.tileSize * 0.5) {
        for (let i = 0; i < this.towers.length; i++) {
            const tower = this.towers[i];
            // Check if tower and its container are valid
            if (!tower || !tower.container || tower.container._destroyed) continue;

            const dx = tower.x - x;
            const dy = tower.y - y;
            // Using squared distance for efficiency
            if ((dx * dx + dy * dy) <= (radius * radius)) {
                return { tower, index: i };
            }
        }
        return null;
    }

    // --- Upgrade Logic ---
    upgradeTower(towerIndex, targetLevel) {
        if (towerIndex < 0 || towerIndex >= this.towers.length) return { success: false, cost: 0 };

        const tower = this.towers[towerIndex];
        // Add extra checks for tower validity
        if (!tower || tower.container._destroyed || !towerTypes[tower.type]) {
            console.warn("Upgrade attempt on invalid tower:", towerIndex, tower);
            return { success: false, cost: 0 };
        }


        const towerType = towerTypes[tower.type];
        const currentLevelIndex = tower.level; // Index for the *next* upgrade
        const maxLevel = towerType.upgrades.length;

        if (currentLevelIndex >= maxLevel || targetLevel !== currentLevelIndex + 1) {
            console.warn("Invalid upgrade attempt:", { towerIndex, currentLevel: tower.level, targetLevel, maxLevel });
            return { success: false, cost: 0 };
        }

        const upgradeData = towerType.upgrades[currentLevelIndex];
        if (!upgradeData) {
            console.error("Upgrade data missing for level", currentLevelIndex, "type", tower.type);
            return { success: false, cost: 0 };
        }
        const cost = upgradeData.cost;

        // --- Apply Upgrade Stats ---
        tower.upgrades.push(upgradeData); // Record the applied upgrade

        for (const [key, value] of Object.entries(upgradeData)) {
            // Skip non-stat properties
            if (['name', 'cost', 'description'].includes(key)) continue;

            if (key.endsWith('Multiplier')) {
                const baseKey = key.replace('Multiplier', '');
                if (tower.hasOwnProperty(baseKey)) { // Check if the base property exists on the tower instance
                    tower[baseKey] *= value;
                } else {
                    console.warn(`Base key "${baseKey}" not found for multiplier upgrade on tower instance ${tower.type}`);
                }
            } else if (tower.hasOwnProperty(key)) { // Apply direct value only if property exists
                tower[key] = value;
            } else {
                console.warn(`Property "${key}" not found for direct upgrade on tower instance ${tower.type}`);
            }
        }

        tower.level++; // Increment level AFTER applying stats for that level

        // Recalculate sell value
        tower.sellValue = Math.floor(towerType.cost * towerType.sellFactor);
        tower.upgrades.forEach(up => {
            if (up?.cost) tower.sellValue += Math.floor(up.cost * towerType.sellFactor);
        });

        this.drawTower(tower); // Redraw with new appearance/level indicators
        return { success: true, cost: cost }; // Return cost for UI deduction
    }

    getUpgradeCost(tower, targetLevel) {
        if (!tower) return 0;
        const towerType = towerTypes[tower.type];
        const nextLevelIndex = tower.level; // Index of the upgrade for the next level

        if (!towerType || !towerType.upgrades || nextLevelIndex >= towerType.upgrades.length) {
            return 0; // No more upgrades or invalid type
        }
        // Check if targetLevel matches expected next level (optional check)
        if (targetLevel !== nextLevelIndex + 1) {
            // console.warn(`getUpgradeCost called with mismatching targetLevel (${targetLevel}) for current level (${tower.level})`);
        }

        return towerType.upgrades[nextLevelIndex]?.cost || 0; // Return cost of the next available upgrade
    }

    // --- Update Loop ---
    update(enemies, deltaTime) {
        const currentTime = Date.now();
        // Scale deltaTime relative to 60 FPS for consistent movement/rotation speeds
        // Limit maximum catch-up to prevent extreme jumps
        const timeScale = Math.min(5, deltaTime / (1000 / 60));

        // --- Tower Targeting and Firing ---
        for (const tower of this.towers) {
            // Robust check if tower is still valid
            if (!tower || !tower.container || tower.container._destroyed) continue;

            tower.animationState += deltaTime * 0.001; // For visual effects

            // Find potential targets in range
            let potentialTargets = enemies.filter(enemy => {
                if (!enemy || !enemy.sprite || enemy.sprite._destroyed || enemy.health <= 0) return false;
                const dx = tower.x - enemy.x;
                const dy = tower.y - enemy.y;
                return (dx * dx + dy * dy) <= (tower.range * tower.range); // Use squared distance
            });

            // Simple Targeting: Closest enemy
            let closestEnemy = null;
            let minDistanceSq = Infinity;
            potentialTargets.forEach(enemy => {
                const dx = tower.x - enemy.x;
                const dy = tower.y - enemy.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    closestEnemy = enemy;
                }
            });
            tower.target = closestEnemy;

            // Tower Rotation (if applicable)
            if (tower.target && tower.type !== 'lightning' && tower.type !== 'slow' && tower.type !== 'bomb') {
                const targetAngle = Math.atan2(tower.target.y - tower.y, tower.target.x - tower.x);
                // Use scaled time for rotation speed
                const rotationSpeedRad = 7 * timeScale * (Math.PI / 180); // Degrees per scaled frame -> radians
                const angleDiff = this.normalizeAngle(targetAngle - tower.angle);

                if (Math.abs(angleDiff) > 0.05) { // Tolerance
                    const rotationDir = angleDiff > 0 ? 1 : -1;
                    const rotationAmount = Math.min(rotationSpeedRad, Math.abs(angleDiff));
                    tower.angle = this.normalizeAngle(tower.angle + rotationDir * rotationAmount);
                    this.drawTower(tower); // Redraw if rotated
                }
            } else if (tower.type === 'lightning' || tower.type === 'slow' || tower.type === 'bomb') {
                // Redraw for animation even if not rotating
                this.drawTower(tower);
            }

            // Firing Logic
            if (currentTime - tower.lastShot >= tower.fireRate && tower.target) {
                tower.lastShot = currentTime;
                if (tower.type === 'lightning') {
                    this.fireLightning(tower, tower.target, enemies);
                } else {
                    const shots = tower.multishot || 1;
                    const angleStep = shots > 1 ? 0.15 : 0; // Angle spread for multishot
                    const baseAngle = tower.angle; // Use current tower angle

                    for (let i = 0; i < shots; i++) {
                        const angleOffset = (i - (shots - 1) / 2) * angleStep;
                        const shotAngle = this.normalizeAngle(baseAngle + angleOffset);
                        this.createProjectile(tower, tower.target.x, tower.target.y, tower.target, shotAngle);
                    }
                }
            }
        } // End tower loop

        // --- Projectile Update and Collision ---
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            // Robust check for destroyed/invalid projectile
            if (!proj || !proj.graphics || proj.graphics._destroyed) {
                if (this.projectiles[i]) this.projectiles.splice(i, 1);
                continue;
            }

            proj.timeAlive += deltaTime;
            let removed = false;

            // --- 1. Movement ---
            if (proj.type === 'bomb') {
                this.updateBombProjectile(proj, deltaTime); // Bomb uses raw deltaTime for progress
                if (proj.flightProgress >= 1) {
                    this.createExplosion(proj, enemies);
                    this.removeProjectile(i); // Bomb removed after explosion
                    removed = true;
                }
            } else {
                // Use timeScale for consistent standard projectile speed
                this.updateStandardProjectile(proj, timeScale); // Pass scaled frame factor
            }

            if (removed) continue; // Skip checks if bomb exploded

            // --- 2. Update Graphics Position & Draw ( BEFORE checks) ---
            if (proj.graphics && !proj.graphics._destroyed) {
                proj.graphics.x = proj.x;
                proj.graphics.y = (proj.type === 'bomb' ? proj.visualY : proj.y);
                this.drawProjectile(proj); // Draw at new position
            } else {
                // Graphics destroyed unexpectedly? Remove projectile.
                this.removeProjectile(i);
                continue;
            }

            // --- 3. Projectile Checks ---
            // 3a. Max Lifetime
            const MAX_PROJECTILE_LIFETIME = 4000; // 4 seconds
            if (proj.timeAlive > MAX_PROJECTILE_LIFETIME && proj.type !== 'bomb') {
                // console.log(`Projectile ${proj.type} timed out.`);
                this.removeProjectile(i);
                continue;
            }

            // 3b. Off-Screen Check
            const bounds = this.gameMap.tileSize;
            if (proj.x < -bounds || proj.x > this.gameMap.width * this.gameMap.tileSize + bounds ||
                proj.y < -bounds || proj.y > this.gameMap.height * this.gameMap.tileSize + bounds) {
                // console.log(`Projectile ${proj.type} went off screen.`);
                this.removeProjectile(i);
                continue;
            }

            // 3c. Collision Check (if not bomb)
            if (proj.type !== 'bomb') {
                // Pass index 'i' for removal within the check function
                if (this.checkProjectileCollisions(proj, enemies, i)) {
                    // Projectile was hit and removed inside the function
                    continue; // Go to next projectile
                }
            }

            // --- 4. Drawing (MOVED UP) ---

        } // End projectile loop
    } // End update


    // --- Projectile Creation and Behavior ---

    createProjectile(tower, targetX, targetY, targetEnemy, angle) {
        const projectileGraphics = new PIXI.Graphics();
        this.projectileContainer.addChild(projectileGraphics);

        // Start slightly away from tower center along the launch angle
        const startOffset = this.gameMap.tileSize * 0.2;
        const startX = tower.x + Math.cos(angle) * startOffset;
        const startY = tower.y + Math.sin(angle) * startOffset;

        const baseProjectile = {
            x: startX, y: startY,
            sourceX: tower.x, sourceY: tower.y, // Original tower position
            targetX: targetX, targetY: targetY, // Initial target point (will update)
            startX: startX, startY: startY, // For bomb trajectory start
            target: targetEnemy, // Reference to the enemy object
            damage: tower.damage,
            speed: tower.projectileSpeed, // Base speed factor (pixels per 60fps frame)
            size: tower.projectileSize,
            color: tower.projectileColor,
            type: tower.type,
            effect: tower.effect,
            angle: angle, // Actual launch angle
            timeAlive: 0,
            graphics: projectileGraphics,
            // Specific properties copied from tower instance
            slowFactor: tower.slowFactor, slowDuration: tower.slowDuration,
            splashRadius: tower.splashRadius,
            pierce: tower.pierce > 0 ? tower.pierce : 0,
            hitEnemies: tower.pierce > 0 ? [] : null, // IDs of enemies hit by this pierce proj
            // Bomb specific
            maxHeight: tower.type === 'bomb' ? (this.gameMap.tileSize * 1.5 + Math.random() * (this.gameMap.tileSize * 0.5)) : 0,
            flightProgress: 0,
            flightDuration: tower.type === 'bomb' ? this.calculateFlightDuration(startX, startY, targetX, targetY, tower.projectileSpeed) : 0,
            visualY: startY, // Y position for drawing the bomb arc
            targetInvalidated: false, // Flag if original target dies/disappears
        };

        // Bombs target a fixed location, not a moving enemy
        if (tower.type === 'bomb') {
            baseProjectile.target = null;
        }

        // Initial position and draw
        projectileGraphics.x = baseProjectile.x;
        projectileGraphics.y = baseProjectile.y;
        this.drawProjectile(baseProjectile);

        this.projectiles.push(baseProjectile);
    }

    calculateFlightDuration(startX, startY, targetX, targetY, speedFactor) {
        if (speedFactor <= 0) return Infinity;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Assume speedFactor relates to pixels per frame at 60fps
        const pixelsPerSecond = speedFactor * 60;
        if (pixelsPerSecond <= 0) return Infinity;
        const durationSeconds = distance / pixelsPerSecond;
        return durationSeconds * 1000; // Return duration in milliseconds
    }

    updateStandardProjectile(projectile, timeScale) { // Takes scaled frame factor
        if (!projectile.graphics || projectile.graphics._destroyed) return;

        // --- Update Target Position (if target exists and is valid) ---
        if (!projectile.targetInvalidated && projectile.target) {
            const targetStillValid = projectile.target.health > 0 && projectile.target.sprite && !projectile.target.sprite._destroyed;
            if (targetStillValid) {
                projectile.targetX = projectile.target.x; // Update target coords
                projectile.targetY = projectile.target.y;
            } else {
                projectile.targetInvalidated = true; // Target gone, fly towards last known position
                projectile.target = null; // Optional: Clear reference
            }
        }

        // --- Movement Calculation ---
        const dx = projectile.targetX - projectile.x;
        const dy = projectile.targetY - projectile.y;
        const distanceToTargetSq = dx * dx + dy * dy;
        // Calculate move distance for this frame based on speed and timeScale
        const moveDistance = projectile.speed * timeScale;

        // --- Move Projectile ---
        if (distanceToTargetSq <= moveDistance * moveDistance || distanceToTargetSq < 0.01) {
            // Reached target point or very close
            projectile.x = projectile.targetX;
            projectile.y = projectile.targetY;
            // Don't remove here; collision check in main loop handles hitting or missing
        } else {
            // Move towards target point
            const distance = Math.sqrt(distanceToTargetSq);
            const dirX = dx / distance;
            const dirY = dy / distance;
            projectile.x += dirX * moveDistance;
            projectile.y += dirY * moveDistance;
            projectile.angle = Math.atan2(dy, dx); // Update angle for drawing
        }

        // Graphics position & drawing are handled in the main update loop *after* movement
        // projectile.graphics.x = projectile.x;
        // projectile.graphics.y = projectile.y;
        // this.drawProjectile(projectile); // <-- Moved to main loop
    }

    updateBombProjectile(projectile, deltaTime) { // Uses raw deltaTime for progress calculation
        if (!projectile.graphics || projectile.graphics._destroyed) return;

        // projectile.timeAlive += deltaTime; // Moved to main loop
        const flightDurationMs = Math.max(projectile.flightDuration, 100); // Ensure minimum duration
        const progress = Math.min(projectile.timeAlive / flightDurationMs, 1);
        projectile.flightProgress = progress;

        // Parabolic trajectory
        projectile.x = projectile.startX + (projectile.targetX - projectile.startX) * progress;
        projectile.y = projectile.startY + (projectile.targetY - projectile.startY) * progress; // Ground position
        projectile.flightHeight = projectile.maxHeight * (4 * progress * (1 - progress)); // Arc height
        projectile.visualY = projectile.y - projectile.flightHeight; // Visual position for drawing

        // Graphics position & drawing handled in main loop
        // projectile.graphics.x = projectile.x;
        // projectile.graphics.y = projectile.visualY;
        // this.drawProjectile(projectile); // <-- Moved to main loop
    }

    createExplosion(projectile, enemies) {
        const explosion = new PIXI.Graphics();
        // Safety check for valid projectile coordinates
        if (typeof projectile.x !== 'number' || typeof projectile.y !== 'number') {
            console.warn("Attempted to create explosion with invalid coordinates", projectile);
            return;
        }
        explosion.x = projectile.x; // Explosion originates at ground impact point
        explosion.y = projectile.y;
        this.effectsContainer.addChild(explosion); // Add to tower effects container

        let radius = 0;
        let alpha = 1;
        const maxRadius = projectile.splashRadius || this.gameMap.tileSize; // Fallback radius
        const duration = 350; // ms duration of visual effect
        let elapsed = 0;
        let animationCallback = null; // Store callback reference

        animationCallback = () => {
            if (!explosion || explosion._destroyed) {
                if (animationCallback && this.app?.ticker) this.app.ticker.remove(animationCallback);
                return;
            }

            elapsed += this.app.ticker.deltaMS; // Use ticker's delta
            const progress = Math.min(elapsed / duration, 1);

            radius = maxRadius * (1 - Math.pow(1 - progress, 3)); // Ease out cubic expansion
            alpha = 1 - progress * progress; // Fade out quadratically

            explosion.clear();
            // Outer glow (yellow/orange)
            explosion.beginFill(0xFF8800, 0.5 * alpha);
            explosion.drawCircle(0, 0, radius);
            explosion.endFill();
            // Inner core (red/orange)
            explosion.beginFill(0xFF3300, 0.7 * alpha);
            explosion.drawCircle(0, 0, radius * 0.6);
            explosion.endFill();

            if (progress >= 1) {
                if (explosion.parent) explosion.parent.removeChild(explosion);
                explosion.destroy();
                if (animationCallback && this.app?.ticker) this.app.ticker.remove(animationCallback);
                animationCallback = null; // Clear reference
            }
        };

        this.applySplashDamage(enemies, projectile.x, projectile.y, maxRadius, projectile.damage);
        if (this.app?.ticker) {
            this.app.ticker.add(animationCallback);
        } else {
            // Fallback: Destroy immediately if ticker is not available
            if (explosion.parent) explosion.parent.removeChild(explosion);
            explosion.destroy();
            console.warn("Ticker not available for explosion animation.");
        }
    }

    checkProjectileCollisions(projectile, enemies, projectileIndex) {
        // Bombs don't collide mid-air
        if (projectile.type === 'bomb') return false;

        let projectileRemoved = false;
        for (let j = enemies.length - 1; j >= 0; j--) { // Iterate backwards is safer if enemies are removed
            const enemy = enemies[j];
            // Ensure enemy is valid and hittable
            if (!enemy || enemy.health <= 0 || !enemy.sprite || enemy.sprite._destroyed) continue;

            // Skip if this piercing projectile has already hit this enemy
            if (projectile.pierce > 0 && projectile.hitEnemies?.includes(enemy.id)) {
                continue;
            }

            // Simple distance check
            const dx = enemy.x - projectile.x;
            const dy = enemy.y - projectile.y;
            const distanceSq = dx * dx + dy * dy;
            // Use combined radius squared for hit detection
            const hitRadius = (projectile.size || 4) + enemy.size; // Use default proj size if needed
            const hitRadiusSq = hitRadius * hitRadius;

            if (distanceSq < hitRadiusSq) {
                // --- HIT ---
                enemy.health -= projectile.damage;

                // Apply effects (e.g., slow)
                if ((projectile.effect === 'slow' || projectile.type === 'slow') && window.game?.enemyManager) {
                    const duration = projectile.slowDuration || 2000; // Use projectile's value or default
                    const factor = projectile.slowFactor || 0.5;
                    window.game.enemyManager.applyEffect(enemy, 'slow', duration, factor);
                }

                // --- Pierce Logic ---
                if (projectile.pierce > 0) {
                    if (!projectile.hitEnemies) projectile.hitEnemies = []; // Initialize if needed
                    projectile.hitEnemies.push(enemy.id); // Record hit enemy
                    projectile.pierce--; // Decrement pierce count

                    if (projectile.pierce <= 0) {
                        // Last pierce used up, remove projectile
                        this.removeProjectile(projectileIndex);
                        projectileRemoved = true;
                        break; // Stop checking collisions for this projectile
                    }
                    // Projectile continues, check next enemy
                } else {
                    // Not a piercing projectile, remove on hit
                    this.removeProjectile(projectileIndex);
                    projectileRemoved = true;
                    break; // Stop checking collisions for this projectile
                }
            }
        }
        return projectileRemoved; // Return true if removed
    }

    applySplashDamage(enemies, centerX, centerY, radius, baseDamage) {
        const radiusSq = radius * radius;
        enemies.forEach(enemy => {
            if (!enemy || enemy.health <= 0 || !enemy.sprite || enemy.sprite._destroyed) return;

            const dx = enemy.x - centerX;
            const dy = enemy.y - centerY;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq <= radiusSq) {
                // Optional: Damage falloff (linear example)
                const distance = Math.sqrt(distanceSq);
                const damageMultiplier = Math.max(0.2, 1 - (distance / radius)); // 100% at center to 20% at edge
                const damage = baseDamage * damageMultiplier;
                enemy.health -= damage;
                // Health bar updated in main enemy loop
            }
        });
    }

    // --- Lightning Effect ---
    fireLightning(tower, initialTarget, allEnemies) {
        if (!initialTarget || initialTarget.health <= 0 || !initialTarget.sprite || initialTarget.sprite._destroyed) {
            return; // No valid initial target
        }

        const hitEnemies = new Set([initialTarget]); // Use Set for efficient checking & uniqueness
        const chainPositions = [{ x: tower.x, y: tower.y }, { x: initialTarget.x, y: initialTarget.y }]; // Start and first target
        let currentTarget = initialTarget;
        // Use tower's chainCount, default to 1 if undefined (meaning 1 initial hit + 1 chain = 2 targets total)
        const maxChains = tower.chainCount ?? 1;

        for (let i = 0; i < maxChains && currentTarget; i++) {
            let nextTarget = null;
            let minDistanceSq = (tower.chainRange || 60) ** 2; // Use squared distance

            allEnemies.forEach(enemy => {
                // Check if enemy is valid, hittable, not already hit, and within chain range
                if (enemy && enemy.health > 0 && !enemy.sprite._destroyed && !hitEnemies.has(enemy)) {
                    const dx = currentTarget.x - enemy.x;
                    const dy = currentTarget.y - enemy.y;
                    const distSq = dx * dx + dy * dy;

                    // Also check if the potential next target is within the *tower's original range*
                    const dxTower = tower.x - enemy.x;
                    const dyTower = tower.y - enemy.y;
                    const distSqTower = dxTower * dxTower + dyTower * dyTower;

                    if (distSq <= minDistanceSq && distSqTower <= (tower.range * tower.range)) {
                        minDistanceSq = distSq;
                        nextTarget = enemy;
                    }
                }
            });

            if (nextTarget) {
                hitEnemies.add(nextTarget); // Add to the set of hit enemies
                chainPositions.push({ x: nextTarget.x, y: nextTarget.y }); // Add position for drawing
                currentTarget = nextTarget; // Update current target for the next jump
            } else {
                break; // No more targets found in range
            }
        }

        // Apply damage to all hit enemies (iterate over the Set)
        hitEnemies.forEach(enemy => {
            // Double check health again before applying damage
            if (enemy && enemy.health > 0 && !enemy.sprite._destroyed) {
                enemy.health -= tower.damage;
            }
        });

        // Draw the visual effect using the collected positions
        this.drawLightningEffect(tower, chainPositions);
        tower.lastTarget = currentTarget; // Store last target for variance (optional)
    }

    drawLightningEffect(tower, positions) {
        if (positions.length < 2) return; // Need at least tower and one target

        const lightning = new PIXI.Graphics();
        const boltColor = tower.projectileColor || 0xFFFFFF;
        const glowColor = 0xFFFF00; // Yellow glow

        // Draw Glow first (thicker, less opaque)
        lightning.lineStyle(8 + tower.level * 2, glowColor, 0.25); // Scale thickness with level
        this.drawLightningSegment(lightning, positions);

        // Draw Core Bolt (thinner, more opaque)
        lightning.lineStyle(3 + tower.level, boltColor, 0.8);
        this.drawLightningSegment(lightning, positions);

        this.effectsContainer.addChild(lightning); // Add to tower effects container

        // Fade out animation
        let duration = 0;
        const maxDuration = 180; // ms - slightly longer visibility
        let fadeOutCallback = null; // Store callback reference

        fadeOutCallback = () => {
            if (!lightning || lightning._destroyed) {
                if (fadeOutCallback && this.app?.ticker) this.app.ticker.remove(fadeOutCallback);
                return;
            }
            duration += this.app.ticker.deltaMS;
            const alpha = Math.max(0, 1 - (duration / maxDuration));
            lightning.alpha = alpha;

            if (alpha <= 0) {
                if (lightning.parent) lightning.parent.removeChild(lightning);
                lightning.destroy();
                if (fadeOutCallback && this.app?.ticker) this.app.ticker.remove(fadeOutCallback);
                fadeOutCallback = null; // Clear reference
            }
        };

        if (this.app?.ticker) {
            this.app.ticker.add(fadeOutCallback);
        } else {
            // Fallback: Destroy immediately if ticker is not available
            if (lightning.parent) lightning.parent.removeChild(lightning);
            lightning.destroy();
            console.warn("Ticker not available for lightning animation.");
        }
    }

    drawLightningSegment(graphics, positions) {
        if (!positions || positions.length < 2) return;
        graphics.moveTo(positions[0].x, positions[0].y);
        const segmentLength = 15 * (this.gameMap.tileSize / 32); // Adjust jaggedness based on tile size
        const deviation = 8 * (this.gameMap.tileSize / 32);

        for (let i = 1; i < positions.length; i++) {
            const start = positions[i - 1];
            const end = positions[i];
            // Check if points are valid objects with numbers
            if (!start || !end || typeof start.x !== 'number' || typeof start.y !== 'number' || typeof end.x !== 'number' || typeof end.y !== 'number') continue;


            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 1) { // Avoid division by zero or tiny segments
                graphics.lineTo(end.x, end.y); // Draw straight if too close
                continue;
            }

            const segments = Math.max(2, Math.floor(distance / segmentLength));
            const normalX = -dy / distance; // Perpendicular vector component
            const normalY = dx / distance;

            graphics.moveTo(start.x, start.y); // Ensure path starts correctly for this segment

            for (let j = 1; j < segments; j++) { // Draw intermediate points
                const progress = j / segments;
                const targetX = start.x + dx * progress;
                const targetY = start.y + dy * progress;
                // Add random deviation perpendicular to the segment direction
                // Less deviation near start/end points
                const deviationScale = (1 - Math.abs(progress - 0.5) * 2);
                const offsetX = normalX * (Math.random() - 0.5) * deviation * deviationScale;
                const offsetY = normalY * (Math.random() - 0.5) * deviation * deviationScale;
                graphics.lineTo(targetX + offsetX, targetY + offsetY);
            }
            graphics.lineTo(end.x, end.y); // Connect to the final point of the segment
        }
    }

    // --- Utility and Cleanup ---
    removeProjectile(index) {
        if (index < 0 || index >= this.projectiles.length) return;
        const projectile = this.projectiles[index];
        if (!projectile) {
            // If the entry exists but is null/undefined, remove it
            if (this.projectiles[index]) this.projectiles.splice(index, 1);
            return;
        }

        // Destroy graphics safely
        if (projectile.graphics && !projectile.graphics._destroyed) {
            if (projectile.graphics.parent) {
                // Attempt to remove from parent first
                try {
                    projectile.graphics.parent.removeChild(projectile.graphics);
                } catch (e) {
                    console.warn("Failed to remove projectile graphics from parent:", e);
                }
            }
            projectile.graphics.destroy(); // Destroy graphics object
        }

        // Remove from array *after* cleanup, verifying it's the same object
        if (this.projectiles[index] === projectile) {
            this.projectiles.splice(index, 1);
        } else {
            // If index shifted, find and remove correct object
            const actualIndex = this.projectiles.indexOf(projectile);
            if (actualIndex > -1) {
                this.projectiles.splice(actualIndex, 1);
            }
        }
    }

    normalizeAngle(angle) {
        while (angle <= -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;
        return angle;
    }

    // --- Drawing Functions (Towers & Projectiles) ---

    drawTower(tower) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        tower.graphics.clear();
        const baseSize = this.gameMap.tileSize * 0.4; // Base radius based on tile size

        switch (tower.type) {
            case 'basic': this.drawBasicTower(tower, baseSize); break;
            case 'sniper': this.drawSniperTower(tower, baseSize); break;
            case 'slow': this.drawSlowTower(tower, baseSize); break;
            case 'bomb': this.drawBombTower(tower, baseSize); break;
            case 'lightning': this.drawLightningTower(tower, baseSize); break;
            default: this.drawDefaultTower(tower, baseSize);
        }
        this.drawTowerLevelIndicators(tower, baseSize); // Draw stars on top
    }

    // --- Individual Tower Draw Functions (using baseSize) ---
    // (Using the versions from the last iteration which seemed visually okay)
    drawBasicTower(tower, baseSize) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        tower.graphics.beginFill(0x5D6D7E); // Base color (grey)
        tower.graphics.drawCircle(0, 0, baseSize);
        tower.graphics.endFill();
        tower.graphics.beginFill(tower.color); // Main color (blue)
        tower.graphics.drawCircle(0, 0, baseSize * 0.7);
        tower.graphics.endFill();

        const shots = tower.multishot || 1;
        const barrelLength = baseSize * 1.2 + tower.level * (baseSize * 0.1);
        const barrelWidth = baseSize * 0.25;
        const barrelOffsetY = baseSize * 0.35; // Offset from center for double/triple barrels

        if (shots === 1) {
            this.drawTowerBarrel(tower, tower.angle, 0, barrelLength, barrelWidth);
        } else if (shots === 2) {
            this.drawTowerBarrel(tower, tower.angle, -barrelOffsetY, barrelLength * 0.9, barrelWidth * 0.9);
            this.drawTowerBarrel(tower, tower.angle, barrelOffsetY, barrelLength * 0.9, barrelWidth * 0.9);
        } else if (shots >= 3) {
            this.drawTowerBarrel(tower, tower.angle, 0, barrelLength, barrelWidth); // Center barrel
            this.drawTowerBarrel(tower, tower.angle, -barrelOffsetY * 1.1, barrelLength * 0.8, barrelWidth * 0.8);
            this.drawTowerBarrel(tower, tower.angle, barrelOffsetY * 1.1, barrelLength * 0.8, barrelWidth * 0.8);
        }
    }

    drawSniperTower(tower, baseSize) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        tower.graphics.beginFill(0x78281F); // Dark red base
        tower.graphics.drawCircle(0, 0, baseSize * 0.9); // Slightly smaller base
        tower.graphics.endFill();
        tower.graphics.beginFill(tower.color); // Main color (red)
        tower.graphics.drawCircle(0, 0, baseSize * 0.6);
        tower.graphics.endFill();

        const barrelLength = baseSize * 2.0 + tower.level * (baseSize * 0.4); // Longer barrel
        const barrelWidth = baseSize * 0.25;

        // Barrel
        tower.graphics.lineStyle(barrelWidth, 0x333333); // Dark grey barrel
        tower.graphics.moveTo(0, 0);
        tower.graphics.lineTo(Math.cos(tower.angle) * barrelLength, Math.sin(tower.angle) * barrelLength);
        tower.graphics.lineStyle(0);

        // Scope (simple rectangle) - added on level 2+
        if (tower.level >= 1) {
            // Basic scope representation, needs proper rotation if barrel rotates visually significantly
            tower.graphics.beginFill(0x444444);
            // Position along the barrel angle
            const scopeDist = barrelLength * 0.4;
            const scopeX = Math.cos(tower.angle) * scopeDist;
            const scopeY = Math.sin(tower.angle) * scopeDist;
            const scopeWidth = baseSize * 0.5;
            const scopeHeight = baseSize * 0.25;
            // Rotate the rectangle manually (simple approximation)
            tower.graphics.drawRect(scopeX - scopeWidth / 2, scopeY - scopeHeight / 2, scopeWidth, scopeHeight);
            tower.graphics.endFill();
            // Note: Proper rotation of the scope rect would involve rotating the graphics context or calculating corner points.
        }


        // Laser sight (if pierce upgrade is active - level 3 specific)
        if (tower.pierce && tower.target && tower.level === 3) {
            tower.graphics.lineStyle(1, 0xFF0000, 0.3); // Thin red laser
            tower.graphics.moveTo(Math.cos(tower.angle) * barrelLength, Math.sin(tower.angle) * barrelLength); // Start from barrel tip
            // Draw line towards target, clamped by range
            const dx = tower.target.x - tower.x;
            const dy = tower.target.y - tower.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Calculate end point relative to tower origin (0,0)
            const endLaserXRel = (dx / dist) * Math.min(dist, tower.range);
            const endLaserYRel = (dy / dist) * Math.min(dist, tower.range);

            tower.graphics.lineTo(endLaserXRel, endLaserYRel); // Draw to relative end point
            tower.graphics.lineStyle(0);
            // Small dot at the end
            tower.graphics.beginFill(0xFF0000, 0.7);
            tower.graphics.drawCircle(endLaserXRel, endLaserYRel, 2);
            tower.graphics.endFill();
        }
    }

    drawSlowTower(tower, baseSize) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        const time = tower.animationState * 2; // Slower animation
        const coreColor = tower.color; // Teal/Cyan
        const pulseColor = 0xADD8E6; // Light blue pulse

        // Pulsating Base Glow
        const pulseRadius = baseSize * 1.2 + Math.sin(time) * (baseSize * 0.15);
        tower.graphics.beginFill(pulseColor, 0.15 + Math.sin(time * 1.5) * 0.05);
        tower.graphics.drawCircle(0, 0, pulseRadius);
        tower.graphics.endFill();

        // Main Structure (Hexagon or Snowflake like)
        tower.graphics.beginFill(coreColor);
        const points = 6;
        const mainRadius = baseSize * 0.9;
        const innerRadius = baseSize * 0.5;
        for (let i = 0; i < points; i++) {
            const angle = (i * Math.PI * 2 / points) - Math.PI / 2; // Start from top
            const angleNext = ((i + 1) * Math.PI * 2 / points) - Math.PI / 2;
            tower.graphics.moveTo(Math.cos(angle) * mainRadius, Math.sin(angle) * mainRadius);
            tower.graphics.lineTo(Math.cos((angle + angleNext) / 2) * innerRadius, Math.sin((angle + angleNext) / 2) * innerRadius);
            tower.graphics.lineTo(Math.cos(angleNext) * mainRadius, Math.sin(angleNext) * mainRadius);
        }
        tower.graphics.closePath();
        tower.graphics.endFill();

        // Center Gem/Core
        tower.graphics.beginFill(0xFFFFFF);
        tower.graphics.drawCircle(0, 0, baseSize * 0.3);
        tower.graphics.endFill();
        tower.graphics.beginFill(pulseColor, 0.5);
        tower.graphics.drawCircle(0, 0, baseSize * 0.2 + Math.sin(time * 2) * (baseSize * 0.05));
        tower.graphics.endFill();
    }

    drawBombTower(tower, baseSize) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        // Base platform (dark grey)
        tower.graphics.beginFill(0x566573);
        tower.graphics.drawCircle(0, 0, baseSize * 1.1);
        tower.graphics.endFill();

        // Main body (bomb color - orange/yellow)
        tower.graphics.beginFill(tower.color);
        tower.graphics.drawCircle(0, 0, baseSize);
        tower.graphics.endFill();

        // Metal bands/details
        tower.graphics.lineStyle(baseSize * 0.15, 0x797D7F);
        tower.graphics.drawCircle(0, 0, baseSize * 0.9);
        tower.graphics.drawCircle(0, 0, baseSize * 0.6);
        tower.graphics.lineStyle(0);

        // Mortar Tube (short, wide, angled up)
        const mortarAngle = -Math.PI / 3; // Fixed upward angle
        const barrelLength = baseSize * 0.9 + tower.level * (baseSize * 0.1);
        const barrelWidth = baseSize * 0.6; // Wide barrel
        // Start position slightly offset from center
        const barrelStartX = Math.cos(mortarAngle + Math.PI / 2) * (baseSize * 0.1);
        // Position slightly up from the center for visual effect
        const barrelStartY = Math.sin(mortarAngle + Math.PI / 2) * (baseSize * 0.1) - baseSize * 0.1;

        tower.graphics.lineStyle(barrelWidth, 0x34495E); // Dark tube color
        tower.graphics.moveTo(barrelStartX, barrelStartY);
        tower.graphics.lineTo(
            barrelStartX + Math.cos(mortarAngle) * barrelLength,
            barrelStartY + Math.sin(mortarAngle) * barrelLength
        );
        tower.graphics.lineStyle(0);

        // Smoke effect after firing
        if (Date.now() - tower.lastShot < 150) { // Show smoke briefly
            tower.graphics.beginFill(0xFFFFFF, 0.4);
            const smokeOriginX = barrelStartX + Math.cos(mortarAngle) * barrelLength;
            const smokeOriginY = barrelStartY + Math.sin(mortarAngle) * barrelLength;
            for (let i = 0; i < 3; ++i) {
                tower.graphics.drawCircle(
                    smokeOriginX + (Math.random() - 0.5) * (baseSize * 0.6), // Wider smoke spread
                    smokeOriginY + (Math.random() - 0.5) * (baseSize * 0.6),
                    baseSize * 0.1 + Math.random() * (baseSize * 0.2) // Larger puffs
                );
            }
            tower.graphics.endFill();
        }
    }

    drawLightningTower(tower, baseSize) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        const time = tower.animationState * 3; // Animation speed
        const coreColor = tower.color; // Yellow/Gold
        const elecColor = 0xFFFFFF; // White electricity

        // Base structure (dark metal)
        tower.graphics.beginFill(0x566573);
        tower.graphics.drawCircle(0, 0, baseSize);
        tower.graphics.endFill();

        // Insulators/supports (grey porcelain look)
        const points = 3 + Math.min(tower.level, 2); // 3 to 5 points based on level
        const insulatorRadius = baseSize * 0.8;
        tower.graphics.beginFill(0xEAECEE);
        for (let i = 0; i < points; i++) {
            const angle = (i * Math.PI * 2 / points) + time * 0.1;
            const x = Math.cos(angle) * insulatorRadius;
            const y = Math.sin(angle) * insulatorRadius;
            tower.graphics.drawCircle(x, y, baseSize * 0.3);
        }
        tower.graphics.endFill();

        // Central Orb (pulsating gold)
        const orbRadius = baseSize * 0.4 + Math.sin(time * 2) * (baseSize * 0.05);
        tower.graphics.beginFill(coreColor);
        tower.graphics.drawCircle(0, 0, orbRadius);
        tower.graphics.endFill();
        tower.graphics.beginFill(coreColor, 0.3); // Aura
        tower.graphics.drawCircle(0, 0, orbRadius + baseSize * 0.2 + Math.sin(time * 1.5 + 1) * (baseSize * 0.1));
        tower.graphics.endFill();

        // Arcing electricity (random sparks to insulators)
        if (Math.random() > 0.5) { // Randomly show sparks
            tower.graphics.lineStyle(1 + Math.random(), elecColor, 0.7);
            const startAngle = Math.random() * Math.PI * 2;
            const endPointIndex = Math.floor(Math.random() * points);
            const endAngle = (endPointIndex * Math.PI * 2 / points) + time * 0.1;
            const startX = Math.cos(startAngle) * orbRadius;
            const startY = Math.sin(startAngle) * orbRadius;
            const endX = Math.cos(endAngle) * insulatorRadius;
            const endY = Math.sin(endAngle) * insulatorRadius;

            // Simple jagged line
            tower.graphics.moveTo(startX, startY);
            tower.graphics.lineTo(startX + (endX - startX) * 0.3 + (Math.random() - 0.5) * 10, startY + (endY - startY) * 0.3 + (Math.random() - 0.5) * 10);
            tower.graphics.lineTo(startX + (endX - startX) * 0.7 + (Math.random() - 0.5) * 10, startY + (endY - startY) * 0.7 + (Math.random() - 0.5) * 10);
            tower.graphics.lineTo(endX, endY);

            tower.graphics.lineStyle(0);
        }
    }

    drawDefaultTower(tower, baseSize) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        tower.graphics.beginFill(tower.color || 0xAAAAAA);
        tower.graphics.drawCircle(0, 0, baseSize);
        tower.graphics.endFill();
        this.drawTowerBarrel(tower, tower.angle, 0, baseSize * 1.2, baseSize * 0.3);
    }

    drawTowerBarrel(tower, angle, offset, length, width) {
        if (!tower.graphics || tower.graphics._destroyed) return;
        const barrelWidth = width || this.gameMap.tileSize * 0.12; // Default width
        const barrelLength = length || this.gameMap.tileSize * 0.5;
        const barrelOffset = offset || 0; // Offset perpendicular

        // Calculate start position with offset relative to tower origin (0,0)
        const perpX = Math.cos(angle + Math.PI / 2) * barrelOffset;
        const perpY = Math.sin(angle + Math.PI / 2) * barrelOffset;
        const startX = perpX;
        const startY = perpY;

        // Calculate end position relative to tower origin
        const endX = startX + Math.cos(angle) * barrelLength;
        const endY = startY + Math.sin(angle) * barrelLength;

        // Draw the barrel line
        tower.graphics.lineStyle(barrelWidth, 0x333333, 1, 0.5); // Dark grey, round caps/joins
        tower.graphics.moveTo(startX, startY);
        tower.graphics.lineTo(endX, endY);
        tower.graphics.lineStyle(0); // Reset line style
    }

    drawTowerLevelIndicators(tower, baseSize) {
        if (!tower.graphics || tower.graphics._destroyed || tower.level <= 0) return;
        if (typeof drawStar !== 'function') {
            console.warn("drawStar function missing, cannot draw level indicators.");
            return; // Don't draw if function missing
        }

        const starSize = baseSize * 0.25;
        const radius = baseSize + starSize * 0.7; // Position above the base circle
        const maxStarsToShow = 3; // Cap displayed stars (optional)
        const starsToDraw = Math.min(tower.level, maxStarsToShow);


        tower.graphics.beginFill(0xFFD700); // Gold color
        tower.graphics.lineStyle(1, 0xDAA520); // Darker gold outline

        for (let i = 0; i < starsToDraw; i++) {
            // Distribute stars in an arc above the tower
            const angleOffset = 0.7; // Controls spread
            const angle = -Math.PI / 2 + (i - (starsToDraw - 1) / 2) * angleOffset;
            const starX = Math.cos(angle) * radius;
            const starY = Math.sin(angle) * radius;
            // Draw the star (ensure drawStar exists globally)
            drawStar(tower.graphics, starX, starY, 5, starSize, starSize * 0.5, angle + Math.PI / 2);
        }

        tower.graphics.lineStyle(0);
        tower.graphics.endFill();
    }

    // --- Projectile Drawing Functions ---
    drawProjectile(projectile) {
        // Robust check for graphics object
        if (!projectile.graphics || projectile.graphics._destroyed) return;
        projectile.graphics.clear();

        // Set rotation for directional projectiles BEFORE drawing shapes
        // Ensure angle is a number
        if (projectile.type !== 'bomb' && projectile.type !== 'slow' && typeof projectile.angle === 'number') {
            projectile.graphics.rotation = projectile.angle; // Align with movement direction
        } else {
            projectile.graphics.rotation = 0; // No rotation for bombs/slow orbs
        }

        switch (projectile.type) {
            case 'bomb': this.drawBombProjectile(projectile); break;
            case 'slow': this.drawSlowProjectile(projectile); break;
            case 'sniper':
                // Use specific drawing for piercing sniper shots if pierce > 0
                if (projectile.pierce > 0 && towerTypes['sniper'].upgrades.some(up => up.pierce && projectile.damage >= up.damage)) { // Check if it *could* pierce
                    this.drawSniperProjectile(projectile); // Use the distinct sniper projectile look
                } else {
                    this.drawStandardProjectile(projectile); // Fallback or non-piercing sniper shot
                }
                break;
            case 'lightning': break; // No persistent projectile graphic
            default: this.drawStandardProjectile(projectile); // Basic, etc.
        }
    }

    // --- TEMPORARILY SIMPLIFIED DRAWING FOR DEBUGGING ---
    drawStandardProjectile(projectile) {
        if (!projectile.graphics || projectile.graphics._destroyed) return;
        const size = projectile.size || 8; // Larger default size
        const color = projectile.color || 0xFFFF00; // Bright yellow

        projectile.graphics.beginFill(color, 1.0); // Fully opaque
        projectile.graphics.lineStyle(1, 0x000000, 0.7); // Black outline

        // Simple Circle for easier visibility
        projectile.graphics.drawCircle(0, 0, size * 0.7);

        projectile.graphics.endFill();
        projectile.graphics.lineStyle(0);
    }

    drawSniperProjectile(projectile) {
        if (!projectile.graphics || projectile.graphics._destroyed) return;
        const size = projectile.size || 5; // Thicker
        const length = 20; // Longer
        const color = projectile.color || 0xFF00FF; // Bright Magenta
        const trailColor = 0xFFFFFF; // White

        // Main streak
        projectile.graphics.lineStyle(size, color, 1.0); // Solid line
        projectile.graphics.moveTo(length * 0.5, 0); // Draw from center outwards
        projectile.graphics.lineTo(-length * 0.5, 0);

        // Thin trail/glow
        projectile.graphics.lineStyle(size * 0.6, trailColor, 0.8); // More opaque trail
        projectile.graphics.moveTo(length * 0.3, 0);
        projectile.graphics.lineTo(-length * 0.6, 0);

        // Bright tip flare
        projectile.graphics.beginFill(trailColor, 1.0);
        projectile.graphics.drawCircle(length * 0.5, 0, size * 1.2); // Larger flare at the front
        projectile.graphics.endFill();

        projectile.graphics.lineStyle(0);
    }
    // --- END OF SIMPLIFIED DRAWING ---


    drawSlowProjectile(projectile) {
        if (!projectile.graphics || projectile.graphics._destroyed) return;
        const size = projectile.size || 3;
        const time = projectile.timeAlive * 0.015; // Animation speed
        const pulseFactor = 0.15;
        const pulseSize = size * (1 + Math.sin(time * 3) * pulseFactor); // Pulsating core size

        // Outer fuzzy glow
        projectile.graphics.beginFill(0xADD8E6, 0.15); // Light blue glow
        projectile.graphics.drawCircle(0, 0, pulseSize + size * 1.5 + Math.sin(time * 2) * (size * 0.3));
        projectile.graphics.endFill();

        // Inner core
        projectile.graphics.beginFill(projectile.color, 0.8); // Main slow color (teal/cyan)
        projectile.graphics.drawCircle(0, 0, pulseSize);
        projectile.graphics.endFill();

        // Center highlight
        projectile.graphics.beginFill(0xFFFFFF, 0.6);
        projectile.graphics.drawCircle(0, 0, pulseSize * 0.5);
        projectile.graphics.endFill();
    }

    drawBombProjectile(projectile) {
        if (!projectile.graphics || projectile.graphics._destroyed) return;
        const size = projectile.size || 5;
        const shadowSizeFactor = 1 + projectile.flightHeight * 0.015; // Shadow grows with height
        const shadowAlpha = Math.max(0.1, 0.4 - projectile.flightHeight * 0.004); // Shadow fades with height

        // Draw Shadow on the "ground" (y=projectile.y, but drawn at y=projectile.flightHeight relative to visualY)
        projectile.graphics.beginFill(0x000000, shadowAlpha);
        // Ellipse position is relative to the graphic's origin (which is at visualY)
        projectile.graphics.drawEllipse(0, projectile.flightHeight, size * shadowSizeFactor, size * 0.5 * shadowSizeFactor);
        projectile.graphics.endFill();

        // Draw Bomb Body (at visualY) - origin is (0, 0) for the graphics object
        projectile.graphics.beginFill(projectile.color || 0x404040); // Use projectile color or default dark grey
        projectile.graphics.drawCircle(0, 0, size);
        projectile.graphics.endFill();
        // Simple highlight
        projectile.graphics.beginFill(0x606060);
        projectile.graphics.drawCircle(-size * 0.3, -size * 0.3, size * 0.5);
        projectile.graphics.endFill();

        // Fuse
        const fuseTime = projectile.timeAlive * 0.02;
        const fuseWiggleX = Math.sin(fuseTime * 6) * (size * 0.15);
        const fuseLength = size * 0.8 + Math.sin(fuseTime * 2) * (size * 0.2);
        const sparkSize = size * 0.25 + Math.sin(fuseTime * 10) * (size * 0.05);

        projectile.graphics.lineStyle(size * 0.15, 0x7f8c8d); // Grey fuse
        projectile.graphics.moveTo(0, -size); // Start from top of bomb
        projectile.graphics.lineTo(fuseWiggleX, -size - fuseLength); // Wiggling end
        projectile.graphics.lineStyle(0);

        // Fuse Spark
        projectile.graphics.beginFill(0xFFA500); // Orange spark base
        projectile.graphics.drawCircle(fuseWiggleX, -size - fuseLength, sparkSize);
        projectile.graphics.endFill();
        projectile.graphics.beginFill(0xFF0000, 0.7); // Red inner spark
        projectile.graphics.drawCircle(fuseWiggleX, -size - fuseLength, sparkSize * 0.6);
        projectile.graphics.endFill();
    }


    // --- Tower Preview and Range ---
    drawTowerPreview(x, y, type, canPlace) {
        // Remove existing preview first robustly
        if (this.previewGraphics && !this.previewGraphics._destroyed) {
            if (this.previewGraphics.parent) {
                try { this.previewGraphics.parent.removeChild(this.previewGraphics); } catch (e) { }
            }
            this.previewGraphics.destroy();
        }
        this.previewGraphics = null;

        if (!type) return; // No type selected

        const towerType = towerTypes[type];
        if (!towerType) return;

        this.previewGraphics = new PIXI.Graphics();
        // Use the potential tile center for positioning preview
        const tileCenter = this.gameMap.getTileCenter(x, y);

        // Draw Range Circle
        const rangeColor = canPlace ? 0x00FF00 : 0xFF0000; // Green if placeable, Red if not
        this.previewGraphics.lineStyle(2, rangeColor, 0.5);
        this.previewGraphics.beginFill(rangeColor, 0.1);
        this.previewGraphics.drawCircle(tileCenter.x, tileCenter.y, towerType.range);
        this.previewGraphics.endFill();

        // Draw Tower Base Preview (semi-transparent)
        const previewSize = this.gameMap.tileSize * 0.4; // Base size
        this.previewGraphics.beginFill(towerType.color || 0xCCCCCC, 0.5);
        this.previewGraphics.lineStyle(1, 0x000000, 0.4); // Thin black outline
        this.previewGraphics.drawCircle(tileCenter.x, tileCenter.y, previewSize);
        this.previewGraphics.endFill();
        this.previewGraphics.lineStyle(0);

        // Add preview to the range circles container (drawn below towers)
        this.rangeCirclesContainer.addChild(this.previewGraphics);
    }

    updateRangeCircles() {
        // Clear existing range circles (but not the preview) robustly
        const circlesToRemove = this.rangeCirclesContainer.children.filter(child => child !== this.previewGraphics && child instanceof PIXI.Graphics);
        circlesToRemove.forEach(child => {
            if (child && !child._destroyed) {
                if (child.parent) {
                    try { child.parent.removeChild(child); } catch (e) { }
                }
                child.destroy();
            }
        });
        // Ensure container is clean if filter somehow misses things
        // this.rangeCirclesContainer.children.forEach((child, index) => {
        //     if (child !== this.previewGraphics && (!child || child._destroyed)) {
        //         this.rangeCirclesContainer.removeChildAt(index);
        //     }
        // });


        // Draw new circles for selected/hovered towers
        for (const tower of this.towers) {
            if (!tower || !tower.container || tower.container._destroyed) continue;

            // Use selection state from UI if available, otherwise tower internal state
            const isSelected = window.game?.gameUI?.selectedTowerForUpgrade?.tower === tower;
            const isHovered = tower.hover; // Assuming tower.hover is updated by UI mousemove

            if (isSelected || isHovered) {
                const rangeCircle = new PIXI.Graphics();
                const alpha = isSelected ? 0.6 : 0.4; // More opaque if selected
                const fillAlpha = isSelected ? 0.1 : 0.05;
                rangeCircle.lineStyle(2, 0xFFFFFF, alpha);
                rangeCircle.beginFill(0xFFFFFF, fillAlpha);
                // Ensure tower coords are numbers before drawing
                if (typeof tower.x === 'number' && typeof tower.y === 'number' && typeof tower.range === 'number') {
                    rangeCircle.drawCircle(tower.x, tower.y, tower.range);
                }
                rangeCircle.endFill();
                rangeCircle.lineStyle(0);

                // Add behind preview if preview exists
                if (this.previewGraphics && this.previewGraphics.parent) {
                    const previewIndex = this.rangeCirclesContainer.getChildIndex(this.previewGraphics);
                    // Add circle at the correct position, handling potential errors
                    try {
                        this.rangeCirclesContainer.addChildAt(rangeCircle, Math.max(0, previewIndex)); // Add before preview
                    } catch (e) {
                        console.warn("Error adding range circle:", e);
                        this.rangeCirclesContainer.addChild(rangeCircle); // Fallback add to end
                    }
                } else {
                    this.rangeCirclesContainer.addChild(rangeCircle);
                }
            }
        }
    }

} // End TowerManager Class
// --- END OF FILE towers.js ---