<?php

$query = trim((string) ($_GET['query'] ?? ''));
$airports = filterAirports(loadAirportsData(), $query);

respond([
    'data' => array_slice($airports, 0, 12),
    'meta' => [
        'query' => $query,
        'count' => count($airports),
    ],
]);
