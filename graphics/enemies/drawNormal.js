function drawNormalEnemy(enemy, graphics) {
    // Körper
    graphics.beginFill(0x7f8c8d); // Farbe von enemyTypes['normal']
    graphics.drawCircle(0, 0, enemy.size);
    graphics.endFill();

    // Gesicht
    graphics.beginFill(0xf5d7b5); // Hautfarbe
    graphics.drawCircle(0, -2, enemy.size * 0.6);
    graphics.endFill();

    // Hut
    graphics.beginFill(0x964B00);
    graphics.arc(0, -enemy.size * 0.5, enemy.size * 0.7, Math.PI, Math.PI * 2);
    graphics.endFill();
}