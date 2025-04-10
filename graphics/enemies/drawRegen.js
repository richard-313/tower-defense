function drawRegenEnemy(enemy, graphics) {
    const time = Date.now() / 500;

    // Pulsierender grüner Heilungsaura
    graphics.beginFill(0x27ae60, 0.15); // Farbe von enemyTypes['regen']
    graphics.drawCircle(0, 0, enemy.size * 1.3 + Math.sin(time) * 3);
    graphics.endFill();

    // Körper
    graphics.beginFill(0x27ae60);
    graphics.drawCircle(0, 0, enemy.size);
    graphics.endFill();

    // Gewand (weiß mit grünem Rand)
    graphics.beginFill(0xffffff);
    graphics.arc(0, 0, enemy.size * 0.9, Math.PI, Math.PI * 2);
    graphics.lineTo(0, enemy.size * 0.7); // Längeres Gewand
    graphics.closePath();
    graphics.endFill();
    graphics.lineStyle(2, 0x229954);
    graphics.arc(0, 0, enemy.size * 0.9, Math.PI, Math.PI * 2);
    graphics.moveTo(-enemy.size * 0.9, 0);
    graphics.lineTo(0, enemy.size * 0.7);
    graphics.lineTo(enemy.size * 0.9, 0);
    graphics.lineStyle(0); // Linienstil zurücksetzen

    // Gesicht
    graphics.beginFill(0xf5d7b5);
    graphics.drawCircle(0, -enemy.size * 0.2, enemy.size * 0.45);
    graphics.endFill();

    // Heiliges Symbol (Kreuz)
    graphics.lineStyle(3, 0xFFD700, 0.9); // Goldener
    graphics.moveTo(0, -enemy.size * 0.6);
    graphics.lineTo(0, -enemy.size * 0.1);
    graphics.moveTo(-enemy.size * 0.25, -enemy.size * 0.35);
    graphics.lineTo(enemy.size * 0.25, -enemy.size * 0.35);
    graphics.lineStyle(0);

    // Heilungspartikel
    if (enemy.health < enemy.maxHealth && Math.random() < 0.1) { // Zeigt Partikel nur bei Heilung (zufällig)
        graphics.beginFill(0x2ecc71, 0.7);
        for (let i = 0; i < 2; i++) {
            const particleAngle = Math.random() * Math.PI * 2;
            const dist = Math.random() * enemy.size * 1.2;
            graphics.drawCircle(
                Math.cos(particleAngle) * dist,
                Math.sin(particleAngle) * dist,
                2 + Math.random() // Variable Größe
            );
        }
        graphics.endFill();
    }
}