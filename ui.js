// UI Management and User Interactions
class GameUI {
    constructor(app, gameMap, towerManager, enemyManager) {
        this.app = app;
        this.gameMap = gameMap;
        this.towerManager = towerManager;
        this.enemyManager = enemyManager;

        this.selectedTowerType = null;
        this.gold = 100;
        this.lives = 10;
        this.selectedTowerForUpgrade = null;

        // Mausposition-Tracking
        this.mouseX = null;
        this.mouseY = null;

        // UI-Elemente
        this.livesElement = document.getElementById('lives');
        this.goldElement = document.getElementById('gold');
        this.waveElement = document.getElementById('wave');
        this.startWaveButton = document.getElementById('startWave');
        this.countdownElement = document.getElementById('countdown');

        // Turm-Buttons
        this.towerButtons = {
            basic: document.getElementById('basicTower'),
            sniper: document.getElementById('sniperTower'),
            slow: document.getElementById('slowTower'),
            bomb: document.getElementById('bombTower')
        };

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

    initEventListeners() {
        // Turm-Auswahlbuttons
        for (const [type, button] of Object.entries(this.towerButtons)) {
            button.addEventListener('click', () => this.selectTowerType(type));
        }

        // Kartenauswahlbuttons
        for (const [mapId, button] of Object.entries(this.mapButtons)) {
            button.addEventListener('click', () => this.changeMap(mapId));
        }

        // PixiJS-Container-Events
        this.app.view.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.app.view.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));

        // Wellenkontrolle
        this.startWaveButton.addEventListener('click', () => this.startNextWave());

        // Upgrade-Panel-Steuerung
        this.upgradeDirectlyButton.addEventListener('click', () => this.upgradeTower());
        this.sellTowerButton.addEventListener('click', () => this.sellTower());
        this.closeUpgradeButton.addEventListener('click', () => this.closeUpgradePanel());
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
        this.selectedTowerType = null;
        this.selectedTowerForUpgrade = null;
        this.enemyManager.cancelWaveTimer();
        this.updateUI();
    }

    selectTowerType(type) {
        // Prüfen, ob genug Gold vorhanden ist
        if (this.gold < towerTypes[type].cost) {
            return;
        }

        // Turm auswählen oder Auswahl aufheben
        if (this.selectedTowerType === type) {
            this.selectedTowerType = null;
        } else {
            this.selectedTowerType = type;
        }

        // Button-UI aktualisieren
        for (const [towerType, button] of Object.entries(this.towerButtons)) {
            button.classList.toggle('selected', towerType === this.selectedTowerType);
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
            return;
        }

        // Neuen Turm platzieren, falls ein Turmtyp ausgewählt ist
        if (this.selectedTowerType) {
            if (this.placeTower(this.selectedTowerType, clickX, clickY)) {
                // Turm wurde erfolgreich platziert
                this.gold -= towerTypes[this.selectedTowerType].cost;
                this.updateUI();

                // Turmtyp nach dem Platzieren abwählen
                this.selectedTowerType = null;
                for (const button of Object.values(this.towerButtons)) {
                    button.classList.remove('selected');
                }
            }
        }
    }

    handleCanvasMouseMove(event) {
        const rect = this.app.view.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Aktuelle Mausposition für Verwendung in drawTowerPreview speichern
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

        // Cursor aktualisieren, wenn ein Turmtyp ausgewählt ist
        if (this.selectedTowerType) {
            // Prüfen, ob der Turm hier platziert werden kann
            const canPlace = !this.gameMap.isTileOccupied(mouseX, mouseY) &&
                !this.towerManager.getTowerAt(mouseX, mouseY);

            // Turmvorschau anzeigen
            this.towerManager.drawTowerPreview(mouseX, mouseY, this.selectedTowerType, canPlace);
        } else if (this.towerManager.previewGraphics) {
            // Vorschau entfernen, wenn kein Turmtyp ausgewählt ist
            this.towerManager.rangeCirclesContainer.removeChild(this.towerManager.previewGraphics);
            this.towerManager.previewGraphics = null;
        }
    }

    placeTower(type, x, y) {
        return this.towerManager.addTower(type, x, y);
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
        this.startWaveButton.disabled = true;
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
            this.startWaveButton.disabled = true;
        });

        // Countdown-Anzeige aktualisieren
        this.updateCountdown();

        // Start-Button aktivieren
        this.startWaveButton.disabled = false;
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

        // Turm-Buttons aktualisieren
        for (const [type, button] of Object.entries(this.towerButtons)) {
            const towerType = towerTypes[type];
            button.disabled = this.gold < towerType.cost;

            // Das Turm-Label mit aktuellem Preis aktualisieren
            const labelElement = button.querySelector('.tower-label');
            if (labelElement) {
                labelElement.textContent = `${towerType.name} (${towerType.cost})`;
            }
        }

        // Wellen-Button aktualisieren
        this.startWaveButton.disabled = this.enemyManager.waveInProgress;
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