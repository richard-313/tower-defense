// Map Configuration and Generation
const mapConfig = {
    width: 20,
    height: 13,
    tileSize: 40,
    currentMap: 'map1'
};

// Map Designs - Define paths for different maps
const mapDesigns = {
    map1: { // Grüntal - Green Valley
        name: 'Grüntal',
        pathCoordinates: [
            {x: 0, y: 3},
            {x: 5, y: 3},
            {x: 5, y: 8},
            {x: 10, y: 8},
            {x: 10, y: 2},
            {x: 15, y: 2},
            {x: 15, y: 10},
            {x: 19, y: 10}
        ],
        terrainColors: {
            empty: '#7d934c', // Grass
            path: '#b08968',  // Dirt Path
            decorative: '#5b87a7' // Small Water Bodies
        },
        decorations: [
            {type: 'tree', x: 2, y: 1},
            {type: 'tree', x: 3, y: 1},
            {type: 'tree', x: 12, y: 5},
            {type: 'tree', x: 13, y: 5},
            {type: 'water', x: 7, y: 10},
            {type: 'water', x: 8, y: 10},
            {type: 'water', x: 7, y: 11},
            {type: 'water', x: 8, y: 11}
        ]
    },
    map2: { // Felspass - Rocky Pass
        name: 'Felspass',
        pathCoordinates: [
            {x: 0, y: 6},
            {x: 8, y: 6},
            {x: 8, y: 2},
            {x: 14, y: 2},
            {x: 14, y: 10},
            {x: 19, y: 10}
        ],
        terrainColors: {
            empty: '#8a7f77', // Rocky Ground
            path: '#a59b95',  // Stone Path
            decorative: '#565150' // Mountain Rocks
        },
        decorations: [
            {type: 'rock', x: 2, y: 2},
            {type: 'rock', x: 3, y: 2},
            {type: 'rock', x: 2, y: 3},
            {type: 'rock', x: 11, y: 8},
            {type: 'rock', x: 12, y: 8},
            {type: 'rock', x: 11, y: 9},
            {type: 'rock', x: 6, y: 10},
            {type: 'rock', x: 6, y: 11}
        ]
    },
    map3: { // Sumpfland - Swamp
        name: 'Sumpfland',
        pathCoordinates: [
            {x: 0, y: 1},
            {x: 5, y: 1},
            {x: 5, y: 6},
            {x: 10, y: 6},
            {x: 10, y: 11},
            {x: 15, y: 11},
            {x: 15, y: 6},
            {x: 19, y: 6}
        ],
        terrainColors: {
            empty: '#5c7358', // Swamp Green
            path: '#4a5b44',  // Muddy Path
            decorative: '#3c4821' // Deeper Swamp
        },
        decorations: [
            {type: 'swamp', x: 2, y: 8},
            {type: 'swamp', x: 3, y: 8},
            {type: 'swamp', x: 2, y: 9},
            {type: 'swamp', x: 3, y: 9},
            {type: 'swamp', x: 13, y: 3},
            {type: 'swamp', x: 14, y: 3},
            {type: 'swamp', x: 13, y: 4},
            {type: 'swamp', x: 14, y: 4},
            {type: 'deadTree', x: 8, y: 10},
            {type: 'deadTree', x: 17, y: 2}
        ]
    }
};

// Map and Path Generation
class GameMap {
    constructor() {
        this.grid = [];
        this.path = [];
        this.width = mapConfig.width;
        this.height = mapConfig.height;
        this.tileSize = mapConfig.tileSize;
        this.decorations = [];
        this.setMap(mapConfig.currentMap);
    }

    setMap(mapId) {
        if (!mapDesigns[mapId]) {
            console.error(`Map design ${mapId} not found`);
            return;
        }
        
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
    
    addDecorations() {
        this.decorations = this.currentMapDesign.decorations.map(dec => ({
            type: dec.type,
            x: dec.x * this.tileSize + this.tileSize / 2,
            y: dec.y * this.tileSize + this.tileSize / 2
        }));
    }

    draw(ctx) {
        const { terrainColors } = this.currentMapDesign;
        
        // Draw base terrain
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.grid[y][x];
                
                if (tile.type === 'path') {
                    ctx.fillStyle = terrainColors.path;
                } else {
                    ctx.fillStyle = terrainColors.empty;
                }
                
                ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
                
                // Draw grid lines
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
            }
        }
        
        // Draw decorations
        this.drawDecorations(ctx);
        
        // Mark entrance and exit
        this.drawEntranceExit(ctx);
    }
    
    drawDecorations(ctx) {
        this.decorations.forEach(dec => {
            switch(dec.type) {
                case 'tree':
                    this.drawTree(ctx, dec.x, dec.y);
                    break;
                case 'rock':
                    this.drawRock(ctx, dec.x, dec.y);
                    break;
                case 'water':
                    this.drawWater(ctx, dec.x, dec.y);
                    break;
                case 'swamp':
                    this.drawSwamp(ctx, dec.x, dec.y);
                    break;
                case 'deadTree':
                    this.drawDeadTree(ctx, dec.x, dec.y);
                    break;
            }
        });
    }
    
    drawTree(ctx, x, y) {
        // Tree trunk
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - 3, y - 5, 6, 15);
        
        // Tree foliage
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.moveTo(x, y - 25);
        ctx.lineTo(x - 15, y - 5);
        ctx.lineTo(x + 15, y - 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(x, y - 18);
        ctx.lineTo(x - 12, y);
        ctx.lineTo(x + 12, y);
        ctx.closePath();
        ctx.fill();
    }
    
    drawRock(ctx, x, y) {
        ctx.fillStyle = '#565150';
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(x - 3, y - 2, 4, 2, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawWater(ctx, x, y) {
        ctx.fillStyle = '#5b87a7';
        ctx.beginPath();
        ctx.ellipse(x, y, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Water highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        const time = Date.now() / 1000;
        const waveOffset = Math.sin(time) * 2;
        ctx.beginPath();
        ctx.ellipse(x + waveOffset, y - 2, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawSwamp(ctx, x, y) {
        // Swamp pool
        ctx.fillStyle = '#3c4821';
        ctx.beginPath();
        ctx.ellipse(x, y, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bubbles
        const time = Date.now() / 1000;
        const bubbleOffset = Math.sin(time * 2) * 3;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(x - 5, y + bubbleOffset, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x + 6, y - bubbleOffset, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawDeadTree(ctx, x, y) {
        // Dead tree trunk
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(x - 2, y - 15, 4, 25);
        
        // Dead branches
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 2;
        
        // Branch 1
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x + 8, y - 18);
        ctx.stroke();
        
        // Branch 2
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x - 10, y - 12);
        ctx.stroke();
    }
    
    drawEntranceExit(ctx) {
        // Entry point - green marker
        const entryPoint = this.path[0];
        ctx.fillStyle = 'rgba(0, 200, 0, 0.5)';
        ctx.fillRect(
            Math.floor(entryPoint.x / this.tileSize) * this.tileSize,
            Math.floor(entryPoint.y / this.tileSize) * this.tileSize,
            this.tileSize,
            this.tileSize
        );
        
        // Exit point - red marker
        const exitPoint = this.path[this.path.length - 1];
        ctx.fillStyle = 'rgba(200, 0, 0, 0.5)';
        ctx.fillRect(
            Math.floor(exitPoint.x / this.tileSize) * this.tileSize,
            Math.floor(exitPoint.y / this.tileSize) * this.tileSize,
            this.tileSize,
            this.tileSize
        );
    }
    
    isTileOccupied(x, y) {
        // Check if tile is a path
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return true; // Out of bounds is considered occupied
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