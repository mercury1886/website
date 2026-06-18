import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { fetchAirports } from './api'

const passengerOptions = [1, 2, 3, 4, 5, 6]

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
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputValue = isOpen ? query : value ? formatAirportLine(value) : ''

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 50)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [query])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let isActive = true

    async function loadResults() {
      const airports = await fetchAirports(debouncedQuery)

      if (isActive) {
        setResults(airports)
      }
    }

    loadResults()

    return () => {
      isActive = false
    }
  }, [debouncedQuery, isOpen])

  function closeResults() {
    setIsOpen(false)
    setQuery('')
  }

  function handleBlur(event) {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return
    }

    closeResults()
  }

  function handleFocus() {
    setIsOpen(true)
    setQuery('')
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
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
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

        {isOpen && results.length > 0 && (
          <div className="search-results-panel">
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
          </div>
        )}
      </div>
    </div>
  )
}

function SearchPage({ form, onFieldChange, onSearch, isSearching, searchError }) {
  const navigate = useNavigate()
  const location = useLocation()
  const today = new Date()
  const fromAirport = form.from
  const toAirport = form.to
  const routeIsSame = fromAirport && toAirport && fromAirport.code === toAirport.code
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
          <p className="hero-copy-text">
            Search routes, compare fares, and move into a dedicated trip view once
            you find a match worth chasing.
          </p>
        </div>

        <div className="route-board">
          <p className="route-board-label">Preview lane</p>
          {!fromAirport && !toAirport ? (
            <div className="route-board-empty">
              <strong>{formatRouteHeadline(fromAirport, toAirport)}</strong>
              <span>{formatRouteSubline(fromAirport, toAirport)}</span>
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
              <strong>{form.tripType === 'one-way' ? 'One-way' : 'Round-trip'}</strong>
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
              Search by airport code or city name, then pick dates and trip type.
            </p>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Passengers</span>
              <select
                name="passengers"
                value={form.passengers}
                onChange={(event) =>
                  onFieldChange('passengers', event.target.value)
                }
              >
                {passengerOptions.map((count) => (
                  <option key={count} value={count}>
                    {count} passenger{count > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Trip type</span>
              <select
                name="tripType"
                value={form.tripType}
                onChange={(event) =>
                  onFieldChange('tripType', event.target.value)
                }
              >
                <option value="one-way">One-way</option>
                <option value="round-trip">Round-trip</option>
              </select>
            </label>

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
          <h2>{formatRouteHeadline(fromAirport, toAirport)}</h2>
          <dl className="summary-list">
            <div>
              <dt>Route</dt>
              <dd>{formatRouteSubline(fromAirport, toAirport)}</dd>
            </div>
            <div>
              <dt>Trip type</dt>
              <dd>{form.tripType === 'one-way' ? 'One-way' : 'Round-trip'}</dd>
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
