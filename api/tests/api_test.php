<?php

require dirname(__DIR__) . '/bootstrap.php';

function failTest(string $message): void
{
    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
}

function assertTrue(bool $condition, string $message): void
{
    if (!$condition) {
        failTest($message);
    }
}

function runRequest(string $method, string $path, ?array $payload = null): array
{
    $payloadFile = null;

    if ($payload !== null) {
        $payloadFile = tempnam(sys_get_temp_dir(), 'trip-body-');

        if ($payloadFile === false) {
            failTest('Could not create a temporary payload file for API tests.');
        }

        file_put_contents($payloadFile, json_encode($payload));
    }

    $command = [
        PHP_BINARY,
        __DIR__ . '/request_runner.php',
        $method,
        $path,
    ];

    if ($payloadFile !== null) {
        $command[] = $payloadFile;
    }

    $process = proc_open(
        $command,
        [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ],
        $pipes,
        dirname(__DIR__, 2)
    );

    if (!is_resource($process)) {
        if ($payloadFile !== null) {
            unlink($payloadFile);
        }

        failTest('Could not execute PHP API test runner.');
    }

    fclose($pipes[0]);
    $output = stream_get_contents($pipes[1]);
    $errorOutput = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($process);

    if ($payloadFile !== null) {
        unlink($payloadFile);
    }

    if ($output === false || $output === '') {
        failTest('PHP API test runner returned no output.' . ($errorOutput !== '' ? ' ' . $errorOutput : ''));
    }

    $decoded = json_decode($output, true);

    if (!is_array($decoded)) {
        failTest('PHP API test runner returned invalid JSON.');
    }

    return $decoded;
}

$health = runRequest('GET', '/health');
assertTrue($health['status'] === 200, 'Expected /health to return HTTP 200.');
assertTrue(($health['body']['status'] ?? '') === 'ok', 'Expected /health status payload.');

$airports = runRequest('GET', '/airports/search?query=Montreal');
assertTrue($airports['status'] === 200, 'Expected airport search to return HTTP 200.');
assertTrue(($airports['body']['meta']['query'] ?? '') === 'Montreal', 'Expected airport search query echo.');
assertTrue(($airports['body']['data'][0]['code'] ?? '') === 'YUL', 'Expected Montreal airport search to rank YUL first.');

$tripSearch = [
    'tripType' => 'one-way',
    'from' => 'YUL',
    'to' => 'JFK',
    'departureDate' => '2026-07-10',
    'returnDate' => '',
    'passengers' => 1,
];

$trips = runRequest('POST', '/trips/search', $tripSearch);
assertTrue($trips['status'] === 200, 'Expected trip search to return HTTP 200.');
assertTrue(count($trips['body']['data'] ?? []) > 0, 'Expected trip search to return at least one trip.');

$includedBaggageScore = tripScore(400, 300, 0, itineraryBaggagePenalty([
    [
        'baggage' => [
            'carry_on' => ['status' => 'included', 'price' => null],
            'checked_bag' => ['status' => 'included', 'price' => null],
        ],
    ],
], 1));

$extraBaggageScore = tripScore(400, 300, 0, itineraryBaggagePenalty([
    [
        'baggage' => [
            'carry_on' => ['status' => 'extra', 'price' => 25],
            'checked_bag' => ['status' => 'extra', 'price' => 45],
        ],
    ],
], 1));

assertTrue(
    $includedBaggageScore < $extraBaggageScore,
    'Expected included baggage to improve the trip score.'
);

echo 'PHP API tests passed.' . PHP_EOL;
