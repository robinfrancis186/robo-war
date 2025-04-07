const fs = require('fs');
const path = require('path');

// Define the assets directory path
const assetsDir = path.join(__dirname, '..', 'public', 'assets');

// Create the assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
    console.log('Creating assets directory...');
    fs.mkdirSync(assetsDir, { recursive: true });
}

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
    console.log('\n=== MISSING GAME ASSETS ===');
    console.log('The following assets are missing:');
    missingAssets.forEach(asset => {
        console.log(`- ${asset}`);
    });
    console.log('\nTo generate these assets:');
    console.log('1. Start the server with: npm run dev');
    console.log('2. Open your browser and visit: http://localhost:3000/generate-assets.html');
    console.log('3. Click the "Generate Assets" button');
    console.log('4. Save all downloaded files to the public/assets directory');
    console.log('5. Make sure all files are named exactly as shown above');
    console.log('\nAfter adding the assets, restart the server and the game should work properly.');
} else {
    console.log('All assets are present! The game should work properly.');
}

console.log('\nSetup complete!'); 