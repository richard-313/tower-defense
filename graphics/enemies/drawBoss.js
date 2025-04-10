function drawBossEnemy(enemy, graphics) {
    const time = Date.now() / 300;

    // Aura
    graphics.beginFill(0xc0392b, 0.2); // Farbe von enemyTypes['boss']
    graphics.drawCircle(0, 0, enemy.size * 1.5 + Math.sin(time) * 3);
    graphics.endFill();

    // Körper
    graphics.beginFill(0xc0392b);
    graphics.drawCircle(0, 0, enemy.size);
    graphics.endFill();

    // Krone
    graphics.beginFill(0xFFD700);
    const crownHeight = enemy.size * 0.6;
    graphics.moveTo(-enemy.size * 0.6, -enemy.size * 0.5);
    graphics.lineTo(-enemy.size * 0.6, -enemy.size * 0.5 - crownHeight * 0.6);
    graphics.lineTo(-enemy.size * 0.4, -enemy.size * 0.5 - crownHeight * 0.3);
    graphics.lineTo(-enemy.size * 0.2, -enemy.size * 0.5 - crownHeight * 0.8);
    graphics.lineTo(0, -enemy.size * 0.5 - crownHeight * 0.4);
    graphics.lineTo(enemy.size * 0.2, -enemy.size * 0.5 - crownHeight * 0.8);
    graphics.lineTo(enemy.size * 0.4, -enemy.size * 0.5 - crownHeight * 0.3);
    graphics.lineTo(enemy.size * 0.6, -enemy.size * 0.5 - crownHeight * 0.6);
    graphics.lineTo(enemy.size * 0.6, -enemy.size * 0.5);
    graphics.closePath();
    graphics.endFill();

    // Gesicht (dunkler Rotton)
    graphics.beginFill(0x7d241e);
    graphics.drawCircle(0, 0, enemy.size * 0.6);
    graphics.endFill();

    // Böse Augen
    graphics.beginFill(0xFFFFFF);
    graphics.drawCircle(-enemy.size * 0.25, -enemy.size * 0.1, 4);
    graphics.drawCircle(enemy.size * 0.25, -enemy.size * 0.1, 4);
    graphics.endFill();

    graphics.beginFill(0xFF0000);
    graphics.drawCircle(-enemy.size * 0.25, -enemy.size * 0.1, 2);
    graphics.drawCircle(enemy.size * 0.25, -enemy.size * 0.1, 2);
    graphics.endFill();
}