# Trip Builder

Creqated using React + Vite for the front end and PHP for the API.

## Current features

- Live airport search by airport code, city code, city, or airport name
- One-way and round-trip trip building
- Timezone-aware search
- Trip results with:
  - Best, cheapest, and fastest
  - Preferred airline filter
  - Price ceiling filter
  - Stop filters (Direct, 1+ stop, 2+ stop)
  - Baggage filters
  - Pagination
- Trip details
- Trip review and checkout
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
|   |   `-- index.php
|   |-- routes/
|   `-- tests/
|-- docs/
|-- public/
|   `-- airlines/
|-- scripts/
`-- src/
```

## Sample data structure

Seed data lives in:

- `api/data/airports.json` for airport search
- `api/data/sample-data.json` for airlines, aircraft, and flights

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
php -S 0.0.0.0:8000 -t api/public
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

Health Check

### `GET /airports`

Returns the first page of airports from sample data.

### `GET /airports/search?query=YUL`

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
docker compose run --rm --no-deps api composer test
```

IF the application is being run through Docker use this commands:

```bash
docker compose exec frontend npm run lint
docker compose exec api composer test
```
