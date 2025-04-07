// Import configuration
const { config, validateConfig } = require('./config');

// Validate environment variables
validateConfig();

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: config.corsOrigin,
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Import routes
const aiRoutes = require('./routes/ai');

// Use routes
app.use('/api/ai', aiRoutes);

const players = new Map();
const gameState = {
    powerUps: [],
    lastPowerUpSpawn: Date.now(),
    killFeed: []
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
        },
        name: 'Player' + Math.floor(Math.random() * 1000)
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
            if (movementData.name) {
                player.name = movementData.name;
            }
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
                    attacker.score += 10;
                }
                player.health = 100;
                player.x = Math.random() * 700 + 50;
                player.y = Math.random() * 500 + 50;
                
                // Emit player death event
                io.emit('playerDied', {
                    player: {
                        id: player.id,
                        name: player.name
                    },
                    attacker: attacker ? {
                        id: attacker.id,
                        name: attacker.name
                    } : null
                });
            }
        }
    });

    // Handle player death
    socket.on('playerDied', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.health = 100;
            player.x = Math.random() * 700 + 50;
            player.y = Math.random() * 500 + 50;
            
            // Emit player death event
            io.emit('playerDied', {
                player: {
                    id: player.id,
                    name: player.name
                },
                attacker: null
            });
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
        const player = players.get(socket.id);
        if (player) {
            io.emit('playerDisconnected', socket.id);
            players.delete(socket.id);
        }
    });
});

// Use configuration values
const PORT = config.port;
const HOST = config.host;

http.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`AI API Key loaded: ${config.aiApiKey ? 'Yes' : 'No'}`);
}); 