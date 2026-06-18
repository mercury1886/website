<?php

function sendApiHeaders(): void
{
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

function requestMethod(): string
{
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

function requestPath(): string
{
    return parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
}

function readJsonBody(): array
{
    $rawBody = false;
    $testBody = PHP_SAPI === 'cli' ? getenv('TRIP_BUILDER_TEST_BODY') : false;

    if ($testBody !== false) {
        $rawBody = $testBody;
    } else {
        $rawBody = file_get_contents('php://input');
    }

    if ($rawBody === false || $rawBody === '') {
        fail('Request body is missing.', 400);
    }

    $decoded = json_decode($rawBody, true);

    if (!is_array($decoded)) {
        fail('Request body must be valid JSON.', 400);
    }

    return $decoded;
}

function validateTripSearch(array $payload): array
{
    $tripType = (string) ($payload['tripType'] ?? '');
    $from = strtoupper(trim((string) ($payload['from'] ?? '')));
    $to = strtoupper(trim((string) ($payload['to'] ?? '')));
    $departureDate = (string) ($payload['departureDate'] ?? '');
    $returnDate = (string) ($payload['returnDate'] ?? '');
    $passengers = max(1, (int) ($payload['passengers'] ?? 1));

    if (!in_array($tripType, ['one-way', 'round-trip'], true)) {
        fail('Trip type is invalid.', 400);
    }

    if ($from === '' || $to === '') {
        fail('Both departure and arrival airports are required.', 400);
    }

    if ($from === $to) {
        fail('Departure and arrival airports cannot match.', 400);
    }

    if (!validDate($departureDate)) {
        fail('Departure date is invalid.', 400);
    }

    if ($tripType === 'round-trip' && !validDate($returnDate)) {
        fail('Return date is invalid.', 400);
    }

    return [
        'trip_type' => $tripType,
        'from' => $from,
        'to' => $to,
        'departure_date' => $departureDate,
        'return_date' => $returnDate,
        'passengers' => $passengers,
    ];
}

function validDate(string $value): bool
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return false;
    }

    $date = DateTimeImmutable::createFromFormat('Y-m-d', $value);
    return $date !== false && $date->format('Y-m-d') === $value;
}

function buildTripOptions(array $criteria, array $data): array
{
    $airportsByCode = mapByCode($data['airports']);
    $airlinesByCode = mapByCode($data['airlines']);
    $aircraftByCode = mapByCode($data['aircraft'] ?? []);
    $flightsByDeparture = indexFlightsByDeparture($data['flights']);

    $outbound = buildItineraries(
        $criteria['from'],
        $criteria['to'],
        $criteria['departure_date'],
        $criteria['passengers'],
        $flightsByDeparture,
        $airportsByCode,
        $airlinesByCode,
        $aircraftByCode
    );

    if ($criteria['trip_type'] === 'one-way') {
        return array_map(
            static fn(array $itinerary): array => normalizeOneWayTrip($itinerary),
            $outbound
        );
    }

    $inbound = buildItineraries(
        $criteria['to'],
        $criteria['from'],
        $criteria['return_date'],
        $criteria['passengers'],
        $flightsByDeparture,
        $airportsByCode,
        $airlinesByCode,
        $aircraftByCode
    );

    $roundTrips = [];
    $outboundSlice = array_slice($outbound, 0, 6);
    $inboundSlice = array_slice($inbound, 0, 6);

    foreach ($outboundSlice as $outboundTrip) {
        foreach ($inboundSlice as $inboundTrip) {
            $totalPrice = $outboundTrip['total_price'] + $inboundTrip['total_price'];
            $durationMinutes = $outboundTrip['duration_minutes'] + $inboundTrip['duration_minutes'];
            $stopCount = $outboundTrip['stop_count'] + $inboundTrip['stop_count'];
            $baggagePenalty = $outboundTrip['baggage_penalty'] + $inboundTrip['baggage_penalty'];

            $roundTrips[] = [
                'id' => 'rt-' . $outboundTrip['id'] . '-' . $inboundTrip['id'],
                'trip_type' => 'round-trip',
                'segments' => [
                    normalizeSegment($outboundTrip, 'Outbound'),
                    normalizeSegment($inboundTrip, 'Return'),
                ],
                'total_price' => round($totalPrice, 2),
                'total_duration_minutes' => $durationMinutes,
                'total_duration_display' => formatDuration($durationMinutes),
                'stop_count' => $stopCount,
                'score' => tripScore($totalPrice, $durationMinutes, $stopCount, $baggagePenalty),
            ];
        }
    }

    usort($roundTrips, static function (array $left, array $right): int {
        return compareTrips($left, $right);
    });

    return $roundTrips;
}

function buildItineraries(
    string $from,
    string $to,
    string $travelDate,
    int $passengers,
    array $flightsByDeparture,
    array $airportsByCode,
    array $airlinesByCode,
    array $aircraftByCode
): array {
    $itineraries = [];

    foreach ($flightsByDeparture[$from] ?? [] as $firstFlight) {
        $firstLeg = createLeg(
            $firstFlight,
            $travelDate,
            $airportsByCode,
            $airlinesByCode,
            $aircraftByCode
        );

        if ($firstLeg === null) {
            continue;
        }

        if ($firstFlight['arrival_airport'] === $to) {
            $itineraries[] = createItinerary([$firstLeg], $passengers);
        }

        $connectionAirport = $firstFlight['arrival_airport'];

        if ($connectionAirport === $to || $connectionAirport === $from) {
            continue;
        }

        foreach ($flightsByDeparture[$connectionAirport] ?? [] as $secondFlight) {
            if ($secondFlight['arrival_airport'] !== $to) {
                continue;
            }

            $secondLeg = createLeg(
                $secondFlight,
                $travelDate,
                $airportsByCode,
                $airlinesByCode,
                $aircraftByCode,
                $firstLeg['_arrival_utc']->modify('+45 minutes')
            );

            if ($secondLeg === null) {
                continue;
            }

            $layoverMinutes = minutesBetween($firstLeg['_arrival_utc'], $secondLeg['_departure_utc']);

            if ($layoverMinutes < 45 || $layoverMinutes > 240) {
                continue;
            }

            $itinerary = createItinerary([$firstLeg, $secondLeg], $passengers);

            if ($itinerary['duration_minutes'] <= 900) {
                $itineraries[] = $itinerary;
            }
        }
    }

    usort($itineraries, static function (array $left, array $right): int {
        return compareTrips($left, $right);
    });

    return dedupeItineraries($itineraries);
}

function dedupeItineraries(array $itineraries): array
{
    $seen = [];
    $unique = [];

    foreach ($itineraries as $itinerary) {
        $signature = implode('-', array_map(
            static fn(array $leg): string => $leg['airline_code'] . $leg['flight_number'],
            $itinerary['legs']
        ));

        if (isset($seen[$signature])) {
            continue;
        }

        $seen[$signature] = true;
        $unique[] = $itinerary;
    }

    return $unique;
}

function createItinerary(array $legs, int $passengers): array
{
    $firstLeg = $legs[0];
    $lastLeg = $legs[count($legs) - 1];
    $pricePerPassenger = array_sum(array_map(
        static fn(array $leg): float => $leg['price'],
        $legs
    ));
    $durationMinutes = minutesBetween($firstLeg['_departure_utc'], $lastLeg['_arrival_utc']);
    $stopCount = count($legs) - 1;
    $totalPrice = round($pricePerPassenger * $passengers, 2);
    $baggagePenalty = itineraryBaggagePenalty($legs, $passengers);

    return [
        'id' => implode('-', array_map(
            static fn(array $leg): string => $leg['airline_code'] . $leg['flight_number'],
            $legs
        )),
        'legs' => $legs,
        'stop_count' => $stopCount,
        'duration_minutes' => $durationMinutes,
        'duration_display' => formatDuration($durationMinutes),
        'price_per_passenger' => round($pricePerPassenger, 2),
        'total_price' => $totalPrice,
        'baggage_penalty' => $baggagePenalty,
        'score' => tripScore($totalPrice, $durationMinutes, $stopCount, $baggagePenalty),
    ];
}

function normalizeOneWayTrip(array $itinerary): array
{
    return [
        'id' => 'ow-' . $itinerary['id'],
        'trip_type' => 'one-way',
        'segments' => [
            normalizeSegment($itinerary, 'Outbound'),
        ],
        'total_price' => $itinerary['total_price'],
        'total_duration_minutes' => $itinerary['duration_minutes'],
        'total_duration_display' => formatDuration($itinerary['duration_minutes']),
        'stop_count' => $itinerary['stop_count'],
        'score' => $itinerary['score'],
    ];
}

function normalizeSegment(array $itinerary, string $direction): array
{
    $firstLeg = $itinerary['legs'][0];
    $lastLeg = $itinerary['legs'][count($itinerary['legs']) - 1];
    $stops = [];
    $carriers = [];
    $layovers = [];

    foreach (array_slice($itinerary['legs'], 0, -1) as $leg) {
        $stops[] = $leg['arrival_airport'];
    }

    foreach ($itinerary['legs'] as $index => $leg) {
        $nextLeg = $itinerary['legs'][$index + 1] ?? null;

        if ($nextLeg !== null) {
            $layoverMinutes = minutesBetween($leg['_arrival_utc'], $nextLeg['_departure_utc']);
            $layovers[] = [
                'airport' => $leg['arrival_airport'],
                'duration_minutes' => $layoverMinutes,
                'duration_display' => formatDuration($layoverMinutes),
                'arrival_time_label' => $leg['arrival_time_label'],
                'departure_time_label' => $nextLeg['departure_time_label'],
            ];
        }
    }

    foreach ($itinerary['legs'] as $leg) {
        if (!isset($carriers[$leg['airline_code']])) {
            $carriers[$leg['airline_code']] = [
                'code' => $leg['airline_code'],
                'name' => $leg['airline_name'],
                'logo' => $leg['airline_logo'],
            ];
        }
    }

    $airlineNames = array_values(array_map(
        static fn(array $carrier): string => $carrier['name'],
        $carriers
    ));

    return [
        'direction' => $direction,
        'from' => $firstLeg['departure_airport'],
        'to' => $lastLeg['arrival_airport'],
        'departure_time_label' => $firstLeg['departure_time_label'],
        'arrival_time_label' => $lastLeg['arrival_time_label'],
        'travel_date_label' => $firstLeg['departure_date_label'],
        'segment_total_price' => $itinerary['total_price'],
        'segment_price_per_passenger' => $itinerary['price_per_passenger'],
        'duration_minutes' => $itinerary['duration_minutes'],
        'duration_display' => formatDuration($itinerary['duration_minutes']),
        'stop_count' => $itinerary['stop_count'],
        'stop_label' => formatStopLabel($stops),
        'carriers' => array_values($carriers),
        'airline_names' => $airlineNames,
        'operator_text' => implode(', ', $airlineNames),
        'layovers' => $layovers,
        'baggage_summary' => [
            'carry_on' => summarizeBaggage($itinerary['legs'], 'carry_on'),
            'checked_bag' => summarizeBaggage($itinerary['legs'], 'checked_bag'),
        ],
        'legs' => array_map(static function (array $leg): array {
            return [
                'airline_code' => $leg['airline_code'],
                'airline_name' => $leg['airline_name'],
                'airline_logo' => $leg['airline_logo'],
                'flight_number' => $leg['flight_number'],
                'departure_airport' => $leg['departure_airport'],
                'departure_airport_name' => $leg['departure_airport_name'],
                'departure_city' => $leg['departure_city'],
                'arrival_airport' => $leg['arrival_airport'],
                'arrival_airport_name' => $leg['arrival_airport_name'],
                'arrival_city' => $leg['arrival_city'],
                'departure_date_label' => $leg['departure_date_label'],
                'arrival_date_label' => $leg['arrival_date_label'],
                'departure_time_label' => $leg['departure_time_label'],
                'arrival_time_label' => $leg['arrival_time_label'],
                'duration_display' => $leg['duration_display'],
                'price' => $leg['price'],
                'baggage' => $leg['baggage'],
                'aircraft' => $leg['aircraft'],
            ];
        }, $itinerary['legs']),
    ];
}

function summarizeBaggage(array $legs, string $type): array
{
    $statuses = [];
    $prices = [];

    foreach ($legs as $leg) {
        $offer = $leg['baggage'][$type] ?? ['status' => 'not_available', 'price' => null];
        $status = (string) ($offer['status'] ?? 'not_available');
        $statuses[$status] = true;

        if (isset($offer['price']) && $offer['price'] !== null) {
            $prices[(string) $offer['price']] = (float) $offer['price'];
        }
    }

    if (count($statuses) !== 1) {
        return [
            'status' => 'mixed',
            'price' => null,
        ];
    }

    $status = array_key_first($statuses);

    if ($status !== 'extra') {
        return [
            'status' => $status,
            'price' => null,
        ];
    }

    if (count($prices) === 1) {
        return [
            'status' => 'extra',
            'price' => array_values($prices)[0],
        ];
    }

    return [
        'status' => 'extra',
        'price' => null,
    ];
}

function itineraryBaggagePenalty(array $legs, int $passengers): float
{
    $penalty = 0.0;

    foreach ($legs as $leg) {
        $penalty += baggageOfferPenalty($leg['baggage']['carry_on'] ?? [], 25, 40);
        $penalty += baggageOfferPenalty($leg['baggage']['checked_bag'] ?? [], 35, 55);
    }

    return round($penalty * $passengers, 2);
}

function baggageOfferPenalty(array $offer, float $extraFallback, float $missingPenalty): float
{
    $status = (string) ($offer['status'] ?? 'not_available');

    if ($status === 'included') {
        return 0.0;
    }

    if ($status === 'extra') {
        $price = $offer['price'] ?? null;
        return $price !== null ? (float) $price : $extraFallback;
    }

    return $missingPenalty;
}

function tripScore(
    float $totalPrice,
    int $durationMinutes,
    int $stopCount,
    float $baggagePenalty
): float {
    return round(
        $totalPrice + ($durationMinutes * 0.4) + ($stopCount * 85) + $baggagePenalty,
        2
    );
}

function formatStopLabel(array $stops): string
{
    if (count($stops) === 0) {
        return 'Nonstop';
    }

    if (count($stops) === 1) {
        return '1 stop ' . $stops[0];
    }

    return count($stops) . ' stops ' . implode(', ', $stops);
}

function createLeg(
    array $flight,
    string $travelDate,
    array $airportsByCode,
    array $airlinesByCode,
    array $aircraftByCode,
    ?DateTimeImmutable $notBeforeUtc = null
): ?array {
    $departureAirport = $airportsByCode[$flight['departure_airport']] ?? null;
    $arrivalAirport = $airportsByCode[$flight['arrival_airport']] ?? null;
    $airline = $airlinesByCode[$flight['airline']] ?? null;
    $aircraft = $aircraftByCode[$flight['aircraft_code'] ?? ''] ?? null;

    if ($departureAirport === null || $arrivalAirport === null || $airline === null) {
        return null;
    }

    $departureLocal = new DateTimeImmutable(
        $travelDate . ' ' . $flight['departure_time'],
        new DateTimeZone($departureAirport['timezone'])
    );

    if ($notBeforeUtc !== null) {
        while ($departureLocal->setTimezone(new DateTimeZone('UTC')) < $notBeforeUtc) {
            $departureLocal = $departureLocal->modify('+1 day');
        }
    }

    $arrivalLocal = new DateTimeImmutable(
        $departureLocal->format('Y-m-d') . ' ' . $flight['arrival_time'],
        new DateTimeZone($arrivalAirport['timezone'])
    );

    while ($arrivalLocal->setTimezone(new DateTimeZone('UTC')) <= $departureLocal->setTimezone(new DateTimeZone('UTC'))) {
        $arrivalLocal = $arrivalLocal->modify('+1 day');
    }

    $departureUtc = $departureLocal->setTimezone(new DateTimeZone('UTC'));
    $arrivalUtc = $arrivalLocal->setTimezone(new DateTimeZone('UTC'));
    $durationMinutes = minutesBetween($departureUtc, $arrivalUtc);

    return [
        'airline_code' => $airline['code'],
        'airline_name' => $airline['name'],
        'airline_logo' => (string) ($airline['logo'] ?? ''),
        'flight_number' => (string) $flight['number'],
        'departure_airport' => $flight['departure_airport'],
        'departure_airport_name' => (string) $departureAirport['name'],
        'departure_city' => (string) $departureAirport['city'],
        'arrival_airport' => $flight['arrival_airport'],
        'arrival_airport_name' => (string) $arrivalAirport['name'],
        'arrival_city' => (string) $arrivalAirport['city'],
        'departure_date_label' => formatDateLabel($departureLocal),
        'arrival_date_label' => formatDateLabel($arrivalLocal),
        'departure_time_label' => formatClockLabel($departureLocal),
        'arrival_time_label' => formatClockLabel($arrivalLocal),
        'duration_minutes' => $durationMinutes,
        'duration_display' => formatDuration($durationMinutes),
        'price' => (float) $flight['price'],
        'baggage' => normalizeBaggage($flight['baggage'] ?? []),
        'aircraft' => normalizeAircraft($aircraft, (string) ($flight['aircraft_code'] ?? '')),
        '_departure_utc' => $departureUtc,
        '_arrival_utc' => $arrivalUtc,
    ];
}

function normalizeAircraft(?array $aircraft, string $code): array
{
    if ($aircraft === null) {
        return [
            'model' => $code !== '' ? $code : 'Aircraft details unavailable',
        ];
    }

    return [
        'model' => (string) $aircraft['model'],
    ];
}

function normalizeBaggage(array $baggage): array
{
    return [
        'carry_on' => normalizeBaggageOffer($baggage['carry_on'] ?? []),
        'checked_bag' => normalizeBaggageOffer($baggage['checked_bag'] ?? []),
    ];
}

function normalizeBaggageOffer(array $offer): array
{
    $status = (string) ($offer['status'] ?? 'not_available');
    $allowedStatuses = ['included', 'extra', 'not_available'];

    if (!in_array($status, $allowedStatuses, true)) {
        $status = 'not_available';
    }

    $price = isset($offer['price']) && $offer['price'] !== null
        ? (float) $offer['price']
        : null;

    return [
        'status' => $status,
        'price' => $status === 'extra' ? $price : null,
    ];
}

function formatClockLabel(DateTimeImmutable $dateTime): string
{
    $formatted = strtolower($dateTime->format('g:i a'));
    return str_replace(['am', 'pm'], ['a.m.', 'p.m.'], $formatted);
}

function formatDateLabel(DateTimeImmutable $dateTime): string
{
    return $dateTime->format('D, M j, Y');
}

function formatDuration(int $minutes): string
{
    $hours = intdiv($minutes, 60);
    $remainingMinutes = $minutes % 60;

    if ($hours === 0) {
        return $remainingMinutes . 'm';
    }

    return $hours . 'h ' . str_pad((string) $remainingMinutes, 2, '0', STR_PAD_LEFT) . 'm';
}

function minutesBetween(DateTimeImmutable $start, DateTimeImmutable $end): int
{
    return (int) round(($end->getTimestamp() - $start->getTimestamp()) / 60);
}

function compareTrips(array $left, array $right): int
{
    $leftDuration = $left['total_duration_minutes'] ?? $left['duration_minutes'];
    $rightDuration = $right['total_duration_minutes'] ?? $right['duration_minutes'];

    if ($left['score'] === $right['score']) {
        if ($left['total_price'] === $right['total_price']) {
            return $leftDuration <=> $rightDuration;
        }

        return $left['total_price'] <=> $right['total_price'];
    }

    return $left['score'] <=> $right['score'];
}

function mapByCode(array $items): array
{
    $mapped = [];

    foreach ($items as $item) {
        $mapped[$item['code']] = $item;
    }

    return $mapped;
}

function indexFlightsByDeparture(array $flights): array
{
    $indexed = [];

    foreach ($flights as $flight) {
        $indexed[$flight['departure_airport']][] = $flight;
    }

    return $indexed;
}

function loadSampleData(): array
{
    $filePath = __DIR__ . '/data/sample-data.json';
    $rawData = file_get_contents($filePath);

    if ($rawData === false) {
        fail('Could not read sample data.');
    }

    $decoded = json_decode($rawData, true);

    if (!is_array($decoded) || !isset($decoded['airlines'], $decoded['flights'], $decoded['aircraft'])) {
        fail('Sample data is invalid.');
    }

    $decoded['airports'] = loadAirportsData();

    return $decoded;
}

function loadAirportsData(): array
{
    $filePath = __DIR__ . '/data/airports.json';
    $rawData = file_get_contents($filePath);

    if ($rawData === false) {
        fail('Could not read airport data.');
    }

    $decoded = json_decode($rawData, true);

    if (!is_array($decoded) || !isset($decoded['airports']) || !is_array($decoded['airports'])) {
        fail('Airport data is invalid.');
    }

    return $decoded['airports'];
}

function filterAirports(array $airports, string $query): array
{
    if ($query === '') {
        usort($airports, static function (array $left, array $right): int {
            return strcmp((string) $left['code'], (string) $right['code']);
        });

        return $airports;
    }

    $normalizedQuery = strtolower($query);
    $matches = [];

    foreach ($airports as $airport) {
        $score = airportScore($airport, $normalizedQuery);

        if ($score === 0) {
            continue;
        }

        $airport['_score'] = $score;
        $matches[] = $airport;
    }

    usort($matches, static function (array $left, array $right): int {
        if ($left['_score'] === $right['_score']) {
            return strcmp((string) $left['code'], (string) $right['code']);
        }

        return $right['_score'] <=> $left['_score'];
    });

    return array_map(static function (array $airport): array {
        unset($airport['_score']);
        return $airport;
    }, $matches);
}

function airportScore(array $airport, string $query): int
{
    $code = strtolower((string) ($airport['code'] ?? ''));
    $cityCode = strtolower((string) ($airport['city_code'] ?? ''));
    $city = strtolower((string) ($airport['city'] ?? ''));
    $name = strtolower((string) ($airport['name'] ?? ''));

    if ($code === $query) {
        return 120;
    }

    if ($cityCode === $query) {
        return 110;
    }

    if (str_starts_with($code, $query)) {
        return 100;
    }

    if (str_starts_with($cityCode, $query)) {
        return 90;
    }

    if (str_starts_with($city, $query)) {
        return 80;
    }

    if (str_contains($city, $query)) {
        return 70;
    }

    if (str_contains($name, $query)) {
        return 60;
    }

    return 0;
}

function respond(array $payload): void
{
    http_response_code(200);
    echo json_encode($payload, JSON_PRETTY_PRINT);
    exit;
}

function fail(string $message, int $statusCode = 500): void
{
    http_response_code($statusCode);
    echo json_encode(['error' => $message], JSON_PRETTY_PRINT);
    exit;
}
