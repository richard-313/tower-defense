// Enemy Types and Management
const enemyTypes = {
    normal: {
        name: 'Bauer',
        health: 50,
        speed: 1,
        reward: 10,
        color: 0x7f8c8d,
        size: 15
    },
    fast: {
        name: 'Späher',
        health: 30,
        speed: 2,
        reward: 15,
        color: 0x9b59b6,
        size: 12
    },
    tank: {
        name: 'Ritter',
        health: 150,
        speed: 0.5,
        reward: 20,
        color: 0x2c3e50,
        size: 18
    },
    boss: {
        name: 'Kriegsherr',
        health: 300,
        speed: 0.7,
        reward: 50,
        color: 0xc0392b,
        size: 25
    },
    // Neuer Gegnertyp: Immun gegen Verlangsamung
    immune: {
        name: 'Hexer',
        health: 120,
        speed: 1.2,
        reward: 25,
        color: 0x8e44ad,
        size: 16,
        immuneToSlow: true
    },
    // Neuer Gegnertyp: Regeneriert seine Gesundheit
    regen: {
        name: 'Kleriker',
        health: 100,
        speed: 0.8,
        reward: 30,
        color: 0x27ae60,
        size: 17,
        regeneration: 0.2 // Gesundheit pro Sekunde
    }
};