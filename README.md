# Robo War

A multiplayer robot shooting game inspired by Mini Militia, built with Node.js, Socket.IO, and Phaser 3.

## Features

- Multiplayer real-time gameplay
- Double jump ability
- Multiple weapons (Normal, Shotgun, Sniper)
- Health regeneration
- Power-ups (Health, Ammo, Weapon)
- Platform-based movement
- Score tracking

## Controls

- Arrow Keys: Move
- Space: Jump/Double Jump
- Mouse: Aim
- Left Click: Shoot
- Q: Switch Weapons

## Installation

1. Make sure you have Node.js installed
2. Clone this repository
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser and navigate to `http://localhost:3000`

## Development

To run the server in development mode with auto-reload:
```bash
npm run dev
```

## Game Assets

The game requires the following assets in the `public/assets` directory:
- robot.png
- bullet.png
- background.png
- platform.png
- health.png
- ammo.png
- weapon.png

## Multiplayer

The game supports multiple players in the same game session. Each player can:
- Move independently
- Shoot at other players
- Collect power-ups
- Score points by eliminating other players

## Weapons

1. Normal Gun
   - Balanced damage and fire rate
   - 100 ammo capacity

2. Shotgun
   - Spread shot
   - Lower damage per pellet
   - 30 ammo capacity

3. Sniper
   - High damage
   - Fast projectile speed
   - 10 ammo capacity 