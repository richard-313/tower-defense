function drawImmuneEnemy(enemy, graphics) {
    const time = Date.now() / 400;

    // Pulsierender Schutzschild (leichter violetter Schein)
    graphics.beginFill(0x8e44ad, 0.2); // Farbe von enemyTypes['immune']
    graphics.drawCircle(0, 0, enemy.size * 1.2 + Math.sin(time) * 2);
    graphics.endFill();

    // Körper
    graphics.beginFill(0x8e44ad);
    graphics.drawCircle(0, 0, enemy.size);
    graphics.endFill();

    // Kapuze
    graphics.beginFill(0x5b2c6f);
    graphics.arc(0, 0, enemy.size * 0.8, -Math.PI * 0.9, -Math.PI * 0.1); // Etwas geöffneter
    graphics.lineTo(0, -enemy.size * 0.8); // Spitze
    graphics.closePath();
    graphics.endFill();

    // Gesicht (dunkel, nur Augen sichtbar)
    graphics.beginFill(0x2c3e50);
    graphics.drawCircle(0, enemy.size * 0.1, enemy.size * 0.5); // Leicht nach unten verschoben
    graphics.endFill();

    // Leuchtende Augen
    graphics.beginFill(0xFFFFFF, 0.8);
    graphics.drawCircle(-enemy.size * 0.2, 0, 3); // Position angepasst
    graphics.drawCircle(enemy.size * 0.2, 0, 3);
    graphics.endFill();

    // Magisches Symbol (rotierend)
    graphics.lineStyle(1, 0xffffff, 0.7);
    const symbolRadius = enemy.size * 0.4; // Etwas größer
    const pointCount = 5;
    graphics.moveTo(
        Math.cos(time) * symbolRadius,
        Math.sin(time) * symbolRadius
    );
    for (let i = 1; i <= pointCount; i++) {
        const angle = time + (i * Math.PI * 2 / pointCount);
        graphics.lineTo(
            Math.cos(angle) * symbolRadius,
            Math.sin(angle) * symbolRadius
        );
    }
}