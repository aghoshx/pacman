# 📊 Google Sheets API Setup Guide

Complete guide for using Google Sheets instead of a database for your Pac-Man leaderboard.

## 🎯 Why Google Sheets for Contests?

**Perfect for Caravan '25 contest because:**
- ✅ **Easy winner management** - View all entries in familiar spreadsheet format
- ✅ **Real-time collaboration** - Team can review entries together  
- ✅ **Built-in export** - Download contact info for winner outreach
- ✅ **No database server** required
- ✅ **Automatic backups** - Google handles data safety
- ✅ **Manual verification** - Easy to validate entries and check for duplicates

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create new spreadsheet: "Caravan 25 - Pac-Man Leaderboard"
3. Set up columns in Row 1:
   ```
   A: Timestamp  B: Name  C: Email  D: Phone  E: Score  F: Level  G: IP  H: User Agent
   ```

### Step 2: Get Google Sheets API Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Pacman-Leaderboard"
3. Enable Google Sheets API
4. Create Service Account credentials
5. Download credentials JSON file
6. Share your spreadsheet with the service account email (give Editor access)

### Step 3: Install & Configure
```bash
# Install Google API client
composer require google/apiclient

# Copy your credentials
cp downloaded-credentials.json /path/to/api/credentials.json
```

### Step 4: Environment Setup
Create `.env` file:
```bash
# Google Sheets Configuration
GOOGLE_SHEETS_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
GOOGLE_CREDENTIALS_PATH=./credentials.json  
SHEET_NAME=Leaderboard
```

### Step 5: Switch API Endpoint
Update your game config:
```javascript
window.GAME_CONFIG = {
  API_URL: 'https://dev.matsio.com/game-api-sheets'  // Point to Google Sheets version
};
```

## 📋 Detailed Implementation

### Production Google Sheets Service
Replace the `MockGoogleSheetsService` with real implementation:

```php
<?php
require_once 'vendor/autoload.php';

class GoogleSheetsService {
    private $service;
    private $spreadsheetId;
    private $sheetName;
    
    public function __construct($spreadsheetId, $sheetName, $credentialsPath) {
        $client = new Google_Client();
        $client->setAuthConfig($credentialsPath);
        $client->addScope(Google_Service_Sheets::SPREADSHEETS);
        
        $this->service = new Google_Service_Sheets($client);
        $this->spreadsheetId = $spreadsheetId;
        $this->sheetName = $sheetName;
    }
    
    public function appendRow($rowData) {
        $range = $this->sheetName . '!A:H';
        $values = [$rowData];
        
        $body = new Google_Service_Sheets_ValueRange([
            'values' => $values
        ]);
        
        $params = [
            'valueInputOption' => 'RAW'
        ];
        
        return $this->service->spreadsheets_values->append(
            $this->spreadsheetId,
            $range,
            $body,
            $params
        );
    }
    
    public function getTopScores($limit = 10) {
        // Get all data
        $range = $this->sheetName . '!A:H';
        $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
        $values = $response->getValues();
        
        if (empty($values)) return [];
        
        // Remove header row
        array_shift($values);
        
        // Sort by score (column E, index 4) descending
        usort($values, function($a, $b) {
            return ($b[4] ?? 0) - ($a[4] ?? 0);
        });
        
        // Format response
        $scores = [];
        for ($i = 0; $i < min($limit, count($values)); $i++) {
            $row = $values[$i];
            $scores[] = [
                'position' => $i + 1,
                'player_name' => $row[1] ?? 'Anonymous',
                'score' => (int) ($row[4] ?? 0),
                'level' => (int) ($row[5] ?? 1),
                'achieved_at' => $row[0] ?? date('Y-m-d H:i:s')
            ];
        }
        
        return $scores;
    }
    
    // ... other methods
}
?>
```

## 🔧 Configuration Options

### Environment Variables
```bash
# Required
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_CREDENTIALS_PATH=./path/to/credentials.json
SHEET_NAME=Leaderboard

# Optional  
RATE_LIMIT=50  # Requests per hour (Google API limits)
MAX_SCORE=999999
```

### Spreadsheet Structure
| Column | Field | Purpose |
|--------|-------|---------|
| A | Timestamp | When score was submitted |
| B | Name | Player name |
| C | Email | Winner contact (required) |
| D | Phone | Winner contact (optional) |
| E | Score | Game score |
| F | Level | Level reached |
| G | IP | For duplicate prevention |
| H | User Agent | Browser info |

## 📊 Spreadsheet Formulas

Add these formulas for automatic insights:

### Winner Analysis (Row 1, starting column J)
```
J1: =QUERY(A:H,"SELECT B,C,D,E WHERE E > 0 ORDER BY E DESC LIMIT 10",1)
```

### Statistics (Column L)
```
L1: ="Total Players"
L2: =COUNTA(B:B)-1
L3: ="Highest Score" 
L4: =MAX(E:E)
L5: ="Average Score"
L6: =AVERAGE(E:E)
```

### Data Validation
```
M1: ="Duplicate Emails"
M2: =QUERY(A:H,"SELECT C, COUNT(C) WHERE C != '' GROUP BY C HAVING COUNT(C) > 1",1)
```

## 🏆 Contest Management

### Winner Selection
1. **Auto-sort by score** - Highest scores at top
2. **Duplicate detection** - Check for same email/IP
3. **Eligibility verification** - Manual review of winners
4. **Contact export** - Download winner contact info

### Manual Review Process
1. Sort by score (highest first)
2. Check top 10 for eligibility
3. Verify email addresses are valid
4. Contact winners in order
5. If winner ineligible, move to next

### Export Winner Data
1. File → Download → CSV
2. Filter top scores
3. Import into email system
4. Send winner notifications

## ⚠️ Important Considerations

### Rate Limits
- **Google Sheets API**: 100 requests per 100 seconds per user
- **Recommended**: Set rate limit to 50 requests/hour
- **Peak traffic**: Monitor and adjust limits

### Data Privacy
- **Email collection**: Ensure GDPR compliance
- **Data retention**: Set clear policies
- **Access control**: Limit who can view sheet

### Performance
- **Read performance**: Good for leaderboards
- **Write performance**: May be slower than database
- **Concurrent writes**: Handle carefully

### Security
- **Service account**: Use dedicated account with minimal permissions
- **Credentials**: Store securely, not in public repos
- **Sheet sharing**: Only share with necessary team members

## 🔄 Migration Path

### From Database to Sheets
```php
// Export existing data
$stmt = $pdo->query("SELECT * FROM leaderboard ORDER BY created_at");
while ($row = $stmt->fetch()) {
    $sheetsService->appendRow([
        $row['created_at'],
        $row['player_name'], 
        $row['email'],
        $row['phone'],
        $row['score'],
        $row['level'],
        $row['ip_address'],
        $row['user_agent']
    ]);
}
```

### A/B Testing
Run both systems in parallel:
```php
// Submit to both database and sheets
$database->submitScore($data);
$sheets->submitScore($data);

// Compare results for accuracy
```

## 📈 Analytics & Insights

Google Sheets provides built-in analytics:
- **Charts**: Auto-generate score distribution charts
- **Pivot Tables**: Analyze by time, location, device
- **Conditional Formatting**: Highlight top scores
- **Data Studio**: Create dashboards for contest metrics

## 🎯 Perfect for Caravan '25

This setup is ideal for your contest because:
1. **Easy winner management** - All data in one spreadsheet
2. **Team collaboration** - Multiple people can review entries
3. **Manual verification** - Check eligibility before announcing winners
4. **Contact management** - All winner contact info readily available
5. **Data export** - Easy to get lists for follow-up

---

**🚀 Ready to switch?** The Google Sheets implementation provides all the same functionality as the database version, but with the added benefit of easy data management for your contest!