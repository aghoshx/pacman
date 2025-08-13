<!DOCTYPE html>
<html>

<head>
  <!-- Global site tag (gtag.js) - Google Analytics -->
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-2MFRWGS89E"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());

    gtag('config', 'G-2MFRWGS89E');
  </script>


  <script src="build/app.js?v=<?php echo time(); ?>"></script>
  <link rel="shortcut icon" type="image/x-icon" href="favicon.ico" />
  <link href="https://fonts.googleapis.com/css?family=Press+Start+2P&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
  <script src="https://www.google.com/recaptcha/api.js" async defer></script>
  <link rel="stylesheet" href="build/app.css?v=<?php echo time(); ?>">
  <title>Botman | The AI Maze | Play. Score. Win your pass to Caravan ’25.</title>
  <meta name="author" content="Team Matsio" />
  <meta name="description" content="Play the Bot-Man game from 11 to 26 August 2025 to enter the top 10 leaderboard. Keep playing to hold your position." />
  <meta name="keywords" content="AI Botman Maze, games, retro, arcade" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>

<body>
  <div class="page-left">
    <div class="brand-logo">
      <img id="company-logo" class="company-logo" src="app/style/graphics/logo.svg" alt="Logo" />
    </div>

    <div class="brand-content">
      <p class="brand-description">The World’s Largest Community of SaaS and AI Founders</p>
      <a href="https://saasboomi.org/events/caravan-25/" class="cta-button" target="_blank"> Explore Caravan ‘25 </a>
    </div>
    <!-- New content block starts here -->
    <div class="how-to-win">
      <h2>How to Win</h2>
      <p>Play the Bot-Man game from <strong>11 to 26 August 2025</strong> to enter the top 10 leaderboard. Keep playing
        to hold your position.</p>

      <div class="unlock-rewards">
        <h4>Unlock!</h4>
        <ul>
          <li>🥇 <strong>Rank 1</strong> → 100% off on your pass</li>
          <li>🥈 <strong>Rank 2</strong> → 50% off on your pass</li>
          <li>🥉 <strong>Rank 3</strong> → 25% off on your pass</li>
          <li>🏅 <strong>Rank 4 to 10</strong> → Exclusive Caravan '25 merch</li>
        </ul>
      </div>
      <h2>How to Play
      </h2>
      <p>* Tap the arrow keys to move Bot-Man in the desired direction.<br />
        * Gobble the dots to rack up points.<br />
        * Avoid the ghosts hunting you down.<br />
        * Eat the larger dots to gain a limited-time power that lets you catch ghosts for extra points.<br />
        * Make sure to submit your score when you finish.</p>
    </div>
  </div>
  <div id="overflow-mask" class="overflow-mask">
    <img id="backdrop" class="backdrop" src="app/style/graphics/backdrop.png" alt="Backdrop" />

    <div id="fps-display" class="fps-display"></div>
    <div id="preload-div" class="preload-div"></div>

    <div id="main-menu-container" class="main-menu-container">
      <img id="logo" class="logo" src="app/style/graphics/bot-man.png" alt="Pacman Logo" />
      <div class="sub-heading">
        <h2 style="color: black">THE AI MAZE</h2>
        <h3 style="color: black">Play. Score. Win your pass to Caravan ’25.</h3>
      </div>
      <button id="game-start" class="game-start">PLAY</button>
    </div>
    <div class="header-buttons">
      <div></div>
      <span>
        <button>
          <i id="pause-button" class="material-icons"> pause </i>
        </button>
        <button>
          <i id="sound-button" class="material-icons"></i>
        </button>
      </span>
    </div>

    <div id="paused-text" class="paused-text">PAUSED</div>

    <div id="game-ui" class="game-ui">
      <div id="row-top" class="row top">
        <div class="column _25">
          <div class="one-up">1UP</div>
          <div id="points-display"></div>
        </div>
        <div class="column _50">
          <div>HIGH SCORE</div>
          <div id="high-score-display"></div>
        </div>
      </div>

      <div id="maze" class="maze">
        <img id="maze-img" class="maze-img" src="app/style//graphics/spriteSheets/maze/maze_blue.svg" alt="Maze" />
        <div id="maze-cover" class="maze-cover"></div>
        <div id="dot-container"></div>
        <p id="pacman" class="pacman"></p>
        <p id="pacman-arrow" class="pacman"></p>
        <p id="clyde" class="ghost"></p>
        <p id="inky" class="ghost"></p>
        <p id="pinky" class="ghost"></p>
        <p id="blinky" class="ghost"></p>
      </div>

      <div id="bottom-row" class="row bottom">
        <div id="extra-lives" class="extra-lives"></div>
        <div id="fruit-display" class="fruit-display"></div>
      </div>
    </div>

    <div id="left-cover" class="loading-cover left"></div>
    <div id="right-cover" class="loading-cover right"></div>
    <div id="loading-container" class="loading-container">
      <div id="loading-pacman" class="loading-pacman"></div>
      <div id="loading-dot-mask" class="loading-dot-mask"></div>
      <div class="loading-dot _5"></div>
      <div class="loading-dot _10"></div>
      <div class="loading-dot _15"></div>
      <div class="loading-dot _20"></div>
      <div class="loading-dot _25"></div>
      <div class="loading-dot _30"></div>
      <div class="loading-dot _35"></div>
      <div class="loading-dot _40"></div>
      <div class="loading-dot _45"></div>
      <div class="loading-dot _50"></div>
      <div class="loading-dot _55"></div>
      <div class="loading-dot _60"></div>
      <div class="loading-dot _65"></div>
      <div class="loading-dot _70"></div>
      <div class="loading-dot _75"></div>
      <div class="loading-dot _80"></div>
      <div class="loading-dot _85"></div>
      <div class="loading-dot _90"></div>
      <div class="loading-dot _95"></div>
    </div>
    <!-- Mobile Desktop Suggestion Popup -->
    <div id="mobile-desktop-popup" class="mobile-desktop-popup">
      <div class="mobile-popup-content">
        <h3>📱 ➡️ 💻</h3>
        <p>Use desktop for smooth experience</p>
        <p>This game is optimized for desktop browsers with keyboard controls.</p>
        <div class="mobile-popup-buttons">
          <button id="continue-mobile" class="mobile-popup-button dismiss">Continue Anyway</button>
        </div>
      </div>
    </div>

    <script>
      // Mobile detection and popup functionality
      function isMobileDevice() {
        return window.innerWidth <= 768;
      }

      function showMobilePopup() {
        const popup = document.getElementById("mobile-desktop-popup");
        const continueBtn = document.getElementById("continue-mobile");

        // Check if user has already dismissed the popup
        if (localStorage.getItem("mobile-popup-dismissed") === "true") {
          return;
        }

        if (isMobileDevice()) {
          setTimeout(() => {
            popup.classList.add("show");
          }, 1000); // Show after 1 second delay

          continueBtn.addEventListener("click", () => {
            popup.classList.remove("show");
            localStorage.setItem("mobile-popup-dismissed", "true");
          });
        }
      }

      window.onload = () => {
        let gameCoordinator = new GameCoordinator();
        showMobilePopup();

        // Handle window resize events
        window.addEventListener('resize', () => {
          showMobilePopup();
        });
      };
    </script>
  </div>
  <div class="page-right">
    <div class="right-bottom">
      <div class="terms-and-conditions">
        <h3>Terms and Conditions:</h3>
        <ul>
          <li>You must be a SaaSBoomi Compass member or have passed Caravan ’25 curation with a valid payment link. Not
            a member? Join here.</li>
          <li>Winners will be contacted via email.</li>
          <li>If a winner is not eligible, the next top scorer will take their place.</li>
        </ul>
      </div>
    </div>
  </div>
</body>

</html>