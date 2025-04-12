// --- START OF FILE game.js ---
// Main Game Logic
class Game {
    constructor() {
        // Get wrapper container size (will be set by CSS based on tileSize)
        const gameCanvasWrapper = document.getElementById('gameCanvasWrapper');
        const containerElement = document.getElementById('gameContainer'); // Pixi canvas goes here

        // *** Use dimensions from config based on tileSize ***
        const width = mapConfig.width * mapConfig.tileSize; // e.g., 20 * 40 = 800
        const height = mapConfig.height * mapConfig.tileSize; // e.g., 13 * 40 = 520

        // Set wrapper size explicitly (optional, CSS can also handle this)
        if (gameCanvasWrapper) {
            gameCanvasWrapper.style.width = `${width}px`;
            gameCanvasWrapper.style.height = `${height}px`;
        } else {
            console.warn("Game canvas wrapper not found, using default size.");
        }


        // PixiJS-Anwendung erstellen
        this.app = new PIXI.Application({
            width: width,
            height: height,
            backgroundColor: 0x7d934c, // Wird von changeMap überschrieben
            resolution: window.devicePixelRatio || 1,
            antialias: true,
            autoDensity: true,
        });

        // PixiJS-View zum DOM hinzufügen
        if (containerElement) { // Add to the inner container
            containerElement.appendChild(this.app.view);
        } else {
            console.error("Game container element not found!");
            document.body.appendChild(this.app.view); // Fallback
        }


        // Spielobjekte initialisieren
        this.gameMap = new GameMap(this.app);
        this.towerManager = new TowerManager(this.app, this.gameMap);
        this.enemyManager = new EnemyManager(this.app, this.gameMap.path);
        // UI after managers
        this.gameUI = new GameUI(this.app, this.gameMap, this.towerManager, this.enemyManager);

        // Spielzustand
        this.running = false;
        this.gameSpeed = 1.0;

        // Spiel starten
        this.init();
    }

    init() {
        this.running = true;
        this.app.ticker.add(delta => this.gameLoop(delta));
        // Resize listener might not be strictly necessary if container size is fixed
        // window.addEventListener('resize', () => this.resize());
        // this.resize();
        // Initialisiere Karte und UI mit der Startkarte
        this.gameUI.changeMap(mapConfig.currentMap); // Load default map
        this.gameUI.setLanguage(currentLanguage); // Apply initial language
    }

    // resize() {
    // // Basic resize if needed, might remove if layout is fixed
    // const gameCanvasWrapper = document.getElementById('gameCanvasWrapper');
    // if (!gameCanvasWrapper) return;
    // const containerWidth = gameCanvasWrapper.clientWidth;
    // const containerHeight = gameCanvasWrapper.clientHeight;
    // this.app.renderer.resize(containerWidth, containerHeight);
    // // No scaling needed if renderer matches container exactly
    // this.app.stage.scale.set(1);
    // this.app.stage.position.set(0, 0);
    // }


    gameLoop(delta) {
        if (!this.running || this.gameUI.lives <= 0) {
            // Stoppe den Countdown-Timer, wenn das Spiel nicht läuft oder Game Over ist
            if (this.enemyManager && this.enemyManager.autoStartTimer) {
                this.enemyManager.cancelWaveTimer();
                // Stelle sicher, dass der Button-Text ggf. auf "Bereit" zurückgesetzt wird
                if (this.gameUI && this.gameUI.countdownElement) {
                    const readyKey = this.gameUI.countdownElement.getAttribute('data-translate-ready') || 'ui.waveReady';
                    this.gameUI.countdownElement.textContent = t(readyKey);
                }
            }
            // Aktualisiere die UI ein letztes Mal, um den Button-Status (disabled bei Game Over) zu setzen
            if (this.gameUI && this.gameUI.lives <= 0) {
                this.gameUI.updateUI(); // Ensure button is disabled on game over
            }
            return; // Stop the game loop execution here
        }
        const deltaTime = this.app.ticker.deltaMS * this.gameSpeed;
        this.update(deltaTime);
    }

    update(deltaTime) {
        // *** HIER DIE ÄNDERUNG ***
        // Führe EnemyManager Update aus und speichere das Ergebnis
        const waveJustCompleted = this.enemyManager.update(
            (enemy) => this.gameUI.enemyReachedEnd(enemy),
            (enemy) => this.gameUI.enemyKilled(enemy)
        );

        // Aktualisiere Türme
        this.towerManager.update(this.enemyManager.enemies, deltaTime);

        // *** NEU: Explizite UI-Aktualisierung, wenn die Welle *gerade eben* abgeschlossen wurde ***
        if (waveJustCompleted) {
            // console.log("Game loop detected wave completion, forcing UI update."); // Debugging
            // Die scheduleNextWave Funktion (die onWaveComplete-Callback ist)
            // wird ebenfalls updateUI aufrufen, aber dieser Aufruf hier stellt
            // sicher, dass es sofort nach dem Ende der Gegner-Updates passiert.
            this.gameUI.updateUI();
            // Starte auch den visuellen Countdown neu bzw. setze Text auf "Bereit"
            this.gameUI.updateCountdown();
        }
        // --- Ende der Änderung ---
    }

    setGameSpeed(speed) {
        this.gameSpeed = Math.max(0, speed);
    }
}

// Globale game Instanz erstellen
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
// --- END OF FILE game.js ---