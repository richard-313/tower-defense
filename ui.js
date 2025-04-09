// UI Management and User Interactions
class GameUI {
    constructor(gameMap, towerManager, enemyManager) {
        this.gameMap = gameMap;
        this.towerManager = towerManager;
        this.enemyManager = enemyManager;

        this.selectedTowerType = null;
        this.gold = 100;
        this.lives = 10;
        this.selectedTowerForUpgrade = null;

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Mouse position tracking
        this.mouseX = null;
        this.mouseY = null;

        // UI Elements
        this.livesElement = document.getElementById('lives');
        this.goldElement = document.getElementById('gold');
        this.waveElement = document.getElementById('wave');
        this.startWaveButton = document.getElementById('startWave');
        this.countdownElement = document.getElementById('countdown');

        // Tower buttons
        this.towerButtons = {
            basic: document.getElementById('basicTower'),
            sniper: document.getElementById('sniperTower'),
            slow: document.getElementById('slowTower'),
            bomb: document.getElementById('bombTower')
        };

        // Map buttons
        this.mapButtons = {
            map1: document.getElementById('map1'),
            map2: document.getElementById('map2'),
            map3: document.getElementById('map3')
        };

        // Upgrade panel elements
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
        // Tower selection buttons
        for (const [type, button] of Object.entries(this.towerButtons)) {
            button.addEventListener('click', () => this.selectTowerType(type));
        }

        // Map selection buttons
        for (const [mapId, button] of Object.entries(this.mapButtons)) {
            button.addEventListener('click', () => this.changeMap(mapId));
        }

        // Canvas events
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));

        // Wave control
        this.startWaveButton.addEventListener('click', () => this.startNextWave());

        // Upgrade panel controls
        this.upgradeDirectlyButton.addEventListener('click', () => this.upgradeTower());
        this.sellTowerButton.addEventListener('click', () => this.sellTower());
        this.closeUpgradeButton.addEventListener('click', () => this.closeUpgradePanel());
    }

    changeMap(mapId) {
        // Change map only if there are no enemies active
        if (this.enemyManager.enemies.length > 0) {
            return; // Cannot change map during a wave
        }

        // Update map button selection
        for (const button of Object.values(this.mapButtons)) {
            button.classList.remove('selected');
        }
        this.mapButtons[mapId].classList.add('selected');

        // Reset the game state
        this.resetGame();

        // Set the new map
        this.gameMap.setMap(mapId);

        // Update managers with new map
        this.towerManager.updateMap(this.gameMap);
        this.enemyManager.updatePath(this.gameMap.path);
    }

    resetGame() {
        this.gold = 100;
        this.lives = 10;
        this.enemyManager.waveNumber = 0;
        this.enemyManager.enemies = [];
        this.towerManager.towers = [];
        this.towerManager.projectiles = [];
        this.selectedTowerType = null;
        this.selectedTowerForUpgrade = null;
        this.enemyManager.cancelWaveTimer();
        this.updateUI();
    }

    selectTowerType(type) {
        // Check if enough gold
        if (this.gold < towerTypes[type].cost) {
            return;
        }

        // Select or deselect tower
        if (this.selectedTowerType === type) {
            this.selectedTowerType = null;
        } else {
            this.selectedTowerType = type;
        }

        // Update button UI
        for (const [towerType, button] of Object.entries(this.towerButtons)) {
            button.classList.toggle('selected', towerType === this.selectedTowerType);
        }
    }

    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // Check if clicked on an existing tower
        const towerResult = this.towerManager.getTowerAt(clickX, clickY);
        if (towerResult) {
            // Show upgrade panel
            this.showUpgradePanel(towerResult.tower, towerResult.index, clickX, clickY);
            return;
        }

        // Place new tower if a tower type is selected
        if (this.selectedTowerType) {
            if (this.placeTower(this.selectedTowerType, clickX, clickY)) {
                // Tower placed successfully
                this.gold -= towerTypes[this.selectedTowerType].cost;
                this.updateUI();

                // Deselect tower type after placing
                this.selectedTowerType = null;
                for (const button of Object.values(this.towerButtons)) {
                    button.classList.remove('selected');
                }
            }
        }
    }

    handleCanvasMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Store current mouse position for use in drawTowerPreview
        this.mouseX = mouseX;
        this.mouseY = mouseY;

        // Reset hover state on all towers
        for (const tower of this.towerManager.towers) {
            tower.hover = false;
        }

        // Check if hovering over a tower
        const towerResult = this.towerManager.getTowerAt(mouseX, mouseY);
        if (towerResult) {
            towerResult.tower.hover = true;
        }

        // Update cursor if a tower type is selected
        if (this.selectedTowerType) {
            // Show tower range preview on hover - handled in rendering
        }
    }

    placeTower(type, x, y) {
        return this.towerManager.addTower(type, x, y);
    }

    startNextWave() {
        // Start next wave
        const waveNumber = this.enemyManager.startNextWave(() => {
            // This callback will be called when the wave is complete

            // Schedule next wave after delay
            this.scheduleNextWave();
        });

        // Update UI
        this.waveElement.textContent = waveNumber;
        this.startWaveButton.disabled = true;
    }

    scheduleNextWave() {
        // Add bonus gold for completing wave
        const waveBonus = 20 + this.enemyManager.waveNumber * 5;
        this.gold += waveBonus;
        this.updateUI();

        // Schedule next wave after delay (3 seconds)
        const autoStartTime = 3000; // 3 seconds
        this.enemyManager.scheduleNextWave(autoStartTime, () => {
            // Wave started automatically
            this.waveElement.textContent = this.enemyManager.waveNumber;
            // Make sure the UI is updated
            this.startWaveButton.disabled = true;
        });

        // Update countdown display
        this.updateCountdown();

        // Enable start button
        this.startWaveButton.disabled = false;
    }

    updateCountdown() {
        const remainingTime = this.enemyManager.getCurrentCountdown();

        if (remainingTime <= 0) {
            this.countdownElement.textContent = 'Bereit';
            return;
        }

        // Format seconds
        const seconds = Math.ceil(remainingTime / 1000);
        this.countdownElement.textContent = `${seconds}s`;

        // Continue updating every 500ms until countdown is done
        setTimeout(() => this.updateCountdown(), 500);
    }

    showUpgradePanel(tower, towerIndex, x, y) {
        // Set current tower for upgrade
        this.selectedTowerForUpgrade = { tower, index: towerIndex };

        // Position panel near tower
        this.upgradePanel.style.left = (x + 20) + 'px';
        this.upgradePanel.style.top = (y - 100) + 'px';
        this.upgradePanel.style.display = 'block';

        // Remove selection from all towers
        for (const t of this.towerManager.towers) {
            t.selected = false;
        }

        // Mark this tower as selected
        tower.selected = true;

        // Update tower info
        this.updateTowerInfo();
    }

    updateTowerInfo() {
        if (!this.selectedTowerForUpgrade) return;

        const { tower } = this.selectedTowerForUpgrade;
        const towerType = towerTypes[tower.type];

        // Basic tower information
        let infoText = `<b>${towerType.name}</b><br>`;
        infoText += `<i>${towerType.description}</i><br><br>`;
        infoText += `Level: ${tower.level}/3<br>`;
        infoText += `Schaden: ${tower.damage}<br>`;
        infoText += `Reichweite: ${tower.range}<br>`;
        infoText += `Feuerrate: ${(1000 / tower.fireRate).toFixed(1)}/s<br>`;

        // Special properties
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

        // Create upgrade path visualization
        this.createUpgradePathUI();

        // Set target level for upgrade
        const targetLevel = Math.min(tower.level + 1, 3);
        this.targetLevelSpan.textContent = targetLevel;

        // Calculate and display upgrade cost
        let upgradeCost = 0;

        if (targetLevel <= towerType.upgrades.length && targetLevel > tower.level) {
            upgradeCost = this.towerManager.getUpgradeCost(tower, targetLevel);
            this.upgradeDirectlyButton.disabled = this.gold < upgradeCost;
        } else {
            this.upgradeDirectlyButton.disabled = true;
        }

        this.upgradeCostSpan.textContent = upgradeCost;

        // Set sell value
        this.sellValueSpan.textContent = tower.sellValue;
    }

    createUpgradePathUI() {
        if (!this.selectedTowerForUpgrade) return;

        const { tower } = this.selectedTowerForUpgrade;
        const towerType = towerTypes[tower.type];

        // Clear previous path
        this.upgradeProgressDiv.innerHTML = '';

        // Create upgrade path
        const path = document.createElement('div');
        path.classList.add('upgrade-path');

        // Add level markers
        for (let i = 0; i <= 3; i++) {
            // Level marker
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

            // Add connecting path (except after last marker)
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

        // Update upgrade button based on next available upgrade
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

        // Perform upgrade
        const result = this.towerManager.upgradeTower(index, targetLevel);

        if (result.success) {
            // Deduct gold
            this.gold -= result.cost;
            this.updateUI();

            // Update upgrade panel
            this.updateTowerInfo();
        }
    }

    sellTower() {
        if (!this.selectedTowerForUpgrade) return;

        const { index } = this.selectedTowerForUpgrade;

        // Sell tower and get gold back
        const goldRefund = this.towerManager.removeTower(index);
        this.gold += goldRefund;

        // Close panel and update UI
        this.closeUpgradePanel();
        this.updateUI();
    }

    closeUpgradePanel() {
        this.upgradePanel.style.display = 'none';

        // Deselect tower
        if (this.selectedTowerForUpgrade) {
            this.selectedTowerForUpgrade.tower.selected = false;
            this.selectedTowerForUpgrade = null;
        }
    }

    updateUI() {
        // Update game info
        this.livesElement.textContent = this.lives;
        this.goldElement.textContent = this.gold;
        this.waveElement.textContent = this.enemyManager.waveNumber;

        // Update tower buttons
        for (const [type, button] of Object.entries(this.towerButtons)) {
            const towerType = towerTypes[type];
            button.disabled = this.gold < towerType.cost;

            // Update the tower label with current cost
            const labelElement = button.querySelector('.tower-label');
            if (labelElement) {
                labelElement.textContent = `${towerType.name} (${towerType.cost})`;
            }
        }

        // Update wave button
        this.startWaveButton.disabled = this.enemyManager.waveInProgress;
    }

    enemyReachedEnd(enemy) {
        this.lives--;
        this.updateUI();

        // Check game over
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

    // Updated drawTowerPreview method in the GameUI class
    // Add this method to your ui.js file

    drawTowerPreview(ctx) {
        if (!this.selectedTowerType) return;

        // Get the current mouse position
        // We need to track mouse position in the class
        if (!this.mouseX || !this.mouseY) return;

        // Get tile center
        const tileCenter = this.gameMap.getTileCenter(this.mouseX, this.mouseY);

        // Check if tower can be placed here
        const canPlace = !this.gameMap.isTileOccupied(this.mouseX, this.mouseY);

        // Draw tower preview
        const towerType = towerTypes[this.selectedTowerType];

        // Draw range circle
        ctx.strokeStyle = canPlace ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tileCenter.x, tileCenter.y, towerType.range, 0, Math.PI * 2);
        ctx.stroke();

        // Draw tower placeholder
        ctx.fillStyle = canPlace ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(tileCenter.x, tileCenter.y, 15, 0, Math.PI * 2);
        ctx.fill();
    }
}