class Leaderboard {
  constructor(apiUrl = null) {
    // Use config system for settings
    const config = window.GameConfig || { api: { baseUrl: "https://dev.matsio.com/game-api" }, leaderboard: { maxEntries: 10 } };
    
    this.maxEntries = config.leaderboard.maxEntries;
    this.apiUrl = apiUrl || config.api.baseUrl;
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
   * @returns {Promise<Object>} Result with newRecord flag
   */
  async addScoreWithRecordCheck(score, playerName = "Anonymous", level = 1) {
    // Get current top score before submitting
    const currentTop = await this.getTopPlayer();
    const wasRecord = currentTop.success && score > currentTop.topScore;

    // Submit the score using your existing method
    const result = await this.addScore(score, playerName, level);

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
   * @returns {Object} Result object with position and whether it made the leaderboard
   */
  async addScore(score, playerName = "Anonymous", level = 1) {
    const payload = {
      player_name: playerName.trim() || "Anonymous",
      score: score,
      level: level,
    };

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
        // Optionally reload scores after submission
        await this.loadScores();

        return {
          madeLeaderboard: result.data.made_top_10,
          position: result.data.position,
          isNewRecord: result.data.is_new_record,
          result: result.data,
        };
      } else {
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
    tempScores.push({ score: score, player_name: 'TEMP' });
    
    // Sort by score (descending)
    tempScores.sort((a, b) => b.score - a.score);
    
    // Find the position of our temporary score
    const position = tempScores.findIndex(s => s.player_name === 'TEMP') + 1;
    const madeLeaderboard = position <= this.maxEntries;
    
    return {
      position: position,
      madeLeaderboard: madeLeaderboard,
      isNewRecord: this.scores.length === 0 || score > this.scores[0].score
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
    console.log('saveScores() called - scores are now automatically saved via API');
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
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }
}

// removeIf(production)
if (typeof module !== "undefined" && module.exports) {
  module.exports = Leaderboard;
}
// endRemoveIf(production)
