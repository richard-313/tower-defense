// ui.js

// UI Management and User Interactions
class GameUI {
    constructor(app, gameMap, towerManager, enemyManager) {
        this.app = app;
        this.gameMap = gameMap;
        this.towerManager = towerManager;
        this.enemyManager = enemyManager;

        this.gold = 100;
        this.lives = 10;
        this.selectedTowerForUpgrade = null;

        // Parameter für die Turmauswahl per Radialmenü
        this.selectedTileX = null;
        this.selectedTileY = null;
        this.clickX = null;
        this.clickY = null;

        // Mausposition-Tracking
        this.mouseX = null;
        this.mouseY = null;
        this.mouseX_unscaled = null; // Für UI-Element-Platzierung
        this.mouseY_unscaled = null;

        // UI-Elemente
        this.livesElement = document.getElementById('lives');
        this.goldElement = document.getElementById('gold');
        this.waveElement = document.getElementById('wave');
        this.startWaveButton = document.getElementById('startWave');
        this.countdownElement = document.getElementById('wave-countdown'); // ID korrigiert

        // Radial-Menü-Element
        this.radialMenu = document.getElementById('radialTowerMenu');
        this.radialCancelButton = document.getElementById('radialCancelButton');

        // Turm-Optionen im Radialmenü
        this.radialTowerOptions = {
            basic: document.getElementById('radialBasicTower'),
            sniper: document.getElementById('radialSniperTower'),
            slow: document.getElementById('radialSlowTower'),
            bomb: document.getElementById('radialBombTower'),
            lightning: document.getElementById('radialLightningTower')
        };

        // Aktualisiere die Kosten in den data-cost Attributen
        this.updateTowerCostsInMenu();


        // Karten-Buttons
        this.mapButtons = {
            map1: document.getElementById('map1'),
            map2: document.getElementById('map2'),
            map3: document.getElementById('map3')
        };

        // Upgrade-Panel-Elemente
        this.upgradePanel = document.getElementById('upgradePanel');
        this.towerInfo = document.getElementById('towerInfo');
        this.upgradeProgressDiv = document.getElementById('currentLevel'); // Container für den Pfad
        this.upgradeDirectlyButton = document.getElementById('upgradeDirectly');
        this.targetLevelSpan = this.upgradeDirectlyButton.querySelector('#targetLevel'); // Im Button
        this.upgradeCostSpan = this.upgradeDirectlyButton.querySelector('#upgradeCost'); // Im Button
        this.sellTowerButton = document.getElementById('sellTower');
        this.sellValueSpan = this.sellTowerButton.querySelector('#sellValue'); // Im Button
        this.closeUpgradeButton = document.getElementById('closeUpgrade');

        this.initEventListeners();
        this.updateUI();
    }

    // Hilfsfunktion zum Aktualisieren der Kosten im Radialmenü
    updateTowerCostsInMenu() {
        for (const type in this.radialTowerOptions) {
            const element = this.radialTowerOptions[type];
            if (element && towerTypes[type]) { // Prüfen ob Element und Typ existieren
                element.setAttribute('data-cost', towerTypes[type].cost);
            }
        }
    }

    initEventListeners() {
        // Events für Turm-Optionen im Radialmenü
        for (const [type, element] of Object.entries(this.radialTowerOptions)) {
            if (!element) continue;
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectTowerFromRadial(type);
            });
        }
        // Event für den Cancel-Button
        if (this.radialCancelButton) {
            this.radialCancelButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideRadialMenu();
            });
        }


        // Kartenauswahlbuttons
        for (const [mapId, button] of Object.entries(this.mapButtons)) {
            button.addEventListener('click', () => this.changeMap(mapId));
        }

        // PixiJS-Container-Events
        if (this.app.view) {
            this.app.view.addEventListener('click', (e) => this.handleCanvasClick(e));
            this.app.view.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
            // Verhindern, dass das Kontextmenü im Canvas erscheint
            this.app.view.addEventListener('contextmenu', (e) => e.preventDefault());
        }


        // Wellenkontrolle
        if (this.startWaveButton) {
            this.startWaveButton.addEventListener('click', () => this.startNextWave());
        }

        // Upgrade-Panel-Steuerung
        if (this.upgradeDirectlyButton) {
            this.upgradeDirectlyButton.addEventListener('click', () => this.upgradeTower());
        }
        if (this.sellTowerButton) {
            this.sellTowerButton.addEventListener('click', () => this.sellTower());
        }
        if (this.closeUpgradeButton) {
            this.closeUpgradeButton.addEventListener('click', () => this.closeUpgradePanel());
        }


        // Event-Listener, um Menüs zu schließen, wenn außerhalb geklickt wird
        document.addEventListener('click', (e) => {
            // Schließe Radialmenü
            if (this.radialMenu && this.radialMenu.style.display === 'block' && !this.radialMenu.contains(e.target) && e.target !== this.app.view) {
                this.hideRadialMenu();
            }
            // Schließe Upgrade Panel (wenn nicht auf Turm oder Panel selbst geklickt)
            const isClickOnTower = this.towerManager.getTowerAt(this.mouseX, this.mouseY); // Prüfe an aktueller Mausposition
            if (this.upgradePanel && this.upgradePanel.style.display === 'block' && !this.upgradePanel.contains(e.target) && e.target !== this.app.view && !isClickOnTower) {
                this.closeUpgradePanel();
            }
        });
    }

    changeMap(mapId) {
        // Karte nur ändern, wenn keine Feinde aktiv sind
        if (this.enemyManager.enemies.length > 0 || this.enemyManager.enemiesRemaining > 0) {
            alert("Kann die Karte nicht während einer laufenden Welle wechseln!");
            return;
        }

        // Kartenbutton-Auswahl aktualisieren
        for (const button of Object.values(this.mapButtons)) {
            button.classList.remove('selected');
        }
        this.mapButtons[mapId].classList.add('selected');

        // Spielzustand zurücksetzen (ruft auch enemyManager.resetGame)
        this.resetGame();

        // Neue Karte setzen
        this.gameMap.setMap(mapId);

        // Manager mit neuer Karte aktualisieren
        this.towerManager.updateMap(this.gameMap);
        this.enemyManager.updatePath(this.gameMap.path);

        // Hintergrundfarbe des Canvas anpassen
        const bgColor = this.gameMap.currentMapDesign?.terrainColors?.empty || 0x7d934c;
        this.app.renderer.background.color = bgColor;
        // Und des Containers dahinter
        const canvasContainer = document.getElementById('gameContainer')?.querySelector('.game-canvas-container');
        if (canvasContainer) {
            const cssColor = '#' + bgColor.toString(16).padStart(6, '0');
            canvasContainer.style.backgroundColor = cssColor;
        }
    }

    resetGame() {
        this.gold = 100;
        this.lives = 10;

        // Wichtig: Rufe die resetGame Methode des EnemyManagers auf!
        this.enemyManager.resetGame(); // Stoppt Intervalle, leert Gegner etc.

        // Türme entfernen
        for (let i = this.towerManager.towers.length - 1; i >= 0; i--) {
            this.towerManager.removeTower(i);
        }
        this.towerManager.towers = [];

        // Projektile entfernen
        for (let i = this.towerManager.projectiles.length - 1; i >= 0; i--) {
            this.towerManager.removeProjectile(i);
        }
        this.towerManager.projectiles = [];

        // UI-Zustand zurücksetzen
        this.selectedTowerForUpgrade = null;
        this.updateUI(); // Aktualisiert Gold, Leben, Welle (auf 0)
        if (this.countdownElement) this.countdownElement.textContent = 'Bereit';

        // Menüs schließen
        this.hideRadialMenu();
        this.closeUpgradePanel();

        // Start-Button wieder aktivieren (falls deaktiviert war)
        if (this.startWaveButton) this.startWaveButton.disabled = false;
    }


    showRadialMenu(x, y) {
        if (!this.radialMenu) return; // Sicherheitscheck

        // Klick-Position für die spätere Platzierung speichern (Spielkoordinaten)
        this.clickX = x;
        this.clickY = y;

        // Kachelkoordinaten berechnen (nicht mehr direkt verwendet, aber ggf. nützlich)
        // const tileX = Math.floor(x / this.gameMap.tileSize);
        // const tileY = Math.floor(y / this.gameMap.tileSize);
        // this.selectedTileX = tileX;
        // this.selectedTileY = tileY;

        // Globale Fensterkoordinaten berechnen
        const rect = this.app.view.getBoundingClientRect();
        const globalX = x * this.app.stage.scale.x + rect.left + this.app.stage.x;
        const globalY = y * this.app.stage.scale.y + rect.top + this.app.stage.y;


        // Radialmenü genau an die Mausposition setzen
        this.radialMenu.style.left = `${globalX}px`;
        this.radialMenu.style.top = `${globalY}px`;
        this.radialMenu.style.display = 'block';

        // Verfügbare Türme basierend auf Gold aktivieren/deaktivieren
        this.updateRadialMenuAvailability();
    }

    hideRadialMenu() {
        if (!this.radialMenu) return;
        this.radialMenu.style.display = 'none';
        this.clickX = null;
        this.clickY = null;
    }

    updateRadialMenuAvailability() {
        if (!this.radialMenu || this.radialMenu.style.display === 'none') return; // Nur wenn Menü sichtbar
        for (const [type, element] of Object.entries(this.radialTowerOptions)) {
            if (!element || !towerTypes[type]) continue;
            if (this.gold < towerTypes[type].cost) {
                element.classList.add('disabled');
            } else {
                element.classList.remove('disabled');
            }
        }
    }

    selectTowerFromRadial(type) {
        if (!towerTypes[type]) return;
        if (this.gold < towerTypes[type].cost) {
            console.log("Nicht genug Gold!");
            this.hideRadialMenu();
            return;
        }

        if (this.clickX !== null && this.clickY !== null) {
            if (this.placeTower(type, this.clickX, this.clickY)) {
                this.gold -= towerTypes[type].cost;
                this.updateUI();
                this.hideRadialMenu();
            } else {
                // Platzierung fehlgeschlagen (z.B. belegt)
                this.hideRadialMenu();
                // console.log("Platzierung nicht möglich.");
            }
        } else {
            console.error("Klickposition für Turmplatzierung nicht gespeichert.");
            this.hideRadialMenu();
        }
    }

    handleCanvasClick(event) {
        if (!this.app.view) return;

        const rect = this.app.view.getBoundingClientRect();
        const clickX = (event.clientX - rect.left - this.app.stage.x) / this.app.stage.scale.x;
        const clickY = (event.clientY - rect.top - this.app.stage.y) / this.app.stage.scale.y;

        // Prüfen, ob auf einen bestehenden Turm geklickt wurde
        const towerResult = this.towerManager.getTowerAt(clickX, clickY);
        if (towerResult) {
            // Upgrade-Panel anzeigen
            const panelX = event.clientX - rect.left; // Unskalierte Position für Panel
            const panelY = event.clientY - rect.top;
            this.showUpgradePanel(towerResult.tower, towerResult.index, panelX, panelY);
            this.hideRadialMenu(); // Radialmenü schließen
            return;
        }

        // Prüfen, ob die Kachel für einen Turm geeignet ist (nicht Pfad)
        if (!this.gameMap.isTileOccupied(clickX, clickY)) {
            this.showRadialMenu(clickX, clickY); // Radialmenü anzeigen
            this.closeUpgradePanel(); // Upgrade-Panel schließen
        } else {
            // Klick auf ungültige Stelle -> Menüs schließen
            this.hideRadialMenu();
            this.closeUpgradePanel();
        }
    }

    handleCanvasMouseMove(event) {
        if (!this.app.view) return;

        const rect = this.app.view.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left - this.app.stage.x) / this.app.stage.scale.x;
        const mouseY = (event.clientY - rect.top - this.app.stage.y) / this.app.stage.scale.y;

        this.mouseX_unscaled = event.clientX - rect.left;
        this.mouseY_unscaled = event.clientY - rect.top;
        this.mouseX = mouseX;
        this.mouseY = mouseY;

        // Hover-Zustand für Türme aktualisieren
        let towerHovered = false;
        for (const tower of this.towerManager.towers) {
            if (!tower || !tower.container || tower.container._destroyed) continue;
            const dx = tower.x - mouseX;
            const dy = tower.y - mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const hoverRadius = this.gameMap.tileSize * 0.5; // Hover-Bereich = Kachelgröße

            if (distance <= hoverRadius) {
                tower.hover = true;
                towerHovered = true;
            } else {
                tower.hover = false;
            }
        }

        // Reichweitenkreise nur aktualisieren, wenn sich der Hover-Status geändert hat
        // (Optimierung, um nicht bei jeder Mausbewegung neu zu zeichnen)
        // Dies erfordert, den vorherigen Hover-Status zu speichern, oder einfach immer updaten:
        this.towerManager.updateRangeCircles();
    }

    placeTower(type, x, y) {
        return this.towerManager.addTower(type, x, y);
    }

    startNextWave() {
        // Nur prüfen, ob das Spiel vorbei ist
        if (this.lives <= 0) {
            console.log("Spiel vorbei, keine Wellen mehr starten.");
            return;
        }

        // Nächste Welle *immer* starten, wenn geklickt
        const waveNumber = this.enemyManager.startNextWave(() => {
            // Callback wird aufgerufen, wenn ALLE Wellen abgeschlossen sind
            if (this.lives > 0) { // Nur planen, wenn noch Leben vorhanden
                this.scheduleNextWave(); // Nächste Welle planen (nach Pause)
            }
        });

        // UI aktualisieren (Wellenzahl)
        // Zeige die *neue* Wellenzahl an, die gestartet wurde
        if (this.waveElement) this.waveElement.textContent = this.enemyManager.waveNumber;

        // Menüs schließen
        this.hideRadialMenu();
        this.closeUpgradePanel();
    }

    scheduleNextWave() {
        // Bonus-Gold nur geben, wenn es eine *abgeschlossene* Welle gab
        // (Da Wellen überlappen können, ist dies komplexer zu tracken. Einfacher Ansatz: Bonus bei jedem Callback)
        const waveBonus = 20 + this.enemyManager.waveNumber * 5;
        this.gold += waveBonus;
        this.updateUI();

        // Nächste Welle nach Verzögerung planen (5 Sekunden)
        const autoStartTime = 5000;
        this.enemyManager.scheduleNextWave(autoStartTime, () => {
            // Callback, wenn Welle automatisch gestartet wird
            if (this.waveElement) this.waveElement.textContent = this.enemyManager.waveNumber;
            this.updateUI();
        });

        // Countdown-Anzeige starten/aktualisieren
        this.updateCountdown();
    }

    updateCountdown() {
        if (!this.countdownElement) return;

        // Flag, um Endlosschleife zu verhindern, falls Timer sofort stoppt
        let isTicking = false;

        const tick = () => {
            // Breche ab, wenn der Timer extern gestoppt wurde ODER wenn das Spiel nicht mehr läuft
            if (!this.enemyManager.autoStartTimer || !window.game || !window.game.running) {
                this.countdownElement.textContent = 'Bereit';
                isTicking = false;
                return;
            }
            isTicking = true; // Setze Flag, dass wir ticken

            const remainingTime = this.enemyManager.getCurrentCountdownPrecise(); // Präzise Methode

            if (remainingTime <= 0) {
                this.countdownElement.textContent = 'Bereit';
                isTicking = false;
                return; // Stoppe Timeout-Kette
            }

            const seconds = Math.ceil(remainingTime / 1000);
            this.countdownElement.textContent = `${seconds}s`;

            // Nächsten Tick planen, nur wenn noch nicht gestoppt
            if (this.enemyManager.autoStartTimer) {
                setTimeout(tick, 250); // Aktualisiere alle 250ms
            } else {
                this.countdownElement.textContent = 'Bereit'; // Falls Timer inzwischen gestoppt wurde
                isTicking = false;
            }
        };

        // Starte den ersten Tick nur, wenn nicht schon einer läuft
        if (!isTicking) {
            tick();
        }
    }

    showUpgradePanel(tower, towerIndex, panelX, panelY) {
        if (!this.upgradePanel || !tower || tower.container._destroyed) return; // Sicherheitschecks

        // Aktuellen Turm für Upgrade setzen
        this.selectedTowerForUpgrade = { tower, index: towerIndex };

        // Panel positionieren
        const panelWidth = this.upgradePanel.offsetWidth;
        const panelHeight = this.upgradePanel.offsetHeight;
        const gameContainerRect = this.app.view.getBoundingClientRect();
        let left = panelX + 20;
        let top = panelY - panelHeight / 2;
        if (left + panelWidth > gameContainerRect.width) left = panelX - panelWidth - 20;
        if (top < 0) top = 10;
        if (top + panelHeight > gameContainerRect.height) top = gameContainerRect.height - panelHeight - 10;
        this.upgradePanel.style.left = left + 'px';
        this.upgradePanel.style.top = top + 'px';
        this.upgradePanel.style.display = 'block';

        // Auswahl visuell hervorheben
        this.towerManager.towers.forEach(t => t.selected = false);
        tower.selected = true;
        this.towerManager.updateRangeCircles(); // Reichweite anzeigen

        // Turm-Info aktualisieren
        this.updateTowerInfo();
    }

    updateTowerInfo() {
        if (!this.selectedTowerForUpgrade || !this.towerInfo || !this.selectedTowerForUpgrade.tower || this.selectedTowerForUpgrade.tower.container._destroyed) {
            this.closeUpgradePanel(); // Schließen, wenn Turm ungültig ist
            return;
        }


        const { tower } = this.selectedTowerForUpgrade;
        const towerType = towerTypes[tower.type];
        const maxLevel = towerType.upgrades.length;

        // Turm-Statistiken anzeigen
        let infoText = `<b>${towerType.name}</b>`; // Name fett
        // infoText += `<hr>`; // Trennlinie
        infoText += `Level: ${tower.level}/${maxLevel}<br>`;
        infoText += `Schaden: ${tower.damage.toFixed(1)}<br>`;
        infoText += `Reichweite: ${tower.range}<br>`;
        infoText += `Feuerrate: ${(1000 / tower.fireRate).toFixed(1)}/s<br>`;

        // Spezifische Eigenschaften
        if (tower.multishot) infoText += `Mehrfachschuss: ${tower.multishot}x<br>`;
        if (tower.type === 'slow' || tower.effect === 'slow') {
            const slowFactor = tower.slowFactor ?? towerType.slowFactor;
            const slowDuration = tower.slowDuration ?? towerType.slowDuration;
            if (slowFactor !== undefined) infoText += `Verlangsamung: ${((1 - slowFactor) * 100).toFixed(0)}%<br>`;
            if (slowDuration !== undefined) infoText += `Dauer: ${(slowDuration / 1000).toFixed(1)}s<br>`;
        }
        if (tower.type === 'bomb' || tower.effect === 'splash') {
            const splashRadius = tower.splashRadius ?? towerType.splashRadius;
            if (splashRadius !== undefined) infoText += `Splash-Radius: ${splashRadius}<br>`;
        }
        if (tower.type === 'lightning' || tower.effect === 'chainLightning') {
            const chainCount = tower.chainCount ?? towerType.chainCount;
            const chainRange = tower.chainRange ?? towerType.chainRange;
            if (chainCount !== undefined) infoText += `Ziele: ${chainCount + 1}<br>`;
            if (chainRange !== undefined) infoText += `Sprungreichw.: ${chainRange}<br>`;
        }
        if (tower.pierce) infoText += `Durchdringung: ${tower.pierce} Gegner<br>`;

        this.towerInfo.innerHTML = infoText;

        // Upgrade-Pfad-Visualisierung
        this.createUpgradePathUI();

        // Upgrade-Button aktualisieren
        const targetLevel = tower.level + 1;
        let upgradeCost = 0;
        let nextUpgradeName = 'Max Level';

        if (tower.level < maxLevel) {
            upgradeCost = this.towerManager.getUpgradeCost(tower, targetLevel);
            nextUpgradeName = towerType.upgrades[tower.level].name || `Level ${targetLevel}`;
        }

        if (this.upgradeDirectlyButton) {
            // Button Text
            let buttonText = tower.level < maxLevel ? `Upgrade: ${nextUpgradeName}` : 'Max Level';
            this.upgradeDirectlyButton.textContent = buttonText;

            // Kosten anzeigen (oder ausblenden)
            if (this.upgradeCostSpan) {
                if (tower.level < maxLevel) {
                    this.upgradeCostSpan.textContent = ` (${upgradeCost} G)`;
                    this.upgradeCostSpan.style.display = 'inline';
                } else {
                    this.upgradeCostSpan.style.display = 'none';
                }
            }

            // Button aktivieren/deaktivieren
            this.upgradeDirectlyButton.disabled = (tower.level >= maxLevel) || (this.gold < upgradeCost);
            this.upgradeDirectlyButton.removeAttribute('title'); // Sicherstellen, dass kein Tooltip angezeigt wird
        }

        // Verkaufswert aktualisieren
        if (this.sellValueSpan) {
            this.sellValueSpan.textContent = tower.sellValue;
        }
    }

    createUpgradePathUI() {
        if (!this.selectedTowerForUpgrade || !this.upgradeProgressDiv) return;

        const { tower } = this.selectedTowerForUpgrade;
        const towerType = towerTypes[tower.type];
        const maxLevel = towerType.upgrades.length;

        // Vorherigen Pfad löschen
        this.upgradeProgressDiv.innerHTML = '';

        const pathContainer = document.createElement('div');
        pathContainer.classList.add('upgrade-path');

        for (let i = 0; i <= maxLevel; i++) {
            const marker = document.createElement('div');
            marker.classList.add('level-marker');
            marker.textContent = i; // Zeigt Level 0 bis maxLevel an
            if (i <= tower.level) marker.classList.add('achieved');
            if (i === tower.level) marker.classList.add('current');
            pathContainer.appendChild(marker);

            if (i < maxLevel) {
                const connector = document.createElement('div');
                connector.classList.add('level-path');
                if (i < tower.level) connector.classList.add('achieved');
                pathContainer.appendChild(connector);
            }
        }
        this.upgradeProgressDiv.appendChild(pathContainer);
    }

    upgradeTower() {
        if (!this.selectedTowerForUpgrade) return;

        const { tower, index } = this.selectedTowerForUpgrade;
        const targetLevel = tower.level + 1;

        // Upgrade durchführen (prüft Kosten intern)
        const result = this.towerManager.upgradeTower(index, targetLevel);

        if (result.success) {
            this.gold -= result.cost;
            this.updateUI();
            // Upgrade-Panel aktualisieren, um neuen Status anzuzeigen
            this.updateTowerInfo();
        } else {
            console.log("Upgrade fehlgeschlagen oder nicht möglich.");
            // Optional: Fehlermeldung anzeigen
        }
    }

    sellTower() {
        if (!this.selectedTowerForUpgrade) return;
        const { index } = this.selectedTowerForUpgrade;

        // Turm verkaufen und Gold zurückbekommen
        const goldRefund = this.towerManager.removeTower(index); // Entfernt Turm und gibt Wert zurück
        this.gold += goldRefund;

        // Panel schließen und UI aktualisieren
        this.closeUpgradePanel(); // Schließt Panel und hebt Auswahl auf
        this.updateUI();
    }

    closeUpgradePanel() {
        if (!this.upgradePanel) return;
        this.upgradePanel.style.display = 'none';

        // Turm abwählen
        if (this.selectedTowerForUpgrade) {
            // Nur abwählen, wenn der Turm noch existiert
            if (this.selectedTowerForUpgrade.tower && this.towerManager.towers.includes(this.selectedTowerForUpgrade.tower)) {
                this.selectedTowerForUpgrade.tower.selected = false;
            }
            this.selectedTowerForUpgrade = null;
            this.towerManager.updateRangeCircles(); // Reichweitenkreise ausblenden
        }
    }

    updateUI() {
        // Spielinfo aktualisieren
        if (this.livesElement) this.livesElement.textContent = this.lives;
        if (this.goldElement) this.goldElement.textContent = this.gold;
        if (this.waveElement) this.waveElement.textContent = this.enemyManager.waveNumber;

        // Start-Button Zustand
        if (this.startWaveButton) {
            this.startWaveButton.textContent = 'Welle starten';
            // Button nur deaktivieren, wenn Spiel vorbei ist
            this.startWaveButton.disabled = this.lives <= 0;
        }

        // Verfügbarkeit im Radialmenü aktualisieren (falls offen)
        this.updateRadialMenuAvailability();

        // Verfügbarkeit im Upgrade-Panel aktualisieren (falls offen)
        if (this.selectedTowerForUpgrade) {
            this.updateTowerInfo();
        }
    }

    enemyReachedEnd(enemy) {
        this.lives--;
        this.updateUI();
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    enemyKilled(enemy) {
        this.gold += enemy.reward;
        this.updateUI();
    }

    gameOver() {
        if (this.lives <= 0) { // Nur ausführen, wenn wirklich Game Over
            // Spiel anhalten (Ticker stoppen etc. - wird in Game-Klasse gemacht)
            if (window.game) window.game.running = false;

            alert(`Game Over! Du hast Welle ${this.enemyManager.waveNumber} erreicht.`);
            // UI zurücksetzen, aber Spiel nicht neustarten (außer durch Map-Wechsel)
            this.resetGame(); // Setzt Gold/Leben zurück, leert Manager
            // Buttons dauerhaft deaktivieren
            if (this.startWaveButton) this.startWaveButton.disabled = true;
        }
    }
}

// Globale Hilfsfunktionen für EnemyManager Prototyp hinzufügen
// (Dies ist eine gängige Methode, aber nicht die sauberste. Besser wäre,
// die UI als Abhängigkeit an den EnemyManager zu übergeben oder ein Event-System zu nutzen)

// Methode zum Abrufen der präzisen Countdown-Zeit
EnemyManager.prototype.getCurrentCountdownPrecise = function () {
    if (!this.autoStartTimer || !this.countdownEndTime) return 0;
    return Math.max(0, this.countdownEndTime - Date.now());
};

// Methode zum Planen der nächsten Welle mit Auto-Start
EnemyManager.prototype.scheduleNextWave = function (delay, autoStartCallback) {
    this.cancelWaveTimer(); // Bestehenden Timer löschen
    this.countdownTime = delay; // Für Anzeige speichern (weniger präzise)
    this.countdownEndTime = Date.now() + delay; // Präziser Endzeitpunkt

    const update = () => {
        // Prüfen, ob Timer noch aktiv sein soll
        // Wichtig: Prüfe auf `this.autoStartTimer`, da es in `cancelWaveTimer` auf null gesetzt wird
        if (!this.autoStartTimer) return;

        const remaining = this.countdownEndTime - Date.now();
        if (remaining <= 0) {
            // Timer ist abgelaufen
            const timerId = this.autoStartTimer; // ID merken
            this.autoStartTimer = null; // Timer als inaktiv markieren
            cancelAnimationFrame(timerId); // Frame Request stoppen

            this.countdownEndTime = 0; // Endzeit zurücksetzen

            // Automatisch starten, falls KEINE Welle läuft UND Spiel nicht vorbei
            // Beachte: waveInProgress prüft jetzt, ob *irgendeine* Welle läuft
            if (!this.waveInProgress && window.game?.gameUI?.lives > 0) {
                this.startNextWave(this.onWaveComplete); // Startet neue Welle
                if (autoStartCallback) {
                    autoStartCallback(); // Informiert UI o.Ä.
                }
            }
        } else {
            // Timer läuft weiter - nächsten Frame anfordern
            this.autoStartTimer = requestAnimationFrame(update);
        }
    };
    // Starte den ersten Frame Request und speichere die ID
    this.autoStartTimer = requestAnimationFrame(update);
};