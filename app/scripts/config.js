/**
 * Game Configuration
 * 
 * Centralized configuration for the Pac-Man game.
 * Change settings here to affect the entire application.
 */

class GameConfig {
  constructor() {
    // API Configuration
    this.api = {
      // Base URL for the leaderboard API
      baseUrl: this.getApiUrl(),
      
      // Request timeout in milliseconds
      timeout: 10000,
      
      // Retry attempts for failed requests
      retryAttempts: 3
    };
    
    // Leaderboard Configuration
    this.leaderboard = {
      // Maximum entries to display
      maxEntries: 10,
      
      // Auto-refresh interval in milliseconds (30 seconds)
      refreshInterval: 30000,
      
      // Enable auto-refresh
      autoRefresh: true
    };
    
    // Game Configuration
    this.game = {
      // Enable debug mode
      debug: false,
      
      // Enable analytics
      analytics: true
    };
  }
  
  /**
   * Determine API URL based on environment
   * Priority: window.GAME_CONFIG > hostname detection > default
   */
  getApiUrl() {
    // 1. Check if manually configured via window object
    if (window.GAME_CONFIG && window.GAME_CONFIG.API_URL) {
      return window.GAME_CONFIG.API_URL;
    }
    
    // 2. Auto-detect based on hostname
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Local development
      return '/api/leaderboard-api.php';
    } else if (hostname.includes('stg-saasboomiorg-staging.kinsta.cloud')) {
      // Staging environment
      return 'https://dev.matsio.com/game-api';
    } else if (hostname === 'saasboomi.org') {
      // Production environment
      return 'https://dev.matsio.com/game-api';
    }
    
    // 3. Default fallback
    return 'https://dev.matsio.com/game-api';
  }
  
  /**
   * Get API URL with endpoint
   * @param {string} endpoint - API endpoint (e.g., 'submit', 'leaderboard')
   * @returns {string} Full API URL
   */
  getApiEndpoint(endpoint) {
    return `${this.api.baseUrl}/${endpoint}`;
  }
  
  /**
   * Check if we're in development mode
   * @returns {boolean}
   */
  isDevelopment() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
  
  /**
   * Check if we're in staging mode
   * @returns {boolean}
   */
  isStaging() {
    return window.location.hostname.includes('stg-saasboomiorg-staging.kinsta.cloud');
  }
  
  /**
   * Check if we're in production mode
   * @returns {boolean}
   */
  isProduction() {
    return window.location.hostname === 'saasboomi.org';
  }
  
  /**
   * Log configuration info (for debugging)
   */
  logConfig() {
    if (this.game.debug || this.isDevelopment()) {
      console.group('🎮 Game Configuration');
      console.log('Environment:', this.getEnvironment());
      console.log('API Base URL:', this.api.baseUrl);
      console.log('Debug Mode:', this.game.debug);
      console.log('Auto Refresh:', this.leaderboard.autoRefresh);
      console.groupEnd();
    }
  }
  
  /**
   * Get current environment name
   * @returns {string}
   */
  getEnvironment() {
    if (this.isDevelopment()) return 'development';
    if (this.isStaging()) return 'staging';
    if (this.isProduction()) return 'production';
    return 'unknown';
  }
}

// Create singleton instance
const gameConfig = new GameConfig();

// Log configuration on load
gameConfig.logConfig();

// Make it globally available
window.GameConfig = gameConfig;

// removeIf(production)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameConfig;
}
// endRemoveIf(production)