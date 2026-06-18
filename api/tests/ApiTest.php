<?php

use PHPUnit\Framework\TestCase;

final class ApiTest extends TestCase
{
    public function testHealthCheckReturnsOk(): void
    {
        $health = $this->runRequest('GET', '/health');

        $this->assertSame(200, $health['status']);
        $this->assertSame('ok', $health['body']['status'] ?? '');
    }

    public function testAirportSearchRanksYulFirstForMontreal(): void
    {
        $airports = $this->runRequest('GET', '/airports?query=Montreal');

        $this->assertSame(200, $airports['status']);
        $this->assertSame('Montreal', $airports['body']['meta']['query'] ?? '');
        $this->assertSame('YUL', $airports['body']['data'][0]['code'] ?? '');
    }

    public function testTripSearchReturnsAtLeastOneTrip(): void
    {
        $trips = $this->runRequest('POST', '/trips/search', [
            'tripType' => 'one-way',
            'from' => 'YUL',
            'to' => 'JFK',
            'departureDate' => '2026-07-10',
            'returnDate' => '',
            'passengers' => 1,
        ]);

        $this->assertSame(200, $trips['status']);
        $this->assertGreaterThan(0, count($trips['body']['data'] ?? []));
    }

    public function testIncludedBaggageImprovesScore(): void
    {
        $includedBaggageScore = tripScore(
            400,
            300,
            0,
            itineraryBaggagePenalty(
                [
                    [
                        'baggage' => [
                            'carry_on' => 1,
                            'checked_bag' => 1,
                        ],
                    ],
                ],
                1,
            ),
        );

        $missingBaggageScore = tripScore(
            400,
            300,
            0,
            itineraryBaggagePenalty(
                [
                    [
                        'baggage' => [
                            'carry_on' => 0,
                            'checked_bag' => 0,
                        ],
                    ],
                ],
                1,
            ),
        );

        $this->assertLessThan($missingBaggageScore, $includedBaggageScore);
    }

    private function runRequest(
        string $method,
        string $path,
        ?array $payload = null,
    ): array {
        $payloadFile = null;

        if ($payload !== null) {
            $payloadFile = tempnam(sys_get_temp_dir(), 'trip-body-');

            if ($payloadFile === false) {
                throw new RuntimeException(
                    'Could not create a temporary payload file for API tests.',
                );
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
            dirname(__DIR__, 2),
        );

        if (!is_resource($process)) {
            if ($payloadFile !== null) {
                unlink($payloadFile);
            }

            throw new RuntimeException(
                'Could not execute PHP API test runner.',
            );
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
            $suffix = $errorOutput !== '' ? ' ' . $errorOutput : '';
            throw new RuntimeException(
                'PHP API test runner returned no output.' . $suffix,
            );
        }

        $decoded = json_decode($output, true);

        if (!is_array($decoded)) {
            throw new RuntimeException(
                'PHP API test runner returned invalid JSON.',
            );
        }

        return $decoded;
    }
}
