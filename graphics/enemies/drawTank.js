function drawTankEnemy(enemy, graphics) {
    // Schild (etwas größer)
    graphics.beginFill(0x34495e); // Farbe von enemyTypes['tank']
    graphics.drawRect(-enemy.size * 1.1, -enemy.size * 0.8, enemy.size * 2.2, enemy.size * 1.8);
    graphics.endFill();

    // Schildnieten
    graphics.beginFill(0x7f8c8d);
    graphics.drawCircle(-enemy.size * 0.8, -enemy.size * 0.5, 2);
    graphics.drawCircle(enemy.size * 0.8, -enemy.size * 0.5, 2);
    graphics.drawCircle(-enemy.size * 0.8, enemy.size * 0.5, 2);
    graphics.drawCircle(enemy.size * 0.8, enemy.size * 0.5, 2);
    graphics.endFill();

    // Helm
    graphics.beginFill(0x7f8c8d);
    graphics.drawCircle(0, -enemy.size * 0.3, enemy.size * 0.7); // Position leicht angepasst
    graphics.endFill();

    // Gesichtsspalt im Helm
    graphics.beginFill(0x000000);
    graphics.drawRect(-enemy.size * 0.5, -enemy.size * 0.5, enemy.size * 1.0, 3);
    graphics.endFill();
}