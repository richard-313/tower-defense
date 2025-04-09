// Tower Types and Management
const towerTypes = {
    basic: {
        name: 'Basis Turm',
        description: 'Ein grundlegender Verteidigungsturm mit ausgeglichenem Schaden und Reichweite.',
        cost: 25,
        damage: 10,
        range: 100,
        fireRate: 1000, // ms
        color: '#3498db',
        projectileColor: '#3498db',
        projectileSize: 4,
        projectileSpeed: 5,
        sellFactor: 0.7, // How much gold you get back when selling (percentage)
        upgrades: [
            {
                name: 'Doppelschuss',
                description: 'Schießt zwei Projektile gleichzeitig',
                cost: 50,
                multishot: 2,
                damage: 10
            },
            {
                name: 'Schnellfeuerschuss',
                description: 'Verdoppelte Feuerrate',
                cost: 100,
                fireRateMultiplier: 0.5
            },
            {
                name: 'Assault Cannon',
                description: 'Schießt drei Projektile mit erhöhtem Schaden',
                cost: 150,
                multishot: 3,
                damage: 15
            }
        ]
    },
    sniper: {
        name: 'Sniper Turm',
        description: 'Hoher Schaden über große Entfernungen, aber langsame Feuerrate.',
        cost: 50,
        damage: 30,
        range: 200,
        fireRate: 2000,
        color: '#e74c3c',
        projectileColor: '#e74c3c',
        projectileSize: 3,
        projectileSpeed: 8,
        sellFactor: 0.7,
        upgrades: [
            {
                name: 'Verstärkter Schuss',
                description: 'Erhöhter Schaden pro Schuss',
                cost: 75,
                damage: 60
            },
            {
                name: 'Präzisionsverbesserung',
                description: 'Erhöhte Reichweite und Schaden',
                cost: 125,
                range: 250,
                damage: 80
            },
            {
                name: 'Ultra-Sniper',
                description: 'Durchdringende Schüsse, die mehrere Gegner treffen',
                cost: 200,
                pierce: 3,
                damage: 100
            }
        ]
    },
    slow: {
        name: 'Frost Turm',
        description: 'Verlangsamt Gegner und fügt leichten Schaden zu.',
        cost: 40,
        damage: 5,
        range: 80,
        fireRate: 800,
        color: '#1abc9c',
        projectileColor: '#1abc9c',
        projectileSize: 3,
        projectileSpeed: 4,
        effect: 'slow',
        slowFactor: 0.5,
        slowDuration: 2000,
        sellFactor: 0.7,
        upgrades: [
            {
                name: 'Stärkere Verlangsamung',
                description: 'Gegner werden stärker verlangsamt',
                cost: 60,
                slowFactor: 0.3
            },
            {
                name: 'Verlängerte Verlangsamung',
                description: 'Effekt hält länger an',
                cost: 90,
                slowDuration: 4000
            },
            {
                name: 'Frost-Turm',
                description: 'Fast komplette Verlangsamung und erhöhter Schaden',
                cost: 130,
                slowFactor: 0.2,
                slowDuration: 5000,
                damage: 15
            }
        ]
    },
    bomb: {
        name: 'Bomben Turm',
        description: 'Verursacht Flächenschaden an allen Gegnern im Explosionsradius.',
        cost: 75,
        damage: 15,
        range: 120,
        fireRate: 1500,
        color: '#f1c40f',
        projectileColor: '#f1c40f',
        projectileSize: 5,
        projectileSpeed: 3.5,
        effect: 'splash',
        splashRadius: 60,
        sellFactor: 0.7,
        upgrades: [
            {
                name: 'Erweiterter Radius',
                description: 'Größerer Explosionsradius',
                cost: 80,
                splashRadius: 90
            },
            {
                name: 'Schwere Munition',
                description: 'Erhöhter Schaden und Radius',
                cost: 120,
                damage: 25,
                splashRadius: 110
            },
            {
                name: 'Nuklear-Turm',
                description: 'Maximaler Radius und Schaden',
                cost: 180,
                damage: 40,
                splashRadius: 150
            }
        ]
    }
};

class TowerManager {
    constructor(gameMap) {
        this.towers = [];
        this.projectiles = [];
        this.gameMap = gameMap;
        this.selectedTower = null;
        this.hoverTower = null;
        this.lastFrameTime = 0;
    }

    updateMap(gameMap) {
        this.gameMap = gameMap;
    }

    addTower(type, x, y) {
        const tileX = Math.floor(x / this.gameMap.tileSize);
        const tileY = Math.floor(y / this.gameMap.tileSize);

        // Check if tile is within bounds
        if (tileX < 0 || tileX >= this.gameMap.width || tileY < 0 || tileY >= this.gameMap.height) {
            return false;
        }

        // Check if tile is free (not a path and no tower)
        if (this.gameMap.isTileOccupied(x, y)) {
            return false;
        }

        // Check if there's already a tower on this tile
        for (const tower of this.towers) {
            const towerTileX = Math.floor(tower.x / this.gameMap.tileSize);
            const towerTileY = Math.floor(tower.y / this.gameMap.tileSize);
            if (towerTileX === tileX && towerTileY === tileY) {
                return false; // There's already a tower here
            }
        }

        // Get tower configuration
        const towerType = towerTypes[type];
        if (!towerType) {
            return false;
        }

        // Create tower center point
        const centerPoint = this.gameMap.getTileCenter(x, y);

        // Create new tower
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
            selected: false,
            hover: false,
            level: 0,
            upgrades: [],
            angle: 0, // Direction tower is facing
            animationState: 0,
            sellValue: Math.floor(towerType.cost * towerType.sellFactor)
        };

        // Add specific properties for special tower types
        if (type === 'slow') {
            newTower.slowFactor = towerType.slowFactor;
            newTower.slowDuration = towerType.slowDuration;
        } else if (type === 'bomb') {
            newTower.splashRadius = towerType.splashRadius;
        }

        this.towers.push(newTower);
        return true;
    }

    removeTower(towerIndex) {
        if (towerIndex >= 0 && towerIndex < this.towers.length) {
            // Get sell value before removing
            const tower = this.towers[towerIndex];
            const sellValue = tower.sellValue;

            // Remove tower
            this.towers.splice(towerIndex, 1);

            // Return the gold value
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

        // Calculate total cost of upgrades from current level to target level
        let totalCost = 0;
        for (let i = tower.level; i < targetLevel; i++) {
            totalCost += towerType.upgrades[i].cost;
        }

        // Apply all upgrades sequentially
        for (let i = tower.level; i < targetLevel; i++) {
            const upgrade = towerType.upgrades[i];
            tower.upgrades.push(upgrade);

            // Update tower properties
            for (const [key, value] of Object.entries(upgrade)) {
                if (key !== 'name' && key !== 'cost' && key !== 'description') {
                    tower[key] = value;
                }
            }
        }

        // Update tower level
        tower.level = targetLevel;

        // Update sell value (base cost + 70% of upgrade costs)
        tower.sellValue = Math.floor(towerType.cost * towerType.sellFactor);
        tower.upgrades.forEach(upgrade => {
            tower.sellValue += Math.floor(upgrade.cost * towerType.sellFactor);
        });

        return { success: true, cost: totalCost };
    }

    getUpgradeCost(tower, targetLevel) {
        const towerType = towerTypes[tower.type];

        if (!towerType || targetLevel <= tower.level || targetLevel > towerType.upgrades.length) {
            return 0;
        }

        // Calculate total cost of upgrades from current level to target level
        let totalCost = 0;
        for (let i = tower.level; i < targetLevel; i++) {
            totalCost += towerType.upgrades[i].cost;
        }

        return totalCost;
    }

    update(enemies, deltaTime) {
        const currentTime = Date.now();

        // Update towers
        for (const tower of this.towers) {
            // Increment animation state for visual effects
            tower.animationState += deltaTime * 0.001;

            // Find closest target in range
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

            // Update tower angle to face target
            if (tower.target) {
                const targetAngle = Math.atan2(tower.target.y - tower.y, tower.target.x - tower.x);

                // Smooth rotation
                const angleDiff = this.normalizeAngle(targetAngle - tower.angle);
                const rotationSpeed = 10 * deltaTime * 0.001; // Rotations per second

                if (Math.abs(angleDiff) > 0.05) {
                    if (angleDiff > 0 && angleDiff < Math.PI) {
                        tower.angle += Math.min(rotationSpeed, angleDiff);
                    } else {
                        tower.angle -= Math.min(rotationSpeed, Math.PI * 2 - Math.abs(angleDiff));
                    }

                    // Normalize angle between 0 and 2*PI
                    tower.angle = this.normalizeAngle(tower.angle);
                }

                // Fire if cooldown expired
                if (currentTime - tower.lastShot >= tower.fireRate) {
                    tower.lastShot = currentTime;

                    // Number of shots depends on multishot property
                    const shotsCount = tower.multishot || 1;
                    const angleStep = shotsCount > 1 ? 0.2 : 0; // Angle between shots

                    for (let i = 0; i < shotsCount; i++) {
                        // Angle offset for multishot
                        const angleOffset = (i - (shotsCount - 1) / 2) * angleStep;

                        // Calculate target position with offset
                        let targetX = tower.target.x;
                        let targetY = tower.target.y;

                        if (angleOffset !== 0) {
                            const baseAngle = tower.angle;
                            const distance = closestDistance;

                            targetX = tower.x + Math.cos(baseAngle + angleOffset) * distance;
                            targetY = tower.y + Math.sin(baseAngle + angleOffset) * distance;
                        }

                        // Create new projectile
                        this.createProjectile(tower, targetX, targetY, tower.target);
                    }
                }
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];

            // Update projectile position
            if (projectile.type === 'bomb') {
                this.updateBombProjectile(projectile, deltaTime);
            } else {
                this.updateStandardProjectile(projectile, deltaTime);
            }

            // Check if projectile is out of bounds
            if (
                projectile.x < -50 ||
                projectile.x > this.gameMap.width * this.gameMap.tileSize + 50 ||
                projectile.y < -50 ||
                projectile.y > this.gameMap.height * this.gameMap.tileSize + 50
            ) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Check collisions with enemies
            this.checkProjectileCollisions(projectile, enemies, i);
        }
    }

    createProjectile(tower, targetX, targetY, targetEnemy) {
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
            angle: tower.angle, // Direction of travel
            timeAlive: 0
        };

        // Add specific properties for special projectiles
        if (tower.type === 'slow' || tower.effect === 'slow') {
            baseProjectile.slowFactor = tower.slowFactor;
            baseProjectile.slowDuration = tower.slowDuration;
        } else if (tower.type === 'bomb' || tower.effect === 'splash') {
            baseProjectile.splashRadius = tower.splashRadius;
            // Add properties for parabolic trajectory
            baseProjectile.flightHeight = 0;
            baseProjectile.maxHeight = 50;
            baseProjectile.flightProgress = 0;
            baseProjectile.flightDuration = this.calculateFlightDuration(tower.x, tower.y, targetX, targetY, tower.projectileSpeed);
        }

        // Piercing property
        if (tower.pierce) {
            baseProjectile.pierce = tower.pierce;
            baseProjectile.hitEnemies = [];
        }

        this.projectiles.push(baseProjectile);
    }

    calculateFlightDuration(startX, startY, targetX, targetY, speed) {
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance / speed;
    }

    updateStandardProjectile(projectile, deltaTime) {
        // Check if target still exists and update target position
        if (projectile.target && projectile.target.health > 0) {
            projectile.targetX = projectile.target.x;
            projectile.targetY = projectile.target.y;
        }

        // Calculate direction
        const dx = projectile.targetX - projectile.x;
        const dy = projectile.targetY - projectile.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Move projectile
        if (distance > 0) {
            const speed = projectile.speed * deltaTime * 0.06; // Scale by delta time
            const moveDistance = Math.min(distance, speed);

            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;

            projectile.x += normalizedDx * moveDistance;
            projectile.y += normalizedDy * moveDistance;

            // Update angle for visual effects
            projectile.angle = Math.atan2(normalizedDy, normalizedDx);
        }

        projectile.timeAlive += deltaTime;
    }

    updateBombProjectile(projectile, deltaTime) {
        // Update progress of flight
        const flightSpeed = projectile.speed * deltaTime * 0.06; // Scale by delta time
        projectile.timeAlive += deltaTime;

        // Calculate direction to target
        const dx = projectile.targetX - projectile.startX;
        const dy = projectile.targetY - projectile.startY;
        const totalDistance = Math.sqrt(dx * dx + dy * dy);

        // Calculate current position based on straight-line distance traveled
        const distanceTraveled = projectile.timeAlive / projectile.flightDuration * totalDistance;
        const progress = Math.min(distanceTraveled / totalDistance, 1);

        projectile.flightProgress = progress;

        // Linear interpolation for x and y positions
        projectile.x = projectile.startX + dx * progress;
        projectile.y = projectile.startY + dy * progress;

        // Parabolic height (arc) - peak at middle of flight
        projectile.flightHeight = projectile.maxHeight * (4 * progress * (1 - progress));

        // Adjust visual y position based on height
        projectile.visualY = projectile.y - projectile.flightHeight;

        // If reached target, create explosion
        if (progress >= 1) {
            this.createExplosion(projectile);
            // Remove projectile
            const index = this.projectiles.indexOf(projectile);
            if (index !== -1) {
                this.projectiles.splice(index, 1);
            }
        }
    }

    createExplosion(projectile) {
        // Add explosion effect to the game (will be implemented in draw method)
        // Apply damage to all enemies in splash radius

        // This is handled in the collision detection for now
    }

    checkProjectileCollisions(projectile, enemies, projectileIndex) {
        let hitEnemy = false;

        for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];

            // If this is a piercing projectile and it already hit this enemy, skip
            if (projectile.pierce && projectile.hitEnemies && projectile.hitEnemies.includes(j)) {
                continue;
            }

            // Calculate distance for collision detection
            let detectX = projectile.x;
            let detectY = projectile.y;

            // For bomb projectiles, use the visual position for collision
            if (projectile.type === 'bomb' && typeof projectile.visualY !== 'undefined') {
                detectY = projectile.visualY;
            }

            const enemyDx = enemy.x - detectX;
            const enemyDy = enemy.y - detectY;
            const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);

            // Check if projectile hit enemy
            const hitRadius = projectile.size + enemy.size;
            if (enemyDistance < hitRadius) {
                hitEnemy = true;

                // Apply damage
                enemy.health -= projectile.damage;

                // Apply special effects
                if (projectile.effect === 'slow') {
                    if (!enemy.slowed) {
                        enemy.slowed = true;
                        enemy.speed = enemy.baseSpeed * projectile.slowFactor;
                        enemy.slowUntil = Date.now() + projectile.slowDuration;
                    }
                } else if (projectile.effect === 'splash' || projectile.type === 'bomb') {
                    // Create explosion and apply splash damage
                    this.applySplashDamage(enemies, enemy.x, enemy.y, projectile.splashRadius, projectile.damage);
                }

                // If it's a piercing projectile, mark this enemy as hit
                if (projectile.pierce) {
                    if (!projectile.hitEnemies) {
                        projectile.hitEnemies = [];
                    }
                    projectile.hitEnemies.push(j);

                    // If max pierce count reached, remove projectile
                    if (projectile.hitEnemies.length >= projectile.pierce) {
                        this.projectiles.splice(projectileIndex, 1);
                    }

                    break; // Continue to next projectile
                } else if (projectile.type !== 'bomb') { // Bomb projectiles explode on impact with first enemy
                    // Normal projectile: remove after one hit
                    this.projectiles.splice(projectileIndex, 1);
                    break;
                } else {
                    // Bomb projectile: explode and remove
                    this.projectiles.splice(projectileIndex, 1);
                    break;
                }
            }
        }

        return hitEnemy;
    }

    applySplashDamage(enemies, centerX, centerY, radius, baseDamage) {
        // Apply damage to all enemies in radius
        for (const enemy of enemies) {
            const dx = enemy.x - centerX;
            const dy = enemy.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= radius) {
                // Damage falls off with distance
                const damageMultiplier = 1 - (distance / radius) * 0.7; // Min 30% damage at edge
                const damage = baseDamage * damageMultiplier;
                enemy.health -= damage;
            }
        }
    }

    draw(ctx) {
        // Draw tower ranges for selected tower
        for (const tower of this.towers) {
            if (tower.selected || tower.hover) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Draw projectiles (behind towers)
        this.drawProjectiles(ctx);

        // Draw towers
        this.drawTowers(ctx);
    }

    drawTowers(ctx) {
        for (const tower of this.towers) {
            switch (tower.type) {
                case 'basic':
                    this.drawBasicTower(ctx, tower);
                    break;
                case 'sniper':
                    this.drawSniperTower(ctx, tower);
                    break;
                case 'slow':
                    this.drawSlowTower(ctx, tower);
                    break;
                case 'bomb':
                    this.drawBombTower(ctx, tower);
                    break;
                default:
                    this.drawDefaultTower(ctx, tower);
            }

            // Draw tower level indicators
            this.drawTowerLevelIndicators(ctx, tower);
        }
    }

    drawBasicTower(ctx, tower) {
        // Tower base
        ctx.fillStyle = tower.color;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Tower detail (center)
        ctx.fillStyle = '#2980b9';
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw barrels based on tower level
        if (tower.multishot === 2) {
            // Double barrel
            this.drawTowerBarrel(ctx, tower.x, tower.y, tower.angle, -5, tower, 18);
            this.drawTowerBarrel(ctx, tower.x, tower.y, tower.angle, 5, tower, 18);
        } else if (tower.multishot === 3) {
            // Triple barrel
            this.drawTowerBarrel(ctx, tower.x, tower.y, tower.angle, -8, tower, 20);
            this.drawTowerBarrel(ctx, tower.x, tower.y, tower.angle, 0, tower, 22);
            this.drawTowerBarrel(ctx, tower.x, tower.y, tower.angle, 8, tower, 20);
        } else {
            // Single barrel
            this.drawTowerBarrel(ctx, tower.x, tower.y, tower.angle, 0, tower, 20);
        }
    }

    drawSniperTower(ctx, tower) {
        // Tower base
        ctx.fillStyle = tower.color;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Tower detail
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Sniper barrel (longer)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(tower.x, tower.y);

        const barrelLength = 25 + tower.level * 5; // Longer barrel with each level
        ctx.lineTo(
            tower.x + Math.cos(tower.angle) * barrelLength,
            tower.y + Math.sin(tower.angle) * barrelLength
        );
        ctx.stroke();

        // Level 3: Add scope effect
        if (tower.level === 3) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.arc(
                tower.x + Math.cos(tower.angle) * (barrelLength - 5),
                tower.y + Math.sin(tower.angle) * (barrelLength - 5),
                4, 0, Math.PI * 2
            );
            ctx.fill();

            // Laser sight
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(
                tower.x + Math.cos(tower.angle) * barrelLength,
                tower.y + Math.sin(tower.angle) * barrelLength
            );
            ctx.lineTo(
                tower.x + Math.cos(tower.angle) * tower.range,
                tower.y + Math.sin(tower.angle) * tower.range
            );
            ctx.stroke();
        }
    }

    drawSlowTower(ctx, tower) {
        // Frost tower with pulsating effect
        const frostColor = tower.level >= 3 ? '#a5f3fc' : '#1abc9c';
        const time = tower.animationState * 5;
        const pulsateRadius = 10 + Math.sin(time) * 3;

        // Frost aura
        ctx.fillStyle = frostColor;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, pulsateRadius + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Tower base
        ctx.fillStyle = tower.color;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Crystal structure
        ctx.strokeStyle = frostColor;
        ctx.lineWidth = 3;
        const spikes = 3 + tower.level;

        for (let i = 0; i < spikes; i++) {
            const spikeAngle = tower.angle + (i * Math.PI * 2) / spikes;
            ctx.beginPath();
            ctx.moveTo(tower.x, tower.y);
            ctx.lineTo(
                tower.x + Math.cos(spikeAngle) * 15,
                tower.y + Math.sin(spikeAngle) * 15
            );
            ctx.stroke();
        }

        // Frost particles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < spikes; i++) {
            const particleAngle = time + (i * Math.PI * 2) / spikes;
            ctx.beginPath();
            ctx.arc(
                tower.x + Math.cos(particleAngle) * (pulsateRadius - 2),
                tower.y + Math.sin(particleAngle) * (pulsateRadius - 2),
                2,
                0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    drawBombTower(ctx, tower) {
        // Tower base
        ctx.fillStyle = tower.color;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Tower detail
        ctx.fillStyle = '#d35400';
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Mortar barrel (points upward from tower angle)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(tower.x, tower.y);

        // Mortar always points upward at an angle
        const mortarAngle = tower.angle - Math.PI / 4; // 45° upward
        const barrelLength = 15 + tower.level * 3;

        ctx.lineTo(
            tower.x + Math.cos(mortarAngle) * barrelLength,
            tower.y + Math.sin(mortarAngle) * barrelLength
        );
        ctx.stroke();

        // Draw mortar head
        if (tower.level > 0) {
            ctx.fillStyle = tower.color;
            ctx.beginPath();
            ctx.arc(
                tower.x + Math.cos(mortarAngle) * (barrelLength + 3),
                tower.y + Math.sin(mortarAngle) * (barrelLength + 3),
                3 + tower.level, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    drawDefaultTower(ctx, tower) {
        // Fallback tower drawing
        ctx.fillStyle = tower.color;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Simple barrel
        this.drawTowerBarrel(ctx, tower.x, tower.y, tower.angle, 0, tower, 15);
    }

    drawTowerBarrel(ctx, x, y, angle, offset, tower, length = 18) {
        // Offset for multiple barrels
        const perpX = Math.cos(angle + Math.PI / 2) * offset;
        const perpY = Math.sin(angle + Math.PI / 2) * offset;

        // Barrel base
        const startX = x + perpX;
        const startY = y + perpY;

        // Barrel length based on level
        const barrelLength = length + tower.level * 2;

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(
            startX + Math.cos(angle) * barrelLength,
            startY + Math.sin(angle) * barrelLength
        );
        ctx.stroke();
    }

    drawTowerLevelIndicators(ctx, tower) {
        if (tower.level > 0) {
            // Gold indicator rings
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 3;

            for (let i = 0; i < tower.level; i++) {
                ctx.beginPath();
                ctx.arc(tower.x, tower.y, 15 + (i * 4) + 3, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    drawProjectiles(ctx) {
        for (const projectile of this.projectiles) {
            switch (projectile.type) {
                case 'bomb':
                    this.drawBombProjectile(ctx, projectile);
                    break;
                case 'slow':
                    this.drawSlowProjectile(ctx, projectile);
                    break;
                case 'sniper':
                    if (projectile.pierce) {
                        this.drawPiercingProjectile(ctx, projectile);
                    } else {
                        this.drawStandardProjectile(ctx, projectile);
                    }
                    break;
                default:
                    this.drawStandardProjectile(ctx, projectile);
            }
        }
    }

    drawStandardProjectile(ctx, projectile) {
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
        ctx.fill();

        // Movement trail
        ctx.globalAlpha = 0.3;
        const trailLength = 3;
        for (let i = 1; i <= trailLength; i++) {
            const scale = 1 - (i / trailLength);
            ctx.beginPath();
            ctx.arc(
                projectile.x - Math.cos(projectile.angle) * (i * 5),
                projectile.y - Math.sin(projectile.angle) * (i * 5),
                projectile.size * scale,
                0, Math.PI * 2
            );
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawPiercingProjectile(ctx, projectile) {
        // Beam effect for piercing projectiles
        const angle = projectile.angle;

        // Main beam
        ctx.fillStyle = 'rgba(255, 60, 60, 0.7)';
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
        ctx.fill();

        // Glowing beam
        ctx.strokeStyle = 'rgba(255, 60, 60, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(projectile.x - Math.cos(angle) * 12, projectile.y - Math.sin(angle) * 12);
        ctx.lineTo(projectile.x + Math.cos(angle) * 12, projectile.y + Math.sin(angle) * 12);
        ctx.stroke();

        // Particle effects
        ctx.fillStyle = 'rgba(255, 200, 200, 0.7)';
        const time = Date.now() / 200;
        for (let i = 0; i < 3; i++) {
            const particleAngle = time + (i * Math.PI * 2 / 3);
            const dist = 3 + Math.sin(time + i) * 1;
            ctx.beginPath();
            ctx.arc(
                projectile.x + Math.cos(particleAngle) * dist,
                projectile.y + Math.sin(particleAngle) * dist,
                1.5,
                0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    drawSlowProjectile(ctx, projectile) {
        // Pulsating frost effect
        const time = projectile.timeAlive * 0.01;
        const pulseSize = 3 + Math.sin(time) * 1;

        // Frost center
        ctx.fillStyle = '#1abc9c';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();

        // Frost trail
        ctx.globalAlpha = 0.3;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(
                projectile.x - Math.cos(projectile.angle) * (i * 4),
                projectile.y - Math.sin(projectile.angle) * (i * 4),
                pulseSize - i * 0.5,
                0, Math.PI * 2
            );
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Snow particles
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 2; i++) {
            const particleAngle = time * 3 + i * Math.PI;
            ctx.beginPath();
            ctx.arc(
                projectile.x + Math.cos(particleAngle) * 3,
                projectile.y + Math.sin(particleAngle) * 3,
                1,
                0, Math.PI * 2
            );
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawBombProjectile(ctx, projectile) {
        // Get visual y position (with arc)
        const visualY = projectile.visualY || projectile.y;

        // Shadow on ground
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(projectile.x, projectile.y, projectile.size + 2, (projectile.size + 2) * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bomb
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(projectile.x, visualY, projectile.size, 0, Math.PI * 2);
        ctx.fill();

        // Bomb fuse
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(projectile.x, visualY - projectile.size);

        // Wiggling fuse
        const fuseTime = projectile.timeAlive * 0.02;
        const fuseWiggle = Math.sin(fuseTime * 6) * 2;
        const fuseLength = 6 + Math.sin(fuseTime) * 2;

        ctx.bezierCurveTo(
            projectile.x + fuseWiggle, visualY - projectile.size - fuseLength * 0.5,
            projectile.x - fuseWiggle, visualY - projectile.size - fuseLength * 0.7,
            projectile.x + fuseWiggle * 1.5, visualY - projectile.size - fuseLength
        );
        ctx.stroke();

        // Burning fuse tip
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(
            projectile.x + fuseWiggle * 1.5,
            visualY - projectile.size - fuseLength,
            2 + Math.random() * 0.5,
            0, Math.PI * 2
        );
        ctx.fill();
    }

    normalizeAngle(angle) {
        return (angle + Math.PI * 2) % (Math.PI * 2);
    }
}