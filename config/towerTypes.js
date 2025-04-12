// --- START OF FILE config/towerTypes.js ---
const towerTypes = {
    basic: {
        name: 'tower.basic.name', // Key
        cost: 25, damage: 10, range: 100, fireRate: 1000,
        color: 0x3498db, projectileColor: 0x3498db, projectileSize: 4, projectileSpeed: 5,
        sellFactor: 0.7,
        upgrades: [
            { name: 'upgrade.basic.0.name', cost: 50, multishot: 2, damage: 10 }, // Key
            { name: 'upgrade.basic.1.name', cost: 100, fireRateMultiplier: 0.5 }, // Key
            { name: 'upgrade.basic.2.name', cost: 150, multishot: 3, damage: 15 } // Key
        ]
    },
    lightning: {
        name: 'tower.lightning.name', // Key
        cost: 60, damage: 8, range: 140, fireRate: 600,
        color: 0xf1c40f, projectileColor: 0xFFFFFF, projectileSize: 0, projectileSpeed: 0,
        effect: 'chainLightning', chainCount: 1, chainRange: 60,
        sellFactor: 0.7,
        upgrades: [
            { name: 'upgrade.lightning.0.name', cost: 80, chainCount: 2, damage: 9 }, // Key
            { name: 'upgrade.lightning.1.name', cost: 140, chainCount: 3, damage: 10, chainRange: 70 }, // Key
            { name: 'upgrade.lightning.2.name', cost: 220, chainCount: 5, damage: 12, range: 150, chainRange: 80 } // Key
        ]
    },
    sniper: {
        name: 'tower.sniper.name', // Key
        cost: 50, damage: 30, range: 200, fireRate: 2000,
        color: 0xe74c3c, projectileColor: 0xe74c3c, projectileSize: 3, projectileSpeed: 8,
        sellFactor: 0.7,
        upgrades: [
            { name: 'upgrade.sniper.0.name', cost: 75, damage: 60 }, // Key
            { name: 'upgrade.sniper.1.name', cost: 125, range: 250, damage: 80 }, // Key
            { name: 'upgrade.sniper.2.name', cost: 200, pierce: 3, damage: 100 } // Key
        ]
    },
    slow: {
        name: 'tower.slow.name', // Key
        cost: 40, damage: 5, range: 80, fireRate: 800,
        color: 0x1abc9c, projectileColor: 0x1abc9c, projectileSize: 3, projectileSpeed: 4,
        effect: 'slow', slowFactor: 0.5, slowDuration: 2000,
        sellFactor: 0.7,
        upgrades: [
            { name: 'upgrade.slow.0.name', cost: 60, slowFactor: 0.3 }, // Key
            { name: 'upgrade.slow.1.name', cost: 90, slowDuration: 4000 }, // Key
            { name: 'upgrade.slow.2.name', cost: 130, slowFactor: 0.2, slowDuration: 5000, damage: 15 } // Key
        ]
    },
    bomb: {
        name: 'tower.bomb.name', // Key
        cost: 75, damage: 15, range: 120, fireRate: 1500,
        color: 0xe77e22, // Changed color
        projectileColor: 0x404040, // Bomb color
        projectileSize: 5,
        projectileSpeed: 3.5, // Speed affects arc time
        effect: 'splash', splashRadius: 60,
        sellFactor: 0.7,
        upgrades: [
            { name: 'upgrade.bomb.0.name', cost: 80, splashRadius: 90 }, // Key
            { name: 'upgrade.bomb.1.name', cost: 120, damage: 25, splashRadius: 110 }, // Key
            { name: 'upgrade.bomb.2.name', cost: 180, damage: 40, splashRadius: 150 } // Key, e.g., "Cluster Bomb"
        ]
    }
};
// --- END OF FILE config/towerTypes.js ---