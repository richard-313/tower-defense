const towerTypes = {
    basic: {
        name: 'Basis Turm',
        description: 'Ein grundlegender Verteidigungsturm mit ausgeglichenem Schaden und Reichweite.',
        cost: 25,
        damage: 10,
        range: 100,
        fireRate: 1000, // ms
        color: 0x3498db,
        projectileColor: 0x3498db,
        projectileSize: 4,
        projectileSpeed: 5,
        sellFactor: 0.7, // Wie viel Gold man beim Verkauf zurückbekommt (Prozentsatz)
        upgrades: [
            {
                name: 'Doppelschuss',
                description: 'Schießt zwei Projektile gleichzeitig',
                cost: 50,
                multishot: 2,
                damage: 10
            },
            {
                name: 'Schnellfeuerschuss',
                description: 'Verdoppelte Feuerrate',
                cost: 100,
                fireRateMultiplier: 0.5
            },
            {
                name: 'Assault Cannon',
                description: 'Schießt drei Projektile mit erhöhtem Schaden',
                cost: 150,
                multishot: 3,
                damage: 15
            }
        ]
    },
    sniper: {
        name: 'Sniper Turm',
        description: 'Hoher Schaden über große Entfernungen, aber langsame Feuerrate.',
        cost: 50,
        damage: 30,
        range: 200,
        fireRate: 2000,
        color: 0xe74c3c,
        projectileColor: 0xe74c3c,
        projectileSize: 3,
        projectileSpeed: 8,
        sellFactor: 0.7,
        upgrades: [
            {
                name: 'Verstärkter Schuss',
                description: 'Erhöhter Schaden pro Schuss',
                cost: 75,
                damage: 60
            },
            {
                name: 'Präzisionsverbesserung',
                description: 'Erhöhte Reichweite und Schaden',
                cost: 125,
                range: 250,
                damage: 80
            },
            {
                name: 'Ultra-Sniper',
                description: 'Durchdringende Schüsse, die mehrere Gegner treffen',
                cost: 200,
                pierce: 3,
                damage: 100
            }
        ]
    },
    slow: {
        name: 'Frost Turm',
        description: 'Verlangsamt Gegner und fügt leichten Schaden zu.',
        cost: 40,
        damage: 5,
        range: 80,
        fireRate: 800,
        color: 0x1abc9c,
        projectileColor: 0x1abc9c,
        projectileSize: 3,
        projectileSpeed: 4,
        effect: 'slow',
        slowFactor: 0.5,
        slowDuration: 2000,
        sellFactor: 0.7,
        upgrades: [
            {
                name: 'Stärkere Verlangsamung',
                description: 'Gegner werden stärker verlangsamt',
                cost: 60,
                slowFactor: 0.3
            },
            {
                name: 'Verlängerte Verlangsamung',
                description: 'Effekt hält länger an',
                cost: 90,
                slowDuration: 4000
            },
            {
                name: 'Frost-Turm',
                description: 'Fast komplette Verlangsamung und erhöhter Schaden',
                cost: 130,
                slowFactor: 0.2,
                slowDuration: 5000,
                damage: 15
            }
        ]
    },
    bomb: {
        name: 'Bomben Turm',
        description: 'Verursacht Flächenschaden an allen Gegnern im Explosionsradius.',
        cost: 75,
        damage: 15,
        range: 120,
        fireRate: 1500,
        color: 0xf1c40f,
        projectileColor: 0xf1c40f,
        projectileSize: 5,
        projectileSpeed: 3.5,
        effect: 'splash',
        splashRadius: 60,
        sellFactor: 0.7,
        upgrades: [
            {
                name: 'Erweiterter Radius',
                description: 'Größerer Explosionsradius',
                cost: 80,
                splashRadius: 90
            },
            {
                name: 'Schwere Munition',
                description: 'Erhöhter Schaden und Radius',
                cost: 120,
                damage: 25,
                splashRadius: 110
            },
            {
                name: 'Nuklear-Turm',
                description: 'Maximaler Radius und Schaden',
                cost: 180,
                damage: 40,
                splashRadius: 150
            }
        ]
    }
};