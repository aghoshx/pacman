# 🚀 Pac-Man API Deployment Guide

Professional deployment checklist for the consolidated Leaderboard API.

## 📋 Pre-Deployment Checklist

### ✅ Required Files
- [x] `index.php` - Main API router with clean URLs
- [x] `leaderboard-api.php` - Core API functionality  
- [x] `.htaccess` - Security and URL rewriting rules
- [x] `.env.example` - Environment template
- [x] `README.md` - Complete documentation

### ✅ File Structure
```

├── index.php           # Clean URL router
├── leaderboard-api.php # Main API (protected by .htaccess)
├── .htaccess          # Security & URL rewriting
├── .env.example       # Configuration template
├── .env               # Your actual config (create from example)
├── README.md          # Documentation
└── migrate.php        # Migration helper (blocked by .htaccess)
```

## 🔒 Security Checklist

### ✅ File Permissions
```bash
# Set secure file permissions
chmod 644 index.php leaderboard-api.php .htaccess README.md
chmod 600 .env  # Most restrictive for sensitive config
chmod 755   # Directory permissions
```

### ✅ Environment Variables
1. Copy `.env.example` to `.env`
2. Update database credentials in `.env`
3. Set production-specific values:
```bash
DB_HOST=your_production_host
DB_NAME=your_production_db
DB_USER=your_production_user
DB_PASS=your_secure_password
RATE_LIMIT=100  # Adjust for production traffic
MAX_SCORE=999999
```

### ✅ Web Server Configuration
- **Apache**: Ensure `mod_rewrite` is enabled
- **PHP**: Version 7.4+ with PDO MySQL extension
- **MySQL**: Database and user created with proper permissions

## 🌐 Clean URL Endpoints

After deployment, your API will be available at:

### Primary Endpoints
- `POST https://dev.matsio.com/game-api/submit` - Submit scores
- `GET https://dev.matsio.com/game-api/leaderboard` - Get top scores  
- `GET https://dev.matsio.com/game-api/top-player` - Get #1 player
- `GET https://dev.matsio.com/game-api/stats` - Get statistics

### Utility Endpoints
- `GET https://dev.matsio.com/game-api/health` - Health check
- `GET https://dev.matsio.com/game-api/` - API documentation

## 🧪 Testing Commands

### Health Check
```bash
curl -X GET "https://dev.matsio.com/game-api/health"
```

### Submit Test Score
```bash
curl -X POST "https://dev.matsio.com/game-api/submit" \
  -H "Content-Type: application/json" \
  -d '{"score": 12350, "player_name": "TestPlayer", "level": 5}'
```

### Get Leaderboard
```bash
curl -X GET "https://dev.matsio.com/game-api/leaderboard?limit=5"
```

## ⚡ Performance Optimizations

### ✅ Enabled Features
- **Gzip compression** for JSON responses
- **Database indexing** on score and timestamp
- **Connection pooling** via PDO
- **Response caching headers** configured

### 🔍 Monitoring
- Check error logs regularly: `/var/log/apache2/error.log`
- Monitor database performance
- Track API response times
- Watch for rate limit hits

## 🔄 Migration from Old API

### Frontend Updates Required
Update your JavaScript to use clean URLs:

```javascript
// OLD (remove these)
const oldUrls = [
  '/api/submit-score.php',
  '/api/top-scores.php', 
  '/api/get-top-player.php'
];

// NEW (use these)
const baseUrl = 'https://dev.matsio.com/game-api';
const newUrls = [
  `${baseUrl}/submit`,
  `${baseUrl}/leaderboard`,
  `${baseUrl}/top-player`,
  `${baseUrl}/stats`
];
```

### Database Migration
The new API will automatically:
- Create missing table columns (`level`, `ip_address`, `user_agent`)
- Add proper indexes for performance
- Maintain existing score data

## 🚨 Troubleshooting

### Common Issues

**404 Errors on Clean URLs**
- Check `mod_rewrite` is enabled
- Verify `.htaccess` file is readable
- Ensure `AllowOverride All` in Apache config

**Database Connection Errors**
- Verify `.env` file exists and is readable
- Check database credentials
- Ensure PDO MySQL extension is installed

**Rate Limit Issues**
- Adjust `RATE_LIMIT` in `.env`
- Clear rate limit data: `DELETE FROM leaderboard WHERE ip_address = 'problem_ip' AND created_at < NOW() - INTERVAL 1 HOUR`

**Permission Denied**
- Check file permissions (644 for PHP files, 600 for .env)
- Verify web server user can read files
- Ensure directory permissions (755)

## 📊 Success Metrics

After deployment, you should see:
- ✅ All endpoints responding with proper JSON
- ✅ Health check returns database connection status
- ✅ Rate limiting working (429 responses when exceeded)  
- ✅ Security headers present in responses
- ✅ Error logs clean (no PHP errors)
- ✅ Frontend game submitting scores successfully

## 🎯 Go-Live Checklist

- [ ] Database credentials updated in `.env`
- [ ] File permissions set correctly
- [ ] Apache mod_rewrite enabled
- [ ] Health check endpoint responding
- [ ] Frontend updated to use new URLs
- [ ] Rate limiting tested and working
- [ ] Error monitoring in place
- [ ] Backup of old API files created
- [ ] Load testing completed
- [ ] Documentation updated with live URLs

## 🆘 Emergency Rollback

If issues arise, quickly rollback by:
1. Rename current `index.php` to `index.php.new`
2. Restore old API files from backup
3. Update frontend to use old URLs temporarily
4. Investigate and fix issues
5. Re-deploy when ready

---

**🎉 Deployment Complete!**

Your professional Pac-Man Leaderboard API is now live with:
- Clean, RESTful URLs
- Enterprise-grade security  
- Comprehensive error handling
- Built-in monitoring and health checks
- Rate limiting and abuse protection