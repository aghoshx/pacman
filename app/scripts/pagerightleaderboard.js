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
            <input type="text" id="player-name" maxlength="15" placeholder="Anonymous" style="
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
        playerNameInput.style.borderColor = "#ffdf00";
        playerNameInput.style.boxShadow = "0 0 10px rgba(255, 223, 0, 0.3)";
      });
      playerNameInput.addEventListener("blur", () => {
        playerNameInput.style.borderColor = "#2121ff";
        playerNameInput.style.boxShadow = "none";
      });
    }
  }

  /**
   * Start auto-refresh for the leaderboard panel
   */
  async startAutoRefresh() {
    // Wait for initial scores to load, then update displays
    await this.leaderboard.loadScores();
    this.updateLeaderboardPanel();
    this.updateGlobalChampion();

    // Auto-refresh every 30 seconds
    setInterval(async () => {
      await this.leaderboard.loadScores();
      this.updateLeaderboardPanel();
      this.updateGlobalChampion();
    }, 30000);
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
              ">${this.escapeHtml(score.name)}</div>
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
   * Show name input modal when game ends with a qualifying score
   */
  showNameInput(score, level) {
    console.log("showNameInput called with score:", score, "level:", level);

    if (!this.leaderboard.wouldMakeLeaderboard(score)) {
      console.log("Score does not qualify for leaderboard");
      // Just add the score without showing the modal
      this.leaderboard.addScore(score, "Anonymous", level);
      this.updateLeaderboardPanel();
      return;
    }

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
      positionElement.style.display = "block";
    } else {
      positionElement.style.display = "none";
    }

    this.nameInputModal.style.display = "flex";
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
    console.log("Final player name:", playerName);

    // Use the new method that checks for records
    const result = await this.leaderboard.addScoreWithRecordCheck(
      this.pendingScore.score,
      playerName,
      this.pendingScore.level
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
    this.nameInputModal.style.opacity = "0";
    this.nameInputModal.querySelector(".name-input-content").style.transform =
      "scale(0.8)";

    setTimeout(() => {
      this.nameInputModal.style.display = "none";
      document.getElementById("player-name").value = "";
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
