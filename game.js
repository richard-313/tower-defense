// Main Game Logic
class Game {
    constructor() {
        // Container-Größe abrufen
        const gameContainer = document.getElementById('gameContainer');
        // *** GEÄNDERT: Breite und Höhe ***
        const width = 640;
        const height = 416;

        // PixiJS-Anwendung erstellen
        this.app = new PIXI.Application({
            width: width,
            height: height,
            backgroundColor: 0x7d934c, // Wird von changeMap überschrieben
            resolution: window.devicePixelRatio || 1,
            antialias: true,
            autoDensity: true,
            // Entfernt: autoResize: true // Manuelles Resizing ist implementiert
        });

        // PixiJS-View zum DOM hinzufügen
        if(gameContainer) {
            gameContainer.appendChild(this.app.view);
        } else {
            console.error("Game container not found!");
            document.body.appendChild(this.app.view); // Fallback
        }


        // Sicherstellen, dass die Canvas die richtige Größe hat
        this.app.renderer.resize(width, height);
        this.app.stage.scale.set(1); // Start mit Skalierung 1

        // Spielobjekte initialisieren
        this.gameMap = new GameMap(this.app);
        this.towerManager = new TowerManager(this.app, this.gameMap);
        this.enemyManager = new EnemyManager(this.app, this.gameMap.path);
        // WICHTIG: UI wird *nach* den Managern erstellt, damit Referenzen existieren
        this.gameUI = new GameUI(this.app, this.gameMap, this.towerManager, this.enemyManager);

        // Spielzustand
        this.running = false;

        // Leistungsoptimierung
        this.lastTime = performance.now(); // Verwende performance.now() für präzisere Zeitmessung
        this.gameSpeed = 1.0;

        // Spiel starten
        this.init();
    }

    init() {
        this.running = true;
        this.app.ticker.add(delta => this.gameLoop(delta));
        window.addEventListener('resize', () => this.resize());
        this.resize(); // Initial resize aufrufen
        // Initialisiere Karte und UI mit der Startkarte
        this.gameUI.changeMap(mapConfig.currentMap);
    }

    resize() {
        const gameContainer = document.getElementById('gameContainer');
        if (!gameContainer) return; // Abbruch, falls Container nicht gefunden

        const containerWidth = gameContainer.clientWidth;
        const containerHeight = gameContainer.clientHeight;

        // Renderer an Containergröße anpassen
        this.app.renderer.resize(containerWidth, containerHeight);

        // Original-Spielgröße
        // *** GEÄNDERT: Referenzwerte ***
        const originalWidth = 640;
        const originalHeight = 416;

        // Skalierungsfaktor berechnen
        const scaleX = containerWidth / originalWidth;
        const scaleY = containerHeight / originalHeight;
        const scale = Math.min(scaleX, scaleY); // Gleichmäßige Skalierung

        // Skalierung anwenden
        this.app.stage.scale.set(scale);

        // Zentrieren des Inhalts
        const scaledWidth = originalWidth * scale;
        const scaledHeight = originalHeight * scale;

        this.app.stage.position.x = (containerWidth - scaledWidth) / 2;
        this.app.stage.position.y = (containerHeight - scaledHeight) / 2;
    }

    gameLoop(delta) {
        if (!this.running || this.gameUI.lives <= 0) {
             // Stoppe den Loop, wenn nicht läuft oder Game Over
             // Optional: Ticker stoppen? this.app.ticker.stop();
             return;
        }

        // Verwende Ticker's deltaTime für konsistente Updates bei variabler FPS
        // delta ist ein Faktor, der auf 60 FPS normalisiert ist (1 bei 60 FPS, 2 bei 30 FPS etc.)
        // Zeit in ms: this.app.ticker.deltaMS
        const deltaTime = this.app.ticker.deltaMS * this.gameSpeed; // Zeit in ms, skaliert mit Spielgeschwindigkeit

        // FPS-Begrenzung nicht mehr nötig, da Pixi Ticker das regelt

        // Spielobjekte aktualisieren
        this.update(deltaTime); // Übergebe die skalierte Zeit in ms
    }

    update(deltaTime) { // Nimmt jetzt Millisekunden entgegen
        // Enemy-Manager aktualisieren
        const waveComplete = this.enemyManager.update(
            (enemy) => this.gameUI.enemyReachedEnd(enemy), // Callback, wenn Feind entkommt
            (enemy) => this.gameUI.enemyKilled(enemy)      // Callback, wenn Feind getötet wird
        );

        // Tower-Manager aktualisieren
        // Übergebe deltaTime direkt (Manager sollten mit ms arbeiten)
        this.towerManager.update(this.enemyManager.enemies, deltaTime);

        // Wellenabschluss-Logik wird jetzt vom EnemyManager selbst gehandhabt
        // Der `onWaveComplete` Callback in `startNextWave` löst `scheduleNextWave` aus.
    }

    // Methode zum Einstellen der Spielgeschwindigkeit (für mögliche zukünftige Erweiterungen)
    setGameSpeed(speed) {
        this.gameSpeed = Math.max(0, speed); // Geschwindigkeit kann nicht negativ sein
    }
}

// Spiel initialisieren, wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
    // Globale game Instanz erstellen (wird von TowerManager/EnemyManager evtl. benötigt)
    window.game = new Game();
});