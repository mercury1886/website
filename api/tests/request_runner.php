<?php

$method = $argv[1] ?? 'GET';
$requestTarget = $argv[2] ?? '/';
$bodyPath = $argv[3] ?? '';
$queryString = parse_url($requestTarget, PHP_URL_QUERY) ?? '';

parse_str($queryString, $queryParams);

if ($bodyPath !== '' && is_file($bodyPath)) {
    putenv('TRIP_BUILDER_TEST_BODY=' . (string) file_get_contents($bodyPath));
}

ob_start();

register_shutdown_function(static function (): void {
    $rawBody = ob_get_clean();
    $decoded = json_decode($rawBody, true);

    echo json_encode([
        'status' => http_response_code(),
        'body' => is_array($decoded) ? $decoded : null,
        'raw' => $rawBody,
    ], JSON_PRETTY_PRINT);
});

$_SERVER['REQUEST_METHOD'] = $method;
$_SERVER['REQUEST_URI'] = $requestTarget;
$_GET = $queryParams;

require dirname(__DIR__) . '/public/index.php';
