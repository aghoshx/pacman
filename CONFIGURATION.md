# 🎮 Game Configuration Guide

This document explains how to configure the Pac-Man game for different environments and customize API endpoints.

## 📋 Quick Setup

### Option 1: Use the Standalone Config File (Recommended)
Include the configuration file before your main game script:

```html
<script src="game-config.js"></script>
<script src="build/app.js"></script>
```

### Option 2: Manual Configuration
Set configuration directly in your HTML:

```javascript
window.GAME_CONFIG = {
  API_URL: 'https://your-api-domain.com/game-api',
  DEBUG_MODE: false,
  REFRESH_INTERVAL_MS: 30000
};
```

## 🔧 Configuration Options

### API Settings
```javascript
{
  API_URL: 'https://dev.matsio.com/game-api',  // Base API URL
  MAX_LEADERBOARD_ENTRIES: 10,                // Max scores to show
  AUTO_REFRESH_ENABLED: true,                 // Enable auto-refresh
  REFRESH_INTERVAL_MS: 30000                  // Refresh every 30 seconds
}
```

### Environment Detection
The system auto-detects your environment:

| Environment | Hostname | API URL | Debug |
|-------------|----------|---------|-------|
| **Development** | `localhost`, `127.0.0.1` | `/api/leaderboard-api.php` | `true` |
| **Staging** | `stg-saasboomiorg-staging.kinsta.cloud` | `https://dev.matsio.com/game-api` | `true` |
| **Production** | `saasboomi.org` | `https://dev.matsio.com/game-api` | `false` |

## 🌍 Environment-Specific Setup

### Local Development
```javascript
// Automatically detected - no configuration needed
// Uses: /api/leaderboard-api.php
```

### Staging Environment
```javascript
// Automatically detected - no configuration needed  
// Uses: https://dev.matsio.com/game-api
```

### Production Environment
```javascript
// Automatically detected - no configuration needed
// Uses: https://dev.matsio.com/game-api
```

### Custom Environment
```javascript
window.GAME_CONFIG = {
  API_URL: 'https://your-custom-api.com/endpoint',
  DEBUG_MODE: false,
  REFRESH_INTERVAL_MS: 60000 // 1 minute
};
```

## 📝 Configuration Files

### Primary Files

1. **`game-config.js`** - Standalone configuration file (recommended)
2. **`app/scripts/config.js`** - Internal config system (part of build)
3. **`config.html`** - HTML-based config (alternative)

### File Priority
Configuration is loaded in this order (highest priority first):

1. `window.GAME_CONFIG` (manual override)
2. Environment auto-detection
3. Default fallback values

## 🚀 Deployment Examples

### Basic HTML Integration
```html
<!DOCTYPE html>
<html>
<head>
  <title>Pac-Man Game</title>
</head>
<body>
  <!-- Load configuration first -->
  <script src="game-config.js"></script>

  <!-- Then load the game -->
  <script src="build/app.js"></script>
</body>
</html>
```

### Custom API Endpoint
```html
<script>
// Override API URL for your specific setup
window.GAME_CONFIG = {
  API_URL: 'https://my-game-api.herokuapp.com',
  DEBUG_MODE: true
};
</script>
<script src="build/app.js"></script>
```

### Disable Auto-refresh
```javascript
window.GAME_CONFIG = {
  AUTO_REFRESH_ENABLED: false  // Manual refresh only
};
```

## 🐛 Debug Mode

Enable debug mode to see configuration info:

```javascript
window.GAME_CONFIG = {
  DEBUG_MODE: true
};
```

Debug mode shows:
- Current environment
- API endpoint being used  
- Refresh settings
- Configuration loaded successfully

## 📊 Advanced Configuration

### Custom Settings
```javascript
window.GAME_CONFIG = {
  // Standard settings
  API_URL: 'https://api.example.com/game',
  
  // Custom application settings
  CUSTOM: {
    SHOW_FPS: true,
    ENABLE_CHEATS: false,
    THEME: 'dark',
    LANGUAGE: 'en'
  }
};
```

### Multiple Environments
```javascript
// Dynamic configuration based on subdomain
const subdomain = window.location.hostname.split('.')[0];

const configs = {
  'dev': { API_URL: 'https://dev-api.example.com' },
  'staging': { API_URL: 'https://staging-api.example.com' },
  'production': { API_URL: 'https://api.example.com' }
};

window.GAME_CONFIG = configs[subdomain] || configs.production;
```

## ✅ Verification

Check if configuration loaded correctly:

```javascript
// In browser console
console.log('Game Config:', window.GameConfig);
console.log('API URL:', window.GameConfig.api.baseUrl);
```

## 🔧 Troubleshooting

### Common Issues

**API not loading scores**
- Check `window.GameConfig.api.baseUrl` in console
- Verify API endpoint is accessible
- Check CORS configuration

**Auto-refresh not working**
- Ensure `AUTO_REFRESH_ENABLED: true`
- Check `REFRESH_INTERVAL_MS` value
- Verify no JavaScript errors in console

**Wrong environment detected**
- Manually set `window.GAME_CONFIG.API_URL`
- Check hostname detection logic
- Use custom configuration override

## 📁 File Structure
```
/
├── game-config.js          # Standalone config (recommended)
├── config.html            # HTML-based config  
├── app/scripts/config.js   # Internal config system
├── index.html             # Main game file
└── build/app.js           # Compiled game code
```

---

**🎯 Quick Start:** Just include `game-config.js` before your game script and you're ready to go with automatic environment detection!