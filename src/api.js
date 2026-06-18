export async function fetchAirports(query = '') {
  const searchParams = new URLSearchParams()

  if (query.trim() !== '') {
    searchParams.set('query', query.trim())
  }

  const queryString = searchParams.toString()
  const url = queryString
    ? `/api/airports/search?${queryString}`
    : '/api/airports'

  try {
    const response = await fetch(url)

    if (!response.ok) {
      return []
    }

    const payload = await response.json()
    return Array.isArray(payload.data) ? payload.data : []
  } catch {
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
