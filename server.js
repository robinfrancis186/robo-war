const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static('public'));

const players = new Map();
const gameState = {
    powerUps: [],
    lastPowerUpSpawn: Date.now()
};

// Spawn power-ups periodically
setInterval(() => {
    const now = Date.now();
    if (now - gameState.lastPowerUpSpawn > 10000) {
        spawnPowerUp();
        gameState.lastPowerUpSpawn = now;
    }
}, 1000);

function spawnPowerUp() {
    const types = ['health', 'ammo', 'weapon'];
    const type = types[Math.floor(Math.random() * types.length)];
    const powerUp = {
        id: Date.now().toString(),
        type,
        x: Math.random() * 700 + 50,
        y: Math.random() * 500 + 50
    };
    gameState.powerUps.push(powerUp);
    io.emit('powerUpSpawned', powerUp);
}

io.on('connection', (socket) => {
    console.log('A player connected');

    // Initialize player
    players.set(socket.id, {
        id: socket.id,
        x: Math.random() * 700 + 50,
        y: Math.random() * 500 + 50,
        health: 100,
        score: 0,
        angle: 0,
        weapon: 'normal',
        ammo: {
            normal: 100,
            shotgun: 30,
            sniper: 10
        }
    });

    // Send current game state to new player
    socket.emit('currentPlayers', Array.from(players.values()));
    socket.emit('currentPowerUps', gameState.powerUps);

    // Broadcast new player to others
    socket.broadcast.emit('newPlayer', players.get(socket.id));

    // Handle player movement
    socket.on('playerMovement', (movementData) => {
        const player = players.get(socket.id);
        if (player) {
            player.x = movementData.x;
            player.y = movementData.y;
            player.angle = movementData.angle;
            socket.broadcast.emit('playerMoved', player);
        }
    });

    // Handle shooting
    socket.on('playerShoot', (shootData) => {
        socket.broadcast.emit('playerShot', {
            playerId: socket.id,
            x: shootData.x,
            y: shootData.y,
            angle: shootData.angle,
            weaponType: shootData.weaponType
        });
    });

    // Handle player damage
    socket.on('playerHit', (damageData) => {
        const player = players.get(damageData.targetId);
        if (player) {
            player.health -= damageData.damage;
            if (player.health <= 0) {
                // Player died
                const attacker = players.get(socket.id);
                if (attacker) {
                    attacker.score += 1;
                }
                player.health = 100;
                player.x = Math.random() * 700 + 50;
                player.y = Math.random() * 500 + 50;
                io.emit('playerDied', {
                    player,
                    attacker: attacker ? attacker.id : null
                });
            }
        }
    });

    // Handle power-up collection
    socket.on('powerUpCollected', (powerUpId) => {
        gameState.powerUps = gameState.powerUps.filter(powerUp => powerUp.id !== powerUpId);
        io.emit('powerUpCollected', powerUpId);
    });

    // Handle weapon switch
    socket.on('weaponSwitch', (weaponData) => {
        const player = players.get(socket.id);
        if (player) {
            player.weapon = weaponData.weapon;
            player.ammo = weaponData.ammo;
            socket.broadcast.emit('playerWeaponChanged', {
                playerId: socket.id,
                weapon: player.weapon,
                ammo: player.ammo
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A player disconnected');
        players.delete(socket.id);
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

http.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
}); 