// Create a canvas element
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Function to create and download an image
function generateAndDownloadImage(width, height, color, filename) {
    canvas.width = width;
    canvas.height = height;
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Convert to data URL and create download link
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    link.click();
}

// Generate all assets
const assets = [
    { width: 32, height: 32, color: '#00ff00', filename: 'robot.png' },
    { width: 8, height: 8, color: '#ffff00', filename: 'bullet.png' },
    { width: 800, height: 600, color: '#000033', filename: 'background.png' },
    { width: 200, height: 20, color: '#666666', filename: 'platform.png' },
    { width: 16, height: 16, color: '#ff0000', filename: 'health.png' },
    { width: 16, height: 16, color: '#ffff00', filename: 'ammo.png' },
    { width: 16, height: 16, color: '#00ffff', filename: 'weapon.png' }
];

// Generate each asset
assets.forEach(asset => {
    generateAndDownloadImage(asset.width, asset.height, asset.color, asset.filename);
}); 