const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Define the assets directory path
const assetsDir = path.join(__dirname, '..', 'public', 'assets');

// Create the assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
    console.log('Creating assets directory...');
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Define the assets we need
const assets = [
    { width: 32, height: 32, color: '#00ff00', filename: 'robot.png' },
    { width: 8, height: 8, color: '#ffff00', filename: 'bullet.png' },
    { width: 800, height: 600, color: '#000033', filename: 'background.png' },
    { width: 200, height: 20, color: '#666666', filename: 'platform.png' },
    { width: 16, height: 16, color: '#ff0000', filename: 'health.png' },
    { width: 16, height: 16, color: '#ffff00', filename: 'ammo.png' },
    { width: 16, height: 16, color: '#00ffff', filename: 'weapon.png' },
    { width: 32, height: 32, color: '#ff6600', filename: 'explosion.png' }
];

// Function to generate an image
function generateImage(width, height, color, filename) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Save the image
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(assetsDir, filename), buffer);
    
    console.log(`Generated ${filename}`);
}

// Generate all assets
console.log('Generating game assets...');
assets.forEach(asset => {
    generateImage(asset.width, asset.height, asset.color, asset.filename);
});

console.log('All assets generated successfully!'); 