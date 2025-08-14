<?php
// Set the action parameter for the main API
$_GET['action'] = 'stats';

// Route to the main API handler
require_once __DIR__ . '/../../../pacman/api/index.php';
?>