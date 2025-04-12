// --- START OF FILE utils.js ---
// utils.js
// Contains general utility functions used across different parts of the game.

/**
 * Draws a star shape onto a PIXI.Graphics object.
 * @param {PIXI.Graphics} graphics - The PIXI Graphics object to draw on.
 * @param {number} x - The center x-coordinate of the star.
 * @param {number} y - The center y-coordinate of the star.
 * @param {number} points - The number of points the star should have.
 * @param {number} outerRadius - The distance from the center to the outer points.
 * @param {number} innerRadius - The distance from the center to the inner points.
 * @param {number} [rotation=0] - The rotation of the star in radians.
 */
function drawStar(graphics, x, y, points, outerRadius, innerRadius, rotation = 0) {
    if (!graphics || graphics._destroyed) return; // Safety check

    const step = Math.PI / points;
    // Start slightly offset from pure top (-PI/2) for a more standard star look, plus rotation
    const startAngle = rotation - Math.PI / 2;

    graphics.moveTo(
        x + outerRadius * Math.cos(startAngle),
        y + outerRadius * Math.sin(startAngle)
    );

    for (let i = 1; i <= points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = startAngle + step * i;
        graphics.lineTo(
            x + radius * Math.cos(angle),
            y + radius * Math.sin(angle)
        );
    }
    graphics.closePath(); // Close the path to fill correctly
}

// --- Füge hier bei Bedarf weitere Utility-Funktionen hinzu ---
// Example: Function to format currency (useful for UI)
// function formatGold(amount) {
//    return `${amount} G`;
// }

// --- END OF FILE utils.js ---