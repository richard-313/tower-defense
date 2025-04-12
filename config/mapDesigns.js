// --- START OF FILE config/mapDesigns.js ---
// Map Designs - Define paths for different maps
const mapDesigns = {
    map1: { // Grüntal - Green Valley
        name: 'map.map1.name', // Translation Key
        pathCoordinates: [
            { x: 0, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 8 }, { x: 10, y: 8 },
            { x: 10, y: 2 }, { x: 15, y: 2 }, { x: 15, y: 10 }, { x: 19, y: 10 }
        ],
        terrainColors: { empty: 0x7d934c, path: 0xb08968, decorative: 0x5b87a7 },
        decorations: [
            { type: 'tree', x: 2, y: 1 }, { type: 'tree', x: 3, y: 1 },
            { type: 'tree', x: 12, y: 5 }, { type: 'tree', x: 13, y: 5 },
            { type: 'water', x: 7, y: 10 }, { type: 'water', x: 8, y: 10 },
            { type: 'water', x: 7, y: 11 }, { type: 'water', x: 8, y: 11 }
        ]
    },
    map2: { // Felspass - Rocky Pass
        name: 'map.map2.name', // Translation Key
        pathCoordinates: [
            { x: 0, y: 6 }, { x: 8, y: 6 }, { x: 8, y: 2 }, { x: 14, y: 2 },
            { x: 14, y: 10 }, { x: 19, y: 10 }
        ],
        terrainColors: { empty: 0x8a7f77, path: 0xa59b95, decorative: 0x565150 },
        decorations: [
            { type: 'rock', x: 2, y: 2 }, { type: 'rock', x: 3, y: 2 }, { type: 'rock', x: 2, y: 3 },
            { type: 'rock', x: 11, y: 8 }, { type: 'rock', x: 12, y: 8 }, { type: 'rock', x: 11, y: 9 },
            { type: 'rock', x: 6, y: 10 }, { type: 'rock', x: 6, y: 11 }
        ]
    },
    map3: { // Sumpfland - Swamp
        name: 'map.map3.name', // Translation Key
        pathCoordinates: [
            { x: 0, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 6 }, { x: 10, y: 6 },
            { x: 10, y: 11 }, { x: 15, y: 11 }, { x: 15, y: 6 }, { x: 19, y: 6 }
        ],
        terrainColors: { empty: 0x5c7358, path: 0x4a5b44, decorative: 0x3c4821 },
        decorations: [
            { type: 'swamp', x: 2, y: 8 }, { type: 'swamp', x: 3, y: 8 },
            { type: 'swamp', x: 2, y: 9 }, { type: 'swamp', x: 3, y: 9 },
            { type: 'swamp', x: 13, y: 3 }, { type: 'swamp', x: 14, y: 3 },
            { type: 'swamp', x: 13, y: 4 }, { type: 'swamp', x: 14, y: 4 },
            { type: 'deadTree', x: 8, y: 10 }, { type: 'deadTree', x: 17, y: 2 }
        ]
    }
};
// --- END OF FILE config/mapDesigns.js ---