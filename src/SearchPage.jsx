import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { fetchAirports, getCachedAirports } from './api'
import SelectField from './SelectField'

const passengerOptions = [1, 2, 3, 4, 5, 6].map((count) => ({
  value: String(count),
  label: `${count} passenger${count > 1 ? 's' : ''}`,
}))

const tripTypeOptions = [
  { value: 'one-way', label: 'One-way' },
  { value: 'round-trip', label: 'Round-trip' },
]

function formatDateLabel(date) {
  if (!date) {
    return 'Pick a date'
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatAirportLine(airport) {
  return `${airport.code} - ${airport.city}`
}

function formatRouteHeadline(fromAirport, toAirport) {
  if (!fromAirport && !toAirport) {
    return 'Your trip awaits'
  }

  return `${fromAirport?.code ?? '---'} to ${toAirport?.code ?? '---'}`
}

function formatRouteSubline(fromAirport, toAirport) {
  if (!fromAirport && !toAirport) {
    return 'Pick a departure and arrival to start shaping the route.'
  }

  return `${fromAirport?.city ?? 'Departure'} to ${toAirport?.city ?? 'Arrival'}`
}

function AirportSearchField({ id, label, value, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputValue = isOpen ? query : value ? formatAirportLine(value) : ''

  function openResults(nextQuery) {
    const cachedAirports = getCachedAirports(nextQuery)

    setIsOpen(true)
    setQuery(nextQuery)

    if (cachedAirports === null) {
      setIsLoading(true)
      return
    }

    setResults(cachedAirports)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!isOpen || getCachedAirports(query) !== null) {
      return undefined
    }

    let isActive = true

    const timeoutId = window.setTimeout(async () => {
      const airports = await fetchAirports(query.trim())

      if (isActive) {
        setResults(airports)
        setIsLoading(false)
      }
    }, 50)

    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
    }
  }, [isOpen, query])

  function closeResults() {
    setIsOpen(false)
    setIsLoading(false)
    setQuery('')
  }

  function handleBlur(event) {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return
    }

    closeResults()
  }

  function handleFocus() {
    openResults('')
  }

  function handleSelect(airport) {
    onChange(airport)
    closeResults()
  }

  return (
    <div className="field">
      <label htmlFor={id}>
        <span>{label}</span>
      </label>
      <div className="airport-search-shell" onBlur={handleBlur}>
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(event) => openResults(event.target.value)}
          onFocus={handleFocus}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
            }

            if (event.key === 'Escape') {
              closeResults()
            }
          }}
          className="search-input"
          placeholder="Search"
          autoComplete="off"
        />

        {isOpen && (
          <div className="search-results-panel">
            {isLoading ? (
              <div className="search-results-status">
                <span className="search-results-spinner" aria-hidden="true" />
                <span>Loading airports...</span>
              </div>
            ) : results.length > 0 ? (
              <ul className="search-results-list">
                {results.map((airport) => (
                  <li key={`${label}-${airport.code}`}>
                    <button
                      type="button"
                      className="search-result-button"
                      onClick={() => handleSelect(airport)}
                      onMouseDown={(event) => {
                        event.preventDefault()
                      }}
                    >
                      <strong>{airport.code}</strong>
                      <div>
                        <span>{airport.city}</span>
                        <small>{airport.name}</small>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="search-results-status">
                <span>No airports found.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SearchPage({
  form,
  onFieldChange,
  onSearch,
  isSearching,
  searchError,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const today = new Date()
  const fromAirport = form.from
  const toAirport = form.to
  const tripTypeLabel = form.tripType === 'one-way' ? 'One-way' : 'Round-trip'
  const routeHeadline = formatRouteHeadline(fromAirport, toAirport)
  const routeSubline = formatRouteSubline(fromAirport, toAirport)
  const routeIsSame =
    fromAirport && toAirport && fromAirport.code === toAirport.code
  const routeIsValid =
    form.from &&
    form.to &&
    !routeIsSame &&
    form.departureDate &&
    (form.tripType === 'one-way' || form.returnDate)

  async function handleSubmit(event) {
    event.preventDefault()

    if (!routeIsValid) {
      return
    }

    const didSearchSucceed = await onSearch()

    if (didSearchSucceed) {
      navigate('/results')
    }
  }

  useEffect(() => {
    if (location.hash !== '#search-card') {
      return
    }

    document.getElementById('search-card')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [location.hash])

  return (
    <main className="page">
      <section className="masthead">
        <div className="hero-copy">
          <p className="eyebrow">Search</p>
          <h1>The premier way to find cheap tickets.</h1>
        </div>

        <div className="route-board">
          <p className="route-board-label">Preview lane</p>
          {!fromAirport && !toAirport ? (
            <div className="route-board-empty">
              <strong>{routeHeadline}</strong>
              <span>{routeSubline}</span>
            </div>
          ) : (
            <>
              <div className="route-board-topline">
                <strong>{fromAirport?.code ?? '---'}</strong>
                <span className="route-board-line" />
                <strong>{toAirport?.code ?? '---'}</strong>
              </div>
              <div className="route-board-cities">
                <span>{fromAirport?.city ?? 'Search departure'}</span>
                <span>{toAirport?.city ?? 'Search arrival'}</span>
              </div>
            </>
          )}
          <div className="route-board-meta">
            <div>
              <span>Trip type</span>
              <strong>{tripTypeLabel}</strong>
            </div>
            <div>
              <span>Passengers</span>
              <strong>{form.passengers}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="layout">
        <form id="search-card" className="search-card" onSubmit={handleSubmit}>
          <div className="card-header">
            <div>
              <p className="section-label">Travel desk</p>
              <h2>Start a trip search</h2>
            </div>
            <p className="card-copy">
              Search by airport code or city name, then pick dates and trip
              type.
            </p>
          </div>

          <div className="field-grid">
            <SelectField
              id="passenger-count"
              label="Passengers"
              value={form.passengers}
              options={passengerOptions}
              onChange={(nextValue) => onFieldChange('passengers', nextValue)}
            />

            <SelectField
              id="trip-type"
              label="Trip type"
              value={form.tripType}
              options={tripTypeOptions}
              onChange={(nextValue) => onFieldChange('tripType', nextValue)}
            />

            <AirportSearchField
              id="from-airport"
              label="From"
              value={form.from}
              onChange={(airport) => onFieldChange('from', airport)}
            />

            <AirportSearchField
              id="to-airport"
              label="To"
              value={form.to}
              onChange={(airport) => onFieldChange('to', airport)}
            />

            <div className="field">
              <label htmlFor="departure-date">
                <span>Departure</span>
              </label>
              <DatePicker
                id="departure-date"
                selected={form.departureDate}
                onChange={(date) => onFieldChange('departureDate', date)}
                minDate={today}
                placeholderText="Choose a departure date"
                dateFormat="MMM d, yyyy"
                className="date-input"
                calendarClassName="trip-calendar"
                required
              />
            </div>

            {form.tripType === 'round-trip' && (
              <div className="field">
                <label htmlFor="return-date">
                  <span>Return</span>
                </label>
                <DatePicker
                  id="return-date"
                  selected={form.returnDate}
                  onChange={(date) => onFieldChange('returnDate', date)}
                  minDate={form.departureDate || today}
                  placeholderText="Choose a return date"
                  dateFormat="MMM d, yyyy"
                  className="date-input"
                  calendarClassName="trip-calendar"
                  required
                />
              </div>
            )}
          </div>

          {routeIsSame && (
            <p className="status-note error">
              Departure and arrival airports cannot be the same.
            </p>
          )}

          {searchError && <p className="status-note error">{searchError}</p>}

          <button
            className="search-button"
            type="submit"
            disabled={!routeIsValid || isSearching}
          >
            {isSearching ? 'Searching...' : 'Find trips'}
          </button>
        </form>

        <aside className="summary-card">
          <p className="summary-label">Current selection</p>
          <h2>{routeHeadline}</h2>
          <dl className="summary-list">
            <div>
              <dt>Route</dt>
              <dd>{routeSubline}</dd>
            </div>
            <div>
              <dt>Trip type</dt>
              <dd>{tripTypeLabel}</dd>
            </div>
            <div>
              <dt>Passengers</dt>
              <dd>{form.passengers}</dd>
            </div>
            <div>
              <dt>Departure</dt>
              <dd>{formatDateLabel(form.departureDate)}</dd>
            </div>
            {form.tripType === 'round-trip' && (
              <div>
                <dt>Return</dt>
                <dd>{formatDateLabel(form.returnDate)}</dd>
              </div>
            )}
          </dl>

          {fromAirport && toAirport && (
            <div className="airport-note">
              <div>
                <strong>{fromAirport.code}</strong>
                <span>{fromAirport.name}</span>
              </div>
              <div>
                <strong>{toAirport.code}</strong>
                <span>{toAirport.name}</span>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  )
}

export default SearchPage
