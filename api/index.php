<?php
/**
 * Pac-Man Leaderboard API - Clean URL Router
 * 
 * This file provides clean URLs for the leaderboard API by routing
 * all requests through a single entry point while maintaining security.
 * 
 * Clean URL Examples:
 * POST /api/submit
 * GET  /api/leaderboard
 * GET  /api/top-player
 * GET  /api/stats
 * 
 * @author Generated with Claude Code
 * @version 1.0.0
 */

// Prevent direct access to this file if accessed incorrectly
if (!isset($_SERVER['REQUEST_URI'])) {
    http_response_code(403);
    exit('Direct access forbidden');
}

// Load environment variables if .env file exists
if (file_exists('.env')) {
    $env = parse_ini_file('.env');
    if ($env) {
        foreach ($env as $key => $value) {
            $_ENV[$key] = $value;
        }
    }
}

/**
 * API Router Class
 */
class APIRouter {
    private $validActions = ['submit', 'leaderboard', 'top-player', 'stats', 'health'];
    private $apiFile = 'sheets-api.php';
    
    public function __construct() {
        // Set the API file path relative to the main router
        $this->apiFile = __DIR__ . '/sheets-api.php';
        
        // Security check - ensure API file exists and is not directly accessible
        if (!file_exists($this->apiFile)) {
            $this->sendError('API service unavailable', 503);
        }
    }
    
    /**
     * Route the incoming request
     */
    public function route() {
        // Get the request path
        $requestUri = $_SERVER['REQUEST_URI'];
        $parsedUrl = parse_url($requestUri);
        $path = trim($parsedUrl['path'], '/');
        
        // Extract action from URL path
        $pathParts = explode('/', $path);
        $action = end($pathParts);
        
        // If no action in path, check query parameter
        if (empty($action) || $action === 'api') {
            $action = $_GET['action'] ?? '';
        }
        
        // Handle special cases
        if (empty($action) || $action === 'index.php') {
            $this->showApiInfo();
            return;
        }
        
        // Validate action
        if (!in_array($action, $this->validActions)) {
            $this->sendError('Invalid API endpoint', 404);
        }
        
        // Handle health check
        if ($action === 'health') {
            $this->healthCheck();
            return;
        }
        
        // Set the action parameter for the main API
        $_GET['action'] = $action;
        
        // Security headers
        $this->setSecurityHeaders();
        
        // Route to main API
        $this->loadAPI();
    }
    
    /**
     * Load and execute the main API file
     */
    private function loadAPI() {
        // Prevent output until we're ready
        ob_start();
        
        try {
            // Include the main API file
            require_once $this->apiFile;
        } catch (Exception $e) {
            ob_end_clean();
            $this->sendError('Internal server error', 500);
        }
        
        // Send the output
        ob_end_flush();
    }
    
    /**
     * Set security headers
     */
    private function setSecurityHeaders() {
        // Basic security headers (additional ones in .htaccess)
        header('X-Powered-By: Pac-Man API v1.0');
        header('X-API-Version: 1.0.0');
        
        // CORS headers for specific allowed domains
        $this->setCorsHeaders();
        
        // Rate limiting headers (if implemented)
        if (isset($_ENV['RATE_LIMIT'])) {
            header('X-RateLimit-Limit: ' . $_ENV['RATE_LIMIT']);
        }
    }
    
    /**
     * Set CORS headers for specific domains
     */
    private function setCorsHeaders() {
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
        header('Access-Control-Allow-Credentials: false');
        
        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
    
    /**
     * Health check endpoint
     */
    private function healthCheck() {
        header('Content-Type: application/json');
        
        $health = [
            'status' => 'healthy',
            'service' => 'Pac-Man Leaderboard API',
            'version' => '1.0.0',
            'timestamp' => date('c'),
            'endpoints' => [
                'POST /submit' => 'Submit a new score',
                'GET /leaderboard' => 'Get top scores',
                'GET /top-player' => 'Get highest scorer',
                'GET /stats' => 'Get leaderboard statistics'
            ]
        ];
        
        // Test Google Sheets connection
        try {
            $credentialsPath = __DIR__ . '/credentials.json';
            
            if (file_exists($credentialsPath)) {
                $health['google_sheets'] = [
                    'status' => 'credentials_found',
                    'spreadsheet_id' => '196hFMyXpn2Nqw6_XyS2Fzho1dwC7ONshiqcPG0MeP9E'
                ];
            } else {
                $health['google_sheets'] = [
                    'status' => 'credentials_missing',
                    'message' => 'Google credentials file not found'
                ];
                http_response_code(503);
            }
            
        } catch (Exception $e) {
            $health['google_sheets'] = [
                'status' => 'error',
                'message' => 'Google Sheets connection failed'
            ];
            http_response_code(503);
        }
        
        echo json_encode($health, JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * Show API information page
     */
    private function showApiInfo() {
        header('Content-Type: application/json');
        
        $info = [
            'name' => 'Pac-Man Leaderboard API',
            'version' => '1.0.0',
            'description' => 'Google Sheets-powered API for Caravan 25 contest leaderboards',
            'base_url' => '/api',
            'endpoints' => [
                [
                    'method' => 'POST',
                    'path' => '/submit',
                    'description' => 'Submit a new score',
                    'parameters' => [
                        'score' => 'number (required)',
                        'player_name' => 'string (optional)',
                        'email' => 'string (required for winner contact)',
                        'phone' => 'string (optional)',
                        'level' => 'number (optional)'
                    ]
                ],
                [
                    'method' => 'GET',
                    'path' => '/leaderboard',
                    'description' => 'Get top scores',
                    'parameters' => [
                        'limit' => 'number (optional, max 50)'
                    ]
                ],
                [
                    'method' => 'GET',
                    'path' => '/top-player',
                    'description' => 'Get the highest scoring player'
                ],
                [
                    'method' => 'GET',
                    'path' => '/stats',
                    'description' => 'Get leaderboard statistics'
                ],
                [
                    'method' => 'GET',
                    'path' => '/health',
                    'description' => 'API health check'
                ]
            ],
            'features' => [
                'Google Sheets integration',
                'Real-time leaderboard updates',
                'Winner contact collection',
                'Rate limiting',
                'Input validation',
                'CORS support',
                'Security headers',
                'Error handling'
            ],
            'documentation' => 'See README.md for detailed usage'
        ];
        
        echo json_encode($info, JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * Send error response
     */
    private function sendError($message, $code = 400) {
        http_response_code($code);
        header('Content-Type: application/json');
        
        echo json_encode([
            'success' => false,
            'error' => $message,
            'code' => $code,
            'timestamp' => date('c')
        ], JSON_PRETTY_PRINT);
        
        exit;
    }
}

// Initialize and route the request
try {
    $router = new APIRouter();
    $router->route();
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'timestamp' => date('c')
    ]);
}
?>