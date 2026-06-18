const airportCache = new Map()

function airportQueryKey(query = '') {
  return query.trim().toLowerCase()
}

export function getCachedAirports(query = '') {
  const key = airportQueryKey(query)
  return airportCache.has(key) ? airportCache.get(key) : null
}

export async function fetchAirports(query = '') {
  const key = airportQueryKey(query)
  const cachedAirports = getCachedAirports(query)

  if (cachedAirports !== null) {
    return cachedAirports
  }

  const searchParams = new URLSearchParams()

  if (query.trim() !== '') {
    searchParams.set('query', query.trim())
  }

  const queryString = searchParams.toString()
  const url = queryString ? `/api/airports?${queryString}` : '/api/airports'

  try {
    const response = await fetch(url)

    if (!response.ok) {
      airportCache.set(key, [])
      return []
    }

    const payload = await response.json()
    const airports = Array.isArray(payload.data) ? payload.data : []
    airportCache.set(key, airports)
    return airports
  } catch {
    airportCache.set(key, [])
    return []
  }
}

export async function searchTrips(criteria) {
  const response = await fetch('/api/trips/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(criteria),
  })

  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || 'Could not search trips.')
  }

  if (!Array.isArray(payload.data)) {
    throw new Error('Trip payload is invalid.')
  }

  return payload
}
