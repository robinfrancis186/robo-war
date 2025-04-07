const fs = require('fs');
const path = require('path');

// Define the assets directory path
const assetsDir = path.join(__dirname, '..', 'public', 'assets');

// Define the assets we need
const assets = [
    'robot.png',
    'bullet.png',
    'background.png',
    'platform.png',
    'health.png',
    'ammo.png',
    'weapon.png',
    'explosion.png'
];

// Create the assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
    console.log('Creating assets directory...');
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Check if each asset exists
let missingAssets = [];
assets.forEach(asset => {
    const assetPath = path.join(assetsDir, asset);
    if (!fs.existsSync(assetPath)) {
        missingAssets.push(asset);
    }
});

// If there are missing assets, inform the user
if (missingAssets.length > 0) {
    console.log('The following assets are missing:');
    missingAssets.forEach(asset => {
        console.log(`- ${asset}`);
    });
    console.log('\nPlease generate these assets by visiting:');
    console.log('http://localhost:3000/generate-assets.html');
    console.log('after starting the server with: npm run dev');
} else {
    console.log('All assets are present!');
}

console.log('\nSetup complete!'); 