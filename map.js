// Map and Path Generation with PixiJS
class GameMap {
    constructor(app) {
        this.app = app; // PixiJS Application
        this.container = new PIXI.Container(); // Container für die Karte
        this.grid = [];
        this.path = [];
        this.width = mapConfig.width;
        this.height = mapConfig.height;
        this.tileSize = mapConfig.tileSize;
        this.decorations = [];
        this.decorationContainer = new PIXI.Container(); // Container für Dekorationen

        // Grid Container
        this.gridContainer = new PIXI.Container();
        this.container.addChild(this.gridContainer);
        this.container.addChild(this.decorationContainer);

        // Füge den Map-Container zur Stage hinzu
        this.app.stage.addChild(this.container);

        // Container-Position anpassen
        this.container.position.set(0, 0);
        this.container.scale.set(1);

        // Setze die aktuelle Karte
        this.setMap(mapConfig.currentMap);
    }

    setMap(mapId) {
        if (!mapDesigns[mapId]) {
            console.error(`Map design ${mapId} not found`);
            return;
        }

        // Lösche vorherige Karte
        this.gridContainer.removeChildren();
        this.decorationContainer.removeChildren();

        mapConfig.currentMap = mapId;
        this.currentMapDesign = mapDesigns[mapId];
        this.createEmptyGrid();
        this.generatePath();
        this.addDecorations();
    }

    createEmptyGrid() {
        this.grid = [];

        // Erstelle Karte mit leeren Feldern
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = {
                    type: 'empty',
                    x: x * this.tileSize,
                    y: y * this.tileSize,
                    width: this.tileSize,
                    height: this.tileSize
                };
            }
        }
    }

    generatePath() {
        const { pathCoordinates } = this.currentMapDesign;

        // Erstelle Pfad auf der Karte
        for (let i = 0; i < pathCoordinates.length - 1; i++) {
            const current = pathCoordinates[i];
            const next = pathCoordinates[i + 1];

            if (current.x === next.x) {
                // Vertikaler Pfad
                const startY = Math.min(current.y, next.y);
                const endY = Math.max(current.y, next.y);
                for (let y = startY; y <= endY; y++) {
                    this.grid[y][current.x].type = 'path';
                }
            } else {
                // Horizontaler Pfad
                const startX = Math.min(current.x, next.x);
                const endX = Math.max(current.x, next.x);
                for (let x = startX; x <= endX; x++) {
                    this.grid[current.y][x].type = 'path';
                }
            }
        }

        this.calculatePathPoints();
        this.drawMap();
    }

    calculatePathPoints() {
        this.path = [];

        // Extract path points for enemies to follow
        const { pathCoordinates } = this.currentMapDesign;

        // Add entry point
        this.path.push({
            x: pathCoordinates[0].x * this.tileSize + this.tileSize / 2,
            y: pathCoordinates[0].y * this.tileSize + this.tileSize / 2
        });

        // Add intermediate points
        for (let i = 1; i < pathCoordinates.length; i++) {
            const current = pathCoordinates[i];
            const prev = pathCoordinates[i - 1];

            // If it's a straight line, add only the end point
            if (current.x === prev.x || current.y === prev.y) {
                this.path.push({
                    x: current.x * this.tileSize + this.tileSize / 2,
                    y: current.y * this.tileSize + this.tileSize / 2
                });
            } else {
                // For turns, add the corner point first (to make smooth turns)
                this.path.push({
                    x: prev.x * this.tileSize + this.tileSize / 2,
                    y: current.y * this.tileSize + this.tileSize / 2
                });

                this.path.push({
                    x: current.x * this.tileSize + this.tileSize / 2,
                    y: current.y * this.tileSize + this.tileSize / 2
                });
            }
        }
    }

    drawMap() {
        const { terrainColors } = this.currentMapDesign;

        // Leere den Grid-Container
        this.gridContainer.removeChildren();

        // Zeichne die Basis-Terrain
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.grid[y][x];

                // Erstelle eine neue Graphics-Instanz für jede Kachel
                const tileGraphic = new PIXI.Graphics();
                tileGraphic.x = tile.x;
                tileGraphic.y = tile.y;

                if (tile.type === 'path') {
                    // Pfad zeichnen
                    tileGraphic.beginFill(terrainColors.path);
                } else {
                    // Normales Terrain zeichnen
                    tileGraphic.beginFill(terrainColors.empty);
                }

                // Kachel zeichnen
                tileGraphic.drawRect(0, 0, tile.width, tile.height);
                tileGraphic.endFill();

                // Optional: Gitternetzlinien zeichnen
                tileGraphic.lineStyle(1, 0x000000, 0.1);
                tileGraphic.drawRect(0, 0, tile.width, tile.height);

                // Füge die Kachel zum Container hinzu
                this.gridContainer.addChild(tileGraphic);
            }
        }

        // Markiere Eingang und Ausgang
        this.drawEntranceExit();
    }

    addDecorations() {
        // Leere den Dekorations-Container
        this.decorationContainer.removeChildren();

        // Erstelle Dekorationen basierend auf dem aktuellen Map-Design
        this.decorations = this.currentMapDesign.decorations.map(dec => {
            const x = dec.x * this.tileSize + this.tileSize / 2;
            const y = dec.y * this.tileSize + this.tileSize / 2;

            switch (dec.type) {
                case 'tree':
                    this.drawTree(x, y);
                    break;
                case 'rock':
                    this.drawRock(x, y);
                    break;
                case 'water':
                    this.drawWater(x, y);
                    break;
                case 'swamp':
                    this.drawSwamp(x, y);
                    break;
                case 'deadTree':
                    this.drawDeadTree(x, y);
                    break;
            }

            return {
                type: dec.type,
                x: x,
                y: y
            };
        });
    }

    drawTree(x, y) {
        const tree = new PIXI.Graphics();

        // Baumstamm
        tree.beginFill(0x8B4513);
        tree.drawRect(x - 3, y - 5, 6, 15);
        tree.endFill();

        // Baumkrone
        tree.beginFill(0x2E7D32);

        // Obere Dreiecksform
        tree.moveTo(x, y - 25);
        tree.lineTo(x - 15, y - 5);
        tree.lineTo(x + 15, y - 5);
        tree.closePath();
        tree.endFill();

        // Untere Dreiecksform
        tree.beginFill(0x2E7D32);
        tree.moveTo(x, y - 18);
        tree.lineTo(x - 12, y);
        tree.lineTo(x + 12, y);
        tree.closePath();
        tree.endFill();

        this.decorationContainer.addChild(tree);
    }

    drawRock(x, y) {
        const rock = new PIXI.Graphics();

        // Felsen
        rock.beginFill(0x565150);
        rock.drawEllipse(0, 0, 12, 8);
        rock.endFill();

        // Highlight
        rock.beginFill(0xFFFFFF, 0.2);
        rock.drawEllipse(-3, -2, 4, 2);
        rock.endFill();

        rock.x = x;
        rock.y = y;
        this.decorationContainer.addChild(rock);
    }

    drawWater(x, y) {
        const water = new PIXI.Graphics();

        // Wasserfläche
        water.beginFill(0x5b87a7);
        water.drawEllipse(0, 0, 15, 10);
        water.endFill();

        // Spiegelung
        water.beginFill(0xFFFFFF, 0.3);
        water.drawEllipse(0, -2, 6, 3);
        water.endFill();

        water.x = x;
        water.y = y;

        // Animation für Wasser
        const waterAnim = water;
        this.app.ticker.add(() => {
            const time = Date.now() / 1000;
            const waveOffset = Math.sin(time) * 2;

            waterAnim.clear();

            // Wasserfläche neu zeichnen
            waterAnim.beginFill(0x5b87a7);
            waterAnim.drawEllipse(0, 0, 15, 10);
            waterAnim.endFill();

            // Spiegelung neu zeichnen
            waterAnim.beginFill(0xFFFFFF, 0.3);
            waterAnim.drawEllipse(waveOffset, -2, 6, 3);
            waterAnim.endFill();
        });

        this.decorationContainer.addChild(water);
    }

    drawSwamp(x, y) {
        const swamp = new PIXI.Graphics();

        // Sumpf-Pfütze
        swamp.beginFill(0x3c4821);
        swamp.drawEllipse(0, 0, 15, 10);
        swamp.endFill();

        // Blasen
        swamp.beginFill(0xFFFFFF, 0.2);
        swamp.drawCircle(-5, 0, 2);
        swamp.drawCircle(6, 0, 1.5);
        swamp.endFill();

        swamp.x = x;
        swamp.y = y;

        // Animation für Blasen
        const swampAnim = swamp;
        this.app.ticker.add(() => {
            const time = Date.now() / 1000;
            const bubbleOffset = Math.sin(time * 2) * 3;

            swampAnim.clear();

            // Sumpf-Pfütze neu zeichnen
            swampAnim.beginFill(0x3c4821);
            swampAnim.drawEllipse(0, 0, 15, 10);
            swampAnim.endFill();

            // Blasen neu zeichnen
            swampAnim.beginFill(0xFFFFFF, 0.2);
            swampAnim.drawCircle(-5, bubbleOffset, 2);
            swampAnim.drawCircle(6, -bubbleOffset, 1.5);
            swampAnim.endFill();
        });

        this.decorationContainer.addChild(swamp);
    }

    drawDeadTree(x, y) {
        const deadTree = new PIXI.Graphics();

        // Baumstamm
        deadTree.beginFill(0x5D4037);
        deadTree.drawRect(x - 2, y - 15, 4, 25);
        deadTree.endFill();

        // Äste
        deadTree.lineStyle(2, 0x5D4037);

        // Ast 1
        deadTree.moveTo(x, y - 10);
        deadTree.lineTo(x + 8, y - 18);

        // Ast 2
        deadTree.moveTo(x, y - 5);
        deadTree.lineTo(x - 10, y - 12);

        this.decorationContainer.addChild(deadTree);
    }

    drawEntranceExit() {
        // Eingang - grüner Marker
        const entryPoint = this.path[0];
        const entryX = Math.floor(entryPoint.x / this.tileSize) * this.tileSize;
        const entryY = Math.floor(entryPoint.y / this.tileSize) * this.tileSize;

        const entryMarker = new PIXI.Graphics();
        entryMarker.beginFill(0x00C800, 0.5);
        entryMarker.drawRect(0, 0, this.tileSize, this.tileSize);
        entryMarker.endFill();
        entryMarker.x = entryX;
        entryMarker.y = entryY;

        this.gridContainer.addChild(entryMarker);

        // Ausgang - roter Marker
        const exitPoint = this.path[this.path.length - 1];
        const exitX = Math.floor(exitPoint.x / this.tileSize) * this.tileSize;
        const exitY = Math.floor(exitPoint.y / this.tileSize) * this.tileSize;

        const exitMarker = new PIXI.Graphics();
        exitMarker.beginFill(0xC80000, 0.5);
        exitMarker.drawRect(0, 0, this.tileSize, this.tileSize);
        exitMarker.endFill();
        exitMarker.x = exitX;
        exitMarker.y = exitY;

        this.gridContainer.addChild(exitMarker);
    }

    isTileOccupied(x, y) {
        // Prüft, ob die Kachel ein Pfad ist
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);

        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return true; // Außerhalb der Grenzen gilt als belegt
        }

        return this.grid[tileY][tileX].type === 'path';
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