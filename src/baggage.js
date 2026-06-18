export function baggageCount(value) {
  const count = Number(value || 0)
  return count > 0 ? String(count) : 'X'
}

export function minimumBaggageCount(legs, type) {
  const allowances = legs.map((leg) => Number(leg.baggage[type]))

  if (allowances.length === 0) {
    return 'X'
  }

  return baggageCount(Math.min(...allowances))
}
