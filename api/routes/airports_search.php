<?php

$query = trim((string) ($_GET['query'] ?? ''));
$data = loadSampleData();
$matches = filterAirports($data['airports'], $query);

respond([
    'data' => array_slice($matches, 0, 12),
    'meta' => [
        'query' => $query,
        'count' => count($matches),
    ],
]);
