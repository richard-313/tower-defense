function drawFastEnemy(enemy, graphics, path) { // Path hinzugefügt für Richtung
    // Bewegungsrichtung berechnen
    const targetPoint = path[enemy.pathIndex];
    const moveAngle = targetPoint ? Math.atan2(
        targetPoint.y - enemy.y,
        targetPoint.x - enemy.x
    ) : 0; // Standardwinkel, falls kein Zielpunkt

    // Bewegungsspur
    graphics.beginFill(0x9b59b6, 0.3); // Farbe von enemyTypes['fast']
    for (let i = 1; i <= 3; i++) {
        graphics.drawCircle(
            -Math.cos(moveAngle) * (i * 5),
            -Math.sin(moveAngle) * (i * 5),
            enemy.size - i * 1.5 // Spur wird kleiner
        );
    }
    graphics.endFill();

    // Körper (leicht länglich in Bewegungsrichtung)
    graphics.beginFill(0x9b59b6);
    graphics.drawEllipse(0, 0, enemy.size * 1.1, enemy.size * 0.9);
    graphics.endFill();

    // Umhang (dynamisch)
    graphics.beginFill(0x8e44ad);
    const angleOffset = Math.PI / 6; // Breite des Umhangs
    const length = enemy.size * 1.5;
    graphics.moveTo(0, 0);
    graphics.lineTo(
        Math.cos(moveAngle + Math.PI + angleOffset) * length * 0.8,
        Math.sin(moveAngle + Math.PI + angleOffset) * length * 0.8
    );
     graphics.lineTo(
        Math.cos(moveAngle + Math.PI) * length,
        Math.sin(moveAngle + Math.PI) * length
    );
    graphics.lineTo(
        Math.cos(moveAngle + Math.PI - angleOffset) * length * 0.8,
        Math.sin(moveAngle + Math.PI - angleOffset) * length * 0.8
    );
    graphics.closePath();
    graphics.endFill();

    // Drehung anwenden
    graphics.rotation = moveAngle;
}