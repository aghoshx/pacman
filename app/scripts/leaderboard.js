class Leaderboard {
  constructor(apiUrl = "https://dev.matsio.com/game-api/leaderboard.php") {
    this.maxEntries = 10;
    this.apiUrl = apiUrl;
    this.scores = [];
  }

  async loadScores() {
    try {
      const res = await fetch(this.apiUrl);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      this.scores = await res.json();
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
      const response = await fetch(
        "https://dev.matsio.com/game-api/get-top-player.php"
      );
      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          topPlayer: data.top_player,
          topScore: data.top_score,
          achievedAt: data.achieved_at,
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
      const res = await fetch(
        "https://dev.matsio.com/game-api/submit-score.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Failed to submit score");

      const result = await res.json();

      // Optionally reload scores after submission
      await this.loadScores();

      return {
        madeLeaderboard: true,
        result,
      };
    } catch (error) {
      console.error("Error submitting score:", error);
      return {
        madeLeaderboard: false,
        error,
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
   * Clear all scores (useful for testing or reset functionality)
   */
  clearScores() {
    this.scores = [];
    // Since you're using API, refresh from server
    this.loadScores();
  }

  /**
   * Get leaderboard statistics
   * @returns {Object} Statistics about the leaderboard
   */
  getStatistics() {
    if (this.scores.length === 0) {
      return {
        totalGames: 0,
        averageScore: 0,
        highestLevel: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }

    const totalScore = this.scores.reduce((sum, entry) => sum + entry.score, 0);
    const highestLevel = Math.max(...this.scores.map((entry) => entry.level));
    const sortedByDate = [...this.scores].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    return {
      totalGames: this.scores.length,
      averageScore: Math.round(totalScore / this.scores.length),
      highestLevel: highestLevel,
      oldestEntry: sortedByDate[0],
      newestEntry: sortedByDate[sortedByDate.length - 1],
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
