<?php
/**
 * Production Google Sheets Leaderboard API
 * 
 * Live implementation using real Google Sheets API
 * Perfect for Caravan '25 contest management
 * 
 * @author Generated with Claude Code  
 * @version 1.0.0
 */

require_once 'vendor/autoload.php';

class ProductionGoogleSheetsAPI
{
    private $service;
    private $spreadsheetId;
    private $sheetName;
    private $rateLimiter;

    public function __construct() {
        $this->loadConfig();
        $this->initGoogleSheets();
        $this->initRateLimiter();
        $this->setCorsHeaders();
    }
    private function initRateLimiter() {
        $this->rateLimiter = [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            'window' => 3600, // 1 hour
            'max_requests' => 30, // Conservative for Google API limits
        ];
    }
    /**
     * Load configuration
     */
    private function loadConfig() {
        // Load environment variables if available
        if (file_exists('.env')) {
            $env = parse_ini_file('.env');
            if ($env) {
                foreach ($env as $key => $value) {
                    $_ENV[$key] = $value;
                }
            }
        }

        $this->spreadsheetId = '196hFMyXpn2Nqw6_XyS2Fzho1dwC7ONshiqcPG0MeP9E';
        $this->sheetName = $_ENV['SHEET_NAME'] ?? 'Sheet1';

        $this->rateLimiter = [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            'max_requests' => 30, // Conservative for Google API limits
            'window' => 3600 // 1 hour
        ];
    }

    /**
     * Initialize Google Sheets service
     */
    private function initGoogleSheets() {
        try {
            $credentialsPath = __DIR__ . '/credentials.json';

            if (!file_exists($credentialsPath)) {
                throw new Exception('Google credentials file not found at: ' . $credentialsPath);
            }

            $client = new Google_Client();
            $client->setAuthConfig($credentialsPath);
            $client->addScope(Google_Service_Sheets::SPREADSHEETS);

            // Use service account authentication
            $client->useApplicationDefaultCredentials();

            $this->service = new Google_Service_Sheets($client);

        } catch (Exception $e) {
            error_log("Google Sheets initialization failed: " . $e->getMessage());
            throw new Exception('Failed to initialize Google Sheets service');
        }
    }

    /**
     * Set CORS headers for specific domains
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
        $cacheFile = sys_get_temp_dir() . "/sheets_rate_limit_$ip.json";

        $now = time();
        $requests = [];

        if (file_exists($cacheFile)) {
            $data = json_decode(file_get_contents($cacheFile), true);
            $requests = $data['requests'] ?? [];
        }

        // Remove old requests outside the window
        $requests = array_filter($requests, function ($timestamp) use ($now) {
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
            error_log("API Error: " . $e->getMessage());
            $this->sendError('Internal server error', 500);
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

        // Validate and sanitize input
        $playerName = $this->sanitize($input['player_name'] ?? 'Anonymous');
        $email = $this->sanitize($input['email'] ?? '');
        $phone = $this->sanitize($input['phone'] ?? '');
        $score = (int) $input['score'];
        $level = (int) ($input['level'] ?? 1);

        // Validate required fields
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->sendError('Valid email is required', 400);
        }

        if ($score < 0 || $score > 999999) {
            $this->sendError('Invalid score value', 400);
        }

        try {
            // Prepare row data
            $rowData = [
                date('Y-m-d H:i:s'), // Timestamp
                $playerName,         // Name
                $email,              // Email
                $phone,              // Phone
                $score,              // Score
                $level,              // Level
                $_SERVER['REMOTE_ADDR'] ?? '', // IP
                $_SERVER['HTTP_USER_AGENT'] ?? '' // User Agent
            ];

            // Append to Google Sheets
            $range = $this->sheetName . '!A:H';
            $values = [$rowData];

            $body = new Google_Service_Sheets_ValueRange([
                'values' => $values
            ]);

            $params = [
                'valueInputOption' => 'RAW'
            ];

            $result = $this->service->spreadsheets_values->append(
                $this->spreadsheetId,
                $range,
                $body,
                $params
            );

            // Calculate position and check if it's a new record
            $position = $this->calculatePosition($score);
            $isNewRecord = $this->isNewRecord($score);

            $this->sendSuccess([
                'id' => time(), // Use timestamp as ID for sheets
                'player_name' => $playerName,
                'email' => $email,
                'phone' => $phone,
                'score' => $score,
                'level' => $level,
                'position' => $position,
                'made_top_10' => $position <= 10,
                'is_new_record' => $isNewRecord,
                'submitted_at' => date('Y-m-d H:i:s')
            ], 'Score submitted successfully');

        } catch (Exception $e) {
            error_log("Sheet submission error: " . $e->getMessage());
            $this->sendError('Failed to submit score', 500);
        }
    }

    /**
     * Get leaderboard from Google Sheets
     */
    private function getLeaderboard() {
        try {
            $limit = min((int) ($_GET['limit'] ?? 10), 50);

            // Get all data from the sheet
            $range = $this->sheetName . '!A:H';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();

            if (empty($values)) {
                $this->sendSuccess([], 'Leaderboard retrieved successfully');
                return;
            }

            // Remove header row if it exists
            if (isset($values[0]) && !is_numeric($values[0][4] ?? '')) {
                array_shift($values);
            }

            // Sort by score (column E, index 4) descending
            usort($values, function ($a, $b) {
                $scoreA = (int) ($a[4] ?? 0);
                $scoreB = (int) ($b[4] ?? 0);
                return $scoreB - $scoreA;
            });

            // Format response
            $scores = [];
            for ($i = 0; $i < min($limit, count($values)); $i++) {
                $row = $values[$i];
                if (empty($row) || !isset($row[4]))
                    continue;

                $scores[] = [
                    'position' => $i + 1,
                    'player_name' => $row[1] ?? 'Anonymous',
                    'score' => (int) ($row[4] ?? 0),
                    'level' => (int) ($row[5] ?? 1),
                    'achieved_at' => $row[0] ?? date('Y-m-d H:i:s')
                ];
            }

            $this->sendSuccess($scores, 'Leaderboard retrieved successfully');

        } catch (Exception $e) {
            error_log("Leaderboard retrieval error: " . $e->getMessage());
            $this->sendError('Failed to retrieve leaderboard', 500);
        }
    }

    /**
     * Get top player
     */
    private function getTopPlayer() {
        try {
            $range = $this->sheetName . '!A:H';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();

            if (empty($values)) {
                $this->sendSuccess([
                    'top_player' => null,
                    'top_score' => 0,
                    'level' => 0,
                    'achieved_at' => null
                ], 'Top player retrieved successfully');
                return;
            }

            // Remove header row if it exists
            if (isset($values[0]) && !is_numeric($values[0][4] ?? '')) {
                array_shift($values);
            }

            if (empty($values)) {
                $this->sendSuccess([
                    'top_player' => null,
                    'top_score' => 0,
                    'level' => 0,
                    'achieved_at' => null
                ], 'Top player retrieved successfully');
                return;
            }

            // Find highest score
            $topScore = 0;
            $topRow = null;

            foreach ($values as $row) {
                if (empty($row) || !isset($row[4]))
                    continue;
                $score = (int) ($row[4] ?? 0);
                if ($score > $topScore) {
                    $topScore = $score;
                    $topRow = $row;
                }
            }

            if ($topRow) {
                $this->sendSuccess([
                    'top_player' => $topRow[1] ?? 'Anonymous',
                    'top_score' => $topScore,
                    'level' => (int) ($topRow[5] ?? 1),
                    'achieved_at' => $topRow[0] ?? date('Y-m-d H:i:s')
                ], 'Top player retrieved successfully');
            } else {
                $this->sendSuccess([
                    'top_player' => null,
                    'top_score' => 0,
                    'level' => 0,
                    'achieved_at' => null
                ], 'Top player retrieved successfully');
            }

        } catch (Exception $e) {
            error_log("Top player retrieval error: " . $e->getMessage());
            $this->sendError('Failed to retrieve top player', 500);
        }
    }

    /**
     * Get statistics
     */
    private function getStats() {
        try {
            $range = $this->sheetName . '!A:H';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();

            if (empty($values)) {
                $this->sendSuccess([
                    'total_scores' => 0,
                    'highest_score' => 0,
                    'average_score' => 0,
                    'highest_level' => 0,
                    'unique_players' => 0,
                    'active_days' => 0
                ], 'Statistics retrieved successfully');
                return;
            }

            // Remove header row if it exists
            if (isset($values[0]) && !is_numeric($values[0][4] ?? '')) {
                array_shift($values);
            }

            $scores = [];
            $levels = [];
            $players = [];

            foreach ($values as $row) {
                if (empty($row) || !isset($row[4]))
                    continue;

                $scores[] = (int) ($row[4] ?? 0);
                $levels[] = (int) ($row[5] ?? 1);
                if (!empty($row[1])) {
                    $players[] = $row[1];
                }
            }

            $stats = [
                'total_scores' => count($scores),
                'highest_score' => count($scores) > 0 ? max($scores) : 0,
                'average_score' => count($scores) > 0 ? round(array_sum($scores) / count($scores), 2) : 0,
                'highest_level' => count($levels) > 0 ? max($levels) : 0,
                'unique_players' => count(array_unique($players)),
                'active_days' => 1 // Simplified - could calculate from timestamps
            ];

            $this->sendSuccess($stats, 'Statistics retrieved successfully');

        } catch (Exception $e) {
            error_log("Statistics retrieval error: " . $e->getMessage());
            $this->sendError('Failed to retrieve statistics', 500);
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
            'storage' => 'Google Sheets',
            'spreadsheet_id' => $this->spreadsheetId
        ];

        try {
            // Test connection to Google Sheets
            $range = $this->sheetName . '!A1:A1';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);

            $health['google_sheets'] = [
                'status' => 'connected',
                'sheet_name' => $this->sheetName
            ];
        } catch (Exception $e) {
            $health['google_sheets'] = [
                'status' => 'error',
                'message' => 'Failed to connect to Google Sheets'
            ];
            http_response_code(503);
        }

        echo json_encode($health, JSON_PRETTY_PRINT);
        exit;
    }

    /**
     * Calculate position for a score
     */
    private function calculatePosition($score) {
        try {
            $range = $this->sheetName . '!E:E'; // Score column
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();

            if (empty($values))
                return 1;

            $position = 1;
            foreach ($values as $row) {
                if (empty($row[0]) || !is_numeric($row[0]))
                    continue;
                if ((int) $row[0] > $score) {
                    $position++;
                }
            }

            return $position;
        } catch (Exception $e) {
            return 1; // Default position if calculation fails
        }
    }

    /**
     * Check if score is a new record
     */
    private function isNewRecord($score) {
        try {
            $range = $this->sheetName . '!E:E'; // Score column
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();

            if (empty($values))
                return true;

            foreach ($values as $row) {
                if (empty($row[0]) || !is_numeric($row[0]))
                    continue;
                if ((int) $row[0] >= $score) {
                    return false;
                }
            }

            return true;
        } catch (Exception $e) {
            return false; // Conservative approach if check fails
        }
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

// Handle the request
try {
    $api = new ProductionGoogleSheetsAPI();
    $api->handleRequest();
} catch (Exception $e) {
    error_log("Fatal API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'timestamp' => date('c')
    ]);
}
?>