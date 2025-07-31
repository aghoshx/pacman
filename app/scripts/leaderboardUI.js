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
          <span class="name">${this.escapeHtml(score.name)}</span>
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
   * Show the name input modal for a new high score
   */
  showNameInput(score, level) {
    // Check if score would make the leaderboard
    if (!this.leaderboard.wouldMakeLeaderboard(score)) {
      // Score doesn't make leaderboard, just add it
      this.leaderboard.addScore(score, 'Anonymous', level);
      this.updateLeaderboardPanel();
      return;
    }

    document.getElementById('final-score').textContent = this.leaderboard.formatScore(score);
    document.getElementById('final-level').textContent = level;

    // Temporarily add score to see position
    const result = this.leaderboard.addScore(score, 'TEMP', level);
    document.getElementById('leaderboard-position').textContent = result.isNewRecord ? '🥇 NEW RECORD!' : `#${result.position} on the leaderboard!`;

    // Remove the temporary entry
    this.leaderboard.scores = this.leaderboard.scores.filter((s) => s.name !== 'TEMP');

    this.nameInputModal.style.display = 'flex';
    setTimeout(() => {
      this.nameInputModal.classList.add('show');
      document.getElementById('player-name').focus();
    }, 10);

    // Store score and level for submission
    this.pendingScore = score;
    this.pendingLevel = level;
  }

  /**
   * Submit the score with the entered name
   */
  submitScore(forceName = null) {
    const nameInput = document.getElementById('player-name');
    const playerName = forceName || nameInput.value.trim() || 'Anonymous';

    const result = this.leaderboard.addScore(this.pendingScore, playerName, this.pendingLevel);

    // Hide name input modal
    this.nameInputModal.classList.remove('show');
    setTimeout(() => {
      this.nameInputModal.style.display = 'none';
      nameInput.value = '';
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
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// removeIf(production)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LeaderboardUI;
}
// endRemoveIf(production)
