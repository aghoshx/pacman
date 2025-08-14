<?php
// Set the action parameter and route to main API
$_GET['action'] = 'submit';

// Debug: Log the request method
error_log("Submit endpoint accessed with method: " . ($_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN'));

require_once '../index.php';
?>
