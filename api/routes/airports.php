<?php

$data = loadSampleData();
$airports = $data['airports'];

usort($airports, static function (array $left, array $right): int {
    return strcmp((string) $left['code'], (string) $right['code']);
});

respond([
    'data' => array_slice($airports, 0, 12),
    'meta' => [
        'count' => count($airports),
    ],
]);
