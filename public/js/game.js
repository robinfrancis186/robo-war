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
let score = 0;
let killFeed = [];
let loadingProgress = 0;
let loadingInterval;
let isPaused = false;

// Game states
const GAME_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
    PAUSED: 'paused'
};
let currentState = GAME_STATE.MENU;

// Weapon configurations
const WEAPONS = {
    normal: {
        damage: 10,
        fireRate: 300,
        bulletSpeed: 400,
        spread: 0.05,
        ammoMax: 100,
        color: '#00ff00'
    },
    shotgun: {
        damage: 5,
        fireRate: 800,
        bulletSpeed: 350,
        spread: 0.2,
        ammoMax: 30,
        color: '#ff00ff'
    },
    sniper: {
        damage: 30,
        fireRate: 1000,
        bulletSpeed: 600,
        spread: 0.01,
        ammoMax: 10,
        color: '#00ffff'
    }
};

function preload() {
    // Simulate loading progress
    loadingInterval = setInterval(() => {
        loadingProgress += 5;
        document.getElementById('loadingFill').style.width = `${loadingProgress}%`;
        
        if (loadingProgress >= 100) {
            clearInterval(loadingInterval);
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
                // Make sure the menu is visible after loading
                document.getElementById('menu').style.display = 'block';
            }, 500);
        }
    }, 100);
    
    // Load game assets
    this.load.image('robot', 'assets/robot.png');
    this.load.image('bullet', 'assets/bullet.png');
    this.load.image('background', 'assets/background.png');
    this.load.image('platform', 'assets/platform.png');
    this.load.image('healthPack', 'assets/health.png');
    this.load.image('ammoPack', 'assets/ammo.png');
    this.load.image('weaponPack', 'assets/weapon.png');
    this.load.image('explosion', 'assets/explosion.png');
    
    // Load sound effects
    this.load.audio('shoot', 'assets/shoot.mp3');
    this.load.audio('hit', 'assets/hit.mp3');
    this.load.audio('powerup', 'assets/powerup.mp3');
    this.load.audio('jump', 'assets/jump.mp3');
    this.load.audio('death', 'assets/death.mp3');
    this.load.audio('weaponSwitch', 'assets/weapon-switch.mp3');
    this.load.audio('menuSelect', 'assets/menu-select.mp3');
    
    // Add a complete callback to ensure loading is finished
    this.load.on('complete', () => {
        console.log('All assets loaded successfully');
        // Force the loading screen to hide if it's still showing
        if (loadingProgress < 100) {
            loadingProgress = 100;
            document.getElementById('loadingFill').style.width = '100%';
            clearInterval(loadingInterval);
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('menu').style.display = 'block';
            }, 500);
        }
    });
    
    // Add an error callback to handle loading failures
    this.load.on('loaderror', (fileObj) => {
        console.error('Error loading asset:', fileObj.key);
        // Continue with the game even if some assets fail to load
        if (loadingProgress < 100) {
            loadingProgress = 100;
            document.getElementById('loadingFill').style.width = '100%';
            clearInterval(loadingInterval);
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('menu').style.display = 'block';
            }, 500);
        }
    });
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
    
    // Add more platforms for better gameplay
    platforms.create(200, 350, 'platform');
    platforms.create(350, 200, 'platform');
    platforms.create(650, 150, 'platform');

    // Initialize socket connection
    socket = io();

    // Create bullets group
    bullets = this.add.group();

    // Setup keyboard controls
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', doubleJump);
    this.input.keyboard.on('keydown-Q', switchWeapon);
    this.input.keyboard.on('keydown-ESC', togglePause);
    
    // Add WASD controls
    this.wasd = this.input.keyboard.addKeys({
        up: 'W',
        down: 'S',
        left: 'A',
        right: 'D'
    });

    // Setup UI
    document.getElementById('healthValue').textContent = '100';
    document.getElementById('healthFill').style.width = '100%';
    document.getElementById('ammoCount').textContent = ammo[currentWeapon];
    document.getElementById('weaponType').textContent = currentWeapon.toUpperCase();
    document.getElementById('weaponIcon').style.backgroundColor = WEAPONS[currentWeapon].color;
    document.getElementById('score').textContent = `SCORE: ${score}`;
    document.getElementById('players').textContent = `PLAYERS: ${playerCount}`;

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
        
        // Add kill feed message
        addKillFeedMessage(`${playerInfo.name || 'Player'} joined the game`, '#00ff00');
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
            
            // Add hit effect
            this.tweens.add({
                targets: player,
                alpha: 0.5,
                duration: 100,
                yoyo: true
            });
            
            if (player.health <= 0) {
                handlePlayerDeath();
            }
        }
    });

    socket.on('playerDied', (data) => {
        if (data.player.id === socket.id) {
            // Local player died
            this.sound.play('death');
            handlePlayerDeath();
        } else if (data.attacker === socket.id) {
            // We killed someone
            score += 10;
            updateScore();
            addKillFeedMessage(`You eliminated ${data.player.name || 'Player'}`, '#ff0000');
        } else {
            // Someone else died
            addKillFeedMessage(`${data.attacker ? data.attacker.name || 'Player' : 'Unknown'} eliminated ${data.player.name || 'Player'}`, '#ff6600');
        }
    });

    socket.on('playerDisconnected', (playerId) => {
        playerCount--;
        updatePlayerCount();
        if (otherPlayers[playerId]) {
            otherPlayers[playerId].destroy();
            delete otherPlayers[playerId];
        }
        
        // Add kill feed message
        addKillFeedMessage(`${otherPlayers[playerId]?.name || 'Player'} left the game`, '#00ff00');
    });

    // Create local player
    player = this.add.sprite(400, 300, 'robot');
    player.setScale(0.5);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.body.setBounce(0.2);
    player.health = 100;
    player.score = 0;
    player.name = 'Player' + Math.floor(Math.random() * 1000);

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
    document.getElementById('pauseMenu').style.display = 'none';
}

function update() {
    if (currentState !== GAME_STATE.PLAYING || isPaused) return;

    if (player) {
        // Player movement
        const speed = 160;
        if (cursors.left.isDown || this.wasd.left.isDown) {
            player.body.setVelocityX(-speed);
        } else if (cursors.right.isDown || this.wasd.right.isDown) {
            player.body.setVelocityX(speed);
        } else {
            player.body.setVelocityX(0);
        }

        // Jumping
        if ((cursors.up.isDown || this.wasd.up.isDown) && player.body.touching.down) {
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
            angle: player.rotation,
            name: player.name
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
        const speed = bullet.speed || WEAPONS[bullet.weaponType].bulletSpeed;
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
                    damage: WEAPONS[bullet.weaponType].damage
                });
                createExplosion(this, bullet.x, bullet.y);
                bullet.destroy();
            }
        });
        
        // Remove bullets that go off screen
        if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
            bullet.destroy();
        }
    });
}

function startGame() {
    currentState = GAME_STATE.PLAYING;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    gameStarted = true;
    
    // Play menu select sound
    game.sound.play('menuSelect');
}

function showControls() {
    // Play menu select sound
    game.sound.play('menuSelect');
    
    // Show controls in a more stylish way
    const controlsDiv = document.getElementById('controls');
    controlsDiv.style.display = 'block';
    
    setTimeout(() => {
        controlsDiv.style.display = 'none';
    }, 5000);
}

function togglePause() {
    if (currentState === GAME_STATE.PLAYING) {
        isPaused = true;
        document.getElementById('pauseMenu').style.display = 'block';
        game.sound.pauseAll();
    } else if (currentState === GAME_STATE.PAUSED) {
        resumeGame();
    }
}

function resumeGame() {
    isPaused = false;
    document.getElementById('pauseMenu').style.display = 'none';
    game.sound.resumeAll();
    game.sound.play('menuSelect');
}

function quitGame() {
    isPaused = false;
    currentState = GAME_STATE.MENU;
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
    game.sound.resumeAll();
    game.sound.play('menuSelect');
    
    // Reset player
    if (player) {
        player.x = 400;
        player.y = 300;
        player.health = 100;
        updateHealth();
    }
}

function updateHealth() {
    document.getElementById('healthValue').textContent = player.health;
    document.getElementById('healthFill').style.width = `${player.health}%`;
    
    // Change health bar color based on health
    if (player.health > 70) {
        document.getElementById('healthFill').style.backgroundColor = '#00ff00';
    } else if (player.health > 30) {
        document.getElementById('healthFill').style.backgroundColor = '#ffff00';
    } else {
        document.getElementById('healthFill').style.backgroundColor = '#ff0000';
    }
}

function updateScore() {
    document.getElementById('score').textContent = `SCORE: ${score}`;
}

function updateAmmo() {
    document.getElementById('ammoCount').textContent = ammo[currentWeapon];
    
    // Change ammo text color based on ammo count
    if (ammo[currentWeapon] > WEAPONS[currentWeapon].ammoMax * 0.3) {
        document.getElementById('ammoCount').style.color = '#00ff00';
    } else if (ammo[currentWeapon] > WEAPONS[currentWeapon].ammoMax * 0.1) {
        document.getElementById('ammoCount').style.color = '#ffff00';
    } else {
        document.getElementById('ammoCount').style.color = '#ff0000';
    }
}

function updateWeapon() {
    document.getElementById('weaponType').textContent = currentWeapon.toUpperCase();
    document.getElementById('weaponIcon').style.backgroundColor = WEAPONS[currentWeapon].color;
}

function updatePlayerCount() {
    document.getElementById('players').textContent = `PLAYERS: ${playerCount}`;
}

function handlePlayerDeath() {
    player.health = 100;
    player.x = Math.random() * 700 + 50;
    player.y = Math.random() * 500 + 50;
    updateHealth();
    createExplosion(this, player.x, player.y);
    
    // Emit player death
    socket.emit('playerDied', {
        player: {
            id: socket.id,
            name: player.name
        }
    });
}

function createExplosion(scene, x, y) {
    const explosion = scene.add.sprite(x, y, 'explosion');
    explosion.setScale(0.5);
    scene.sound.play('hit');
    
    // Add explosion animation
    scene.tweens.add({
        targets: explosion,
        scale: 1,
        alpha: 0,
        duration: 500,
        onComplete: () => {
            explosion.destroy();
        }
    });
}

function collectPowerUp(powerUp) {
    switch (powerUp.type) {
        case 'health':
            player.health = Math.min(100, player.health + 25);
            updateHealth();
            break;
        case 'ammo':
            ammo[currentWeapon] = Math.min(ammo[currentWeapon] + 30, WEAPONS[currentWeapon].ammoMax);
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
    
    // Add power-up collection effect
    this.tweens.add({
        targets: powerUp,
        scale: 1.5,
        alpha: 0,
        duration: 300,
        onComplete: () => {
            powerUp.destroy();
            delete powerUps[powerUp.id];
        }
    });
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
    
    // Play weapon switch sound
    this.sound.play('weaponSwitch');
    
    // Add weapon switch effect
    this.tweens.add({
        targets: player,
        alpha: 0.7,
        duration: 100,
        yoyo: true
    });
}

function getWeaponDamage(weaponType) {
    return WEAPONS[weaponType].damage;
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
    
    // Add floating animation
    this.tweens.add({
        targets: powerUp,
        y: y - 10,
        duration: 1000,
        yoyo: true,
        repeat: -1
    });
    
    powerUps[powerUp.id] = powerUp;
    
    // Remove power-up after 10 seconds
    this.time.delayedCall(10000, () => {
        if (powerUps[powerUp.id]) {
            this.tweens.add({
                targets: powerUp,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    powerUp.destroy();
                    delete powerUps[powerUp.id];
                }
            });
        }
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
    otherPlayer.name = playerInfo.name || 'Player';
    otherPlayers[playerInfo.id] = otherPlayer;
    self.physics.add.existing(otherPlayer);
    self.physics.add.collider(otherPlayer, platforms);
    
    // Add player name label
    const nameLabel = self.add.text(0, -20, otherPlayer.name, {
        fontSize: '12px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
    });
    nameLabel.setOrigin(0.5);
    otherPlayer.add(nameLabel);
}

function createBullet(self, x, y, angle, weaponType = 'normal') {
    const bullet = self.add.sprite(x, y, 'bullet');
    bullet.setScale(0.2);
    bullet.rotation = angle;
    bullet.weaponType = weaponType;
    
    // Add spread to bullet
    const spread = WEAPONS[weaponType].spread;
    bullet.rotation += (Math.random() - 0.5) * spread;
    
    // Set bullet color based on weapon type
    bullet.setTint(WEAPONS[weaponType].color.replace('#', '0x'));
    
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

function addKillFeedMessage(message, color) {
    const killFeed = document.getElementById('killFeed');
    const messageElement = document.createElement('div');
    messageElement.className = 'kill-message';
    messageElement.textContent = message;
    messageElement.style.color = color;
    
    killFeed.appendChild(messageElement);
    
    // Remove message after animation completes
    setTimeout(() => {
        messageElement.remove();
    }, 3000);
}

// Initialize game
game = new Phaser.Game(config); 