<?php

require dirname(__DIR__) . '/bootstrap.php';

sendApiHeaders();

if (requestMethod() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$routes = [
    'GET /' => dirname(__DIR__) . '/routes/health.php',
    'GET /health' => dirname(__DIR__) . '/routes/health.php',
    'GET /airports' => dirname(__DIR__) . '/routes/airports.php',
    'GET /airports/search' => dirname(__DIR__) . '/routes/airports_search.php',
    'POST /trips/search' => dirname(__DIR__) . '/routes/trips_search.php',
];

$routeFile = $routes[requestMethod() . ' ' . requestPath()] ?? '';

if ($routeFile === '') {
    fail('Route not found.', 404);
}

require $routeFile;
