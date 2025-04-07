const fs = require('fs');
const { createCanvas } = require('canvas');

// Create assets directory if it doesn't exist
if (!fs.existsSync('public/assets')) {
    fs.mkdirSync('public/assets', { recursive: true });
}

// Function to create a simple image
function createImage(filename, width, height, color) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`public/assets/${filename}`, buffer);
}

// Generate assets
createImage('robot.png', 32, 32, '#00ff00');
createImage('bullet.png', 8, 8, '#ffff00');
createImage('background.png', 800, 600, '#000033');
createImage('platform.png', 200, 20, '#666666');
createImage('health.png', 16, 16, '#ff0000');
createImage('ammo.png', 16, 16, '#ffff00');
createImage('weapon.png', 16, 16, '#00ffff');

console.log('Game assets generated successfully!'); 