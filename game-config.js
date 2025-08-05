/**
 * Game Configuration Override
 * 
 * Include this file before your main game script to customize settings.
 * 
 * Usage:
 * <script src="game-config.js"></script>
 * <script src="build/app.js"></script>
 */

// Environment-specific configuration
const ENVIRONMENT_CONFIGS = {
  development: {
    API_URL: './api',
    DEBUG_MODE: true,
    REFRESH_INTERVAL_MS: 10000 // Faster refresh in dev
  },
  
  staging: {
    API_URL: './api',
    DEBUG_MODE: true,
    REFRESH_INTERVAL_MS: 15000
  },
  
  production: {
    API_URL: './api',
    DEBUG_MODE: false,
    REFRESH_INTERVAL_MS: 30000
  }
};

// Auto-detect environment or use manual override
const getEnvironment = () => {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  } else if (hostname.includes('stg-saasboomiorg-staging.kinsta.cloud')) {
    return 'staging';
  } else if (hostname === 'saasboomi.org') {
    return 'production';
  }
  
  return 'production'; // Default to production
};

// Get environment config
const environment = getEnvironment();
const envConfig = ENVIRONMENT_CONFIGS[environment] || ENVIRONMENT_CONFIGS.production;

// Global Game Configuration
window.GAME_CONFIG = {
  // Current environment
  ENVIRONMENT: environment,
  
  // API Configuration
  API_URL: envConfig.API_URL,
  
  // Leaderboard Settings
  MAX_LEADERBOARD_ENTRIES: 10,
  AUTO_REFRESH_ENABLED: true,
  REFRESH_INTERVAL_MS: envConfig.REFRESH_INTERVAL_MS,
  
  // Debug Settings
  DEBUG_MODE: envConfig.DEBUG_MODE,
  ENABLE_ANALYTICS: true,
  
  // Custom overrides (modify these as needed)
  CUSTOM: {
    // Add your custom settings here
    SHOW_FPS: false,
    ENABLE_CHEATS: false
  }
};

// Log configuration in non-production environments
if (environment !== 'production') {
  console.group('🎮 Game Configuration');
  console.log('Environment:', environment);
  console.log('API URL:', window.GAME_CONFIG.API_URL);
  console.log('Debug Mode:', window.GAME_CONFIG.DEBUG_MODE);
  console.log('Refresh Interval:', window.GAME_CONFIG.REFRESH_INTERVAL_MS + 'ms');
  console.groupEnd();
}