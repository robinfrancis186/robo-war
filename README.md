# Robo War

A multiplayer shooting game inspired by Mini Militia, built with Phaser.js, Socket.IO, and Node.js.

## Features

- Real-time multiplayer gameplay
- Three different weapons (Normal, Shotgun, Sniper)
- Double jump ability
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
- ESC: Pause

## Play Online

You can play the game online at: [Robo War](https://robo-war.onrender.com)

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/robinfrancis186/robo-war.git
cd robo-war
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit `http://localhost:3000`

## Deployment

The game is deployed on Render.com. To deploy your own instance:

1. Create a Render.com account
2. Click "New" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - Name: robo-war (or your preferred name)
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Select the free plan

5. Click "Create Web Service"

## Environment Variables

- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `CORS_ORIGIN`: CORS origin for Socket.IO (default: *)

## License

MIT

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