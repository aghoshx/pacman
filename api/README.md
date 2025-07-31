# Leaderboard API Documentation

A professional, secure API for managing Pac-Man game leaderboards with clean URLs and enterprise-grade security.

## Features

- ✅ **Clean URLs** - RESTful endpoints without .php extensions
- ✅ **Security** - .htaccess protection, rate limiting, input validation
- ✅ **Professional** - Proper routing, error handling, health checks
- ✅ **Configurable** - Environment-based configuration
- ✅ **CORS** - Cross-origin request support
- ✅ **Statistics** - Built-in analytics endpoint
- ✅ **Protected** - Environment files and sensitive endpoints blocked

## Setup

1. Copy `.env.example` to `.env` and configure your database credentials
2. Ensure your web server has PHP 7.4+ with PDO MySQL extension and mod_rewrite
3. The API will automatically create the database table on first run
4. Access the API at: `https://dev.matsio.com/game-api`

## Clean API Endpoints

Base URL: `https://dev.matsio.com/game-api`

### Submit Score
```bash
POST https://dev.matsio.com/game-api/submit
Content-Type: application/json

{
    "score": 12350,
    "player_name": "PlayerOne",
    "level": 5
}
```

**Response:**
```json
{
    "success": true,
    "message": "Score submitted successfully",
    "data": {
        "id": 123,
        "player_name": "PlayerOne",
        "score": 12350,
        "level": 5,
        "position": 3,
        "made_top_10": true,
        "is_new_record": false,
        "submitted_at": "2024-01-15 10:30:00"
    }
}
```

### Get Leaderboard
```bash
GET https://dev.matsio.com/game-api/leaderboard?limit=10
```

**Response:**
```json
{
    "success": true,
    "message": "Leaderboard retrieved successfully",
    "data": [
        {
            "position": 1,
            "player_name": "TopPlayer",
            "score": 50000,
            "level": 12,
            "achieved_at": "2024-01-15 09:15:30"
        }
    ]
}
```

### Get Top Player
```bash
GET https://dev.matsio.com/game-api/top-player
```

### Get Statistics
```bash
GET https://dev.matsio.com/game-api/stats
```

### Health Check
```bash
GET https://dev.matsio.com/game-api/health
```

**Response:**
```json
{
    "success": true,
    "message": "Statistics retrieved successfully",
    "data": {
        "total_scores": 1250,
        "highest_score": 87650,
        "average_score": 15420.50,
        "highest_level": 15,
        "unique_players": 342,
        "active_days": 28
    }
}
```

## Error Handling

All errors return a consistent format:

```json
{
    "success": false,
    "error": "Error message description",
    "timestamp": "2024-01-15T10:30:00+00:00"
}
```

## Rate Limiting

- Default: 60 requests per hour per IP address
- Configurable via `RATE_LIMIT` environment variable
- Returns HTTP 429 when limit exceeded

## Security Features

- **SQL Injection Protection** - All queries use prepared statements
- **Input Validation** - Strict validation on all inputs
- **Rate Limiting** - Prevents abuse and spam
- **CORS Configuration** - Secure cross-origin handling
- **Data Sanitization** - All user inputs are sanitized
- **Environment Variables** - Sensitive data not in code

## Migration from Old API

The new API is backward compatible. Update your frontend calls:

**Old:**
```javascript
// Multiple endpoint files
fetch('/api/submit-score.php', {...})
fetch('/api/top-scores.php')
fetch('/api/get-top-player.php')
```

**New:**
```javascript
// Clean RESTful URLs
fetch('https://dev.matsio.com/game-api/submit', {...})
fetch('https://dev.matsio.com/game-api/leaderboard')
fetch('https://dev.matsio.com/game-api/top-player')
fetch('https://dev.matsio.com/game-api/stats')
```

## Security Features

### File Protection (.htaccess)
- ✅ **Environment files blocked** - `.env`, `.env.*` files are inaccessible
- ✅ **Log files protected** - `*.log` files cannot be accessed
- ✅ **Core API protected** - Direct access to `leaderboard-api.php` blocked
- ✅ **Documentation hidden** - `README.md` and `migrate.php` not accessible
- ✅ **Security headers** - XSS protection, MIME sniffing prevention, frame denial
- ✅ **HTTPS enforcement** - Optional redirect to secure connections
- ✅ **Directory browsing disabled** - No file listing
- ✅ **Compression enabled** - Better performance for API responses

### API Security
- **Rate limiting** - 60 requests per hour per IP (configurable)
- **Input validation** - All inputs sanitized and validated
- **SQL injection protection** - Prepared statements only
- **Error handling** - No sensitive data in error messages
- **CORS configuration** - Secure cross-origin handling

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | Database host |
| `DB_NAME` | saasboomi_game | Database name |
| `DB_USER` | saasboomi_game | Database username |
| `DB_PASS` | - | Database password |
| `MAX_SCORES` | 10 | Maximum scores in leaderboard |
| `RATE_LIMIT` | 60 | Requests per hour per IP |
| `MAX_NAME_LENGTH` | 50 | Maximum player name length |
| `MAX_SCORE` | 999999 | Maximum allowed score |