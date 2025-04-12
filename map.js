// --- START OF FILE map.js ---
// Map and Path Generation with PixiJS
class GameMap {
    constructor(app) {
        this.app = app;
        this.container = new PIXI.Container();
        this.gridContainer = new PIXI.Container(); // For terrain tiles
        this.decorationContainer = new PIXI.Container(); // For trees, rocks etc.
        this.pathContainer = new PIXI.Container(); // For path overlay (optional, can be merged)
        this.markerContainer = new PIXI.Container(); // For entry/exit markers

        this.container.addChild(this.gridContainer);
        this.container.addChild(this.pathContainer); // Path above grid
        this.container.addChild(this.decorationContainer); // Decorations above path
        this.container.addChild(this.markerContainer); // Markers above decorations

        this.app.stage.addChild(this.container);
        this.container.name = "mapContainer"; // Name for reference

        this.grid = [];
        this.path = [];
        this.width = mapConfig.width;
        this.height = mapConfig.height;
        this.tileSize = mapConfig.tileSize; // Uses value from mapConfig (now 40)
        this.decorations = [];
        this.currentMapDesign = null; // Initialize current map design

        this.setMap(mapConfig.currentMap); // Load initial map
    }

    setMap(mapId) {
        if (!mapDesigns[mapId]) {
            console.error(`Map design ${mapId} not found`);
            return;
        }

        // Clear previous map elements
        this.gridContainer.removeChildren();
        this.pathContainer.removeChildren();
        // Destroy previous animated decorations to stop tickers
        this.decorationContainer.children.forEach(child => {
            if (child.tickerCallback && this.app?.ticker) {
                this.app.ticker.remove(child.tickerCallback);
            }
            child.destroy();
        });
        this.decorationContainer.removeChildren();
        this.markerContainer.removeChildren();


        mapConfig.currentMap = mapId; // Update global config
        // *** Store current map design reference ***
        this.currentMapDesign = mapDesigns[mapId];
        if (!this.currentMapDesign.terrainColors) {
            console.error(`terrainColors not defined for map ${mapId}`);
            // Provide default colors as fallback
            this.currentMapDesign.terrainColors = { empty: 0x7d934c, path: 0xb08968, decorative: 0x5b87a7 };
        }


        this.createEmptyGrid(); // Initialize grid structure
        this.generatePathAndTiles(); // Create path data AND draw base tiles/path
        this.addDecorations(); // Add visual decorations
        this.drawEntranceExit(); // Draw start/end markers
    }

    createEmptyGrid() {
        this.grid = [];
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = {
                    type: 'empty', // Default to 'empty'
                    x: x * this.tileSize, // Use current tileSize
                    y: y * this.tileSize,
                    width: this.tileSize,
                    height: this.tileSize,
                    graphic: null // Store reference to graphic later if needed
                };
            }
        }
    }

    generatePathAndTiles() {
        // *** Access terrainColors from the stored design ***
        const { pathCoordinates, terrainColors } = this.currentMapDesign;
        if (!terrainColors) {
            console.error("generatePathAndTiles: terrainColors missing in currentMapDesign!");
            return; // Prevent further errors
        }


        // 1. Mark path tiles in the grid
        for (let i = 0; i < pathCoordinates.length - 1; i++) {
            const current = pathCoordinates[i];
            const next = pathCoordinates[i + 1];
            const isVertical = (current.x === next.x);
            const start = isVertical ? Math.min(current.y, next.y) : Math.min(current.x, next.x);
            const end = isVertical ? Math.max(current.y, next.y) : Math.max(current.x, next.x);

            for (let j = start; j <= end; j++) {
                const x = isVertical ? current.x : j;
                const y = isVertical ? j : current.y;
                if (this.grid[y] && this.grid[y][x]) {
                    this.grid[y][x].type = 'path';
                } else {
                    console.warn(`Path coordinate out of bounds: x=${x}, y=${y}`);
                }
            }
        }

        // 2. Draw all grid tiles based on their type
        this.gridContainer.removeChildren(); // Clear previous grid graphics
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.grid[y][x];
                if (!tile) continue; // Should not happen, but safety check

                const tileGraphic = new PIXI.Graphics();
                tileGraphic.x = tile.x;
                tileGraphic.y = tile.y;

                const color = (tile.type === 'path') ? terrainColors.path : terrainColors.empty;
                tileGraphic.beginFill(color);
                tileGraphic.drawRect(0, 0, tile.width, tile.height);
                tileGraphic.endFill();

                // Optional: Add subtle grid lines
                tileGraphic.lineStyle(1, 0x000000, 0.05);
                tileGraphic.drawRect(0, 0, tile.width, tile.height);
                tileGraphic.lineStyle(0); // Reset line style

                this.gridContainer.addChild(tileGraphic);
                tile.graphic = tileGraphic; // Store reference if needed later
            }
        }

        // 3. Calculate the actual path points (centers of path tiles)
        this.calculatePathPoints(pathCoordinates);
    }

    calculatePathPoints(pathCoordinates) {
        this.path = [];
        if (!pathCoordinates || pathCoordinates.length === 0) return;

        // Add center of the first tile
        this.path.push({
            x: pathCoordinates[0].x * this.tileSize + this.tileSize / 2,
            y: pathCoordinates[0].y * this.tileSize + this.tileSize / 2
        });

        // Add centers of subsequent turn points
        for (let i = 1; i < pathCoordinates.length; i++) {
            this.path.push({
                x: pathCoordinates[i].x * this.tileSize + this.tileSize / 2,
                y: pathCoordinates[i].y * this.tileSize + this.tileSize / 2
            });
        }
    }

    addDecorations() {
        // Ensure previous tickers are stopped and children removed
        this.decorationContainer.children.forEach(child => {
            if (child.tickerCallback && this.app?.ticker) {
                this.app.ticker.remove(child.tickerCallback);
            }
        });
        this.decorationContainer.removeChildren();
        this.decorations = []; // Reset decorations array

        if (!this.currentMapDesign || !this.currentMapDesign.decorations) return; // Check if design and decorations exist


        this.decorations = this.currentMapDesign.decorations.map(dec => {
            const x = dec.x * this.tileSize + this.tileSize / 2;
            const y = dec.y * this.tileSize + this.tileSize / 2;
            let decorationGraphic = null;

            switch (dec.type) {
                case 'tree': decorationGraphic = this.drawTree(x, y); break;
                case 'rock': decorationGraphic = this.drawRock(x, y); break;
                case 'water': decorationGraphic = this.drawWater(x, y); break;
                case 'swamp': decorationGraphic = this.drawSwamp(x, y); break;
                case 'deadTree': decorationGraphic = this.drawDeadTree(x, y); break;
                default:
                    console.warn(`Unknown decoration type: ${dec.type}`);
                    break;
            }

            if (decorationGraphic) {
                this.decorationContainer.addChild(decorationGraphic);
                return { type: dec.type, x: x, y: y, graphic: decorationGraphic };
            }
            return null;
        }).filter(d => d !== null);
    }

    // --- Decoration Drawing Functions ---

    drawTree(x, y) {
        const tree = new PIXI.Graphics();
        const scale = this.tileSize / 40; // Scale factor relative to original design tileSize 40 (or use 32 if that was original)
        const trunkWidth = 6 * scale;
        const trunkHeight = 15 * scale;
        const crownWidth1 = 30 * scale;
        const crownY1 = -25 * scale;
        const crownWidth2 = 24 * scale;
        const crownY2 = -18 * scale;
        const crownBottomY = 0; // Base of second crown part relative to center

        tree.beginFill(0x8B4513); // Brown trunk
        tree.drawRect(-trunkWidth / 2, -trunkHeight / 2, trunkWidth, trunkHeight);
        tree.endFill();

        tree.beginFill(0x2E7D32); // Dark green foliage
        tree.moveTo(0, crownY1);
        tree.lineTo(-crownWidth1 / 2, -trunkHeight / 2);
        tree.lineTo(crownWidth1 / 2, -trunkHeight / 2);
        tree.closePath();
        tree.endFill();

        tree.beginFill(0x388E3C); // Slightly lighter green
        tree.moveTo(0, crownY2);
        tree.lineTo(-crownWidth2 / 2, crownBottomY);
        tree.lineTo(crownWidth2 / 2, crownBottomY);
        tree.closePath();
        tree.endFill();

        tree.position.set(x, y);
        return tree;
    }

    drawRock(x, y) {
        const rock = new PIXI.Graphics();
        const scale = this.tileSize / 40;
        const rockWidth = 12 * scale;
        const rockHeight = 8 * scale;

        // *** Access color from current map design ***
        const rockColor = this.currentMapDesign.terrainColors?.decorative || 0x8a7f77; // Fallback grey

        rock.beginFill(rockColor);
        rock.drawEllipse(0, 0, rockWidth, rockHeight);
        rock.endFill();

        rock.beginFill(0xFFFFFF, 0.15);
        rock.drawEllipse(-rockWidth * 0.2, -rockHeight * 0.2, rockWidth * 0.3, rockHeight * 0.2);
        rock.endFill();

        rock.position.set(x, y);
        return rock;
    }

    drawWater(x, y) {
        const water = new PIXI.Graphics();
        const scale = this.tileSize / 40;
        const waterWidth = 16 * scale;
        const waterHeight = 11 * scale;
        // *** Access color from current map design ***
        const waterColor = this.currentMapDesign.terrainColors?.decorative || 0x5b87a7; // Fallback blue

        const drawWaterShape = (gfx, time) => {
            if (!gfx || gfx._destroyed) return; // Check if graphics object is valid
            const waveOffset = Math.sin(time * 1.5) * (this.tileSize / 20);
            const scaleFactor = 1 + Math.sin(time * 1.2) * 0.02;
            gfx.clear();
            gfx.beginFill(waterColor); // Use map's decorative color
            gfx.drawEllipse(0, 0, waterWidth * scaleFactor, waterHeight * scaleFactor);
            gfx.endFill();

            gfx.beginFill(0xFFFFFF, 0.2);
            gfx.drawEllipse(waveOffset, -waterHeight * 0.2, waterWidth * 0.4, waterHeight * 0.25);
            gfx.endFill();
        };

        drawWaterShape(water, 0); // Initial draw
        water.position.set(x, y);

        const tickerCallback = () => {
            // Make sure the graphic and its parent still exist
            if (!water || water._destroyed || !water.parent) {
                if (this.app?.ticker) this.app.ticker.remove(tickerCallback);
                return;
            }
            drawWaterShape(water, Date.now() / 1000);
        };
        // Add ticker only if app and ticker exist
        if (this.app?.ticker) {
            this.app.ticker.add(tickerCallback);
            water.tickerCallback = tickerCallback; // Store reference to remove later
        } else {
            console.warn("Cannot add water animation: ticker not available.");
        }


        return water;
    }

    drawSwamp(x, y) {
        const swamp = new PIXI.Graphics();
        const scale = this.tileSize / 40;
        const swampWidth = 15 * scale;
        const swampHeight = 10 * scale;
        // *** Access colors from current map design ***
        const swampColor = this.currentMapDesign.terrainColors?.decorative || 0x3c4821; // Fallback dark green
        const pathColor = this.currentMapDesign.terrainColors?.path || 0x4a5b44; // Fallback muddy

        const drawSwampShape = (gfx, time) => {
            if (!gfx || gfx._destroyed) return;
            gfx.clear();
            gfx.beginFill(swampColor);
            gfx.drawEllipse(0, 0, swampWidth, swampHeight);
            gfx.endFill();

            gfx.beginFill(pathColor, 0.3); // Use path color for murkiness
            gfx.drawEllipse(Math.sin(time * 0.8) * 2 * scale, Math.cos(time * 1.1) * 1.5 * scale, swampWidth * 0.8, swampHeight * 0.7);
            gfx.endFill();

            gfx.beginFill(0xFFFFFF, 0.15);
            const bubble1X = -swampWidth * 0.3 + Math.sin(time * 1.8) * 2 * scale;
            const bubble1Y = Math.sin(time * 2.5) * (swampHeight * 0.3);
            const bubble1R = (1.5 + Math.sin(time * 3) * 0.5) * scale;

            const bubble2X = swampWidth * 0.3 + Math.sin(time * 1.5 + 2) * 1.5 * scale;
            const bubble2Y = Math.cos(time * 2.1) * (swampHeight * 0.25);
            const bubble2R = (1 + Math.sin(time * 2.8 + 1) * 0.4) * scale;

            if (bubble1R > 0.5 * scale) gfx.drawCircle(bubble1X, bubble1Y, bubble1R);
            if (bubble2R > 0.5 * scale) gfx.drawCircle(bubble2X, bubble2Y, bubble2R);
            gfx.endFill();
        };

        drawSwampShape(swamp, 0); // Initial draw
        swamp.position.set(x, y);

        const tickerCallback = () => {
            if (!swamp || swamp._destroyed || !swamp.parent) {
                if (this.app?.ticker) this.app.ticker.remove(tickerCallback);
                return;
            }
            drawSwampShape(swamp, Date.now() / 800);
        };
        if (this.app?.ticker) {
            this.app.ticker.add(tickerCallback);
            swamp.tickerCallback = tickerCallback; // Store reference
        } else {
            console.warn("Cannot add swamp animation: ticker not available.");
        }

        return swamp;
    }

    drawDeadTree(x, y) {
        const deadTree = new PIXI.Graphics();
        const scale = this.tileSize / 40;
        const trunkWidth = 4 * scale;
        const trunkHeight = 25 * scale;
        const branchThickness = Math.max(1, 2 * scale); // Ensure at least 1px thick
        const branchColor = 0x5D4037;

        deadTree.beginFill(branchColor);
        deadTree.drawRect(-trunkWidth / 2, -trunkHeight + (trunkHeight * 0.2), trunkWidth, trunkHeight);
        deadTree.endFill();

        deadTree.lineStyle(branchThickness, branchColor);
        deadTree.moveTo(0, -trunkHeight * 0.6);
        deadTree.lineTo(trunkWidth * 2.5, -trunkHeight * 0.9);
        deadTree.moveTo(0, -trunkHeight * 0.4);
        deadTree.lineTo(-trunkWidth * 3, -trunkHeight * 0.7);
        deadTree.moveTo(0, -trunkHeight * 0.8);
        deadTree.lineTo(trunkWidth * 1, -trunkHeight * 1.1);
        deadTree.lineStyle(0);

        deadTree.position.set(x, y);
        return deadTree;
    }

    // --- UPDATED Entrance/Exit Markers ---
    drawEntranceExit() {
        this.markerContainer.removeChildren();
        if (!this.path || this.path.length === 0) return;

        // --- Entrance Marker (Wooden Sign/Banner - unchanged) ---
        const entryPoint = this.path[0];
        const entryTileX = Math.floor(entryPoint.x / this.tileSize);
        const entryTileY = Math.floor(entryPoint.y / this.tileSize);
        const entryMarker = new PIXI.Graphics();
        const entryCenterX = entryTileX * this.tileSize + this.tileSize / 2;
        const entryCenterY = entryTileY * this.tileSize + this.tileSize / 2;
        const scale = this.tileSize / 40; // Scale factor

        const woodColor = 0x8B4513; // Brown
        const bannerColor = 0xD2B48C; // Tan/Linen
        const darkWoodColor = 0x5D4037;

        const poleWidth = 5 * scale;
        const poleHeight = 35 * scale;
        const bannerWidth = 25 * scale;
        const bannerHeight = 20 * scale;
        const bannerTopOffset = -15 * scale; // How far up the banner starts

        // Determine entry direction
        let entryDir = 'unknown';
        if (this.path.length > 1) {
            const nextPoint = this.path[1];
            if (nextPoint.x > entryPoint.x) entryDir = 'left';
            else if (nextPoint.x < entryPoint.x) entryDir = 'right';
            else if (nextPoint.y > entryPoint.y) entryDir = 'top';
            else if (nextPoint.y < entryPoint.y) entryDir = 'bottom';
        }

        let poleX = entryCenterX - poleWidth / 2;
        let poleY = entryCenterY - poleHeight / 2;
        let bannerX = poleX + poleWidth;
        let bannerY = poleY + bannerTopOffset;

        switch (entryDir) {
            case 'left': poleX = entryCenterX - this.tileSize / 2 - poleWidth; poleY = entryCenterY - poleHeight / 2; bannerX = poleX + poleWidth; bannerY = poleY + bannerTopOffset; break;
            case 'right': poleX = entryCenterX + this.tileSize / 2; poleY = entryCenterY - poleHeight / 2; bannerX = poleX - bannerWidth; bannerY = poleY + bannerTopOffset; break;
            case 'top': poleX = entryCenterX - poleWidth / 2; poleY = entryCenterY - this.tileSize / 2 - poleHeight; bannerX = poleX + poleWidth; bannerY = poleY + poleHeight * 0.2; break;
            case 'bottom': poleX = entryCenterX - poleWidth / 2; poleY = entryCenterY + this.tileSize / 2; bannerX = poleX + poleWidth; bannerY = poleY + bannerTopOffset; break;
            default: poleX = entryCenterX - poleWidth / 2; poleY = entryCenterY - poleHeight / 2; bannerX = poleX + poleWidth; bannerY = poleY + bannerTopOffset;
        }

        entryMarker.beginFill(woodColor).lineStyle(1, darkWoodColor).drawRect(poleX, poleY, poleWidth, poleHeight).endFill().lineStyle(0);
        entryMarker.beginFill(bannerColor).lineStyle(1, woodColor);
        entryMarker.moveTo(bannerX, bannerY).lineTo(bannerX + bannerWidth, bannerY).lineTo(bannerX + bannerWidth, bannerY + bannerHeight * 0.8).lineTo(bannerX + bannerWidth / 2, bannerY + bannerHeight).lineTo(bannerX, bannerY + bannerHeight * 0.8).closePath();
        entryMarker.endFill().lineStyle(0);
        entryMarker.beginFill(darkWoodColor);
        const arrowStartX = bannerX + bannerWidth / 2; const arrowStartY = bannerY + bannerHeight * 0.3; const arrowSize = 6 * scale;
        entryMarker.moveTo(arrowStartX - arrowSize / 2, arrowStartY).lineTo(arrowStartX + arrowSize / 2, arrowStartY).lineTo(arrowStartX, arrowStartY + arrowSize).closePath();
        entryMarker.endFill();
        this.markerContainer.addChild(entryMarker);


        // --- Exit Marker (Wooden Door) ---
        const exitPoint = this.path[this.path.length - 1];
        const exitTileX = Math.floor(exitPoint.x / this.tileSize);
        const exitTileY = Math.floor(exitPoint.y / this.tileSize);
        const exitMarker = new PIXI.Graphics();
        const exitCenterX = exitTileX * this.tileSize + this.tileSize / 2;
        const exitCenterY = exitTileY * this.tileSize + this.tileSize / 2;
        exitMarker.position.set(exitCenterX, exitCenterY); // Center the graphic on the tile

        // Colors
        const doorWoodColor = 0x966F33; // Medium brown wood
        const plankLineColor = 0x654321; // Darker brown for lines/grain
        const metalColor = 0x777777; // Grey metal for hinges/handle
        const darkMetalColor = 0x444444;

        // Sizes
        const doorWidth = 28 * scale;
        const doorHeight = 35 * scale;
        const doorCornerRadius = 3 * scale; // Slightly rounded top corners
        const plankWidth = doorWidth / 3; // Divide into 3 planks
        const plankLineWidth = Math.max(1, 1.5 * scale);
        const hingeWidth = 5 * scale;
        const hingeHeight = 8 * scale;
        const handleRadius = 3 * scale;

        // Draw Door Base (Rounded Rectangle)
        exitMarker.beginFill(doorWoodColor);
        exitMarker.lineStyle(plankLineWidth, plankLineColor); // Outline
        exitMarker.drawRoundedRect(-doorWidth / 2, -doorHeight / 2, doorWidth, doorHeight, doorCornerRadius);
        exitMarker.endFill();
        exitMarker.lineStyle(0);

        // Draw Planks (Vertical Lines)
        exitMarker.lineStyle(plankLineWidth, plankLineColor);
        // Plank 1 separator
        exitMarker.moveTo(-doorWidth / 2 + plankWidth, -doorHeight / 2);
        exitMarker.lineTo(-doorWidth / 2 + plankWidth, doorHeight / 2);
        // Plank 2 separator
        exitMarker.moveTo(-doorWidth / 2 + 2 * plankWidth, -doorHeight / 2);
        exitMarker.lineTo(-doorWidth / 2 + 2 * plankWidth, doorHeight / 2);
        exitMarker.lineStyle(0);

        // Draw Metal Hinges (Simple Rectangles)
        const hingeYOffset = doorHeight * 0.3;
        exitMarker.beginFill(metalColor);
        exitMarker.lineStyle(1, darkMetalColor);
        // Top Hinge
        exitMarker.drawRect(-doorWidth / 2 - hingeWidth * 0.2, -hingeYOffset - hingeHeight / 2, hingeWidth, hingeHeight);
        // Bottom Hinge
        exitMarker.drawRect(-doorWidth / 2 - hingeWidth * 0.2, hingeYOffset - hingeHeight / 2, hingeWidth, hingeHeight);
        exitMarker.endFill();
        exitMarker.lineStyle(0);

        // Draw Handle (Simple Circle)
        const handleXOffset = doorWidth * 0.35;
        exitMarker.beginFill(metalColor);
        exitMarker.lineStyle(1, darkMetalColor);
        exitMarker.drawCircle(handleXOffset, 0, handleRadius); // Centered vertically
        exitMarker.endFill();
        // Small inner circle for detail
        exitMarker.beginFill(darkMetalColor).drawCircle(handleXOffset, 0, handleRadius * 0.4).endFill();
        exitMarker.lineStyle(0);

        this.markerContainer.addChild(exitMarker);
    }


    // --- Remaining GameMap methods ---
    isTileOccupied(x, y) {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return true;
        }
        // Safely access grid cell
        return this.grid[tileY]?.[tileX]?.type === 'path';
    }

    getTileCenter(x, y) {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        return {
            x: tileX * this.tileSize + this.tileSize / 2,
            y: tileY * this.tileSize + this.tileSize / 2
        };
    }
}
// --- END OF FILE map.js ---