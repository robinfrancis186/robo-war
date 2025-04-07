const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'gameCanvas',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let game;
let socket;
let player;
let otherPlayers = {};
let cursors;
let bullets;
let healthText;
let scoreText;
let ammoText;
let weaponText;
let playersText;
let powerUps = {};
let platforms;
let canDoubleJump = true;
let hasJumped = false;
let lastHealthRegen = 0;
let currentWeapon = 'normal';
let gameStarted = false;
let playerCount = 1;
let ammo = {
    normal: 100,
    shotgun: 30,
    sniper: 10
};

// Game states
const GAME_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};
let currentState = GAME_STATE.MENU;

function preload() {
    // Load game assets
    this.load.image('robot', 'assets/robot.png');
    this.load.image('bullet', 'assets/bullet.png');
    this.load.image('background', 'assets/background.png');
    this.load.image('platform', 'assets/platform.png');
    this.load.image('healthPack', 'assets/health.png');
    this.load.image('ammoPack', 'assets/ammo.png');
    this.load.image('weaponPack', 'assets/weapon.png');
    this.load.image('explosion', 'assets/explosion.png');
    this.load.audio('shoot', 'assets/shoot.mp3');
    this.load.audio('hit', 'assets/hit.mp3');
    this.load.audio('powerup', 'assets/powerup.mp3');
    this.load.audio('jump', 'assets/jump.mp3');
}

function create() {
    // Add background
    this.add.image(400, 300, 'background');

    // Create platforms
    platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, 'platform').setScale(2).refreshBody();
    platforms.create(600, 400, 'platform');
    platforms.create(50, 250, 'platform');
    platforms.create(750, 220, 'platform');

    // Initialize socket connection
    socket = io();

    // Create bullets group
    bullets = this.add.group();

    // Setup keyboard controls
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', doubleJump);
    this.input.keyboard.on('keydown-Q', switchWeapon);
    this.input.keyboard.on('keydown-ESC', togglePause);

    // Setup UI
    healthText = document.getElementById('health');
    scoreText = document.getElementById('score');
    ammoText = document.getElementById('ammo');
    weaponText = document.getElementById('weapon');
    playersText = document.getElementById('players');

    // Handle socket events
    socket.on('currentPlayers', (players) => {
        playerCount = Object.keys(players).length;
        updatePlayerCount();
        Object.keys(players).forEach((id) => {
            if (id !== socket.id) {
                addOtherPlayer(this, players[id]);
            }
        });
    });

    socket.on('newPlayer', (playerInfo) => {
        playerCount++;
        updatePlayerCount();
        addOtherPlayer(this, playerInfo);
    });

    socket.on('playerMoved', (playerInfo) => {
        if (otherPlayers[playerInfo.id]) {
            otherPlayers[playerInfo.id].x = playerInfo.x;
            otherPlayers[playerInfo.id].y = playerInfo.y;
            otherPlayers[playerInfo.id].angle = playerInfo.angle;
        }
    });

    socket.on('playerShot', (shootData) => {
        if (otherPlayers[shootData.playerId]) {
            createBullet(this, shootData.x, shootData.y, shootData.angle, shootData.weaponType);
        }
    });

    socket.on('playerHit', (data) => {
        if (data.targetId === socket.id) {
            player.health -= data.damage;
            updateHealth();
            if (player.health <= 0) {
                handlePlayerDeath();
            }
        }
    });

    socket.on('playerDisconnected', (playerId) => {
        playerCount--;
        updatePlayerCount();
        if (otherPlayers[playerId]) {
            otherPlayers[playerId].destroy();
            delete otherPlayers[playerId];
        }
    });

    // Create local player
    player = this.add.sprite(400, 300, 'robot');
    player.setScale(0.5);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.body.setBounce(0.2);
    player.health = 100;
    player.score = 0;

    // Setup collisions
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(bullets, platforms, bulletHitPlatform);

    // Spawn power-ups periodically
    this.time.addEvent({
        delay: 10000,
        callback: spawnPowerUp,
        callbackScope: this,
        loop: true
    });

    // Initialize game state
    document.getElementById('menu').style.display = 'block';
    document.getElementById('gameUI').style.display = 'none';
}

function update() {
    if (currentState !== GAME_STATE.PLAYING) return;

    if (player) {
        // Player movement
        const speed = 160;
        if (cursors.left.isDown) {
            player.body.setVelocityX(-speed);
        } else if (cursors.right.isDown) {
            player.body.setVelocityX(speed);
        } else {
            player.body.setVelocityX(0);
        }

        // Jumping
        if (cursors.up.isDown && player.body.touching.down) {
            player.body.setVelocityY(-400);
            hasJumped = true;
            canDoubleJump = true;
            this.sound.play('jump');
        }

        // Player rotation
        const pointer = this.input.activePointer;
        const angle = Phaser.Math.Angle.Between(
            player.x, player.y,
            pointer.x, pointer.y
        );
        player.rotation = angle;

        // Emit player movement
        socket.emit('playerMovement', {
            x: player.x,
            y: player.y,
            angle: player.rotation
        });

        // Shooting
        if (this.input.activePointer.isDown && ammo[currentWeapon] > 0) {
            shoot(this);
        }

        // Health regeneration
        const now = Date.now();
        if (now - lastHealthRegen > 5000 && player.health < 100) {
            player.health = Math.min(100, player.health + 5);
            lastHealthRegen = now;
            updateHealth();
        }

        // Check power-up collisions
        Object.values(powerUps).forEach(powerUp => {
            if (Phaser.Geom.Intersects.RectangleToRectangle(
                player.getBounds(),
                powerUp.getBounds()
            )) {
                collectPowerUp(powerUp);
            }
        });
    }

    // Update bullets
    bullets.children.each((bullet) => {
        // Move bullet
        const speed = bullet.speed || 10;
        bullet.x += Math.cos(bullet.rotation) * speed;
        bullet.y += Math.sin(bullet.rotation) * speed;

        // Check for collisions
        Object.values(otherPlayers).forEach((otherPlayer) => {
            if (Phaser.Geom.Intersects.RectangleToRectangle(
                bullet.getBounds(),
                otherPlayer.getBounds()
            )) {
                socket.emit('playerHit', {
                    targetId: otherPlayer.playerId,
                    damage: getWeaponDamage(bullet.weaponType)
                });
                createExplosion(this, bullet.x, bullet.y);
                bullet.destroy();
            }
        });
    });
}

function startGame() {
    currentState = GAME_STATE.PLAYING;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    gameStarted = true;
}

function showControls() {
    alert(
        'Controls:\n' +
        'Arrow Keys: Move\n' +
        'Space: Jump/Double Jump\n' +
        'Mouse: Aim\n' +
        'Left Click: Shoot\n' +
        'Q: Switch Weapons\n' +
        'ESC: Pause'
    );
}

function togglePause() {
    if (currentState === GAME_STATE.PLAYING) {
        currentState = GAME_STATE.MENU;
        document.getElementById('menu').style.display = 'block';
    } else if (currentState === GAME_STATE.MENU && gameStarted) {
        currentState = GAME_STATE.PLAYING;
        document.getElementById('menu').style.display = 'none';
    }
}

function updateHealth() {
    healthText.textContent = `Health: ${player.health}`;
}

function updateScore() {
    scoreText.textContent = `Score: ${player.score}`;
}

function updateAmmo() {
    ammoText.textContent = `Ammo: ${ammo[currentWeapon]}`;
}

function updateWeapon() {
    weaponText.textContent = `Weapon: ${currentWeapon.charAt(0).toUpperCase() + currentWeapon.slice(1)}`;
}

function updatePlayerCount() {
    playersText.textContent = `Players: ${playerCount}`;
}

function handlePlayerDeath() {
    player.health = 100;
    player.x = Math.random() * 700 + 50;
    player.y = Math.random() * 500 + 50;
    updateHealth();
    createExplosion(this, player.x, player.y);
}

function createExplosion(scene, x, y) {
    const explosion = scene.add.sprite(x, y, 'explosion');
    explosion.setScale(0.5);
    scene.sound.play('hit');
    scene.time.delayedCall(500, () => {
        explosion.destroy();
    });
}

function collectPowerUp(powerUp) {
    switch (powerUp.type) {
        case 'health':
            player.health = Math.min(100, player.health + 25);
            updateHealth();
            break;
        case 'ammo':
            ammo[currentWeapon] = Math.min(ammo[currentWeapon] + 30, 100);
            updateAmmo();
            break;
        case 'weapon':
            const weapons = ['normal', 'shotgun', 'sniper'];
            currentWeapon = weapons[Math.floor(Math.random() * weapons.length)];
            updateWeapon();
            updateAmmo();
            break;
    }
    this.sound.play('powerup');
    powerUp.destroy();
    delete powerUps[powerUp.id];
}

function doubleJump() {
    if (canDoubleJump && hasJumped) {
        player.body.setVelocityY(-300);
        canDoubleJump = false;
        this.sound.play('jump');
    }
}

function switchWeapon() {
    const weapons = ['normal', 'shotgun', 'sniper'];
    const currentIndex = weapons.indexOf(currentWeapon);
    currentWeapon = weapons[(currentIndex + 1) % weapons.length];
    updateWeapon();
    updateAmmo();
}

function getWeaponDamage(weaponType) {
    switch (weaponType) {
        case 'normal': return 10;
        case 'shotgun': return 5;
        case 'sniper': return 30;
        default: return 10;
    }
}

function spawnPowerUp() {
    const types = ['health', 'ammo', 'weapon'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Phaser.Math.Between(50, 750);
    const y = Phaser.Math.Between(50, 550);
    
    const powerUp = this.add.sprite(x, y, `${type}Pack`);
    powerUp.setScale(0.5);
    this.physics.add.existing(powerUp);
    powerUp.type = type;
    
    powerUps[powerUp.id] = powerUp;
    
    // Remove power-up after 10 seconds
    this.time.delayedCall(10000, () => {
        powerUp.destroy();
        delete powerUps[powerUp.id];
    });
}

function bulletHitPlatform(bullet, platform) {
    createExplosion(this, bullet.x, bullet.y);
    bullet.destroy();
}

function addOtherPlayer(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'robot');
    otherPlayer.setScale(0.5);
    otherPlayer.playerId = playerInfo.id;
    otherPlayers[playerInfo.id] = otherPlayer;
    self.physics.add.existing(otherPlayer);
    self.physics.add.collider(otherPlayer, platforms);
}

function createBullet(self, x, y, angle, weaponType = 'normal') {
    const bullet = self.add.sprite(x, y, 'bullet');
    bullet.setScale(0.2);
    bullet.rotation = angle;
    bullet.weaponType = weaponType;
    
    switch (weaponType) {
        case 'normal':
            bullet.speed = 10;
            break;
        case 'shotgun':
            bullet.speed = 8;
            break;
        case 'sniper':
            bullet.speed = 15;
            break;
    }
    
    bullets.add(bullet);
    self.sound.play('shoot');
}

function shoot(self) {
    if (ammo[currentWeapon] <= 0) return;

    ammo[currentWeapon]--;
    updateAmmo();

    switch (currentWeapon) {
        case 'normal':
            createBullet(self, player.x, player.y, player.rotation, 'normal');
            break;
        case 'shotgun':
            // Create 5 bullets in a spread
            for (let i = -2; i <= 2; i++) {
                const angle = player.rotation + (i * 0.1);
                createBullet(self, player.x, player.y, angle, 'shotgun');
            }
            break;
        case 'sniper':
            createBullet(self, player.x, player.y, player.rotation, 'sniper');
            break;
    }

    socket.emit('playerShoot', {
        x: player.x,
        y: player.y,
        angle: player.rotation,
        weaponType: currentWeapon
    });
}

// Initialize game
game = new Phaser.Game(config); 