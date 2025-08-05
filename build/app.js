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
      return './api';
    } else if (hostname.includes('stg-saasboomiorg-staging.kinsta.cloud')) {
      // Staging environment
      return './api';
    } else if (hostname === 'saasboomi.org') {
      // Production environment
      return './api';
    }
    
    // 3. Default fallback - relative to current directory
    return './api';
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


class Leaderboard {
  constructor(apiUrl = null) {
    // Use config system for settings
    const config = window.GAME_CONFIG || { API_URL: "./api", MAX_LEADERBOARD_ENTRIES: 10 };

    this.maxEntries = config.MAX_LEADERBOARD_ENTRIES;
    this.apiUrl = apiUrl || config.API_URL;
    this.scores = [];

    // Load scores from database on initialization
    this.loadScores();
  }

  async loadScores() {
    try {
      const res = await fetch(`${this.apiUrl}/leaderboard`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      const response = await res.json();
      this.scores = response.success ? response.data : [];
    } catch (err) {
      console.error("Error loading leaderboard:", err);
      this.scores = [];
    }
  }

  /**
   * Get the global top player and score
   * @returns {Promise<Object>} Top player data
   */
  async getTopPlayer() {
    try {
      const response = await fetch(`${this.apiUrl}/top-player`);
      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          topPlayer: data.data.top_player,
          topScore: data.data.top_score,
          achievedAt: data.data.achieved_at,
        };
      } else {
        console.error("Failed to fetch top player:", data.error);
        return { success: false, topPlayer: null, topScore: 0 };
      }
    } catch (error) {
      console.error("Error fetching top player:", error);
      return { success: false, topPlayer: null, topScore: 0 };
    }
  }

  /**
   * Submit score and check if it's a new global record
   * @param {number} score - The player's score
   * @param {string} playerName - The player's name
   * @param {number} level - The level reached
   * @param {string} email - The player's email (optional)
   * @param {string} phone - The player's phone (optional)
   * @returns {Promise<Object>} Result with newRecord flag
   */
  async addScoreWithRecordCheck(score, playerName = "Anonymous", level = 1, email = null, phone = null) {
    // Get current top score before submitting
    const currentTop = await this.getTopPlayer();
    const wasRecord = currentTop.success && score > currentTop.topScore;

    // Submit the score using your existing method
    const result = await this.addScore(score, playerName, level, email, phone);

    return {
      ...result,
      newRecord: wasRecord,
      previousTopScore: currentTop.topScore,
      previousTopPlayer: currentTop.topPlayer,
    };
  }

  /**
   * Add a new score to the leaderboard
   * @param {number} score - The player's score
   * @param {string} playerName - The player's name (optional)
   * @param {number} level - The level reached (optional)
   * @param {string} email - The player's email (optional)
   * @param {string} phone - The player's phone (optional)
   * @returns {Object} Result object with position and whether it made the leaderboard
   */
  async addScore(score, playerName = "Anonymous", level = 1, email = null, phone = null) {
    if (window.submitLock === true) {
      return;
    }
    window.submitLock = true;
    const payload = {
      player_name: playerName.trim() || "Anonymous",
      score: score,
      level: level,
    };

    // Add email and phone if provided
    if (email && email.trim()) {
      payload.email = email.trim();
    }

    if (phone && phone.trim()) {
      payload.phone = phone.trim();
    }

    try {
      const res = await fetch(`${this.apiUrl}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to submit score");

      const result = await res.json();

      if (result.success) {
        window.submitLock = false;
        // Optionally reload scores after submission
        await this.loadScores();

        return {
          madeLeaderboard: result.data.made_top_10,
          position: result.data.position,
          isNewRecord: result.data.is_new_record,
          result: result.data,
        };
      } else {
        window.submitLock = false;
        throw new Error(result.error || "Failed to submit score");
      }
    } catch (error) {
      console.error("Error submitting score:", error);
      return {
        madeLeaderboard: false,
        error: error.message,
      };
    }
  }

  /**
   * Get the top scores
   * @param {number} limit - Number of scores to return (default: all)
   * @returns {Array} Array of top scores
   */
  getTopScores(limit = this.maxEntries) {
    return this.scores.slice(0, Math.min(limit, this.scores.length));
  }

  /**
   * Get the highest score
   * @returns {number} The highest score or 0 if no scores exist
   */
  getHighScore() {
    return this.scores.length > 0 ? this.scores[0].score : 0;
  }

  /**
   * Check if a score would make the leaderboard
   * @param {number} score - The score to check
   * @returns {boolean} True if the score would make the leaderboard
   */
  wouldMakeLeaderboard(score) {
    if (this.scores.length < this.maxEntries) {
      return true;
    }
    return score > this.scores[this.scores.length - 1].score;
  }

  /**
   * Calculate what position a score would get without saving it
   * @param {number} score - The score to check
   * @returns {Object} Position info without saving to database
   */
  calculatePosition(score) {
    // Create a temporary array with the new score
    const tempScores = [...this.scores];
    tempScores.push({ score: score, player_name: "TEMP" });

    // Sort by score (descending)
    tempScores.sort((a, b) => b.score - a.score);

    // Find the position of our temporary score
    const position = tempScores.findIndex((s) => s.player_name === "TEMP") + 1;
    const madeLeaderboard = position <= this.maxEntries;

    return {
      position: position,
      madeLeaderboard: madeLeaderboard,
      isNewRecord: this.scores.length === 0 || score > this.scores[0].score,
    };
  }

  /**
   * Clear all scores (useful for testing or reset functionality)
   */
  clearScores() {
    this.scores = [];
    // Since you're using API, refresh from server
    this.loadScores();
  }

  /**
   * Save scores (compatibility method - scores are now saved via API)
   * This method exists for backward compatibility with existing UI code
   */
  saveScores() {
    // No-op: Scores are automatically saved to database via API calls
    // This method exists only for backward compatibility
    console.log("saveScores() called - scores are now automatically saved via API");
  }

  /**
   * Get leaderboard statistics from server
   * @returns {Promise<Object>} Statistics about the leaderboard
   */
  async getStatistics() {
    try {
      const response = await fetch(`${this.apiUrl}/stats`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        console.error("Failed to fetch statistics:", data.error);
        return this.getLocalStatistics();
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
      return this.getLocalStatistics();
    }
  }

  /**
   * Get local statistics as fallback
   * @returns {Object} Local statistics
   */
  getLocalStatistics() {
    if (this.scores.length === 0) {
      return {
        total_scores: 0,
        average_score: 0,
        highest_score: 0,
        highest_level: 0,
        unique_players: 0,
        active_days: 0,
      };
    }

    const totalScore = this.scores.reduce((sum, entry) => sum + entry.score, 0);
    const highestScore = Math.max(...this.scores.map((entry) => entry.score));
    const highestLevel = Math.max(...this.scores.map((entry) => entry.level || 1));
    const uniquePlayers = new Set(this.scores.map((entry) => entry.player_name)).size;

    return {
      total_scores: this.scores.length,
      average_score: Math.round(totalScore / this.scores.length),
      highest_score: highestScore,
      highest_level: highestLevel,
      unique_players: uniquePlayers,
      active_days: 1, // Can't calculate from local data
    };
  }

  /**
   * Format a score for display
   * @param {number} score - The score to format
   * @returns {string} Formatted score string
   */
  formatScore(score) {
    return score.toString().padStart(6, "0");
  }

  /**
   * Format a date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}


class LeaderboardUI {
  constructor(leaderboard, gameCoordinator) {
    this.leaderboard = leaderboard;
    this.gameCoordinator = gameCoordinator;
    this.createThreePanelLayout();
    this.setupEventListeners();
    this.startAutoRefresh();
  }

  /**
   * Create the three-panel layout structure
   */
  createThreePanelLayout() {
    // Create main app container
    this.appContainer = document.createElement('div');
    this.appContainer.className = 'app-container';
    this.appContainer.innerHTML = `
      <!-- Left Panel - Branding -->
      <div class="left-panel">
        <div class="brand-logo" id="brand-logo">
          <div class="brand-logo-text">🎮</div>
        </div>
        <div class="brand-content">
          <h1 class="brand-title">PACMAN<br/>ARENA</h1>
          <p class="brand-subtitle">The Ultimate Gaming Experience</p>
          <p class="brand-description">Join thousands of players competing for the highest score in this classic arcade adventure!</p>
          <a href="#" class="cta-button" id="main-page-cta">Visit Our Site</a>
        </div>
      </div>

      <!-- Center Panel - Game -->
      <div class="center-panel" id="center-panel">
        <!-- Game content will be moved here -->
      </div>

      <!-- Right Panel - Leaderboard -->
      <div class="right-panel">
        <div class="leaderboard-panel">
          <div class="leaderboard-panel-header">
            <h2>🏆 TOP PLAYERS</h2>
          </div>
          <div class="leaderboard-panel-content">
            <div class="leaderboard-panel-list" id="panel-leaderboard-list">
              <!-- Scores will be populated here -->
            </div>
            <div class="leaderboard-panel-footer">
              <div class="panel-stats" id="panel-leaderboard-stats">
                <!-- Stats will be populated here -->
              </div>
              <button id="clear-panel-leaderboard" class="clear-panel-button">Clear All Scores</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Keep the name input modal (but remove the main leaderboard modal)
    this.createNameInputModal();

    // Insert the layout and move existing game content
    this.moveGameToLayout();
  }

  /**
   * Move existing game elements into the new layout
   */
  moveGameToLayout() {
    // Get the existing body content
    const existingContent = document.body.innerHTML;

    // Clear body and add our new layout
    document.body.innerHTML = '';
    document.body.appendChild(this.appContainer);

    // Create a temporary container to parse existing content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = existingContent;

    // Find and move game elements to center panel
    const centerPanel = document.getElementById('center-panel');

    // Move specific game elements
    const gameElements = ['main-menu-container', 'paused-text', 'game-ui', 'left-cover', 'right-cover', 'loading-container', 'error-message'];

    gameElements.forEach((elementId) => {
      const element = tempDiv.querySelector(`#${elementId}`);
      if (element) {
        centerPanel.appendChild(element);
      }
    });

    // Move any remaining script tags
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach((script) => {
      document.body.appendChild(script);
    });

    // Also append the name input modal
    document.body.appendChild(this.nameInputModal);

    // Mark as game loaded once everything is set up
    setTimeout(() => {
      this.appContainer.classList.add('game-loaded');
    }, 100);
  }

  /**
   * Create name input modal (keep this for high score entry)
   */
  createNameInputModal() {
    this.nameInputModal = document.createElement('div');
    this.nameInputModal.id = 'name-input-modal';
    this.nameInputModal.className = 'name-input-modal';
    this.nameInputModal.innerHTML = `
      <div class="name-input-content">
        <div class="name-input-header">
          <h3>🎉 NEW HIGH SCORE! 🎉</h3>
        </div>
        <div class="name-input-body">
          <p>Your Score: <span id="final-score"></span></p>
          <p>Level Reached: <span id="final-level"></span></p>
          <p id="leaderboard-position"></p>
          <div class="input-group">
            <label for="player-name">Enter Your Name:</label>
            <input type="text" id="player-name" maxlength="15" placeholder="Anonymous" />
          </div>
          <div class="recaptcha-group">
            <div id="recaptcha-container" class="g-recaptcha" data-sitekey="6LdbIporAAAAAOH0Ci6nGXjsVU53YiLkfE3pkt2N"></div>
          </div>
        </div>
        <div class="name-input-footer">
          <button id="submit-score" class="submit-button">Submit Score</button>
          <button id="skip-name" class="skip-button">Skip</button>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Main page CTA button
    document.getElementById('main-page-cta')?.addEventListener('click', (e) => {
      e.preventDefault();
      // Replace with your actual main page URL
      window.open('https://your-main-website.com', '_blank');
    });

    // Clear leaderboard from panel
    document.getElementById('clear-panel-leaderboard')?.addEventListener('click', () => {
      this.clearLeaderboard();
    });

    // Name input modal events
    document.getElementById('submit-score')?.addEventListener('click', () => {
      this.submitScore();
    });

    document.getElementById('skip-name')?.addEventListener('click', () => {
      this.submitScore('Anonymous');
    });

    document.getElementById('player-name')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.submitScore();
      }
    });

    // Close name input modal when clicking outside
    this.nameInputModal?.addEventListener('click', (e) => {
      if (e.target === this.nameInputModal) {
        // Don't close name input modal by clicking outside
      }
    });
  }

  /**
   * Start auto-refresh for the leaderboard panel
   */
  startAutoRefresh() {
    // Update leaderboard panel immediately
    this.updateLeaderboardPanel();

    // Auto-refresh every 30 seconds
    setInterval(() => {
      this.updateLeaderboardPanel();
    }, 30000);
  }

  /**
   * Update the leaderboard panel (right side)
   */
  updateLeaderboardPanel() {
    const listElement = document.getElementById('panel-leaderboard-list');
    const statsElement = document.getElementById('panel-leaderboard-stats');

    if (!listElement || !statsElement) return;

    const scores = this.leaderboard.getTopScores(10);
    const stats = this.leaderboard.getStatistics();

    // Update scores list
    if (scores.length === 0) {
      listElement.innerHTML = '<div class="panel-no-scores">No scores yet!<br/>Be the first to play!</div>';
    } else {
      listElement.innerHTML = scores
        .map(
          (score, index) => `
        <div class="panel-score-entry ${index === 0 ? 'first-place' : ''}">
          <span class="rank">${index + 1}</span>
          <span class="name">${this.escapeHtml(score.player_name || score.name || 'Anonymous')}</span>
          <span class="score">${this.formatPanelScore(score.score)}</span>
        </div>
      `
        )
        .join('');
    }

    // Update statistics
    if (stats.totalGames > 0) {
      statsElement.innerHTML = `
        <h4>Game Statistics</h4>
        <div class="panel-stat-row">
          <span>Games Played:</span>
          <span>${stats.totalGames}</span>
        </div>
        <div class="panel-stat-row">
          <span>Average Score:</span>
          <span>${this.formatPanelScore(stats.averageScore)}</span>
        </div>
        <div class="panel-stat-row">
          <span>Best Level:</span>
          <span>${stats.highestLevel}</span>
        </div>
      `;
    } else {
      statsElement.innerHTML = `
        <h4>Game Statistics</h4>
        <div class="panel-stat-row">
          <span>No games played yet</span>
          <span>🎮</span>
        </div>
      `;
    }
  }

  /**
   * Format score for panel display (shorter format)
   */
  formatPanelScore(score) {
    if (score >= 1000000) {
      return (score / 1000000).toFixed(1) + 'M';
    } else if (score >= 1000) {
      return (score / 1000).toFixed(1) + 'K';
    }
    return score.toString();
  }

  /**
   * Show the name input modal for any score
   */
  showNameInput(score, level) {
    document.getElementById('final-score').textContent = this.leaderboard.formatScore(score);
    document.getElementById('final-level').textContent = level;

    // Temporarily add score to see position
    const result = this.leaderboard.addScore(score, 'TEMP', level);
    document.getElementById('leaderboard-position').textContent = result.isNewRecord ? '🥇 NEW RECORD!' : `#${result.position} on the leaderboard!`;

    // Remove the temporary entry
    this.leaderboard.scores = this.leaderboard.scores.filter((s) => (s.player_name || s.name) !== 'TEMP');

    this.nameInputModal.style.display = 'flex';
    setTimeout(() => {
      this.nameInputModal.classList.add('show');
      document.getElementById('player-name').focus();
      
      // Render reCAPTCHA when modal is shown
      this.renderRecaptcha();
    }, 10);

    // Store score and level for submission
    this.pendingScore = score;
    this.pendingLevel = level;
  }

  /**
   * Submit the score with the entered name
   */
  async submitScore(forceName = null) {
    const nameInput = document.getElementById('player-name');
    const playerName = forceName || nameInput.value.trim() || 'Anonymous';

    // Remove any existing error messages
    this.clearRecaptchaError();

    // Skip reCAPTCHA for skip button (Anonymous users)
    if (forceName === 'Anonymous') {
      this.processScoreSubmission(playerName);
      return;
    }

    // Verify reCAPTCHA
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
      this.showRecaptchaError('Please complete the reCAPTCHA verification.');
      return;
    }

    // Disable submit button during verification
    const submitButton = document.getElementById('submit-score');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Verifying...';

    try {
      // Verify reCAPTCHA with server
      const isValid = await this.verifyRecaptcha(recaptchaResponse);
      
      if (isValid) {
        this.processScoreSubmission(playerName);
      } else {
        this.showRecaptchaError('reCAPTCHA verification failed. Please try again.');
        grecaptcha.reset();
      }
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      this.showRecaptchaError('Verification failed. Please try again.');
      grecaptcha.reset();
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }

  /**
   * Process the actual score submission after verification
   */
  processScoreSubmission(playerName) {
    const nameInput = document.getElementById('player-name');
    const result = this.leaderboard.addScore(this.pendingScore, playerName, this.pendingLevel);

    // Hide name input modal
    this.nameInputModal.classList.remove('show');
    setTimeout(() => {
      this.nameInputModal.style.display = 'none';
      nameInput.value = '';
      // Reset reCAPTCHA when modal closes
      if (typeof grecaptcha !== 'undefined') {
        grecaptcha.reset();
      }
    }, 300);

    // Update the leaderboard panel immediately
    this.updateLeaderboardPanel();

    // Clear pending data
    this.pendingScore = null;
    this.pendingLevel = null;
  }

  /**
   * Clear all leaderboard scores with confirmation
   */
  clearLeaderboard() {
    if (confirm('Are you sure you want to clear all scores? This cannot be undone.')) {
      this.leaderboard.clearScores();
      this.updateLeaderboardPanel();
    }
  }

  /**
   * Update branding content (call this to customize the left panel)
   */
  updateBranding(config) {
    const defaults = {
      logo: '🎮',
      title: 'PACMAN<br/>ARENA',
      subtitle: 'The Ultimate Gaming Experience',
      description: 'Join thousands of players competing for the highest score in this classic arcade adventure!',
      ctaText: 'Visit Our Site',
      ctaUrl: 'https://your-main-website.com'
    };

    const settings = { ...defaults, ...config };

    // Update logo
    const logoElement = document.querySelector('.brand-logo-text');
    if (logoElement) {
      if (settings.logoImage) {
        logoElement.innerHTML = `<img src="${settings.logoImage}" alt="Logo" />`;
      } else {
        logoElement.textContent = settings.logo;
      }
    }

    // Update text content
    const titleElement = document.querySelector('.brand-title');
    if (titleElement) titleElement.innerHTML = settings.title;

    const subtitleElement = document.querySelector('.brand-subtitle');
    if (subtitleElement) subtitleElement.textContent = settings.subtitle;

    const descriptionElement = document.querySelector('.brand-description');
    if (descriptionElement) descriptionElement.textContent = settings.description;

    const ctaElement = document.getElementById('main-page-cta');
    if (ctaElement) {
      ctaElement.textContent = settings.ctaText;
      ctaElement.href = settings.ctaUrl;
    }
  }

  /**
   * Render reCAPTCHA widget
   */
  renderRecaptcha() {
    if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer && !recaptchaContainer.hasChildNodes()) {
        try {
          grecaptcha.render('recaptcha-container', {
            'sitekey': '6LdbIporAAAAAOH0Ci6nGXjsVU53YiLkfE3pkt2N'
          });
        } catch (error) {
          console.error('Error rendering reCAPTCHA:', error);
        }
      }
    } else {
      // reCAPTCHA not loaded yet, try again after a short delay
      setTimeout(() => this.renderRecaptcha(), 500);
    }
  }

  /**
   * Verify reCAPTCHA with server
   */
  async verifyRecaptcha(recaptchaResponse) {
    try {
      const response = await fetch('api/leaderboard-api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify_recaptcha',
          recaptcha_response: recaptchaResponse
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return false;
    }
  }

  /**
   * Show reCAPTCHA error message
   */
  showRecaptchaError(message) {
    this.clearRecaptchaError();
    const recaptchaGroup = document.querySelector('.recaptcha-group');
    if (recaptchaGroup) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'recaptcha-error';
      errorDiv.textContent = message;
      recaptchaGroup.appendChild(errorDiv);
    }
  }

  /**
   * Clear reCAPTCHA error message
   */
  clearRecaptchaError() {
    const errorDiv = document.querySelector('.recaptcha-error');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}


// Modified LeaderboardUI class to work with existing page-right div
class PageRightLeaderboardUI {
  constructor(leaderboard, gameCoordinator) {
    this.leaderboard = leaderboard;
    this.gameCoordinator = gameCoordinator;
    this.createLeaderboardInPageRight();
    this.createNameInputModal();
    this.setupEventListeners();
    this.startAutoRefresh();
  }

  /**
   * Create leaderboard content in the existing page-right div
   */
  createLeaderboardInPageRight() {
    const pageRightDiv = document.querySelector(".page-right");
    if (!pageRightDiv) {
      console.error("page-right div not found!");
      return;
    }

    // Style the page-right div
    pageRightDiv.style.cssText = `
      background: linear-gradient(135deg, #000 0%, #1a1a2e 50%, #16213e 100%);
      border-left: 3px solid #2121ff;
      padding: 20px;
      box-shadow: -5px 0 20px rgba(33, 33, 255, 0.3);
      overflow-y: auto;
      position: relative;
    `;

    // Add leaderboard content
    // Add leaderboard content
    pageRightDiv.innerHTML = `
  <div class="leaderboard-panel">
    <!-- Global Champion Section -->
    <div class="global-champion-section" id="global-champion" style="
      background: linear-gradient(135deg, #ffd700, #ffed4e);
      border: 3px solid #b8860b;
      border-radius: 15px;
      padding: 15px;
      text-align: center;
      margin-bottom: 20px;
      box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
    ">
      <div class="crown" style="font-size: 24px; margin-bottom: 5px;">👑</div>
      <div class="champion-title" style="
        font-size: 12px;
        font-weight: bold;
        color: #b8860b;
        text-transform: uppercase;
        margin-bottom: 8px;
        letter-spacing: 1px;
        font-family: 'Courier New', monospace;
      ">GLOBAL CHAMPION</div>
      <div class="champion-name" id="champion-name" style="
        font-size: 14px;
        font-weight: bold;
        color: #8b4513;
        margin-bottom: 5px;
        font-family: 'Courier New', monospace;
      ">Loading...</div>
      <div class="champion-score" id="champion-score" style="
        font-size: 16px;
        font-weight: bold;
        color: #b8860b;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        font-family: 'Courier New', monospace;
      ">-</div>
    </div>

    <div class="leaderboard-panel-header">
      <h2 style="
        color: #ffdf00;
        margin: 0 0 20px 0;
        font-family: 'Courier New', monospace;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        text-align: center;
        font-size: 18px;
      ">🏆 TOP PLAYERS</h2>
    </div>

    <div class="leaderboard-panel-content">
      <div class="leaderboard-panel-list" id="panel-leaderboard-list" style="
        margin-bottom: 20px;
        min-height: 300px;
      ">
        <!-- Scores will be populated here -->
      </div>
    </div>
  </div>
  <div class="right-bottom">
        <div class="terms-and-conditions">
          <h3>Terms and Conditions:</h3>
          <ul>
            <li>
              You must be a Compass member or have passed Caravan curation with
              a valid payment link.
            </li>
            <li>Winners will be contacted via email.</li>
            <li>
              If a winner is not eligible, the next top scorer will take their
              place.
            </li>
          </ul>
        </div>

        <div class="share-score">
         
        </div>
      </div>
`;
  }

  /**
   * Create name input modal (same as before)
   */
  createNameInputModal() {
    this.nameInputModal = document.createElement("div");
    this.nameInputModal.id = "name-input-modal";
    this.nameInputModal.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      justify-content: center;
      align-items: center;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    this.nameInputModal.innerHTML = `
      <div class="name-input-content" style="
        background-color: #000;
        border: 5px solid #2121ff;
        border-radius: 10px;
        padding: 20px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 0 20px rgba(33, 33, 255, 0.5);
        transform: scale(0.8);
        transition: transform 0.3s ease;
        text-align: center;
        font-family: 'Courier New', monospace;
      ">
        <div class="name-input-header">
          <h3 style="
            color: #ffdf00;
            margin: 0 auto 20px auto;
            animation: pulse 1s infinite;
          ">🎉 NEW HIGH SCORE! 🎉</h3>
        </div>
        <div class="name-input-body">
          <p style="color: #fff; margin: 10px 0;">Your Score: <span id="final-score" style="color: #00ff00; font-weight: bold;"></span></p>
          <p style="color: #fff; margin: 10px 0;">Level Reached: <span id="final-level" style="color: #00ff00; font-weight: bold;"></span></p>
          <p id="leaderboard-position" style="color: #ffdf00; font-weight: bold; font-size: 1.1em; margin: 15px 0;"></p>
          <div class="input-group" style="margin: 20px 0;">
            <label for="player-name" style="
              display: block;
              color: #ffdf00;
              margin-bottom: 5px;
            ">Enter Your Name:</label>
            <input type="text" id="player-name" maxlength="50" placeholder="Your name" required style="
              width: 100%;
              padding: 10px;
              border: 2px solid #2121ff;
              border-radius: 5px;
              background-color: #000;
              color: #fff;
              font-family: 'Courier New', monospace;
              font-size: 16px;
              text-align: center;
              box-sizing: border-box;
              margin-bottom: 15px;
            " />
            
            <label for="player-email" style="
              display: block;
              color: #ffdf00;
              margin-bottom: 5px;
            ">Email (for winner notification):</label>
            <input type="email" id="player-email" maxlength="255" placeholder="your@email.com" style="
              width: 100%;
              padding: 10px;
              border: 2px solid #2121ff;
              border-radius: 5px;
              background-color: #000;
              color: #fff;
              font-family: 'Courier New', monospace;
              font-size: 16px;
              text-align: center;
              box-sizing: border-box;
              margin-bottom: 15px;
            " />
            
            <label for="player-phone" style="
              display: block;
              color: #ffdf00;
              margin-bottom: 5px;
            ">Phone (optional):</label>
            <input type="tel" id="player-phone" maxlength="20" placeholder="+1 123 456 7890" style="
              width: 100%;
              padding: 10px;
              border: 2px solid #2121ff;
              border-radius: 5px;
              background-color: #000;
              color: #fff;
              font-family: 'Courier New', monospace;
              font-size: 16px;
              text-align: center;
              box-sizing: border-box;
            " />
            
            <p style="font-size: 12px; color: #ccc; margin-top: 15px; line-height: 1.4; text-align: center;">
              🏆 Winners will be contacted via email<br>
              📱 Phone helps us reach you faster
            </p>
          </div>
        </div>
        <div class="name-input-footer" style="
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 20px;
        ">
          <button id="submit-score" style="
            background-color: #fcc73f;
            border: 3px solid #231f20;
            border-radius: 8px;
            color: #231f20;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: bold;
            padding: 10px 20px;
            transition: all 0.2s ease;
            box-shadow: 3px 3px #ee2a29;
          ">Submit Score</button>
          <button id="skip-name" style="
            background-color: #666;
            color: #fff;
            border: 3px solid #444;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            font-weight: bold;
            padding: 10px 20px;
            transition: all 0.2s ease;
            box-shadow: 3px 3px #444;
          ">Skip</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.nameInputModal);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Clear leaderboard from panel
    document
      .getElementById("clear-panel-leaderboard")
      ?.addEventListener("click", () => {
        this.clearLeaderboard();
      });

    // Name input modal events
    document.getElementById("submit-score")?.addEventListener("click", () => {
      this.submitScore();
    });

    document.getElementById("skip-name")?.addEventListener("click", () => {
      this.submitScore("Anonymous");
    });

    document
      .getElementById("player-name")
      ?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.submitScore();
        }
      });

    // Style input focus
    const playerNameInput = document.getElementById("player-name");
    if (playerNameInput) {
      playerNameInput.addEventListener("focus", () => {
        playerNameInput.classList.add("input-highlight-yellow");
        playerNameInput.classList.remove("input-highlight-blue");
      });
      playerNameInput.addEventListener("blur", () => {
        playerNameInput.classList.add("input-highlight-blue");
        playerNameInput.classList.remove("input-highlight-yellow");
      });
    }
  }

  /**
   * Start auto-refresh for the leaderboard panel
   */
  async startAutoRefresh() {
    // Get config for refresh settings
    const config = window.GAME_CONFIG || {
      AUTO_REFRESH_ENABLED: true, 
      REFRESH_INTERVAL_MS: 30000,
    };

    // Wait for initial scores to load, then update displays
    await this.leaderboard.loadScores();
    this.updateLeaderboardPanel();
    this.updateGlobalChampion();

    // Auto-refresh based on config
    if (config.AUTO_REFRESH_ENABLED) {
      setInterval(async () => {
        await this.leaderboard.loadScores();
        this.updateLeaderboardPanel();
        this.updateGlobalChampion();
      }, config.REFRESH_INTERVAL_MS);
    }
  }

  /**
   * Update the leaderboard panel
   */
  updateLeaderboardPanel() {
    const listElement = document.getElementById("panel-leaderboard-list");

    if (!listElement) return;

    const scores = this.leaderboard.getTopScores(10);

    // Update scores list
    if (scores.length === 0) {
      listElement.innerHTML = `
        <div style="
          text-align: center;
          color: #888;
          font-style: italic;
          padding: 40px 20px;
          font-family: 'Courier New', monospace;
        ">No scores yet!<br/>Be the first to play!</div>
      `;
    } else {
      listElement.innerHTML = scores
        .map((score, index) => {
          const isFirst = index === 0;
          return `
            <div style="
              display: grid;
              grid-template-columns: 30px 1fr 80px;
              gap: 8px;
              padding: 8px 0;
              border-bottom: 1px solid #333;
              color: #fff;
              font-family: 'Courier New', monospace;
              align-items: center;
              font-size: 12px;
              ${
                isFirst
                  ? "background: linear-gradient(90deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0) 100%); border-left: 4px solid #ffdf00; padding-left: 6px;"
                  : ""
              }
            ">
              <div style="
                font-weight: bold;
                text-align: center;
                color: ${isFirst ? "#ffd700" : "#ffdf00"};
                ${isFirst ? "text-shadow: 0 0 10px #ffd700;" : ""}
              ">${index + 1}</div>
              <div style="
                font-weight: bold;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              ">${this.escapeHtml(
                score.player_name || score.name || "Anonymous"
              )}</div>
              <div style="
                text-align: right;
                font-weight: bold;
                color: #00ff00;
              ">${this.leaderboard.formatScore(score.score)}</div>
            </div>
      
          `;
        })
        .join("");
    }
  }

  /**
   * Show name input modal when game ends (for any score)
   */
  showNameInput(score, level) {
    console.log("showNameInput called with score:", score, "level:", level);

    // Calculate position without saving to database
    const positionInfo = this.leaderboard.calculatePosition(score);

    document.getElementById("final-score").textContent =
      this.leaderboard.formatScore(score);
    document.getElementById("final-level").textContent = level;

    const positionElement = document.getElementById("leaderboard-position");
    if (positionInfo.madeLeaderboard) {
      if (positionInfo.isNewRecord) {
        positionElement.textContent = "🥇 NEW RECORD!";
      } else {
        positionElement.textContent = `New #${positionInfo.position} high score!`;
      }
    } else {
      positionElement.textContent = `Your score: ${this.leaderboard.formatScore(score)} points!`;
    }
    positionElement.classList.remove('game-element-hidden');
    positionElement.classList.add('game-element-visible');

    // Update email label based on leaderboard qualification
    const emailLabel = document.querySelector('label[for="player-email"]');
    const emailInput = document.getElementById('player-email');
    if (positionInfo.madeLeaderboard) {
      emailLabel.textContent = "Email (required for winner notification):";
      emailInput.setAttribute('required', 'required');
    } else {
      emailLabel.textContent = "Email (optional):";
      emailInput.removeAttribute('required');
    }

    this.nameInputModal.style.display = "flex";
    // Note: opacity and transform are kept as inline styles since they're part of animation sequence
    setTimeout(() => {
      this.nameInputModal.style.opacity = "1";
      this.nameInputModal.querySelector(".name-input-content").style.transform =
        "scale(1)";
    }, 10);

    // Focus on name input
    setTimeout(() => {
      const nameInput = document.getElementById("player-name");
      if (nameInput) {
        nameInput.focus();
      }
    }, 300);

    // Store score data for submission
    this.pendingScore = { score, level };
  }

  /**
   * Submit the score with player name
   */
  async submitScore(name) {
    console.log("submitScore called with name:", name);
    console.log("pendingScore:", this.pendingScore);

    if (!this.pendingScore) {
      console.error("No pending score to submit");
      return;
    }

    const playerName =
      name ||
      document.getElementById("player-name")?.value?.trim() ||
      "Anonymous";

    const email =
      document.getElementById("player-email")?.value?.trim() || null;
    const phone =
      document.getElementById("player-phone")?.value?.trim() || null;

    // Check if this score would make the leaderboard to determine email requirement
    const wouldMakeLeaderboard = this.leaderboard.wouldMakeLeaderboard(this.pendingScore.score);
    
    // Validate required fields
    if (wouldMakeLeaderboard && !email) {
      alert("Email is required for leaderboard entries (winner notification)!");
      document.getElementById("player-email")?.focus();
      return;
    }

    // Basic email validation (only if email is provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert("Please enter a valid email address!");
        document.getElementById("player-email")?.focus();
        return;
      }
    }

    console.log("Final player info:", { playerName, email, phone });

    // Use the new method that checks for records
    const result = await this.leaderboard.addScoreWithRecordCheck(
      this.pendingScore.score,
      playerName,
      this.pendingScore.level,
      email,
      phone
    );

    console.log("Score added, result:", result);

    // Show celebration if it's a new global record
    if (result.newRecord) {
      this.showNewRecordCelebration(playerName, this.pendingScore.score);
    }

    this.updateLeaderboardPanel();
    this.updateGlobalChampion(); // Update champion display
    this.hideNameInput();

    this.pendingScore = null;
  }

  /**
   * Hide name input modal
   */
  hideNameInput() {
    // Note: opacity and transform are kept as inline styles since they're part of animation sequence
    this.nameInputModal.style.opacity = "0";
    this.nameInputModal.querySelector(".name-input-content").style.transform =
      "scale(0.8)";

    setTimeout(() => {
      this.nameInputModal.style.display = "none";
      document.getElementById("player-name").value = "";
      document.getElementById("player-email").value = "";
      document.getElementById("player-phone").value = "";
    }, 300);
  }

  /**
   * Clear all scores
   */
  clearLeaderboard() {
    if (
      confirm(
        "Are you sure you want to clear all scores? This cannot be undone."
      )
    ) {
      this.leaderboard.clearScores();
      this.updateLeaderboardPanel();
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  /**
   * Update the global champion display
   */
  async updateGlobalChampion() {
    const championName = document.getElementById("champion-name");
    const championScore = document.getElementById("champion-score");

    if (!championName || !championScore) return;

    try {
      const topPlayer = await this.leaderboard.getTopPlayer();

      if (topPlayer.success && topPlayer.topPlayer && topPlayer.topScore > 0) {
        championName.textContent = topPlayer.topPlayer;
        championScore.textContent = this.leaderboard.formatScore(
          topPlayer.topScore
        );

        // Add glow effect for new records
        const championSection = document.getElementById("global-champion");
        if (championSection) {
          championSection.style.animation = "glow 2s infinite alternate";
        }
      } else {
        championName.textContent = "No champion yet";
        championScore.textContent = "Be the first!";
      }
    } catch (error) {
      console.error("Error updating global champion:", error);
      championName.textContent = "Loading...";
      championScore.textContent = "-";
    }
  }

  /**
   * Show new record celebration
   */
  showNewRecordCelebration(playerName, score) {
    const celebration = document.createElement("div");
    celebration.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    color: white;
    padding: 30px;
    border-radius: 20px;
    text-align: center;
    z-index: 10000;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    font-family: 'Courier New', monospace;
    animation: celebrationPulse 1s infinite;
  `;

    celebration.innerHTML = `
    <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">
      🎉 NEW GLOBAL RECORD! 🎉
    </div>
    <div style="font-size: 18px; font-weight: bold;">
      ${this.escapeHtml(playerName)} scored ${this.leaderboard.formatScore(
      score
    )}!
    </div>
    <div class="right-bottom">
        <div class="terms-and-conditions">
          <h3>Terms and Conditions:</h3>
          <ul>
            <li>
              You must be a Compass member or have passed Caravan curation with
              a valid payment link.
            </li>
            <li>Winners will be contacted via email.</li>
            <li>
              If a winner is not eligible, the next top scorer will take their
              place.
            </li>
          </ul>
        </div>

        <div class="share-score">
          <a href="" target="_blank" class="share-button">
            Share my score! → Forward to LinkedIn post
          </a>
        </div>
      </div>
  `;

    document.body.appendChild(celebration);

    // Remove after 5 seconds
    setTimeout(() => {
      if (celebration.parentNode) {
        celebration.parentNode.removeChild(celebration);
      }
    }, 5000);
  }
}

class Ghost {
  constructor(
    scaledTileSize, mazeArray, pacman, name, level, characterUtil, blinky,
  ) {
    this.scaledTileSize = scaledTileSize;
    this.mazeArray = mazeArray;
    this.pacman = pacman;
    this.name = name;
    this.level = level;
    this.characterUtil = characterUtil;
    this.blinky = blinky;
    this.animationTarget = document.getElementById(name);

    this.reset();
  }

  /**
   * Rests the character to its default state
   * @param {Boolean} fullGameReset
   */
  reset(fullGameReset) {
    if (fullGameReset) {
      delete this.defaultSpeed;
      delete this.cruiseElroy;
    }

    this.setDefaultMode();
    this.setMovementStats(this.pacman, this.name, this.level);
    this.setSpriteAnimationStats();
    this.setStyleMeasurements(this.scaledTileSize, this.spriteFrames);
    this.setDefaultPosition(this.scaledTileSize, this.name);
    this.setSpriteSheet(this.name, this.direction, this.mode);
  }

  /**
   * Sets the default mode and idleMode behavior
   */
  setDefaultMode() {
    this.allowCollision = true;
    this.defaultMode = 'scatter';
    this.mode = 'scatter';
    if (this.name !== 'blinky') {
      this.idleMode = 'idle';
    }
  }

  /**
   * Sets various properties related to the ghost's movement
   * @param {Object} pacman - Pacman's speed is used as the base for the ghosts' speeds
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   */
  setMovementStats(pacman, name, level) {
    const pacmanSpeed = pacman.velocityPerMs;
    const levelAdjustment = level / 100;

    this.slowSpeed = pacmanSpeed * (0.75 + levelAdjustment);
    this.mediumSpeed = pacmanSpeed * (0.875 + levelAdjustment);
    this.fastSpeed = pacmanSpeed * (1 + levelAdjustment);

    if (!this.defaultSpeed) {
      this.defaultSpeed = this.slowSpeed;
    }

    this.scaredSpeed = pacmanSpeed * 0.5;
    this.transitionSpeed = pacmanSpeed * 0.4;
    this.eyeSpeed = pacmanSpeed * 2;

    this.velocityPerMs = this.defaultSpeed;
    this.moving = false;

    switch (name) {
      case 'blinky':
        this.defaultDirection = this.characterUtil.directions.left;
        break;
      case 'pinky':
        this.defaultDirection = this.characterUtil.directions.down;
        break;
      case 'inky':
        this.defaultDirection = this.characterUtil.directions.up;
        break;
      case 'clyde':
        this.defaultDirection = this.characterUtil.directions.up;
        break;
      default:
        this.defaultDirection = this.characterUtil.directions.left;
        break;
    }
    this.direction = this.defaultDirection;
  }

  /**
   * Sets values pertaining to the ghost's spritesheet animation
   */
  setSpriteAnimationStats() {
    this.display = true;
    this.loopAnimation = true;
    this.animate = true;
    this.msBetweenSprites = 250;
    this.msSinceLastSprite = 0;
    this.spriteFrames = 2;
    this.backgroundOffsetPixels = 0;
    this.animationTarget.style.backgroundPosition = '0px 0px';
    this.animationTarget.classList.add('ghost-character');
  }

  /**
   * Sets css property values for the ghost
   * @param {number} scaledTileSize - The dimensions of a single tile
   * @param {number} spriteFrames - The number of frames in the ghost's spritesheet
   */
  setStyleMeasurements(scaledTileSize, spriteFrames) {
    // The ghosts are the size of 2x2 game tiles.
    this.measurement = scaledTileSize * 2;

    this.animationTarget.style.height = `${this.measurement}px`;
    this.animationTarget.style.width = `${this.measurement}px`;
    const bgSize = this.measurement * spriteFrames;
    this.animationTarget.style.backgroundSize = `${bgSize}px`;
  }

  /**
   * Sets the default position and direction for the ghosts at the game's start
   * @param {number} scaledTileSize - The dimensions of a single tile
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   */
  setDefaultPosition(scaledTileSize, name) {
    switch (name) {
      case 'blinky':
        this.defaultPosition = {
          top: scaledTileSize * 10.5,
          left: scaledTileSize * 13,
        };
        break;
      case 'pinky':
        this.defaultPosition = {
          top: scaledTileSize * 13.5,
          left: scaledTileSize * 13,
        };
        break;
      case 'inky':
        this.defaultPosition = {
          top: scaledTileSize * 13.5,
          left: scaledTileSize * 11,
        };
        break;
      case 'clyde':
        this.defaultPosition = {
          top: scaledTileSize * 13.5,
          left: scaledTileSize * 15,
        };
        break;
      default:
        this.defaultPosition = {
          top: 0,
          left: 0,
        };
        break;
    }
    this.position = Object.assign({}, this.defaultPosition);
    this.oldPosition = Object.assign({}, this.position);
    this.animationTarget.style.top = `${this.position.top}px`;
    this.animationTarget.style.left = `${this.position.left}px`;
  }

  /**
   * Chooses a movement Spritesheet depending upon direction
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   */
  setSpriteSheet(name, direction, mode) {
    let emotion = '';
    if (this.defaultSpeed !== this.slowSpeed) {
      emotion = (this.defaultSpeed === this.mediumSpeed)
        ? '_annoyed' : '_angry';
    }

    if (mode === 'scared') {
      this.animationTarget.style.backgroundImage = 'url(app/style/graphics/'
        + `spriteSheets/characters/ghosts/scared_${this.scaredColor}.svg)`;
    } else if (mode === 'eyes') {
      this.animationTarget.style.backgroundImage = 'url(app/style/graphics/'
        + `spriteSheets/characters/ghosts/eyes_${direction}.svg)`;
    } else {
      this.animationTarget.style.backgroundImage = 'url(app/style/graphics/'
        + `spriteSheets/characters/ghosts/${name}/${name}_${direction}`
        + `${emotion}.svg)`;
    }
  }

  /**
   * Checks to see if the ghost is currently in the 'tunnels' on the outer edges of the maze
   * @param {({x: number, y: number})} gridPosition - The current x-y position on the 2D Maze Array
   * @returns {Boolean}
   */
  isInTunnel(gridPosition) {
    return (
      gridPosition.y === 14
      && (gridPosition.x < 6 || gridPosition.x > 21)
    );
  }

  /**
   * Checks to see if the ghost is currently in the 'Ghost House' in the center of the maze
   * @param {({x: number, y: number})} gridPosition - The current x-y position on the 2D Maze Array
   * @returns {Boolean}
   */
  isInGhostHouse(gridPosition) {
    return (
      (gridPosition.x > 9 && gridPosition.x < 18)
      && (gridPosition.y > 11 && gridPosition.y < 17)
    );
  }

  /**
   * Checks to see if the tile at the given coordinates of the Maze is an open position
   * @param {Array} mazeArray - 2D array representing the game board
   * @param {number} y - The target row
   * @param {number} x - The target column
   * @returns {(false | { x: number, y: number})} - x-y pair if the tile is free, false otherwise
   */
  getTile(mazeArray, y, x) {
    let tile = false;

    if (mazeArray[y] && mazeArray[y][x] && mazeArray[y][x] !== 'X') {
      tile = {
        x,
        y,
      };
    }

    return tile;
  }

  /**
   * Returns a list of all of the possible moves for the ghost to make on the next turn
   * @param {({x: number, y: number})} gridPosition - The current x-y position on the 2D Maze Array
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @param {Array} mazeArray - 2D array representing the game board
   * @returns {object}
   */
  determinePossibleMoves(gridPosition, direction, mazeArray) {
    const { x, y } = gridPosition;

    const possibleMoves = {
      up: this.getTile(mazeArray, y - 1, x),
      down: this.getTile(mazeArray, y + 1, x),
      left: this.getTile(mazeArray, y, x - 1),
      right: this.getTile(mazeArray, y, x + 1),
    };

    // Ghosts are not allowed to turn around at crossroads
    possibleMoves[this.characterUtil.getOppositeDirection(direction)] = false;

    Object.keys(possibleMoves).forEach((tile) => {
      if (possibleMoves[tile] === false) {
        delete possibleMoves[tile];
      }
    });

    return possibleMoves;
  }

  /**
   * Uses the Pythagorean Theorem to measure the distance between a given postion and Pacman
   * @param {({x: number, y: number})} position - An x-y position on the 2D Maze Array
   * @param {({x: number, y: number})} pacman - Pacman's current x-y position on the 2D Maze Array
   * @returns {number}
   */
  calculateDistance(position, pacman) {
    return Math.sqrt(
      ((position.x - pacman.x) ** 2) + ((position.y - pacman.y) ** 2),
    );
  }

  /**
   * Gets a position a number of spaces in front of Pacman's direction
   * @param {({x: number, y: number})} pacmanGridPosition
   * @param {number} spaces
   */
  getPositionInFrontOfPacman(pacmanGridPosition, spaces) {
    const target = Object.assign({}, pacmanGridPosition);
    const pacDirection = this.pacman.direction;
    const propToChange = (pacDirection === 'up' || pacDirection === 'down')
      ? 'y' : 'x';
    const tileOffset = (pacDirection === 'up' || pacDirection === 'left')
      ? (spaces * -1) : spaces;
    target[propToChange] += tileOffset;

    return target;
  }

  /**
   * Determines Pinky's target, which is four tiles in front of Pacman's direction
   * @param {({x: number, y: number})} pacmanGridPosition
   * @returns {({x: number, y: number})}
   */
  determinePinkyTarget(pacmanGridPosition) {
    return this.getPositionInFrontOfPacman(
      pacmanGridPosition, 4,
    );
  }

  /**
   * Determines Inky's target, which is a mirror image of Blinky's position
   * reflected across a point two tiles in front of Pacman's direction.
   * Example @ app\style\graphics\spriteSheets\references\inky_target.png
   * @param {({x: number, y: number})} pacmanGridPosition
   * @returns {({x: number, y: number})}
   */
  determineInkyTarget(pacmanGridPosition) {
    const blinkyGridPosition = this.characterUtil.determineGridPosition(
      this.blinky.position, this.scaledTileSize,
    );
    const pivotPoint = this.getPositionInFrontOfPacman(
      pacmanGridPosition, 2,
    );
    return {
      x: pivotPoint.x + (pivotPoint.x - blinkyGridPosition.x),
      y: pivotPoint.y + (pivotPoint.y - blinkyGridPosition.y),
    };
  }

  /**
   * Clyde targets Pacman when the two are far apart, but retreats to the
   * lower-left corner when the two are within eight tiles of each other
   * @param {({x: number, y: number})} gridPosition
   * @param {({x: number, y: number})} pacmanGridPosition
   * @returns {({x: number, y: number})}
   */
  determineClydeTarget(gridPosition, pacmanGridPosition) {
    const distance = this.calculateDistance(gridPosition, pacmanGridPosition);
    return (distance > 8) ? pacmanGridPosition : { x: 0, y: 30 };
  }

  /**
   * Determines the appropriate target for the ghost's AI
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   * @param {({x: number, y: number})} gridPosition - The current x-y position on the 2D Maze Array
   * @param {({x: number, y: number})} pacmanGridPosition - x-y position on the 2D Maze Array
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @returns {({x: number, y: number})}
   */
  getTarget(name, gridPosition, pacmanGridPosition, mode) {
    // Ghosts return to the ghost-house after eaten
    if (mode === 'eyes') {
      return { x: 13.5, y: 10 };
    }

    // Ghosts run from Pacman if scared
    if (mode === 'scared') {
      return pacmanGridPosition;
    }

    // Ghosts seek out corners in Scatter mode
    if (mode === 'scatter') {
      switch (name) {
        case 'blinky':
          // Blinky will chase Pacman, even in Scatter mode, if he's in Cruise Elroy form
          return (this.cruiseElroy ? pacmanGridPosition : { x: 27, y: 0 });
        case 'pinky':
          return { x: 0, y: 0 };
        case 'inky':
          return { x: 27, y: 30 };
        case 'clyde':
          return { x: 0, y: 30 };
        default:
          return { x: 0, y: 0 };
      }
    }

    switch (name) {
      // Blinky goes after Pacman's position
      case 'blinky':
        return pacmanGridPosition;
      case 'pinky':
        return this.determinePinkyTarget(pacmanGridPosition);
      case 'inky':
        return this.determineInkyTarget(pacmanGridPosition);
      case 'clyde':
        return this.determineClydeTarget(gridPosition, pacmanGridPosition);
      default:
        // TODO: Other ghosts
        return pacmanGridPosition;
    }
  }

  /**
   * Calls the appropriate function to determine the best move depending on the ghost's name
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   * @param {Object} possibleMoves - All of the moves the ghost could choose to make this turn
   * @param {({x: number, y: number})} gridPosition - The current x-y position on the 2D Maze Array
   * @param {({x: number, y: number})} pacmanGridPosition - x-y position on the 2D Maze Array
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @returns {('up'|'down'|'left'|'right')}
   */
  determineBestMove(
    name, possibleMoves, gridPosition, pacmanGridPosition, mode,
  ) {
    let bestDistance = (mode === 'scared') ? 0 : Infinity;
    let bestMove;
    const target = this.getTarget(name, gridPosition, pacmanGridPosition, mode);

    Object.keys(possibleMoves).forEach((move) => {
      const distance = this.calculateDistance(
        possibleMoves[move], target,
      );
      const betterMove = (mode === 'scared')
        ? (distance > bestDistance)
        : (distance < bestDistance);

      if (betterMove) {
        bestDistance = distance;
        bestMove = move;
      }
    });

    return bestMove;
  }

  /**
   * Determines the best direction for the ghost to travel in during the current frame
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   * @param {({x: number, y: number})} gridPosition - The current x-y position on the 2D Maze Array
   * @param {({x: number, y: number})} pacmanGridPosition - x-y position on the 2D Maze Array
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @param {Array} mazeArray - 2D array representing the game board
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @returns {('up'|'down'|'left'|'right')}
   */
  determineDirection(
    name, gridPosition, pacmanGridPosition, direction, mazeArray, mode,
  ) {
    let newDirection = direction;
    const possibleMoves = this.determinePossibleMoves(
      gridPosition, direction, mazeArray,
    );

    if (Object.keys(possibleMoves).length === 1) {
      [newDirection] = Object.keys(possibleMoves);
    } else if (Object.keys(possibleMoves).length > 1) {
      newDirection = this.determineBestMove(
        name, possibleMoves, gridPosition, pacmanGridPosition, mode,
      );
    }

    return newDirection;
  }

  /**
   * Handles movement for idle Ghosts in the Ghost House
   * @param {*} elapsedMs
   * @param {*} position
   * @param {*} velocity
   * @returns {({ top: number, left: number})}
   */
  handleIdleMovement(elapsedMs, position, velocity) {
    const newPosition = Object.assign({}, this.position);

    if (position.y <= 13.5) {
      this.direction = this.characterUtil.directions.down;
    } else if (position.y >= 14.5) {
      this.direction = this.characterUtil.directions.up;
    }

    if (this.idleMode === 'leaving') {
      if (position.x === 13.5 && (position.y > 10.8 && position.y < 11)) {
        this.idleMode = undefined;
        newPosition.top = this.scaledTileSize * 10.5;
        this.direction = this.characterUtil.directions.left;
        window.dispatchEvent(new Event('releaseGhost'));
      } else if (position.x > 13.4 && position.x < 13.6) {
        newPosition.left = this.scaledTileSize * 13;
        this.direction = this.characterUtil.directions.up;
      } else if (position.y > 13.9 && position.y < 14.1) {
        newPosition.top = this.scaledTileSize * 13.5;
        this.direction = (position.x < 13.5)
          ? this.characterUtil.directions.right
          : this.characterUtil.directions.left;
      }
    }

    newPosition[this.characterUtil.getPropertyToChange(this.direction)]
      += this.characterUtil.getVelocity(this.direction, velocity) * elapsedMs;

    return newPosition;
  }

  /**
   * Sets idleMode to 'leaving', allowing the ghost to leave the Ghost House
   */
  endIdleMode() {
    this.idleMode = 'leaving';
  }

  /**
   * Handle the ghost's movement when it is snapped to the x-y grid of the Maze Array
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   * @param {({x: number, y: number})} gridPosition - x-y position during the current frame
   * @param {number} velocity - The distance the character should travel in a single millisecond
   * @param {({x: number, y: number})} pacmanGridPosition - x-y position on the 2D Maze Array
   * @returns {({ top: number, left: number})}
   */
  handleSnappedMovement(elapsedMs, gridPosition, velocity, pacmanGridPosition) {
    const newPosition = Object.assign({}, this.position);

    this.direction = this.determineDirection(
      this.name, gridPosition, pacmanGridPosition, this.direction,
      this.mazeArray, this.mode,
    );
    newPosition[this.characterUtil.getPropertyToChange(this.direction)]
      += this.characterUtil.getVelocity(this.direction, velocity) * elapsedMs;

    return newPosition;
  }

  /**
   * Determines if an eaten ghost is at the entrance of the Ghost House
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @param {({x: number, y: number})} position - x-y position during the current frame
   * @returns {Boolean}
   */
  enteringGhostHouse(mode, position) {
    return (
      mode === 'eyes'
      && position.y === 11
      && (position.x > 13.4 && position.x < 13.6)
    );
  }

  /**
   * Determines if an eaten ghost has reached the center of the Ghost House
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @param {({x: number, y: number})} position - x-y position during the current frame
   * @returns {Boolean}
   */
  enteredGhostHouse(mode, position) {
    return (
      mode === 'eyes'
      && position.x === 13.5
      && (position.y > 13.8 && position.y < 14.2)
    );
  }

  /**
   * Determines if a restored ghost is at the exit of the Ghost House
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @param {({x: number, y: number})} position - x-y position during the current frame
   * @returns {Boolean}
   */
  leavingGhostHouse(mode, position) {
    return (
      mode !== 'eyes'
      && position.x === 13.5
      && (position.y > 10.8 && position.y < 11)
    );
  }

  /**
   * Handles entering and leaving the Ghost House after a ghost is eaten
   * @param {({x: number, y: number})} gridPosition - x-y position during the current frame
   * @returns {({x: number, y: number})}
   */
  handleGhostHouse(gridPosition) {
    const gridPositionCopy = Object.assign({}, gridPosition);

    if (this.enteringGhostHouse(this.mode, gridPosition)) {
      this.direction = this.characterUtil.directions.down;
      gridPositionCopy.x = 13.5;
      this.position = this.characterUtil.snapToGrid(
        gridPositionCopy, this.direction, this.scaledTileSize,
      );
    }

    if (this.enteredGhostHouse(this.mode, gridPosition)) {
      this.direction = this.characterUtil.directions.up;
      gridPositionCopy.y = 14;
      this.position = this.characterUtil.snapToGrid(
        gridPositionCopy, this.direction, this.scaledTileSize,
      );
      this.mode = this.defaultMode;
      window.dispatchEvent(new Event('restoreGhost'));
    }

    if (this.leavingGhostHouse(this.mode, gridPosition)) {
      gridPositionCopy.y = 11;
      this.position = this.characterUtil.snapToGrid(
        gridPositionCopy, this.direction, this.scaledTileSize,
      );
      this.direction = this.characterUtil.directions.left;
    }

    return gridPositionCopy;
  }

  /**
   * Handle the ghost's movement when it is inbetween tiles on the x-y grid of the Maze Array
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   * @param {({x: number, y: number})} gridPosition - x-y position during the current frame
   * @param {number} velocity - The distance the character should travel in a single millisecond
   * @returns {({ top: number, left: number})}
   */
  handleUnsnappedMovement(elapsedMs, gridPosition, velocity) {
    const gridPositionCopy = this.handleGhostHouse(gridPosition);

    const desired = this.characterUtil.determineNewPositions(
      this.position, this.direction, velocity, elapsedMs, this.scaledTileSize,
    );

    if (this.characterUtil.changingGridPosition(
      gridPositionCopy, desired.newGridPosition,
    )) {
      return this.characterUtil.snapToGrid(
        gridPositionCopy, this.direction, this.scaledTileSize,
      );
    }

    return desired.newPosition;
  }

  /**
   * Determines the new Ghost position
   * @param {number} elapsedMs
   * @returns {({ top: number, left: number})}
   */
  handleMovement(elapsedMs) {
    let newPosition;

    const gridPosition = this.characterUtil.determineGridPosition(
      this.position, this.scaledTileSize,
    );
    const pacmanGridPosition = this.characterUtil.determineGridPosition(
      this.pacman.position, this.scaledTileSize,
    );
    const velocity = this.determineVelocity(
      gridPosition, this.mode,
    );

    if (this.idleMode) {
      newPosition = this.handleIdleMovement(
        elapsedMs, gridPosition, velocity,
      );
    } else if (JSON.stringify(this.position) === JSON.stringify(
      this.characterUtil.snapToGrid(
        gridPosition, this.direction, this.scaledTileSize,
      ),
    )) {
      newPosition = this.handleSnappedMovement(
        elapsedMs, gridPosition, velocity, pacmanGridPosition,
      );
    } else {
      newPosition = this.handleUnsnappedMovement(
        elapsedMs, gridPosition, velocity,
      );
    }

    newPosition = this.characterUtil.handleWarp(
      newPosition, this.scaledTileSize, this.mazeArray,
    );

    this.checkCollision(gridPosition, pacmanGridPosition);

    return newPosition;
  }

  /**
   * Changes the defaultMode to chase or scatter, and turns the ghost around
   * if needed
   * @param {('chase'|'scatter')} newMode
   */
  changeMode(newMode) {
    this.defaultMode = newMode;

    const gridPosition = this.characterUtil.determineGridPosition(
      this.position, this.scaledTileSize,
    );

    if ((this.mode === 'chase' || this.mode === 'scatter')
      && !this.cruiseElroy) {
      this.mode = newMode;

      if (!this.isInGhostHouse(gridPosition)) {
        this.direction = this.characterUtil.getOppositeDirection(
          this.direction,
        );
      }
    }
  }

  /**
   * Toggles a scared ghost between blue and white, then updates its spritsheet
   */
  toggleScaredColor() {
    this.scaredColor = (this.scaredColor === 'blue')
      ? 'white' : 'blue';
    this.setSpriteSheet(this.name, this.direction, this.mode);
  }

  /**
   * Sets the ghost's mode to SCARED, turns the ghost around,
   * and changes spritesheets accordingly
   */
  becomeScared() {
    const gridPosition = this.characterUtil.determineGridPosition(
      this.position, this.scaledTileSize,
    );

    if (this.mode !== 'eyes') {
      if (!this.isInGhostHouse(gridPosition) && this.mode !== 'scared') {
        this.direction = this.characterUtil.getOppositeDirection(
          this.direction,
        );
      }
      this.mode = 'scared';
      this.scaredColor = 'blue';
      this.setSpriteSheet(this.name, this.direction, this.mode);
    }
  }

  /**
   * Returns the scared ghost to chase/scatter mode and sets its spritesheet
   */
  endScared() {
    this.mode = this.defaultMode;
    this.setSpriteSheet(this.name, this.direction, this.mode);
  }

  /**
   * Speeds up the ghost (used for Blinky as Pacdots are eaten)
   */
  speedUp() {
    this.cruiseElroy = true;

    if (this.defaultSpeed === this.slowSpeed) {
      this.defaultSpeed = this.mediumSpeed;
    } else if (this.defaultSpeed === this.mediumSpeed) {
      this.defaultSpeed = this.fastSpeed;
    }
  }

  /**
   * Resets defaultSpeed to slow and updates the spritesheet
   */
  resetDefaultSpeed() {
    this.defaultSpeed = this.slowSpeed;
    this.cruiseElroy = false;
    this.setSpriteSheet(this.name, this.direction, this.mode);
  }

  /**
   * Sets a flag to indicate when the ghost should pause its movement
   * @param {Boolean} newValue
   */
  pause(newValue) {
    this.paused = newValue;
  }

  /**
   * Checks if the ghost contacts Pacman - starts the death sequence if so
   * @param {({x: number, y: number})} position - An x-y position on the 2D Maze Array
   * @param {({x: number, y: number})} pacman - Pacman's current x-y position on the 2D Maze Array
   */
  checkCollision(position, pacman) {
    if (this.calculateDistance(position, pacman) < 1
      && this.mode !== 'eyes'
      && this.allowCollision) {
      if (this.mode === 'scared') {
        window.dispatchEvent(new CustomEvent('eatGhost', {
          detail: {
            ghost: this,
          },
        }));
        this.mode = 'eyes';
      } else {
        window.dispatchEvent(new Event('deathSequence'));
      }
    }
  }

  /**
   * Determines the appropriate speed for the ghost
   * @param {({x: number, y: number})} position - An x-y position on the 2D Maze Array
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @returns {number}
   */
  determineVelocity(position, mode) {
    if (mode === 'eyes') {
      return this.eyeSpeed;
    }

    if (this.paused) {
      return 0;
    }

    if (this.isInTunnel(position) || this.isInGhostHouse(position)) {
      return this.transitionSpeed;
    }

    if (mode === 'scared') {
      return this.scaredSpeed;
    }

    return this.defaultSpeed;
  }

  /**
   * Updates the css position, hides if there is a stutter, and animates the spritesheet
   * @param {number} interp - The animation accuracy as a percentage
   */
  draw(interp) {
    const newTop = this.characterUtil.calculateNewDrawValue(
      interp, 'top', this.oldPosition, this.position,
    );
    const newLeft = this.characterUtil.calculateNewDrawValue(
      interp, 'left', this.oldPosition, this.position,
    );
    this.animationTarget.style.top = `${newTop}px`;
    this.animationTarget.style.left = `${newLeft}px`;

    const shouldBeVisible = this.display && this.characterUtil.checkForStutter(this.position, this.oldPosition) === 'visible';
    
    if (shouldBeVisible) {
      this.animationTarget.classList.remove('character-hidden');
      this.animationTarget.classList.add('character-visible');
    } else {
      this.animationTarget.classList.remove('character-visible');
      this.animationTarget.classList.add('character-hidden');
    }

    const updatedProperties = this.characterUtil.advanceSpriteSheet(this);
    this.msSinceLastSprite = updatedProperties.msSinceLastSprite;
    this.animationTarget = updatedProperties.animationTarget;
    this.backgroundOffsetPixels = updatedProperties.backgroundOffsetPixels;
  }

  /**
   * Handles movement logic for the ghost
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   */
  update(elapsedMs) {
    this.oldPosition = Object.assign({}, this.position);

    if (this.moving) {
      this.position = this.handleMovement(elapsedMs);
      this.setSpriteSheet(this.name, this.direction, this.mode);
      this.msSinceLastSprite += elapsedMs;
    }
  }
}


class Pacman {
  constructor(scaledTileSize, mazeArray, characterUtil) {
    this.scaledTileSize = scaledTileSize;
    this.mazeArray = mazeArray;
    this.characterUtil = characterUtil;
    this.animationTarget = document.getElementById('pacman');
    this.pacmanArrow = document.getElementById('pacman-arrow');

    this.reset();
  }

  /**
   * Rests the character to its default state
   */
  reset() {
    this.setMovementStats(this.scaledTileSize);
    this.setSpriteAnimationStats();
    this.setStyleMeasurements(this.scaledTileSize, this.spriteFrames);
    this.setDefaultPosition(this.scaledTileSize);
    this.setSpriteSheet(this.direction);
    this.pacmanArrow.style.backgroundImage = 'url(app/style/graphics/'
      + `spriteSheets/characters/pacman/arrow_${this.direction}.svg)`;
  }

  /**
   * Sets various properties related to Pacman's movement
   * @param {number} scaledTileSize - The dimensions of a single tile
   */
  setMovementStats(scaledTileSize) {
    this.velocityPerMs = this.calculateVelocityPerMs(scaledTileSize);
    this.desiredDirection = this.characterUtil.directions.left;
    this.direction = this.characterUtil.directions.left;
    this.moving = false;
  }

  /**
   * Sets values pertaining to Pacman's spritesheet animation
   */
  setSpriteAnimationStats() {
    this.specialAnimation = false;
    this.display = true;
    this.animate = true;
    this.loopAnimation = true;
    this.msBetweenSprites = 50;
    this.msSinceLastSprite = 0;
    this.spriteFrames = 4;
    this.backgroundOffsetPixels = 0;
    this.animationTarget.classList.add('pacman-character');
    this.pacmanArrow.classList.add('pacman-arrow');
  }

  /**
   * Sets css property values for Pacman and Pacman's Arrow
   * @param {number} scaledTileSize - The dimensions of a single tile
   * @param {number} spriteFrames - The number of frames in Pacman's spritesheet
   */
  setStyleMeasurements(scaledTileSize, spriteFrames) {
    this.measurement = scaledTileSize * 2;

    this.animationTarget.style.height = `${this.measurement}px`;
    this.animationTarget.style.width = `${this.measurement}px`;
    this.animationTarget.style.backgroundSize = `${
      this.measurement * spriteFrames
    }px`;

    this.pacmanArrow.style.height = `${this.measurement * 2}px`;
    this.pacmanArrow.style.width = `${this.measurement * 2}px`;
    this.pacmanArrow.style.backgroundSize = `${this.measurement * 2}px`;
  }

  /**
   * Sets the default position and direction for Pacman at the game's start
   * @param {number} scaledTileSize - The dimensions of a single tile
   */
  setDefaultPosition(scaledTileSize) {
    this.defaultPosition = {
      top: scaledTileSize * 22.5,
      left: scaledTileSize * 13,
    };
    this.position = Object.assign({}, this.defaultPosition);
    this.oldPosition = Object.assign({}, this.position);
    this.animationTarget.style.top = `${this.position.top}px`;
    this.animationTarget.style.left = `${this.position.left}px`;
  }

  /**
   * Calculates how fast Pacman should move in a millisecond
   * @param {number} scaledTileSize - The dimensions of a single tile
   */
  calculateVelocityPerMs(scaledTileSize) {
    // In the original game, Pacman moved at 11 tiles per second.
    const velocityPerSecond = scaledTileSize * 11;
    return velocityPerSecond / 1000;
  }

  /**
   * Chooses a movement Spritesheet depending upon direction
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   */
  setSpriteSheet(direction) {
    this.animationTarget.style.backgroundImage = 'url(app/style/graphics/'
      + `spriteSheets/characters/pacman/pacman_${direction}.svg)`;
  }

  prepDeathAnimation() {
    this.loopAnimation = false;
    this.msBetweenSprites = 125;
    this.spriteFrames = 12;
    this.specialAnimation = true;
    this.backgroundOffsetPixels = 0;
    const bgSize = this.measurement * this.spriteFrames;
    this.animationTarget.style.backgroundSize = `${bgSize}px`;
    this.animationTarget.style.backgroundImage = 'url(app/style/'
      + 'graphics/spriteSheets/characters/pacman/pacman_death.svg)';
    this.animationTarget.style.backgroundPosition = '0px 0px';
    this.pacmanArrow.style.backgroundImage = '';
  }

  /**
   * Changes Pacman's desiredDirection, updates the PacmanArrow sprite, and sets moving to true
   * @param {Event} e - The keydown event to evaluate
   * @param {Boolean} startMoving - If true, Pacman will move upon key press
   */
  changeDirection(newDirection, startMoving) {
    this.desiredDirection = newDirection;
    this.pacmanArrow.style.backgroundImage = 'url(app/style/graphics/'
      + `spriteSheets/characters/pacman/arrow_${this.desiredDirection}.svg)`;

    if (startMoving) {
      this.moving = true;
    }
  }

  /**
   * Updates the position of the leading arrow in front of Pacman
   * @param {({top: number, left: number})} position - Pacman's position during the current frame
   * @param {number} scaledTileSize - The dimensions of a single tile
   */
  updatePacmanArrowPosition(position, scaledTileSize) {
    this.pacmanArrow.style.top = `${position.top - scaledTileSize}px`;
    this.pacmanArrow.style.left = `${position.left - scaledTileSize}px`;
  }

  /**
   * Handle Pacman's movement when he is snapped to the x-y grid of the Maze Array
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   * @returns {({ top: number, left: number})}
   */
  handleSnappedMovement(elapsedMs) {
    const desired = this.characterUtil.determineNewPositions(
      this.position, this.desiredDirection, this.velocityPerMs,
      elapsedMs, this.scaledTileSize,
    );
    const alternate = this.characterUtil.determineNewPositions(
      this.position, this.direction, this.velocityPerMs,
      elapsedMs, this.scaledTileSize,
    );

    if (this.characterUtil.checkForWallCollision(
      desired.newGridPosition, this.mazeArray, this.desiredDirection,
    )) {
      if (this.characterUtil.checkForWallCollision(
        alternate.newGridPosition, this.mazeArray, this.direction,
      )) {
        this.moving = false;
        return this.position;
      }
      return alternate.newPosition;
    }
    this.direction = this.desiredDirection;
    this.setSpriteSheet(this.direction);
    return desired.newPosition;
  }

  /**
   * Handle Pacman's movement when he is inbetween tiles on the x-y grid of the Maze Array
   * @param {({x: number, y: number})} gridPosition - x-y position during the current frame
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   * @returns {({ top: number, left: number})}
   */
  handleUnsnappedMovement(gridPosition, elapsedMs) {
    const desired = this.characterUtil.determineNewPositions(
      this.position, this.desiredDirection, this.velocityPerMs,
      elapsedMs, this.scaledTileSize,
    );
    const alternate = this.characterUtil.determineNewPositions(
      this.position, this.direction, this.velocityPerMs,
      elapsedMs, this.scaledTileSize,
    );

    if (this.characterUtil.turningAround(
      this.direction, this.desiredDirection,
    )) {
      this.direction = this.desiredDirection;
      this.setSpriteSheet(this.direction);
      return desired.newPosition;
    } if (this.characterUtil.changingGridPosition(
      gridPosition, alternate.newGridPosition,
    )) {
      return this.characterUtil.snapToGrid(
        gridPosition, this.direction, this.scaledTileSize,
      );
    }
    return alternate.newPosition;
  }

  /**
   * Updates the css position, hides if there is a stutter, and animates the spritesheet
   * @param {number} interp - The animation accuracy as a percentage
   */
  draw(interp) {
    const newTop = this.characterUtil.calculateNewDrawValue(
      interp, 'top', this.oldPosition, this.position,
    );
    const newLeft = this.characterUtil.calculateNewDrawValue(
      interp, 'left', this.oldPosition, this.position,
    );
    this.animationTarget.style.top = `${newTop}px`;
    this.animationTarget.style.left = `${newLeft}px`;

    const shouldBeVisible = this.display && this.characterUtil.checkForStutter(this.position, this.oldPosition) === 'visible';
    
    if (shouldBeVisible) {
      this.animationTarget.classList.remove('character-hidden');
      this.animationTarget.classList.add('character-visible');
      this.pacmanArrow.classList.remove('character-hidden');
      this.pacmanArrow.classList.add('character-visible');
    } else {
      this.animationTarget.classList.remove('character-visible');
      this.animationTarget.classList.add('character-hidden');
      this.pacmanArrow.classList.remove('character-visible');
      this.pacmanArrow.classList.add('character-hidden');
    }

    this.updatePacmanArrowPosition(this.position, this.scaledTileSize);

    const updatedProperties = this.characterUtil.advanceSpriteSheet(this);
    this.msSinceLastSprite = updatedProperties.msSinceLastSprite;
    this.animationTarget = updatedProperties.animationTarget;
    this.backgroundOffsetPixels = updatedProperties.backgroundOffsetPixels;
  }

  /**
   * Handles movement logic for Pacman
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   */
  update(elapsedMs) {
    this.oldPosition = Object.assign({}, this.position);

    if (this.moving) {
      const gridPosition = this.characterUtil.determineGridPosition(
        this.position, this.scaledTileSize,
      );

      if (JSON.stringify(this.position) === JSON.stringify(
        this.characterUtil.snapToGrid(
          gridPosition, this.direction, this.scaledTileSize,
        ),
      )) {
        this.position = this.handleSnappedMovement(elapsedMs);
      } else {
        this.position = this.handleUnsnappedMovement(gridPosition, elapsedMs);
      }

      this.position = this.characterUtil.handleWarp(
        this.position, this.scaledTileSize, this.mazeArray,
      );
    }

    if (this.moving || this.specialAnimation) {
      this.msSinceLastSprite += elapsedMs;
    }
  }
}


class GameCoordinator {
  constructor() {
    this.gameUi = document.getElementById('game-ui');
    this.rowTop = document.getElementById('row-top');
    this.mazeDiv = document.getElementById('maze');
    this.mazeImg = document.getElementById('maze-img');
    this.mazeCover = document.getElementById('maze-cover');
    this.pointsDisplay = document.getElementById('points-display');
    this.highScoreDisplay = document.getElementById('high-score-display');
    this.extraLivesDisplay = document.getElementById('extra-lives');
    this.fruitDisplay = document.getElementById('fruit-display');
    this.mainMenu = document.getElementById('main-menu-container');
    this.gameStartButton = document.getElementById('game-start');
    this.pauseButton = document.getElementById('pause-button');
    this.soundButton = document.getElementById('sound-button');
    this.leftCover = document.getElementById('left-cover');
    this.rightCover = document.getElementById('right-cover');
    this.pausedText = document.getElementById('paused-text');
    this.bottomRow = document.getElementById('bottom-row');
    this.leaderboard = new Leaderboard();
    // this.leaderboardUI = new LeaderboardUI(this.leaderboard, this);
    this.leaderboardUI = new PageRightLeaderboardUI(this.leaderboard, this);

    this.mazeArray = [
      ['XXXXXXXXXXXXXXXXXXXXXXXXXXXX'],
      ['XooooooooooooXXooooooooooooX'],
      ['XoXXXXoXXXXXoXXoXXXXXoXXXXoX'],
      ['XOXXXXoXXXXXoXXoXXXXXoXXXXOX'],
      ['XoXXXXoXXXXXoXXoXXXXXoXXXXoX'],
      ['XooooooooooooooooooooooooooX'],
      ['XoXXXXoXXoXXXXXXXXoXXoXXXXoX'],
      ['XoXXXXoXXoXXXXXXXXoXXoXXXXoX'],
      ['XooooooXXooooXXooooXXooooooX'],
      ['XXXXXXoXXXXX XX XXXXXoXXXXXX'],
      ['XXXXXXoXXXXX XX XXXXXoXXXXXX'],
      ['XXXXXXoXX          XXoXXXXXX'],
      ['XXXXXXoXX XXXXXXXX XXoXXXXXX'],
      ['XXXXXXoXX X      X XXoXXXXXX'],
      ['      o   X      X   o      '],
      ['XXXXXXoXX X      X XXoXXXXXX'],
      ['XXXXXXoXX XXXXXXXX XXoXXXXXX'],
      ['XXXXXXoXX          XXoXXXXXX'],
      ['XXXXXXoXX XXXXXXXX XXoXXXXXX'],
      ['XXXXXXoXX XXXXXXXX XXoXXXXXX'],
      ['XooooooooooooXXooooooooooooX'],
      ['XoXXXXoXXXXXoXXoXXXXXoXXXXoX'],
      ['XoXXXXoXXXXXoXXoXXXXXoXXXXoX'],
      ['XOooXXooooooo  oooooooXXooOX'],
      ['XXXoXXoXXoXXXXXXXXoXXoXXoXXX'],
      ['XXXoXXoXXoXXXXXXXXoXXoXXoXXX'],
      ['XooooooXXooooXXooooXXooooooX'],
      ['XoXXXXXXXXXXoXXoXXXXXXXXXXoX'],
      ['XoXXXXXXXXXXoXXoXXXXXXXXXXoX'],
      ['XooooooooooooooooooooooooooX'],
      ['XXXXXXXXXXXXXXXXXXXXXXXXXXXX']
    ];

    this.maxFps = 120;
    this.tileSize = 8;
    this.scale = this.determineScale(1);
    this.scaledTileSize = this.tileSize * this.scale;
    this.firstGame = true;

    this.movementKeys = {
      // WASD
      87: 'up',
      83: 'down',
      65: 'left',
      68: 'right',

      // Arrow Keys
      38: 'up',
      40: 'down',
      37: 'left',
      39: 'right'
    };

    // Mobile touch trackers
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;

    this.fruitPoints = {
      1: 100,
      2: 300,
      3: 500,
      4: 700,
      5: 1000,
      6: 2000,
      7: 3000,
      8: 5000
    };

    this.mazeArray.forEach((row, rowIndex) => {
      this.mazeArray[rowIndex] = row[0].split('');
    });

    this.gameStartButton.addEventListener('click', this.startButtonClick.bind(this));
    this.pauseButton.addEventListener('click', this.handlePauseKey.bind(this));
    this.soundButton.addEventListener('click', this.soundButtonClick.bind(this));

    const head = document.getElementsByTagName('head')[0];
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'build/app.css';

    link.onload = this.preloadAssets.bind(this);

    head.appendChild(link);
  }

  /**
   * Recursive method which determines the largest possible scale the game's graphics can use
   * @param {Number} scale
   */
  determineScale(scale) {
    const availableScreenHeight = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    const availableScreenWidth = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    const scaledTileSize = this.tileSize * scale;

    // The original Pac-Man game leaves 5 tiles of height (3 above, 2 below) surrounding the
    // maze for the UI. See app\style\graphics\spriteSheets\references\mazeGridSystemReference.png
    // for reference.
    const mazeTileHeight = this.mazeArray.length + 5;
    const mazeTileWidth = this.mazeArray[0][0].split('').length;

    if (scaledTileSize * mazeTileHeight < availableScreenHeight && scaledTileSize * mazeTileWidth < availableScreenWidth) {
      return this.determineScale(scale + 1);
    }

    return scale - 1;
  }

  /**
   * Reveals the game underneath the loading covers and starts gameplay
   */
  startButtonClick() {
    this.leftCover.classList.add('cover-left-hidden');
    this.rightCover.classList.add('cover-right-hidden');
    this.mainMenu.classList.add('loading-opacity-fade');
    this.gameStartButton.disabled = true;

    setTimeout(() => {
      this.mainMenu.classList.add('main-menu-hidden');
      this.mainMenu.classList.remove('main-menu-visible');
    }, 1000);

    this.reset();
    if (this.firstGame) {
      this.firstGame = false;
      this.init();
    }
    this.startGameplay(true);
  }

  /**
   * Toggles the master volume for the soundManager, and saves the preference to storage
   */
  soundButtonClick() {
    const newVolume = this.soundManager.masterVolume === 1 ? 0 : 1;
    this.soundManager.setMasterVolume(newVolume);
    localStorage.setItem('volumePreference', newVolume);
    this.setSoundButtonIcon(newVolume);
  }

  /**
   * Sets the icon for the sound button
   */
  setSoundButtonIcon(newVolume) {
    this.soundButton.innerHTML = newVolume === 0 ? 'volume_off' : 'volume_up';
  }

  /**
   * Displays an error message in the event assets are unable to download
   */
  displayErrorMessage() {
    const loadingContainer = document.getElementById('loading-container');
    const errorMessage = document.getElementById('error-message');
    loadingContainer.classList.add('loading-opacity-fade');
    setTimeout(() => {
      loadingContainer.remove();
      errorMessage.classList.add('error-message-visible');
    }, 1500);
  }

  /**
   * Load all assets into a hidden Div to pre-load them into memory.
   * There is probably a better way to read all of these file names.
   */
  preloadAssets() {
    return new Promise((resolve) => {
      const loadingContainer = document.getElementById('loading-container');
      const loadingPacman = document.getElementById('loading-pacman');
      const loadingDotMask = document.getElementById('loading-dot-mask');

      const imgBase = 'app/style/graphics/spriteSheets/';
      const imgSources = [
        // Pacman
        `${imgBase}characters/pacman/arrow_down.svg`,
        `${imgBase}characters/pacman/arrow_left.svg`,
        `${imgBase}characters/pacman/arrow_right.svg`,
        `${imgBase}characters/pacman/arrow_up.svg`,
        `${imgBase}characters/pacman/pacman_death.svg`,
        `${imgBase}characters/pacman/pacman_error.svg`,
        `${imgBase}characters/pacman/pacman_down.svg`,
        `${imgBase}characters/pacman/pacman_left.svg`,
        `${imgBase}characters/pacman/pacman_right.svg`,
        `${imgBase}characters/pacman/pacman_up.svg`,

        // Blinky
        `${imgBase}characters/ghosts/blinky/blinky_down_angry.svg`,
        `${imgBase}characters/ghosts/blinky/blinky_down_annoyed.svg`,
        `${imgBase}characters/ghosts/blinky/blinky_down.svg`,
        `${imgBase}characters/ghosts/blinky/blinky_left_angry.svg`,
        `${imgBase}characters/ghosts/blinky/blinky_left_annoyed.svg`,
        `${imgBase}characters/ghosts/blinky/blinky_left.svg`,
        `${imgBase}characters/ghosts/blinky/blinky_right_angry.svg`,
        `${imgBase}characters/ghosts/blinky/blinky_right_annoyed.svg`,
        `${imgBase}characters/ghosts/blinky/blinky_right.svg`,
        `${imgBase}characters/ghosts/blinky/blinky_up_angry.svg`,
        `${imgBase}characters/ghosts/blinky/blinky_up_annoyed.svg`,
        `${imgBase}characters/ghosts/blinky/blinky_up.svg`,

        // Clyde
        `${imgBase}characters/ghosts/clyde/clyde_down.svg`,
        `${imgBase}characters/ghosts/clyde/clyde_left.svg`,
        `${imgBase}characters/ghosts/clyde/clyde_right.svg`,
        `${imgBase}characters/ghosts/clyde/clyde_up.svg`,

        // Inky
        `${imgBase}characters/ghosts/inky/inky_down.svg`,
        `${imgBase}characters/ghosts/inky/inky_left.svg`,
        `${imgBase}characters/ghosts/inky/inky_right.svg`,
        `${imgBase}characters/ghosts/inky/inky_up.svg`,

        // Pinky
        `${imgBase}characters/ghosts/pinky/pinky_down.svg`,
        `${imgBase}characters/ghosts/pinky/pinky_left.svg`,
        `${imgBase}characters/ghosts/pinky/pinky_right.svg`,
        `${imgBase}characters/ghosts/pinky/pinky_up.svg`,

        // Ghosts Common
        `${imgBase}characters/ghosts/eyes_down.svg`,
        `${imgBase}characters/ghosts/eyes_left.svg`,
        `${imgBase}characters/ghosts/eyes_right.svg`,
        `${imgBase}characters/ghosts/eyes_up.svg`,
        `${imgBase}characters/ghosts/scared_blue.svg`,
        `${imgBase}characters/ghosts/scared_white.svg`,

        // Dots
        `${imgBase}pickups/pacdot.svg`,
        `${imgBase}pickups/powerPellet.svg`,

        // Fruit
        `${imgBase}pickups/apple.svg`,
        `${imgBase}pickups/bell.svg`,
        `${imgBase}pickups/cherry.svg`,
        `${imgBase}pickups/galaxian.svg`,
        `${imgBase}pickups/key.svg`,
        `${imgBase}pickups/melon.svg`,
        `${imgBase}pickups/orange.svg`,
        `${imgBase}pickups/strawberry.svg`,

        // Text
        `${imgBase}text/ready.svg`,

        // Points
        `${imgBase}text/100.svg`,
        `${imgBase}text/200.svg`,
        `${imgBase}text/300.svg`,
        `${imgBase}text/400.svg`,
        `${imgBase}text/500.svg`,
        `${imgBase}text/700.svg`,
        `${imgBase}text/800.svg`,
        `${imgBase}text/1000.svg`,
        `${imgBase}text/1600.svg`,
        `${imgBase}text/2000.svg`,
        `${imgBase}text/3000.svg`,
        `${imgBase}text/5000.svg`,

        // Maze
        `${imgBase}maze/maze_blue.svg`,

        // Misc
        'app/style/graphics/extra_life.svg'
      ];

      const audioBase = 'app/style/audio/';
      const audioSources = [
        `${audioBase}game_start.mp3`,
        `${audioBase}pause.mp3`,
        `${audioBase}pause_beat.mp3`,
        `${audioBase}siren_1.mp3`,
        `${audioBase}siren_2.mp3`,
        `${audioBase}siren_3.mp3`,
        `${audioBase}power_up.mp3`,
        `${audioBase}extra_life.mp3`,
        `${audioBase}eyes.mp3`,
        `${audioBase}eat_ghost.mp3`,
        `${audioBase}death.mp3`,
        `${audioBase}fruit.mp3`,
        `${audioBase}dot_1.mp3`,
        `${audioBase}dot_2.mp3`
      ];

      const totalSources = imgSources.length + audioSources.length;
      this.remainingSources = totalSources;

      loadingPacman.style.left = '0';
      loadingDotMask.style.width = '0';

      Promise.all([this.createElements(imgSources, 'img', totalSources, this), this.createElements(audioSources, 'audio', totalSources, this)])
        .then(() => {
          loadingContainer.classList.add('loading-opacity-fade');
          resolve();

          setTimeout(() => {
            loadingContainer.remove();
            this.mainMenu.classList.add('main-menu-visible');
            this.mainMenu.classList.remove('main-menu-hidden');
          }, 1500);
        })
        .catch(this.displayErrorMessage);
    });
  }

  /**
   * Iterates through a list of sources and updates the loading bar as the assets load in
   * @param {String[]} sources
   * @param {('img'|'audio')} type
   * @param {Number} totalSources
   * @param {Object} gameCoord
   * @returns {Promise}
   */
  createElements(sources, type, totalSources, gameCoord) {
    const loadingContainer = document.getElementById('loading-container');
    const preloadDiv = document.getElementById('preload-div');
    const loadingPacman = document.getElementById('loading-pacman');
    const containerWidth = loadingContainer.scrollWidth - loadingPacman.scrollWidth;
    const loadingDotMask = document.getElementById('loading-dot-mask');

    const gameCoordRef = gameCoord;

    return new Promise((resolve, reject) => {
      let loadedSources = 0;

      sources.forEach((source) => {
        const element = type === 'img' ? new Image() : new Audio();
        preloadDiv.appendChild(element);

        const elementReady = () => {
          gameCoordRef.remainingSources -= 1;
          loadedSources += 1;
          const percent = 1 - gameCoordRef.remainingSources / totalSources;
          loadingPacman.style.left = `${percent * containerWidth}px`;
          loadingDotMask.style.width = loadingPacman.style.left;

          if (loadedSources === sources.length) {
            resolve();
          }
        };

        if (type === 'img') {
          element.onload = elementReady;
          element.onerror = reject;
        } else {
          element.addEventListener('canplaythrough', elementReady);
          element.onerror = reject;
        }

        element.src = source;

        if (type === 'audio') {
          element.load();
        }
      });
    });
  }

  /**
   * Resets gameCoordinator values to their default states
   */
  reset() {
    this.activeTimers = [];
    this.points = 0;
    this.level = 1;
    this.lives = 2;
    this.extraLifeGiven = false;
    this.remainingDots = 0;
    this.allowKeyPresses = true;
    this.allowPacmanMovement = false;
    this.allowPause = false;
    this.cutscene = true;

    // Initialize high score from leaderboard instead of localStorage
    this.highScore = this.leaderboard.getHighScore();

    if (this.firstGame) {
      setInterval(() => {
        this.collisionDetectionLoop();
      }, 500);

      this.pacman = new Pacman(this.scaledTileSize, this.mazeArray, new CharacterUtil(this.scaledTileSize));
      this.blinky = new Ghost(this.scaledTileSize, this.mazeArray, this.pacman, 'blinky', this.level, new CharacterUtil(this.scaledTileSize));
      this.pinky = new Ghost(this.scaledTileSize, this.mazeArray, this.pacman, 'pinky', this.level, new CharacterUtil(this.scaledTileSize));
      this.inky = new Ghost(this.scaledTileSize, this.mazeArray, this.pacman, 'inky', this.level, new CharacterUtil(this.scaledTileSize), this.blinky);
      this.clyde = new Ghost(this.scaledTileSize, this.mazeArray, this.pacman, 'clyde', this.level, new CharacterUtil(this.scaledTileSize));
      this.fruit = new Pickup('fruit', this.scaledTileSize, 13.5, 17, this.pacman, this.mazeDiv, 100);
    }

    this.entityList = [this.pacman, this.blinky, this.pinky, this.inky, this.clyde, this.fruit];

    this.ghosts = [this.blinky, this.pinky, this.inky, this.clyde];

    this.scaredGhosts = [];
    this.eyeGhosts = 0;

    if (this.firstGame) {
      this.drawMaze(this.mazeArray, this.entityList);
      this.soundManager = new SoundManager();
      this.setUiDimensions();
    } else {
      this.pacman.reset();
      this.ghosts.forEach((ghost) => {
        ghost.reset(true);
      });
      this.pickups.forEach((pickup) => {
        if (pickup.type !== 'fruit') {
          this.remainingDots += 1;
          pickup.reset();
          this.entityList.push(pickup);
        }
      });
    }

    this.pointsDisplay.innerHTML = '00';
    this.highScoreDisplay.innerHTML = this.highScore || '00';
    this.clearDisplay(this.fruitDisplay);

    const volumePreference = parseInt(localStorage.getItem('volumePreference') || 1, 10);
    this.setSoundButtonIcon(volumePreference);
    this.soundManager.setMasterVolume(volumePreference);
  }

  /**
   * Calls necessary setup functions to start the game
   */
  init() {
    this.registerEventListeners();
    this.registerTouchListeners();

    this.gameEngine = new GameEngine(this.maxFps, this.entityList);
    this.gameEngine.start();
  }

  /**
   * Adds HTML elements to draw on the webpage by iterating through the 2D maze array
   * @param {Array} mazeArray - 2D array representing the game board
   * @param {Array} entityList - List of entities to be used throughout the game
   */
  drawMaze(mazeArray, entityList) {
    this.pickups = [this.fruit];

    this.mazeDiv.style.height = `${this.scaledTileSize * 31}px`;
    this.mazeDiv.style.width = `${this.scaledTileSize * 28}px`;
    this.gameUi.style.width = `${this.scaledTileSize * 28}px`;
    this.bottomRow.style.minHeight = `${this.scaledTileSize * 2}px`;
    this.dotContainer = document.getElementById('dot-container');

    mazeArray.forEach((row, rowIndex) => {
      row.forEach((block, columnIndex) => {
        if (block === 'o' || block === 'O') {
          const type = block === 'o' ? 'pacdot' : 'powerPellet';
          const points = block === 'o' ? 10 : 50;
          const dot = new Pickup(type, this.scaledTileSize, columnIndex, rowIndex, this.pacman, this.dotContainer, points);

          entityList.push(dot);
          this.pickups.push(dot);
          this.remainingDots += 1;
        }
      });
    });
  }

  setUiDimensions() {
    this.gameUi.style.fontSize = `${this.scaledTileSize}px`;
    this.rowTop.style.marginBottom = `${this.scaledTileSize}px`;
  }

  /**
   * Loop which periodically checks which pickups are nearby Pacman.
   * Pickups which are far away will not be considered for collision detection.
   */
  collisionDetectionLoop() {
    if (this.pacman.position) {
      const maxDistance = this.pacman.velocityPerMs * 750;
      const pacmanCenter = {
        x: this.pacman.position.left + this.scaledTileSize,
        y: this.pacman.position.top + this.scaledTileSize
      };

      // Set this flag to TRUE to see how two-phase collision detection works!
      const debugging = false;

      this.pickups.forEach((pickup) => {
        pickup.checkPacmanProximity(maxDistance, pacmanCenter, debugging);
      });
    }
  }

  /**
   * Displays "Ready!" and allows Pacman to move after a brief delay
   * @param {Boolean} initialStart - Special condition for the game's beginning
   */
  startGameplay(initialStart) {
    if (initialStart) {
      this.soundManager.play('game_start');
    }

    this.scaredGhosts = [];
    this.eyeGhosts = 0;
    this.allowPacmanMovement = false;

    const left = this.scaledTileSize * 11;
    const top = this.scaledTileSize * 16.5;
    const duration = initialStart ? 4500 : 2000;
    const width = this.scaledTileSize * 6;
    const height = this.scaledTileSize * 2;

    this.displayText({ left, top }, 'ready', duration, width, height);
    this.updateExtraLivesDisplay();

    new Timer(() => {
      this.allowPause = true;
      this.cutscene = false;
      this.soundManager.setCutscene(this.cutscene);
      this.soundManager.setAmbience(this.determineSiren(this.remainingDots));

      this.allowPacmanMovement = true;
      this.pacman.moving = true;

      this.ghosts.forEach((ghost) => {
        const ghostRef = ghost;
        ghostRef.moving = true;
      });

      this.ghostCycle('scatter');

      this.idleGhosts = [this.pinky, this.inky, this.clyde];
      this.releaseGhost();
    }, duration);
  }

  /**
   * Clears out all children nodes from a given display element
   * @param {String} display
   */
  clearDisplay(display) {
    while (display.firstChild) {
      display.removeChild(display.firstChild);
    }
  }

  /**
   * Displays extra life images equal to the number of remaining lives
   */
  updateExtraLivesDisplay() {
    this.clearDisplay(this.extraLivesDisplay);

    for (let i = 0; i < this.lives; i += 1) {
      const extraLifePic = document.createElement('img');
      extraLifePic.setAttribute('src', 'app/style/graphics/extra_life.svg');
      extraLifePic.style.height = `${this.scaledTileSize * 2}px`;
      this.extraLivesDisplay.appendChild(extraLifePic);
    }
  }

  /**
   * Displays a rolling log of the seven most-recently eaten fruit
   * @param {String} rawImageSource
   */
  updateFruitDisplay(rawImageSource) {
    const parsedSource = rawImageSource.slice(rawImageSource.indexOf('(') + 1, rawImageSource.indexOf(')'));

    if (this.fruitDisplay.children.length === 7) {
      this.fruitDisplay.removeChild(this.fruitDisplay.firstChild);
    }

    const fruitPic = document.createElement('img');
    fruitPic.setAttribute('src', parsedSource);
    fruitPic.style.height = `${this.scaledTileSize * 2}px`;
    this.fruitDisplay.appendChild(fruitPic);
  }

  /**
   * Cycles the ghosts between 'chase' and 'scatter' mode
   * @param {('chase'|'scatter')} mode
   */
  ghostCycle(mode) {
    const delay = mode === 'scatter' ? 7000 : 20000;
    const nextMode = mode === 'scatter' ? 'chase' : 'scatter';

    this.ghostCycleTimer = new Timer(() => {
      this.ghosts.forEach((ghost) => {
        ghost.changeMode(nextMode);
      });

      this.ghostCycle(nextMode);
    }, delay);
  }

  /**
   * Releases a ghost from the Ghost House after a delay
   */
  releaseGhost() {
    if (this.idleGhosts.length > 0) {
      const delay = Math.max((8 - (this.level - 1) * 4) * 1000, 0);

      this.endIdleTimer = new Timer(() => {
        this.idleGhosts[0].endIdleMode();
        this.idleGhosts.shift();
      }, delay);
    }
  }

  /**
   * Register listeners for various game sequences
   */
  registerEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('swipe', this.handleSwipe.bind(this));
    window.addEventListener('awardPoints', this.awardPoints.bind(this));
    window.addEventListener('deathSequence', this.deathSequence.bind(this));
    window.addEventListener('dotEaten', this.dotEaten.bind(this));
    window.addEventListener('powerUp', this.powerUp.bind(this));
    window.addEventListener('eatGhost', this.eatGhost.bind(this));
    window.addEventListener('restoreGhost', this.restoreGhost.bind(this));
    window.addEventListener('addTimer', this.addTimer.bind(this));
    window.addEventListener('removeTimer', this.removeTimer.bind(this));
    window.addEventListener('releaseGhost', this.releaseGhost.bind(this));
  }

  /**
   * Register listeners for touchstart and touchend to handle mobile device swipes
   */
  registerTouchListeners() {
    document.addEventListener('touchstart', this.handleTouchStart.bind(this));
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  /**
   * Sets touch values where the user's touch begins
   * @param {Event} event
   */
  handleTouchStart(event) {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  /**
   * Sets touch values where the user's touch ends and attempts to change Pac-Man's direction
   * @param {*} event
   */
  handleTouchEnd(event) {
    this.touchEndX = event.changedTouches[0].clientX;
    this.touchEndY = event.changedTouches[0].clientY;
    const diffX = this.touchEndX - this.touchStartX;
    const diffY = this.touchEndY - this.touchStartY;
    let direction;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      direction = diffX > 0 ? 'right' : 'left';
    } else {
      direction = diffY > 0 ? 'down' : 'up';
    }

    window.dispatchEvent(
      new CustomEvent('swipe', {
        detail: {
          direction
        }
      })
    );
  }

  /**
   * Calls Pacman's changeDirection event if certain conditions are met
   * @param {({'up'|'down'|'left'|'right'})} direction
   */
  changeDirection(direction) {
    if (this.allowKeyPresses && this.gameEngine.running) {
      this.pacman.changeDirection(direction, this.allowPacmanMovement);
    }
  }

  /**
   * Calls various class functions depending upon the pressed key
   * @param {Event} e - The keydown event to evaluate
   */
  handleKeyDown(e) {
    if (e.keyCode === 27) {
      // ESC key
      this.handlePauseKey();
    } else if (e.keyCode === 81) {
      // Q
      this.soundButtonClick();
    } else if (this.movementKeys[e.keyCode]) {
      this.changeDirection(this.movementKeys[e.keyCode]);
    }
  }

  /**
   * Calls changeDirection with the direction of the user's swipe
   * @param {Event} e - The direction of the swipe
   */
  handleSwipe(e) {
    const { direction } = e.detail;
    this.changeDirection(direction);
  }

  /**
   * Handle behavior for the pause key
   */
  handlePauseKey() {
    if (this.allowPause) {
      this.allowPause = false;

      setTimeout(() => {
        if (!this.cutscene) {
          this.allowPause = true;
        }
      }, 500);

      this.gameEngine.changePausedState(this.gameEngine.running);
      this.soundManager.play('pause');

      if (this.gameEngine.started) {
        this.soundManager.resumeAmbience();
        this.gameUi.classList.add('game-ui-clear');
        this.gameUi.classList.remove('game-ui-blur');
        this.pausedText.classList.add('game-element-hidden');
        this.pausedText.classList.remove('game-element-visible');
        this.pauseButton.innerHTML = 'pause';
        this.activeTimers.forEach((timer) => {
          timer.resume();
        });
      } else {
        this.soundManager.stopAmbience();
        this.soundManager.setAmbience('pause_beat', true);
        this.gameUi.classList.add('game-ui-blur');
        this.gameUi.classList.remove('game-ui-clear');
        this.pausedText.classList.add('game-element-visible');
        this.pausedText.classList.remove('game-element-hidden');
        this.pauseButton.innerHTML = 'play_arrow';
        this.activeTimers.forEach((timer) => {
          timer.pause();
        });
      }
    }
  }

  /**
   * Adds points to the player's total
   * @param {({ detail: { points: Number }})} e - Contains a quantity of points to add
   */
  awardPoints(e) {
    this.points += e.detail.points;
    this.pointsDisplay.innerText = this.points;

    // Get high score from leaderboard instead of localStorage
    const leaderboardHighScore = this.leaderboard.getHighScore();

    if (this.points > (this.highScore || 0)) {
      this.highScore = this.points;
      this.highScoreDisplay.innerText = this.points;
      // Remove the old localStorage.setItem('highScore', this.highScore) line
    }

    // Update display with leaderboard high score if it's higher
    if (leaderboardHighScore > (this.highScore || 0)) {
      this.highScoreDisplay.innerText = leaderboardHighScore;
    }

    if (this.points >= 10000 && !this.extraLifeGiven) {
      this.extraLifeGiven = true;
      this.soundManager.play('extra_life');
      this.lives += 1;
      this.updateExtraLivesDisplay();
    }

    if (e.detail.type === 'fruit') {
      const left = e.detail.points >= 1000 ? this.scaledTileSize * 11.5 : this.scaledTileSize * 13;

      this.displayText(
        {
          left,
          top: this.scaledTileSize * 16.5
        },
        e.detail.points,
        2000,
        this.fruitDisplay
      );
    }
  }

  /**
   * Animates Pacman's death, subtracts a life, and resets character positions if
   * the player has remaining lives.
   */
  deathSequence() {
    this.allowPause = false;
    this.cutscene = true;
    this.soundManager.setCutscene(this.cutscene);
    this.soundManager.stopAmbience();
    this.removeTimer({ detail: { timer: this.fruitTimer } });
    this.removeTimer({ detail: { timer: this.ghostCycleTimer } });
    this.removeTimer({ detail: { timer: this.endIdleTimer } });
    this.removeTimer({ detail: { timer: this.ghostFlashTimer } });

    this.allowKeyPresses = false;
    this.pacman.moving = false;
    this.ghosts.forEach((ghost) => {
      const ghostRef = ghost;
      ghostRef.moving = false;
    });

    new Timer(() => {
      this.ghosts.forEach((ghost) => {
        const ghostRef = ghost;
        ghostRef.display = false;
      });
      this.pacman.prepDeathAnimation();
      this.soundManager.play('death');

      if (this.lives > 0) {
        this.lives -= 1;

        new Timer(() => {
          this.mazeCover.classList.add('game-element-visible');
          this.mazeCover.classList.remove('game-element-hidden');
          new Timer(() => {
            this.allowKeyPresses = true;
            this.mazeCover.classList.add('game-element-hidden');
            this.mazeCover.classList.remove('game-element-visible');
            this.pacman.reset();
            this.ghosts.forEach((ghost) => {
              ghost.reset();
            });
            this.fruit.hideFruit();

            this.startGameplay();
          }, 500);
        }, 2250);
      } else {
        this.gameOver();
      }
    }, 750);
  }

  /**
   * Displays GAME OVER text and displays the menu so players can play again
   */
  /**
   * Displays GAME OVER text and displays the menu so players can play again
   */
  gameOver() {
    this.allowKeyPresses = false;

    // Always show name input modal for any score
    console.log('Game over, showing name input for score:', this.points);
    setTimeout(() => {
      if (this.leaderboardUI && this.leaderboardUI.showNameInput) {
        this.leaderboardUI.showNameInput(this.points, this.level);
      } else {
        console.error('LeaderboardUI not properly initialized');
        // Fallback: just add the score anonymously
        this.leaderboard.addScore('Anonymous', this.points, this.level);
      }
    }, 2000); // Wait for game over animation

    // Update high score display
    const newHighScore = this.leaderboard.getHighScore();
    if (newHighScore > (this.highScore || 0)) {
      this.highScore = newHighScore;
      this.highScoreDisplay.innerText = newHighScore;
    }

    // Save to localStorage for backward compatibility
    localStorage.setItem('highScore', this.leaderboard.getHighScore());

    // Display GAME OVER text
    new Timer(() => {
      this.displayText(
        {
          left: this.scaledTileSize * 9,
          top: this.scaledTileSize * 16.5
        },
        'game_over',
        2500,
        this.mazeDiv
      );
      this.fruit.hideFruit();

      // Show main menu after delay
      new Timer(() => {
        this.leftCover.classList.remove('cover-left-hidden');
        this.leftCover.classList.add('cover-left-visible');
        this.rightCover.classList.remove('cover-right-hidden');
        this.rightCover.classList.add('cover-right-visible');

        new Timer(() => {
          this.mainMenu.classList.add('main-menu-visible');
          this.mainMenu.classList.remove('main-menu-hidden');
          this.gameStartButton.disabled = false;
        }, 1000);
      }, 2500);
    }, 2250);
  }

  showLeaderboard() {
    this.leaderboardUI.showLeaderboard();
  }

  getLeaderboardData() {
    return {
      scores: this.leaderboard.getTopScores(),
      statistics: this.leaderboard.getStatistics(),
      highScore: this.leaderboard.getHighScore()
    };
  }

  /**
   * Handle events related to the number of remaining dots
   */
  dotEaten() {
    this.remainingDots -= 1;

    this.soundManager.playDotSound();

    if (this.remainingDots === 174 || this.remainingDots === 74) {
      this.createFruit();
    }

    if (this.remainingDots === 40 || this.remainingDots === 20) {
      this.speedUpBlinky();
    }

    if (this.remainingDots === 0) {
      this.advanceLevel();
    }
  }

  /**
   * Creates a bonus fruit for ten seconds
   */
  createFruit() {
    this.removeTimer({ detail: { timer: this.fruitTimer } });
    this.fruit.showFruit(this.fruitPoints[this.level] || 5000);
    this.fruitTimer = new Timer(() => {
      this.fruit.hideFruit();
    }, 10000);
  }

  /**
   * Speeds up Blinky and raises the background noise pitch
   */
  speedUpBlinky() {
    this.blinky.speedUp();

    if (this.scaredGhosts.length === 0 && this.eyeGhosts === 0) {
      this.soundManager.setAmbience(this.determineSiren(this.remainingDots));
    }
  }

  /**
   * Determines the correct siren ambience
   * @param {Number} remainingDots
   * @returns {String}
   */
  determineSiren(remainingDots) {
    let sirenNum;

    if (remainingDots > 40) {
      sirenNum = 1;
    } else if (remainingDots > 20) {
      sirenNum = 2;
    } else {
      sirenNum = 3;
    }

    return `siren_${sirenNum}`;
  }

  /**
   * Resets the gameboard and prepares the next level
   */
  advanceLevel() {
    this.allowPause = false;
    this.cutscene = true;
    this.soundManager.setCutscene(this.cutscene);
    this.allowKeyPresses = false;
    this.soundManager.stopAmbience();

    this.entityList.forEach((entity) => {
      const entityRef = entity;
      entityRef.moving = false;
    });

    this.removeTimer({ detail: { timer: this.fruitTimer } });
    this.removeTimer({ detail: { timer: this.ghostCycleTimer } });
    this.removeTimer({ detail: { timer: this.endIdleTimer } });
    this.removeTimer({ detail: { timer: this.ghostFlashTimer } });

    const imgBase = 'app/style//graphics/spriteSheets/maze/';

    new Timer(() => {
      this.ghosts.forEach((ghost) => {
        const ghostRef = ghost;
        ghostRef.display = false;
      });

      this.mazeImg.src = `${imgBase}maze_white.svg`;
      new Timer(() => {
        this.mazeImg.src = `${imgBase}maze_blue.svg`;
        new Timer(() => {
          this.mazeImg.src = `${imgBase}maze_white.svg`;
          new Timer(() => {
            this.mazeImg.src = `${imgBase}maze_blue.svg`;
            new Timer(() => {
              this.mazeImg.src = `${imgBase}maze_white.svg`;
              new Timer(() => {
                this.mazeImg.src = `${imgBase}maze_blue.svg`;
                new Timer(() => {
                  this.mazeCover.classList.add('game-element-visible');
                  this.mazeCover.classList.remove('game-element-hidden');
                  new Timer(() => {
                    this.mazeCover.classList.add('game-element-hidden');
                    this.mazeCover.classList.remove('game-element-visible');
                    this.level += 1;
                    this.allowKeyPresses = true;
                    this.entityList.forEach((entity) => {
                      const entityRef = entity;
                      if (entityRef.level) {
                        entityRef.level = this.level;
                      }
                      entityRef.reset();
                      if (entityRef instanceof Ghost) {
                        entityRef.resetDefaultSpeed();
                      }
                      if (entityRef instanceof Pickup && entityRef.type !== 'fruit') {
                        this.remainingDots += 1;
                      }
                    });
                    this.startGameplay();
                  }, 500);
                }, 250);
              }, 250);
            }, 250);
          }, 250);
        }, 250);
      }, 250);
    }, 2000);
  }

  /**
   * Flashes ghosts blue and white to indicate the end of the powerup
   * @param {Number} flashes - Total number of elapsed flashes
   * @param {Number} maxFlashes - Total flashes to show
   */
  flashGhosts(flashes, maxFlashes) {
    if (flashes === maxFlashes) {
      this.scaredGhosts.forEach((ghost) => {
        ghost.endScared();
      });
      this.scaredGhosts = [];
      if (this.eyeGhosts === 0) {
        this.soundManager.setAmbience(this.determineSiren(this.remainingDots));
      }
    } else if (this.scaredGhosts.length > 0) {
      this.scaredGhosts.forEach((ghost) => {
        ghost.toggleScaredColor();
      });

      this.ghostFlashTimer = new Timer(() => {
        this.flashGhosts(flashes + 1, maxFlashes);
      }, 250);
    }
  }

  /**
   * Upon eating a power pellet, sets the ghosts to 'scared' mode
   */
  powerUp() {
    if (this.remainingDots !== 0) {
      this.soundManager.setAmbience('power_up');
    }

    this.removeTimer({ detail: { timer: this.ghostFlashTimer } });

    this.ghostCombo = 0;
    this.scaredGhosts = [];

    this.ghosts.forEach((ghost) => {
      if (ghost.mode !== 'eyes') {
        this.scaredGhosts.push(ghost);
      }
    });

    this.scaredGhosts.forEach((ghost) => {
      ghost.becomeScared();
    });

    const powerDuration = Math.max((7 - this.level) * 1000, 0);
    this.ghostFlashTimer = new Timer(() => {
      this.flashGhosts(0, 9);
    }, powerDuration);
  }

  /**
   * Determines the quantity of points to give based on the current combo
   */
  determineComboPoints() {
    return 100 * 2 ** this.ghostCombo;
  }

  /**
   * Upon eating a ghost, award points and temporarily pause movement
   * @param {CustomEvent} e - Contains a target ghost object
   */
  eatGhost(e) {
    const pauseDuration = 1000;
    const { position, measurement } = e.detail.ghost;

    this.pauseTimer({ detail: { timer: this.ghostFlashTimer } });
    this.pauseTimer({ detail: { timer: this.ghostCycleTimer } });
    this.pauseTimer({ detail: { timer: this.fruitTimer } });
    this.soundManager.play('eat_ghost');

    this.scaredGhosts = this.scaredGhosts.filter((ghost) => ghost.name !== e.detail.ghost.name);
    this.eyeGhosts += 1;

    this.ghostCombo += 1;
    const comboPoints = this.determineComboPoints();
    window.dispatchEvent(
      new CustomEvent('awardPoints', {
        detail: {
          points: comboPoints
        }
      })
    );
    this.displayText(position, comboPoints, pauseDuration, measurement);

    this.allowPacmanMovement = false;
    this.pacman.display = false;
    this.pacman.moving = false;
    e.detail.ghost.display = false;
    e.detail.ghost.moving = false;

    this.ghosts.forEach((ghost) => {
      const ghostRef = ghost;
      ghostRef.animate = false;
      ghostRef.pause(true);
      ghostRef.allowCollision = false;
    });

    new Timer(() => {
      this.soundManager.setAmbience('eyes');

      this.resumeTimer({ detail: { timer: this.ghostFlashTimer } });
      this.resumeTimer({ detail: { timer: this.ghostCycleTimer } });
      this.resumeTimer({ detail: { timer: this.fruitTimer } });
      this.allowPacmanMovement = true;
      this.pacman.display = true;
      this.pacman.moving = true;
      e.detail.ghost.display = true;
      e.detail.ghost.moving = true;
      this.ghosts.forEach((ghost) => {
        const ghostRef = ghost;
        ghostRef.animate = true;
        ghostRef.pause(false);
        ghostRef.allowCollision = true;
      });
    }, pauseDuration);
  }

  /**
   * Decrements the count of "eye" ghosts and updates the ambience
   */
  restoreGhost() {
    this.eyeGhosts -= 1;

    if (this.eyeGhosts === 0) {
      const sound = this.scaredGhosts.length > 0 ? 'power_up' : this.determineSiren(this.remainingDots);
      this.soundManager.setAmbience(sound);
    }
  }

  /**
   * Creates a temporary div to display points on screen
   * @param {({ left: number, top: number })} position - CSS coordinates to display the points at
   * @param {Number} amount - Amount of points to display
   * @param {Number} duration - Milliseconds to display the points before disappearing
   * @param {Number} width - Image width in pixels
   * @param {Number} height - Image height in pixels
   */
  displayText(position, amount, duration, width, height) {
    const pointsDiv = document.createElement('div');

    pointsDiv.style.position = 'absolute';
    pointsDiv.style.backgroundSize = `${width}px`;
    pointsDiv.style.backgroundImage = 'url(app/style/graphics/' + `spriteSheets/text/${amount}.svg`;
    pointsDiv.style.width = `${width}px`;
    pointsDiv.style.height = `${height || width}px`;
    pointsDiv.style.top = `${position.top}px`;
    pointsDiv.style.left = `${position.left}px`;
    pointsDiv.style.zIndex = 2;

    this.mazeDiv.appendChild(pointsDiv);

    new Timer(() => {
      this.mazeDiv.removeChild(pointsDiv);
    }, duration);
  }

  /**
   * Pushes a Timer to the activeTimers array
   * @param {({ detail: { timer: Object }})} e
   */
  addTimer(e) {
    this.activeTimers.push(e.detail.timer);
  }

  /**
   * Checks if a Timer with a matching ID exists
   * @param {({ detail: { timer: Object }})} e
   * @returns {Boolean}
   */
  timerExists(e) {
    return !!(e.detail.timer || {}).timerId;
  }

  /**
   * Pauses a timer
   * @param {({ detail: { timer: Object }})} e
   */
  pauseTimer(e) {
    if (this.timerExists(e)) {
      e.detail.timer.pause(true);
    }
  }

  /**
   * Resumes a timer
   * @param {({ detail: { timer: Object }})} e
   */
  resumeTimer(e) {
    if (this.timerExists(e)) {
      e.detail.timer.resume(true);
    }
  }

  /**
   * Removes a Timer from activeTimers
   * @param {({ detail: { timer: Object }})} e
   */
  removeTimer(e) {
    if (this.timerExists(e)) {
      window.clearTimeout(e.detail.timer.timerId);
      this.activeTimers = this.activeTimers.filter((timer) => timer.timerId !== e.detail.timer.timerId);
    }
  }
}


class GameEngine {
  constructor(maxFps, entityList) {
    this.fpsDisplay = document.getElementById('fps-display');
    this.elapsedMs = 0;
    this.lastFrameTimeMs = 0;
    this.entityList = entityList;
    this.maxFps = maxFps;
    this.timestep = 1000 / this.maxFps;
    this.fps = this.maxFps;
    this.framesThisSecond = 0;
    this.lastFpsUpdate = 0;
    this.frameId = 0;
    this.running = false;
    this.started = false;
  }

  /**
   * Toggles the paused/running status of the game
   * @param {Boolean} running - Whether the game is currently in motion
   */
  changePausedState(running) {
    if (running) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Updates the on-screen FPS counter once per second
   * @param {number} timestamp - The amount of MS which has passed since starting the game engine
   */
  updateFpsDisplay(timestamp) {
    if (timestamp > this.lastFpsUpdate + 1000) {
      this.fps = (this.framesThisSecond + this.fps) / 2;
      this.lastFpsUpdate = timestamp;
      this.framesThisSecond = 0;
    }
    this.framesThisSecond += 1;
    this.fpsDisplay.textContent = `${Math.round(this.fps)} FPS`;
  }

  /**
   * Calls the draw function for every member of the entityList
   * @param {number} interp - The animation accuracy as a percentage
   * @param {Array} entityList - List of entities to be used throughout the game
   */
  draw(interp, entityList) {
    entityList.forEach((entity) => {
      if (typeof entity.draw === 'function') {
        entity.draw(interp);
      }
    });
  }

  /**
   * Calls the update function for every member of the entityList
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   * @param {Array} entityList - List of entities to be used throughout the game
   */
  update(elapsedMs, entityList) {
    entityList.forEach((entity) => {
      if (typeof entity.update === 'function') {
        entity.update(elapsedMs);
      }
    });
  }

  /**
   * In the event that a ton of unsimulated frames pile up, discard all of these frames
   * to prevent crashing the game
   */
  panic() {
    this.elapsedMs = 0;
  }

  /**
   * Draws an initial frame, resets a few tracking variables related to animation, and calls
   * the mainLoop function to start the engine
   */
  start() {
    if (!this.started) {
      this.started = true;

      this.frameId = requestAnimationFrame((firstTimestamp) => {
        this.draw(1, []);
        this.running = true;
        this.lastFrameTimeMs = firstTimestamp;
        this.lastFpsUpdate = firstTimestamp;
        this.framesThisSecond = 0;

        this.frameId = requestAnimationFrame((timestamp) => {
          this.mainLoop(timestamp);
        });
      });
    }
  }

  /**
   * Stops the engine and cancels the current animation frame
   */
  stop() {
    this.running = false;
    this.started = false;
    cancelAnimationFrame(this.frameId);
  }

  /**
   * The loop which will process all necessary frames to update the game's entities
   * prior to animating them
   */
  processFrames() {
    let numUpdateSteps = 0;
    while (this.elapsedMs >= this.timestep) {
      this.update(this.timestep, this.entityList);
      this.elapsedMs -= this.timestep;
      numUpdateSteps += 1;
      if (numUpdateSteps >= this.maxFps) {
        this.panic();
        break;
      }
    }
  }

  /**
   * A single cycle of the engine which checks to see if enough time has passed, and, if so,
   * will kick off the loops to update and draw the game's entities.
   * @param {number} timestamp - The amount of MS which has passed since starting the game engine
   */
  engineCycle(timestamp) {
    if (timestamp < this.lastFrameTimeMs + (1000 / this.maxFps)) {
      this.frameId = requestAnimationFrame((nextTimestamp) => {
        this.mainLoop(nextTimestamp);
      });
      return;
    }

    this.elapsedMs += timestamp - this.lastFrameTimeMs;
    this.lastFrameTimeMs = timestamp;
    this.updateFpsDisplay(timestamp);
    this.processFrames();
    this.draw(this.elapsedMs / this.timestep, this.entityList);

    this.frameId = requestAnimationFrame((nextTimestamp) => {
      this.mainLoop(nextTimestamp);
    });
  }

  /**
   * The endless loop which will kick off engine cycles so long as the game is running
   * @param {number} timestamp - The amount of MS which has passed since starting the game engine
   */
  mainLoop(timestamp) {
    this.engineCycle(timestamp);
  }
}


class Pickup {
  constructor(type, scaledTileSize, column, row, pacman, mazeDiv, points) {
    this.type = type;
    this.pacman = pacman;
    this.mazeDiv = mazeDiv;
    this.points = points;
    this.nearPacman = false;

    this.fruitImages = {
      100: 'cherry',
      300: 'strawberry',
      500: 'orange',
      700: 'apple',
      1000: 'melon',
      2000: 'galaxian',
      3000: 'bell',
      5000: 'key',
    };

    this.setStyleMeasurements(type, scaledTileSize, column, row, points);
  }

  /**
   * Resets the pickup's visibility
   */
  reset() {
    this.animationTarget.className = (this.type === 'fruit')
      ? 'pickup-base pickup-hidden' : 'pickup-base pickup-visible';
  }

  /**
   * Sets various style measurements for the pickup depending on its type
   * @param {('pacdot'|'powerPellet'|'fruit')} type - The classification of pickup
   * @param {number} scaledTileSize
   * @param {number} column
   * @param {number} row
   * @param {number} points
   */
  setStyleMeasurements(type, scaledTileSize, column, row, points) {
    if (type === 'pacdot') {
      this.size = scaledTileSize * 0.25;
      this.x = (column * scaledTileSize) + ((scaledTileSize / 8) * 3);
      this.y = (row * scaledTileSize) + ((scaledTileSize / 8) * 3);
    } else if (type === 'powerPellet') {
      this.size = scaledTileSize;
      this.x = (column * scaledTileSize);
      this.y = (row * scaledTileSize);
    } else {
      this.size = scaledTileSize * 2;
      this.x = (column * scaledTileSize) - (scaledTileSize * 0.5);
      this.y = (row * scaledTileSize) - (scaledTileSize * 0.5);
    }

    this.center = {
      x: column * scaledTileSize,
      y: row * scaledTileSize,
    };

    this.animationTarget = document.createElement('div');
    this.animationTarget.className = 'pickup-base';
    this.animationTarget.style.backgroundSize = `${this.size}px`;
    this.animationTarget.style.backgroundImage = this.determineImage(
      type, points,
    );
    this.animationTarget.style.height = `${this.size}px`;
    this.animationTarget.style.width = `${this.size}px`;
    this.animationTarget.style.top = `${this.y}px`;
    this.animationTarget.style.left = `${this.x}px`;
    this.mazeDiv.appendChild(this.animationTarget);

    if (type === 'powerPellet') {
      this.animationTarget.classList.add('power-pellet');
    }

    this.reset();
  }

  /**
   * Determines the Pickup image based on type and point value
   * @param {('pacdot'|'powerPellet'|'fruit')} type - The classification of pickup
   * @param {Number} points
   * @returns {String}
   */
  determineImage(type, points) {
    let image = '';

    if (type === 'fruit') {
      image = this.fruitImages[points] || 'cherry';
    } else {
      image = type;
    }

    return `url(app/style/graphics/spriteSheets/pickups/${image}.svg)`;
  }

  /**
   * Shows a bonus fruit, resetting its point value and image
   * @param {number} points
   */
  showFruit(points) {
    this.points = points;
    this.animationTarget.style.backgroundImage = this.determineImage(
      this.type, points,
    );
    this.animationTarget.classList.remove('pickup-hidden');
    this.animationTarget.classList.add('pickup-visible');
  }

  /**
   * Makes the fruit invisible (happens if Pacman was too slow)
   */
  hideFruit() {
    this.animationTarget.classList.remove('pickup-visible');
    this.animationTarget.classList.add('pickup-hidden');
  }

  /**
   * Returns true if the Pickup is touching a bounding box at Pacman's center
   * @param {({ x: number, y: number, size: number})} pickup
   * @param {({ x: number, y: number, size: number})} originalPacman
   */
  checkForCollision(pickup, originalPacman) {
    const pacman = Object.assign({}, originalPacman);

    pacman.x += (pacman.size * 0.25);
    pacman.y += (pacman.size * 0.25);
    pacman.size /= 2;

    return (pickup.x < pacman.x + pacman.size
      && pickup.x + pickup.size > pacman.x
      && pickup.y < pacman.y + pacman.size
      && pickup.y + pickup.size > pacman.y);
  }

  /**
   * Checks to see if the pickup is close enough to Pacman to be considered for collision detection
   * @param {number} maxDistance - The maximum distance Pacman can travel per cycle
   * @param {({ x:number, y:number })} pacmanCenter - The center of Pacman's hitbox
   * @param {Boolean} debugging - Flag to change the appearance of pickups for testing
   */
  checkPacmanProximity(maxDistance, pacmanCenter, debugging) {
    if (!this.animationTarget.classList.contains('pickup-hidden')) {
      const distance = Math.sqrt(
        ((this.center.x - pacmanCenter.x) ** 2)
        + ((this.center.y - pacmanCenter.y) ** 2),
      );

      this.nearPacman = (distance <= maxDistance);

      if (debugging) {
        this.animationTarget.style.background = this.nearPacman
          ? 'lime' : 'red';
      }
    }
  }

  /**
   * Checks if the pickup is visible and close to Pacman
   * @returns {Boolean}
   */
  shouldCheckForCollision() {
    return !this.animationTarget.classList.contains('pickup-hidden')
      && this.nearPacman;
  }

  /**
   * If the Pickup is still visible, it checks to see if it is colliding with Pacman.
   * It will turn itself invisible and cease collision-detection after the first
   * collision with Pacman.
   */
  update() {
    if (this.shouldCheckForCollision()) {
      if (this.checkForCollision(
        {
          x: this.x,
          y: this.y,
          size: this.size,
        }, {
          x: this.pacman.position.left,
          y: this.pacman.position.top,
          size: this.pacman.measurement,
        },
      )) {
        this.animationTarget.classList.remove('pickup-visible');
        this.animationTarget.classList.add('pickup-hidden');
        window.dispatchEvent(new CustomEvent('awardPoints', {
          detail: {
            points: this.points,
            type: this.type,
          },
        }));

        if (this.type === 'pacdot') {
          window.dispatchEvent(new Event('dotEaten'));
        } else if (this.type === 'powerPellet') {
          window.dispatchEvent(new Event('dotEaten'));
          window.dispatchEvent(new Event('powerUp'));
        }
      }
    }
  }
}


class CharacterUtil {
  constructor(scaledTileSize) {
    this.scaledTileSize = scaledTileSize;
    this.threshold = 5 * this.scaledTileSize;
    this.directions = {
      up: 'up',
      down: 'down',
      left: 'left',
      right: 'right',
    };
  }

  /**
   * Check if a given character has moved more than five in-game tiles during a frame.
   * If so, we want to temporarily hide the object to avoid 'animation stutter'.
   * @param {({top: number, left: number})} position - Position during the current frame
   * @param {({top: number, left: number})} oldPosition - Position during the previous frame
   * @returns {('hidden'|'visible')} - The new 'visibility' css property value for the character.
   */
  checkForStutter(position, oldPosition) {
    let stutter = false;

    if (position && oldPosition) {
      if (Math.abs(position.top - oldPosition.top) > this.threshold
        || Math.abs(position.left - oldPosition.left) > this.threshold) {
        stutter = true;
      }
    }

    return stutter ? 'hidden' : 'visible';
  }

  /**
   * Check which CSS property needs to be changed given the character's current direction
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @returns {('top'|'left')}
   */
  getPropertyToChange(direction) {
    switch (direction) {
      case this.directions.up:
      case this.directions.down:
        return 'top';
      default:
        return 'left';
    }
  }

  /**
   * Calculate the velocity for the character's next frame.
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @param {number} velocityPerMs - The distance to travel in a single millisecond
   * @returns {number} - Moving down or right is positive, while up or left is negative.
   */
  getVelocity(direction, velocityPerMs) {
    switch (direction) {
      case this.directions.up:
      case this.directions.left:
        return velocityPerMs * -1;
      default:
        return velocityPerMs;
    }
  }

  /**
   * Determine the next value which will be used to draw the character's position on screen
   * @param {number} interp - The percentage of the desired timestamp between frames
   * @param {('top'|'left')} prop - The css property to be changed
   * @param {({top: number, left: number})} oldPosition - Position during the previous frame
   * @param {({top: number, left: number})} position - Position during the current frame
   * @returns {number} - New value for css positioning
   */
  calculateNewDrawValue(interp, prop, oldPosition, position) {
    return oldPosition[prop] + (position[prop] - oldPosition[prop]) * interp;
  }

  /**
   * Convert the character's css position to a row-column on the maze array
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @param {number} scaledTileSize - The dimensions of a single tile
   * @returns {({x: number, y: number})}
   */
  determineGridPosition(position, scaledTileSize) {
    return {
      x: (position.left / scaledTileSize) + 0.5,
      y: (position.top / scaledTileSize) + 0.5,
    };
  }

  /**
   * Check to see if a character's desired direction results in turning around
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @param {('up'|'down'|'left'|'right')} desiredDirection - Character's desired orientation
   * @returns {boolean}
   */
  turningAround(direction, desiredDirection) {
    return desiredDirection === this.getOppositeDirection(direction);
  }

  /**
   * Calculate the opposite of a given direction
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @returns {('up'|'down'|'left'|'right')}
   */
  getOppositeDirection(direction) {
    switch (direction) {
      case this.directions.up:
        return this.directions.down;
      case this.directions.down:
        return this.directions.up;
      case this.directions.left:
        return this.directions.right;
      default:
        return this.directions.left;
    }
  }

  /**
   * Calculate the proper rounding function to assist with collision detection
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @returns {Function}
   */
  determineRoundingFunction(direction) {
    switch (direction) {
      case this.directions.up:
      case this.directions.left:
        return Math.floor;
      default:
        return Math.ceil;
    }
  }

  /**
   * Check to see if the character's next frame results in moving to a new tile on the maze array
   * @param {({x: number, y: number})} oldPosition - Position during the previous frame
   * @param {({x: number, y: number})} position - Position during the current frame
   * @returns {boolean}
   */
  changingGridPosition(oldPosition, position) {
    return (
      Math.floor(oldPosition.x) !== Math.floor(position.x)
            || Math.floor(oldPosition.y) !== Math.floor(position.y)
    );
  }

  /**
   * Check to see if the character is attempting to run into a wall of the maze
   * @param {({x: number, y: number})} desiredNewGridPosition - Character's target tile
   * @param {Array} mazeArray - The 2D array representing the game's maze
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @returns {boolean}
   */
  checkForWallCollision(desiredNewGridPosition, mazeArray, direction) {
    const roundingFunction = this.determineRoundingFunction(
      direction, this.directions,
    );

    const desiredX = roundingFunction(desiredNewGridPosition.x);
    const desiredY = roundingFunction(desiredNewGridPosition.y);
    let newGridValue;

    if (Array.isArray(mazeArray[desiredY])) {
      newGridValue = mazeArray[desiredY][desiredX];
    }

    return (newGridValue === 'X');
  }

  /**
   * Returns an object containing the new position and grid position based upon a direction
   * @param {({top: number, left: number})} position - css position during the current frame
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @param {number} velocityPerMs - The distance to travel in a single millisecond
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   * @param {number} scaledTileSize - The dimensions of a single tile
   * @returns {object}
   */
  determineNewPositions(
    position, direction, velocityPerMs, elapsedMs, scaledTileSize,
  ) {
    const newPosition = Object.assign({}, position);
    newPosition[this.getPropertyToChange(direction)]
      += this.getVelocity(direction, velocityPerMs) * elapsedMs;
    const newGridPosition = this.determineGridPosition(
      newPosition, scaledTileSize,
    );

    return {
      newPosition,
      newGridPosition,
    };
  }

  /**
   * Calculates the css position when snapping the character to the x-y grid
   * @param {({x: number, y: number})} position - The character's position during the current frame
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @param {number} scaledTileSize - The dimensions of a single tile
   * @returns {({top: number, left: number})}
   */
  snapToGrid(position, direction, scaledTileSize) {
    const newPosition = Object.assign({}, position);
    const roundingFunction = this.determineRoundingFunction(
      direction, this.directions,
    );

    switch (direction) {
      case this.directions.up:
      case this.directions.down:
        newPosition.y = roundingFunction(newPosition.y);
        break;
      default:
        newPosition.x = roundingFunction(newPosition.x);
        break;
    }

    return {
      top: (newPosition.y - 0.5) * scaledTileSize,
      left: (newPosition.x - 0.5) * scaledTileSize,
    };
  }

  /**
   * Returns a modified position if the character needs to warp
   * @param {({top: number, left: number})} position - css position during the current frame
   * @param {({x: number, y: number})} gridPosition - x-y position during the current frame
   * @param {number} scaledTileSize - The dimensions of a single tile
   * @returns {({top: number, left: number})}
   */
  handleWarp(position, scaledTileSize, mazeArray) {
    const newPosition = Object.assign({}, position);
    const gridPosition = this.determineGridPosition(position, scaledTileSize);

    if (gridPosition.x < -0.75) {
      newPosition.left = (scaledTileSize * (mazeArray[0].length - 0.75));
    } else if (gridPosition.x > (mazeArray[0].length - 0.25)) {
      newPosition.left = (scaledTileSize * -1.25);
    }

    return newPosition;
  }

  /**
   * Advances spritesheet by one frame if needed
   * @param {Object} character - The character which needs to be animated
   */
  advanceSpriteSheet(character) {
    const {
      msSinceLastSprite,
      animationTarget,
      backgroundOffsetPixels,
    } = character;
    const updatedProperties = {
      msSinceLastSprite,
      animationTarget,
      backgroundOffsetPixels,
    };

    const ready = (character.msSinceLastSprite > character.msBetweenSprites)
      && character.animate;
    if (ready) {
      updatedProperties.msSinceLastSprite = 0;

      if (character.backgroundOffsetPixels
        < (character.measurement * (character.spriteFrames - 1))
      ) {
        updatedProperties.backgroundOffsetPixels += character.measurement;
      } else if (character.loopAnimation) {
        updatedProperties.backgroundOffsetPixels = 0;
      }

      const style = `-${updatedProperties.backgroundOffsetPixels}px 0px`;
      updatedProperties.animationTarget.style.backgroundPosition = style;
    }

    return updatedProperties;
  }
}


class SoundManager {
  constructor() {
    this.baseUrl = 'app/style/audio/';
    this.fileFormat = 'mp3';
    this.masterVolume = 1;
    this.paused = false;
    this.cutscene = true;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ambience = new AudioContext();
  }

  /**
   * Sets the cutscene flag to determine if players should be able to resume ambience
   * @param {Boolean} newValue
   */
  setCutscene(newValue) {
    this.cutscene = newValue;
  }

  /**
   * Sets the master volume for all sounds and stops/resumes ambience
   * @param {(0|1)} newVolume
   */
  setMasterVolume(newVolume) {
    this.masterVolume = newVolume;

    if (this.soundEffect) {
      this.soundEffect.volume = this.masterVolume;
    }

    if (this.dotPlayer) {
      this.dotPlayer.volume = this.masterVolume;
    }

    if (this.masterVolume === 0) {
      this.stopAmbience();
    } else {
      this.resumeAmbience(this.paused);
    }
  }

  /**
   * Plays a single sound effect
   * @param {String} sound
   */
  play(sound) {
    this.soundEffect = new Audio(`${this.baseUrl}${sound}.${this.fileFormat}`);
    this.soundEffect.volume = this.masterVolume;
    this.soundEffect.play();
  }

  /**
   * Special method for eating dots. The dots should alternate between two
   * sound effects, but not too quickly.
   */
  playDotSound() {
    this.queuedDotSound = true;

    if (!this.dotPlayer) {
      this.queuedDotSound = false;
      this.dotSound = (this.dotSound === 1) ? 2 : 1;

      this.dotPlayer = new Audio(
        `${this.baseUrl}dot_${this.dotSound}.${this.fileFormat}`,
      );
      this.dotPlayer.onended = this.dotSoundEnded.bind(this);
      this.dotPlayer.volume = this.masterVolume;
      this.dotPlayer.play();
    }
  }

  /**
   * Deletes the dotSound player and plays another dot sound if needed
   */
  dotSoundEnded() {
    this.dotPlayer = undefined;

    if (this.queuedDotSound) {
      this.playDotSound();
    }
  }

  /**
   * Loops an ambient sound
   * @param {String} sound
   */
  async setAmbience(sound, keepCurrentAmbience) {
    if (!this.fetchingAmbience && !this.cutscene) {
      if (!keepCurrentAmbience) {
        this.currentAmbience = sound;
        this.paused = false;
      } else {
        this.paused = true;
      }

      if (this.ambienceSource) {
        this.ambienceSource.stop();
      }

      if (this.masterVolume !== 0) {
        this.fetchingAmbience = true;
        const response = await fetch(
          `${this.baseUrl}${sound}.${this.fileFormat}`,
        );
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ambience.decodeAudioData(arrayBuffer);

        this.ambienceSource = this.ambience.createBufferSource();
        this.ambienceSource.buffer = audioBuffer;
        this.ambienceSource.connect(this.ambience.destination);
        this.ambienceSource.loop = true;
        this.ambienceSource.start();

        this.fetchingAmbience = false;
      }
    }
  }

  /**
   * Resumes the ambience
   */
  resumeAmbience(paused) {
    if (this.ambienceSource) {
      // Resetting the ambience since an AudioBufferSourceNode can only
      // have 'start()' called once
      if (paused) {
        this.setAmbience('pause_beat', true);
      } else {
        this.setAmbience(this.currentAmbience);
      }
    }
  }

  /**
   * Stops the ambience
   */
  stopAmbience() {
    if (this.ambienceSource) {
      this.ambienceSource.stop();
    }
  }
}


class Timer {
  constructor(callback, delay) {
    this.callback = callback;
    this.remaining = delay;
    this.resume();
  }

  /**
   * Pauses the timer marks whether the pause came from the player
   * or the system
   * @param {Boolean} systemPause
   */
  pause(systemPause) {
    window.clearTimeout(this.timerId);
    this.remaining -= new Date() - this.start;
    this.oldTimerId = this.timerId;

    if (systemPause) {
      this.pausedBySystem = true;
    }
  }

  /**
   * Creates a new setTimeout based upon the remaining time, giving the
   * illusion of 'resuming' the old setTimeout
   * @param {Boolean} systemResume
   */
  resume(systemResume) {
    if (systemResume || !this.pausedBySystem) {
      this.pausedBySystem = false;

      this.start = new Date();
      this.timerId = window.setTimeout(() => {
        this.callback();
        window.dispatchEvent(new CustomEvent('removeTimer', {
          detail: {
            timer: this,
          },
        }));
      }, this.remaining);

      if (!this.oldTimerId) {
        window.dispatchEvent(new CustomEvent('addTimer', {
          detail: {
            timer: this,
          },
        }));
      }
    }
  }
}

