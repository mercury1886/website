<?php

$payload = readJsonBody();
$data = loadSampleData();
$criteria = validateTripSearch($payload);
$trips = buildTripOptions($criteria, $data);

respond([
    'data' => $trips,
    'meta' => [
        'count' => count($trips),
        'trip_type' => $criteria['trip_type'],
        'passengers' => $criteria['passengers'],
        'from' => $criteria['from'],
        'to' => $criteria['to'],
    ],
]);
