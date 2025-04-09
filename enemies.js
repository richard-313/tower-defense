// Enemy Types and Management
const enemyTypes = {
    normal: {
        name: 'Bauer',
        health: 50,
        speed: 1,
        reward: 10,
        color: '#7f8c8d',
        size: 15
    },
    fast: {
        name: 'Späher',
        health: 30,
        speed: 2,
        reward: 15,
        color: '#9b59b6',
        size: 12
    },
    tank: {
        name: 'Ritter',
        health: 150,
        speed: 0.5,
        reward: 20,
        color: '#2c3e50',
        size: 18
    },
    boss: {
        name: 'Kriegsherr',
        health: 300,
        speed: 0.7,
        reward: 50,
        color: '#c0392b',
        size: 25
    }
};

class EnemyManager {
    constructor(path) {
        this.enemies = [];
        this.path = path;
        this.waveNumber = 0;
        this.waveInProgress = false;
        this.enemiesRemaining = 0;
        this.spawnInterval = null;
        this.autoStartTimer = null;
        this.countdownTime = 0;
        this.onWaveComplete = null; // Add this line to store the callback
    }

    updatePath(newPath) {
        this.path = newPath;
    }

    startNextWave(callback) {
        if (this.waveInProgress) return;

        this.waveNumber++;
        this.waveInProgress = true;
        this.onWaveComplete = callback; // Store the callback for later use

        // Generate wave based on current progress
        this.spawnWave();

        return this.waveNumber;
    }

    spawnWave() {
        const enemiesCount = Math.min(5 + this.waveNumber * 2, 30); // Max 30 enemies per wave
        this.enemiesRemaining = enemiesCount;
        let enemiesSpawned = 0;

        // Different enemy types depending on wave
        const availableTypes = [];
        availableTypes.push('normal');

        if (this.waveNumber >= 3) availableTypes.push('fast');
        if (this.waveNumber >= 5) availableTypes.push('tank');
        if (this.waveNumber >= 8 && this.waveNumber % 5 === 0) availableTypes.push('boss');

        // Spawn timer for enemies
        clearInterval(this.spawnInterval);
        this.spawnInterval = setInterval(() => {
            if (enemiesSpawned >= enemiesCount) {
                clearInterval(this.spawnInterval);
                return;
            }

            // Choose random enemy type
            const randomTypeIndex = Math.floor(Math.random() * availableTypes.length);
            const enemyType = availableTypes[randomTypeIndex];
            const enemyData = enemyTypes[enemyType];

            // Scale health with wave number
            let health = enemyData.health;
            if (this.waveNumber > 1) {
                health += Math.round(health * (this.waveNumber - 1) * 0.2);
            }

            // Create new enemy
            const newEnemy = {
                x: this.path[0].x,
                y: this.path[0].y,
                type: enemyType,
                typeName: enemyData.name,
                health: health,
                maxHealth: health,
                speed: enemyData.speed,
                baseSpeed: enemyData.speed, // Store original speed for slow effects
                size: enemyData.size,
                color: enemyData.color,
                reward: enemyData.reward,
                pathIndex: 0,
                slowed: false,
                slowUntil: 0,
                effects: [] // For visual effects like slow, poison, etc.
            };

            this.enemies.push(newEnemy);
            enemiesSpawned++;
        }, 800); // Spawn enemy every 800ms
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
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Check if slow effect has expired
            if (enemy.slowed && Date.now() > enemy.slowUntil) {
                enemy.slowed = false;
                enemy.speed = enemy.baseSpeed; // Restore original speed
            }

            // Calculate target direction on path
            const targetPoint = this.path[enemy.pathIndex];
            const dx = targetPoint.x - enemy.x;
            const dy = targetPoint.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If close enough to waypoint, move to next waypoint
            if (distance < enemy.speed * 2) {
                enemy.pathIndex++;

                // If end of path reached
                if (enemy.pathIndex >= this.path.length) {
                    // Enemy escapes, player loses lives
                    onEnemyEscape(enemy);

                    // Remove enemy
                    this.enemies.splice(i, 1);
                    this.enemiesRemaining--;
                    continue;
                }
            }

            // Move enemy to current waypoint
            const newTargetPoint = this.path[enemy.pathIndex];
            const newDx = newTargetPoint.x - enemy.x;
            const newDy = newTargetPoint.y - enemy.y;
            const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);

            // Normalized direction
            if (newDistance > 0) {
                const dirX = newDx / newDistance;
                const dirY = newDy / newDistance;

                // Move enemy
                enemy.x += dirX * enemy.speed;
                enemy.y += dirY * enemy.speed;
            }

            // Remove enemy if it's dead
            if (enemy.health <= 0) {
                // Give gold for killing the enemy
                onEnemyDeath(enemy);

                this.enemies.splice(i, 1);
                this.enemiesRemaining--;
            }
        }

        // Check if wave is complete
        if (this.waveInProgress && this.enemies.length === 0 && this.enemiesRemaining <= 0) {
            this.waveInProgress = false;
            return true; // Wave complete
        }

        return false; // Wave still in progress
    }

    applyEffect(enemy, effect, duration, value) {
        switch (effect) {
            case 'slow':
                enemy.slowed = true;
                enemy.baseSpeed = enemy.baseSpeed || enemy.speed; // Store original speed if not stored
                enemy.speed = enemy.baseSpeed * value; // Slow by factor
                enemy.slowUntil = Date.now() + duration;

                // Add visual effect
                enemy.effects.push({
                    type: 'slow',
                    until: enemy.slowUntil
                });
                break;

            // Add more effects here as needed
        }
    }

    draw(ctx) {
        this.enemies.forEach(enemy => {
            // Health bar
            const healthPercentage = enemy.health / enemy.maxHealth;
            ctx.fillStyle = 'red';
            ctx.fillRect(
                enemy.x - enemy.size,
                enemy.y - enemy.size - 10,
                enemy.size * 2,
                5
            );
            ctx.fillStyle = 'green';
            ctx.fillRect(
                enemy.x - enemy.size,
                enemy.y - enemy.size - 10,
                enemy.size * 2 * healthPercentage,
                5
            );

            // Draw different enemy types
            this.drawEnemyByType(ctx, enemy);

            // Show slow effect
            if (enemy.slowed) {
                ctx.strokeStyle = '#1abc9c';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.size + 3, 0, Math.PI * 2);
                ctx.stroke();

                // Snow particles
                const time = Date.now() / 300;
                for (let i = 0; i < 3; i++) {
                    const angle = time + i * Math.PI * 2 / 3;
                    const dist = 5 + Math.sin(time * 2) * 2;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.beginPath();
                    ctx.arc(
                        enemy.x + Math.cos(angle) * dist,
                        enemy.y + Math.sin(angle) * dist,
                        1.5,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        });
    }

    drawEnemyByType(ctx, enemy) {
        switch (enemy.type) {
            case 'normal': // Basic peasant
                this.drawNormalEnemy(ctx, enemy);
                break;

            case 'fast': // Scout
                this.drawFastEnemy(ctx, enemy);
                break;

            case 'tank': // Knight
                this.drawTankEnemy(ctx, enemy);
                break;

            case 'boss': // Warlord
                this.drawBossEnemy(ctx, enemy);
                break;

            default:
                // Fallback to simple circle
                ctx.fillStyle = enemy.color;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
                ctx.fill();
        }
    }

    drawNormalEnemy(ctx, enemy) {
        // Body
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();

        // Face
        ctx.fillStyle = '#f5d7b5'; // Skin tone
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 2, enemy.size * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Hat
        ctx.fillStyle = '#964B00';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - enemy.size * 0.5, enemy.size * 0.7, Math.PI, Math.PI * 2);
        ctx.fill();
    }

    drawFastEnemy(ctx, enemy) {
        const moveAngle = Math.atan2(
            this.path[enemy.pathIndex].y - enemy.y,
            this.path[enemy.pathIndex].x - enemy.x
        );

        // Movement trail
        ctx.fillStyle = 'rgba(155, 89, 182, 0.3)';
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(
                enemy.x - Math.cos(moveAngle) * (i * 5),
                enemy.y - Math.sin(moveAngle) * (i * 5),
                enemy.size - i * 2,
                0, Math.PI * 2
            );
            ctx.fill();
        }

        // Body
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();

        // Cape
        ctx.fillStyle = '#8e44ad';
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(
            enemy.x - Math.cos(moveAngle) * enemy.size * 1.5,
            enemy.y - Math.sin(moveAngle) * enemy.size * 1.5
        );
        ctx.lineTo(
            enemy.x - Math.cos(moveAngle) * enemy.size * 1.2 + Math.sin(moveAngle) * enemy.size * 0.8,
            enemy.y - Math.sin(moveAngle) * enemy.size * 1.2 - Math.cos(moveAngle) * enemy.size * 0.8
        );
        ctx.lineTo(
            enemy.x - Math.cos(moveAngle) * enemy.size * 1.2 - Math.sin(moveAngle) * enemy.size * 0.8,
            enemy.y - Math.sin(moveAngle) * enemy.size * 1.2 + Math.cos(moveAngle) * enemy.size * 0.8
        );
        ctx.closePath();
        ctx.fill();
    }

    drawTankEnemy(ctx, enemy) {
        // Shield
        ctx.fillStyle = '#34495e';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();

        // Shield details
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size - 3, 0, Math.PI * 2);
        ctx.stroke();

        // Helmet
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 2, enemy.size * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Face slit in helmet
        ctx.fillStyle = 'black';
        ctx.fillRect(enemy.x - enemy.size * 0.4, enemy.y - 5, enemy.size * 0.8, 3);
    }

    drawBossEnemy(ctx, enemy) {
        const time = Date.now() / 300;

        // Aura
        ctx.fillStyle = 'rgba(192, 57, 43, 0.2)';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size * 1.5 + Math.sin(time) * 3, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();

        // Crown
        ctx.fillStyle = 'gold';
        const crownHeight = enemy.size * 0.6;
        ctx.beginPath();
        ctx.moveTo(enemy.x - enemy.size * 0.6, enemy.y - enemy.size * 0.5);
        ctx.lineTo(enemy.x - enemy.size * 0.6, enemy.y - enemy.size * 0.5 - crownHeight * 0.6);
        ctx.lineTo(enemy.x - enemy.size * 0.4, enemy.y - enemy.size * 0.5 - crownHeight * 0.3);
        ctx.lineTo(enemy.x - enemy.size * 0.2, enemy.y - enemy.size * 0.5 - crownHeight * 0.8);
        ctx.lineTo(enemy.x, enemy.y - enemy.size * 0.5 - crownHeight * 0.4);
        ctx.lineTo(enemy.x + enemy.size * 0.2, enemy.y - enemy.size * 0.5 - crownHeight * 0.8);
        ctx.lineTo(enemy.x + enemy.size * 0.4, enemy.y - enemy.size * 0.5 - crownHeight * 0.3);
        ctx.lineTo(enemy.x + enemy.size * 0.6, enemy.y - enemy.size * 0.5 - crownHeight * 0.6);
        ctx.lineTo(enemy.x + enemy.size * 0.6, enemy.y - enemy.size * 0.5);
        ctx.closePath();
        ctx.fill();

        // Face
        ctx.fillStyle = '#7d241e';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Evil eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(enemy.x - enemy.size * 0.25, enemy.y - enemy.size * 0.1, 4, 0, Math.PI * 2);
        ctx.arc(enemy.x + enemy.size * 0.25, enemy.y - enemy.size * 0.1, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(enemy.x - enemy.size * 0.25, enemy.y - enemy.size * 0.1, 2, 0, Math.PI * 2);
        ctx.arc(enemy.x + enemy.size * 0.25, enemy.y - enemy.size * 0.1, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}