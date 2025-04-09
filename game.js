// Main Game Logic
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize game objects
        this.gameMap = new GameMap();
        this.towerManager = new TowerManager(this.gameMap);
        this.enemyManager = new EnemyManager(this.gameMap.path);
        this.gameUI = new GameUI(this.gameMap, this.towerManager, this.enemyManager);

        // Game state
        this.running = false;
        this.lastFrameTime = 0;

        // Start the game
        this.init();
    }

    init() {
        this.running = true;

        // Begin game loop
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    gameLoop(timestamp) {
        if (!this.running) return;

        // Calculate delta time (time since last frame)
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        // Update game objects
        this.update(deltaTime);

        // Render game
        this.render();

        // Request next frame
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    update(deltaTime) {
        // Update enemy manager
        const waveComplete = this.enemyManager.update(
            (enemy) => this.gameUI.enemyReachedEnd(enemy), // Enemy escaped callback
            (enemy) => this.gameUI.enemyKilled(enemy)      // Enemy killed callback
        );

        // Check if wave is complete and the wave completion callback should be triggered
        if (waveComplete && this.enemyManager.waveInProgress === false) {
            // This is the key change - if the wave is now complete, trigger the callback
            // The callback was provided to startNextWave() but we need to store and use it
            if (this.enemyManager.onWaveComplete) {
                this.enemyManager.onWaveComplete();
            }
        }

        // Update tower manager
        this.towerManager.update(this.enemyManager.enemies, deltaTime);
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw map
        this.gameMap.draw(this.ctx);

        // Draw towers and projectiles
        this.towerManager.draw(this.ctx);

        // Draw enemies
        this.enemyManager.draw(this.ctx);

        // Draw tower placement preview
        this.gameUI.drawTowerPreview(this.ctx);
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});