import { Fragment, useEffect, useState } from 'react'
import {
  buildAirlineOptions,
  buildStopOptions,
  filterTrips,
  formatCurrency,
  pickMetricTrip,
  sortTrips,
  stopCountLabel,
} from './tripDisplay'

function BaggageIcon({ type }) {
  if (type === 'carry_on') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7V6a3 3 0 0 1 6 0v1h2.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-7A2.5 2.5 0 0 1 6.5 7H9Zm2 0h2V6a1 1 0 1 0-2 0v1Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5.5V5a3 3 0 0 1 6 0v.5h1.5A2.5 2.5 0 0 1 19 8v10.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5V8a2.5 2.5 0 0 1 2.5-2.5H9Zm2 0h2V5a1 1 0 1 0-2 0v.5Z" />
      <path d="M8 10h8M8 13h8" />
    </svg>
  )
}

function baggageCount(legs, type) {
  const includedCount = legs.filter(
    (leg) => leg.baggage?.[type]?.status === 'included',
  ).length

  return includedCount > 0 ? String(includedCount) : 'X'
}

function baggageTitle(legs, type) {
  const label = type === 'carry_on' ? 'Carry-on' : 'Checked bag'
  const count = baggageCount(legs, type)

  if (count === 'X') {
    return `${label} not included on this option`
  }

  return `${label} included on ${count} leg${count === '1' ? '' : 's'}`
}

function BaggageStat({ type, legs }) {
  return (
    <span className="baggage-stat" title={baggageTitle(legs, type)}>
      <span className="baggage-stat-icon">
        <BaggageIcon type={type} />
      </span>
      <strong>{baggageCount(legs, type)}</strong>
    </span>
  )
}

function segmentAircraftLabel(legs) {
  return [...new Set(legs.map((leg) => leg.aircraft.model))].join(' / ')
}

function CarrierStrip({ carriers }) {
  return (
    <div className="segment-brand">
      <div className="carrier-logo-line">
        {carriers.map((carrier, index) => (
          <Fragment key={carrier.code}>
            {index > 0 && <span className="carrier-ampersand">&amp;</span>}
            <img
              className="carrier-logo"
              src={carrier.logo}
              alt={carrier.name}
              title={carrier.name}
            />
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function TrackLine({ stopCount }) {
  const markersByStopCount = {
    1: ['50%'],
    2: ['33%', '66%'],
  }
  const markers = markersByStopCount[stopCount] || []

  return (
    <div className="segment-track-line">
      {markers.map((position) => (
        <span
          key={position}
          className="segment-track-stop"
          style={{ left: position }}
        />
      ))}
    </div>
  )
}

function FlightModalLeg({ leg, layover }) {
  return (
    <div className="flight-modal-leg">
      <div className="flight-modal-leg-airline">
        <img
          className="carrier-logo mini"
          src={leg.airline_logo}
          alt={leg.airline_name}
        />
        <div className="flight-modal-leg-labels">
          <strong>{leg.airline_name} ({leg.airline_code}{leg.flight_number})</strong>
          <span className="flight-modal-aircraft-tag">{leg.aircraft.model}</span>
        </div>
      </div>

      <div className="flight-modal-leg-timeline">
        <div className="flight-modal-leg-rail">
          <span className="flight-modal-leg-point" />
          <span className="flight-modal-leg-line" />
          <span className="flight-modal-leg-point end" />
        </div>

        <div className="flight-modal-leg-content">
          <div className="flight-modal-leg-stop">
            <strong>
              {leg.departure_time_label} {leg.departure_airport} {leg.departure_city}{' '}
              {leg.departure_airport_name}
            </strong>
          </div>

          <div className="flight-modal-leg-meta">
            <span>{leg.duration_display}</span>
          </div>

          <div className="flight-modal-leg-stop arrival">
            <strong>
              {leg.arrival_time_label} {leg.arrival_airport} {leg.arrival_city}{' '}
              {leg.arrival_airport_name}
            </strong>
          </div>
        </div>
      </div>

      {layover && (
        <div className="flight-modal-layover">
          Layover in {layover.airport} for {layover.duration_display}
        </div>
      )}
    </div>
  )
}

function FlightModalSegment({ segment, highlighted }) {
  return (
    <section className={`flight-modal-segment${highlighted ? ' highlighted' : ''}`}>
      <div className="flight-modal-segment-heading">
        <strong>{segment.direction}</strong>
        <span>{segment.travel_date_label}</span>
      </div>

      <div className="flight-modal-card">
        <div className="flight-modal-summary">
          <div className="flight-modal-summary-brand">
            <CarrierStrip carriers={segment.carriers ?? []} />
          </div>
          <div className="flight-modal-summary-time">
            <strong>{segment.departure_time_label}</strong>
            <span>{segment.from}</span>
          </div>
          <div className="flight-modal-summary-track">
            <span>{segment.duration_display}</span>
            <TrackLine stopCount={segment.stop_count} />
            <small>{segment.stop_count === 0 ? 'Direct' : segment.stop_label}</small>
          </div>
          <div className="flight-modal-summary-time">
            <strong>{segment.arrival_time_label}</strong>
            <span>{segment.to}</span>
          </div>
        </div>

        <div className="flight-modal-card-body">
          {segment.legs.map((leg, index) => (
            <FlightModalLeg
              key={`${segment.direction}-${leg.airline_code}${leg.flight_number}`}
              leg={leg}
              layover={segment.layovers[index]}
            />
          ))}
        </div>

        <div className="flight-modal-footer">
          <span>Arrives: {segment.legs[segment.legs.length - 1].arrival_date_label}</span>
          <span>Journey duration: {segment.duration_display}</span>
        </div>
      </div>
    </section>
  )
}

function TripDetailsModal({ trip, highlightedDirection, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="flight-modal-backdrop" onClick={onClose}>
      <div
        className="flight-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Flight details"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flight-modal-header">
          <div>
            <h2>Flight details</h2>
            <p>All times are local</p>
          </div>
          <button
            type="button"
            className="flight-modal-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flight-modal-body">
          {trip.segments.map((segment) => (
            <FlightModalSegment
              key={`${trip.id}-${segment.direction}`}
              segment={segment}
              highlighted={segment.direction === highlightedDirection}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SegmentCard({ segment, onOpenDetails }) {
  return (
    <div className="segment-card">
      <div className="segment-card-top">
        <div className="segment-brand-stack">
          <CarrierStrip carriers={segment.carriers ?? []} />
          <span className="segment-aircraft-label">
            {segmentAircraftLabel(segment.legs)}
          </span>
        </div>
        <div className="segment-baggage-inline">
          <BaggageStat type="carry_on" legs={segment.legs} />
          <BaggageStat type="checked_bag" legs={segment.legs} />
        </div>
      </div>

      <div className="segment-timeline">
        <div className="segment-timepoint">
          <strong>{segment.departure_time_label}</strong>
          <span>{segment.from}</span>
        </div>

        <div className="segment-track">
          <span>{segment.duration_display}</span>
          <TrackLine stopCount={segment.stop_count} />
          {segment.stop_count > 0 && (
            <small className="segment-track-stop-label">{segment.stop_label}</small>
          )}
        </div>

        <div className="segment-timepoint segment-timepoint-arrival">
          <strong>{segment.arrival_time_label}</strong>
          <span>{segment.to}</span>
          <button
            type="button"
            className="segment-details-link"
            onClick={onOpenDetails}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryMetric({ label, trip, active, onClick }) {
  return (
    <button
      type="button"
      className={`result-metric${active ? ' active' : ''}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{trip ? formatCurrency(trip.total_price) : '--'}</strong>
      <small>{trip ? trip.total_duration_display : 'No trip'}</small>
    </button>
  )
}

function ResultToolbar({ pageStart, pageEnd, visibleCount }) {
  return (
    <div className="results-toolbar">
      <span className="results-toolbar-count">
        Showing {pageStart} to {pageEnd} of {visibleCount}
      </span>
    </div>
  )
}

function TripCard({ trip, selected, onSelect, onOpenDetails }) {
  return (
    <article className={`trip-card${selected ? ' selected' : ''}`}>
      <div className="trip-card-body">
        {trip.segments.map((segment) => (
          <SegmentCard
            key={`${trip.id}-${segment.direction}`}
            segment={segment}
            onOpenDetails={() => onOpenDetails(trip, segment.direction)}
          />
        ))}
      </div>

      <aside className="trip-card-side">
        <span className="trip-deal-label">{stopCountLabel(trip.stop_count)}</span>
        <strong className="trip-price">{formatCurrency(trip.total_price)}</strong>
        <span className="trip-duration">{trip.total_duration_display} total</span>
        <button type="button" className="trip-select-button" onClick={onSelect}>
          Book
        </button>
      </aside>
    </article>
  )
}

function Pagination({ page, totalPages, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <nav className="results-pagination" aria-label="Trip results pages">
      <button
        type="button"
        className="pagination-button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        Previous
      </button>

      <div className="pagination-pages">
        {pages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={`pagination-button${pageNumber === page ? ' active' : ''}`}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="pagination-button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        Next
      </button>
    </nav>
  )
}

function FilterSection({ title, children }) {
  return (
    <section className="filter-section">
      <p className="filter-section-label">{title}</p>
      {children}
    </section>
  )
}

function TripFilters({
  airlineOptions,
  minPrice,
  maxPrice,
  filters,
  onAirlineChange,
  stopOptions,
  onPriceChange,
  onStopToggle,
  onCarryOnToggle,
  onCheckedBagToggle,
  onReset,
  showStopFilters,
}) {
  return (
    <aside className="results-filters">
      <div className="results-filters-header">
        <div>
          <p className="section-label">Filters</p>
          <h2>Narrow the fare list</h2>
        </div>
        <button type="button" className="filter-reset-button" onClick={onReset}>
          Reset
        </button>
      </div>

      <FilterSection title="Price ceiling">
        <div className="price-filter-card">
          <strong>{formatCurrency(filters.maxPrice)}</strong>
          <span>
            Showing fares from {formatCurrency(minPrice)} up to this price.
          </span>
        </div>
        <input
          className="price-slider"
          type="range"
          min={minPrice}
          max={maxPrice}
          step="0.01"
          value={filters.maxPrice}
          onChange={(event) => onPriceChange(Number(event.target.value))}
        />
      </FilterSection>

      <FilterSection title="Airline">
        <select
          className="filter-select"
          value={filters.preferredAirline}
          onChange={(event) => onAirlineChange(event.target.value)}
        >
          <option value="">Any airline</option>
          {airlineOptions.map((airline) => (
            <option key={airline.code} value={airline.code}>
              {airline.name}
            </option>
          ))}
        </select>
      </FilterSection>

      {showStopFilters && (
        <FilterSection title="Stops">
          <div className="filter-option-list">
            {stopOptions.map((stopCount) => (
              <label key={stopCount} className="filter-check">
                <input
                  type="checkbox"
                  checked={filters.stopCounts.includes(stopCount)}
                  onChange={() => onStopToggle(stopCount)}
                />
                <span>{stopCountLabel(stopCount)}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Baggage">
        <div className="filter-option-list">
          <label className="filter-check">
            <input
              type="checkbox"
              checked={filters.requireCarryOnIncluded}
              onChange={(event) => onCarryOnToggle(event.target.checked)}
            />
            <span>Carry-on included</span>
          </label>
          <label className="filter-check">
            <input
              type="checkbox"
              checked={filters.requireCheckedBagIncluded}
              onChange={(event) => onCheckedBagToggle(event.target.checked)}
            />
            <span>Checked bag included</span>
          </label>
        </div>
      </FilterSection>
    </aside>
  )
}

function TripResults({
  trips,
  meta,
  isSearching,
  selectedTripId,
  onSelectTrip,
  sortMode,
  onSortModeChange,
}) {
  const pageSize = 6
  const hasTrips = Array.isArray(trips) && trips.length > 0
  const maxTripPrice = hasTrips
    ? Math.max(...trips.map((trip) => trip.total_price))
    : 0
  const minTripPrice = hasTrips
    ? Math.min(...trips.map((trip) => trip.total_price))
    : 0
  const [filters, setFilters] = useState({
    maxPrice: maxTripPrice,
    preferredAirline: '',
    stopCounts: [],
    requireCarryOnIncluded: false,
    requireCheckedBagIncluded: false,
  })
  const [detailsState, setDetailsState] = useState({
    trip: null,
    direction: '',
  })
  const [page, setPage] = useState(1)

  function applyFilters(nextFilters) {
    setFilters(nextFilters)
    setPage(1)
  }

  function updateFilters(buildNextFilters) {
    setFilters((currentFilters) => buildNextFilters(currentFilters))
    setPage(1)
  }

  function resetFilters() {
    applyFilters({
      maxPrice: maxTripPrice,
      preferredAirline: '',
      stopCounts: [],
      requireCarryOnIncluded: false,
      requireCheckedBagIncluded: false,
    })
  }

  function handleSortChange(nextSortMode) {
    setPage(1)
    onSortModeChange(nextSortMode)
  }

  if (isSearching) {
    return (
      <section className="results-shell">
        <div className="results-empty">Searching available trips...</div>
      </section>
    )
  }

  if (!trips) {
    return null
  }

  if (trips.length === 0) {
    return (
      <section className="results-shell">
        <div className="results-empty">
          No trips matched this route yet. Try a different airport pair or date.
        </div>
      </section>
    )
  }

  const stopOptions = buildStopOptions(trips)
  const airlineOptions = buildAirlineOptions(trips)
  const showStopFilters = !(stopOptions.length === 1 && stopOptions[0] === 0)
  const filteredTrips = filterTrips(trips, filters)
  const bestTrip = pickMetricTrip(filteredTrips, 'best')
  const cheapestTrip = pickMetricTrip(filteredTrips, 'cheapest')
  const fastestTrip = pickMetricTrip(filteredTrips, 'fastest')
  const visibleTrips = sortTrips(filteredTrips, sortMode)
  const resultCount = meta ? meta.count : trips.length
  const resultRoute = meta ? `${meta.from} to ${meta.to}` : 'this route'
  const totalPages = Math.max(1, Math.ceil(visibleTrips.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStartIndex = (currentPage - 1) * pageSize
  const paginatedTrips = visibleTrips.slice(pageStartIndex, pageStartIndex + pageSize)
  const pageStart = visibleTrips.length === 0 ? 0 : pageStartIndex + 1
  const pageEnd = Math.min(pageStartIndex + pageSize, visibleTrips.length)

  function handleStopToggle(stopCount) {
    updateFilters((currentFilters) => {
      if (currentFilters.stopCounts.includes(stopCount)) {
        return {
          ...currentFilters,
          stopCounts: currentFilters.stopCounts.filter((value) => value !== stopCount),
        }
      }

      return {
        ...currentFilters,
        stopCounts: [...currentFilters.stopCounts, stopCount].sort((left, right) => left - right),
      }
    })
  }

  return (
    <section className="results-shell">
      <div className="results-layout">
        <TripFilters
          airlineOptions={airlineOptions}
          minPrice={minTripPrice}
          maxPrice={maxTripPrice}
          filters={filters}
          stopOptions={stopOptions}
          onAirlineChange={(value) =>
            updateFilters((currentFilters) => ({
              ...currentFilters,
              preferredAirline: value,
            }))
          }
          onPriceChange={(value) =>
            updateFilters((currentFilters) => ({
              ...currentFilters,
              maxPrice: value,
            }))
          }
          onStopToggle={handleStopToggle}
          onCarryOnToggle={(value) =>
            updateFilters((currentFilters) => ({
              ...currentFilters,
              requireCarryOnIncluded: value,
            }))
          }
          onCheckedBagToggle={(value) =>
            updateFilters((currentFilters) => ({
              ...currentFilters,
              requireCheckedBagIncluded: value,
            }))
          }
          onReset={resetFilters}
          showStopFilters={showStopFilters}
        />

        <div className="results-main">
          <div className="results-header">
            <p>
              Found {resultCount} trip options for {resultRoute}.
              {filteredTrips.length !== trips.length && ` Showing ${filteredTrips.length} after filters.`}
            </p>

            <ResultToolbar
              pageStart={pageStart}
              pageEnd={pageEnd}
              visibleCount={visibleTrips.length}
            />
          </div>

          <div className="results-metrics">
            <SummaryMetric
              label="Best"
              trip={bestTrip}
              active={sortMode === 'best'}
              onClick={() => handleSortChange('best')}
            />
            <SummaryMetric
              label="Cheapest"
              trip={cheapestTrip}
              active={sortMode === 'cheapest'}
              onClick={() => handleSortChange('cheapest')}
            />
            <SummaryMetric
              label="Fastest"
              trip={fastestTrip}
              active={sortMode === 'fastest'}
              onClick={() => handleSortChange('fastest')}
            />
          </div>

          {visibleTrips.length === 0 ? (
            <div className="results-empty">
              No trips fit the current filters. Raise the price cap or loosen the stop or baggage rules.
            </div>
          ) : (
            <>
              <div className="trip-list">
                {paginatedTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    selected={selectedTripId === trip.id}
                    onSelect={() => onSelectTrip(trip.id)}
                    onOpenDetails={(selectedTrip, direction) =>
                      setDetailsState({
                        trip: selectedTrip,
                        direction,
                      })
                    }
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}

              {detailsState.trip && (
                <TripDetailsModal
                  trip={detailsState.trip}
                  highlightedDirection={detailsState.direction}
                  onClose={() =>
                    setDetailsState({
                      trip: null,
                      direction: '',
                    })
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default TripResults
