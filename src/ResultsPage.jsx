import { Link, Navigate, useNavigate } from 'react-router-dom'
import TripResults from './TripResults'

function ResultsPage({
  form,
  tripResults,
  isSearching,
  sortMode,
  onSortModeChange,
  selectedTripId,
  onSelectTrip,
}) {
  const navigate = useNavigate()
  const fromCode = form.from ? form.from.code : '---'
  const toCode = form.to ? form.to.code : '---'
  const tripTypeLabel = form.tripType === 'one-way' ? 'One-way' : 'Round-trip'
  const passengerLabel = `${form.passengers} passenger${form.passengers === '1' ? '' : 's'}`
  const trips = tripResults ? tripResults.data : null
  const meta = tripResults ? tripResults.meta : null
  const resultsKey = meta ? `${meta.trip_type}-${meta.from}-${meta.to}-${meta.count}` : 'results'

  if (!tripResults && !isSearching) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="page results-page">
      <section className="results-hero">
        <div className="results-hero-copy">
          <p className="eyebrow">Results</p>
          <h1>
            {fromCode} to {toCode}
          </h1>
        </div>

        <div className="results-hero-actions">
          <Link className="ghost-link" to="/">
            Refine search
          </Link>
          <div className="results-hero-meta">
            <span>{tripTypeLabel}</span>
            <span>{passengerLabel}</span>
          </div>
        </div>
      </section>

      <TripResults
        key={resultsKey}
        trips={trips}
        meta={meta}
        isSearching={isSearching}
        selectedTripId={selectedTripId}
        onSelectTrip={(tripId) => {
          onSelectTrip(tripId)
          navigate(`/checkout/${tripId}`)
        }}
        sortMode={sortMode}
        onSortModeChange={onSortModeChange}
      />
    </main>
  )
}

export default ResultsPage
