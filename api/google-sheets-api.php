<?php
/**
 * Google Sheets Leaderboard API
 * 
 * Alternative implementation using Google Sheets instead of database
 * Perfect for contests where you need easy data management and export
 * 
 * Setup Instructions:
 * 1. Create a Google Sheets spreadsheet
 * 2. Set up Google Sheets API credentials
 * 3. Update the configuration below
 * 4. Make the sheet accessible to the service account
 * 
 * @author Generated with Claude Code
 * @version 1.0.0
 */

class GoogleSheetsLeaderboardAPI {
    private $spreadsheetId;
    private $credentialsPath;
    private $sheetName;
    private $rateLimiter;
    
    public function __construct() {
        $this->loadConfig();
        $this->initRateLimiter();
        $this->setCorsHeaders();
    }
    
    /**
     * Load configuration
     */
    private function loadConfig() {
        $this->spreadsheetId = $_ENV['GOOGLE_SHEETS_ID'] ?? '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
        $this->credentialsPath = $_ENV['GOOGLE_CREDENTIALS_PATH'] ?? './credentials.json';
        $this->sheetName = $_ENV['SHEET_NAME'] ?? 'Leaderboard';
        
        // Rate limiting config
        $this->rateLimiter = [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            'max_requests' => 50, // Per hour (conservative for Google API limits)
            'window' => 3600
        ];
    }
    
    /**
     * Set CORS headers
     */
    private function setCorsHeaders() {
        header('Content-Type: application/json; charset=utf-8');
        
        $allowedOrigins = [
            'https://stg-saasboomiorg-staging.kinsta.cloud',
            'https://saasboomi.org'
        ];
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: $origin");
        }
        
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
    
    /**
     * Simple rate limiting
     */
    private function checkRateLimit() {
        $ip = $this->rateLimiter['ip'];
        $cacheFile = sys_get_temp_dir() . "/rate_limit_$ip.json";
        
        $now = time();
        $requests = [];
        
        if (file_exists($cacheFile)) {
            $data = json_decode(file_get_contents($cacheFile), true);
            $requests = $data['requests'] ?? [];
        }
        
        // Remove old requests outside the window
        $requests = array_filter($requests, function($timestamp) use ($now) {
            return ($now - $timestamp) < $this->rateLimiter['window'];
        });
        
        // Check if limit exceeded
        if (count($requests) >= $this->rateLimiter['max_requests']) {
            $this->sendError('Rate limit exceeded. Please try again later.', 429);
        }
        
        // Add current request
        $requests[] = $now;
        file_put_contents($cacheFile, json_encode(['requests' => $requests]));
    }
    
    /**
     * Get Google Sheets service
     */
    private function getGoogleSheetsService() {
        if (!file_exists($this->credentialsPath)) {
            throw new Exception('Google credentials file not found');
        }
        
        // This is a simplified example. In production, you'd use Google's PHP client library
        // composer require google/apiclient
        /*
        require_once 'vendor/autoload.php';
        
        $client = new Google_Client();
        $client->setAuthConfig($this->credentialsPath);
        $client->addScope(Google_Service_Sheets::SPREADSHEETS);
        
        return new Google_Service_Sheets($client);
        */
        
        // For now, return mock service for demonstration
        return new MockGoogleSheetsService($this->spreadsheetId, $this->sheetName);
    }
    
    /**
     * Main request handler
     */
    public function handleRequest() {
        try {
            $action = $_GET['action'] ?? '';
            $method = $_SERVER['REQUEST_METHOD'];
            
            switch (strtolower($action)) {
                case 'submit':
                    if ($method !== 'POST') {
                        $this->sendError('POST method required', 405);
                    }
                    $this->submitScore();
                    break;
                    
                case 'leaderboard':
                    if ($method !== 'GET') {
                        $this->sendError('GET method required', 405);
                    }
                    $this->getLeaderboard();
                    break;
                    
                case 'top-player':
                    if ($method !== 'GET') {
                        $this->sendError('GET method required', 405);
                    }
                    $this->getTopPlayer();
                    break;
                    
                case 'stats':
                    if ($method !== 'GET') {
                        $this->sendError('GET method required', 405);
                    }
                    $this->getStats();
                    break;
                    
                case 'health':
                    $this->healthCheck();
                    break;
                    
                default:
                    $this->sendError('Invalid action', 400);
            }
            
        } catch (Exception $e) {
            $this->sendError('Internal server error: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Submit score to Google Sheets
     */
    private function submitScore() {
        $this->checkRateLimit();
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['score'])) {
            $this->sendError('Invalid input', 400);
        }
        
        $playerName = $this->sanitize($input['player_name'] ?? 'Anonymous');
        $email = $this->sanitize($input['email'] ?? '');
        $phone = $this->sanitize($input['phone'] ?? '');
        $score = (int) $input['score'];
        $level = (int) ($input['level'] ?? 1);
        
        // Validate email if provided
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->sendError('Invalid email format', 400);
        }
        
        try {
            $sheetsService = $this->getGoogleSheetsService();
            
            // Append row to sheet
            $rowData = [
                date('Y-m-d H:i:s'), // Timestamp
                $playerName,
                $email,
                $phone,
                $score,
                $level,
                $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ];
            
            $result = $sheetsService->appendRow($rowData);
            
            // Calculate position (simplified - in production you'd sort and find position)
            $position = $sheetsService->getRowCount();
            
            $this->sendSuccess([
                'id' => $position,
                'player_name' => $playerName,
                'email' => $email,
                'phone' => $phone,
                'score' => $score,
                'level' => $level,
                'position' => $position,
                'made_top_10' => $position <= 10,
                'is_new_record' => $sheetsService->isNewRecord($score),
                'submitted_at' => date('Y-m-d H:i:s')
            ], 'Score submitted successfully');
            
        } catch (Exception $e) {
            $this->sendError('Failed to submit score: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get leaderboard from Google Sheets
     */
    private function getLeaderboard() {
        try {
            $limit = min((int) ($_GET['limit'] ?? 10), 50);
            $sheetsService = $this->getGoogleSheetsService();
            
            $scores = $sheetsService->getTopScores($limit);
            
            $this->sendSuccess($scores, 'Leaderboard retrieved successfully');
            
        } catch (Exception $e) {
            $this->sendError('Failed to retrieve leaderboard: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get top player
     */
    private function getTopPlayer() {
        try {
            $sheetsService = $this->getGoogleSheetsService();
            $topPlayer = $sheetsService->getTopPlayer();
            
            $this->sendSuccess($topPlayer, 'Top player retrieved successfully');
            
        } catch (Exception $e) {
            $this->sendError('Failed to retrieve top player: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get statistics
     */
    private function getStats() {
        try {
            $sheetsService = $this->getGoogleSheetsService();
            $stats = $sheetsService->getStatistics();
            
            $this->sendSuccess($stats, 'Statistics retrieved successfully');
            
        } catch (Exception $e) {
            $this->sendError('Failed to retrieve statistics: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Health check
     */
    private function healthCheck() {
        $health = [
            'status' => 'healthy',
            'service' => 'Google Sheets Leaderboard API',
            'version' => '1.0.0',
            'timestamp' => date('c'),
            'storage' => 'Google Sheets'
        ];
        
        try {
            $sheetsService = $this->getGoogleSheetsService();
            $health['sheets'] = [
                'status' => 'connected',
                'spreadsheet_id' => $this->spreadsheetId,
                'sheet_name' => $this->sheetName
            ];
        } catch (Exception $e) {
            $health['sheets'] = [
                'status' => 'error',
                'message' => $e->getMessage()
            ];
            http_response_code(503);
        }
        
        echo json_encode($health, JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * Sanitize input
     */
    private function sanitize($input) {
        return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }
    
    /**
     * Send success response
     */
    private function sendSuccess($data, $message = 'Success') {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c')
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * Send error response
     */
    private function sendError($message, $code = 400) {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'error' => $message,
            'timestamp' => date('c')
        ], JSON_PRETTY_PRINT);
        exit;
    }
}

/**
 * Mock Google Sheets Service (for demonstration)
 * Replace with actual Google Sheets API implementation
 */
class MockGoogleSheetsService {
    private $spreadsheetId;
    private $sheetName;
    private $dataFile;
    
    public function __construct($spreadsheetId, $sheetName) {
        $this->spreadsheetId = $spreadsheetId;
        $this->sheetName = $sheetName;
        $this->dataFile = sys_get_temp_dir() . '/mock_sheets_data.json';
    }
    
    public function appendRow($rowData) {
        $data = $this->loadData();
        $data[] = $rowData;
        $this->saveData($data);
        return true;
    }
    
    public function getTopScores($limit = 10) {
        $data = $this->loadData();
        
        // Sort by score (column 4) descending
        usort($data, function($a, $b) {
            return ($b[4] ?? 0) - ($a[4] ?? 0);
        });
        
        $scores = [];
        for ($i = 0; $i < min($limit, count($data)); $i++) {
            $row = $data[$i];
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
    
    public function getTopPlayer() {
        $scores = $this->getTopScores(1);
        if (empty($scores)) {
            return [
                'top_player' => null,
                'top_score' => 0,
                'level' => 0,
                'achieved_at' => null
            ];
        }
        
        $top = $scores[0];
        return [
            'top_player' => $top['player_name'],
            'top_score' => $top['score'],
            'level' => $top['level'],
            'achieved_at' => $top['achieved_at']
        ];
    }
    
    public function getStatistics() {
        $data = $this->loadData();
        $scores = array_map(function($row) { return (int) ($row[4] ?? 0); }, $data);
        
        return [
            'total_scores' => count($data),
            'highest_score' => count($scores) > 0 ? max($scores) : 0,
            'average_score' => count($scores) > 0 ? round(array_sum($scores) / count($scores), 2) : 0,
            'highest_level' => count($data) > 0 ? max(array_map(function($row) { return (int) ($row[5] ?? 1); }, $data)) : 0,
            'unique_players' => count(array_unique(array_map(function($row) { return $row[1] ?? 'Anonymous'; }, $data))),
            'active_days' => 1
        ];
    }
    
    public function getRowCount() {
        return count($this->loadData());
    }
    
    public function isNewRecord($score) {
        $data = $this->loadData();
        if (empty($data)) return true;
        
        $maxScore = max(array_map(function($row) { return (int) ($row[4] ?? 0); }, $data));
        return $score > $maxScore;
    }
    
    private function loadData() {
        if (!file_exists($this->dataFile)) {
            return [];
        }
        
        $content = file_get_contents($this->dataFile);
        return json_decode($content, true) ?: [];
    }
    
    private function saveData($data) {
        file_put_contents($this->dataFile, json_encode($data, JSON_PRETTY_PRINT));
    }
}

// Handle the request
try {
    $api = new GoogleSheetsLeaderboardAPI();
    $api->handleRequest();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'timestamp' => date('c')
    ]);
}
?>