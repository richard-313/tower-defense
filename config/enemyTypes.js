// --- START OF FILE config/enemyTypes.js ---
// Enemy Types and Management
const enemyTypes = {
    normal: {
        name: 'enemy.normal.name', // Translation Key
        health: 50,
        speed: 1,
        reward: 10,
        color: 0x7f8c8d,
        size: 15 // Base size, drawing scales relative to this
    },
    fast: {
        name: 'enemy.fast.name', // Translation Key
        health: 30,
        speed: 2,
        reward: 15,
        color: 0x9b59b6,
        size: 12
    },
    tank: {
        name: 'enemy.tank.name', // Translation Key
        health: 150,
        speed: 0.5,
        reward: 20,
        color: 0x2c3e50, // Changed from tank shield color
        size: 18
    },
    boss: {
        name: 'enemy.boss.name', // Translation Key
        health: 300,
        speed: 0.7,
        reward: 50,
        color: 0xc0392b,
        size: 25
    },
    immune: {
        name: 'enemy.immune.name', // Translation Key
        health: 120,
        speed: 1.2,
        reward: 25,
        color: 0x8e44ad,
        size: 16,
        immuneToSlow: true
    },
    regen: {
        name: 'enemy.regen.name', // Translation Key
        health: 100,
        speed: 0.8,
        reward: 30,
        color: 0x27ae60,
        size: 17,
        regeneration: 5 // Heal 5 HP per second (adjust as needed)
    }
};
// --- END OF FILE config/enemyTypes.js ---