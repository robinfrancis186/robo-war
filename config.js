// Load environment variables from .env file
require('dotenv').config();

// Configuration object
const config = {
  // API Keys
  aiApiKey: process.env.AI_API_KEY,
  
  // Server Configuration
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Game Configuration
  game: {
    maxPlayers: 10,
    tickRate: 60,
    mapSize: {
      width: 800,
      height: 600
    }
  }
};

// Validate required environment variables
function validateConfig() {
  const requiredVars = ['AI_API_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
}

// Export the configuration
module.exports = {
  config,
  validateConfig
}; 