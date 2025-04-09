// game.js

// Main Game Logic
class Game {
    constructor() {
        // Container-Größe abrufen
        const gameContainer = document.getElementById('gameContainer');
        // Define base dimensions
        const baseWidth = 800;
        const baseHeight = 500;

        // PixiJS-Anwendung erstellen
        this.app = new PIXI.Application({
            width: baseWidth,
            height: baseHeight,
            backgroundColor: 0x7d934c, // Entspricht der Grasfarbe
            resolution: window.devicePixelRatio || 1,
            antialias: true,
            autoDensity: true, // Wichtig für High-DPI-Displays
            // autoResize: false, // Manual resize handling
        });

        // PixiJS-View zum DOM hinzufügen
        gameContainer.appendChild(this.app.view);
        // Ensure the canvas itself has the base size initially
        this.app.renderer.resize(baseWidth, baseHeight);

        // Spielobjekte initialisieren
        this.gameMap = new GameMap(this.app);
        this.towerManager = new TowerManager(this.app, this.gameMap);
        this.enemyManager = new EnemyManager(this.app, this.gameMap.path);
        // Pass 'this' (the Game instance) to UI if UI needs to call game methods like stopGame
        this.gameUI = new GameUI(this.app, this.gameMap, this.towerManager, this.enemyManager);

        // Spielzustand
        this.running = false;

        // Leistungsoptimierung
        this.lastTime = 0;
        this.gameSpeed = 1.0; // Normaler Spielgeschwindigkeit-Multiplikator (kann später angepasst werden)

        // Spiel starten
        this.init();
    }

    init() {
        this.running = true;
        if (this.gameUI) {
            this.gameUI.gameRunning = true; // Set flag in UI too
        }

        // Game-Loop-Funktion für PixiJS einrichten
        this.app.ticker.add(this.gameLoop); // Use the bound method

        // Fenstergröße-Änderung-Event-Listener
        window.addEventListener('resize', this.resize);

        // Initial resize aufrufen
        this.resize();
        console.log("Game initialized.");
    }

    // Ensure gameLoop is bound to 'this' or use an arrow function
    gameLoop = (delta) => { // Using arrow function to preserve 'this'
        if (!this.running) return;

        const now = performance.now(); // Use performance.now for higher precision
        // Use Pixi's deltaMS, adjusted by game speed
        let deltaTime = this.app.ticker.deltaMS * this.gameSpeed;

        // Simple frame skipping if delta is too large (e.g., tabbed out) - optional
        const maxDelta = 100; // Max delta in ms (e.g., 100ms = 10fps)
        if (deltaTime > maxDelta) {
            console.warn(`Large delta detected (${deltaTime.toFixed(0)}ms), capping to ${maxDelta}ms.`);
            deltaTime = maxDelta;
        }

        // Spielobjekte aktualisieren
        this.update(deltaTime); // Pass adjusted delta time

        this.lastTime = now; // Store time for potential future use
    }

    update(deltaTime) {
        // Enemy-Manager aktualisieren
        // Pass callbacks directly
        const cycleComplete = this.enemyManager.update(
            (enemy) => this.gameUI.enemyReachedEnd(enemy), // Callback, wenn Feind entkommt
            (enemy) => this.gameUI.enemyKilled(enemy)      // Callback, wenn Feind getötet wird
        );

        // Tower-Manager aktualisieren
        // Pass the current list of active enemies
        this.towerManager.update(this.enemyManager.enemies, deltaTime);

        // The completion logic and callback are handled within EnemyManager._checkWaveCompletion
        // No need to check cycleComplete here to trigger the next wave schedule,
        // as the onWaveComplete callback passed to EnemyManager handles that.
    }

    resize = () => { // Arrow function for 'this'
        // Keep the internal game resolution fixed at 800x500
        const baseWidth = 800;
        const baseHeight = 500;

        // Get the container size
        const gameContainer = document.getElementById('gameContainer');
        const containerWidth = gameContainer.clientWidth;
        const containerHeight = gameContainer.clientHeight; // Use clientHeight

        // Calculate the best scale factor to fit the base resolution into the container
        const scaleX = containerWidth / baseWidth;
        const scaleY = containerHeight / baseHeight;
        const scale = Math.min(scaleX, scaleY); // Use min to fit aspect ratio

        // Calculate the new display size of the canvas
        const newWidth = baseWidth * scale;
        const newHeight = baseHeight * scale;

        // Apply the new size to the canvas style
        this.app.renderer.view.style.width = `${newWidth}px`;
        this.app.renderer.view.style.height = `${newHeight}px`;

        // Center the canvas within the container (optional)
        const marginLeft = (containerWidth - newWidth) / 2;
        const marginTop = (containerHeight - newHeight) / 2; // Use containerHeight
        this.app.renderer.view.style.marginLeft = `${marginLeft}px`;
        this.app.renderer.view.style.marginTop = `${marginTop}px`;

        // Note: The Pixi renderer size (app.renderer.resize) stays at 800x500.
        // We only change the CSS display size (view.style).
        // Pixi handles the internal scaling automatically based on resolution/autoDensity.
    }


    // Methode zum Einstellen der Spielgeschwindigkeit (für mögliche zukünftige Erweiterungen)
    setGameSpeed(speed) {
        this.gameSpeed = Math.max(0.1, speed); // Ensure speed is positive and not zero
        console.log("Game speed set to:", this.gameSpeed);
    }

    stopGame() {
        if (!this.running) return; // Prevent multiple calls
        this.running = false;
        this.app.ticker.remove(this.gameLoop); // Remove loop from ticker
        console.log("Game loop stopped.");
        // Optional: Additional cleanup or UI disabling
        if (this.gameUI) {
            this.gameUI.gameOver(); // Call UI's game over logic if needed
        }
    }
}

// Spiel initialisieren, wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
    // Make game instance globally accessible for easier debugging/UI access
    window.game = new Game();
});