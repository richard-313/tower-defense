// --- START OF FILE ui.js ---

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
        // Rename clickX/Y to avoid confusion with event click coords
        this.radialPlacementX = null; // Store game coordinates for tower placement
        this.radialPlacementY = null;

        // Mausposition-Tracking
        this.mouseX = null; // Game coordinates (scaled)
        this.mouseY = null;
        this.mouseClientX = null; // Viewport coordinates
        this.mouseClientY = null;
        this.mouseCanvasX = null; // Coordinates relative to canvas top-left
        this.mouseCanvasY = null;


        // --- Get UI Elements (using newer structure for clarity) ---
        // Header
        this.languageSelect = document.getElementById('languageSelect');
        this.saveGameButton = document.getElementById('saveGame');
        this.loadGameButton = document.getElementById('loadGame');
        this.mapButtons = { // Store by mapId
            map1: document.querySelector('.map-button[data-mapid="map1"]'),
            map2: document.querySelector('.map-button[data-mapid="map2"]'),
            map3: document.querySelector('.map-button[data-mapid="map3"]')
        };
        this.helpButton = document.getElementById('helpButton');

        // Game Info
        this.livesElement = document.getElementById('lives');
        this.goldElement = document.getElementById('gold');
        this.waveElement = document.getElementById('wave');
        this.startWaveButton = document.getElementById('startWave');
        this.countdownElement = document.getElementById('wave-countdown');

        // Radial Menu
        this.radialMenu = document.getElementById('radialTowerMenu');
        this.radialCancelButton = document.getElementById('radialCancelButton');
        this.radialTowerOptions = { // Store by type
            basic: document.getElementById('radialBasicTower'),
            sniper: document.getElementById('radialSniperTower'),
            slow: document.getElementById('radialSlowTower'),
            bomb: document.getElementById('radialBombTower'),
            lightning: document.getElementById('radialLightningTower')
        };

        // Upgrade Panel
        this.upgradePanel = document.getElementById('upgradePanel');
        this.upgradePanelTitle = document.getElementById('upgradePanelTitle');
        this.towerInfo = document.getElementById('towerInfo');
        this.upgradeProgressDiv = document.getElementById('currentLevel');
        this.upgradeDirectlyButton = document.getElementById('upgradeDirectly');
        this.sellTowerButton = document.getElementById('sellTower');
        this.sellValueSpan = this.sellTowerButton.querySelector('#sellValue'); // Corrected selector
        this.closeUpgradeButton = document.getElementById('closeUpgrade');

        // Modal Popup
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalContent = document.getElementById('modalContent');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalBody = document.getElementById('modalBody');
        this.modalClose = document.getElementById('modalClose');
        // --- End Get UI Elements ---

        this.updateTowerCostsInMenu(); // Set initial data-cost attributes
        this.initEventListeners();
        this.updateUI(); // Initial UI update
    }

    updateTowerCostsInMenu() {
        for (const type in this.radialTowerOptions) {
            const element = this.radialTowerOptions[type];
            if (element && towerTypes[type]) {
                element.setAttribute('data-cost', towerTypes[type].cost);
            }
        }
    }

    // Using the more robust event listeners from the newer version
    initEventListeners() {
        // --- Header Listeners ---
        if (this.languageSelect) {
            this.languageSelect.addEventListener('change', (e) => this.setLanguage(e.target.value));
        }
        if (this.saveGameButton) {
            this.saveGameButton.addEventListener('click', () => this.saveGame());
        }
        if (this.loadGameButton) {
            this.loadGameButton.addEventListener('click', () => this.loadGame());
        }
        if (this.helpButton) {
            this.helpButton.addEventListener('click', () => this.showHelpPopup());
        }
        for (const [mapId, button] of Object.entries(this.mapButtons)) {
            if (button) {
                button.addEventListener('click', () => this.changeMap(mapId));
            }
        }

        // --- Game Info Listeners ---
        if (this.startWaveButton) {
            this.startWaveButton.addEventListener('click', () => this.startNextWave());
        }

        // --- Canvas Interaction ---
        // *** CRITICAL: Use the gameContainer (inner div) for events ***
        const gameCanvasContainer = document.getElementById('gameContainer');
        if (gameCanvasContainer) {
            gameCanvasContainer.addEventListener('click', (e) => this.handleCanvasClick(e));
            gameCanvasContainer.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
            gameCanvasContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent default right-click menu
                this.hideRadialMenu();
                this.closeUpgradePanel();
            });
        } else {
            console.error("Game canvas container (gameContainer) not found for event listeners.");
            // Fallback to view if necessary, but might cause issues with coordinate calculations
            if (this.app.view) {
                console.warn("Attaching listeners to app.view as fallback.");
                this.app.view.addEventListener('click', (e) => this.handleCanvasClick(e));
                this.app.view.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
                this.app.view.addEventListener('contextmenu', (e) => e.preventDefault());
            }
        }


        // --- Radial Menu Listeners ---
        for (const [type, element] of Object.entries(this.radialTowerOptions)) {
            if (element) {
                element.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent canvas click
                    this.selectTowerFromRadial(type);
                });
            }
        }
        if (this.radialCancelButton) {
            this.radialCancelButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideRadialMenu();
            });
        }

        // --- Upgrade Panel Listeners ---
        if (this.upgradeDirectlyButton) {
            this.upgradeDirectlyButton.addEventListener('click', () => this.upgradeTower());
        }
        if (this.sellTowerButton) {
            this.sellTowerButton.addEventListener('click', () => this.sellTower());
        }
        if (this.closeUpgradeButton) {
            this.closeUpgradeButton.addEventListener('click', () => this.closeUpgradePanel());
        }

        // --- Modal Listeners ---
        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.hideModal());
        }
        if (this.modalOverlay) {
            this.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.modalOverlay) {
                    this.hideModal();
                }
            });
        }

        // --- Global Click Listener (for closing menus) ---
        document.addEventListener('click', (e) => {
            const isClickOnGameContainer = gameCanvasContainer?.contains(e.target);
            // Close Radial Menu if click is outside and not on canvas container
            if (this.radialMenu && this.radialMenu.style.display === 'block' && !this.radialMenu.contains(e.target) && !isClickOnGameContainer) {
                this.hideRadialMenu();
            }
            // Close Upgrade Panel if click is outside, not on canvas, and not on the panel itself
            const isClickOnTower = this.towerManager.getTowerAt(this.mouseX, this.mouseY); // Check game coords
            if (this.upgradePanel && this.upgradePanel.style.display === 'block' && !this.upgradePanel.contains(e.target) && !isClickOnGameContainer && !isClickOnTower) {
                this.closeUpgradePanel();
            }
        });
    }

    // --- Language Handling (from newer version) ---
    setLanguage(lang) {
        if (translations[lang]) {
            currentLanguage = lang;
            if (this.languageSelect) this.languageSelect.value = lang;
            console.log(`Language set to: ${lang}`);
            this.updateUIText();
            this.updateTowerCostsInMenu();
            if (this.selectedTowerForUpgrade) {
                this.updateTowerInfo();
            }
            for (const [mapId, button] of Object.entries(this.mapButtons)) {
                if (button) {
                    button.textContent = t(`map.${mapId}.name`);
                }
            }
        } else {
            console.warn(`Language "${lang}" not found.`);
        }
    }

    updateUIText() {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            element.textContent = t(key);
        });
        document.querySelectorAll('[data-translate-base]').forEach(element => {
            const key = element.getAttribute('data-translate-base');
            if (element.id === 'sellTower' && this.sellValueSpan) {
                const baseText = t(key);
                element.textContent = `${baseText} (${this.sellValueSpan.textContent || '0'} G)`;
            } else if (element.id === 'upgradeDirectly') {
                // Handled dynamically in updateTowerInfo
            } else {
                element.textContent = t(key);
            }
        });
        if (this.countdownElement && !this.enemyManager.autoStartTimer) {
            const readyKey = this.countdownElement.getAttribute('data-translate-ready') || 'ui.waveReady';
            this.countdownElement.textContent = t(readyKey);
        }
        document.title = t('game.title');
        for (const [type, element] of Object.entries(this.radialTowerOptions)) {
            if (element) {
                const cost = element.getAttribute('data-cost');
                const nameKey = `tower.${type}.name`;
                const tooltipText = t(nameKey);
                // const costText = ` (${cost} G)`;
                element.setAttribute('data-tooltip', tooltipText); // Combine name and cost
                element.setAttribute('data-tooltip-expensive', tooltipText + ` (${t('ui.cannotAfford')})`); // Use 'Too expensive' text
            }
        }
        if (this.upgradePanelTitle) {
            this.upgradePanelTitle.textContent = t('ui.towerInfo');
        }
        // Update map button names explicitly if not covered by data-translate
        for (const [mapId, button] of Object.entries(this.mapButtons)) {
            if (button && !button.hasAttribute('data-translate')) {
                button.textContent = t(`map.${mapId}.name`);
            }
        }
    }

    // --- Modal Popup (from newer version) ---
    showModal(titleKey, messageKey, replacements = {}) {
        if (!this.modalOverlay || !this.modalTitle || !this.modalBody || !this.modalClose) return;
        this.modalTitle.textContent = t(titleKey);
        this.modalBody.innerHTML = t(messageKey, replacements);
        this.modalClose.textContent = t('ui.close');
        this.modalOverlay.style.display = 'flex';
    }

    hideModal() {
        if (!this.modalOverlay) return;
        this.modalOverlay.style.display = 'none';
    }

    // --- Help Popup (from newer version) ---
    showHelpPopup() {
        const titleKey = "help.title";
        const bodyHtml = this.generateHelpContentHTML();
        if (!this.modalOverlay || !this.modalTitle || !this.modalBody || !this.modalClose) return;
        this.modalTitle.textContent = t(titleKey);
        this.modalBody.innerHTML = bodyHtml;
        this.modalClose.textContent = t('help.close');
        this.modalOverlay.style.display = 'flex';
    }

    generateHelpContentHTML() {
        const goldIcon = '💰'; const livesIcon = '❤️';
        let html = `<h3>${t('help.goal.title')}</h3><p>${t('help.goal.body')}</p>`;
        html += `<h3>${t('help.controls.title')}</h3><p>${t('help.controls.body')}</p>`;
        html += `<h3>${t('help.resources.title')}</h3><p>${t('help.resources.body', { goldIcon, livesIcon })}</p>`;
        html += `<h3>${t('help.waves.title')}</h3><p>${t('help.waves.body')}</p>`;
        html += `<h3>${t('help.towers.title')}</h3><ul>`;
        for (const type in towerTypes) {
            if (towerTypes.hasOwnProperty(type)) {
                html += `<li><b>${t(`tower.${type}.name`)}:</b> ${t(`help.tower.${type}.desc`)}</li>`;
            }
        }
        html += `</ul>`;
        html += `<h3>${t('help.enemies.title')}</h3><ul>`;
        for (const type in enemyTypes) {
            if (enemyTypes.hasOwnProperty(type)) {
                html += `<li><b>${t(`enemy.${type}.name`)}:</b> ${t(`help.enemy.${type}.desc`)}</li>`;
            }
        }
        html += `</ul>`;
        html += `<h3>${t('help.saveLoad.title')}</h3><p>${t('help.saveLoad.body')}</p>`;
        return html;
    }


    // --- Map and Game State (using robust reset/change from newer version) ---
    changeMap(mapId) {
        if (!this.gameMap || !this.enemyManager || !this.towerManager) return;
        if (this.enemyManager.enemies.length > 0 || this.enemyManager.enemiesRemaining > 0) {
            this.showModal('alert.cannotSwitchMap.title', 'alert.cannotSwitchMap.body');
            return;
        }
        for (const button of Object.values(this.mapButtons)) {
            if (button) button.classList.remove('selected');
        }
        if (this.mapButtons[mapId]) {
            this.mapButtons[mapId].classList.add('selected');
        }
        this.resetGame(true); // Keep stats
        this.gameMap.setMap(mapId);
        this.towerManager.updateMap(this.gameMap);
        this.enemyManager.updatePath(this.gameMap.path);
        const bgColor = this.gameMap.currentMapDesign?.terrainColors?.empty || 0x7d934c;
        this.app.renderer.background.color = bgColor;
        const canvasContainer = document.getElementById('gameCanvasWrapper');
        if (canvasContainer) {
            const cssColor = '#' + bgColor.toString(16).padStart(6, '0');
            canvasContainer.style.backgroundColor = cssColor;
        }
        this.updateUI();
    }

    resetGame(keepStats = false) {
        if (!keepStats) {
            this.gold = 100;
            this.lives = 10;
            if (this.enemyManager) this.enemyManager.waveNumber = 0;
        }
        if (this.enemyManager) {
            this.enemyManager.resetGame();
        }
        if (this.towerManager) {
            while (this.towerManager.towers.length > 0) this.towerManager.removeTower(0);
            while (this.towerManager.projectiles.length > 0) this.towerManager.removeProjectile(0);
            this.towerManager.projectiles = []; this.towerManager.towers = [];
        }
        this.selectedTowerForUpgrade = null;
        this.hideRadialMenu();
        this.closeUpgradePanel();
        if (this.countdownElement) {
            const readyKey = this.countdownElement.getAttribute('data-translate-ready') || 'ui.waveReady';
            this.countdownElement.textContent = t(readyKey);
        }
        if (this.gameMap) {
            if (this.gameMap.gridContainer) this.gameMap.gridContainer.removeChildren();
            if (this.gameMap.decorationContainer) this.gameMap.decorationContainer.removeChildren();
        }
        this.updateUI();
        console.log(`Game reset performed. Stats ${keepStats ? 'kept' : 'reset'}.`);
    }


    // --- User Interaction ---
    handleCanvasClick(event) {
        // Use currentTarget which should be the gameContainer div
        const targetElement = event.currentTarget;
        if (!targetElement) {
            console.error("Canvas click target element not found.");
            return;
        }
        const rect = targetElement.getBoundingClientRect();

        // Calculate click coordinates relative to the PIXI stage/map
        const gameX = (event.clientX - rect.left - this.app.stage.position.x) / this.app.stage.scale.x;
        const gameY = (event.clientY - rect.top - this.app.stage.position.y) / this.app.stage.scale.y;

        // Calculate click coordinates relative to the canvas container element top-left
        const canvasRelativeX = event.clientX - rect.left;
        const canvasRelativeY = event.clientY - rect.top;

        // Check click bounds (using game coordinates)
        if (gameX < 0 || gameX > this.gameMap.width * this.gameMap.tileSize ||
            gameY < 0 || gameY > this.gameMap.height * this.gameMap.tileSize) {
            this.hideRadialMenu();
            this.closeUpgradePanel();
            return; // Click outside map bounds
        }

        // Check for tower click (using game coordinates)
        const towerResult = this.towerManager.getTowerAt(gameX, gameY);
        if (towerResult) {
            // Show upgrade panel - pass CANVAS RELATIVE coordinates for positioning
            this.showUpgradePanel(towerResult.tower, towerResult.index, canvasRelativeX, canvasRelativeY);
            this.hideRadialMenu();
        } else if (!this.gameMap.isTileOccupied(gameX, gameY)) {
            // Show radial menu - pass VIEWPORT coordinates for positioning
            this.showRadialMenu(event.clientX, event.clientY);
            this.closeUpgradePanel();
            // Store GAME coordinates for tower placement
            this.radialPlacementX = gameX;
            this.radialPlacementY = gameY;
        } else {
            // Click on occupied tile (path, decoration, etc.)
            this.hideRadialMenu();
            this.closeUpgradePanel();
        }
    }

    handleCanvasMouseMove(event) {
        const targetElement = event.currentTarget;
        if (!targetElement) return;
        const rect = targetElement.getBoundingClientRect();

        // Store various coordinate types
        this.mouseClientX = event.clientX;
        this.mouseClientY = event.clientY;
        this.mouseCanvasX = event.clientX - rect.left;
        this.mouseCanvasY = event.clientY - rect.top;
        this.mouseX = (this.mouseCanvasX - this.app.stage.position.x) / this.app.stage.scale.x;
        this.mouseY = (this.mouseCanvasY - this.app.stage.position.y) / this.app.stage.scale.y;


        // Hover state for towers (using game coordinates)
        let towerHovered = false;
        for (const tower of this.towerManager.towers) {
            if (!tower || !tower.container || tower.container._destroyed) continue;
            const dx = tower.x - this.mouseX;
            const dy = tower.y - this.mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const hoverRadius = this.gameMap.tileSize * 0.55; // Slightly larger hover radius

            if (distance <= hoverRadius) {
                tower.hover = true;
                towerHovered = true;
            } else {
                tower.hover = false;
            }
        }
        this.towerManager.updateRangeCircles();
    }

    // Use viewport coordinates for positioning the radial menu itself
    showRadialMenu(clientX, clientY) {
        if (!this.radialMenu) return;
        this.radialMenu.style.left = `${clientX}px`;
        this.radialMenu.style.top = `${clientY}px`;
        this.radialMenu.style.display = 'block';
        this.updateRadialMenuAvailability();
    }

    hideRadialMenu() {
        if (!this.radialMenu) return;
        this.radialMenu.style.display = 'none';
        this.radialPlacementX = null; // Clear stored game coordinates
        this.radialPlacementY = null;
    }

    updateRadialMenuAvailability() {
        if (!this.radialMenu || this.radialMenu.style.display === 'none') return;
        for (const [type, element] of Object.entries(this.radialTowerOptions)) {
            if (!element || !towerTypes[type]) continue;
            const cost = towerTypes[type].cost;
            if (this.gold < cost) {
                element.classList.add('disabled');
            } else {
                element.classList.remove('disabled');
            }
        }
    }

    selectTowerFromRadial(type) {
        if (!towerTypes[type]) return;
        const cost = towerTypes[type].cost;

        if (this.gold < cost) {
            this.showModal('alert.notEnoughGold.title', 'alert.notEnoughGold.body');
            this.hideRadialMenu();
            return;
        }

        // Use stored GAME coordinates (radialPlacementX/Y) for placement
        if (this.radialPlacementX !== null && this.radialPlacementY !== null) {
            if (this.placeTower(type, this.radialPlacementX, this.radialPlacementY)) {
                this.gold -= cost;
                this.updateUI();
                this.hideRadialMenu();
            } else {
                this.showModal('alert.cannotPlaceTower.title', 'alert.cannotPlaceTower.body');
                this.hideRadialMenu();
            }
        } else {
            console.error("Game coordinates for tower placement not stored.");
            this.hideRadialMenu();
        }
    }

    placeTower(type, gameX, gameY) {
        // Ensure tower is placed on the correct tile center using game coordinates
        const center = this.gameMap.getTileCenter(gameX, gameY);
        return this.towerManager.addTower(type, center.x, center.y);
    }

    // --- Waves (using newer version logic) ---
    startNextWave() {
        if (this.lives <= 0) return;
        this.enemyManager.startNextWave(() => { // Pass end-of-all-waves callback
            if (this.lives > 0) {
                this.scheduleNextWave();
            }
        });
        this.updateUI();
        this.hideRadialMenu();
        this.closeUpgradePanel();
    }

    scheduleNextWave() {
        const waveBonus = 20 + this.enemyManager.waveNumber * 5;
        this.gold += waveBonus;
        this.updateUI();
        const autoStartTime = 5000; // 5 seconds
        this.enemyManager.scheduleNextWave(autoStartTime, () => { // Pass auto-start callback
            this.updateUI(); // Update wave number if auto-started
        });
        this.updateCountdown(); // Start/update visual countdown
    }

    updateCountdown() {
        if (!this.countdownElement) return;
        let isTicking = false;
        const tick = () => {
            if (!this.enemyManager.autoStartTimer || !window.game?.running) {
                const readyKey = this.countdownElement.getAttribute('data-translate-ready') || 'ui.waveReady';
                this.countdownElement.textContent = t(readyKey);
                isTicking = false; return;
            }
            isTicking = true;
            const remainingTime = this.enemyManager.getCurrentCountdownPrecise();
            if (remainingTime <= 0) {
                const readyKey = this.countdownElement.getAttribute('data-translate-ready') || 'ui.waveReady';
                this.countdownElement.textContent = t(readyKey);
                isTicking = false; return;
            }
            const seconds = Math.ceil(remainingTime / 1000);
            this.countdownElement.textContent = `${seconds}s`;
            if (this.enemyManager.autoStartTimer && isTicking) {
                setTimeout(tick, 250); // Use setTimeout for controlled updates
            } else if (isTicking) {
                const readyKey = this.countdownElement.getAttribute('data-translate-ready') || 'ui.waveReady';
                this.countdownElement.textContent = t(readyKey);
                isTicking = false;
            }
        };
        if (!isTicking) tick();
    }


    // --- Upgrade Panel ---
    // *** USE POSITIONING LOGIC FROM OLD "WORKING" VERSION ***
    // Takes canvas-relative coordinates (panelX, panelY) from handleCanvasClick
    showUpgradePanel(tower, towerIndex, panelX, panelY) {
        if (!this.upgradePanel || !tower || tower.container._destroyed) return;

        this.selectedTowerForUpgrade = { tower, index: towerIndex };

        // Position relative to canvas/container using canvas-relative click coords
        const panelWidth = this.upgradePanel.offsetWidth;
        const panelHeight = this.upgradePanel.offsetHeight;
        // Get bounds of the container the panel is relative to (game-container)
        const gameContainer = document.querySelector('.game-container'); // The main outer container
        // Get bounds of the canvas container itself for boundary checks
        const canvasContainer = document.getElementById('gameContainer');
        if (!canvasContainer || !gameContainer) {
            console.error("Cannot position upgrade panel: container elements not found.");
            return;
        }
        const canvasRect = canvasContainer.getBoundingClientRect(); // Use inner gameContainer for size

        const containerMargin = 10; // Margin from container edges

        // Initial position attempt (right of click, vertically centered)
        let left = panelX + 20;
        let top = panelY - panelHeight / 2;

        // Boundary check: Right edge (relative to canvas width)
        if (left + panelWidth + containerMargin > canvasRect.width) {
            left = panelX - panelWidth - 20; // Try left of click
        }
        // Boundary check: Left edge
        if (left < containerMargin) {
            left = containerMargin;
        }

        // Boundary check: Top edge
        if (top < containerMargin) {
            top = containerMargin;
        }
        // Boundary check: Bottom edge (relative to canvas height)
        if (top + panelHeight + containerMargin > canvasRect.height) {
            top = canvasRect.height - panelHeight - containerMargin;
        }

        // Apply styles - these are relative to game-container
        this.upgradePanel.style.left = left + 'px';
        this.upgradePanel.style.top = top + 'px';
        this.upgradePanel.style.display = 'block';

        // Visual selection
        this.towerManager.towers.forEach(t => { if (t) t.selected = false; });
        if (tower && !tower.container._destroyed) {
            tower.selected = true;
        } else {
            this.closeUpgradePanel(); return; // Close if tower became invalid
        }

        this.towerManager.updateRangeCircles();
        this.updateTowerInfo(); // Use the robust info update from newer version
    }

    // *** USE ROBUST updateTowerInfo from NEWER VERSION ***
    updateTowerInfo() {
        if (!this.selectedTowerForUpgrade || !this.selectedTowerForUpgrade.tower || this.selectedTowerForUpgrade.tower.container._destroyed) {
            this.closeUpgradePanel();
            return;
        }

        const { tower } = this.selectedTowerForUpgrade;
        const towerType = towerTypes[tower.type];
        if (!towerType || !towerType.upgrades) { // Safety check
            console.error(`Tower type data or upgrades missing for type: ${tower.type}`);
            this.closeUpgradePanel();
            return;
        }
        const maxLevel = towerType.upgrades.length;

        // Tower Stats Display
        let infoHtml = `<b>${t(`tower.${tower.type}.name`)}</b><br>`;
        infoHtml += `${t('ui.currentLevel')}: ${tower.level}/${maxLevel}<br>`;
        infoHtml += `${t('ui.damage')}: ${tower.damage.toFixed(1)}<br>`;
        infoHtml += `${t('ui.range')}: ${tower.range}<br>`;
        infoHtml += `${t('ui.fireRate')}: ${(1000 / tower.fireRate).toFixed(1)}${t('ui.perSecond')}<br>`;

        // Specific Stats (using nullish coalescing for safety)
        if (tower.multishot ?? towerType.multishot) infoHtml += `${t('tower.basic.name')}: ${tower.multishot ?? towerType.multishot}x<br>`;
        if (tower.type === 'slow' || tower.effect === 'slow') {
            const factor = tower.slowFactor ?? towerType.slowFactor;
            const duration = tower.slowDuration ?? towerType.slowDuration;
            if (factor !== undefined) infoHtml += `${t('ui.slowdown')}: ${((1 - factor) * 100).toFixed(0)}%<br>`;
            if (duration !== undefined) infoHtml += `${t('ui.duration')}: ${(duration / 1000).toFixed(1)}s<br>`;
        }
        if (tower.type === 'bomb' || tower.effect === 'splash') {
            const radius = tower.splashRadius ?? towerType.splashRadius;
            if (radius !== undefined) infoHtml += `${t('ui.splashRadius')}: ${radius}<br>`;
        }
        if (tower.type === 'lightning' || tower.effect === 'chainLightning') {
            const count = tower.chainCount ?? towerType.chainCount ?? 0;
            const range = tower.chainRange ?? towerType.chainRange;
            infoHtml += `${t('ui.targets')}: ${count + 1}<br>`;
            if (range !== undefined) infoHtml += `${t('ui.chainRange')}: ${range}<br>`;
        }
        if (tower.pierce ?? towerType.pierce) infoHtml += `${t('ui.pierce')}: ${tower.pierce ?? towerType.pierce}<br>`;

        this.towerInfo.innerHTML = infoHtml;

        // Upgrade Path UI
        this.createUpgradePathUI(); // Keep this function as is

        // Upgrade Button Update
        const targetLevel = tower.level + 1;
        let upgradeCost = 0;
        let nextUpgradeNameKey = 'ui.maxLevel';
        let canAfford = false;

        if (tower.level < maxLevel) {
            upgradeCost = this.towerManager.getUpgradeCost(tower, targetLevel);
            if (towerType.upgrades[tower.level]) {
                // Use the name key directly from the upgrade data if available
                nextUpgradeNameKey = towerType.upgrades[tower.level].name || `upgrade.${tower.type}.${tower.level}.name`;
            } else {
                console.warn(`Upgrade data missing for ${tower.type} level ${tower.level}`);
                nextUpgradeNameKey = 'ui.upgrade'; // Fallback key
            }
            canAfford = this.gold >= upgradeCost;
        }

        if (this.upgradeDirectlyButton) {
            let buttonText = t(nextUpgradeNameKey) || t('ui.upgrade'); // Translate, use fallback
            if (tower.level < maxLevel) {
                buttonText += ` (${upgradeCost} G)`; // Append cost
            }
            this.upgradeDirectlyButton.textContent = buttonText; // Set text directly
            this.upgradeDirectlyButton.disabled = (tower.level >= maxLevel) || !canAfford;
            this.upgradeDirectlyButton.classList.toggle('cant-afford', tower.level < maxLevel && !canAfford);
            this.upgradeDirectlyButton.setAttribute('data-translate-base', tower.level < maxLevel ? nextUpgradeNameKey : 'ui.maxLevel'); // Store base key
        }

        // Sell Button Update
        if (this.sellValueSpan && this.sellTowerButton) {
            const currentSellValue = tower.sellValue || 0; // Ensure sellValue is a number
            this.sellValueSpan.textContent = currentSellValue;
            const baseSellText = t('ui.sell');
            this.sellTowerButton.textContent = `${baseSellText} (${currentSellValue} G)`;
            this.sellTowerButton.setAttribute('data-translate-base', 'ui.sell'); // Store base key
        }
    }

    // Keep createUpgradePathUI as is (from either version, they are similar)
    createUpgradePathUI() {
        if (!this.selectedTowerForUpgrade || !this.upgradeProgressDiv) return;
        const { tower } = this.selectedTowerForUpgrade;
        const towerType = towerTypes[tower.type];
        if (!towerType || !towerType.upgrades) return; // Safety check
        const maxLevel = towerType.upgrades.length;
        this.upgradeProgressDiv.innerHTML = '';
        const pathContainer = document.createElement('div');
        pathContainer.classList.add('upgrade-path');
        for (let i = 0; i <= maxLevel; i++) {
            const marker = document.createElement('div');
            marker.classList.add('level-marker');
            marker.textContent = i;
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

    // Keep upgradeTower, sellTower, closeUpgradePanel as is (from newer version is fine)
    upgradeTower() {
        if (!this.selectedTowerForUpgrade) return;
        const { tower, index } = this.selectedTowerForUpgrade;
        const targetLevel = tower.level + 1;
        const result = this.towerManager.upgradeTower(index, targetLevel);
        if (result.success) {
            this.gold -= result.cost;
            this.updateUI();
            this.updateTowerInfo(); // Refresh panel
        } else {
            this.showModal('alert.upgradeFailed.title', 'alert.upgradeFailed.body');
        }
    }

    sellTower() {
        if (!this.selectedTowerForUpgrade) return;
        const { index } = this.selectedTowerForUpgrade;
        const goldRefund = this.towerManager.removeTower(index);
        this.gold += goldRefund;
        this.closeUpgradePanel();
        this.updateUI();
    }

    closeUpgradePanel() {
        if (!this.upgradePanel) return;
        this.upgradePanel.style.display = 'none';
        if (this.selectedTowerForUpgrade?.tower) {
            // Check if tower still exists in the manager's array before deselecting
            const stillExists = this.towerManager.towers.some(t => t === this.selectedTowerForUpgrade.tower);
            if (stillExists && !this.selectedTowerForUpgrade.tower.container._destroyed) {
                this.selectedTowerForUpgrade.tower.selected = false;
            }
        }
        this.selectedTowerForUpgrade = null;
        this.towerManager.updateRangeCircles();
    }


    // --- Game Event Handlers (from newer version) ---
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
        if (this.lives <= 0 && window.game?.running) { // Prevent multiple calls
            if (window.game) window.game.running = false;
            this.showModal('alert.gameOver.title', 'alert.gameOver.body', { waveNumber: this.enemyManager.waveNumber });
            if (this.startWaveButton) this.startWaveButton.disabled = true;
        }
    }

    // --- UI Update (from newer version) ---
    updateUI() {
        if (this.livesElement) this.livesElement.textContent = this.lives;
        if (this.goldElement) this.goldElement.textContent = this.gold;
        if (this.waveElement) this.waveElement.textContent = this.enemyManager.waveNumber;
        if (this.startWaveButton) {
            // Disable during active wave OR if game over
            this.startWaveButton.disabled = this.lives <= 0 || this.enemyManager.waveInProgress;
        }
        this.updateRadialMenuAvailability();
        if (this.selectedTowerForUpgrade) this.updateTowerInfo(); // Refresh upgrade panel
        this.updateUIText(); // Update static text for language changes
    }


    // --- Save/Load (use robust version) ---
    saveGame() {
        console.log("Saving game...");
        if (!this.towerManager || !this.enemyManager || !this.gameMap) {
            this.showModal('alert.saveError.title', 'Save Error: Components missing');
            return;
        }
        const towersData = this.towerManager.towers.map(tower => {
            if (!tower || !tower.container || tower.container._destroyed) return null;
            return { type: tower.type, x: tower.x, y: tower.y, level: tower.level };
        }).filter(t => t !== null);
        const saveData = {
            version: 1, gold: this.gold, lives: this.lives,
            waveNumber: this.enemyManager.waveNumber, mapId: mapConfig.currentMap,
            towers: towersData, timestamp: Date.now()
        };
        try {
            localStorage.setItem('medievalTowerDefenseSave', JSON.stringify(saveData));
            this.showModal('alert.saveSuccess.title', 'alert.saveSuccess.body');
        } catch (error) {
            console.error("Error saving game:", error);
            this.showModal('alert.saveError.title', 'alert.saveError.body', { message: error.message });
        }
    }

    loadGame() {
        console.log("Loading game...");
        const savedDataString = localStorage.getItem('medievalTowerDefenseSave');
        if (!savedDataString) {
            this.showModal('alert.noSave.title', 'alert.noSave.body');
            return;
        }
        try {
            const loadedData = JSON.parse(savedDataString);
            console.log("Loaded data:", loadedData);
            if (loadedData.version !== 1 || typeof loadedData.gold !== 'number' || typeof loadedData.lives !== 'number' || typeof loadedData.waveNumber !== 'number' || typeof loadedData.mapId !== 'string' || !Array.isArray(loadedData.towers)) {
                throw new Error(t('alert.invalidSaveData.body'));
            }
            this.resetGame(true); // Reset board, keep stats flag (stats overwritten anyway)
            this.gameMap.setMap(loadedData.mapId);
            this.towerManager.updateMap(this.gameMap);
            this.enemyManager.updatePath(this.gameMap.path);
            for (const [mapId, button] of Object.entries(this.mapButtons)) {
                if (button) button.classList.toggle('selected', mapId === loadedData.mapId);
            }
            const bgColor = this.gameMap.currentMapDesign?.terrainColors?.empty || 0x7d934c;
            this.app.renderer.background.color = bgColor;
            const canvasWrapper = document.getElementById('gameCanvasWrapper'); // Target wrapper
            if (canvasWrapper) {
                const cssColor = '#' + bgColor.toString(16).padStart(6, '0');
                canvasWrapper.style.backgroundColor = cssColor;
            }
            this.gold = loadedData.gold;
            this.lives = loadedData.lives;
            this.enemyManager.waveNumber = loadedData.waveNumber;
            loadedData.towers.forEach(savedTower => {
                if (!savedTower) return;
                const success = this.placeTower(savedTower.type, savedTower.x, savedTower.y);
                if (success) {
                    const addedTower = this.towerManager.towers[this.towerManager.towers.length - 1];
                    if (addedTower && savedTower.level > 0) {
                        const towerType = towerTypes[addedTower.type];
                        if (towerType?.upgrades) {
                            // --- Re-apply stats manually based on level ---
                            Object.assign(addedTower, { damage: towerType.damage, range: towerType.range, fireRate: towerType.fireRate, multishot: towerType.multishot, slowFactor: towerType.slowFactor, slowDuration: towerType.slowDuration, splashRadius: towerType.splashRadius, chainCount: towerType.chainCount, chainRange: towerType.chainRange, pierce: towerType.pierce });
                            addedTower.upgrades = [];
                            for (let i = 0; i < savedTower.level; i++) {
                                if (i < towerType.upgrades.length) {
                                    const upgradeData = towerType.upgrades[i];
                                    addedTower.upgrades.push(upgradeData);
                                    for (const [key, value] of Object.entries(upgradeData)) {
                                        if (key !== 'name' && key !== 'cost' && key !== 'description') {
                                            if (key.endsWith('Multiplier')) {
                                                const baseKey = key.replace('Multiplier', '');
                                                if (addedTower[baseKey] !== undefined) addedTower[baseKey] *= value;
                                            } else { addedTower[key] = value; }
                                        }
                                    }
                                }
                            }
                            addedTower.level = savedTower.level;
                            addedTower.sellValue = Math.floor(towerType.cost * towerType.sellFactor);
                            addedTower.upgrades.forEach(up => { if (up?.cost) addedTower.sellValue += Math.floor(up.cost * towerType.sellFactor); });
                            this.towerManager.drawTower(addedTower);
                        }
                    }
                } else { console.warn(`Load: Failed to place tower ${savedTower.type} at ${savedTower.x}, ${savedTower.y}`); }
            });
            this.updateUI();
            if (this.countdownElement) {
                const readyKey = this.countdownElement.getAttribute('data-translate-ready') || 'ui.waveReady';
                this.countdownElement.textContent = t(readyKey);
            }
            this.closeUpgradePanel();
            this.hideRadialMenu();
            if (window.game && this.lives > 0) { window.game.running = true; }
            this.showModal('alert.loadSuccess.title', 'alert.loadSuccess.body');
        } catch (error) {
            console.error("Error loading game:", error);
            this.showModal('alert.loadError.title', 'alert.loadError.body', { message: error.message });
            localStorage.removeItem('medievalTowerDefenseSave');
            this.resetGame();
            this.changeMap(mapConfig.currentMap || 'map1');
        }
    }


} // End GameUI Class


// --- EnemyManager Prototype Extensions (needed by UI logic) ---
// Keep these as they were in the newer version, they seem correct.
EnemyManager.prototype.getCurrentCountdownPrecise = function () {
    if (!this.autoStartTimer || !this.countdownEndTime) return 0;
    return Math.max(0, this.countdownEndTime - Date.now());
};

EnemyManager.prototype.scheduleNextWave = function (delay, autoStartCallback) {
    this.cancelWaveTimer();
    this.countdownTime = delay;
    this.countdownEndTime = Date.now() + delay;
    const update = () => {
        if (!this.autoStartTimer) return; // External stop check
        const remaining = this.countdownEndTime - Date.now();
        if (remaining <= 0) {
            const timerId = this.autoStartTimer;
            this.autoStartTimer = null; // Mark inactive *before* callback/next wave
            this.countdownEndTime = 0;
            const uiLives = window.game?.gameUI?.lives;
            if (!this.waveInProgress && uiLives !== undefined && uiLives > 0) {
                this.startNextWave(this.onWaveComplete);
                if (autoStartCallback) autoStartCallback();
            }
        } else {
            this.autoStartTimer = requestAnimationFrame(update); // Request next frame
        }
    };
    this.autoStartTimer = requestAnimationFrame(update); // Start the loop
};
// --- END OF FILE ui.js ---