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

        // UI-Elemente
        this.livesElement = document.getElementById('lives');
        this.goldElement = document.getElementById('gold');
        this.waveElement = document.getElementById('wave');
        this.startWaveButton = document.getElementById('startWave');
        this.countdownElement = document.getElementById('countdown');

        // Neue UI-Elemente für Multiple-Wave Buttons
        this.createMultiWaveButtons();

        // Radial-Menü-Element
        this.radialMenu = document.getElementById('radialTowerMenu');
        this.radialCancelButton = document.getElementById('radialCancelButton');

        // Turm-Optionen im Radialmenü
        this.radialTowerOptions = {
            basic: document.getElementById('radialBasicTower'),
            sniper: document.getElementById('radialSniperTower'),
            slow: document.getElementById('radialSlowTower'),
            bomb: document.getElementById('radialBombTower')
        };

        // Aktualisiere die Kosten in den data-cost Attributen (falls sich towerTypes ändert)
        this.radialTowerOptions.basic.setAttribute('data-cost', towerTypes.basic.cost);
        this.radialTowerOptions.sniper.setAttribute('data-cost', towerTypes.sniper.cost);
        this.radialTowerOptions.slow.setAttribute('data-cost', towerTypes.slow.cost);
        this.radialTowerOptions.bomb.setAttribute('data-cost', towerTypes.bomb.cost);

        // Karten-Buttons
        this.mapButtons = {
            map1: document.getElementById('map1'),
            map2: document.getElementById('map2'),
            map3: document.getElementById('map3')
        };

        // Upgrade-Panel-Elemente
        this.upgradePanel = document.getElementById('upgradePanel');
        this.towerInfo = document.getElementById('towerInfo');
        this.upgradeProgressDiv = document.getElementById('currentLevel');
        this.upgradeDirectlyButton = document.getElementById('upgradeDirectly');
        this.targetLevelSpan = document.getElementById('targetLevel');
        this.upgradeCostSpan = document.getElementById('upgradeCost');
        this.sellTowerButton = document.getElementById('sellTower');
        this.sellValueSpan = document.getElementById('sellValue');
        this.closeUpgradeButton = document.getElementById('closeUpgrade');

        this.initEventListeners();
        this.updateUI();
    }

    // Neue Methode zum Erstellen der Multiple-Wave-Buttons
    createMultiWaveButtons() {
        // Container für die Buttons erstellen
        const waveButtonsContainer = document.createElement('div');
        waveButtonsContainer.className = 'multi-wave-buttons';

        // Styling für das Container-Element
        waveButtonsContainer.style.display = 'flex';
        waveButtonsContainer.style.justifyContent = 'center';
        waveButtonsContainer.style.gap = '5px';
        waveButtonsContainer.style.marginTop = '5px';

        // Buttons erstellen
        this.waveButton2x = document.createElement('button');
        this.waveButton2x.className = 'wave-button';
        this.waveButton2x.textContent = '+2 Wellen';
        this.waveButton2x.style.padding = '5px 10px';
        this.waveButton2x.style.backgroundColor = '#a24a1c';
        this.waveButton2x.style.color = '#f9e9c3';
        this.waveButton2x.style.border = '2px solid #8B5A2B';
        this.waveButton2x.style.borderRadius = '4px';
        this.waveButton2x.style.fontFamily = "'MedievalSharp', cursive";
        this.waveButton2x.style.fontSize = '14px';
        this.waveButton2x.style.cursor = 'pointer';

        this.waveButton3x = document.createElement('button');
        this.waveButton3x.className = 'wave-button';
        this.waveButton3x.textContent = '+3 Wellen';
        this.waveButton3x.style.padding = '5px 10px';
        this.waveButton3x.style.backgroundColor = '#8e3218';
        this.waveButton3x.style.color = '#f9e9c3';
        this.waveButton3x.style.border = '2px solid #8B5A2B';
        this.waveButton3x.style.borderRadius = '4px';
        this.waveButton3x.style.fontFamily = "'MedievalSharp', cursive";
        this.waveButton3x.style.fontSize = '14px';
        this.waveButton3x.style.cursor = 'pointer';

        // Buttons zum Container hinzufügen
        waveButtonsContainer.appendChild(this.waveButton2x);
        waveButtonsContainer.appendChild(this.waveButton3x);

        // Container zur wave-timer-div hinzufügen
        const waveTimerDiv = document.querySelector('.wave-timer');
        waveTimerDiv.appendChild(waveButtonsContainer);
    }

    initEventListeners() {
        // Events für Turm-Optionen im Radialmenü
        for (const [type, element] of Object.entries(this.radialTowerOptions)) {
            element.addEventListener('click', (e) => {
                // Verhindern, dass das Klick-Event bis zum Canvas durchdringt
                e.stopPropagation();
                this.selectTowerFromRadial(type);
            });
        }
        // Event für den Cancel-Button
        this.radialCancelButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideRadialMenu();
        });

        // Kartenauswahlbuttons
        for (const [mapId, button] of Object.entries(this.mapButtons)) {
            button.addEventListener('click', () => this.changeMap(mapId));
        }

        // PixiJS-Container-Events
        this.app.view.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.app.view.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));

        // Wellenkontrolle
        this.startWaveButton.addEventListener('click', () => this.startNextWave());

        // Neue Buttons für mehrere Wellen
        this.waveButton2x.addEventListener('click', () => this.startMultipleWaves(2));
        this.waveButton3x.addEventListener('click', () => this.startMultipleWaves(3));

        // Upgrade-Panel-Steuerung
        this.upgradeDirectlyButton.addEventListener('click', () => this.upgradeTower());
        this.sellTowerButton.addEventListener('click', () => this.sellTower());
        this.closeUpgradeButton.addEventListener('click', () => this.closeUpgradePanel());

        // Event-Listener, um Radialmenü zu schließen, wenn irgendwo anders geklickt wird
        document.addEventListener('click', (e) => {
            // Wenn weder auf das Radialmenü noch auf den Canvas geklickt wurde
            if (this.radialMenu.style.display === 'block' && !this.radialMenu.contains(e.target) && e.target !== this.app.view) {
                this.hideRadialMenu();
            }
        });
    }

    changeMap(mapId) {
        // Karte nur ändern, wenn keine Feinde aktiv sind
        if (this.enemyManager.enemies.length > 0) {
            return; // Kann Karte während einer Welle nicht ändern
        }

        // Kartenbutton-Auswahl aktualisieren
        for (const button of Object.values(this.mapButtons)) {
            button.classList.remove('selected');
        }
        this.mapButtons[mapId].classList.add('selected');

        // Spielzustand zurücksetzen
        this.resetGame();

        // Neue Karte setzen
        this.gameMap.setMap(mapId);

        // Manager mit neuer Karte aktualisieren
        this.towerManager.updateMap(this.gameMap);
        this.enemyManager.updatePath(this.gameMap.path);
    }

    resetGame() {
        this.gold = 100;
        this.lives = 10;
        this.enemyManager.waveNumber = 0;

        // Feinde und Türme entfernen
        this.enemyManager.enemies = [];
        this.towerManager.towers.forEach((tower, index) => {
            this.towerManager.removeTower(index);
        });
        this.towerManager.towers = [];
        this.towerManager.projectiles = [];

        // UI-Zustand zurücksetzen
        this.selectedTowerForUpgrade = null;
        this.enemyManager.cancelWaveTimer();
        this.updateUI();

        // Menüs schließen
        this.hideRadialMenu();
        this.closeUpgradePanel();
    }

    // Neue Methode zum Anzeigen des Radialmenüs
    // Diese Methode muss in der ui.js-Datei ersetzt werden
    // Neue Methode zum Anzeigen des Radialmenüs
    showRadialMenu(x, y) {
        // Klick-Position für die spätere Platzierung speichern
        this.clickX = x;
        this.clickY = y;

        // Kachelkoordinaten berechnen
        const tileX = Math.floor(x / this.gameMap.tileSize);
        const tileY = Math.floor(y / this.gameMap.tileSize);
        this.selectedTileX = tileX;
        this.selectedTileY = tileY;

        // Mausposition im Browserfenster berechnen
        const rect = this.app.view.getBoundingClientRect();
        const globalX = x + rect.left;
        const globalY = y + rect.top;

        // Radialmenü genau an die Mausposition setzen (nicht versetzt)
        this.radialMenu.style.left = `${globalX}px`;
        this.radialMenu.style.top = `${globalY}px`;
        this.radialMenu.style.display = 'block';

        // Verfügbare Türme basierend auf Gold aktivieren/deaktivieren
        this.updateRadialMenuAvailability();
    }

    // Radialmenü ausblenden
    hideRadialMenu() {
        this.radialMenu.style.display = 'none';
        this.selectedTileX = null;
        this.selectedTileY = null;
        this.clickX = null;
        this.clickY = null;
    }

    // Verfügbare Türme im Radialmenü aktualisieren
    updateRadialMenuAvailability() {
        for (const [type, element] of Object.entries(this.radialTowerOptions)) {
            if (this.gold < towerTypes[type].cost) {
                element.classList.add('disabled');
            } else {
                element.classList.remove('disabled');
            }
        }
    }

    // Turmauswahl aus dem Radialmenü
    selectTowerFromRadial(type) {
        // Prüfen, ob genug Gold vorhanden ist
        if (this.gold < towerTypes[type].cost) {
            return; // Nicht genug Gold
        }

        // Turm an der Klickposition platzieren
        if (this.placeTower(type, this.clickX, this.clickY)) {
            // Turm wurde erfolgreich platziert
            this.gold -= towerTypes[type].cost;
            this.updateUI();
            this.hideRadialMenu();
        }
    }

    handleCanvasClick(event) {
        const rect = this.app.view.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // Prüfen, ob auf einen bestehenden Turm geklickt wurde
        const towerResult = this.towerManager.getTowerAt(clickX, clickY);
        if (towerResult) {
            // Upgrade-Panel anzeigen
            this.showUpgradePanel(towerResult.tower, towerResult.index, clickX, clickY);

            // Sicherstellen, dass das Radialmenü geschlossen wird
            this.hideRadialMenu();
            return;
        }

        // Prüfen, ob die Kachel für einen Turm geeignet ist
        if (!this.gameMap.isTileOccupied(clickX, clickY)) {
            // Radialmenü anzeigen
            this.showRadialMenu(clickX, clickY);

            // Upgrade-Panel schließen, wenn offen
            this.closeUpgradePanel();
        }
    }

    handleCanvasMouseMove(event) {
        const rect = this.app.view.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Aktuelle Mausposition speichern
        this.mouseX = mouseX;
        this.mouseY = mouseY;

        // Hover-Zustand für alle Türme zurücksetzen
        for (const tower of this.towerManager.towers) {
            tower.hover = false;
        }

        // Prüfen, ob über einem Turm
        const towerResult = this.towerManager.getTowerAt(mouseX, mouseY);
        if (towerResult) {
            towerResult.tower.hover = true;
        }

        // Reichweitenkreise aktualisieren
        this.towerManager.updateRangeCircles();
    }

    placeTower(type, x, y) {
        return this.towerManager.addTower(type, x, y);
    }

    // Methode für mehrere Wellen starten
    startMultipleWaves(count) {
        // Den enemyManager anweisen, mehrere Wellen zu starten
        this.enemyManager.queueWaves(count);

        // UI-Elemente aktualisieren
        this.waveElement.textContent = this.enemyManager.waveNumber;
        this.updateUI();

        // Alle offenen Menüs schließen
        this.hideRadialMenu();
        this.closeUpgradePanel();
    }

    startNextWave() {
        // Nächste Welle starten
        const waveNumber = this.enemyManager.startNextWave(() => {
            // Dieser Callback wird aufgerufen, wenn die Welle abgeschlossen ist

            // Nächste Welle nach Verzögerung planen
            this.scheduleNextWave();
        });

        // UI aktualisieren
        this.waveElement.textContent = waveNumber;

        // Start-Button soll während der laufenden Welle verfügbar bleiben
        // damit der Spieler mehrere Wellen starten kann
        //this.startWaveButton.disabled = true;

        // Alle offenen Menüs schließen
        this.hideRadialMenu();
        this.closeUpgradePanel();
    }

    scheduleNextWave() {
        // Bonus-Gold für das Abschließen der Welle hinzufügen
        const waveBonus = 20 + this.enemyManager.waveNumber * 5;
        this.gold += waveBonus;
        this.updateUI();

        // Nächste Welle nach Verzögerung planen (3 Sekunden)
        const autoStartTime = 3000; // 3 Sekunden
        this.enemyManager.scheduleNextWave(autoStartTime, () => {
            // Welle wurde automatisch gestartet
            this.waveElement.textContent = this.enemyManager.waveNumber;
            // Sicherstellen, dass die UI aktualisiert wird
            this.updateUI();
        });

        // Countdown-Anzeige aktualisieren
        this.updateCountdown();
    }

    updateCountdown() {
        const remainingTime = this.enemyManager.getCurrentCountdown();

        if (remainingTime <= 0) {
            this.countdownElement.textContent = 'Bereit';
            return;
        }

        // Sekunden formatieren
        const seconds = Math.ceil(remainingTime / 1000);
        this.countdownElement.textContent = `${seconds}s`;

        // Fortfahren mit der Aktualisierung alle 500ms, bis der Countdown abgeschlossen ist
        setTimeout(() => this.updateCountdown(), 500);
    }

    showUpgradePanel(tower, towerIndex, x, y) {
        // Aktuellen Turm für Upgrade setzen
        this.selectedTowerForUpgrade = { tower, index: towerIndex };

        // Panel in der Nähe des Turms positionieren
        this.upgradePanel.style.left = (x + 20) + 'px';
        this.upgradePanel.style.top = (y - 100) + 'px';
        this.upgradePanel.style.display = 'block';

        // Auswahl für alle Türme aufheben
        for (const t of this.towerManager.towers) {
            t.selected = false;
        }

        // Diesen Turm als ausgewählt markieren
        tower.selected = true;

        // Reichweitenkreise aktualisieren
        this.towerManager.updateRangeCircles();

        // Turm-Info aktualisieren
        this.updateTowerInfo();
    }

    updateTowerInfo() {
        if (!this.selectedTowerForUpgrade) return;

        const { tower } = this.selectedTowerForUpgrade;
        const towerType = towerTypes[tower.type];

        // Grundlegende Turm-Informationen
        let infoText = `<b>${towerType.name}</b><br>`;
        infoText += `<i>${towerType.description}</i><br><br>`;
        infoText += `Level: ${tower.level}/3<br>`;
        infoText += `Schaden: ${tower.damage}<br>`;
        infoText += `Reichweite: ${tower.range}<br>`;
        infoText += `Feuerrate: ${(1000 / tower.fireRate).toFixed(1)}/s<br>`;

        // Spezielle Eigenschaften
        if (tower.multishot) {
            infoText += `Mehrfachschuss: ${tower.multishot}x<br>`;
        }
        if (tower.effect === 'slow') {
            infoText += `Verlangsamung: ${(1 - tower.slowFactor) * 100}%<br>`;
            infoText += `Dauer: ${tower.slowDuration / 1000}s<br>`;
        }
        if (tower.effect === 'splash') {
            infoText += `Splash-Radius: ${tower.splashRadius}<br>`;
        }
        if (tower.pierce) {
            infoText += `Durchdringung: ${tower.pierce} Gegner<br>`;
        }

        this.towerInfo.innerHTML = infoText;

        // Upgrade-Pfad-Visualisierung erstellen
        this.createUpgradePathUI();

        // Ziellevel für Upgrade setzen
        const targetLevel = Math.min(tower.level + 1, 3);
        this.targetLevelSpan.textContent = targetLevel;

        // Upgrade-Kosten berechnen und anzeigen
        let upgradeCost = 0;

        if (targetLevel <= towerType.upgrades.length && targetLevel > tower.level) {
            upgradeCost = this.towerManager.getUpgradeCost(tower, targetLevel);
            this.upgradeDirectlyButton.disabled = this.gold < upgradeCost;
        } else {
            this.upgradeDirectlyButton.disabled = true;
        }

        this.upgradeCostSpan.textContent = upgradeCost;

        // Verkaufswert setzen
        this.sellValueSpan.textContent = tower.sellValue;
    }

    createUpgradePathUI() {
        if (!this.selectedTowerForUpgrade) return;

        const { tower } = this.selectedTowerForUpgrade;
        const towerType = towerTypes[tower.type];

        // Vorherigen Pfad löschen
        this.upgradeProgressDiv.innerHTML = '';

        // Upgrade-Pfad erstellen
        const path = document.createElement('div');
        path.classList.add('upgrade-path');

        // Level-Marker hinzufügen
        for (let i = 0; i <= 3; i++) {
            // Level-Marker
            const marker = document.createElement('div');
            marker.classList.add('level-marker');
            marker.textContent = i;

            if (i <= tower.level) {
                marker.classList.add('achieved');
            }

            if (i === tower.level) {
                marker.classList.add('current');
            }

            path.appendChild(marker);

            // Verbindungspfad hinzufügen (außer nach dem letzten Marker)
            if (i < 3) {
                const connector = document.createElement('div');
                connector.classList.add('level-path');

                if (i < tower.level) {
                    connector.classList.add('achieved');
                }

                path.appendChild(connector);
            }
        }

        this.upgradeProgressDiv.appendChild(path);

        // Upgrade-Button basierend auf dem nächsten verfügbaren Upgrade aktualisieren
        if (tower.level < towerType.upgrades.length) {
            const nextUpgrade = towerType.upgrades[tower.level];
            this.upgradeDirectlyButton.textContent = `${nextUpgrade.name} (${nextUpgrade.cost} Gold)`;
            this.upgradeDirectlyButton.disabled = this.gold < nextUpgrade.cost;
            this.upgradeDirectlyButton.title = nextUpgrade.description;
        } else {
            this.upgradeDirectlyButton.textContent = 'Maximales Level erreicht';
            this.upgradeDirectlyButton.disabled = true;
            this.upgradeDirectlyButton.title = '';
        }
    }

    upgradeTower() {
        if (!this.selectedTowerForUpgrade) return;

        const { tower, index } = this.selectedTowerForUpgrade;
        const targetLevel = Math.min(tower.level + 1, 3);

        // Upgrade durchführen
        const result = this.towerManager.upgradeTower(index, targetLevel);

        if (result.success) {
            // Gold abziehen
            this.gold -= result.cost;
            this.updateUI();

            // Upgrade-Panel aktualisieren
            this.updateTowerInfo();
        }
    }

    sellTower() {
        if (!this.selectedTowerForUpgrade) return;

        const { index } = this.selectedTowerForUpgrade;

        // Turm verkaufen und Gold zurückbekommen
        const goldRefund = this.towerManager.removeTower(index);
        this.gold += goldRefund;

        // Panel schließen und UI aktualisieren
        this.closeUpgradePanel();
        this.updateUI();
    }

    closeUpgradePanel() {
        this.upgradePanel.style.display = 'none';

        // Turm abwählen
        if (this.selectedTowerForUpgrade) {
            this.selectedTowerForUpgrade.tower.selected = false;
            this.selectedTowerForUpgrade = null;

            // Reichweitenkreise aktualisieren
            this.towerManager.updateRangeCircles();
        }
    }

    updateUI() {
        // Spielinfo aktualisieren
        this.livesElement.textContent = this.lives;
        this.goldElement.textContent = this.gold;
        this.waveElement.textContent = this.enemyManager.waveNumber;

        // Anzeige der ausstehenden Wellen aktualisieren
        if (this.enemyManager.pendingWaves > 0) {
            // this.startWaveButton.textContent = `Welle starten (+${this.enemyManager.pendingWaves} ausstehend)`;
        } else {
            // this.startWaveButton.textContent = 'Welle starten';
        }

        // Wir halten die Buttons immer aktiv, damit der Spieler mehrere Wellen starten kann
        // Nur bei Game Over deaktivieren wir sie
        this.startWaveButton.disabled = this.lives <= 0;
        this.waveButton2x.disabled = this.lives <= 0;
        this.waveButton3x.disabled = this.lives <= 0;

        // Falls das Radialmenü offen ist, verfügbare Türme aktualisieren
        if (this.radialMenu.style.display === 'block') {
            this.updateRadialMenuAvailability();
        }
    }

    enemyReachedEnd(enemy) {
        this.lives--;
        this.updateUI();

        // Spielende prüfen
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    enemyKilled(enemy) {
        this.gold += enemy.reward;
        this.updateUI();
    }

    gameOver() {
        alert(`Game Over! Du hast Welle ${this.enemyManager.waveNumber} erreicht.`);
        this.resetGame();
    }
}