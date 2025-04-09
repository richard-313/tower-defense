// Main Game Logic
class Game {
    constructor() {
        // Container-Größe abrufen
        const gameContainer = document.getElementById('gameContainer');
        const width = 800;
        const height = 500;

        // PixiJS-Anwendung erstellen
        this.app = new PIXI.Application({
            width: width,
            height: height,
            backgroundColor: 0x7d934c, // Entspricht der Grasfarbe
            resolution: window.devicePixelRatio || 1,
            antialias: true,
            autoDensity: true, // Wichtig für High-DPI-Displays
            autoResize: true // Automatische Größenanpassung
        });

        // PixiJS-View zum DOM hinzufügen
        gameContainer.appendChild(this.app.view);

        // Sicherstellen, dass die Canvas die richtige Größe hat
        this.app.renderer.resize(width, height);
        this.app.stage.scale.set(1);

        // Spielobjekte initialisieren
        this.gameMap = new GameMap(this.app);
        this.towerManager = new TowerManager(this.app, this.gameMap);
        this.enemyManager = new EnemyManager(this.app, this.gameMap.path);
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

        // Game-Loop-Funktion für PixiJS einrichten
        this.app.ticker.add(delta => this.gameLoop(delta));

        // Fenstergröße-Änderung-Event-Listener
        window.addEventListener('resize', () => this.resize());

        // Initial resize aufrufen
        this.resize();
    }

    resize() {
        // Container-Größe abrufen
        const gameContainer = document.getElementById('gameContainer');
        const containerWidth = gameContainer.clientWidth;
        const containerHeight = gameContainer.clientHeight;

        // Sicherstellen, dass die Anwendung die Container-Größe füllt
        this.app.renderer.resize(containerWidth, containerHeight);

        // Optional: Spielinhalte skalieren, um im Container zu passen
        // Dies kann je nach Spieldesign unterschiedlich sein
        const scaleX = containerWidth / 800;
        const scaleY = containerHeight / 500;
        const scale = Math.min(scaleX, scaleY);

        // Anwenden der Skalierung auf die Stage, falls nötig
        this.app.stage.scale.set(1); // Oder scale verwenden, wenn gewünscht

        // Optional: Zentrieren des Inhalts
        const scaledWidth = 800 * this.app.stage.scale.x;
        const scaledHeight = 500 * this.app.stage.scale.y;

        this.app.stage.position.x = (containerWidth - scaledWidth) / 2;
        this.app.stage.position.y = (containerHeight - scaledHeight) / 2;
    }

    gameLoop(delta) {
        if (!this.running) return;

        // Aktuelle Zeit abrufen für konsistente Ticks
        const now = Date.now();
        let deltaTime = this.app.ticker.deltaMS;

        // Spielgeschwindigkeit anwenden
        deltaTime *= this.gameSpeed;

        // FPS-Begrenzung für konsistente Physik
        if (now - this.lastTime < 16) {
            // Maximal 60 FPS (16ms pro Frame)
            return;
        }
        this.lastTime = now;

        // Spielobjekte aktualisieren
        this.update(deltaTime);
    }

    update(deltaTime) {
        // Enemy-Manager aktualisieren
        const waveComplete = this.enemyManager.update(
            (enemy) => this.gameUI.enemyReachedEnd(enemy), // Callback, wenn Feind entkommt
            (enemy) => this.gameUI.enemyKilled(enemy)      // Callback, wenn Feind getötet wird
        );

        // Prüfen, ob Welle abgeschlossen ist und der Wellen-Abschluss-Callback ausgelöst werden sollte
        if (waveComplete && this.enemyManager.waveInProgress === false) {
            // Das ist die wichtige Änderung - wenn die Welle jetzt abgeschlossen ist, den Callback auslösen
            // Der Callback wurde bei startNextWave() bereitgestellt, aber wir müssen ihn speichern und verwenden
            if (this.enemyManager.onWaveComplete) {
                this.enemyManager.onWaveComplete();
            }
        }

        // Tower-Manager aktualisieren
        this.towerManager.update(this.enemyManager.enemies, deltaTime);
    }

    // Methode zum Einstellen der Spielgeschwindigkeit (für mögliche zukünftige Erweiterungen)
    setGameSpeed(speed) {
        this.gameSpeed = speed;
    }
}

// Spiel initialisieren, wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});