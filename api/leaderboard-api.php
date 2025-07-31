<?php
/**
 * Professional Pac-Man Leaderboard API
 * 
 * A secure, consolidated API for managing game leaderboards
 * Supports: score submission, leaderboard retrieval, top player queries
 * 
 * Usage:
 * POST /api/leaderboard-api.php?action=submit - Submit a score
 * GET  /api/leaderboard-api.php?action=leaderboard - Get top 10 scores
 * GET  /api/leaderboard-api.php?action=top-player - Get highest scorer
 * 
 * @author Generated with Claude Code
 * @version 1.0.0
 */

class LeaderboardAPI {
    private $pdo;
    private $config;
    private $rateLimiter;
    
    public function __construct() {
        $this->loadConfig();
        $this->initDatabase();
        $this->initRateLimiter();
        $this->setCorsHeaders();
    }
    
    /**
     * Load configuration from environment or defaults
     */
    private function loadConfig() {
        $this->config = [
            'db_host' => $_ENV['DB_HOST'] ?? 'localhost',
            'db_name' => $_ENV['DB_NAME'] ?? 'saasboomi_game',
            'db_user' => $_ENV['DB_USER'] ?? 'saasboomi_game',
            'db_pass' => $_ENV['DB_PASS'] ?? 'JCO]hB2rMrSuhqK(',
            'max_scores' => $_ENV['MAX_SCORES'] ?? 10,
            'rate_limit' => $_ENV['RATE_LIMIT'] ?? 60, // requests per hour
            'max_name_length' => $_ENV['MAX_NAME_LENGTH'] ?? 50,
            'max_score' => $_ENV['MAX_SCORE'] ?? 999999,
        ];
    }
    
    /**
     * Initialize database connection with error handling
     */
    private function initDatabase() {
        try {
            $dsn = "mysql:host={$this->config['db_host']};dbname={$this->config['db_name']};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            $this->pdo = new PDO($dsn, $this->config['db_user'], $this->config['db_pass'], $options);
            
            // Create table if it doesn't exist
            $this->createTableIfNotExists();
            
        } catch (PDOException $e) {
            $this->sendError('Database connection failed', 500);
        }
    }
    
    /**
     * Create leaderboard table if it doesn't exist
     */
    private function createTableIfNotExists() {
        $sql = "
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INT AUTO_INCREMENT PRIMARY KEY,
                player_name VARCHAR(100) NOT NULL,
                score INT NOT NULL,
                level INT DEFAULT 1,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_score (score DESC),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        
        $this->pdo->exec($sql);
    }
    
    /**
     * Simple rate limiter based on IP address
     */
    private function initRateLimiter() {
        $this->rateLimiter = [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            'window' => 3600, // 1 hour
        ];
    }
    
    /**
     * Check rate limit for current IP
     */
    private function checkRateLimit() {
        $ip = $this->rateLimiter['ip'];
        $window = time() - $this->rateLimiter['window'];
        
        // Clean old entries
        $stmt = $this->pdo->prepare("DELETE FROM leaderboard WHERE ip_address = ? AND created_at < FROM_UNIXTIME(?)");
        $stmt->execute([$ip, $window]);
        
        // Count recent submissions
        $stmt = $this->pdo->prepare("SELECT COUNT(*) as count FROM leaderboard WHERE ip_address = ? AND created_at > FROM_UNIXTIME(?)");
        $stmt->execute([$ip, $window]);
        $count = $stmt->fetch()['count'];
        
        if ($count >= $this->config['rate_limit']) {
            $this->sendError('Rate limit exceeded. Please try again later.', 429);
        }
    }
    
    /**
     * Set basic headers (CORS handled by index.php router)
     */
    private function setCorsHeaders() {
        header('Content-Type: application/json; charset=utf-8');
        
        // CORS headers are now handled by the index.php router for better security
        // No need to set them here as they're managed at the entry point
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
                        $this->sendError('POST method required for score submission', 405);
                    }
                    $this->submitScore();
                    break;
                    
                case 'leaderboard':
                    if ($method !== 'GET') {
                        $this->sendError('GET method required for leaderboard', 405);
                    }
                    $this->getLeaderboard();
                    break;
                    
                case 'top-player':
                    if ($method !== 'GET') {
                        $this->sendError('GET method required for top player', 405);
                    }
                    $this->getTopPlayer();
                    break;
                    
                case 'stats':
                    if ($method !== 'GET') {
                        $this->sendError('GET method required for stats', 405);
                    }
                    $this->getStats();
                    break;
                    
                default:
                    $this->sendError('Invalid action. Use: submit, leaderboard, top-player, or stats', 400);
            }
            
        } catch (Exception $e) {
            $this->sendError('Internal server error', 500);
        }
    }
    
    /**
     * Submit a new score to the leaderboard
     */
    private function submitScore() {
        $this->checkRateLimit();
        
        // Get and validate input
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            $this->sendError('Invalid JSON input', 400);
        }
        
        // Validate required fields
        if (!isset($input['score']) || !is_numeric($input['score'])) {
            $this->sendError('Score is required and must be numeric', 400);
        }
        
        $score = (int) $input['score'];
        $level = isset($input['level']) ? (int) $input['level'] : 1;
        $playerName = isset($input['player_name']) ? trim($input['player_name']) : 'Anonymous';
        
        // Validate score range
        if ($score < 0 || $score > $this->config['max_score']) {
            $this->sendError('Invalid score value', 400);
        }
        
        // Validate level
        if ($level < 1 || $level > 255) {
            $this->sendError('Invalid level value', 400);
        }
        
        // Sanitize and validate player name
        $playerName = $this->sanitizePlayerName($playerName);
        
        try {
            // Insert score with additional metadata
            $stmt = $this->pdo->prepare("
                INSERT INTO leaderboard (player_name, score, level, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $playerName,
                $score,
                $level,
                $this->rateLimiter['ip'],
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
            
            $insertId = $this->pdo->lastInsertId();
            
            // Calculate position in leaderboard
            $position = $this->calculatePosition($score, $insertId);
            
            // Check if made top 10
            $madeTop10 = $position <= $this->config['max_scores'];
            
            // Check if it's a new record
            $isNewRecord = $this->isNewRecord($score);
            
            $this->sendSuccess([
                'id' => (int) $insertId,
                'player_name' => $playerName,
                'score' => $score,
                'level' => $level,
                'position' => $position,
                'made_top_10' => $madeTop10,
                'is_new_record' => $isNewRecord,
                'submitted_at' => date('Y-m-d H:i:s')
            ], 'Score submitted successfully');
            
        } catch (PDOException $e) {
            $this->sendError('Failed to submit score', 500);
        }
    }
    
    /**
     * Get the leaderboard (top scores)
     */
    private function getLeaderboard() {
        try {
            $limit = min((int) ($_GET['limit'] ?? $this->config['max_scores']), 50);
            
            $stmt = $this->pdo->prepare("
                SELECT 
                    player_name,
                    score,
                    level,
                    created_at,
                    ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC) as position
                FROM leaderboard 
                ORDER BY score DESC, created_at ASC 
                LIMIT ?
            ");
            
            $stmt->execute([$limit]);
            $scores = $stmt->fetchAll();
            
            // Format the data
            $formattedScores = array_map(function($row) {
                return [
                    'position' => (int) $row['position'],
                    'player_name' => $row['player_name'],
                    'score' => (int) $row['score'],
                    'level' => (int) $row['level'],
                    'achieved_at' => $row['created_at']
                ];
            }, $scores);
            
            $this->sendSuccess($formattedScores, 'Leaderboard retrieved successfully');
            
        } catch (PDOException $e) {
            $this->sendError('Failed to retrieve leaderboard', 500);
        }
    }
    
    /**
     * Get the top player (highest score)
     */
    private function getTopPlayer() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT player_name, score, level, created_at 
                FROM leaderboard 
                ORDER BY score DESC, created_at ASC 
                LIMIT 1
            ");
            
            $stmt->execute();
            $topPlayer = $stmt->fetch();
            
            if ($topPlayer) {
                $data = [
                    'top_player' => $topPlayer['player_name'],
                    'top_score' => (int) $topPlayer['score'],
                    'level' => (int) $topPlayer['level'],
                    'achieved_at' => $topPlayer['created_at']
                ];
            } else {
                $data = [
                    'top_player' => null,
                    'top_score' => 0,
                    'level' => 0,
                    'achieved_at' => null
                ];
            }
            
            $this->sendSuccess($data, 'Top player retrieved successfully');
            
        } catch (PDOException $e) {
            $this->sendError('Failed to retrieve top player', 500);
        }
    }
    
    /**
     * Get leaderboard statistics
     */
    private function getStats() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    COUNT(*) as total_scores,
                    MAX(score) as highest_score,
                    AVG(score) as average_score,
                    MAX(level) as highest_level,
                    COUNT(DISTINCT player_name) as unique_players,
                    COUNT(DISTINCT DATE(created_at)) as active_days
                FROM leaderboard
            ");
            
            $stmt->execute();
            $stats = $stmt->fetch();
            
            $data = [
                'total_scores' => (int) $stats['total_scores'],
                'highest_score' => (int) $stats['highest_score'],
                'average_score' => round((float) $stats['average_score'], 2),
                'highest_level' => (int) $stats['highest_level'],
                'unique_players' => (int) $stats['unique_players'],
                'active_days' => (int) $stats['active_days']
            ];
            
            $this->sendSuccess($data, 'Statistics retrieved successfully');
            
        } catch (PDOException $e) {
            $this->sendError('Failed to retrieve statistics', 500);
        }
    }
    
    /**
     * Sanitize player name input
     */
    private function sanitizePlayerName($name) {
        if (empty($name)) {
            return 'Anonymous';
        }
        
        // Remove potentially dangerous characters
        $name = preg_replace('/[<>"\']/', '', $name);
        
        // Limit length
        $name = substr($name, 0, $this->config['max_name_length']);
        
        // Ensure it's not empty after sanitization
        return empty(trim($name)) ? 'Anonymous' : trim($name);
    }
    
    /**
     * Calculate position in leaderboard
     */
    private function calculatePosition($score, $insertId) {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) + 1 as position 
            FROM leaderboard 
            WHERE score > ? OR (score = ? AND id < ?)
        ");
        
        $stmt->execute([$score, $score, $insertId]);
        return (int) $stmt->fetch()['position'];
    }
    
    /**
     * Check if score is a new record
     */
    private function isNewRecord($score) {
        $stmt = $this->pdo->prepare("SELECT MAX(score) as max_score FROM leaderboard WHERE score < ?");
        $stmt->execute([$score]);
        $result = $stmt->fetch();
        
        return $result['max_score'] === null || $score > $result['max_score'];
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

// Initialize and handle the request
try {
    $api = new LeaderboardAPI();
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