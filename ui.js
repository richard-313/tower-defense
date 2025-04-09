// ui.js

class GameUI {
    constructor(app, gameMap, towerManager, enemyManager) {
        // ... (other properties remain the same) ...
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
        this.startWaveButton = document.getElementById('startWave'); // Text is now static
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

    // ... (createMultiWaveButtons remains the same) ...
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
        this.waveButton2x.title = 'Startet die nächsten 2 Wellen sofort'; // Tooltip added
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
        this.waveButton3x.title = 'Startet die nächsten 3 Wellen sofort'; // Tooltip added
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
        // Insert before the start button if it exists
        const startButton = document.getElementById('startWave');
        if (startButton && startButton.parentNode === waveTimerDiv) {
            waveTimerDiv.insertBefore(waveButtonsContainer, startButton.nextSibling); // Place after start button
        } else {
            waveTimerDiv.appendChild(waveButtonsContainer); // Fallback append
        }
    }


    initEventListeners() {
        // ... (radial menu, map buttons, canvas clicks/moves remain the same) ...
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


        // --- Wave Control ---
        // Main start button queues ONE wave
        this.startWaveButton.addEventListener('click', () => this.startSingleWave());

        // Multi-wave buttons
        this.waveButton2x.addEventListener('click', () => this.startMultipleWaves(2));
        this.waveButton3x.addEventListener('click', () => this.startMultipleWaves(3));

        // --- Upgrade Panel ---
        this.upgradeDirectlyButton.addEventListener('click', () => this.upgradeTower());
        this.sellTowerButton.addEventListener('click', () => this.sellTower());
        this.closeUpgradeButton.addEventListener('click', () => this.closeUpgradePanel());

        // Event-Listener, um Radialmenü zu schließen, wenn irgendwo anders geklickt wird
        document.addEventListener('click', (e) => {
            // Check if the radial menu is visible and the click was outside of it and not on the canvas
            if (this.radialMenu.style.display === 'block' &&
                !this.radialMenu.contains(e.target) &&
                e.target !== this.app.view &&
                !this.isClickOnTower(e)) // Add check if click was on a tower
            {
                this.hideRadialMenu();
            }
            // Close upgrade panel if click is outside
            if (this.upgradePanel.style.display === 'block' &&
                !this.upgradePanel.contains(e.target) &&
                e.target !== this.app.view &&
                !this.isClickOnTower(e)) // Don't close if clicking the same or another tower
            {
                this.closeUpgradePanel();
            }
        });
    }

    // Helper to check if a click event target might be related to a tower graphic
    isClickOnTower(event) {
        const rect = this.app.view.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        return !!this.towerManager.getTowerAt(clickX, clickY);
    }

    // ... (changeMap, resetGame remain the same) ...
    changeMap(mapId) {
        // Karte nur ändern, wenn keine Feinde aktiv sind oder spawnen
        if (this.enemyManager.enemies.length > 0 || this.enemyManager.waveInProgress) {
            console.log("Cannot change map while wave is in progress.");
            // Optional: Add user feedback (e.g., brief message)
            return;
        }

        // Kartenbutton-Auswahl aktualisieren
        for (const button of Object.values(this.mapButtons)) {
            button.classList.remove('selected');
        }
        if (this.mapButtons[mapId]) { // Ensure button exists
            this.mapButtons[mapId].classList.add('selected');
        }

        // Spielzustand zurücksetzen
        this.resetGame(); // resetGame already updates UI

        // Neue Karte setzen
        this.gameMap.setMap(mapId);

        // Manager mit neuer Karte aktualisieren
        this.towerManager.updateMap(this.gameMap);
        this.enemyManager.updatePath(this.gameMap.path); // Update enemy path too
    }

    resetGame() {
        console.log("Resetting game state...");
        this.gold = 100;
        this.lives = 10;
        this.enemyManager.waveNumber = 0;
        this.enemyManager.pendingWaves = 0; // Reset pending waves

        // Clear existing enemies immediately
        this.enemyManager.enemies.forEach(enemy => this.enemyManager.container.removeChild(enemy.sprite));
        this.enemyManager.enemies = [];
        this.enemyManager.enemiesToSpawnQueue = [];
        this.enemyManager.enemiesRemaining = 0;
        this.enemyManager.waveInProgress = false;

        // Clear spawn interval if running
        if (this.enemyManager.spawnInterval) {
            clearInterval(this.enemyManager.spawnInterval);
            this.enemyManager.spawnInterval = null;
        }


        // Clear existing towers and projectiles
        // Iterate backwards when removing elements
        for (let i = this.towerManager.towers.length - 1; i >= 0; i--) {
            this.towerManager.removeTower(i); // removeTower handles graphics removal
        }
        // Ensure arrays are empty
        this.towerManager.towers = [];

        for (let i = this.towerManager.projectiles.length - 1; i >= 0; i--) {
            this.towerManager.removeProjectile(i); // removeProjectile handles graphics removal
        }
        this.towerManager.projectiles = [];


        // UI-Zustand zurücksetzen
        this.selectedTowerForUpgrade = null;
        this.enemyManager.cancelWaveTimer(); // Stops the auto-start timer
        this.updateUI(); // Update display (lives, gold, wave 0)

        // Menüs schließen
        this.hideRadialMenu();
        this.closeUpgradePanel();
        console.log("Game reset complete.");
    }


    // ... (showRadialMenu, hideRadialMenu, updateRadialMenuAvailability, selectTowerFromRadial remain the same) ...
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
        // Use pageX/pageY for coordinates relative to the whole document
        // Or adjust clientX/Y with scroll position if needed
        const globalX = event.pageX; // Use event.pageX if available
        const globalY = event.pageY; // Use event.pageY if available
        // Fallback to clientX/Y relative to viewport
        // const globalX = event.clientX + window.scrollX;
        // const globalY = event.clientY + window.scrollY;


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
            // Ensure towerTypes[type] exists
            if (towerTypes[type]) {
                if (this.gold < towerTypes[type].cost) {
                    element.classList.add('disabled');
                } else {
                    element.classList.remove('disabled');
                }
            } else {
                element.classList.add('disabled'); // Disable if type definition is missing
            }
        }
    }

    // Turmauswahl aus dem Radialmenü
    selectTowerFromRadial(type) {
        // Ensure towerTypes[type] exists
        if (!towerTypes[type]) {
            console.error(`Tower type definition missing for: ${type}`);
            this.hideRadialMenu();
            return;
        }
        // Prüfen, ob genug Gold vorhanden ist
        if (this.gold < towerTypes[type].cost) {
            console.log("Not enough gold for tower:", type);
            // Optional: Add visual feedback (shake menu?)
            return; // Nicht genug Gold
        }

        // Turm an der Klickposition platzieren
        // Ensure click coordinates are valid
        if (this.clickX === null || this.clickY === null) {
            console.error("Cannot place tower, click position not set.");
            this.hideRadialMenu();
            return;
        }

        if (this.placeTower(type, this.clickX, this.clickY)) {
            // Turm wurde erfolgreich platziert
            this.gold -= towerTypes[type].cost;
            this.updateUI();
            this.hideRadialMenu();
        } else {
            // Placement failed (e.g., occupied tile) - keep menu open? Or hide?
            // Let's hide it for now, user can click again.
            console.log("Failed to place tower at:", this.clickX, this.clickY);
            this.hideRadialMenu();
            // Optional: Add feedback why it failed (e.g., message)
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
            return; // Stop further processing
        }

        // Prüfen, ob die Kachel für einen Turm geeignet ist (nicht Pfad, nicht belegt)
        if (!this.gameMap.isTileOccupied(clickX, clickY) && !this.towerManager.getTowerAt(clickX, clickY, this.gameMap.tileSize / 2)) { // Check again specifically for towers
            // Radialmenü anzeigen
            this.showRadialMenu(clickX, clickY); // Pass click coords

            // Upgrade-Panel schließen, wenn offen
            this.closeUpgradePanel();
        } else {
            // Clicked on occupied tile or path, close menus
            this.hideRadialMenu();
            this.closeUpgradePanel();
        }
    }


    // ... (handleCanvasMouseMove remains the same) ...
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

        // Reichweitenkreise aktualisieren (zeigt Kreis für Hover/Selected)
        this.towerManager.updateRangeCircles();

        // --- Optional: Tower Placement Preview ---
        // If a tower type is selected for placement (e.g., via hotkey later),
        // show a preview here. For now, preview is not implemented with radial menu.
        // Example:
        // if (this.selectedTowerTypeForPlacement) {
        //     const canPlace = !this.gameMap.isTileOccupied(mouseX, mouseY) && !this.towerManager.getTowerAt(mouseX, mouseY, this.gameMap.tileSize / 2);
        //     this.towerManager.drawTowerPreview(mouseX, mouseY, this.selectedTowerTypeForPlacement, canPlace);
        // } else {
        //     this.towerManager.clearTowerPreview(); // Method to remove preview graphics
        // }
    }

    placeTower(type, x, y) {
        // Pass center coordinates for placement
        const center = this.gameMap.getTileCenter(x, y);
        const success = this.towerManager.addTower(type, center.x, center.y); // Use addTower which now expects center coords

        // Ensure tile occupation check happens within addTower or before calling
        // addTower already performs checks based on the tile the center coords fall into

        return success;
    }

    // Renamed from startNextWave to be more specific
    startSingleWave() {
        if (this.lives <= 0) return; // Don't start if game over

        console.log("Queueing 1 wave.");
        // Queue 1 wave using the new method
        const callback = () => { this.scheduleNextWave(); };
        this.enemyManager.queueWaves(1, callback);

        // Cancel any existing auto-start timer
        this.enemyManager.cancelWaveTimer();
        this.updateCountdownDisplay(); // Update display to show 'Bereit' or similar

        // Update UI immediately to reflect potential wave number change
        this.updateUI();

        // Close menus
        this.hideRadialMenu();
        this.closeUpgradePanel();
    }

    // Method for multiple waves button
    startMultipleWaves(count) {
        if (this.lives <= 0) return; // Don't start if game over

        console.log(`Queueing ${count} waves.`);
        // Queue multiple waves
        const callback = () => { this.scheduleNextWave(); };
        this.enemyManager.queueWaves(count, callback);

        // Cancel any existing auto-start timer
        this.enemyManager.cancelWaveTimer();
        this.updateCountdownDisplay();

        // Update UI immediately
        this.updateUI();

        // Close menus
        this.hideRadialMenu();
        this.closeUpgradePanel();
    }

    scheduleNextWave() {
        // This is called when a *batch* of waves is fully cleared
        if (this.lives <= 0) return; // Don't schedule if game over

        console.log(`Wave batch complete (finished wave ${this.enemyManager.waveNumber}). Scheduling next.`);

        // Bonus-Gold für das Abschließen der Welle (batch) hinzufügen
        // Base bonus + scale with the *last completed* wave number
        const waveBonus = 20 + this.enemyManager.waveNumber * 5;
        this.gold += waveBonus;
        console.log(`Awarded ${waveBonus} gold bonus.`);
        this.updateUI(); // Update gold display

        // Nächste Welle nach Verzögerung planen (e.g., 5 Sekunden)
        const autoStartTime = 5000; // 5 seconds breather
        this.enemyManager.scheduleNextWave(autoStartTime, () => {
            // This callback is passed to queueWaves when the timer completes
            this.scheduleNextWave(); // Re-schedule after the auto-started wave batch finishes
        });

        // Update countdown display starts within scheduleNextWave in EnemyManager
    }


    // Separate function to update only the countdown text
    updateCountdownDisplay() {
        const remainingTime = this.enemyManager.getCurrentCountdown();

        if (remainingTime <= 0 || !this.enemyManager.autoStartTimer) { // Also check if timer is active
            this.countdownElement.textContent = 'Bereit';
        } else {
            const seconds = Math.ceil(remainingTime / 1000);
            this.countdownElement.textContent = `${seconds}s`;
        }
    }

    // ... (showUpgradePanel, updateTowerInfo, createUpgradePathUI, upgradeTower, sellTower, closeUpgradePanel remain the same) ...
    showUpgradePanel(tower, towerIndex, clickX, clickY) { // Accept click coords
        // Aktuellen Turm für Upgrade setzen
        this.selectedTowerForUpgrade = { tower, index: towerIndex };

        // Panel-Position berechnen (relativ zum Canvas-Container)
        const panelWidth = this.upgradePanel.offsetWidth;
        const panelHeight = this.upgradePanel.offsetHeight;
        const canvasRect = this.app.view.getBoundingClientRect();

        // Versuche, rechts neben dem Turm zu positionieren
        let panelX = clickX + 40; // Offset nach rechts
        let panelY = clickY - panelHeight / 2; // Zentriert vertikal zum Klickpunkt

        // Sicherstellen, dass das Panel im Canvas bleibt (oder im sichtbaren Bereich)
        if (panelX + panelWidth > canvasRect.width) {
            panelX = clickX - panelWidth - 20; // Links positionieren
        }
        if (panelY < 0) {
            panelY = 10; // Oben ausrichten
        }
        if (panelY + panelHeight > canvasRect.height) {
            panelY = canvasRect.height - panelHeight - 10; // Unten ausrichten
        }


        // Position relativ zum gameContainer setzen (der das Canvas enthält)
        this.upgradePanel.style.left = `${panelX}px`;
        this.upgradePanel.style.top = `${panelY}px`;
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
        if (!towerType) return; // Safety check

        // Grundlegende Turm-Informationen
        let infoText = `<b>${tower.name || towerType.name}</b><br>`; // Use tower name if upgraded
        infoText += `<i>${towerType.description}</i><br><br>`; // Base description
        infoText += `Level: ${tower.level}/3<br>`; // Max level assumed 3 based on upgrades array length
        infoText += `Schaden: ${tower.damage.toFixed(1)}<br>`; // Format damage
        infoText += `Reichweite: ${tower.range}<br>`;
        infoText += `Feuerrate: ${(1000 / tower.fireRate).toFixed(1)}/s<br>`;

        // Spezielle Eigenschaften anzeigen
        if (tower.multishot > 1) { // Check if multishot is defined and > 1
            infoText += `Mehrfachschuss: ${tower.multishot}x<br>`;
        }
        // Check for slow effect properties
        if (tower.effect === 'slow' || tower.slowFactor) {
            const slowPercentage = tower.slowFactor ? ((1 - tower.slowFactor) * 100).toFixed(0) : 'N/A';
            const slowDuration = tower.slowDuration ? (tower.slowDuration / 1000).toFixed(1) : 'N/A';
            infoText += `Verlangsamung: ${slowPercentage}%<br>`;
            infoText += `Dauer: ${slowDuration}s<br>`;
        }
        // Check for splash effect properties
        if (tower.effect === 'splash' || tower.splashRadius) {
            infoText += `Splash-Radius: ${tower.splashRadius || 'N/A'}<br>`;
        }
        // Check for pierce properties
        if (tower.pierce > 1) { // Check if pierce is defined and > 1
            infoText += `Durchdringung: ${tower.pierce} Gegner<br>`;
        }


        this.towerInfo.innerHTML = infoText;

        // Upgrade-Pfad-Visualisierung erstellen
        this.createUpgradePathUI(); // Call this after basic info is set


        // --- Upgrade Button Logic ---
        const maxLevel = towerType.upgrades.length; // Max level is based on number of upgrades
        const targetLevel = tower.level + 1;


        if (targetLevel <= maxLevel) {
            const upgradeInfo = towerType.upgrades[tower.level]; // Get info for the *next* upgrade
            const upgradeCost = upgradeInfo.cost;

            this.upgradeDirectlyButton.textContent = `Upgrade auf "${upgradeInfo.name}" (${upgradeCost} Gold)`;
            this.upgradeDirectlyButton.title = upgradeInfo.description; // Set tooltip
            this.upgradeDirectlyButton.disabled = this.gold < upgradeCost || tower.level >= maxLevel;

            this.upgradeCostSpan.textContent = upgradeCost; // Update cost span (might be redundant)
            this.targetLevelSpan.textContent = targetLevel; // Update target level span (might be redundant)

        } else {
            // Already at max level
            this.upgradeDirectlyButton.textContent = 'Maximales Level erreicht';
            this.upgradeDirectlyButton.title = ''; // Clear tooltip
            this.upgradeDirectlyButton.disabled = true;

            this.upgradeCostSpan.textContent = '---';
            this.targetLevelSpan.textContent = tower.level;
        }


        // Verkaufswert setzen
        this.sellValueSpan.textContent = tower.sellValue;
        this.sellTowerButton.disabled = false; // Selling should always be possible
    }

    createUpgradePathUI() {
        if (!this.selectedTowerForUpgrade) return;

        const { tower } = this.selectedTowerForUpgrade;
        const towerType = towerTypes[tower.type];
        if (!towerType) return; // Safety check

        // Vorherigen Pfad löschen
        this.upgradeProgressDiv.innerHTML = ''; // Clear existing markers/paths

        // Max level is number of upgrades (Level 0 = base, Level 1 = 1st upgrade, etc.)
        const maxLevel = towerType.upgrades.length;
        const totalMarkers = maxLevel + 1; // Include level 0 marker

        // Upgrade-Pfad-Container erstellen (neu bei jedem Aufruf)
        const pathContainer = document.createElement('div');
        pathContainer.classList.add('upgrade-path-visual'); // Use a specific class if needed
        pathContainer.style.display = 'flex';
        pathContainer.style.alignItems = 'center';
        pathContainer.style.justifyContent = 'space-between'; // Distribute markers evenly
        pathContainer.style.width = '100%'; // Ensure it fills the container


        // Level-Marker und Verbindungspfade hinzufügen
        for (let i = 0; i < totalMarkers; i++) {
            // Level-Marker erstellen
            const marker = document.createElement('div');
            marker.classList.add('level-marker');
            marker.textContent = i; // Display level number (0, 1, 2, 3)

            // Styling basierend auf erreichtem Level
            if (i <= tower.level) {
                marker.classList.add('achieved');
            }
            // Highlight für das aktuelle Level
            if (i === tower.level) {
                marker.classList.add('current');
            }

            pathContainer.appendChild(marker);

            // Verbindungspfad hinzufügen (außer nach dem letzten Marker)
            if (i < maxLevel) { // Only add connectors between markers
                const connector = document.createElement('div');
                connector.classList.add('level-path');

                // Styling für erreichte Pfade
                if (i < tower.level) {
                    connector.classList.add('achieved');
                }
                pathContainer.appendChild(connector);
            }
        }

        // Den erstellten Pfad zum DOM hinzufügen
        this.upgradeProgressDiv.appendChild(pathContainer);

        // Note: The upgrade button text/state is now handled in updateTowerInfo()
    }

    upgradeTower() {
        if (!this.selectedTowerForUpgrade) return;

        const { tower, index } = this.selectedTowerForUpgrade;
        const towerType = towerTypes[tower.type];
        if (!towerType) return;

        const currentLevel = tower.level;
        const maxLevel = towerType.upgrades.length;


        // Prüfen, ob ein Upgrade möglich ist
        if (currentLevel >= maxLevel) {
            console.log("Tower is already at max level.");
            return;
        }

        // Nächstes Upgrade und Kosten ermitteln
        const nextUpgradeInfo = towerType.upgrades[currentLevel];
        const upgradeCost = nextUpgradeInfo.cost;

        // Prüfen, ob genug Gold vorhanden ist
        if (this.gold < upgradeCost) {
            console.log("Not enough gold to upgrade.");
            // Optional: Visuelles Feedback (Button rot blinken lassen?)
            return;
        }


        // Upgrade im TowerManager durchführen (nur eine Stufe auf einmal)
        const result = this.towerManager.upgradeTower(index); // Pass only index, logic inside handles +1 level

        if (result.success) {
            // Gold abziehen
            this.gold -= result.cost; // Use cost returned by towerManager
            this.updateUI(); // Update gold display

            // Upgrade-Panel mit den neuen Werten aktualisieren
            // Need to fetch the updated tower object reference?
            // Assuming tower object in selectedTowerForUpgrade is updated by reference:
            this.updateTowerInfo();


            console.log(`Tower upgraded to level ${this.selectedTowerForUpgrade.tower.level}. Cost: ${result.cost}`);
        } else {
            console.error("Tower upgrade failed in TowerManager.");
        }
    }


    sellTower() {
        if (!this.selectedTowerForUpgrade) return;

        const { index } = this.selectedTowerForUpgrade;

        // Turm verkaufen und Gold zurückbekommen
        const goldRefund = this.towerManager.removeTower(index);

        if (goldRefund !== null) { // Check if removal was successful
            this.gold += goldRefund;
            console.log(`Tower sold for ${goldRefund} gold.`);

            // Panel schließen und UI aktualisieren
            this.closeUpgradePanel(); // Closes panel and resets selection
            this.updateUI(); // Update gold display
        } else {
            console.error("Failed to sell tower at index:", index);
            // Maybe just close the panel anyway?
            this.closeUpgradePanel();
            this.updateUI();
        }
    }


    closeUpgradePanel() {
        this.upgradePanel.style.display = 'none';

        // Turm abwählen, wenn einer ausgewählt war
        if (this.selectedTowerForUpgrade) {
            // Ensure tower still exists before trying to deselect
            // Find the tower by index again, as the reference might be stale if resetGame was called etc.
            const currentTower = this.towerManager.towers.find(t => t === this.selectedTowerForUpgrade.tower);
            if (currentTower) {
                currentTower.selected = false;
            }
            this.selectedTowerForUpgrade = null;

            // Reichweitenkreise aktualisieren (entfernt den Kreis des abgewählten Turms)
            this.towerManager.updateRangeCircles();
        }
    }


    updateUI() {
        // Spielinfo aktualisieren
        this.livesElement.textContent = this.lives;
        this.goldElement.textContent = this.gold;
        // Show the current wave number (highest started wave)
        this.waveElement.textContent = this.enemyManager.waveNumber;
        // Optional: Show pending waves next to wave number
        if (this.enemyManager.pendingWaves > 0) {
            this.waveElement.textContent += ` (+${this.enemyManager.pendingWaves})`;
            this.startWaveButton.title = `${this.enemyManager.pendingWaves} Wellen warten darauf, gestartet zu werden.`;
        } else {
            this.startWaveButton.title = "Startet die nächste Welle"; // Default tooltip
        }


        // -- Button States --
        const isGameOver = this.lives <= 0;
        // Enable start buttons only if game is not over AND
        // (either no wave is in progress OR waves are in progress but spawning is finished?)
        // Let's allow queuing anytime if not game over. EnemyManager handles the logic.
        this.startWaveButton.disabled = isGameOver;
        this.waveButton2x.disabled = isGameOver;
        this.waveButton3x.disabled = isGameOver;

        // --- Update other UI states ---
        // Radial menu availability if open
        if (this.radialMenu.style.display === 'block') {
            this.updateRadialMenuAvailability();
        }
        // Upgrade panel info if open
        if (this.upgradePanel.style.display === 'block' && this.selectedTowerForUpgrade) {
            this.updateTowerInfo(); // Refresh upgrade costs/button states based on current gold
        }

        // Ensure countdown display is updated
        this.updateCountdownDisplay();
    }


    enemyReachedEnd(enemy) {
        this.lives--;
        this.updateUI(); // Update lives display

        console.log(`Enemy reached end. Lives left: ${this.lives}`);

        // Spielende prüfen
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    enemyKilled(enemy) {
        this.gold += enemy.reward;
        this.updateUI(); // Update gold display
        // console.log(`Enemy killed. Gold: ${this.gold}`);
    }

    gameOver() {
        if (this.gameRunning === false) return; // Prevent multiple triggers
        this.gameRunning = false; // Use a flag in Game or UI class

        console.log("GAME OVER");
        alert(`Game Over! Du hast Welle ${this.enemyManager.waveNumber} erreicht.`);

        // Disable buttons permanently?
        this.startWaveButton.disabled = true;
        this.waveButton2x.disabled = true;
        this.waveButton3x.disabled = true;
        // Maybe show a reset button instead?

        // Optional: Stop game loop in game.js if needed
        if (window.game) {
            window.game.stopGame(); // Add a stopGame method to the Game class
        }


        // We could call resetGame() here, or add a "Restart Game" button
        // For now, let's just leave the game state as is and disable buttons.
        // resetGame();
    }
}