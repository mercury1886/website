# Trip Builder

React + Vite single-page application with a PHP API for searching and reviewing airline trips.

## Overview

This project was built for the FlightHub PHP coding assignment. It lets a single passenger search airport pairs, browse one-way or round-trip options, filter and sort fares, review itinerary details, and complete a checkout flow.

The frontend is a React SPA. The backend is a small PHP API that serves airport search and trip search endpoints from the seed files in `api/data/`.

## Current features

- Live airport search by airport code, city code, city, or airport name
- One-way and round-trip trip building
- Timezone-aware flight timing in the PHP API
- Trip results with:
  - Best, cheapest, and fastest ranking views
  - Preferred airline filter
  - Price ceiling filter
  - Stop filters
  - Baggage filters
  - Pagination
- Trip details modal
- Trip review and checkout flow
- Automated PHP API tests with PHPUnit
- Docker-based local setup

## Tech stack

- Frontend: React 19, Vite, React Router
- Backend: PHP 8.3
- Local environment: Docker Compose
- Test tools: PHPUnit for API routes

## Project structure

```text
.
|-- api/
|   |-- bootstrap.php
|   |-- data/
|   |-- public/
|   |   |-- index.php
|   |   `-- router.php
|   |-- routes/
|   `-- tests/
|-- public/
|   `-- airlines/
`-- src/
```

## Sample data structure

Seed data lives in:

- `api/data/airports.json` for airport search
- `api/data/sample-data.json` for airlines, aircraft, and flights

The overall structure follows the assignment example, with a few added fields used by this build such as airline logos, aircraft records, aircraft codes, and baggage counts.

```json
{
  "airports.json": {
    "airports": [
      {
        "code": "YUL",
        "city_code": "YMQ",
        "name": "Pierre Elliott Trudeau International",
        "city": "Montreal",
        "country_code": "CA",
        "region_code": "QC",
        "latitude": 45.457714,
        "longitude": -73.749908,
        "timezone": "America/Montreal"
      }
    ]
  },
  "sample-data.json": {
    "airlines": [
      {
        "code": "AC",
        "name": "Air Canada",
        "logo": "/airlines/ac.png"
      }
    ],
    "aircraft": [
      {
        "code": "AC-220",
        "model": "Airbus A220-300"
      }
    ],
    "flights": [
      {
        "airline": "AC",
        "number": "301",
        "aircraft_code": "AC-220",
        "departure_airport": "YUL",
        "departure_time": "07:35",
        "arrival_airport": "YVR",
        "arrival_time": "10:05",
        "price": "273.23",
        "baggage": {
          "carry_on": 1,
          "checked_bag": 0
        }
      }
    ]
  }
}
```

## Local setup with Docker

### Requirements

- Docker Desktop or Docker Engine with Compose

### Start the application

```bash
docker compose up --build
```

### Open the app

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`

The React app uses Vite proxying, so frontend requests hit the PHP API through `/api`.

### Stop the application

```bash
docker compose down
```

## Local setup without Docker

### Requirements

- Node.js 22+
- npm
- PHP 8.3+

### Install frontend dependencies

```bash
npm ci
```

### Start the PHP API

```bash
php -S 0.0.0.0:8000 -t api/public api/public/router.php
```

### Start the React app

```bash
npm run dev
```

### Open the app

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`

## API endpoints

### `GET /health`

Health check for the PHP API.

### `GET /airports`

Returns the first page of airports from seed data.

### `GET /airports?query=YUL`

Searches airports by:

- airport code
- city code
- city name
- airport name

### `POST /trips/search`

Search payload:

```json
{
  "tripType": "round-trip",
  "from": "YUL",
  "to": "JFK",
  "departureDate": "2026-07-10",
  "returnDate": "2026-07-17",
  "passengers": 1
}
```

## Testing

### Frontend linting

```bash
npm run lint
```

### Production build

```bash
npm run build
```

### PHP API tests

```bash
npm run test
```

If you are running entirely through Docker, use:

```bash
docker compose exec frontend npm run lint
docker compose exec api composer test
```

## Assignment coverage

Implemented in the current build:

- PHP backend
- React SPA frontend
- One-way trip support
- Round-trip support
- Local environment setup instructions
- Automated tests
- Preferred airline filtering
- Trip sorting
- Trip pagination

## Notes

- Sample data lives in `api/data/airports.json` and `api/data/sample-data.json`.
- Airline logos used by the UI live in `public/airlines/`.
