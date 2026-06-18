export function formatCurrency(value) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function sortTrips(trips, sortMode) {
  const sortedTrips = [...trips]

  sortedTrips.sort((left, right) => {
    if (sortMode === 'cheapest') {
      return left.total_price - right.total_price
    }

    if (sortMode === 'fastest') {
      return left.total_duration_minutes - right.total_duration_minutes
    }

    return left.score - right.score
  })

  return sortedTrips
}

export function pickMetricTrip(trips, sortMode) {
  const sortedTrips = sortTrips(trips, sortMode)
  return sortedTrips.length > 0 ? sortedTrips[0] : null
}

export function stopCountLabel(stopCount) {
  if (stopCount === 0) {
    return 'Direct'
  }

  return `${stopCount} stop${stopCount === 1 ? '' : 's'}`
}

export function buildStopOptions(trips) {
  return [...new Set(trips.map((trip) => trip.stop_count))].sort((left, right) => left - right)
}

export function buildAirlineOptions(trips) {
  const airlineMap = {}

  trips.forEach((trip) => {
    trip.segments.forEach((segment) => {
      segment.carriers.forEach((carrier) => {
        airlineMap[carrier.code] = carrier
      })
    })
  })

  return Object.values(airlineMap).sort((left, right) => left.code.localeCompare(right.code))
}

export function filterTrips(trips, filters) {
  return trips.filter((trip) => {
    if (trip.total_price > filters.maxPrice) {
      return false
    }

    if (
      filters.preferredAirline &&
      !trip.segments.every((segment) =>
        segment.legs.every((leg) => leg.airline_code === filters.preferredAirline),
      )
    ) {
      return false
    }

    if (filters.stopCounts.length > 0 && !filters.stopCounts.includes(trip.stop_count)) {
      return false
    }

    if (
      filters.requireCarryOnIncluded &&
      !trip.segments.every((segment) => segment.baggage_summary?.carry_on?.status === 'included')
    ) {
      return false
    }

    if (
      filters.requireCheckedBagIncluded &&
      !trip.segments.every((segment) => segment.baggage_summary?.checked_bag?.status === 'included')
    ) {
      return false
    }

    return true
  })
}
